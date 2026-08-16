import assert from 'node:assert';
import { describe, it } from 'node:test';

const storage = {};
const changeListeners = [];
let holdNextSet = false;
let setStartedResolve = null;
let releaseHeldSet = null;

globalThis.chrome = {
  runtime: { id: 'test' },
  storage: {
    local: {
      async get(key) {
        return key in storage ? { [key]: structuredClone(storage[key]) } : {};
      },
      async set(value) {
        Object.assign(storage, structuredClone(value));
        if (!holdNextSet) return;
        holdNextSet = false;
        setStartedResolve?.();
        await new Promise((resolve) => { releaseHeldSet = resolve; });
      }
    },
    onChanged: {
      addListener(listener) { changeListeners.push(listener); }
    }
  }
};

const {
  STORAGE_KEY,
  isSearchUrl,
  safeHttpUrl,
  safeSessionUrl,
  canonicalUrl,
  normalizeSettings,
  compactText,
  getDepthState,
  LIMITS,
  DEFAULT_SETTINGS,
  normalizeState,
  emptyState,
  loadState,
  saveState,
  clearStateCache
} = await import('./shared/state.js');

function fireStorageChange(newValue, oldValue = undefined) {
  for (const listener of changeListeners) {
    listener({ [STORAGE_KEY]: { oldValue, newValue } }, 'local');
  }
}

function sessionFixture(id) {
  return {
    sessions: [{
      id,
      mission: 'm',
      status: 'active',
      startedAt: 1,
      origin: { url: 'https://example.com', title: 'Example' },
      nodes: [{ id: `${id}-n`, url: 'https://example.com/page', title: 'Page', parentId: null, depth: 0, state: 'normal' }],
      events: []
    }],
    activeSessionId: id,
    compostItems: [],
    settings: { ...DEFAULT_SETTINGS }
  };
}

describe('shared/state.js core functions', () => {
  it('compactText trims and truncates', () => {
    assert.strictEqual(compactText('  hello world  '), 'hello world');
    assert.strictEqual(compactText('a'.repeat(200), 50), 'a'.repeat(50));
    assert.strictEqual(compactText(''), '');
  });

  it('safeHttpUrl accepts http/https and rejects others', () => {
    assert.ok(safeHttpUrl('https://example.com/path'));
    assert.ok(safeHttpUrl('http://example.com'));
    assert.strictEqual(safeHttpUrl('ftp://example.com'), null);
    assert.strictEqual(safeHttpUrl('not-a-url'), null);
  });

  it('isSearchUrl detects known search engines and query params', () => {
    assert.ok(isSearchUrl('https://www.google.com/search?q=cats'));
    assert.ok(isSearchUrl('https://duckduckgo.com/?q=test'));
    assert.ok(isSearchUrl('https://bing.com/search?q=hello'));
    assert.ok(isSearchUrl('https://yahoo.com/search?p=term'));
    assert.strictEqual(isSearchUrl('https://example.com/page'), false);
  });

  it('normalizeSettings clamps and defaults', () => {
    const base = { gentleDepth: 4, choiceDepth: 5, ambientMotion: true, growthAnimationTrigger: 'mission-origin' };
    assert.deepStrictEqual(normalizeSettings(base), { interventionsPaused: false, ...base });
    assert.deepStrictEqual(normalizeSettings({}), { interventionsPaused: false, gentleDepth: 4, choiceDepth: 5, ambientMotion: true, growthAnimationTrigger: 'mission-origin' });
    assert.deepStrictEqual(normalizeSettings({ gentleDepth: 1, choiceDepth: 1 }), { interventionsPaused: false, gentleDepth: 2, choiceDepth: 3, ambientMotion: true, growthAnimationTrigger: 'mission-origin' });
    assert.deepStrictEqual(normalizeSettings({ growthAnimationTrigger: 'invalid' }), { interventionsPaused: false, gentleDepth: 4, choiceDepth: 5, ambientMotion: true, growthAnimationTrigger: 'mission-origin' });
  });

  it('getDepthState maps explicit and default thresholds to states', () => {
    assert.strictEqual(getDepthState(0, false, { gentleDepth: 4, choiceDepth: 5 }), 'normal');
    assert.strictEqual(getDepthState(4, false, { gentleDepth: 4, choiceDepth: 5 }), 'desaturated');
    assert.strictEqual(getDepthState(5, false, { gentleDepth: 4, choiceDepth: 5 }), 'interrupted');
    assert.strictEqual(getDepthState(3, true, { gentleDepth: 4, choiceDepth: 5 }), 'paused');
    assert.strictEqual(getDepthState(4), 'desaturated');
    assert.strictEqual(getDepthState(5), 'interrupted');
  });

  it('canonicalUrl rejects malformed values instead of returning unsafe raw strings', () => {
    assert.strictEqual(canonicalUrl('not-a-url'), null);
    assert.strictEqual(canonicalUrl('javascript:alert(1)'), null);
    assert.strictEqual(canonicalUrl('https://example.com/path?utm_source=x#fragment'), 'https://example.com/path');
  });

  it('safeSessionUrl accepts only the current extension origin or new-tab placeholder', () => {
    assert.strictEqual(safeSessionUrl('chrome://newtab'), 'chrome://newtab');
    assert.strictEqual(safeSessionUrl('chrome-extension://test/newtab/index.html'), 'chrome-extension://test/newtab/index.html');
    assert.strictEqual(safeSessionUrl('chrome-extension://test/'), 'chrome-extension://test/');
    assert.strictEqual(safeSessionUrl('chrome-extension://other/newtab/index.html'), null);
    assert.strictEqual(safeSessionUrl('chrome-extension://test'), null);
    assert.strictEqual(safeSessionUrl('javascript:alert(1)'), null);
  });
});

describe('security invariants', () => {
  it('safeHttpUrl rejects dangerous schemes', () => {
    assert.strictEqual(safeHttpUrl('javascript:alert(1)'), null);
    assert.strictEqual(safeHttpUrl('data:text/html,<script>alert(1)</script>'), null);
    assert.strictEqual(safeHttpUrl('file:///etc/passwd'), null);
    assert.strictEqual(safeHttpUrl('vbscript:msgbox(1)'), null);
    assert.strictEqual(safeHttpUrl('about:blank'), null);
  });

  it('safeHttpUrl strips tracking parameters and hashes', () => {
    const u = safeHttpUrl('https://example.com/path?utm_source=x&id=1#frag');
    assert.ok(u);
    assert.ok(!u.includes('utm_source'));
    assert.ok(u.includes('id=1'));
    assert.ok(!u.includes('#frag'));
  });

  it('compactText never throws on weird input', () => {
    assert.strictEqual(compactText(null), '');
    assert.strictEqual(compactText(undefined), '');
    assert.strictEqual(compactText(123), '123');
    assert.strictEqual(compactText('a\nb\tc'), 'a b c');
  });
});

describe('normalizeState migration and bounds', () => {
  it('migrates legacy tabId to tabIds and drops the tabId field', () => {
    const legacy = {
      sessions: [{
        id: 's1', mission: 'm', status: 'active', startedAt: 1,
        origin: { tabId: 5, url: 'https://example.com', title: 'Ex' },
        nodes: [{ id: 'n1', tabId: 7, url: 'https://example.com/page', title: 'Pg', parentId: null, depth: 0, state: 'normal' }],
        events: []
      }],
      activeSessionId: 's1'
    };
    const result = normalizeState(legacy);
    assert.strictEqual(result.schemaVersion, 2);
    const node = result.sessions[0].nodes[0];
    assert.deepStrictEqual(node.tabIds, [7]);
    assert.ok(!('tabId' in node), 'legacy tabId should not survive normalization');
  });

  it('rejects javascript: URLs during normalization', () => {
    const poisoned = {
      sessions: [{
        id: 's1', mission: 'm', status: 'active', startedAt: 1,
        origin: { url: 'javascript:alert(1)' },
        nodes: [{ id: 'n1', url: 'javascript:alert(1)', title: 'x', parentId: null, depth: 0, state: 'normal' }],
        events: []
      }],
      compostItems: [{ id: 'c1', url: 'javascript:alert(1)', title: 'x', mission: 'm', depth: 1, savedAt: 1 }]
    };
    const result = normalizeState(poisoned);
    assert.strictEqual(result.sessions[0].origin.url, 'chrome://newtab');
    assert.strictEqual(result.sessions[0].nodes.length, 0);
    assert.strictEqual(result.compostItems.length, 0);
  });

  it('caps sessions, nodes, events, and compost to LIMITS', () => {
    const big = { ...emptyState() };
    big.sessions = Array.from({ length: LIMITS.SESSIONS + 5 }, (_, i) => ({
      id: `s${i}`, mission: 'm', status: 'completed', startedAt: i, endedAt: i + 1,
      origin: { url: 'https://example.com' },
      nodes: Array.from({ length: LIMITS.NODES_PER_SESSION + 5 }, (_, j) => ({ id: `n${i}_${j}`, url: `https://example.com/${j}`, title: 't', parentId: null, depth: 0, state: 'normal' })),
      events: Array.from({ length: LIMITS.EVENTS_PER_SESSION + 5 }, (_, k) => ({ id: `e${k}`, type: 'navigation', at: k }))
    }));
    big.compostItems = Array.from({ length: LIMITS.COMPOST + 5 }, (_, i) => ({ id: `c${i}`, url: `https://example.com/c${i}`, title: 't', mission: 'm', depth: 1, savedAt: i }));
    const result = normalizeState(big);
    assert.ok(result.sessions.length <= LIMITS.SESSIONS, `sessions ${result.sessions.length}`);
    for (const sess of result.sessions) {
      assert.ok(sess.nodes.length <= LIMITS.NODES_PER_SESSION, `nodes ${sess.nodes.length}`);
      assert.ok(sess.events.length <= LIMITS.EVENTS_PER_SESSION, `events ${sess.events.length}`);
    }
    assert.ok(result.compostItems.length <= LIMITS.COMPOST, `compost ${result.compostItems.length}`);
  });
});

describe('storage cache and invalidation', () => {
  it('caches reads, invalidates on external storage changes, and ignores changes during own writes', async () => {
    clearStateCache();
    storage[STORAGE_KEY] = sessionFixture('s1');
    const first = await loadState();
    storage[STORAGE_KEY] = sessionFixture('s2');
    assert.strictEqual((await loadState()).sessions[0].id, 's1');

    fireStorageChange(storage[STORAGE_KEY], sessionFixture('s1'));
    const refreshed = await loadState();
    assert.strictEqual(refreshed.sessions[0].id, 's2');

    const next = sessionFixture('s3');
    holdNextSet = true;
    let resolveStarted;
    const started = new Promise((resolve) => { resolveStarted = resolve; });
    setStartedResolve = resolveStarted;
    const savePromise = saveState(next);
    await started;
    fireStorageChange(next, refreshed);
    assert.strictEqual((await loadState()).sessions[0].id, 's2', 'own-write change must not evict cache while save is in flight');
    releaseHeldSet?.();
    await savePromise;
    assert.strictEqual((await loadState()).sessions[0].id, 's3');

    storage[STORAGE_KEY] = sessionFixture('s4');
    fireStorageChange(storage[STORAGE_KEY], next);
    assert.strictEqual((await loadState()).sessions[0].id, 's4');
    setStartedResolve = null;
    releaseHeldSet = null;
  });
});
