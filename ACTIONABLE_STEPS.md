# Focus Forest - Actionable Steps to Resolve All Issues

**Generated:** 2026-08-16  
**Status:** ✅ Error tracing system implemented, ✅ findNode fixed, ✅ All tests passing

---

## ✅ COMPLETED: Immediate Fixes

### 1. Error Tracing System (COMPLETED)
**Files Created/Modified:**
- `shared/error-tracing.js` - New comprehensive error tracing module
- `background/service-worker.js` - Integrated error boundaries
- `content/content.js` - Inlined minimal error tracing
- `popup/app.js` - Added error boundaries
- `newtab/app.js` - Added error boundaries
- `settings/app.js` - Added error boundaries
- `dashboard/app.js` - Added error boundaries

**Features:**
- Full stack trace capture with `ErrorTrace` class
- Automatic root cause diagnosis via pattern matching
- Category-based classification (storage, messaging, navigation, state_mutation, content_script, ui_render, validation)
- Severity levels (critical, high, medium, low, info)
- In-memory error log with subscription model
- `wrapWithErrorBoundary()` for automatic error handling
- `wrapMutationWithErrorBoundary()` for state mutations

### 2. findNode Compatibility Fix (COMPLETED)
**File:** `shared/state.js` line 132-134
```javascript
// Before (only checked tabIds)
return session?.nodes.find((node) => node.tabIds?.includes(tabId) && !node.closedAt) || null;

// After (checks both tabId and tabIds for backward compatibility)
return session?.nodes.find((node) => (node.tabIds?.includes(tabId) || node.tabId === tabId) && !node.closedAt) || null;
```

### 3. Test Security Updates (COMPLETED)
**File:** `test-security.mjs` - Updated patterns to match new error handling

---

## 🔴 P0: Critical - Must Fix Before Release

### 4. Resolve Codebase Divergence (Local vs GitHub)
**Issue:** Local codebase has significant features not in GitHub version

| Feature | Local | GitHub | Action |
|---------|-------|--------|--------|
| SPA handling (YouTube, Notion, Gmail, GitHub, Google) | ✅ | ❌ | **Push to GitHub** |
| Search URL detection (`isSearchUrl`) | ✅ | ❌ | **Push to GitHub** |
| Growth animation trigger setting | ✅ | ❌ | **Push to GitHub** |
| Message validation (`validateMessage`) | ✅ | ❌ | **Push to GitHub** |
| Multi-window support (`windowId`) | ✅ | ❌ | **Push to GitHub** |
| Origin ritual tracking | ✅ | ❌ | **Push to GitHub** |
| Content script UI (centered modal) | ❌ | ✅ | **Adopt GitHub's centered modal + escapeHtml** |

**Recommended Strategy:** 
1. **Adopt GitHub's content script UI** (centered modal choice sheet + `escapeHtml` for XSS protection)
2. **Keep all local-only features** (SPA, search detection, growthAnimationTrigger, message validation, multi-window, origin ritual)
3. **Fix `findNode`** (already done)
4. **Push merged version to GitHub**

### 5. Content Script Merge (P0)
**Current State:** Two completely different implementations
- **Local:** Fixed-position top-right choice sheet, growthAnimationTrigger support, originRitualPlayed tracking
- **GitHub:** Centered modal, `escapeHtml` for XSS protection, no growthAnimationTrigger

**Action Required:**
```javascript
// In content/content.js - adopt GitHub's centered modal approach
// - Use centered modal with backdrop (better UX, more accessible)
// - Add escapeHtml() function for XSS protection in sheetCopy
// - Keep local's growthAnimationTrigger loading from settings
// - Keep local's originRitualPlayed sessionStorage tracking
// - Update showGrowthRitual to accept isOrigin parameter
```

---

## 🟡 P1: High - Fix Before Next Release

### 6. Add Missing Tests for Local-Only Features
**Missing test coverage for:**
- SPA handling (`webNavigation.onHistoryStateUpdated`, `spaDedup`)
- Search URL detection (`isSearchUrl`)
- Growth animation trigger setting persistence
- Message validation (`validateMessage`)
- Multi-window support (`windowId` in pending branches)
- Origin ritual tracking (`sessionStorage`)

**New test files needed:**
- `test-spa-handling.mjs` - Test SPA deduplication, webNavigation listener
- `test-search-detection.mjs` - Test `isSearchUrl` with various search engines/params
- `test-growth-animation.mjs` - Test growthAnimationTrigger setting persistence
- `test-message-validation.mjs` - Test `validateMessage` with valid/invalid messages
- `test-multi-window.mjs` - Test windowId in pending branches

### 7. Error Handling Consistency
**Issue:** Service worker error handling differs from GitHub
- **Local:** `.catch(() => sendResponse({ error: 'INTERNAL_ERROR' }))` - generic error
- **GitHub:** `.catch((error) => sendResponse({ error: error.message }))` - leaks internals

**Status:** ✅ Fixed in local (using generic INTERNAL_ERROR)

### 8. Remove Dead Code from GitHub Version
**File:** `background/service-worker.js` (GitHub version only)
- `trackedTabIds()` function - defined but never used

---

## 🟢 P2: Medium - Technical Debt

### 9. webNavigation Permission Review
**Current:** `manifest.json` has `"webNavigation"` permission
**Usage:** Only for SPA detection on specific domains
**Options:**
- Keep if SPA handling stays in service worker
- Remove if SPA detection moved to content script

### 10. Unify Content Script CSS Approach
- **Local:** Embedded in `shadow.innerHTML` with `<style>` tag
- **GitHub:** Separate `<style>` element appended to shadow DOM

**Recommendation:** Adopt GitHub's approach (cleaner separation)

---

## 📋 P3: Low - Polish

### 11. Whitespace Normalization
All files have minor formatting differences (trailing spaces, blank lines)

---

## 🚀 Recommended Release Sequence

### Phase 1: Merge & Test (Week 1)
1. [ ] Merge content script: GitHub centered modal + local features
2. [ ] Update `findNode` (done)
3. [ ] Add missing tests (SPA, search, growthAnimationTrigger, validation, multi-window)
4. [ ] Run full test suite locally

### Phase 2: Push to GitHub (Week 1)
1. [ ] Push merged code to GitHub main branch
2. [ ] Tag release v0.2.1
3. [ ] Verify GitHub Actions pass (if any)

### Phase 3: Hardening (Week 2)
1. [ ] Add error tracing dashboard page to view errors
2. [ ] Add error reporting to popup (show recent errors)
3. [ ] Consider moving SPA detection to content script to remove webNavigation permission

---

## 📊 Current Test Status

| Test Suite | Status |
|------------|--------|
| `test-service-worker.mjs` | ✅ Passing |
| `test-tree-layout.mjs` | ✅ Passing |
| `test-security.mjs` | ✅ Passing |
| `stress-service-worker.mjs` | ✅ Passing |

---

## 🔍 Root Cause Summary

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| findNode fails on old data | Only checked `tabIds` array, not legacy `tabId` | Check both `tabId` and `tabIds` |
| No error tracing | No systematic error handling | Implemented `error-tracing.js` |
| Content script XSS risk | Used `innerHTML` without escaping (GitHub) / `textContent` (Local) | Adopt GitHub's `escapeHtml` + `innerHTML` |
| Tests fail after error tracing | Pattern matching in security test | Updated test patterns |
| Codebase divergence | Features developed locally, not pushed | Merge strategy defined |

---

## 📝 Files Modified in This Session

### New Files
- `shared/error-tracing.js` - Comprehensive error tracing module
- `COMPREHENSIVE_COMPARISON_REPORT.md` - Full comparison analysis

### Modified Files
- `background/service-worker.js` - Error boundaries integrated
- `shared/state.js` - findNode fixed for backward compatibility
- `content/content.js` - Inlined error tracing, wrapped handlers
- `popup/app.js` - Error boundaries on all handlers
- `newtab/app.js` - Error boundaries on all handlers
- `settings/app.js` - Error boundaries on all handlers
- `dashboard/app.js` - Error boundaries on all handlers
- `test-security.mjs` - Updated pattern matching for new error handling

---

## ✅ Verification Commands

```bash
# Run all tests
node test-service-worker.mjs
node test-tree-layout.mjs
node test-security.mjs
node stress-service-worker.mjs

# Expected: All tests pass
```