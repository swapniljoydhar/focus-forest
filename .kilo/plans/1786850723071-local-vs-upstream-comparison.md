# Local vs Upstream Comparison Report

## Overview

This document provides a comprehensive side-by-side comparison between the local modified fork (`C:\Users\USER\Desktop\focus forest\focus-forest`) and the original upstream repository (`https://github.com/swapniljoydhar/focus-forest`).

**Key Finding**: Both repositories share the exact same git commit history (8 commits, latest: `9820a0a`), but the local fork contains significant additional code, error handling infrastructure, SPA support, and a new "Growth ritual" setting.

---

## File-Level Differences

### Files Only in Local Fork

| File | Purpose |
|------|---------|
| `shared/error-tracing.js` | **NEW** - Comprehensive error tracing system |
| `ACTIONABLE_STEPS.md` | Audit action items |
| `ACTIONABLE_STEPS_DETAILED.md` | Detailed action steps |
| `AUDIT_COMPLETION_SUMMARY.md` | Audit completion summary |
| `COMPREHENSIVE_COMPARISON_REPORT.md` | Comparison report |
| `FULL_CODEBASE_AUDIT_REPORT.md` | Full audit report |
| `SECURITY.md` | Security documentation |
| `TEST_SUITE_SUMMARY.md` | Test suite summary |
| `TESTING_CHECKLIST.md` | Testing checklist |
| `test-growth-animation.mjs` | Growth animation tests |
| `test-message-validation.mjs` | Message validation tests |
| `test-multi-window.mjs` | Multi-window tests |
| `test-search-detection.mjs` | Search detection tests |
| `test-security.mjs` | Security boundary tests |
| `test-service-worker.mjs` | Service worker behavioral tests |
| `test-spa-handling.mjs` | SPA handling tests |
| `test-tree-layout.mjs` | Tree layout invariant tests |
| `stress-service-worker.mjs` | Stress/load tests |

### Files Only in Upstream

| File | Purpose |
|------|---------|
| `AUDIT.md` | Audit notes |
| `COHERENT_TREE_AUDIT.md` | Tree visualization audit |
| `CONTROLS_REFINEMENT_REPORT.md` | Controls refinement |
| `ENGINEERING_HANDOFF.md` | Engineering handoff notes |
| `github-extension-candidates.json` | Extension candidates |
| `github-visual-candidate.json` | Visual candidate (empty) |
| `HISTORY_MAINTENANCE_REPORT.md` | History maintenance |
| `HISTORY_TAB_AUDIT.md` | History tab audit |
| `IMMERSIVE_REFINEMENT_REPORT.md` | Immersive refinement |
| `immersive-research-notes.md` | Research notes |
| `JOURNEY_REFINEMENT_REPORT.md` | Journey refinement |
| `LOW_MEMORY_AUDIT.md` | Low memory audit |
| `LOW_MEMORY_BUILD_REPORT.md` | Low memory build report |
| `NEXT_REFINEMENT_SPEC.md` | Next refinement spec |
| `NOTIFICATION_TREE_REFERENCE_FINDINGS_2026-08-15.md` | Notification tree findings |
| `research-notes.md` | Research notes |
| `RESEARCH_COMPARISON.md` | Research comparison |
| `SECURITY_RELIABILITY_AUDIT.md` | Security/reliability audit |
| `SETTINGS_RITUAL_REFINED_REPORT.md` | Settings ritual refined |
| `SETTINGS_RITUAL_REPORT.md` | Settings ritual report |
| `STRUCTURAL_REFINEMENT_AUDIT.md` | Structural refinement audit |
| `TEST_REPORT.md` | Test report |
| `tree-visualization-plan.md` | Tree visualization plan |
| `ULTIMATE_BUILD_REPORT.md` | Ultimate build report |
| `ultimate-product-improvement-plan.md` | Product improvement plan |
| `VISUAL_BASELINE_REVIEW.md` | Visual baseline review |
| `VISUAL_REFINEMENT_FINDINGS_2026-08-15.md` | Visual refinement findings |
| `WHOLE_EXTENSION_REVIEW_REPORT.md` | Whole extension review |
| `whole-extension-plan-reviewed.md` | Reviewed plan |

### Identical Files (No Differences)

- `dashboard/index.html`
- `dashboard/style.css`
- `dashboard/tree-layout.js`
- `popup/index.html`
- `popup/style.css`
- `newtab/index.html`
- `newtab/style.css`

---

## Source Code Modifications (Local vs Upstream)

### 1. `manifest.json`

**Change**: Added `webNavigation` permission

```diff
- "permissions": ["storage"],
+ "permissions": ["storage", "webNavigation"],
```

**Reason**: Enables SPA history tracking via `chrome.webNavigation.onHistoryStateUpdated` for YouTube, Notion, Gmail, GitHub, etc.

---

### 2. `shared/state.js`

**Changes**:

| Addition/Modification | Details |
|----------------------|---------|
| `DEFAULT_SETTINGS` | Added `growthAnimationTrigger: 'mission-origin'` |
| `SEARCH_DOMAINS` | New Set: google, bing, duckduckgo, yahoo, startpage, brave, baidu, yandex, ecosia, qwant |
| `SEARCH_PARAMS` | New Set: q, search, query, p |
| `isSearchUrl(value)` | New exported function to detect search engine URLs |
| `normalizeSettings()` | Added handling for `growthAnimationTrigger` (values: 'mission-origin', 'every-branch', 'none') |
| `findNode()` | Changed from `node.tabId === tabId` to `(node.tabIds?.includes(tabId) \|\| node.tabId === tabId)` for backward compatibility |

---

### 3. `shared/error-tracing.js` — **ENTIRELY NEW FILE**

**Features**:
- `ErrorTrace` class with structured error reporting (id, timestamp, message, stack, category, severity, context)
- Root cause diagnosis with 17 pattern matchers (null reference, quota exceeded, permission denied, etc.)
- Error log with max 100 entries and subscriber notification system
- `wrapWithErrorBoundary(fn, context)` - wraps async functions with error logging
- `wrapMutationWithErrorBoundary(mutator, context)` - specialized for state mutations
- `createTestErrorReporter(testName)` - factory for test-specific error reporting
- Categories: STORAGE, MESSAGING, NAVIGATION, STATE_MUTATION, CONTENT_SCRIPT, UI_RENDER, PERMISSION, VALIDATION, UNKNOWN
- Severities: CRITICAL, HIGH, MEDIUM, LOW, INFO

---

### 4. `background/service-worker.js`

**Major Additions**:

| Area | Changes |
|------|---------|
| **Imports** | Added error-tracing utilities (`logError`, `logCritical`, `ERROR_CATEGORIES`, `wrapMutationWithErrorBoundary`, `wrapWithErrorBoundary`) |
| **SPA Support** | Added `SPA_DOMAINS` Set (youtube.com, notion.so, gmail.com, github.com, app.notion.so, docs.google.com, drive.google.com, calendar.google.com, mail.google.com) and `spaDedup` Map for deduplication |
| **Pending Branches** | Added `windowId` to `pendingBranchKey`, `setPendingBranch`, `takePendingBranch` |
| **Mutation Queue** | Wrapped `mutate()` and `replaceState()` with `wrapMutationWithErrorBoundary` and error logging |
| **Search Detection** | Added `isSearchUrl()` check in `observeTab()` to ignore direct search page navigations |
| **Origin Detection** | Added `originNotSet` logic to handle initial page after mission planting |
| **Message Validation** | New `validateMessage()` function with schema per message type |
| **Message Handlers** | All handlers wrapped with error boundaries; `LINK_CLICK` and `OBSERVE_PAGE` include SPA deduplication |
| **webNavigation Listener** | New `chrome.webNavigation.onHistoryStateUpdated` listener for SPA history tracking |
| **Tab Listeners** | Wrapped `chrome.tabs.onUpdated` and `chrome.tabs.onRemoved` with error boundaries |
| **Error Responses** | Standardized error response: `{ error: 'INTERNAL_ERROR' }` instead of `error.message` |

**Behavioral Changes**:
- `trackLink()` now accepts `windowId` parameter
- `observeTab()` ignores search URLs (unless origin not set)
- `pendingBranchKey()` includes windowId for better target-blank handling
- Tab removal clears redirect state and handles origin tabId cleanup

---

### 5. `content/content.js`

**Major Additions**:

| Area | Changes |
|------|---------|
| **Local Error Tracing** | Minimal inline `ERROR_CATEGORIES`, `ERROR_SEVERITY`, `logError()`, `wrapWithErrorBoundary()` |
| **Growth Animation Trigger** | Fetches `growthAnimationTrigger` setting via `loadSettings()` |
| **Origin Ritual Tracking** | `originRitualPlayed` persisted in `sessionStorage` (`ff-origin-ritual-played`) |
| **showGrowthRitual(isOrigin)** | Now accepts `isOrigin` parameter; respects `growthAnimationTrigger` setting ('none', 'mission-origin', 'every-branch') |
| **isOriginLoad Detection** | Detects initial page load (depth 0, no previous node) for origin growth ritual |
| **Error Boundaries** | All event handlers wrapped: `shadow.click`, `shadow.keydown`, `document.click`, `popstate`, `pageshow`, `visibilitychange`, `refresh`, `scheduleWatch`, `loadSettings` |
| **Session Change Handling** | Resets `originRitualPlayed` when session changes |

**Behavioral Changes**:
- Growth ritual only plays once per mission (when `growthAnimationTrigger === 'mission-origin'`)
- Growth ritual plays on every new branch (when `growthAnimationTrigger === 'every-branch'`)
- Growth ritual disabled entirely (when `growthAnimationTrigger === 'none'`)
- Respects `prefers-reduced-motion` system preference

---

### 6. `newtab/app.js`

**Changes**:
- Added error-tracing imports
- Wrapped `init()` → `safeInit` with `wrapWithErrorBoundary`
- Wrapped `updateCount`, form submit, resume click, browse click with error boundaries
- `initSafely()` now logs errors via `logError()` instead of silent catch

---

### 7. `popup/app.js`

**Changes**:
- Added error-tracing imports
- Wrapped `render()` → `safeRender` with error boundary
- Enhanced `renderSafely()` to log errors via `logError()`
- All event handlers wrapped: `#return`, `#pause`, `#dashboard`, `#settings`, `#end`, `#complete`, `#keep`, `#review`, `keydown`

---

### 8. `dashboard/app.js`

**Changes**:
- Added error-tracing imports
- Wrapped `render()` → `safeRender` with error boundary
- Enhanced `renderSafely()` with try/catch and error logging
- Wrapped `confirmCareAction`, `closeCareDialog`, `openCareDialog`, `selectNode`, and all event handlers with error boundaries

---

### 9. `settings/app.js`

**Changes**:
- Added error-tracing imports
- Added `growthAnimationTrigger` to `original` defaults and `currentSettings()`
- Updated `load()` to read `growthAnimationTrigger` from stored settings
- Updated `sync()` to handle radio button selection for growth animation
- Updated `reset` handler to restore `growthAnimationTrigger`
- Wrapped `load()` → `safeLoad`, `sync()`, and all event handlers with error boundaries

---

### 10. `settings/index.html`

**Change**: Added "Growth ritual" radio group fieldset

```html
<fieldset class="radio-group">
  <legend>Growth ritual</legend>
  <label class="radio">
    <input type="radio" name="growth-animation" value="mission-origin" checked>
    <span><strong>Once per mission</strong><small>A small branch grows when you first plant a mission.</small></span>
  </label>
  <label class="radio">
    <input type="radio" name="growth-animation" value="every-branch">
    <span><strong>Every new branch</strong><small>A small branch grows each time you follow a new path.</small></span>
  </label>
  <label class="radio">
    <input type="radio" name="growth-animation" value="none">
    <span><strong>No ritual</strong><small>The companion stays quiet and steady.</small></span>
  </label>
</fieldset>
```

---

### 11. `README.md`

**Change**: Updated permissions section to document `webNavigation`

```diff
- The extension uses local storage for gardens and does not request the redundant `tabs` permission. It uses declared HTTP(S) page access to render the mission chip and detect eligible link activations. Chrome-internal, restricted, and other protected pages may not support the content script and degrade gracefully.
+ The extension uses local storage for gardens and does not request the redundant `tabs` permission. It uses declared HTTP(S) page access to render the mission chip and detect eligible link activations, plus `webNavigation` to support SPA history tracking on YouTube, Notion, Gmail, GitHub, and similar sites. Chrome-internal, restricted, and other protected pages may not support the content script and degrade gracefully.
```

---

## Architectural Summary

### Local Fork Enhancements

1. **Error Handling Infrastructure** — Comprehensive error tracing system (`shared/error-tracing.js`) integrated across all entry points (service worker, content script, newtab, popup, dashboard, settings)

2. **SPA Navigation Support** — `webNavigation` permission + `chrome.webNavigation.onHistoryStateUpdated` listener + domain-based deduplication for YouTube, Notion, Gmail, GitHub, Google Workspace

3. **Search URL Intelligence** — `isSearchUrl()` detection prevents search engine result pages from creating spurious branch depth

4. **Growth Ritual Customization** — User-configurable animation trigger (once per mission / every branch / none) with reduced-motion respect

5. **Message Validation** — Strict schema validation on all runtime messages in service worker

6. **Origin Ritual Tracking** — SessionStorage-based tracking ensures origin growth ritual plays only once per mission

7. **Test Suite** — 9 test files covering growth animation, message validation, multi-window, search detection, security boundaries, service worker behavior, SPA handling, tree layout invariants, and stress testing

### Upstream Characteristics

- Cleaner, more minimal codebase without error tracing overhead
- No SPA-specific navigation handling
- No search URL detection
- Fixed growth ritual behavior (always plays on new branch)
- No message schema validation
- Different documentation focus (more design/refinement reports, less audit/actionable docs)

---

## Risk Assessment

| Change | Risk Level | Notes |
|--------|------------|-------|
| `webNavigation` permission | Low | Standard Chrome API, well-scoped to SPA domains |
| Error tracing integration | Low | Defensive, only adds logging/wrapping; no behavioral changes on success |
| SPA deduplication | Medium | Could miss legitimate navigations if deduplication too aggressive (1s window) |
| Search URL detection | Low | Conservative: only ignores direct search page loads, not links from them |
| Growth ritual settings | Low | Purely visual, respects reduced-motion, backward compatible default |
| Message validation | Low | Rejects malformed messages early; improves security posture |
| `findNode()` compat change | Low | Supports both `tabIds[]` and legacy `tabId` |

---

## Conclusion

The local fork represents a **hardened, production-oriented evolution** of the upstream prototype. Key improvements focus on:

1. **Reliability** — Error boundaries, structured logging, message validation
2. **Real-world compatibility** — SPA support, search URL handling
3. **User agency** — Configurable growth ritual, reduced-motion respect
4. **Observability** — Comprehensive test suite, error diagnostics

The upstream remains a cleaner reference implementation suitable for study, while the local fork is better suited for actual deployment.