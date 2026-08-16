import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const content = fs.readFileSync(new URL('./content/content.js', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('./dashboard/app.js', import.meta.url), 'utf8');
const popup = fs.readFileSync(new URL('./popup/app.js', import.meta.url), 'utf8');
const newtab = fs.readFileSync(new URL('./newtab/app.js', import.meta.url), 'utf8');

assert.deepEqual(manifest.web_accessible_resources, [], 'the companion stylesheet should not be exposed to every web origin');
assert.equal(manifest.permissions.includes('tabs'), false, 'the extension should not request the redundant tabs permission');
assert.match(content, /attachShadow\(\{\s*mode:\s*['"]closed['"]\s*\}\)/, 'the companion should use a closed shadow root');
// Accept either single innerHTML assignment OR separate style element + innerHTML (both are secure in closed shadow DOM)
assert.ok(/shadow\.innerHTML\s*=/.test(content) || (/shadow\.append\(style\)/.test(content) && /shadow\.innerHTML\s*\+/.test(content)), 'companion CSS and markup should be built securely in closed shadow DOM (either single innerHTML or style element + innerHTML)');
assert.equal(content.includes('content/content.css'), false, 'companion must not depend on a web-accessible stylesheet');
assert.equal(content.includes("getURL('content/content.css')"), false, 'companion CSS must not reconstruct a public extension asset URL');
assert.match(content, /event\.isTrusted/, 'synthetic page clicks must not create navigation relationships');
assert.match(dashboard, /createElementNS\(/, 'dashboard SVG data rendering must use DOM construction');
assert.match(dashboard, /textContent/, 'dashboard data labels must use textContent');
assert.match(dashboard, /svg\.replaceChildren\(/, 'dashboard tree rendering must replace SVG children safely');
assert.match(dashboard, /link\.href = item\.url/, 'external compost links should use safe URL property assignment');
assert.equal(/detail\.innerHTML/.test(dashboard), false, 'selected detail data should use DOM construction');
assert.equal(/box\.innerHTML/.test(dashboard), false, 'event and compost data should use DOM construction');
assert.equal(/sessionSelect\.innerHTML/.test(dashboard), false, 'session labels should use textContent and option nodes');
assert.equal(/svg\.innerHTML/.test(dashboard), false, 'tree SVG should use safe DOM construction');
assert.match(dashboard, /tree-bole/, 'the rendered tree should include a structural bole');
assert.match(dashboard, /empty-trunk/, 'the empty garden should include an open trunk');
assert.match(popup, /safeRender\(\)\.catch/, 'popup startup must show a recovery state when messaging fails');
assert.match(newtab, /safeInit\(\)\.catch/, 'New Tab startup must show a recovery state when messaging fails');
assert.match(content, /showGrowthRitual/, 'companion branch growth should use an explicit bounded ritual');
assert.match(content, /ff-growth-ritual/, 'companion ritual should have a named visual state');
assert.match(content, /waitForGrowth\(1000/, 'companion ritual should hold the completion flicker for one second before notifying');
assert.match(content, /prefers-reduced-motion/, 'companion ritual should respect reduced-motion preferences');
assert.equal(/setInterval\(/.test(content), false, 'companion ritual must not introduce a continuous timer loop');
console.log('static security contracts passed');
