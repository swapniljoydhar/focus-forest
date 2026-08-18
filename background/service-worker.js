import { LIMITS, STORAGE_KEY, THRESHOLDS, activeSession, clearStateCache, compactText, emptyState, getDepthState, isSearchUrl, loadState, makeId, normalizeSettings, safeHttpUrl, safeSessionUrl, saveState, checkStorageQuota } from '../shared/state.js';
import { logError, ERROR_CATEGORIES, wrapMutationWithErrorBoundary, wrapWithErrorBoundary } from '../shared/error-tracing.js';

const pendingBranches = new Map();
const MAX_PENDING_BRANCHES = 64;
const SPA_DOMAINS = new Set(['youtube.com', 'notion.so', 'gmail.com', 'github.com', 'app.notion.so', 'docs.google.com', 'drive.google.com', 'calendar.google.com', 'mail.google.com']);
const spaDedup = new Map();
const MAX_SPA_DEDUP = 128;
// Safe hostname extraction: never throws on malformed URLs.
function hostnameOf(value) { try { return new URL(String(value || '')).hostname.toLowerCase(); } catch { return ''; } }
// True when a hostname belongs to a known SPA domain or one of its subdomains.
function isSpaDomain(hostname) { if (!hostname) return false; if (SPA_DOMAINS.has(hostname)) return true; for (const d of SPA_DOMAINS) if (hostname.endsWith(`.${d}`)) return true; return false; }
// 1s dedup window for repeated SPA navigations on the same tab+url.
function recentlyObservedSpa(tabId, url) {
  const now = Date.now();
  for (const [entryKey, seenAt] of spaDedup) if (now - seenAt >= 1500) spaDedup.delete(entryKey);
  const key = `${tabId}::${url}`;
  const previous = spaDedup.get(key);
  if (previous != null && now - previous < 1000) return true;
  if (!spaDedup.has(key) && spaDedup.size >= MAX_SPA_DEDUP) spaDedup.delete(spaDedup.keys().next().value);
  spaDedup.set(key, now);
  setTimeout(() => { if (spaDedup.get(key) === now) spaDedup.delete(key); }, 1500);
  return false;
}

function prunePendingBranches() { const now = Date.now(); for (const [key, entry] of pendingBranches) if (now - entry.createdAt >= 15000) pendingBranches.delete(key); while (pendingBranches.size > MAX_PENDING_BRANCHES) pendingBranches.delete(pendingBranches.keys().next().value); }
function pendingBranchKey(url, sourceTabId, windowId) { return `${Number.isInteger(sourceTabId) ? sourceTabId : 'unknown'}::${Number.isInteger(windowId) ? windowId : 'nowin'}::${url}`; }
function setPendingBranch(url, sourceTabId, windowId, parentId) { prunePendingBranches(); const key = pendingBranchKey(url, sourceTabId, windowId); pendingBranches.set(key, { url, sourceTabId: Number.isInteger(sourceTabId) ? sourceTabId : null, windowId: Number.isInteger(windowId) ? windowId : null, parentId, createdAt: Date.now() }); }
function takePendingBranch(url, sourceTabId, windowId) { prunePendingBranches(); const exact = pendingBranches.get(pendingBranchKey(url, sourceTabId, windowId)); if (exact) { pendingBranches.delete(pendingBranchKey(url, sourceTabId, windowId)); return exact; } const candidates = [...pendingBranches.entries()].filter(([, entry]) => entry.url === url && entry.sourceTabId == null); if (candidates.length !== 1) return null; pendingBranches.delete(candidates[0][0]); return candidates[0][1]; }
const NO_CHANGE = Symbol('no-change');

let mutationQueue = Promise.resolve();
function mutate(mutator) {
  const wrappedMutator = wrapMutationWithErrorBoundary(mutator, { component: 'service-worker', function: 'mutate' });
  const run = mutationQueue.then(async () => {
    const state = await loadState();
    const result = await wrappedMutator(state);
    if (result === NO_CHANGE || result == null) return result === NO_CHANGE ? null : result;
    await saveState(state);
    return result;
  });
  mutationQueue = run.catch((error) => {
    logError(error, { category: ERROR_CATEGORIES.STATE_MUTATION, component: 'service-worker', function: 'mutate-catch' });
    clearStateCache();
    return undefined;
  });
  return run;
}
function replaceState(nextState) {
  const run = mutationQueue.then(async () => { await saveState(nextState); return nextState; });
  mutationQueue = run.catch((error) => {
    logError(error, { category: ERROR_CATEGORIES.STATE_MUTATION, component: 'service-worker', function: 'replaceState-catch' });
    clearStateCache();
    return undefined;
  });
  return run;
}

function nodeHasTab(node, tabId) { return Number.isInteger(tabId) && (node.tabIds?.includes(tabId) || node.tabId === tabId); }
const TERMINAL_STATES = new Set(['pruned', 'composted']);
function nodeForTab(session, tabId) { return [...session.nodes].reverse().find((node) => nodeHasTab(node, tabId) && !node.closedAt && !TERMINAL_STATES.has(node.state)) || null; }
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

function isRecord(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function safeId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value) ? value : null; }
function safeReason(value) { return ['user_ended', 'mission_changed', 'browse_without_mission'].includes(value) ? value : 'user_ended'; }
function safeOriginUrl(value) { return safeSessionUrl(value) || 'chrome://newtab'; }
function safeNavigationUrl(value) { return safeSessionUrl(value); }
function sameOriginUrl(actual, expected) { const expectedHttp = safeHttpUrl(expected); return expectedHttp ? safeHttpUrl(actual) === expectedHttp : String(actual || '') === String(expected || ''); }
function isExtensionPageSender(sender) { const id = chrome.runtime?.id; return typeof id === 'string' && typeof sender?.url === 'string' && sender.url.startsWith(`chrome-extension://${id}/`); }

// Coerce a sender or client-supplied tab descriptor into a minimal safe shape.
// Only numeric ids and sanitized url/title fields are preserved; the genuine
// chrome sender.tab is preferred when present so extension pages cannot spoof
// tab identity beyond what createSession already sanitizes.
function sanitizeTab(tab) {
  if (!tab || typeof tab !== 'object') return null;
  return {
    id: Number.isInteger(tab.id) ? tab.id : null,
    windowId: Number.isInteger(tab.windowId) ? tab.windowId : null,
    url: typeof tab.url === 'string' ? tab.url : null,
    title: typeof tab.title === 'string' ? tab.title : null,
    openerTabId: Number.isInteger(tab.openerTabId) ? tab.openerTabId : null
  };
}

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
    const originTabId = Number.isInteger(tab?.id) ? tab.id : null;
    const session = {
      id: makeId('session'), mission: cleanMission, status: 'active', startedAt: Date.now(), endedAt: null, endReason: null,
      origin: { tabId: originTabId, windowId: Number.isInteger(tab?.windowId) ? tab.windowId : null, url: originUrl, title }, nodes: [], events: [], pendingRedirects: [], interventionPaused: false
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

async function trackLink({ tabId, url, title, targetBlank = false, windowId }) {
  const destination = safeHttpUrl(url);
  return mutate((state) => {
    const session = activeSession(state); if (!session || !destination) return NO_CHANGE;
    const parent = nodeForTab(session, tabId) || session.nodes.at(-1);
    if (!parent) return NO_CHANGE;
    const existing = session.nodes.find((node) => nodeHasTab(node, tabId) && node.url === destination && !node.closedAt);
    if (existing) return NO_CHANGE;
    if (targetBlank || isRedirectLike(destination)) {
      prunePendingBranches();
      if (targetBlank) setPendingBranch(destination, tabId, windowId, parent.id);
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

async function observeTab(tabId, rawUrl, rawTitle, openerTabId, windowId) {
  const url = safeHttpUrl(rawUrl);
  const title = compactText(rawTitle || url);
  return mutate((state) => {
    const session = activeSession(state); if (!session || !url || url.startsWith('chrome://')) return NO_CHANGE;
    const current = nodeForTab(session, tabId);
    // Origin is "not set" if it's still the newtab placeholder (either chrome:// or chrome-extension://)
    const originUrl = session.origin?.url || '';
    const originNotSet = /^chrome:\/\/newtab(?:\/|$)/i.test(originUrl) || /^chrome-extension:\/\/[^/]*\/newtab\//i.test(originUrl) || session.nodes.length === 1 && !session.nodes[0].url.startsWith('http');
    if (originNotSet) {
      const root = session.nodes[0] || session.nodes.at(-1);
      if (root) { attachTab(root, tabId); root.url = url; root.title = title; root.firstSeenAt = Date.now(); root.relationshipConfidence = 'direct'; }
      session.origin = { tabId, windowId: Number.isInteger(windowId) ? windowId : session.origin?.windowId || null, url, title }; addEvent(session, 'origin_planted', { url }); return root;
    }
    if (current && current.url === url) return NO_CHANGE;
    if (isSearchUrl(url) && !originNotSet) return NO_CHANGE;
    const known = session.nodes.find((node) => node.url === url && !node.closedAt && !TERMINAL_STATES.has(node.state));
    if (known) { clearPendingRedirect(session, tabId); moveTabToNode(session, tabId, known.id); const attached = attachTab(known, tabId); known.title = title; if (attached) addEvent(session, 'tab_joined_path', { nodeId: known.id, url }); else addEvent(session, 'return_to_path', { nodeId: known.id, url }); return known; }
    const opener = openerTabId && nodeForTab(session, openerTabId);
    prunePendingBranches();
    const pending = takePendingBranch(url, Number.isInteger(openerTabId) ? openerTabId : tabId, Number.isInteger(windowId) ? windowId : null);
    const pendingParent = pending ? session.nodes.find((node) => node.id === pending.parentId) : null;
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
    node.state = 'pruned'; node.prunedAt = Date.now(); node.tabIds = []; delete node.tabId;
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
    if (node) { node.state = 'composted'; node.closedAt = Date.now(); node.tabIds = []; delete node.tabId; }
    addEvent(session, 'composted', { url }); return true;
  });
}

async function getSnapshot(sessionId = null, includeHistory = false) {
  const state = await loadState();
  const selected = sessionId ? state.sessions.find((session) => session.id === sessionId) : null;
  const latest = includeHistory ? state.sessions.at(-1) || null : null;
  return { state, session: selected || activeSession(state) || latest, activeSessionId: state.activeSessionId, thresholds: effectiveThresholds(state.settings), settings: normalizeSettings(state.settings) };
}

// Dashboard statistics aggregation
async function getDashboardStats() {
  const state = await loadState();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - (7 * oneDayMs);

  // Calculate total sessions and focus time
  let totalSessions = 0;
  let totalFocusTime = 0;
  const domainCounts = {};
  const dailyMinutes = {};
  
  // Initialize last 7 days using ISO date keys (not weekday names)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now - (i * oneDayMs));
    const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
    dailyMinutes[key] = 0;
  }

  // Process all sessions
  for (const session of state.sessions) {
    totalSessions++;
    
    // Use session duration from startedAt to endedAt (not sum of node durations
    // which double-counts concurrent tabs)
    const sessionStart = session.startedAt || now;
    const sessionEnd = session.endedAt || now;
    const sessionDuration = Math.max(0, (sessionEnd - sessionStart) / 1000);
    
    for (const node of session.nodes) {
      // Domain counting
      try {
        const hostname = new URL(node.url).hostname.toLowerCase();
        domainCounts[hostname] = (domainCounts[hostname] || 0) + 1;
      } catch { /* ignore invalid URLs */ }
    }
    
    totalFocusTime += sessionDuration;
    
    // Daily breakdown using ISO date key
    const dayKey = new Date(sessionStart).toISOString().slice(0, 10);
    if (Object.hasOwn(dailyMinutes, dayKey)) {
      dailyMinutes[dayKey] += Math.floor(sessionDuration / 60);
    }
  }

  // Calculate streak: consecutive days with activity, counting backward from today
  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(now - (i * oneDayMs));
    const dayKey = checkDate.toISOString().slice(0, 10);
    // For days within our 7-day window, check the dailyMinutes map
    // For older days, scan sessions directly
    if (i < 7) {
      if (dailyMinutes[dayKey] > 0) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    } else {
      const dayStart = new Date(dayKey).getTime();
      const dayEnd = dayStart + oneDayMs;
      const hadActivity = state.sessions.some((s) => {
        const start = s.startedAt || 0;
        return start >= dayStart && start < dayEnd;
      });
      if (hadActivity) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Format weekly data with readable day labels
  const weeklyData = Object.entries(dailyMinutes).map(([dateKey, minutes]) => {
    const date = new Date(dateKey + 'T12:00:00');
    return { day: date.toLocaleDateString(undefined, { weekday: 'short' }), date: dateKey, minutes };
  });

  // Format domain data (top 5)
  const domainData = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent history (last 10 sessions)
  const history = state.sessions.slice(-10).reverse().map(session => {
    const start = session.startedAt || now;
    const end = session.endedAt || now;
    const duration = Math.max(0, (end - start) / 1000);
    
    return {
      timestamp: start,
      domain: session.origin?.url ? (() => { try { return new URL(session.origin.url).hostname; } catch { return 'Unknown'; } })() : 'Unknown',
      duration: Math.floor(duration),
      type: 'focus'
    };
  });

  // Get saved items (compost)
  const savedItems = state.compostItems.map(item => ({
    id: item.id,
    url: item.url,
    title: item.title,
    savedAt: item.savedAt
  }));

  return {
    totalSessions,
    totalFocusTime: Math.floor(totalFocusTime),
    currentStreak,
    weeklyData,
    domainData,
    history,
    savedItems
  };
}

// Remove saved item
async function removeSavedItem(id) {
  return mutate((state) => {
    const before = state.compostItems.length;
    state.compostItems = state.compostItems.filter(item => item.id !== id);
    return before === state.compostItems.length ? NO_CHANGE : state.compostItems;
  });
}

// Export all data
async function exportAllData() {
  const state = await loadState();
  return { data: state };
}

chrome.runtime.onInstalled.addListener(() => {
  wrapWithErrorBoundary(async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (!result[STORAGE_KEY]) await saveState(emptyState());
    // Check initial storage quota after seeding
    await checkStorageQuota();
  }, { category: ERROR_CATEGORIES.STORAGE, component: 'service-worker', function: 'onInstalled', swallow: true })();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isRecord(message) || typeof message.type !== 'string') { sendResponse(null); return false; }
  if (sender?.id !== chrome.runtime.id) { sendResponse(null); return false; }
  const tab = sender && typeof sender === 'object' && sender.tab && typeof sender.tab === 'object' ? sender.tab : null;
  if (!validateMessage(message)) { sendResponse(null); return false; }
  (async () => {
    switch (message.type) {
      case 'GET_SNAPSHOT': return isExtensionPageSender(sender) ? getSnapshot(safeId(message.sessionId) || null, Boolean(message.includeHistory)) : null;
      case 'GET_ACTIVE_VIEW': return activeView(await loadState(), tab?.id);
      case 'START_MISSION': return typeof message.mission === 'string' ? createSession(message.mission, sanitizeTab(tab) || sanitizeTab(message.tab)) : null;
      case 'END_MISSION': return endSession(safeReason(message.reason));
      case 'LINK_CLICK': {
        if (!Number.isInteger(tab?.id)) return null;
        const linkUrl = safeHttpUrl(message.url);
        if (!linkUrl) return null;
        if (isSpaDomain(hostnameOf(linkUrl))) recentlyObservedSpa(tab.id, linkUrl);
        return trackLink({ tabId: tab.id, url: linkUrl, title: typeof message.title === 'string' ? message.title : '', targetBlank: Boolean(message.targetBlank), windowId: Number.isInteger(tab?.windowId) ? tab.windowId : null });
      }
      case 'OBSERVE_PAGE': {
        if (!Number.isInteger(tab?.id)) return null;
        if (isSpaDomain(hostnameOf(message.url)) && recentlyObservedSpa(tab.id, safeHttpUrl(message.url) || message.url)) return null;
        return observeTab(tab.id, message.url, typeof message.title === 'string' ? message.title : '', tab.openerTabId, tab.windowId);
      }
      case 'COMPOST': return Number.isInteger(tab?.id) ? compost(tab.id, message.url, message.title) : null;
      case 'PAUSE_INTERVENTION': return typeof message.paused === 'boolean' ? mutate((state) => { const session = activeSession(state); if (!session || session.interventionPaused === message.paused) return NO_CHANGE; session.interventionPaused = message.paused; return session; }) : null;
      case 'UPDATE_SETTINGS': return isExtensionPageSender(sender) && isRecord(message.settings) ? mutate((state) => { const next = normalizeSettings({ ...state.settings, ...message.settings }); if (JSON.stringify(next) === JSON.stringify(state.settings)) return NO_CHANGE; state.settings = next; const session = activeSession(state); if (session) session.nodes.forEach((node) => { node.state = getDepthState(node.depth, session.interventionPaused, effectiveThresholds(next)); }); return state.settings; }) : null;
      case 'DELETE_COMPOST': return isExtensionPageSender(sender) && safeId(message.id) ? mutate((state) => { const before = state.compostItems.length; state.compostItems = state.compostItems.filter((item) => item.id !== message.id); return before === state.compostItems.length ? NO_CHANGE : state.compostItems; }) : null;
      case 'PRUNE_NODE': return isExtensionPageSender(sender) && safeId(message.sessionId) && safeId(message.nodeId) ? pruneNode(message.sessionId, message.nodeId, Boolean(message.toCompost)) : null;
      case 'DELETE_SESSION': return isExtensionPageSender(sender) && safeId(message.sessionId) ? mutate((state) => { const before = state.sessions.length; state.sessions = state.sessions.filter((session) => session.id !== message.sessionId); if (state.activeSessionId === message.sessionId) state.activeSessionId = null; return before === state.sessions.length ? NO_CHANGE : state.sessions; }) : null;
      case 'CLEAR_DATA':
      case 'CLEAR_ALL_DATA': return isExtensionPageSender(sender) ? replaceState(emptyState()) : null;
      case 'GET_DASHBOARD_STATS': return isExtensionPageSender(sender) ? getDashboardStats() : null;
      case 'REMOVE_SAVED_ITEM': return isExtensionPageSender(sender) && safeId(message.id) ? removeSavedItem(message.id) : null;
      case 'EXPORT_DATA': return isExtensionPageSender(sender) ? exportAllData() : null;
      case 'CHECK_STORAGE_QUOTA': return isExtensionPageSender(sender) ? await checkStorageQuota() : null;
      case 'GO_HOME': {
        const snapshot = await getSnapshot(); const origin = snapshot.session?.origin; const originTabId = Number.isInteger(origin?.tabId) ? origin.tabId : null; const returnUrl = safeNavigationUrl(origin?.url);
        // Only treat HTTP(S) origins as real navigation targets.
        // Extension pages and chrome:// URLs are not useful "go home" destinations.
        const hasRealOrigin = Boolean(returnUrl) && /^https?:\/\//i.test(returnUrl);
        let returnedToOrigin = false;
        if (originTabId && hasRealOrigin) {
          try {
            const liveTab = await chrome.tabs.get(originTabId);
            if (sameOriginUrl(liveTab?.url, origin.url)) { if (chrome.windows?.update && Number.isInteger(liveTab.windowId)) await chrome.windows.update(liveTab.windowId, { focused: true }); await chrome.tabs.update(originTabId, { url: returnUrl, active: true }); returnedToOrigin = true; }
          } catch { returnedToOrigin = false; }
        }
        if (!returnedToOrigin && hasRealOrigin) await chrome.tabs.create({ url: returnUrl, active: true });
        return activeView(await loadState(), returnedToOrigin ? originTabId : null);
      }
      default: return null;
    }
  })()
  .then(sendResponse)
  .catch((error) => {
    logError(error, { category: ERROR_CATEGORIES.MESSAGING, component: 'service-worker', function: 'onMessage', messageType: message?.type });
    sendResponse({ error: 'INTERNAL_ERROR' });
  });
  return true;
});

const SCHEMAS = {
  GET_SNAPSHOT: {},
  GET_ACTIVE_VIEW: {},
  START_MISSION: { mission: 'string' },
  END_MISSION: {},
  LINK_CLICK: { url: 'string', title: 'string?', targetBlank: 'boolean?' },
  OBSERVE_PAGE: { url: 'string', title: 'string?' },
  COMPOST: { url: 'string', title: 'string?' },
  PAUSE_INTERVENTION: { paused: 'boolean' },
  UPDATE_SETTINGS: { settings: 'object' },
  DELETE_COMPOST: { id: 'string' },
  PRUNE_NODE: { sessionId: 'string', nodeId: 'string', toCompost: 'boolean?' },
  DELETE_SESSION: { sessionId: 'string' },
  CLEAR_DATA: {},
  GET_DASHBOARD_STATS: {},
  REMOVE_SAVED_ITEM: { id: 'string' },
  EXPORT_DATA: {},
  CLEAR_ALL_DATA: {},
  GO_HOME: {},
  CHECK_STORAGE_QUOTA: {}
};
const TYPE_CHECKS = {
  string: (v) => typeof v === 'string',
  boolean: (v) => typeof v === 'boolean',
  object: (v) => v && typeof v === 'object' && !Array.isArray(v)
};
function validateMessage(message) {
  if (!isRecord(message) || !Object.hasOwn(message, 'type') || typeof message.type !== 'string') return false;
  if (!Object.hasOwn(SCHEMAS, message.type)) return false;
  const schema = SCHEMAS[message.type];
  for (const [key, kind] of Object.entries(schema)) {
    const optional = kind.endsWith('?');
    const base = optional ? kind.slice(0, -1) : kind;
    if (!Object.hasOwn(message, key)) {
      if (!optional) return false;
      continue;
    }
    if (message[key] == null) {
      if (!optional) return false;
      continue;
    }
    if (!TYPE_CHECKS[base](message[key])) return false;
  }
  return true;
}

chrome.webNavigation?.onHistoryStateUpdated?.addListener((details) => {
  return wrapWithErrorBoundary(async (details) => {
    if (details.frameId !== 0 || details.tabId == null || !details.url) return;
    if (!isSpaDomain(hostnameOf(details.url))) return;
    if (recentlyObservedSpa(details.tabId, details.url)) return;
    const tab = await chrome.tabs.get(details.tabId);
    if (!tab?.url) return;
    await trackLink({ tabId: tab.id, url: tab.url, title: tab.title, targetBlank: false, windowId: Number.isInteger(tab.windowId) ? tab.windowId : null });
  }, { category: ERROR_CATEGORIES.NAVIGATION, component: 'service-worker', function: 'webNavigation.onHistoryStateUpdated', swallow: true })(details);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  return wrapWithErrorBoundary(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) await observeTab(tabId, tab.url, tab.title, tab.openerTabId, tab.windowId);
  }, { category: ERROR_CATEGORIES.NAVIGATION, component: 'service-worker', function: 'tabs.onUpdated', swallow: true })(tabId, changeInfo, tab);
});
chrome.tabs.onRemoved.addListener((tabId) => {
  return wrapWithErrorBoundary(async (tabId) => {
    await mutate((state) => {
      const session = activeSession(state);
      if (!session) return NO_CHANGE;
      let changed = false;
      if (session.origin?.tabId === tabId) { session.origin.tabId = null; changed = true; }
      const pendingBefore = (session.pendingRedirects || []).length;
      clearPendingRedirect(session, tabId);
      if (session.pendingRedirects.length !== pendingBefore) changed = true;
      const node = nodeForTab(session, tabId);
      if (!node || node.closedAt) return changed ? session : NO_CHANGE;
      detachTab(node, tabId);
      if (!node.tabIds?.length) node.closedAt = Date.now();
      return node;
    });
  }, { category: ERROR_CATEGORIES.NAVIGATION, component: 'service-worker', function: 'tabs.onRemoved', swallow: true })(tabId);
});
