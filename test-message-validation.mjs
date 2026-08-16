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

console.log('Testing message validation...');

// Test 1: Valid GET_SNAPSHOT (no required fields)
const result1 = await send({ type: 'GET_SNAPSHOT' });
assert.ok(result1, 'GET_SNAPSHOT should succeed with no required fields');

// Test 2: Valid GET_ACTIVE_VIEW (no required fields)
const result2 = await send({ type: 'GET_ACTIVE_VIEW' }, { id: 1 });
assert.ok(result2, 'GET_ACTIVE_VIEW should succeed with no required fields');

// Test 3: START_MISSION requires 'mission'
const result3 = await send({ type: 'START_MISSION' }, { id: 1 });
assert.equal(result3, null, 'START_MISSION without mission should return null');

const result3b = await send({ type: 'START_MISSION', mission: 'Valid mission' }, { id: 2 });
assert.ok(result3b, 'START_MISSION with mission should succeed');

// Test 4: END_MISSION (no required fields)
const result4 = await send({ type: 'END_MISSION' });
assert.ok(result4, 'END_MISSION should succeed with no required fields');

// Test 5: LINK_CLICK requires 'url'
const result5 = await send({ type: 'LINK_CLICK' }, { id: 3 });
assert.equal(result5, null, 'LINK_CLICK without url should return null');

await send({ type: 'START_MISSION', mission: 'Link test', tab: { id: 4, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com', title: 'Example' }, { id: 4 });
const result5b = await send({ type: 'LINK_CLICK', url: 'https://example.com/link' }, { id: 4 });
assert.ok(result5b, 'LINK_CLICK with url should succeed');

// Test 6: OBSERVE_PAGE requires 'url'
const result6 = await send({ type: 'OBSERVE_PAGE' }, { id: 5 });
assert.equal(result6, null, 'OBSERVE_PAGE without url should return null');

await send({ type: 'START_MISSION', mission: 'Observe test', tab: { id: 5, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
const result6b = await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/page' }, { id: 5 });
assert.ok(result6b, 'OBSERVE_PAGE with url should succeed');

// Test 7: COMPOST requires 'url'
const result7 = await send({ type: 'COMPOST' }, { id: 6 });
assert.equal(result7, null, 'COMPOST without url should return null');

await send({ type: 'START_MISSION', mission: 'Compost test', tab: { id: 7, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/compost', title: 'Compost' }, { id: 7 });
const result7b = await send({ type: 'COMPOST', url: 'https://example.com/compost' }, { id: 7 });
assert.ok(result7b, 'COMPOST with url should succeed');

// Test 8: PAUSE_INTERVENTION requires 'paused'
const result8 = await send({ type: 'PAUSE_INTERVENTION' }, { id: 8 });
assert.equal(result8, null, 'PAUSE_INTERVENTION without paused should return null');

const result8b = await send({ type: 'PAUSE_INTERVENTION', paused: true }, { id: 8 });
assert.ok(result8b, 'PAUSE_INTERVENTION with paused should succeed');

// Test 9: UPDATE_SETTINGS requires 'settings'
const result9 = await send({ type: 'UPDATE_SETTINGS' });
assert.equal(result9, null, 'UPDATE_SETTINGS without settings should return null');

const result9b = await send({ type: 'UPDATE_SETTINGS', settings: { gentleDepth: 3 } });
assert.ok(result9b, 'UPDATE_SETTINGS with settings should succeed');

// Test 10: DELETE_COMPOST requires 'id'
const result10 = await send({ type: 'DELETE_COMPOST' });
assert.equal(result10, null, 'DELETE_COMPOST without id should return null');

// Test 11: PRUNE_NODE requires 'sessionId' and 'nodeId'
const result11a = await send({ type: 'PRUNE_NODE' });
assert.equal(result11a, null, 'PRUNE_NODE without params should return null');

const result11b = await send({ type: 'PRUNE_NODE', sessionId: 'test' });
assert.equal(result11b, null, 'PRUNE_NODE without nodeId should return null');

const result11c = await send({ type: 'PRUNE_NODE', nodeId: 'test' });
assert.equal(result11c, null, 'PRUNE_NODE without sessionId should return null');

// Test 12: DELETE_SESSION requires 'sessionId'
const result12 = await send({ type: 'DELETE_SESSION' });
assert.equal(result12, null, 'DELETE_SESSION without sessionId should return null');

// Test 13: CLEAR_DATA (no required fields)
const result13 = await send({ type: 'CLEAR_DATA' });
assert.ok(result13, 'CLEAR_DATA should succeed');

// Test 14: GO_HOME (no required fields)
await send({ type: 'START_MISSION', mission: 'Go home test', tab: { id: 9, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
const result14 = await send({ type: 'GO_HOME' });
assert.ok(result14, 'GO_HOME should succeed');

// Test 15: Unknown message type returns null
const result15 = await send({ type: 'UNKNOWN_TYPE' });
assert.equal(result15, null, 'Unknown message type should return null');

// Test 16: Non-object message returns null
const result16 = await send(null);
assert.equal(result16, null, 'Null message should return null');

const result16b = await send('not an object');
assert.equal(result16b, null, 'String message should return null');

const result16c = await send([]);
assert.equal(result16c, null, 'Array message should return null');

// Test 17: Message without type returns null
const result17 = await send({});
assert.equal(result17, null, 'Message without type should return null');

// Test 18: Message with non-string type returns null
const result18 = await send({ type: 123 });
assert.equal(result18, null, 'Message with non-string type should return null');

// Test 19: Valid id format for DELETE_COMPOST
const result19a = await send({ type: 'DELETE_COMPOST', id: 'valid-id_123' });
assert.equal(result19a, null, 'Valid format but non-existent id should return null (no error)');

const result19b = await send({ type: 'DELETE_COMPOST', id: 'invalid id!' });
assert.equal(result19b, null, 'Invalid id format should return null');

// Test 20: Valid sessionId/nodeId format for PRUNE_NODE
await send({ type: 'START_MISSION', mission: 'Prune test', tab: { id: 10, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/prune', title: 'Prune' }, { id: 10 });
await send({ type: 'LINK_CLICK', url: 'https://example.com/prune2', title: 'Prune 2', targetBlank: false }, { id: 10 });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/prune2', title: 'Prune 2' }, { id: 10 });
// Find a non-root node (depth > 0)
const pruneNode = session().nodes.find(n => n.depth > 0);
assert.ok(pruneNode, 'Should have a non-root node to prune');
const result20 = await send({ type: 'PRUNE_NODE', sessionId: session().id, nodeId: pruneNode.id, toCompost: false });
assert.ok(result20, 'PRUNE_NODE with valid ids should succeed');

// Test 21: Invalid sessionId format
const result21 = await send({ type: 'PRUNE_NODE', sessionId: 'invalid id!', nodeId: 'valid-id_123' });
assert.equal(result21, null, 'Invalid sessionId format should return null');

// Test 22: Invalid nodeId format
const result22 = await send({ type: 'PRUNE_NODE', sessionId: 'valid-id_123', nodeId: 'invalid id!' });
assert.equal(result22, null, 'Invalid nodeId format should return null');

console.log('Message validation tests passed!');