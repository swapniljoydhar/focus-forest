import { LIMITS, STORAGE_KEY, THRESHOLDS, activeSession, canonicalUrl, compactText, emptyState, getDepthState, loadState, makeId, normalizeSettings, safeHttpUrl, saveState } from '../shared/state.js';

const pendingBranches = new Map();
const MAX_PENDING_BRANCHES = 64;
function prunePendingBranches() { const now = Date.now(); for (const [key, entry] of pendingBranches) if (now - entry.createdAt >= 15000) pendingBranches.delete(key); while (pendingBranches.size > MAX_PENDING_BRANCHES) pendingBranches.delete(pendingBranches.keys().next().value); }
const NO_CHANGE = Symbol('no-change');

let mutationQueue = Promise.resolve();
function mutate(mutator) {
  const run = mutationQueue.then(async () => {
    const state = await loadState();
    const result = await mutator(state);
    if (result === NO_CHANGE || result == null) return result === NO_CHANGE ? null : result;
    await saveState(state);
    return result;
  });
  mutationQueue = run.catch(() => undefined);
  return run;
}
function replaceState(nextState) {
  const run = mutationQueue.then(async () => { await saveState(nextState); return nextState; });
  mutationQueue = run.catch(() => undefined);
  return run;
}

function nodeHasTab(node, tabId) { return Number.isInteger(tabId) && (node.tabIds?.includes(tabId) || node.tabId === tabId); }
function nodeForTab(session, tabId) { return [...session.nodes].reverse().find((node) => nodeHasTab(node, tabId) && !node.closedAt) || null; }
function attachTab(node, tabId) { if (!Number.isInteger(tabId)) return false; node.tabIds ||= []; if (node.tabIds.includes(tabId)) return false; node.tabIds.push(tabId); return true; }
function detachTab(node, tabId) { if (!Array.isArray(node.tabIds)) return false; const before = node.tabIds.length; node.tabIds = node.tabIds.filter((id) => id !== tabId); return before !== node.tabIds.length; }
function moveTabToNode(session, tabId, targetId) { session.nodes.forEach((node) => { if (node.id !== targetId) detachTab(node, tabId); }); }

function prunePendingRedirects(session) { const now = Date.now(); session.pendingRedirects = (session.pendingRedirects || []).filter((entry) => now - entry.createdAt < 15000).slice(-4); }
function setPendingRedirect(session, tabId, parentId) { prunePendingRedirects(session); session.pendingRedirects = session.pendingRedirects.filter((entry) => entry.tabId !== tabId); session.pendingRedirects.push({ tabId, parentId, createdAt: Date.now() }); }
function pendingRedirectParent(session, tabId) { prunePendingRedirects(session); const entry = session.pendingRedirects.find((candidate) => candidate.tabId === tabId); return entry ? session.nodes.find((node) => node.id === entry.parentId) : null; }
function clearPendingRedirect(session, tabId) { session.pendingRedirects = (session.pendingRedirects || []).filter((entry) => entry.tabId !== tabId); }

function isRedirectLike(value) {
  try {
    const url = new URL(value);
    return /\/(url|redirect|out|away|click)(?:\/|$)/i.test(url.pathname) || ['url', 'target', 'dest', 'destination', 'redirect'].some((key) => url.searchParams.has(key));
  } catch { return false; }
}

function trackedTabIds(session) {
  return new Set(session.nodes.filter((node) => !node.closedAt).flatMap((node) => node.tabIds?.length ? node.tabIds : Number.isInteger(node.tabId) ? [node.tabId] : []));
}
function isRecord(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function safeId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value) ? value : null; }
function safeReason(value) { return ['user_ended', 'mission_changed', 'browse_without_mission'].includes(value) ? value : 'user_ended'; }
function safeOriginUrl(value) { const raw = String(value || ''); return safeHttpUrl(raw) || (/^chrome-extension:\/\/[a-z0-9-]+\//i.test(raw) ? raw.slice(0, LIMITS.URL) : 'chrome://newtab'); }
function shortcutRecord(input, existing = null) { const url = safeHttpUrl(input?.url); if (!url) return null; let hostname = url; try { hostname = new URL(url).hostname; } catch {} return { id: existing?.id || safeId(input?.id) || makeId('shortcut'), label: compactText(input?.label || existing?.label || hostname, 40), url, createdAt: existing?.createdAt || Date.now(), updatedAt: Date.now() }; }
async function saveShortcut(input) { return mutate((state) => { const current = state.shortcuts || []; const existing = safeId(input?.id) ? current.find((item) => item.id === input.id) : current.find((item) => item.url === safeHttpUrl(input?.url)); const item = shortcutRecord(input, existing); if (!item) return NO_CHANGE; if (existing) { Object.assign(existing, item); return existing; } if (current.length >= LIMITS.SHORTCUTS) return { capped: true }; state.shortcuts = [item, ...current].slice(0, LIMITS.SHORTCUTS); return item; }); }

function addEvent(session, type, payload = {}) {
  session.events.push({ id: makeId('event'), type, at: Date.now(), ...payload });
  if (session.events.length > LIMITS.EVENTS_PER_SESSION) session.events.splice(0, session.events.length - LIMITS.EVENTS_PER_SESSION);
}

function pushNode(session, node) {
  if (session.nodes.length >= LIMITS.NODES_PER_SESSION) return false;
  session.nodes.push(node);
  return true;
}

function effectiveThresholds(settings) { const clean = normalizeSettings(settings); return { DESATURATE: clean.gentleDepth, INTERRUPT: clean.choiceDepth, gentleDepth: clean.gentleDepth, choiceDepth: clean.choiceDepth }; }

function activeView(state, tabId) {
  const session = activeSession(state);
  const node = session && nodeForTab(session, tabId);
  if (!session || !node) return { session: null, thresholds: effectiveThresholds(state.settings), settings: normalizeSettings(state.settings) };
  return {
    session: {
      id: session.id,
      mission: session.mission,
      interventionPaused: Boolean(session.interventionPaused),
      node: { id: node.id, depth: node.depth, state: node.state, url: node.url }
    },
    thresholds: effectiveThresholds(state.settings),
    settings: normalizeSettings(state.settings)
  };
}

async function createSession(mission, tab) {
  const cleanMission = compactText(mission, 140);
  if (!cleanMission) return null;
  return mutate((state) => {
    const previous = activeSession(state);
    if (previous) {
      previous.status = 'completed'; previous.endedAt = Date.now(); previous.endReason = 'mission_changed';
      addEvent(previous, 'mission_changed');
    }
    const originUrl = safeOriginUrl(tab?.url);
    const title = compactText(tab?.title || 'New Tab');
    const session = {
      id: makeId('session'), mission: cleanMission, status: 'active', startedAt: Date.now(), endedAt: null, endReason: null,
      origin: { tabId: tab?.id ?? null, url: originUrl, title }, nodes: [], events: [], pendingRedirects: [], interventionPaused: false
    };
    pushNode(session, { id: makeId('node'), tabIds: Number.isInteger(tab?.id) ? [tab.id] : [], url: originUrl, title, parentId: null, depth: 0, firstSeenAt: Date.now(), relationshipConfidence: 'direct', state: 'normal' });
    addEvent(session, 'mission_started', { mission: session.mission });
    state.sessions.push(session);
    if (state.sessions.length > LIMITS.SESSIONS) state.sessions.splice(0, state.sessions.length - LIMITS.SESSIONS);
    state.activeSessionId = session.id;
    return session;
  });
}

async function endSession(reason = 'user_ended') {
  return mutate((state) => {
    const session = activeSession(state);
    if (!session) return NO_CHANGE;
    session.status = 'completed'; session.endedAt = Date.now(); session.endReason = reason;
    addEvent(session, reason === 'mission_changed' ? 'mission_changed' : 'mission_ended', { reason });
    state.activeSessionId = null;
    return session;
  });
}

async function trackLink({ tabId, url, title, targetBlank = false }) {
  const destination = safeHttpUrl(url);
  return mutate((state) => {
    const session = activeSession(state); if (!session || !destination) return NO_CHANGE;
    const parent = nodeForTab(session, tabId) || session.nodes.at(-1);
    if (!parent) return NO_CHANGE;
    const existing = session.nodes.find((node) => nodeHasTab(node, tabId) && node.url === destination && !node.closedAt);
    if (existing) return NO_CHANGE;
    if (targetBlank || isRedirectLike(destination)) {
      prunePendingBranches();
      if (targetBlank) pendingBranches.set(destination, { parentId: parent.id, createdAt: Date.now() });
      if (isRedirectLike(destination)) setPendingRedirect(session, tabId, parent.id);
      addEvent(session, 'link_opened', { url: destination, depth: parent.depth + 1 });
      return { pending: true, parentId: parent.id, redirect: isRedirectLike(destination) };
    }
    const depth = parent.depth + 1;
    const node = { id: makeId('node'), tabIds: Number.isInteger(tabId) ? [tabId] : [], url: destination, title: compactText(title || destination), parentId: parent.id, depth, firstSeenAt: Date.now(), relationshipConfidence: 'direct', state: getDepthState(depth, session.interventionPaused, effectiveThresholds(state.settings)) };
    if (!pushNode(session, node)) { addEvent(session, 'garden_at_capacity'); return { capped: true }; }
    moveTabToNode(session, tabId, node.id);
    addEvent(session, 'navigation', { nodeId: node.id, depth, url: destination });
    return node;
  });
}

async function observeTab(tabId, rawUrl, rawTitle, openerTabId) {
  const url = safeHttpUrl(rawUrl);
  const title = compactText(rawTitle || url);
  return mutate((state) => {
    const session = activeSession(state); if (!session || !url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return NO_CHANGE;
    const current = nodeForTab(session, tabId);
    const seed = session.nodes.length === 1 && (session.nodes[0].url.startsWith('chrome-extension://') || session.nodes[0].url.startsWith('chrome://'));
    if (seed) {
      const root = session.nodes[0];
      attachTab(root, tabId); root.url = url; root.title = title; root.firstSeenAt = Date.now(); root.relationshipConfidence = 'direct';
      session.origin = { tabId, url, title }; addEvent(session, 'origin_planted', { url }); return root;
    }
    if (current && current.url === url) return NO_CHANGE;
    const known = session.nodes.find((node) => node.url === url && !node.closedAt);
    if (known) { clearPendingRedirect(session, tabId); moveTabToNode(session, tabId, known.id); const attached = attachTab(known, tabId); known.title = title; if (attached) addEvent(session, 'tab_joined_path', { nodeId: known.id, url }); else addEvent(session, 'return_to_path', { nodeId: known.id, url }); return known; }
    const opener = openerTabId && nodeForTab(session, openerTabId);
    prunePendingBranches();
    const pending = pendingBranches.get(url);
    const pendingParent = pending && Date.now() - pending.createdAt < 15000 ? session.nodes.find((node) => node.id === pending.parentId) : null;
    pendingBranches.delete(url);
    const redirectParent = pendingRedirectParent(session, tabId);
    if (isRedirectLike(url) && (pendingParent || redirectParent || current)) {
      setPendingRedirect(session, tabId, (pendingParent || redirectParent || current).id);
      return { redirectPending: true };
    }
    if (!current && !openerTabId && !pendingParent && !redirectParent) return NO_CHANGE;
    const parent = redirectParent || opener || pendingParent || null;
    if (redirectParent) clearPendingRedirect(session, tabId);
    const depth = parent ? parent.depth + 1 : 0;
    const relationshipConfidence = opener ? 'tab-inferred' : (pendingParent || redirectParent) ? 'direct' : 'external';
    const node = { id: makeId('node'), tabIds: Number.isInteger(tabId) ? [tabId] : [], url, title, parentId: parent?.id || null, depth, firstSeenAt: Date.now(), relationshipConfidence, state: getDepthState(depth, session.interventionPaused, effectiveThresholds(state.settings)) };
    if (!pushNode(session, node)) { addEvent(session, 'garden_at_capacity'); return { capped: true }; }
    moveTabToNode(session, tabId, node.id);
    addEvent(session, relationshipConfidence === 'external' ? 'external_path' : 'navigation', { nodeId: node.id, depth, url });
    return node;
  });
}

async function pruneNode(sessionId, nodeId, toCompost = false) {
  return mutate((state) => {
    const session = state.sessions.find((item) => item.id === sessionId);
    if (!session) return NO_CHANGE;
    const node = session.nodes.find((item) => item.id === nodeId && !item.closedAt);
    if (!node || node.depth === 0 || node.state === 'pruned') return NO_CHANGE;
    node.state = 'pruned'; node.prunedAt = Date.now();
    addEvent(session, 'pruned', { nodeId: node.id, depth: node.depth });
    if (toCompost && !state.compostItems.some((item) => item.url === node.url)) {
      state.compostItems.unshift({ id: makeId('compost'), url: node.url, title: compactText(node.title || node.url), mission: session.mission, depth: node.depth, savedAt: Date.now() });
      if (state.compostItems.length > LIMITS.COMPOST) state.compostItems.splice(LIMITS.COMPOST);
    }
    return node;
  });
}

async function compost(tabId, rawUrl, title) {
  const url = safeHttpUrl(rawUrl);
  return mutate((state) => {
    const session = activeSession(state); if (!session || !url) return NO_CHANGE;
    const node = nodeForTab(session, tabId);
    if (!state.compostItems.some((item) => item.url === url)) {
      state.compostItems.unshift({ id: makeId('compost'), url, title: compactText(title || url), mission: session.mission, depth: node?.depth || 0, savedAt: Date.now() });
      if (state.compostItems.length > LIMITS.COMPOST) state.compostItems.splice(LIMITS.COMPOST);
    }
    if (node) { node.state = 'composted'; node.closedAt = Date.now(); }
    addEvent(session, 'composted', { url }); return true;
  });
}

async function getSnapshot(sessionId = null, includeHistory = false) {
  const state = await loadState();
  const selected = sessionId ? state.sessions.find((session) => session.id === sessionId) : null;
  const latest = includeHistory ? state.sessions.at(-1) || null : null;
  return { state, session: selected || activeSession(state) || latest, activeSessionId: state.activeSessionId, thresholds: effectiveThresholds(state.settings), settings: normalizeSettings(state.settings) };
}

chrome.runtime.onInstalled.addListener(() => { chrome.storage.local.get(STORAGE_KEY).then((result) => { if (!result[STORAGE_KEY]) chrome.storage.local.set({ [STORAGE_KEY]: emptyState() }); }); });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const tab = sender.tab;
    switch (message.type) {
      case 'GET_SNAPSHOT': return getSnapshot(safeId(message.sessionId) || null, Boolean(message.includeHistory));
      case 'GET_SHORTCUTS': return (await loadState()).shortcuts || [];
      case 'SAVE_SHORTCUT': return isRecord(message.shortcut) ? saveShortcut(message.shortcut) : null;
      case 'DELETE_SHORTCUT': return safeId(message.id) ? mutate((state) => { const before = state.shortcuts?.length || 0; state.shortcuts = (state.shortcuts || []).filter((item) => item.id !== message.id); return before === state.shortcuts.length ? NO_CHANGE : state.shortcuts; }) : null;
      case 'GET_ACTIVE_VIEW': return activeView(await loadState(), tab?.id);
      case 'START_MISSION': return typeof message.mission === 'string' ? createSession(message.mission, message.tab || tab) : null;
      case 'END_MISSION': return endSession(safeReason(message.reason));
      case 'LINK_CLICK': return Number.isInteger(tab?.id) ? trackLink({ tabId: tab.id, url: message.url, title: message.title, targetBlank: Boolean(message.targetBlank) }) : null;
      case 'OBSERVE_PAGE': return Number.isInteger(tab?.id) ? observeTab(tab.id, message.url, message.title, tab.openerTabId) : null;
      case 'COMPOST': return Number.isInteger(tab?.id) ? compost(tab.id, message.url, message.title) : null;
      case 'PAUSE_INTERVENTION': return typeof message.paused === 'boolean' ? mutate((state) => { const session = activeSession(state); if (!session || session.interventionPaused === message.paused) return NO_CHANGE; session.interventionPaused = message.paused; return session; }) : null;
      case 'UPDATE_SETTINGS': return isRecord(message.settings) ? mutate((state) => { const next = normalizeSettings({ ...state.settings, ...message.settings }); if (JSON.stringify(next) === JSON.stringify(state.settings)) return NO_CHANGE; state.settings = next; const session = activeSession(state); if (session) session.nodes.forEach((node) => { node.state = getDepthState(node.depth, session.interventionPaused, effectiveThresholds(next)); }); return state.settings; }) : null;
      case 'DELETE_COMPOST': return safeId(message.id) ? mutate((state) => { const before = state.compostItems.length; state.compostItems = state.compostItems.filter((item) => item.id !== message.id); return before === state.compostItems.length ? NO_CHANGE : state.compostItems; }) : null;
      case 'PRUNE_NODE': return safeId(message.sessionId) && safeId(message.nodeId) ? pruneNode(message.sessionId, message.nodeId, Boolean(message.toCompost)) : null;
      case 'DELETE_SESSION': return safeId(message.sessionId) ? mutate((state) => { const before = state.sessions.length; state.sessions = state.sessions.filter((session) => session.id !== message.sessionId); if (state.activeSessionId === message.sessionId) state.activeSessionId = null; return before === state.sessions.length ? NO_CHANGE : state.sessions; }) : null;
      case 'CLEAR_DATA': return replaceState(emptyState());
      case 'GO_HOME': {
        const snapshot = await getSnapshot(); const origin = snapshot.session?.origin; const originTabId = Number.isInteger(origin?.tabId) ? origin.tabId : null;
        if (originTabId) { try { await chrome.tabs.update(originTabId, { active: true }); } catch { const returnUrl = /^chrome-extension:\/\//.test(origin?.url || '') || safeHttpUrl(origin?.url); if (returnUrl) await chrome.tabs.create({ url: returnUrl, active: true }); } }
        return activeView(await loadState(), originTabId);
      }
      default: return null;
    }
  })().then(sendResponse).catch((error) => sendResponse({ error: error.message }));
  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => { if (changeInfo.status === 'complete' && tab.url) await observeTab(tabId, tab.url, tab.title, tab.openerTabId); });
chrome.tabs.onRemoved.addListener(async (tabId) => { await mutate((state) => { const session = activeSession(state); if (!session) return NO_CHANGE; let changed = false; if (session.origin?.tabId === tabId) { session.origin.tabId = null; changed = true; } const node = nodeForTab(session, tabId); if (!node || node.closedAt) return changed ? session : NO_CHANGE; detachTab(node, tabId); if (!node.tabIds?.length) node.closedAt = Date.now(); return node; }); });
