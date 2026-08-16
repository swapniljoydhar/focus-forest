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

console.log('Testing search URL detection...');

// Test 1: Google search with q parameter
await send({ type: 'START_MISSION', mission: 'Search test 1', tab: { id: 1, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://google.com/search?q=focus+forest', title: 'Google Search' }, { id: 1 });
assert.equal(session().nodes.length, 1, 'Google search with q param should be depth 0 (neutral)');
assert.equal(session().nodes[0].depth, 0, 'Search page should remain depth 0');

// Test 2: Bing search with q parameter
await send({ type: 'START_MISSION', mission: 'Search test 2', tab: { id: 2, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://bing.com/search?q=test', title: 'Bing Search' }, { id: 2 });
assert.equal(session().nodes.length, 1, 'Bing search with q param should be depth 0');
assert.equal(session().nodes[0].depth, 0, 'Search page should remain depth 0');

// Test 3: DuckDuckGo search
await send({ type: 'START_MISSION', mission: 'Search test 3', tab: { id: 3, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://duckduckgo.com/?q=privacy', title: 'DuckDuckGo' }, { id: 3 });
assert.equal(session().nodes.length, 1, 'DuckDuckGo search should be depth 0');
assert.equal(session().nodes[0].depth, 0, 'Search page should remain depth 0');

// Test 4: Yahoo search with p parameter
await send({ type: 'START_MISSION', mission: 'Search test 4', tab: { id: 4, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://search.yahoo.com/search?p=yahoo', title: 'Yahoo Search' }, { id: 4 });
assert.equal(session().nodes.length, 1, 'Yahoo search with p param should be depth 0');
assert.equal(session().nodes[0].depth, 0, 'Search page should remain depth 0');

// Test 5: Search with 'search' parameter
await send({ type: 'START_MISSION', mission: 'Search test 5', tab: { id: 5, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/search?search=term', title: 'Search' }, { id: 5 });
assert.equal(session().nodes.length, 1, 'Search with search param should be depth 0');
assert.equal(session().nodes[0].depth, 0, 'Search page should remain depth 0');

// Test 6: Search with 'query' parameter
await send({ type: 'START_MISSION', mission: 'Search test 6', tab: { id: 6, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/find?query=test', title: 'Find' }, { id: 6 });
assert.equal(session().nodes.length, 1, 'Search with query param should be depth 0');
assert.equal(session().nodes[0].depth, 0, 'Search page should remain depth 0');

// Test 7: Non-search URL on search domain (should track normally)
await send({ type: 'START_MISSION', mission: 'Search test 7', tab: { id: 7, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://google.com/about', title: 'About Google' }, { id: 7 });
assert.equal(session().nodes.length, 1, 'Non-search Google page should be depth 0');
await send({ type: 'LINK_CLICK', url: 'https://google.com/about/careers', title: 'Careers', targetBlank: false }, { id: 7 });
await send({ type: 'OBSERVE_PAGE', url: 'https://google.com/about/careers', title: 'Careers' }, { id: 7 });
assert.equal(session().nodes.length, 2, 'Link from non-search Google page should create depth 1');
assert.equal(session().nodes[1].depth, 1, 'Should be depth 1');

// Test 8: Clicking link FROM search page should create normal branch
await send({ type: 'START_MISSION', mission: 'Search test 8', tab: { id: 8, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://google.com/search?q=test', title: 'Google Search' }, { id: 8 });
assert.equal(session().nodes.length, 1, 'Search page should be depth 0');
await send({ type: 'LINK_CLICK', url: 'https://example.com/result', title: 'Result', targetBlank: false }, { id: 8 });
await send({ type: 'OBSERVE_PAGE', url: 'https://example.com/result', title: 'Result' }, { id: 8 });
assert.equal(session().nodes.length, 2, 'Link from search page should create depth 1');
assert.equal(session().nodes[1].depth, 1, 'Should be depth 1');
assert.equal(session().nodes[1].relationshipConfidence, 'direct', 'Should be direct link');

// Test 9: Subdomain of search engine
await send({ type: 'START_MISSION', mission: 'Search test 9', tab: { id: 9, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://www.google.com/search?q=test', title: 'Google Search' }, { id: 9 });
assert.equal(session().nodes.length, 1, 'www.google.com search should be depth 0');
assert.equal(session().nodes[0].depth, 0);

// Test 10: International Google domains
await send({ type: 'START_MISSION', mission: 'Search test 10', tab: { id: 10, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://google.co.uk/search?q=test', title: 'Google UK' }, { id: 10 });
assert.equal(session().nodes.length, 1, 'google.co.uk search should be depth 0');
assert.equal(session().nodes[0].depth, 0);

await send({ type: 'START_MISSION', mission: 'Search test 11', tab: { id: 11, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://google.de/search?q=test', title: 'Google DE' }, { id: 11 });
assert.equal(session().nodes.length, 1, 'google.de search should be depth 0');
assert.equal(session().nodes[0].depth, 0);

// Test 11: Search domain without search params (should be neutral root)
await send({ type: 'START_MISSION', mission: 'Search test 12', tab: { id: 12, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
await send({ type: 'OBSERVE_PAGE', url: 'https://google.com/', title: 'Google Home' }, { id: 12 });
assert.equal(session().nodes.length, 1, 'Google home should be depth 0');
assert.equal(session().nodes[0].depth, 0);

// Test 12: Baidu, Yandex, other search engines
const searchEngines = [
  { url: 'https://baidu.com/s?wd=test', name: 'Baidu' },
  { url: 'https://yandex.ru/search/?text=test', name: 'Yandex' },
  { url: 'https://startpage.com/sp/search?q=test', name: 'Startpage' },
  { url: 'https://brave.com/search?q=test', name: 'Brave' },
  { url: 'https://ecosia.org/search?q=test', name: 'Ecosia' },
  { url: 'https://qwant.com/?q=test', name: 'Qwant' }
];

for (let i = 0; i < searchEngines.length; i++) {
  const engine = searchEngines[i];
  const tabId = 20 + i;
  await send({ type: 'START_MISSION', mission: `Search ${engine.name}`, tab: { id: tabId, url: 'chrome-extension://test/newtab/index.html', title: 'New Tab' } });
  await send({ type: 'OBSERVE_PAGE', url: engine.url, title: engine.name }, { id: tabId });
  assert.equal(session().nodes.length, 1, `${engine.name} search should be depth 0`);
  assert.equal(session().nodes[0].depth, 0, `${engine.name} should remain depth 0`);
}

console.log('Search URL detection tests passed!');