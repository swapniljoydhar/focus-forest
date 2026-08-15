# Focus Forest — Critically Reviewed Whole-Extension Improvement Plan

## Decision

The attached whole-extension plan has the right direction, but it is **too broad to implement safely as one uninterrupted pass**. This revised plan keeps its strongest ideas and adds engineering gates so the tree metaphor does not hide navigation bugs, create unnecessary memory cost, or turn the extension into an over-designed dashboard.

The implementation will proceed in **small, independently verifiable slices**. Each slice must remain green before the next begins. The living tree is an important visual improvement, but it is not allowed to outrank navigation correctness, privacy, accessibility, or low-memory behavior.

## Product goal

Focus Forest will become a calm, deterministic browser companion that helps users notice changes in direction and reflect on them later. It will feel natural across the entire journey: planting a mission, browsing, receiving a quiet signal, choosing a recovery path, tending settings, and revisiting a resting garden.

The extension will remain:

| Constraint | Non-negotiable decision |
|---|---|
| AI | No generative AI, summarizer, classifier, embedding, remote model, or page-content interpretation. |
| Privacy | Local-only mission and navigation metadata; no telemetry or network runtime. |
| Memory | Native HTML/CSS/SVG; bounded state; no continuous animation loops; minimal active-view messages. |
| Permissions | No new permission or host scope unless a concrete tested requirement proves it necessary. |
| Agency | No blocking, shame-based scores, or irreversible branch destruction by default. |
| Compatibility | Preserve current Manifest V3 architecture and existing storage where possible. |

## Scope cuts and explicit exclusions

The plan deliberately excludes a framework migration, third-party animation library, Canvas/WebGL rendering, sound, cloud sync, accounts, analytics, AI, page-content summarization, a tree animation on every webpage, automatic deletion of branches, and an attempt to recognize every redirect provider on the internet. These exclusions protect the extension’s purpose and make the result testable.

The living tree will initially exist **only on the dashboard**. The New Tab, popup, and page chip will share the same visual language but will not host a heavy animated tree.

## Phase 0 — Baseline and repository contract

Before implementation, inspect the current manifest, shared state normalizer, service worker, content script, New Tab, popup, settings, dashboard, icons, README, and mocked-Chrome suite. Run the baseline syntax, behavioral, Manifest, permission-scope, and no-AI/no-network checks. Record the current archive and keep it as the rollback package.

Trace and document these contracts:

`mission planting → origin observation → link signal → page observation → active-view response → page UI → dashboard history`

`popup/settings action → service-worker message → bounded local mutation → storage normalization → re-render`

The baseline phase ends only when the current behavior and test commands are written down. No visual edits occur before this gate.

## Phase 1 — Correctness-first navigation and lifecycle invariants

Verify and, where needed, fix the deterministic navigation invariants before adding tree rendering:

| Invariant | Required behavior |
|---|---|
| Unrelated tabs | Never become nodes or receive an active mission view. |
| Tab ownership | A live tab belongs to its current node only; historical nodes retain history without stale live ownership. |
| Duplicate tabs | A known canonical URL gains a bounded alias rather than a duplicate branch. |
| History movement | Back/forward to a known canonical URL reuses its node. |
| Redirects | Multi-hop transport stays pending and resolves into one final branch. |
| Search | A directly opened search page is neutral; a clicked result follows ordinary structural link logic. |
| Closure | Closing one alias preserves the path if another alias remains. |
| Session end | Active reminders stop, while bounded history remains available to the dashboard. |
| State repair | Malformed local records normalize without breaking valid gardens. |

For every changed invariant, add a focused failing test first, confirm it fails for the expected reason, implement the smallest fix, and rerun the focused test. Do not add visual work until this phase is green.

## Phase 2 — Living garden as a deterministic visualization

Enhance only the dashboard renderer. Keep the existing depth/parent graph as the source of truth and render it as a lightweight habitat:

| State | Visual and textual representation |
|---|---|
| Root | Seed/trunk junction with a plain “mission root” label. |
| Direct branch | Curved growing branch and leaf node. |
| Tab-inferred branch | Same branch form with a text note explaining the browser relationship. |
| Neutral external path | Pale side trail with a neutral label, never a distraction score. |
| Long/deep branch | Slight overgrowth and muted palette, plus a plain branch-depth label. |
| Compost item | Fallen leaf/soil marker and a trail note. |
| Pruned item | Removed from active canopy but preserved in historical notes. |
| Completed garden | Resting palette; tree remains viewable rather than disappearing. |

Use native SVG and CSS only. The tree may animate briefly when the SVG changes, using path-draw and leaf-arrival transitions. There must be no polling loop, frame loop, Canvas simulation, external asset, or third-party dependency. `prefers-reduced-motion` must disable transitions.

The SVG must have accessible titles and a parallel text trail. The visual tree must never be the only way to understand the session.

## Phase 3 — Safe branch lifecycle and maintenance

Add branch selection only if it can be implemented without making the dashboard confusing. Selection must be keyboard reachable and must expose a small detail region with the title, canonical path type, depth, and available actions.

The default action set is:

| Action | State effect |
|---|---|
| Leave growing | Dismiss selection; no mutation. |
| Prune this path | Mark the node as visually pruned while preserving the node and event history. |
| Return to compost | Reuse the existing bounded compost mutation where safe; preserve the historical node. |

Any new service-worker message must validate the session ID, node ID, ownership, and allowed transition. Invalid or cross-session requests must produce no mutation. The service worker remains the only state authority.

Add per-garden forgetting, compost-item removal, and delete-all controls only with explicit scope and confirmation. A completed garden must never reappear as an active page reminder.

## Phase 4 — Whole-extension experience alignment

After the core model and dashboard are stable, align the other surfaces without adding major runtime cost.

### New Tab

Keep a single clear planting prompt, useful examples, character guidance, local/private copy, and a calm confirmation state. Make Resume, Start a new mission, and Browse without a mission explicit about whether the current garden is preserved, completed, or bypassed.

### Page companion

Keep the chip small and quiet. Show only the mission, current branch state, pause/resume, and configured recovery state. Keep the active-view protocol minimal. Maintain robust Escape handling, focus containment, no duplicate overlays, hidden-tab timer shutdown, and safe behavior when a tab disappears.

### Popup

Use the popup as a mission companion, not a second dashboard. Provide current mission, branch state, pause/resume, return-to-mission, garden, settings, compost count, and mission-ending access. Keep the completion ritual explicit, reversible until confirmation, semantically labelled, keyboard-safe, and deterministic.

### Settings

Keep only understandable controls: gentle reminder depth, choice-sheet depth, ambient motion, and mission pause where already supported. Show a live rhythm preview, unsaved-state feedback, safe clamping, reset, local-only explanation, and failure feedback. The choice threshold must always remain after the gentle threshold.

## Phase 5 — Accessibility, privacy, performance, and resilience review

Perform a cross-surface review after behavior is stable:

| Review area | Acceptance check |
|---|---|
| Keyboard | Every important action is reachable and has visible focus. |
| Dialogs | Labelled title/description, Escape behavior, focus return, no hidden duplicate action. |
| SVG | Accessible title plus equivalent text trail; no state relies only on color. |
| Motion | Reduced-motion path disables transitions and no loops remain. |
| Privacy | No page text, network calls, AI terms, analytics, or remote assets in runtime code. |
| Memory | Bounded sessions/nodes/events/compost/pending redirects/aliases; no full-history page messages. |
| Resilience | Corrupt state normalizes, invalid actions do not mutate, storage failures show honest feedback. |
| Security | Service worker validates IDs and action ownership before every mutation. |

## Phase 6 — Verification and delivery gates

Use the following gates in order:

1. Baseline suite passes before changes.
2. Each navigation/lifecycle regression is red before its fix and green afterward.
3. Dashboard tree rendering is static-pure: rendering does not mutate state.
4. Branch lifecycle actions preserve historical records and reject invalid ownership.
5. Settings preserve threshold ordering and report save failures honestly.
6. Completion actions produce truthful end reasons and stop active reminders.
7. Full JavaScript syntax checks pass.
8. Manifest and permission-scope checks pass.
9. Accessibility structure checks pass.
10. No-AI/no-network runtime scan passes.
11. Package smoke check passes and a new handoff report records exactly what was and was not tested.
12. Real Chrome-profile acceptance is performed separately for popup sizing, dashboard visuals, keyboard behavior, SPA transitions, redirects, session restore, multiple windows, and restricted pages.

## Expected file ownership

| Area | Files |
|---|---|
| State and normalization | `shared/state.js` |
| Navigation and lifecycle | `background/service-worker.js` |
| Page companion | `content/content.js`, `content/content.css` |
| Planting ritual | `newtab/index.html`, `newtab/app.js`, `newtab/style.css` |
| Popup ritual | `popup/index.html`, `popup/app.js`, `popup/style.css` |
| Settings | `settings/index.html`, `settings/app.js`, `settings/style.css` |
| Living garden | `dashboard/index.html`, `dashboard/app.js`, `dashboard/style.css` |
| Contracts | `test-service-worker.mjs` |
| Handoff | `WHOLE_EXTENSION_REVIEW_REPORT.md` |

No new permission, dependency, external asset, or service is planned.

## Risks, rollback, and decision points

The main risk is scope expansion. If a phase needs changes outside its listed ownership, stop and review the blast radius before editing. The second risk is metaphor overwhelming comprehension; every visual state must have plain text. The third risk is branch lifecycle mutation deleting history; preserve nodes and add state-preservation tests. The fourth risk is animation cost; keep transitions state-triggered and CSS/SVG-only.

Rollback is straightforward: preserve the baseline archive, isolate each phase in a small file set, and revert only the phase that fails its acceptance gate. If real-browser behavior contradicts mocked tests, treat the real browser as authoritative, capture the reproduction, and fix the narrowest contract rather than adding speculative heuristics.

## Definition of done

The result is ready for human review when the whole journey feels coherent from planting to browsing to reflection, the tree visibly represents real deterministic state, branch actions preserve history, settings are understandable and reversible, the page companion remains quiet and low-memory, unrelated tabs remain isolated, malformed state cannot break the extension, and all fresh automated checks pass.

It is **not** called Chrome Web Store-ready until a real Chrome-profile acceptance pass has been completed and documented.
