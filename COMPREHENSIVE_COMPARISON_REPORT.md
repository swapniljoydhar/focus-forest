# Focus Forest - Comprehensive Codebase Comparison Report

**Generated:** 2026-08-16  
**Local Path:** `C:\Users\USER\Desktop\focus forest\focus-forest`  
**Remote Repo:** `https://github.com/swapniljoydhar/focus-forest` (main branch)  
**Remote Commit:** Latest on main (8 commits total)

---

## Executive Summary

The **local codebase is a feature-rich superset** of the GitHub version. The local version contains:
- ✅ SPA (Single Page Application) handling for YouTube, Notion, Gmail, GitHub, Google Docs/Drive/Calendar/Mail
- ✅ Search URL detection to avoid tracking search result pages as navigation
- ✅ Growth animation trigger setting (`mission-origin`, `every-branch`, `none`)
- ✅ Message validation for security (`validateMessage()`)
- ✅ Multi-window support via `windowId` in pending branch tracking
- ✅ Origin ritual tracking in sessionStorage
- ✅ Different content script UI implementation (fixed-position vs centered modal)

The **GitHub version** is cleaner but missing several key features. All test files are identical (whitespace only).

---

## File-by-File Comparison

### 1. `manifest.json` - MINOR DIFFERENCE

| Aspect | Local | Remote |
|--------|-------|--------|
| Permissions | `["storage", "webNavigation"]` | `["storage"]` |

**Impact:** Local uses `webNavigation` API for SPA detection. Remote doesn't have SPA handling.

---

### 2. `background/service-worker.js` - MAJOR DIFFERENCES (~40% different)

#### Features ONLY in LOCAL:
```javascript
// SPA Domain Handling
const SPA_DOMAINS = new Set(['youtube.com', 'notion.so', 'gmail.com', 
  'github.com', 'app.notion.so', 'docs.google.com', 
  'drive.google.com', 'calendar.google.com', 'mail.google.com']);
const spaDedup = new Map();

// SPA deduplication in LINK_CLICK and OBSERVE_PAGE handlers
// webNavigation.onHistoryStateUpdated listener for SPA navigation

// Window ID in pending branch tracking
function pendingBranchKey(url, sourceTabId, windowId) { ... }
function setPendingBranch(url, sourceTabId, windowId, parentId) { ... }
function takePendingBranch(url, sourceTabId, windowId) { ... }

// Message validation
function validateMessage(message) { ... }

// Search URL detection (imported from state.js)
if (isSearchUrl(url) && !originNotSet) return NO_CHANGE;

// Different error handling
.catch(() => sendResponse({ error: 'INTERNAL_ERROR' }));

// Origin detection logic
const originNotSet = session.origin?.url === 'chrome://newtab' || 
  session.nodes.length === 1 && !session.nodes[0].url.startsWith('http');
```

#### Features ONLY in REMOTE:
```javascript
// Unused function
function trackedTabIds(session) { ... }

// Simpler origin detection
const seed = session.nodes.length === 1 && 
  (session.nodes[0].url.startsWith('chrome-extension://') || 
   session.nodes[0].url.startsWith('chrome://'));

// Different error handling (exposes error message)
.catch((error) => sendResponse({ error: error.message }));
```

#### Test Impact:
The local tests **pass** because they mock `chrome.tabs` but NOT `chrome.webNavigation`. The SPA handling code paths are not exercised in tests.

---

### 3. `shared/state.js` - MAJOR DIFFERENCES

| Feature | Local | Remote |
|---------|-------|--------|
| `DEFAULT_SETTINGS.growthAnimationTrigger` | `'mission-origin'` | ❌ Missing |
| `SEARCH_DOMAINS` constant | ✅ 10 domains | ❌ Missing |
| `SEARCH_PARAMS` constant | ✅ 4 params | ❌ Missing |
| `isSearchUrl()` function | ✅ Exported | ❌ Missing |
| `normalizeSettings()` handles growthAnimationTrigger | ✅ | ❌ |
| `findNode()` uses | `node.tabIds?.includes(tabId)` | `node.tabId === tabId` |

**Critical Issue:** Local's `findNode` uses `tabIds` array (modern), but remote uses legacy `tabId` property. The `compactNode` in `normalizeState` handles both, but `findNode` in local only checks `tabIds`.

---

### 4. `content/content.js` - MAJOR DIFFERENCES (Complete rewrite)

#### Local Implementation:
- Embedded CSS in `shadow.innerHTML` with `<style>` tag
- Fixed-position choice sheet (top-right)
- `growthAnimationTrigger` loaded from settings
- `originRitualPlayed` tracked in `sessionStorage`
- `showGrowthRitual(isOrigin)` with parameter
- `isOriginLoad` detection for first page load
- Flicker animation: `0%,100%{opacity:1} 50%{opacity:.4}`

#### Remote Implementation:
- Separate `<style>` element appended to shadow DOM
- Centered modal choice sheet (better UX, more accessible)
- `escapeHtml()` function for XSS protection
- `sheetCopy.innerHTML` with escaped HTML (vs `textContent`)
- No `growthAnimationTrigger` setting
- No `originRitualPlayed` tracking
- Simpler `showGrowthRitual()` without parameter
- Flicker animation: `50%{opacity:.35;filter:brightness(1.2)} 100%{opacity:1}`

**Security Note:** Remote's `escapeHtml` + `innerHTML` approach is safer than local's `textContent` for the choice sheet copy, but local uses `textContent` which is also safe.

---

### 5. `settings/app.js` - FEATURE DIFFERENCE

| Setting | Local | Remote |
|---------|-------|--------|
| `growthAnimationTrigger` radio buttons | ✅ 3 options | ❌ Missing |

Local persists and loads this setting; remote has no UI for it.

---

### 6. `dashboard/app.js` - IDENTICAL (whitespace only)

### 7. `dashboard/tree-layout.js` - IDENTICAL (whitespace only)

### 8. `newtab/app.js` - IDENTICAL (whitespace only)

### 9. `popup/app.js` - IDENTICAL (whitespace only)

---

### Test Files - ALL IDENTICAL (whitespace only)
- `test-service-worker.mjs` 
- `test-tree-layout.mjs`
- `test-security.mjs`
- `stress-service-worker.mjs`

All tests pass on local codebase.

---

## Identified Issues & Root Causes

### 🔴 CRITICAL: Inconsistent `findNode` Implementation
**File:** `shared/state.js`  
**Local:** `node.tabIds?.includes(tabId)`  
**Remote:** `node.tabId === tabId`  

**Root Cause:** The state normalization (`compactNode`) converts legacy `tabId` to `tabIds` array, but `findNode` in local only checks the array. If old data exists with only `tabId`, it won't be found.

**Impact:** Tab tracking may fail for sessions created with older version.

---

### 🔴 CRITICAL: `webNavigation` Permission Without Full Utilization
**File:** `manifest.json` + `background/service-worker.js`  
**Issue:** Permission declared but only used for SPA detection on specific domains.

**Root Cause:** SPA handling added incrementally without reviewing permission necessity.

**Impact:** Unnecessary permission increases extension install friction.

---

### 🟡 HIGH: Content Script Dual Implementation Drift
**File:** `content/content.js`  
**Issue:** Two completely different UI implementations with different features.

**Root Cause:** Major rewrite on one branch without merging to the other.

**Impact:** 
- Local has growth animation trigger feature, remote doesn't
- Remote has better choice sheet UX (centered modal), local has fixed-position
- Remote has XSS protection (`escapeHtml`), local relies on `textContent`

---

### 🟡 HIGH: Missing `growthAnimationTrigger` in Remote State
**Files:** `shared/state.js`, `settings/app.js`, `content/content.js`  
**Issue:** Local has full feature; remote has none.

**Root Cause:** Feature developed locally but not pushed to GitHub.

**Impact:** Users of GitHub version cannot customize growth animations.

---

### 🟡 HIGH: Search URL Detection Only in Local
**Files:** `shared/state.js` (`isSearchUrl`), `background/service-worker.js`  
**Issue:** Local skips tracking for search result pages; remote tracks them.

**Root Cause:** Feature added locally for better UX.

**Impact:** Remote users get noisy tree with search pages as branches.

---

### 🟡 HIGH: SPA Handling Only in Local
**Files:** `background/service-worker.js` (`SPA_DOMAINS`, `spaDedup`, `webNavigation` listener)  
**Issue:** Local deduplicates SPA navigations; remote doesn't.

**Root Cause:** SPA handling developed locally.

**Impact:** Remote users get duplicate branches on YouTube, Notion, GitHub, etc.

---

### 🟡 HIGH: Message Validation Only in Local
**File:** `background/service-worker.js` (`validateMessage`)  
**Issue:** Local validates message schema before processing; remote doesn't.

**Root Cause:** Security hardening added locally.

**Impact:** Remote more vulnerable to malformed messages.

---

### 🟡 MEDIUM: Error Handling Difference
**File:** `background/service-worker.js`  
**Local:** `.catch(() => sendResponse({ error: 'INTERNAL_ERROR' }))`  
**Remote:** `.catch((error) => sendResponse({ error: error.message }))`

**Impact:** Remote leaks internal error messages to content scripts (information disclosure).

---

### 🟡 MEDIUM: `trackedTabIds` Dead Code in Remote
**File:** `background/service-worker.js` (remote only)  
**Issue:** Function defined but never used.

**Impact:** Code bloat, confusion.

---

### 🟢 LOW: Whitespace/Formatting Differences
All files have minor whitespace differences (trailing spaces, blank lines). No functional impact.

---

## Test Coverage Analysis

### Current Tests Cover:
✅ Service worker behavioral logic (navigation, branching, composting, pruning)  
✅ Tree layout geometry (deterministic positions, modes, labels)  
✅ Security contracts (CSP, XSS, DOM safety)  
✅ Stress/concurrency (500 navigations, 300 settings updates, 200 malformed messages)

### Current Tests MISS:
❌ SPA handling (`webNavigation` listener, `spaDedup`)  
❌ Search URL detection (`isSearchUrl`)  
❌ Growth animation trigger setting  
❌ Message validation (`validateMessage`)  
❌ Multi-window support (`windowId` in pending branches)  
❌ Content script UI behavior (choice sheet, growth ritual)  
❌ Origin ritual tracking (`sessionStorage`)  
❌ Error boundary behavior (popup/newtab/dashboard recovery)

---

## Recommendations Priority Matrix

| Priority | Action | Effort | Risk |
|----------|--------|--------|------|
| P0 | Fix `findNode` to check both `tabId` and `tabIds` | Low | Low |
| P0 | Align error handling: use generic `INTERNAL_ERROR` | Low | Low |
| P1 | Merge content script: adopt remote's centered modal + escapeHtml + local's growthAnimationTrigger | Medium | Medium |
| P1 | Push local features to GitHub: SPA handling, search detection, growthAnimationTrigger, message validation | Medium | Low |
| P1 | Add tests for SPA handling, search detection, growthAnimationTrigger, message validation | Medium | Low |
| P2 | Remove `webNavigation` permission if SPA handling moved to content script | Low | Low |
| P2 | Remove dead code (`trackedTabIds` in remote) | Low | Low |
| P3 | Add error tracing system (see separate implementation) | Medium | Low |

---

## Synchronization Strategy

### Option A: Push Local to GitHub (Recommended)
Local has more features, all tests pass. Push local changes to GitHub.

**Steps:**
1. Update `manifest.json` - keep `webNavigation` for now
2. Push all local source files
3. Update GitHub tests if needed (they should pass as-is)
4. Tag release v0.2.1

### Option B: Pull GitHub to Local
Not recommended - loses SPA handling, search detection, growth animations, message validation.

### Option C: Merge Best of Both
1. Adopt remote's centered modal choice sheet + `escapeHtml`
2. Keep local's SPA handling, search detection, growthAnimationTrigger, message validation
3. Fix `findNode` compatibility
4. Use generic error messages

---

## Next Steps

1. **Implement Error Tracing System** (see `ERROR_TRACING_SYSTEM.md`)
2. **Fix `findNode` compatibility issue**
3. **Merge content script implementations**
4. **Add missing tests for local-only features**
5. **Push synchronized codebase to GitHub**