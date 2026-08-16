# Focus Forest Enhancement Plan

**Status:** Finalized — ready for implementation

---

## 1. Growth Animation Settings (User Request) — **DECIDED**

### Decision
**Default: A) Once per mission (at origin page load)** — User confirmed.
Settings will offer all three options (A/B/C) with A as default.

### Implementation
- Add `growthAnimationTrigger` setting to `shared/state.js` DEFAULT_SETTINGS (default: 'mission-origin')
- Add radio group in `settings/index.html` + `settings/app.js`
- Modify `content/content.js` `showGrowthRitual()` to check trigger condition
- Animation: 1-2s tree growing branch → flicker → disappear → then chip appears

### Clarification Needed
- Should the chip be **completely hidden** during the 1-2s animation, then appear?
- Should animation replay if user refreshes origin page? (Recommend: no, only first load per mission)

---

## 2. SPA & History API Support (Critical Bug Fix)

### Problem
`pushState`/`replaceState` navigations in SPAs (YouTube, Notion, Gmail, GitHub) don't trigger link-activation depth tracking.

### Solution
- Add `"webNavigation"` permission to `manifest.json`
- In `background/service-worker.js`, listen to `chrome.webNavigation.onHistoryStateUpdated`
- Filter for `frameId === 0` (top-level only) and same-tab navigations
- **Deduplication**: Maintain `SPA_DOMAINS` set (youtube.com, notion.so, gmail.com, github.com, etc.). For navigations on these domains, **prefer `historyStateUpdated`** and ignore `LINK_CLICK` for same-tab same-URL within 1s.
- Reuse existing `observeTab()` logic for depth calculation

### Risk
- New SPA domains not in list will double-count
- List needs maintenance but covers 90% of cases

---

## 3. Search Neutrality Edge Case

### Problem
If user plants mission on `google.com/search?q=...`, the "search pages remain neutral" rule prevents origin from being set.

### Solution
- In `observeTab()`: if session has no origin yet (only seed node exists), treat current page as origin regardless of search-ness
- **Detection**: Combine both approaches:
  1. Known search engine domains (google, bing, duckduckgo, yahoo, startpage, brave, etc.) + query params (`q`, `search`, `query`, `p`)
  2. Generic heuristic: any URL with `?q=`, `?search=`, `?query=`, `?p=` params
- Only apply "neutral" classification for subsequent navigations (after origin is established)
- Update `isSearchUrl()` helper in `shared/state.js` or `background/service-worker.js`

---

## 4. Multi-Window Pending Link Collision

### Problem
Pending branches keyed by `sourceTabId + destination` collide if two windows open same URL.

### Solution
- Change `pendingBranchKey()` to include `windowId`: `${sourceTabId}::${windowId}::${url}`
- Update `setPendingBranch()`, `takePendingBranch()` accordingly
- Pass `windowId` from content script `LINK_CLICK` message

---

## 5. Performance at Max Garden

### Current Limits
- 12 sessions × 96 nodes = 1,152 nodes max
- Dashboard renders all nodes as SVG DOM elements

### Stress Test & Optimization
1. **Synthetic fixture**: Create test garden with 96 nodes across depths (for CI/regression)
2. **Real-world profiling**: Manual testing with actual usage patterns (if user data available)
3. **Metrics targets**: <200ms render, <50MB heap, 60fps interactions
4. **Optimizations if needed**:
   - Virtualize off-screen branches (only render visible viewport)
   - Debounce label layout calculations
   - Use `requestIdleCallback` for non-critical layout
   - Limit label DOM nodes (already yields when crowded)

---

## 6. Permissions Copy Cleanup

### Issue
Manifest/description mentions `tabs` permission for recovery but it was removed in audit.

### Fix
- Update `manifest.json` description
- Update `README.md` permissions section
- Ensure no code references `chrome.tabs` permission (already using `chrome.tabs` API without permission - allowed for `update`, `create`, `get`)

---

## 6b. Security Hardening & Code Quality (Critical)

### Root Cause 1: XSS Surface from innerHTML Usage
**Files**: `content/content.js` (lines ~9-10, ~68), `dashboard/app.js` (multiple innerHTML sinks)

**Issues**:
- `shadow.innerHTML += ...` after appending style element — brittle, re-serializes shadow contents
- `sheetCopy.innerHTML = template` with `escapeHtml` — pattern is brittle, future edits may omit escaping
- Dashboard uses `innerHTML` for data rendering (test-security.mjs flags this)

**Remediation**:
1. **Content script**: Build complete shadow DOM markup as single string, set `innerHTML` once. Or use `createElement` + `append` for all dynamic content.
2. **Dashboard**: Replace all `innerHTML` with DOM construction (`createElement`, `textContent`, `setAttribute`). Already uses `createElementNS` for SVG — extend to all data rendering.
3. **Add lint rule**: `no-inner-html` or custom ESLint rule forbidding `innerHTML` with template literals containing variables.

### Root Cause 2: Overbroad Host Permissions
**File**: `manifest.json` line 9: `"host_permissions": ["http://*/*", "https://*/*"]`

**Issue**: Grants access to all origins, expanding attack surface.

**Remediation**:
- Keep broad host permissions for content script injection (core requirement: companion on all pages)
- **But**: Add `optional_host_permissions` for any elevated access, document why broad is required
- Consider `activeTab` + user gesture for companion injection as alternative (changes UX)
- **Decision**: Keep broad for now, document in `SECURITY.md` with justification

### Root Cause 3: Message Handling & Error Exposure
**File**: `background/service-worker.js` lines ~222-256

**Issues**:
- `sendResponse({ error: error.message })` leaks internal error strings to content scripts
- `isRecord(message)` check is minimal — no per-message-type schema validation
- `mutationQueue` complexity increases race condition risk

**Remediation**:
1. **Error sanitization**: Return `{ error: 'INTERNAL_ERROR' }` or error codes, never raw messages
2. **Schema validation**: Define explicit schema per message type (required keys, value types) using a validation helper
3. **Mutation queue**: Add integration tests for concurrent mutations (already in stress test, extend)

### Root Cause 4: State Shape Inconsistency (node.tabId vs node.tabIds)
**File**: `shared/state.js` lines ~60-66, ~84-95, ~119-121

**Issues**:
- `compactNode` handles both `tabId` (legacy) and `tabIds` (current)
- `normalizeState` migrates but dual representation persists in stored state
- `findNode` looks for `node.tabId` only — assumes legacy shape, misses `tabIds` array

**Remediation**:
1. **Canonicalize**: Single representation = `tabIds` array (never `tabId`)
2. **Migration**: In `normalizeState`, convert any `node.tabId` → `node.tabIds = [node.tabId]`, delete `tabId`
3. **Update `findNode`**: Search `node.tabIds?.includes(tabId)` 
4. **Add tests**: Unit tests for `normalizeState`, `compactNode`, `findNode`, `nodeForTab` covering legacy + new shapes

### Root Cause 5: Fragile Shadow DOM Mutation Order
**File**: `content/content.js` lines ~6-10

**Issue**: Creates shadow root → appends style → `shadow.innerHTML += markup` re-serializes and can break references.

**Remediation**:
- Build complete HTML string (style + markup) → single `shadow.innerHTML = completeString`
- Or: Use `createElement` for style and all DOM nodes, `append` each — no `innerHTML` on shadow root

### Root Cause 6: Missing Automated Security Checks
**Current**: `node test-security.mjs` (static contracts), `node test-service-worker.mjs` (behavioral)

**Additions**:
1. **ESLint with security rules**: `eslint-plugin-security`, `eslint-plugin-no-unsanitized`
2. **DOM XSS linter**: Custom rule or `eslint-plugin-xss`
3. **Extension-specific scanner**: `web-ext lint` + custom rules
4. **CI pipeline**: GitHub Actions running `test-security.mjs`, `test-service-worker.mjs`, `test-tree-layout.mjs`, `stress-service-worker.mjs`, ESLint

---

## 7. Real-Browser Testing Checklist (Documentation)

Create `TESTING_CHECKLIST.md` covering:
- [ ] Page-specific rendering (GitHub, YouTube, Notion, Gmail, SPA)
- [ ] Restricted origins (chrome://, extension://, file://)
- [ ] Redirect chains (multi-hop, meta refresh, JS redirects)
- [ ] Keyboard focus (chip, choice sheet, dashboard, settings)
- [ ] Popup sizing (various viewport widths)
- [ ] Chrome profiles (multiple profiles, incognito)
- [ ] Browser session restore
- [ ] Tab groups / window splits
- [ ] Reduced motion preference
- [ ] High contrast / forced colors
- [ ] Zoom levels (100%, 125%, 150%, 200%)

---

## 8. Feature Ideas (Prioritized)

### P1 - Export Garden (High Value) — **Both Simultaneously**
- **Shared serialization**: `serializeGardenForExport(session)` → `{ mission, nodes, events, compost, stats }`
- **PNG (visual only)**: Canvas snapshot of rendered SVG tree → PNG download (what user sees in dashboard)
- **Markdown (structured summary)**: 
  ```
  # Focus Forest Garden: [Mission]
  *Planted: [date] · Duration: [time] · Status: [active/completed]*
  
  ## Path Summary
  - Pages visited: [count]
  - Deepest branch: [depth]
  - Branches grown: [count]
  - Curiosities composted: [count]
  
  ## Trail Notes
  - [Event 1]
  - [Event 2]
  ...
  
  ## Compost Pile
  - [Title]([URL]) — from [mission] — [date]
  ...
  ```
- Add "Export" dropdown in dashboard header: "Download PNG" / "Copy Markdown"
- Keyboard accessible: Ctrl/Cmd+E opens export menu

### P2 - Compost Search
- Add search input above compost list in dashboard
- Filter by title, URL, mission, date
- Keyboard accessible (Cmd+F / Ctrl+F)

### P3 - Time-Decay Visual (Low Effort)
- Gardens older than 7 days: subtle desaturation in dashboard
- Sessions list: show "Resting 8 days" with muted color
- No functional change, only visual

### P4 - Optional Focus Mode Integration — **Included in This Plan**
- New optional module: `focus-mode/` (separate from core)
- Uses `declarativeNetRequest` with dynamic rules
- **MVP: Domain blocklist only** — user adds patterns (e.g., `twitter.com`, `reddit.com`) in settings
- User explicitly enables in settings → requests `"declarativeNetRequest"` + `"declarativeNetRequestFeedback"` permissions at runtime via `chrome.permissions.request()`
- Block list managed locally, no external lists
- Core extension remains pure (no blocking, no network requests)
- Separate code path: `focus-mode/background.js`, `focus-mode/rules.json`
- Settings UI: "Enable Focus Mode" toggle → permission prompt → domain pattern input + list
- **Architecture**: Lazy-load focus mode only when enabled (dynamic import)

---

## 9. Tree Visualization Improvements ("More Like an Actual Tree") — **DECIDED: Dashboard Only**

### Current State
Dashboard renders SVG tree with 4 modes (seed/sapling/canopy/deep), centered root, trunk, primary limbs, secondary branches, terminal leaves.

### Design Scope: Dashboard Only
**Companion chip stays minimal** — it's a status indicator, not a visualization. No tree metaphor in chip.

### What "More Like an Actual Tree" Means for Dashboard:
- [ ] **Organic curves**: More natural Bezier curves, less geometric (update `tree-layout.js` edgePath with curve tension parameters)
- [ ] **Seasonal palette**: Real-world season (Northern hemisphere: Spring=Mar-May, Summer=Jun-Aug, Autumn=Sep-Nov, Winter=Dec-Feb) with user override in settings
- [ ] **Growth animation**: Branches animate growing when tree first renders (CSS keyframes, respects reduced-motion)
- [ ] **Living details**: Leaves sway subtly (CSS animation, respects reduced-motion), bark texture via SVG patterns
- [ ] **Root system**: Visible roots spreading downward from seed (enhance existing rootFlare in seed/sapling modes)
- [ ] **3D depth**: Subtle parallax on branch layers via CSS transform on scroll/mouse-move (optional, low priority)

### Technical Approach
- Extend `dashboard/tree-layout.js` with organic curve parameters
- Add seasonal CSS variables in `dashboard/style.css`
- Add growth animation keyframes in `dashboard/style.css`
- Keep SVG DOM construction (safe, no innerHTML)

---

## 10. Notification Bar (Companion Chip) UX Fixes — **DECIDED: Draggable Top-Right**

### Current Problems
- Fixed top-right, blocks content
- Not movable
- No auto-hide

### Solution: Draggable Chip with Persistent Position
- User drags chip by small handle (left edge) to preferred position
- Position saved per-session in `chrome.storage.session` (not synced, per-browser-session)
- Constraints: keep within viewport bounds, avoid browser UI areas
- Double-click handle → reset to default top-right
- Keyboard accessible: Focus chip → arrow keys to nudge position (10px steps)

### Settings Additions (Optional Enhancement)
- `companionPosition`: {x, y} — stored per session, not in settings
- Reset button in popup to restore default position

### Not Doing (Per Decision)
- Auto-hide after delay
- Collapsible to icon
- Bottom-center default position

### Technical Approach
- Add `mousedown`/`mousemove`/`mouseup` handlers on drag handle in `content/content.js`
- Use `chrome.storage.session.set/get` for position persistence
- Update chip `style.transform` or `top`/`right` CSS properties
- Ensure drag doesn't interfere with click/touch on chip buttons

---

## 11. Dashboard & Settings Remake — **DECIDED: Full Rewrite**

### Dashboard Vision
**Current**: Functional but utilitarian. SVG tree + event list + compost in card layout.

**Target**: Organic, living garden feel — **full rewrite**
- New `dashboard/index.html`, `dashboard/app.js`, `dashboard/style.css`
- **Layout**: CSS Grid, tree takes full viewport (100vw/100vh). Detail panel slides in from right (320px) on node click. Trail notes & compost as collapsible drawers at bottom. Mobile: tree scrollable, drawers full-screen.
- Seasons/time-of-day ambient background (CSS gradients, animated)
- Trail notes as "carved bark" on branches (click branch → see notes in slide-over panel)
- Compost as "fallen leaves" at base (click leaf → restore/remove in bottom drawer)
- Smooth transitions between gardens (CSS transitions, 300ms)
- Keyboard navigation: arrow keys walk the tree, Enter opens detail panel, Escape closes panel/drawers
- Responsive: works at 320px width (mobile) to 1920px+

### Settings Vision
**Current**: Sliders + toggle in card layout.

**Target**: "Tending station" metaphor — **full rewrite**
- New `settings/index.html`, `settings/app.js`, `settings/style.css`
- **Layout**: Tabbed interface — **General | Companion | Focus Mode | Data**
  - **General**: Visual sliders (water level = gentle depth, sunlight = choice depth) with live mini-tree preview. Presets: "Deep Focus" (2/3), "Balanced" (4/5), "Explorer" (6/8). Season override dropdown (Auto/Spring/Summer/Autumn/Winter). Auto-save on change.
  - **Companion**: Growth animation trigger (radio A/B/C). Drag handle preview/interaction zone.
  - **Focus Mode**: Enable toggle → permission prompt → domain pattern input + list (add/remove).
  - **Data**: Export (PNG/Markdown), Clear local data, Forget garden.
- One-page per tab, auto-save on change (no save button)

### Technical Approach
- **tree-layout.js becomes monolithic visual engine**: returns complete scene data including organic curves, seasonal palette config, growth animation keyframes, root system geometry
- New `dashboard/app.js` consumes scene data, builds SVG via DOM, adds ambient background layers, keyboard navigation, detail overlay panel
- Settings mini-preview imports same tree-layout.js for live preview
- All visual parameters (curve tension, seasonal colors, animation timing) centralized in tree-layout.js

---

## 12. Overall Logic Fixes (Audit & Harden)

### Known Issues from Code Review
1. **Redirect chain handling**: Multi-hop redirects may create intermediate nodes (partially fixed, needs stress test)
2. **Tab alias cleanup**: Composting detaches aliases but `nodeForTab` ignores `closedAt` — verify no stale references
3. **Storage migration**: `normalizeState` handles schema v2, but no migration path if schema changes
4. **Event ordering**: Concurrent `UPDATE_SETTINGS` + navigation could race (mutation queue serializes, verify)
5. **Memory**: `pendingBranches` Map never cleared on session end (only pruned by time)

### Validation Plan
- Run `test-service-worker.mjs` — all pass currently
- Run `stress-service-worker.mjs` — passes
- **Extend `test-service-worker.mjs` with new fixtures for**:
  - SPA historyStateUpdated navigation (with deduplication)
  - Multi-window same-destination pending link collision
  - Search-engine origin planting (origin set despite search URL)
  - Growth animation trigger conditions (A/B/C)
  - Focus mode permission request flow
  - Time-decay visual state (garden age > 7 days)
  - Export data structure serialization

---

## Dependency Graph

```
Growth Animation Settings (1)
       ↓
SPA Support (2) ← requires webNavigation permission
       ↓
Search Neutrality Fix (3)
       ↓
Multi-Window Fix (4)
       ↓
Performance Test (5) → informs Dashboard Remake (11)
       ↓
Permissions Cleanup (6)
       ↓
Security Hardening (6b) ← parallel with 6, blocks 11
       ↓
Testing Checklist (7) ← run after 1-6, 6b
       ↓
Feature Ideas (8) ← independent, prioritize P1-P2
       ↓
Tree Visualization (9) ← informs Dashboard Remake (11)
       ↓
Companion Chip Drag (10) ← independent
       ↓
Dashboard & Settings Full Rewrite (11) ← largest effort, uses 9, requires 6b
       ↓
Focus Mode Module (12) ← optional, lazy-loaded
       ↓
Logic Audit & Harden (13) ← continuous
```

---

## Open Questions for User — **ALL RESOLVED**

1. **Growth animation default**: ✅ **A (once per mission at origin)** — confirmed
2. **Tree visualization priority**: ✅ **Dashboard only** — companion chip stays minimal
3. **Companion chip position**: ✅ **Draggable top-right** — user drags to preferred position
4. **Dashboard remake scope**: ✅ **Full rewrite** — new HTML/CSS/JS architecture
5. **Optional focus mode**: ✅ **Include in this plan** — optional module with declarativeNetRequest
6. **Export format priority**: ✅ **Both simultaneously** — shared serialization, PNG + Markdown

---

## Next Steps — **Plan Finalized**

1. **Phase 1: Core Fixes** (Week 1-2)
   - Growth animation settings (A/B/C with A default)
   - SPA support via webNavigation API
   - Search neutrality edge case fix
   - Multi-window pending link collision fix
   - Permissions cleanup

2. **Phase 1b: Security Hardening** (Week 2, parallel with Phase 1)
   - Replace `innerHTML` with DOM construction in content script & dashboard
   - Canonicalize node shape: `tabIds` only, migrate `tabId` in `normalizeState`
   - Sanitize error responses in service worker
   - Add per-message-type schema validation
   - Fix shadow DOM mutation order (single innerHTML or createElement)
   - Add ESLint + security plugins, CI pipeline

3. **Phase 2: Testing & Performance** (Week 2-3)
   - Real-browser testing checklist execution
   - Performance stress test at max garden
   - Add test fixtures for new behaviors

4. **Phase 3: Tree Visualization** (Week 3-4)
   - Organic curves, seasonal palette, growth animation, root system
   - All in `dashboard/tree-layout.js` + `dashboard/style.css`

5. **Phase 4: Companion Chip Drag** (Week 4, parallel)
   - Draggable handle, session storage persistence
   - Keyboard accessible positioning

6. **Phase 5: Dashboard & Settings Full Rewrite** (Week 5-7)
   - New dashboard: full-screen, ambient, keyboard nav, trail notes on branches, compost as fallen leaves
   - New settings: tending station metaphor, visual sliders, live preview, presets, auto-save
   - Export feature (PNG + Markdown) integrated

7. **Phase 6: Optional Focus Mode** (Week 7-8)
   - Lazy-loaded module with declarativeNetRequest
   - Settings integration with permission request flow
   - Local rule management UI

8. **Phase 7: Logic Audit & Harden** (Continuous)
   - Run all test suites after each phase
   - Address any regressions
   - Final security review

---

*Plan finalized: 2026-08-15*
*Location: .kilo/plans/1786815465475-focus-forest-enhancement-plan.md*

---

*Plan created: 2026-08-15*
*Location: .kilo/plans/1786815465475-focus-forest-enhancement-plan.md*