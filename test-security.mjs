import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const content = fs.readFileSync(new URL('./content/content.js', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('./dashboard/app.js', import.meta.url), 'utf8');

assert.deepEqual(manifest.web_accessible_resources, [], 'the companion stylesheet should not be exposed to every web origin');
assert.match(content, /attachShadow\(\{\s*mode:\s*['"]closed['"]\s*\}\)/, 'the companion should use a closed shadow root');
assert.match(content, /style\.textContent\s*=/, 'companion CSS should be owned by the isolated content script');
assert.equal(content.includes('content/content.css'), false, 'companion must not depend on a web-accessible stylesheet');
assert.equal(content.includes("getURL('content/content.css')"), false, 'companion CSS must not reconstruct a public extension asset URL');
assert.match(content, /event\.isTrusted/, 'synthetic page clicks must not create navigation relationships');
assert.match(dashboard, /function esc\(/, 'dashboard data rendering must keep a centralized escape boundary');
assert.equal(/href=\"\$\{esc\(item\.url\)/.test(dashboard), true, 'external compost links must remain escaped');
console.log('static security contracts passed');
