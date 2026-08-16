import assert from 'node:assert/strict';

const store = {};
const listeners = { installed: [], message: [], updated: [], removed: [] };
const tabInfo = new Map();
const tabActions = [];

globalThis.chrome = {
  storage: { local: { async get(key) { return key in store ? { [key]: structuredClone(store[key]) } : {}; }, async set(value) { Object.assign(store, structuredClone(value)); } } },
  runtime: { onInstalled: { addListener(fn) { listeners.installed.push(fn); } }, onMessage: { addListener(fn) { listeners.message.push(fn); } } },
  tabs: { onUpdated: { addListener(fn) { listeners.updated.push(fn); } }, onRemoved: { addListener(fn) { listeners.removed.push(fn); } }, async get(id) { const tab = tabInfo.get(id); if (!tab) throw new Error('No tab'); return structuredClone({ id, windowId: 1, ...tab }); }, async update(id, patch) { const next = { ...(tabInfo.get(id) || { id, windowId: 1 }), ...patch }; tabInfo.set(id, next); tabActions.push(['update', id, patch]); }, async create(info) { const id = 99 + tabInfo.size; tabInfo.set(id, { id, windowId: 1, ...info }); tabActions.push(['create', info]); return { id, ...info }; } }
};

await import('./background/service-worker.js');
const handler = listeners.message[0];

async function send(message, tab = undefined) {
  if (tab?.id != null) {
    const current = { ...(tabInfo.get(tab.id) || {}), windowId: 1, ...tab };
    if (message?.type === 'OBSERVE_PAGE' && typeof message.url === 'string') { current.url = message.url; current.title = message.title || current.title; }
    tabInfo.set(tab.id, current);
  }
  return await new Promise((resolve, reject) => { handler(message, { tab }, (response) => response?.error ? reject(new Error(response.error)) : resolve(response)); });
}
function session() { return store.focusForestState.sessions.find((s) => s.id === store.focusForestState.activeSessionId); }

console.log('Testing growthAnimationTrigger setting...');

// Test 1: Default value is 'mission-origin'
await send({ type: 'START_MISSION', mission: 'Growth test 1', tab: { id: 1, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
const snap1 = await send({ type: 'GET_SNAPSHOT' });
assert.equal(snap1.settings.growthAnimationTrigger, 'mission-origin', 'Default growthAnimationTrigger should be mission-origin');

// Test 2: Can set to 'every-branch'
await send({ type: 'UPDATE_SETTINGS', settings: { growthAnimationTrigger: 'every-branch' } });
const snap2 = await send({ type: 'GET_SNAPSHOT' });
assert.equal(snap2.settings.growthAnimationTrigger, 'every-branch', 'Should accept every-branch');

// Test 3: Can set to 'none'
await send({ type: 'UPDATE_SETTINGS', settings: { growthAnimationTrigger: 'none' } });
const snap3 = await send({ type: 'GET_SNAPSHOT' });
assert.equal(snap3.settings.growthAnimationTrigger, 'none', 'Should accept none');

// Test 4: Invalid value falls back to default
await send({ type: 'UPDATE_SETTINGS', settings: { growthAnimationTrigger: 'invalid-value' } });
const snap4 = await send({ type: 'GET_SNAPSHOT' });
assert.equal(snap4.settings.growthAnimationTrigger, 'mission-origin', 'Invalid value should fall back to mission-origin');

// Test 5: Setting persists across missions
await send({ type: 'UPDATE_SETTINGS', settings: { growthAnimationTrigger: 'every-branch' } });
await send({ type: 'START_MISSION', mission: 'New mission', tab: { id: 2, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
const snap5 = await send({ type: 'GET_SNAPSHOT' });
assert.equal(snap5.settings.growthAnimationTrigger, 'every-branch', 'Setting should persist across missions');

// Test 6: Setting persists after CLEAR_DATA? No, CLEAR_DATA resets to defaults
await send({ type: 'CLEAR_DATA' });
await send({ type: 'START_MISSION', mission: 'After clear', tab: { id: 3, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
const snap6 = await send({ type: 'GET_SNAPSHOT' });
assert.equal(snap6.settings.growthAnimationTrigger, 'mission-origin', 'CLEAR_DATA should reset to default');

// Test 7: Setting is included in GET_ACTIVE_VIEW
await send({ type: 'UPDATE_SETTINGS', settings: { growthAnimationTrigger: 'none' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com', title: 'Example' }, { id: 4 });
const activeView = await send({ type: 'GET_ACTIVE_VIEW' }, { id: 4 });
assert.ok(activeView.settings, 'GET_ACTIVE_VIEW should include settings');
assert.equal(activeView.settings.growthAnimationTrigger, 'none', 'GET_ACTIVE_VIEW should have correct growthAnimationTrigger');

// Test 8: Combined with other settings
await send({ type: 'UPDATE_SETTINGS', settings: { gentleDepth: 3, choiceDepth: 5, growthAnimationTrigger: 'every-branch', ambientMotion: false } });
const snap8 = await send({ type: 'GET_SNAPSHOT' });
assert.equal(snap8.settings.gentleDepth, 3);
assert.equal(snap8.settings.choiceDepth, 5);
assert.equal(snap8.settings.growthAnimationTrigger, 'every-branch');
assert.equal(snap8.settings.ambientMotion, false);

// Test 9: Thresholds update when growthAnimationTrigger changes (should not affect thresholds)
await send({ type: 'UPDATE_SETTINGS', settings: { gentleDepth: 4, choiceDepth: 6, growthAnimationTrigger: 'none' } });
const snap9 = await send({ type: 'GET_SNAPSHOT' });
assert.equal(snap9.thresholds.DESATURATE, 4);
assert.equal(snap9.thresholds.INTERRUPT, 6);

console.log('growthAnimationTrigger tests passed!');