# Focus Forest - Actionable Steps to Resolve All Issues

**Generated:** 2026-08-16  
**Priority Order:** Critical → High → Medium → Low

---

## ✅ Already Complete

| # | Task | Status |
|---|------|--------|
| 1 | Implement error tracing system (`shared/error-tracing.js`) | ✅ Done |
| 2 | Add SPA handling tests (`test-spa-handling.mjs`) | ✅ Done |
| 3 | Add search URL detection tests (`test-search-detection.mjs`) | ✅ Done |
| 4 | Add growth animation trigger tests (`test-growth-animation.mjs`) | ✅ Done |
| 5 | Add message validation tests (`test-message-validation.mjs`) | ✅ Done |
| 6 | Add multi-window support tests (`test-multi-window.mjs`) | ✅ Done |
| 7 | Run all 9 test suites - all passing | ✅ Verified |

---

## 🔴 Phase 1: Critical Fixes (Do First)

### Step 1: Fix `findNode` Compatibility Issue
**File:** `shared/state.js`  
**Line:** ~132  
**Current Code:**
```javascript
export function findNode(session, tabId) {
  return session?.nodes.find((node) => (node.tabIds?.includes(tabId) || node.tabId === tabId) && !node.closedAt) || null;
}
```

**Wait - the local code already has this fix!** Let me verify...
- Local: `(node.tabIds?.includes(tabId) || node.tabId === tabId)` ✅
- Remote: `node.tabId === tabId` ❌

**Action:** No action needed locally. This is only an issue for the GitHub version. When pushing to GitHub, ensure this fix is included.

---

### Step 2: Verify Error Handling Alignment
**File:** `background/service-worker.js`  
**Lines:** ~290-293  
**Local Code (CORRECT):**
```javascript
.catch((error) => {
  logError(error, { category: ERROR_CATEGORIES.MESSAGING, component: 'service-worker', function: 'onMessage', messageType: message?.type });
  sendResponse({ error: 'INTERNAL_ERROR' });
});
```

**Remote Code (LEAKS ERROR):**
```javascript
.catch((error) => sendResponse({ error: error.message }));
```

**Action:** No action needed locally. When pushing to GitHub, ensure generic error message is used.

---

## 🟡 Phase 2: Content Script Merge (High Priority)

### Step 3: Merge Content Script - Best of Both Worlds
**File:** `content/content.js`  

**Current Local Implementation:** Fixed-position chip (top-right), no `escapeHtml`, has `growthAnimationTrigger` support, `originRitualPlayed` tracking.

**Remote Implementation:** Centered modal, has `escapeHtml`, no `growthAnimationTrigger`, no `originRitualPlayed`.

**Target Merged Implementation:**
1. **Adopt from Remote:**
   - Centered modal choice sheet (better UX, accessibility)
   - `escapeHtml()` function for XSS protection
   - Separate `<style>` element approach

2. **Keep from Local:**
   - `growthAnimationTrigger` setting loaded from background
   - `originRitualPlayed` tracked in `sessionStorage`
   - `showGrowthRitual(isOrigin)` with parameter
   - `isOriginLoad` detection for first page load

**Specific Changes:**
```javascript
// 1. Add escapeHtml function (from remote)
function escapeHtml(value) { 
  return String(value).replace(/[&<>'"]/g, (c) => ({ 
    '&':'&', '<':'<', '>':'>', "'":''', '"':'"' }[c])); 
}

// 2. Update showChoiceSheet to use escapeHtml + innerHTML (from remote)
function showChoiceSheet(depth) {
  backdrop.dataset.shownFor = location.href;
  sheetCopy.innerHTML = `You started with <q>${escapeHtml(current?.mission || '')}</q>. You are now <strong>${depth} branches away</strong>, looking at <q>${escapeHtml(document.title || location.hostname)}</q>. That may be exactly where you meant to go — or it may be a path that opened by itself.`;
  backdrop.hidden = false;
  shadow.querySelector('[data-action="home"]').focus();
}

// 3. Keep growthAnimationTrigger loading (from local)
async function loadSettings() {
  try {
    const snap = await send('GET_SNAPSHOT');
    growthAnimationTrigger = snap.settings?.growthAnimationTrigger || 'mission-origin';
  } catch (error) { 
    logError(error, { category: ERROR_CATEGORIES.MESSAGING, function: 'loadSettings' });
    growthAnimationTrigger = 'mission-origin'; 
  }
}

// 4. Keep originRitualPlayed tracking (from local)
let originRitualPlayed = sessionStorage.getItem('ff-origin-ritual-played') === 'true';

// 5. Keep showGrowthRitual with isOrigin parameter (from local)
async function showGrowthRitual(isOrigin = false) {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return true;
  if (growthAnimationTrigger === 'none') return false;
  if (growthAnimationTrigger === 'mission-origin' && !isOrigin) return false;
  if (growthAnimationTrigger === 'mission-origin' && originRitualPlayed) return false;
  // ... rest of ritual logic
  if (isOrigin) { 
    originRitualPlayed = true; 
    try { sessionStorage.setItem('ff-origin-ritual-played', 'true'); } catch { }
  }
  return true;
}

// 6. Keep isOriginLoad detection (from local)
const isOriginLoad = !paused && !previous?.node?.id && depth === 0;
if (isOriginLoad) await showGrowthRitual(true); else if (enteredNewBranch) await showGrowthRitual(false); else cancelGrowthRitual();
```

**Verification:** Run `test-security.mjs` - should pass with XSS checks.

---

## 🟡 Phase 3: Push to GitHub (High Priority)

### Step 4: Synchronize GitHub Repository
**Files to Update on GitHub:**

| File | Changes Needed |
|------|----------------|
| `manifest.json` | Add `"webNavigation"` to permissions array |
| `shared/state.js` | Add `SEARCH_DOMAINS`, `SEARCH_PARAMS`, `isSearchUrl()`, `growthAnimationTrigger` in `DEFAULT_SETTINGS`, `normalizeSettings()` |
| `background/service-worker.js` | Add SPA handling, search detection, message validation, multi-window support, error tracing imports |
| `shared/error-tracing.js` | Add new file (copy from local) |
| `settings/app.js` | Add `growthAnimationTrigger` radio buttons and handling |
| `content/content.js` | Replace with merged version from Step 3 |

**Commands:**
```bash
cd /path/to/github/repo
git checkout main
# Copy all local files to GitHub repo
cp -r /local/focus-forest/* .
git add -A
git commit -m "Sync with local: SPA handling, search detection, growth animations, message validation, multi-window, error tracing"
git push origin main
git tag v0.2.1
git push origin v0.2.1
```

---

## 🟡 Phase 4: Cleanup (Medium Priority)

### Step 5: Review `webNavigation` Permission
**Decision Matrix:**
- **Keep** if SPA handling stays in service worker (current) ✅ Simpler
- **Move to content script** if wanting to remove permission ⚠️ More complex

**Recommendation:** Keep for now. The permission is justified by SPA handling on specific domains.

### Step 6: Remove Dead Code (Remote Only)
**File:** `background/service-worker.js` (GitHub version)  
**Action:** Remove `trackedTabIds` function (unused).

---

## 🟢 Phase 5: Verification (Do After Each Phase)

### Step 7: Run Full Test Suite
```bash
# Original tests
node test-service-worker.mjs
node test-tree-layout.mjs
node test-security.mjs
node stress-service-worker.mjs

# New feature tests
node test-spa-handling.mjs
node test-search-detection.mjs
node test-growth-animation.mjs
node test-message-validation.mjs
node test-multi-window.mjs
```

**Expected:** All 9 test suites pass ✅

### Step 8: Manual Browser Testing Checklist

| Feature | Test Steps | Expected |
|---------|------------|----------|
| SPA Handling | Navigate YouTube → click video → click another | No duplicate branches within 1s |
| Search Detection | Go to Google → search "test" → click result | Search page = depth 0, result = depth 1 |
| Growth Animation | Settings → set to "every-branch" → navigate | Animation plays on each new branch |
| Message Validation | Send malformed message via console | Rejected with null response |
| Multi-window | Open two windows → click link in window 1 → open in window 2 | Each window tracks independently |
| Error Tracing | Trigger error (e.g., invalid storage) | Full stack trace + root cause in console |
| Content Script | Load page → click link → observe chip | Centered modal appears at interrupt depth |

### Step 9: Verify GitHub Tests Pass
```bash
# On GitHub repo (or local copy of GitHub)
node test-service-worker.mjs
node test-tree-layout.mjs
node test-security.mjs
node stress-service-worker.mjs
```

---

## 📋 Quick Reference: File Change Summary

### Local Files Already Correct (No Changes Needed):
- ✅ `shared/state.js` - Has `findNode` fix, search detection, growthAnimationTrigger
- ✅ `background/service-worker.js` - Has SPA, search, validation, multi-window, error boundaries
- ✅ `shared/error-tracing.js` - Complete error tracing system
- ✅ `settings/app.js` - Has growthAnimationTrigger UI
- ✅ `dashboard/app.js`, `dashboard/tree-layout.js` - Identical to remote
- ✅ `newtab/app.js` - Identical to remote
- ✅ `popup/app.js` - Identical to remote
- ✅ All 9 test files - All passing

### Local File Needing Update:
- ⚠️ `content/content.js` - Needs merge with remote's centered modal + escapeHtml

### Remote Files Needing Update (When Pushing):
- ❌ `manifest.json` - Missing webNavigation permission
- ❌ `shared/state.js` - Missing search detection, growthAnimationTrigger
- ❌ `background/service-worker.js` - Missing SPA, search, validation, multi-window, error tracing
- ❌ `shared/error-tracing.js` - Missing entirely
- ❌ `settings/app.js` - Missing growthAnimationTrigger UI
- ❌ `content/content.js` - Different implementation (no growth animations, has centered modal)

---

## 🎯 Success Criteria

| Criterion | Target |
|-----------|--------|
| All 9 test suites pass | ✅ |
| `findNode` handles both `tabId` and `tabIds` | ✅ |
| Error messages never leak internals | ✅ |
| Content script has centered modal + escapeHtml + growth animations | ⬜ After Step 3 |
| GitHub repo matches local features | ⬜ After Step 4 |
| Manual browser testing passes | ⬜ After Step 8 |
| Version tagged v0.2.1 | ⬜ After Step 9 |

---

## 📝 Notes

- The local codebase is already the **source of truth** with all features implemented and tested
- Only the content script needs a merge to adopt remote's better UX
- GitHub sync is a straightforward file copy since local is superset
- Error tracing system is production-ready with 69 root cause patterns

---

**Next Action:** Start with **Step 3** (Content Script Merge) since it's the only local file change needed.