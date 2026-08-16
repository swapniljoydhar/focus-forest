# Exhaustive Inventory 2026-08-17

## Git state
0f30a074cb2600becf47efcfb5e8c199a8012ef8
0f30a074cb2600becf47efcfb5e8c199a8012ef8
[31m??[m EXHAUSTIVE_INVENTORY_2026-08-17.md

## Repository metadata
[1;37m{[m
  [1;34m"defaultBranchRef"[m[1;37m:[m [1;37m{[m
    [1;34m"name"[m[1;37m:[m [32m"main"[m
  [1;37m}[m[1;37m,[m
  [1;34m"isPrivate"[m[1;37m:[m [33mfalse[m[1;37m,[m
  [1;34m"nameWithOwner"[m[1;37m:[m [32m"swapniljoydhar/focus-forest"[m[1;37m,[m
  [1;34m"updatedAt"[m[1;37m:[m [32m"2026-08-16T17:51:19Z"[m[1;37m,[m
  [1;34m"url"[m[1;37m:[m [32m"https://github.com/swapniljoydhar/focus-forest"[m
[1;37m}[m

## Tracked files and line counts
       5 .kilo/kilo.jsonc
     451 .kilo/plans/1786815465475-focus-forest-enhancement-plan.md
     302 .kilo/plans/1786850723071-local-vs-upstream-comparison.md
      74 AUDIT_REPORT_2026-08-16.md
      87 README.md
      51 REMOTE_AUDIT_FINDINGS_2026-08-16.md
      35 SECURITY.md
     192 SECURITY_REVIEW_2026-08-15.md
     402 background/service-worker.js
     268 content/content.js
     151 dashboard/app.js
      13 dashboard/index.html
      56 dashboard/style.css
     161 dashboard/tree-layout.js
       5 icons/icon-128.png
       4 icons/icon-16.png
       4 icons/icon-32.png
       4 icons/icon-48.png
      58 manifest.json
      41 newtab/app.js
      30 newtab/index.html
      65 newtab/style.css
      48 popup/app.js
      19 popup/index.html
      51 popup/style.css
      74 settings/app.js
       2 settings/index.html
      65 settings/style.css
     212 shared/error-tracing.js
     156 shared/state.js
      31 stress-service-worker.mjs
      28 test-runtime-contracts.mjs
      38 test-security.mjs
     225 test-service-worker.mjs
     123 test-state.mjs
      80 test-tree-layout.mjs

## File sizes
227 icons/icon-16.png
366 icons/icon-32.png
496 icons/icon-48.png
1222 icons/icon-128.png
1343 manifest.json
1659 test-runtime-contracts.mjs
2020 .kilo/kilo.jsonc
2130 newtab/index.html
2447 newtab/app.js
2502 popup/index.html
2618 stress-service-worker.mjs
2661 SECURITY.md
2935 dashboard/index.html
3210 settings/index.html
3744 test-security.mjs
4528 REMOTE_AUDIT_FINDINGS_2026-08-16.md
4666 popup/style.css
5154 test-tree-layout.mjs
5334 settings/app.js
5359 newtab/style.css
5507 settings/style.css
6256 popup/app.js
6589 test-state.mjs
7764 shared/error-tracing.js
8219 dashboard/tree-layout.js
9200 AUDIT_REPORT_2026-08-16.md
9302 shared/state.js
12207 README.md
14413 .kilo/plans/1786850723071-local-vs-upstream-comparison.md
19941 test-service-worker.mjs
20308 .kilo/plans/1786815465475-focus-forest-enhancement-plan.md
20493 dashboard/style.css
21532 SECURITY_REVIEW_2026-08-15.md
21663 content/content.js
25285 dashboard/app.js
26820 background/service-worker.js

## Manifest
{
  "manifest_version": 3,
  "name": "Focus Forest",
  "version": "0.2.0",
  "minimum_chrome_version": "110",
  "description": "A gentle mission-aware browsing companion that helps you notice rabbit holes without blocking the web.",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": [
    "storage",
    "webNavigation"
  ],
  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_title": "Focus Forest",
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png"
    }
  },
  "chrome_url_overrides": {
    "newtab": "newtab/index.html"
  },
  "options_ui": {
    "page": "settings/index.html",
    "open_in_tab": true
  },
  "content_scripts": [
    {
      "matches": [
        "http://*/*",
        "https://*/*"
      ],
      "js": [
        "content/content.js"
      ],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "web_accessible_resources": [],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; base-uri 'self'"
  }
}

## Recent history
[33m0f30a07[m[33m ([m[1;36mHEAD[m[33m, [m[1;31morigin/main[m[33m)[m Repair broken fork and harden extension boundaries
[33mbeb4edd[m Vibe/security and quality fixes 89ad76 (#2)
[33mbb1187c[m Security and quality remediation: fix XSS trap, message validation, tab/branch ownership, and cache/redirect hardening (#1)
[33m7a7bf8f[m chore: update and populate node_modules dependencies in the .kilo directory
[33mdd051fb[m chore: update project dependencies and add security documentation
[33m9820a0a[m[33m ([m[1;32mmain[m[33m)[m Draw an organic sparse sapling
[33m9613e16[m Add branch growth ritual and natural tree form
[33mcf611f3[m Make garden visualization a rooted tree
[33m566a88c[m Resolve residual security and reliability risks
[33m2338a29[m Harden message, navigation, and companion boundaries
[33m151d5ea[m Revert "Add local Chrome-style shortcut garden"
[33md3ddbf0[m Add local Chrome-style shortcut garden
