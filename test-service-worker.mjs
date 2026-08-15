import assert from 'node:assert/strict';

const store = {};
const messages = [];
const tabActions = [];
const listeners = { installed: [], message: [], updated: [], removed: [] };

globalThis.chrome = {
  storage: {
    local: {
      async get(key) { return key in store ? { [key]: structuredClone(store[key]) } : {}; },
      async set(value) { Object.assign(store, structuredClone(value)); }
    }
  },
  runtime: {
    onInstalled: { addListener(fn) { listeners.installed.push(fn); } },
    onMessage: { addListener(fn) { listeners.message.push(fn); } }
  },
  tabs: {
    onUpdated: { addListener(fn) { listeners.updated.push(fn); } },
    onRemoved: { addListener(fn) { listeners.removed.push(fn); } },
    async remove(id) { tabActions.push(['remove', id]); },
    async update(id, patch) { tabActions.push(['update', id, patch]); },
    async create(info) { tabActions.push(['create', info]); return { id: 99, ...info }; }
  }
};

await import('./background/service-worker.js');
const handler = listeners.message[0];
async function send(message, tab = undefined) {
  return await new Promise((resolve, reject) => {
    handler(message, { tab }, (response) => response?.error ? reject(new Error(response.error)) : resolve(response));
  });
}
function session() { return store.focusForestState.sessions.find((s) => s.id === store.focusForestState.activeSessionId); }

await send({ type: 'START_MISSION', mission: 'Find a good laptop to buy.', tab: { id: 7, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com', title: 'Origin' }, { id: 7, openerTabId: undefined });
assert.equal(session().nodes[0].depth, 0, 'first ordinary page must become depth 0');
assert.equal(session().origin.tabId, 7, 'origin tab must be remembered');
const activeView = await send({ type: 'GET_ACTIVE_VIEW' }, { id: 7 });
assert.equal(activeView.session.mission, 'Find a good laptop to buy.', 'active view should carry the current mission');
assert.equal(activeView.session.node.depth, 0, 'active view should carry only the current node depth');
assert.equal('nodes' in activeView.session, false, 'active view should not serialize full branch history to page scripts');
assert.equal((await send({ type: 'GET_ACTIVE_VIEW' }, { id: 88 })).session, null, 'untracked tabs should not receive a mission chip view');

await send({ type: 'OBSERVE_PAGE', url: 'https://unrelated.example', title: 'Unrelated' }, { id: 88 });
assert.equal(session().nodes.length, 1, 'unrelated tabs must not become branches');

for (const [i, path] of ['/battery', '/mines', '/bolivia', '/inca', '/weapons'].entries()) {
  const url = `https://example.com${path}`;
  await send({ type: 'LINK_CLICK', url, title: path, targetBlank: false }, { id: 7 });
  await send({ type: 'OBSERVE_PAGE', url, title: path }, { id: 7 });
  assert.equal(session().nodes.at(-1).depth, i + 1, `link ${path} should create depth ${i + 1}`);
}
assert.equal(Math.max(...session().nodes.map((n) => n.depth)), 5, 'five links should reach interruption depth');
assert.equal(session().nodes.at(-1).state, 'interrupted', 'depth 5 should be interrupted');
assert.equal(session().nodes.slice(0, -1).some((node) => node.tabIds?.includes(7)), false, 'a navigating tab should not remain attached to historical nodes');

await send({ type: 'COMPOST', url: 'https://example.com/weapons', title: 'Weapons' }, { id: 7 });
assert.equal(store.focusForestState.schemaVersion, 2, 'state should use the compact schema');
assert.equal('transitions' in session(), false, 'nodes should be the only branch relationship source');
assert.equal(store.focusForestState.compostItems.length, 1, 'compost should save one item');
assert.equal(tabActions.some((action) => action[0] === 'remove' && action[1] === 7), false, 'compost must not close the current tab');

await send({ type: 'CLEAR_DATA' });
tabActions.length = 0;
await send({ type: 'START_MISSION', mission: 'First mission', tab: { id: 7, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'START_MISSION', mission: 'Research history', tab: { id: 9, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
assert.equal(store.focusForestState.sessions[0].status, 'completed', 'starting a new mission should complete the prior garden');
assert.equal(store.focusForestState.sessions[0].endReason, 'mission_changed', 'prior garden should record the reason for change');
await send({ type: 'CLEAR_DATA' });
tabActions.length = 0;
await send({ type: 'START_MISSION', mission: 'Research history', tab: { id: 7, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://history.example', title: 'History' }, { id: 7 });
const beforeDuplicate = session().nodes.length;
await send({ type: 'OBSERVE_PAGE', url: 'https://history.example', title: 'History duplicate' }, { id: 8, openerTabId: 7 });
assert.equal(session().nodes.length, beforeDuplicate, 'duplicate tab should reuse the known path');
assert.equal(session().nodes.find((node) => node.url === 'https://history.example/').tabIds.includes(8), true, 'known path should attach duplicate tab alias');
const beforeNewTab = session().nodes.length;
await send({ type: 'LINK_CLICK', url: 'https://history.example/inca', title: 'Inca', targetBlank: true }, { id: 7 });
assert.equal(session().nodes.length, beforeNewTab, 'new-tab click should wait for the destination tab before adding a node');
await send({ type: 'OBSERVE_PAGE', url: 'https://history.example/inca', title: 'Inca' }, { id: 8, openerTabId: 7 });
assert.equal(session().nodes.at(-1).depth, 1, 'new tab link should inherit source depth');
const beforeRedirect = session().nodes.length;
await send({ type: 'LINK_CLICK', url: 'https://search.example/redirect?target=https%3A%2F%2Fhistory.example%2Ffinal', title: 'Redirect', targetBlank: false }, { id: 7 });
await send({ type: 'OBSERVE_PAGE', url: 'https://search.example/redirect?target=https%3A%2F%2Fhistory.example%2Ffinal', title: 'Redirect' }, { id: 7 });
await send({ type: 'OBSERVE_PAGE', url: 'https://history.example/final', title: 'Final' }, { id: 7 });
assert.equal(session().nodes.length, beforeRedirect + 1, 'redirect journey should resolve to one branch node');
const beforeMultiHop = session().nodes.length;
await send({ type: 'LINK_CLICK', url: 'https://search.example/url?target=https%3A%2F%2Fsearch.example%2Fredirect%3Fdest%3Dhttps%253A%252F%252Fhistory.example%252Fdeep', title: 'Multi-hop result', targetBlank: false }, { id: 7 });
await send({ type: 'OBSERVE_PAGE', url: 'https://search.example/url?target=https%3A%2F%2Fsearch.example%2Fredirect%3Fdest%3Dhttps%253A%252F%252Fhistory.example%252Fdeep', title: 'Transport one' }, { id: 7 });
await send({ type: 'OBSERVE_PAGE', url: 'https://search.example/redirect?dest=https%3A%2F%2Fhistory.example%2Fdeep', title: 'Transport two' }, { id: 7 });
await send({ type: 'OBSERVE_PAGE', url: 'https://history.example/deep', title: 'Final destination' }, { id: 7 });
assert.equal(session().nodes.length, beforeMultiHop + 1, 'multi-hop redirect should resolve to one branch node');
assert.equal(session().nodes.at(-1).relationshipConfidence, 'direct', 'resolved redirect should remain a direct structural branch');
assert.equal(session().pendingRedirects.length, 0, 'resolved redirect should clear pending transport state');
const pruneTarget = session().nodes.find((node) => node.depth === 1);
const beforePruneNodes = session().nodes.length;
await send({ type: 'PRUNE_NODE', sessionId: session().id, nodeId: pruneTarget.id, toCompost: true });
assert.equal(session().nodes.length, beforePruneNodes, 'pruning should preserve the historical node');
assert.equal(session().nodes.find((node) => node.id === pruneTarget.id).state, 'pruned', 'pruning should mark the node without deleting it');
assert.equal(store.focusForestState.compostItems.some((item) => item.url === pruneTarget.url), true, 'returning a branch to compost should save its canonical path');
const eventCountBeforeInvalidPrune = session().events.length;
await send({ type: 'PRUNE_NODE', sessionId: 'not-this-session', nodeId: pruneTarget.id, toCompost: true });
assert.equal(session().events.length, eventCountBeforeInvalidPrune, 'cross-session prune requests must not mutate the garden');
await send({ type: 'UPDATE_SETTINGS', settings: { gentleDepth: 2, choiceDepth: 3 } });
assert.equal((await send({ type: 'GET_SNAPSHOT' })).thresholds.DESATURATE, 2, 'gentle depth should be locally configurable');
await send({ type: 'UPDATE_SETTINGS', settings: { gentleDepth: 99, choiceDepth: 0 } });
const clamped = await send({ type: 'GET_SNAPSHOT' });
assert.equal(clamped.thresholds.DESATURATE, 8, 'gentle depth should clamp to the safe maximum');
assert.equal(clamped.thresholds.INTERRUPT, 9, 'choice depth should remain one step after the gentle threshold');
await send({ type: 'OBSERVE_PAGE', url: 'https://unlinked.example', title: 'Unlinked' }, { id: 7 });
assert.equal(session().nodes.at(-1).depth, 0, 'manual or external navigation should remain neutral');
const nodeCountBeforeReturn = session().nodes.length;
await send({ type: 'OBSERVE_PAGE', url: 'https://history.example', title: 'History again' }, { id: 7 });
assert.equal(session().nodes.length, nodeCountBeforeReturn, 'returning to a known URL should reuse its node');
await send({ type: 'GO_HOME' });
assert.equal(tabActions.some((a) => a[0] === 'remove'), false, 'Go Home must not close tracked tabs automatically');
const goHomeUpdate = tabActions.find((a) => a[0] === 'update' && a[1] === 7);
assert(goHomeUpdate, 'Go Home should activate origin tab');
assert.equal(goHomeUpdate[2].url, 'https://history.example/', 'Go Home should return the origin tab to its stored origin URL');
await send({ type: 'END_MISSION', reason: 'user_ended' });
await send({ type: 'CLEAR_DATA' });
await send({ type: 'START_MISSION', mission: 'Search root test', tab: { id: 7, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://search.example/search?q=focus', title: 'Search results' }, { id: 7 });
assert.equal(session().nodes[0].depth, 0, 'directly opened search page should remain a neutral root');
await send({ type: 'END_MISSION', reason: 'user_ended' });
assert.equal((await send({ type: 'GET_SNAPSHOT' })).session, null, 'completed mission should not reappear as active page state');
assert.equal((await send({ type: 'GET_SNAPSHOT', includeHistory: true })).session.mission, 'Search root test', 'dashboard history should expose the latest completed garden');
assert.equal(store.focusForestState.sessions.length <= 12, true, 'session history should remain bounded');
assert.equal(store.focusForestState.sessions.at(-1).events.length <= 72, true, 'event history should remain bounded');
const forgetId = store.focusForestState.sessions.at(-1).id;
await send({ type: 'DELETE_SESSION', sessionId: forgetId });
assert.equal(store.focusForestState.sessions.some((item) => item.id === forgetId), false, 'selected garden should be deletable without clearing all history');

await send({ type: 'START_MISSION', mission: 'Boundary safety', tab: { id: 31, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://safe.example', title: 'Safe' }, { id: 31 });
const safeNodeCount = session().nodes.length; const safeCompostCount = store.focusForestState.compostItems.length; const safeEvents = session().events.length;
await send({ type: 'OBSERVE_PAGE', url: 'javascript:alert(1)', title: 'Unsafe' }, { id: 31 });
await send({ type: 'LINK_CLICK', url: 'data:text/html,<script>alert(1)</script>', title: 'Unsafe', targetBlank: false }, { id: 31 });
await send({ type: 'COMPOST', url: 'javascript:alert(1)', title: 'Unsafe' }, { id: 31 });
assert.equal(session().nodes.length, safeNodeCount, 'unsafe URL schemes must not create nodes');
assert.equal(store.focusForestState.compostItems.length, safeCompostCount, 'unsafe URL schemes must not create compost items');
assert.equal(session().events.length, safeEvents, 'unsafe URL schemes must not create navigation events');
const beforeInvalidMutation = JSON.stringify(store.focusForestState);
await send({ type: 'PRUNE_NODE', sessionId: 'bad.id', nodeId: 'bad.id', toCompost: true });
assert.equal(JSON.stringify(store.focusForestState), beforeInvalidMutation, 'invalid identifiers must not mutate state');
await Promise.all([send({ type: 'UPDATE_SETTINGS', settings: { gentleDepth: 3, choiceDepth: 4 } }), send({ type: 'UPDATE_SETTINGS', settings: { gentleDepth: 5, choiceDepth: 6 } })]);
const concurrentSnapshot = await send({ type: 'GET_SNAPSHOT' });
assert.equal(concurrentSnapshot.thresholds.INTERRUPT >= concurrentSnapshot.thresholds.DESATURATE + 1, true, 'concurrent settings updates must preserve threshold ordering');
await listeners.removed[0](31);
tabActions.length = 0;
await send({ type: 'GO_HOME' });
assert.equal(tabActions.some((action) => action[0] === 'update' || action[0] === 'create'), false, 'stale origin removal must not target a reused tab');

await assert.doesNotReject(() => send(null), 'null runtime messages must be ignored safely');
await send({ type: 'CLEAR_DATA' });
await send({ type: 'START_MISSION', mission: 'Pending collision', tab: { id: 101, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://origin.example', title: 'Origin' }, { id: 101 });
await send({ type: 'LINK_CLICK', url: 'https://origin.example/a', title: 'A', targetBlank: false }, { id: 101 });
await send({ type: 'OBSERVE_PAGE', url: 'https://origin.example/a', title: 'A' }, { id: 101 });
const aNode = session().nodes.at(-1);
await send({ type: 'OBSERVE_PAGE', url: 'https://origin.example', title: 'Origin' }, { id: 102, openerTabId: 101 });
await send({ type: 'LINK_CLICK', url: 'https://origin.example/b', title: 'B', targetBlank: false }, { id: 102 });
await send({ type: 'OBSERVE_PAGE', url: 'https://origin.example/b', title: 'B' }, { id: 102 });
const bNode = session().nodes.at(-1);
await send({ type: 'LINK_CLICK', url: 'https://shared.example/path', title: 'Shared', targetBlank: true }, { id: 101 });
await send({ type: 'LINK_CLICK', url: 'https://shared.example/path', title: 'Shared', targetBlank: true }, { id: 102 });
const shared = await send({ type: 'OBSERVE_PAGE', url: 'https://shared.example/path', title: 'Shared' }, { id: 101 });
assert.equal(shared.parentId, aNode.id, 'same-destination pending links must retain the source-tab relationship');
assert.notEqual(shared.parentId, bNode.id, 'pending links from another source tab must not overwrite this relationship');
await send({ type: 'CLEAR_DATA' });
await send({ type: 'START_MISSION', mission: 'Alias care', tab: { id: 201, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://alias.example', title: 'Alias' }, { id: 201 });
await send({ type: 'OBSERVE_PAGE', url: 'https://alias.example', title: 'Alias duplicate' }, { id: 202, openerTabId: 201 });
await send({ type: 'COMPOST', url: 'https://alias.example', title: 'Alias' }, { id: 201 });
const closedAliasNode = session().nodes.find((node) => node.url === 'https://alias.example/');
assert.deepEqual(closedAliasNode.tabIds, [], 'composting a path must detach every live tab alias');

console.log('service-worker behavioral tests passed');
