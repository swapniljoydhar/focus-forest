export const THRESHOLDS = { DESATURATE: 4, INTERRUPT: 5, gentleDepth: 4, choiceDepth: 5 };
export const STORAGE_KEY = 'focusForestState';
export const SCHEMA_VERSION = 2;
export const LIMITS = { SESSIONS: 12, NODES_PER_SESSION: 96, EVENTS_PER_SESSION: 72, COMPOST: 80, TITLE: 120, URL: 1024 };
export const DEFAULT_SETTINGS = { gentleDepth: 4, choiceDepth: 5, ambientMotion: true, growthAnimationTrigger: 'mission-origin' };

export function emptyState() {
  return { schemaVersion: SCHEMA_VERSION, activeSessionId: null, sessions: [], compostItems: [], settings: { interventionsPaused: false, ...DEFAULT_SETTINGS } };
}

export function makeId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function compactText(value, max = LIMITS.TITLE) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

const TRACKING_PARAMETERS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid']);
const SEARCH_DOMAINS = new Set(['google', 'bing', 'duckduckgo', 'yahoo', 'startpage', 'brave', 'baidu', 'yandex', 'ecosia', 'qwant']);
const SEARCH_PARAMS = new Set(['q', 'search', 'query', 'p']);

export function isSearchUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (SEARCH_DOMAINS.has(host.split('.').slice(-2).join('.'))) return true;
    for (const key of url.searchParams.keys()) { if (SEARCH_PARAMS.has(key.toLowerCase())) return true; }
    return false;
  } catch { return false; }
}

export function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    [...url.searchParams.keys()].forEach((key) => { if (TRACKING_PARAMETERS.has(key.toLowerCase())) url.searchParams.delete(key); });
    return url.href.slice(0, LIMITS.URL);
  } catch {
    return String(value || '').slice(0, LIMITS.URL);
  }
}

export function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return canonicalUrl(url.href);
  } catch {
    return null;
  }
}

export function getDepthState(depth, paused = false, thresholds = THRESHOLDS) {
  if (paused) return 'paused';
  if (depth >= thresholds.choiceDepth) return 'interrupted';
  if (depth >= thresholds.gentleDepth) return 'desaturated';
  return 'normal';
}

export function activeSession(state) {
  return state.sessions.find((session) => session.id === state.activeSessionId) || null;
}

const SAFE_STATES = new Set(['normal', 'desaturated', 'interrupted', 'paused', 'pruned', 'composted']);
const SAFE_CONFIDENCE = new Set(['direct', 'tab-inferred', 'external']);
const SAFE_REASONS = new Set(['user_ended', 'mission_changed', 'browse_without_mission']);
function safeSessionUrl(value) {
  const raw = String(value || ''); const http = safeHttpUrl(raw); if (http) return http;
  return /^chrome:\/\/newtab(?:\/|$)/i.test(raw) || /^chrome-extension:\/\/[a-z0-9-]+\//i.test(raw) ? raw.slice(0, LIMITS.URL) : null;
}
function compactNode(node) {
  if (!node || typeof node !== 'object') return null;
  const id = compactText(node.id, 120); const url = safeSessionUrl(node.url); if (!id || !url) return null;
  const parentId = typeof node.parentId === 'string' && node.parentId !== id ? compactText(node.parentId, 120) : null;
  return { id, tabIds: Array.isArray(node.tabIds) ? node.tabIds.filter(Number.isInteger).slice(-8) : Number.isInteger(node.tabId) ? [node.tabId] : [], url, title: compactText(node.title || url, LIMITS.TITLE), parentId, depth: Math.max(0, Math.min(LIMITS.NODES_PER_SESSION, Number(node.depth) || 0)), firstSeenAt: Number.isFinite(node.firstSeenAt) ? node.firstSeenAt : Date.now(), relationshipConfidence: SAFE_CONFIDENCE.has(node.relationshipConfidence) ? node.relationshipConfidence : 'external', state: SAFE_STATES.has(node.state) ? node.state : 'normal', ...(Number.isFinite(node.closedAt) ? { closedAt: node.closedAt } : {}), ...(Number.isFinite(node.prunedAt) ? { prunedAt: node.prunedAt } : {}) };
}
function compactEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const type = compactText(event.type, 64); if (!type) return null;
  const result = { id: compactText(event.id, 120), type, at: Number.isFinite(event.at) ? event.at : Date.now() };
  if (typeof event.nodeId === 'string') result.nodeId = compactText(event.nodeId, 120);
  if (typeof event.mission === 'string') result.mission = compactText(event.mission, 140);
  if (typeof event.url === 'string' && safeHttpUrl(event.url)) result.url = safeHttpUrl(event.url);
  if (Number.isFinite(event.depth)) result.depth = Math.max(0, Math.min(LIMITS.NODES_PER_SESSION, Number(event.depth) || 0));
  if (SAFE_REASONS.has(event.reason)) result.reason = event.reason;
  return result;
}
function compactSession(session) {
  if (!session || typeof session !== 'object') return null;
  const id = compactText(session.id, 120); if (!id) return null;
  const status = session.status === 'completed' ? 'completed' : 'active';
  return { id, mission: compactText(session.mission, 140), status, startedAt: Number.isFinite(session.startedAt) ? session.startedAt : Date.now(), endedAt: Number.isFinite(session.endedAt) ? session.endedAt : null, endReason: SAFE_REASONS.has(session.endReason) ? session.endReason : null, origin: { tabId: Number.isInteger(session.origin?.tabId) ? session.origin.tabId : null, windowId: Number.isInteger(session.origin?.windowId) ? session.origin.windowId : null, url: safeSessionUrl(session.origin?.url) || 'chrome://newtab', title: compactText(session.origin?.title || 'New Tab', LIMITS.TITLE) }, nodes: Array.isArray(session.nodes) ? session.nodes.slice(-LIMITS.NODES_PER_SESSION).map(compactNode).filter(Boolean) : [], events: Array.isArray(session.events) ? session.events.slice(-LIMITS.EVENTS_PER_SESSION).map(compactEvent).filter(Boolean) : [], pendingRedirects: Array.isArray(session.pendingRedirects) ? session.pendingRedirects.filter((entry) => Number.isInteger(entry?.tabId) && typeof entry?.parentId === 'string').slice(-4).map((entry) => ({ tabId: entry.tabId, parentId: compactText(entry.parentId, 120), createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now() })) : [], interventionPaused: Boolean(session.interventionPaused) };
}

export function normalizeState(value) {
  const fallback = emptyState();
  if (!value || typeof value !== 'object') return fallback;
  const sessions = Array.isArray(value.sessions) ? value.sessions.map(compactSession).filter(Boolean).slice(-LIMITS.SESSIONS) : [];
  const activeSessionId = sessions.some((session) => session.id === value.activeSessionId) ? value.activeSessionId : null;
  return {
    schemaVersion: SCHEMA_VERSION,
    activeSessionId,
    sessions,
    compostItems: Array.isArray(value.compostItems) ? value.compostItems.slice(0, LIMITS.COMPOST).map((item) => { const url = safeHttpUrl(item?.url); if (!url) return null; return { id: compactText(item?.id, 120), url, title: compactText(item?.title || url, LIMITS.TITLE), mission: compactText(item?.mission, 140), depth: Math.max(0, Math.min(LIMITS.NODES_PER_SESSION, Number(item?.depth) || 0)), savedAt: Number.isFinite(item?.savedAt) ? item.savedAt : Date.now() }; }).filter((item) => item?.id && item.url) : [],
    settings: normalizeSettings(value.settings, fallback.settings)
  };
}

export function normalizeSettings(value, fallback = emptyState().settings) {
  const source = value && typeof value === 'object' ? value : {};
  const gentleDepth = Math.max(2, Math.min(8, Number(source.gentleDepth) || fallback.gentleDepth));
  const choiceDepth = Math.max(gentleDepth + 1, Math.min(10, Number(source.choiceDepth) || fallback.choiceDepth));
  const growthAnimationTrigger = ['mission-origin', 'every-branch', 'none'].includes(source.growthAnimationTrigger) ? source.growthAnimationTrigger : fallback.growthAnimationTrigger;
  return { interventionsPaused: Boolean(source.interventionsPaused), gentleDepth, choiceDepth, ambientMotion: source.ambientMotion !== false, growthAnimationTrigger };
}

let stateCache = null;
let ownWriteInFlight = false;

export async function loadState() {
  if (stateCache !== null) return stateCache;
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    stateCache = normalizeState(result[STORAGE_KEY]);
    return stateCache;
  } catch {
    return emptyState();
  }
}

export async function saveState(state) {
  ownWriteInFlight = true;
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    stateCache = state;
  } finally {
    ownWriteInFlight = false;
  }
  return state;
}

export function clearStateCache() {
  stateCache = null;
}

// Invalidate the in-memory cache when storage is written from any external
// context (onInstalled seeding, a second extension page, a service-worker
// restart) so loadState() never serves a stale snapshot. Self-writes made
// through saveState() are excluded so the cache stays useful within the
// serialized mutation queue.
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged?.addListener) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY] && !ownWriteInFlight) stateCache = null;
  });
}
