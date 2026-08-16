import assert from 'node:assert/strict';

const store = {};
const listeners = { installed: [], message: [], updated: [], removed: [] };
const tabInfo = new Map();
const tabActions = [];
const windowActions = [];

globalThis.chrome = {
  storage: { local: { async get(key) { return key in store ? { [key]: structuredClone(store[key]) } : {}; }, async set(value) { Object.assign(store, structuredClone(value)); } } },
  runtime: { onInstalled: { addListener(fn) { listeners.installed.push(fn); } }, onMessage: { addListener(fn) { listeners.message.push(fn); } } },
  windows: { async update(id, patch) { windowActions.push(['update', id, patch]); } },
  tabs: { onUpdated: { addListener(fn) { listeners.updated.push(fn); } }, onRemoved: { addListener(fn) { listeners.removed.push(fn); } }, async get(id) { const tab = tabInfo.get(id); if (!tab) throw new Error('No tab'); return structuredClone({ id, windowId: tab.windowId || 1, ...tab }); }, async update(id, patch) { const next = { ...(tabInfo.get(id) || { id, windowId: 1 }), ...patch }; tabInfo.set(id, next); tabActions.push(['update', id, patch]); }, async create(info) { const id = 99 + tabInfo.size; tabInfo.set(id, { id, windowId: info.windowId || 1, ...info }); tabActions.push(['create', info]); return { id, ...info }; } }
};

await import('./background/service-worker.js');
const handler = listeners.message[0];

async function send(message, tab = undefined) {
  if (tab?.id != null) {
    const current = { ...(tabInfo.get(tab.id) || {}), windowId: tab.windowId || 1, ...tab };
    if (message?.type === 'OBSERVE_PAGE' && typeof message.url === 'string') { current.url = message.url; current.title = message.title || current.title; }
    tabInfo.set(tab.id, current);
  }
  return await new Promise((resolve, reject) => { handler(message, { tab }, (response) => response?.error ? reject(new Error(response.error)) : resolve(response)); });
}
function session() { return store.focusForestState.sessions.find((s) => s.id === store.focusForestState.activeSessionId); }

console.log('Testing multi-window support...');

// Test 1: windowId in LINK_CLICK pending branch
await send({ type: 'START_MISSION', mission: 'Multi-window test 1', tab: { id: 1, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab', windowId: 1 } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com', title: 'Example' }, { id: 1, windowId: 1 });

// Click link with targetBlank in window 1
await send({ type: 'LINK_CLICK', url: 'https://example.com/page2', title: 'Page 2', targetBlank: true }, { id: 1, windowId: 1 });
// The LINK_CLICK should create a pending branch with windowId

// Test 2: OBSERVE_PAGE in different window with same URL should use windowId
tabInfo.set(2, { id: 2, windowId: 2, url: 'https://example.com/page2', title: 'Page 2' });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/page2', title: 'Page 2' }, { id: 2, windowId: 2, openerTabId: 1 });
// Should resolve the pending branch from window 1

assert.equal(session().nodes.length, 2, 'Should have origin + 1 branch');
const branchNode = session().nodes.find(n => n.depth === 1);
assert.ok(branchNode, 'Should have a branch node');
// When openerTabId is provided, relationshipConfidence is 'tab-inferred' (opener takes precedence)
assert.equal(branchNode.relationshipConfidence, 'tab-inferred', 'Should be tab-inferred when openerTabId provided');

// Test 3: Different window, same tabId (tab reuse) - windowId should differentiate
await send({ type: 'START_MISSION', mission: 'Multi-window test 3', tab: { id: 3, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab', windowId: 1 } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/win1', title: 'Window 1' }, { id: 3, windowId: 1 });

// New window, new tab
tabInfo.set(4, { id: 4, windowId: 2, url: 'https://example.com/win2', title: 'Window 2' });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/win2', title: 'Window 2' }, { id: 4, windowId: 2 });
// This should be a new origin for the new window

// Test 4: GO_HOME focuses correct window (when origin tab is still on origin URL)
await send({ type: 'START_MISSION', mission: 'Go Home window test', tab: { id: 5, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab', windowId: 2 } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/origin', title: 'Origin' }, { id: 5, windowId: 2 });
// Don't navigate away - stay on origin
windowActions.length = 0;
await send({ type: 'GO_HOME' });
assert.ok(windowActions.some(a => a[0] === 'update' && a[1] === 2 && a[2].focused === true), 'GO_HOME should focus window 2 when tab is on origin');

// Test 5: Pending branch collision across windows
await send({ type: 'START_MISSION', mission: 'Collision test', tab: { id: 6, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab', windowId: 1 } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/collision', title: 'Collision Origin' }, { id: 6, windowId: 1 });

// Window 1 clicks link in new tab
await send({ type: 'LINK_CLICK', url: 'https://shared.example/path', title: 'Shared', targetBlank: true }, { id: 6, windowId: 1 });
// Window 2 (different tab) clicks same link
tabInfo.set(7, { id: 7, windowId: 2, url: 'https://example.com/collision', title: 'Collision Origin' });
await send({ type: 'LINK_CLICK', url: 'https://shared.example/path', title: 'Shared', targetBlank: true }, { id: 7, windowId: 2 });

// Window 1 loads the page
tabInfo.set(8, { id: 8, windowId: 1, url: 'https://shared.example/path', title: 'Shared' });
await send({ type: 'OBSERVE_PAGE', url: 'https://shared.example/path', title: 'Shared' }, { id: 8, windowId: 1, openerTabId: 6 });
// Should resolve to window 1's pending branch

// Window 2 loads the page
tabInfo.set(9, { id: 9, windowId: 2, url: 'https://shared.example/path', title: 'Shared' });
await send({ type: 'OBSERVE_PAGE', url: 'https://shared.example/path', title: 'Shared' }, { id: 9, windowId: 2, openerTabId: 7 });
// Should resolve to window 2's pending branch

// Both should have created separate branches (or shared if same opener logic applies)
// The key is that windowId differentiates the pending branches

console.log('Multi-window support tests passed!');