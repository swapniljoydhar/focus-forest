import { describe, it } from 'node:test';
import assert from 'node:assert';

const { isSearchUrl, safeHttpUrl, normalizeSettings, compactText, getDepthState, LIMITS, DEFAULT_SETTINGS } = await import('./shared/state.js');

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

  it('getDepthState maps depth to states', () => {
    assert.strictEqual(getDepthState(0, false, { gentleDepth: 4, choiceDepth: 5 }), 'normal');
    assert.strictEqual(getDepthState(4, false, { gentleDepth: 4, choiceDepth: 5 }), 'desaturated');
    assert.strictEqual(getDepthState(5, false, { gentleDepth: 4, choiceDepth: 5 }), 'interrupted');
    assert.strictEqual(getDepthState(3, true, { gentleDepth: 4, choiceDepth: 5 }), 'paused');
  });
});
