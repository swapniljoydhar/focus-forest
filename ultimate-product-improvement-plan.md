# Focus Forest — Whole-Extension Product Improvement Plan

## Goal

Evolve Focus Forest from a strong deterministic prototype into a coherent, natural-feeling attention companion across the entire extension—not only the tree metaphor. The plan includes the living garden, navigation correctness, mission lifecycle, settings, popup, New Tab ritual, page chip, accessibility, privacy, performance, resilience, documentation, and real-browser acceptance criteria.

The extension must remain **local-first, dependency-free, deterministic, no-AI, low-memory, and user-controlled**. It must not summarize page content, classify relevance, send browsing data remotely, add heavy dependencies, or turn every page into an animated environment.

## Product principles

> Focus Forest should help a person notice a change in direction without treating curiosity as failure.

The product will use nature as an interaction language, not as decoration alone. Growth represents a path being created; overgrowth represents a path becoming long; compost represents a curiosity intentionally set aside; pruning represents a reversible visual choice; resting represents a completed or paused garden. Every metaphor must map to a transparent local state transition and must remain understandable in plain language.

The extension will preserve agency at every interruption. There will be no blocking, shame-based scoring, opaque relevance judgment, or irreversible branch destruction by default.

## Current-state audit and baseline

Before edits, inspect the current Manifest V3 configuration, shared state normalizer, service worker, page content script, New Tab, popup, dashboard, settings page, icons, README, and mocked-Chrome test harness. Record the current behavior, source footprint, existing permissions, state limits, and known real-browser boundary. Run the existing syntax and behavioral suite as a baseline.

Trace the main flow as `mission planting → origin observation → link signal → page observation → active-view response → page UI → dashboard history`. Trace the secondary flow as `popup/settings action → service-worker mutation → storage normalization → page/dashboard re-render`. Preserve the existing local storage schema unless a bounded, backward-compatible field is required.

## Phase 1 — Strengthen the deterministic navigation model

Improve correctness before adding richer visuals. Treat canonical URL nodes as the source of truth and preserve the existing distinction between direct links, tab-inferred links, neutral external paths, redirect transport, and known-page reuse.

Add or verify the following invariants:

| Invariant | Acceptance behavior |
|---|---|
| Unrelated tab isolation | A tab outside the tracked session never becomes a branch or receives an active mission chip. |
| Tab ownership | A navigating tab is attached to its current node only; historical nodes retain history but not stale live ownership. |
| Duplicate tabs | A duplicate known URL attaches as an alias without creating a deeper branch. |
| Browser history | Back/forward to a known canonical URL reuses its node. |
| Redirect chains | Multi-hop transport collapses into one final structural branch. |
| Search roots | A directly opened search page is neutral; a clicked result follows ordinary branch logic. |
| Tab closure | Closing one alias does not close the path while another alias remains. |
| Session boundaries | Ending or replacing a mission removes active page reminders but retains a bounded historical garden. |

Add focused red-green tests for any invariant that is not already covered. Keep redirect and pending-relationship state bounded and local.

## Phase 2 — Build the living garden, not only a decorative tree

Enhance the dashboard SVG renderer into a living tree with a stable visual grammar. Keep the current depth/parent layout as the structural basis, but render a trunk, curved branches, leaf-shaped nodes, neutral side trails, overgrowth, deep paths, composted leaves, and a resting palette.

Use only native SVG and CSS. New growth may use a short path-draw transition and leaf arrival effect, but there must be no continuous animation loop, Canvas simulation, image downloads, external fonts, or third-party renderer. Reduced-motion preferences must disable transitions.

The garden should include:

| Surface | Improvement |
|---|---|
| Tree map | Root/trunk, curved branch geometry, leaf nodes, accessible SVG titles, state-aware resting palette. |
| Narrative header | A beginning/middle/resolution summary derived only from local structure. |
| Trail notes | Plain-language explanations of direct, neutral, redirected, reused, composted, pruned, and resting events. |
| Legend | Distinguish states through shape, stroke, label, and text—not color alone. |
| Selected branch | Show a small local detail card with title, path type, depth, and available reversible actions. |
| Empty state | A clear clearing with a mission-planting invitation rather than an empty analytics view. |

A branch lifecycle action may include **Leave growing**, **Prune this path**, and **Return to compost**. Pruning must never erase historical truth. It may hide a node from the active canopy, mark it as pruned, or add it to compost, but the session record and trail note remain available.

## Phase 3 — Improve the New Tab planting ritual

Make mission planting feel like the entrance to the habitat. Provide a single clear prompt, useful example missions, visible character guidance, a local/private explanation, and an explicit distinction between planting an intention and browsing without one.

Add a calm confirmation state after planting so the user understands what happens next: the first ordinary page becomes the root, direct link paths grow branches, and the extension will not block or judge pages. Resume and browse-without-mission must clearly communicate whether the active garden is preserved, rested, or bypassed.

The New Tab must remain fast and avoid background timers, remote assets, or heavy rendering.

## Phase 4 — Improve the page companion

Keep the page chip intentionally small and quiet. It should show the mission, current branch state, pause/resume control, and—only at configured thresholds—the early-warning atmosphere or choice sheet.

Refine the choice sheet into a clear, accessible decision point with three equal actions: return to the mission, save for later, or make this the new mission. Add robust Escape handling, focus containment, visible focus states, no duplicate overlays, and correct behavior when a page or tab disappears during the action.

The content script must receive only the minimal active-view object. It must not receive full session history, page text, or unrelated tab data. Hidden tabs should not retain polling work.

## Phase 5 — Improve the popup as a mission companion

Make the popup a concise control surface rather than a second dashboard. It should communicate the current mission, branch state, pause/resume state, return-to-mission action, garden access, settings access, compost count, and session completion action.

Ensure the popup’s completion ritual is explicit and reversible until the user confirms. The ritual should show deterministic local facts only: pages grown, branches, deepest path, neutral paths, and saved curiosities. It should offer **Let it rest**, **Keep tending**, and **Open the garden map**. The completion dialog must support focus return, Escape dismissal, labelled description, hidden duplicate actions, and no silent destructive mutation.

## Phase 6 — Improve user-controlled settings

Keep settings small and meaningful. The settings page should control only behavior the user can understand:

| Setting | Behavior |
|---|---|
| Gentle reminder depth | Chooses when the page becomes subtly quieter. |
| Choice-sheet depth | Chooses when the recovery decision appears; always remains after the gentle threshold. |
| Ambient motion | Enables lightweight CSS/SVG transitions; system reduced-motion remains authoritative. |
| Mission pause | Available from the popup/page companion; pauses intervention without deleting the garden. |

Show a live rhythm preview, unsaved-change state, disabled Save when unchanged, local-only copy, safe clamping, reset behavior, and graceful failure feedback. Do not expose implementation jargon such as “threshold constants” or “classifier.”

## Phase 7 — Make session history and maintenance trustworthy

Keep completed gardens bounded and selectable. Add clear local maintenance controls: forget one garden, delete all local data, remove one compost item, and preserve active-session behavior. Every destructive action must be explicit, scoped, and locally confirmed.

The dashboard should communicate whether a garden was intentionally completed, changed to a new mission, paused, or left for ordinary browsing. It should never present a completed session as an active page reminder.

## Phase 8 — Accessibility and interaction quality

Apply accessibility as a system-wide requirement. Verify semantic headings, labels, roles, keyboard order, Escape behavior, focus return, focus containment where a modal is open, visible focus indicators, reduced-motion handling, sufficient non-color state descriptions, and readable mobile layout.

Every visual branch must have a text equivalent in trail notes or an accessible SVG title. Every important action must be reachable without pointer input. Avoid relying on hover, color, animation, or icon-only meaning.

## Phase 9 — Performance, privacy, and resilience hardening

Preserve the existing low-memory architecture and verify it after each visual change:

| Constraint | Implementation rule |
|---|---|
| Memory | Cap sessions, nodes, events, compost, pending redirects, and aliases. |
| Page cost | Inject once into top-level HTTP(S) documents and return only active-view data. |
| Background cost | Avoid no-op storage writes and continuous loops; stop hidden-tab timers. |
| Rendering | Use native CSS/SVG and state-triggered transitions only. |
| Privacy | Store only local mission/navigation metadata; never page text or network telemetry. |
| Resilience | Normalize malformed state, preserve valid gardens, and avoid corrupting history on partial actions. |
| Security | Validate session IDs, node IDs, action ownership, and message payloads in the service worker. |

## Phase 10 — Verification strategy

Use test-first work for new stateful behavior. Extend the mocked-Chrome harness with focused tests for:

1. Branch rendering data does not mutate session state.
2. Prune/compost actions preserve historical nodes and are session-scoped.
3. Invalid session or node actions are rejected without mutation.
4. Duplicate tabs attach aliases and navigation moves tab ownership cleanly.
5. Redirect chains collapse without artificial depth.
6. Search roots remain neutral and result clicks form branches.
7. Completed gardens remain in history but disappear from active page views.
8. Settings clamp safely and preserve threshold ordering.
9. Completion actions produce truthful end reasons.
10. Unrelated tabs and data remain untouched.

Run fresh JavaScript syntax checks, Manifest V3 validation, options/dashboard/popup structure checks, accessibility identifier checks, the full behavioral suite, the no-AI/no-network runtime scan, and a package smoke check. Mark real Chrome rendering and interaction testing as separate acceptance work rather than implying it is covered by mocks.

## Expected file ownership

| Area | Files |
|---|---|
| State and normalization | `shared/state.js` |
| Navigation and lifecycle | `background/service-worker.js` |
| Page companion | `content/content.js`, `content/content.css` |
| Planting ritual | `newtab/index.html`, `newtab/app.js`, `newtab/style.css` |
| Mission companion | `popup/index.html`, `popup/app.js`, `popup/style.css` |
| Settings | `settings/index.html`, `settings/app.js`, `settings/style.css` |
| Living garden | `dashboard/index.html`, `dashboard/app.js`, `dashboard/style.css` |
| Contract coverage | `test-service-worker.mjs` |
| Handoff | `WHOLE_EXTENSION_IMPROVEMENT_REPORT.md` |

No new permission, dependency, external asset, or service is planned.

## Acceptance criteria

The extension is ready for the next review when the entire journey feels coherent from planting to browsing to reflection, the dashboard tree visibly represents real deterministic state, branch actions preserve history, the page companion remains quiet and lightweight, settings are understandable and reversible, mission completion is intentional, unrelated tabs remain isolated, malformed local state cannot break the experience, and fresh tests pass.

The remaining human acceptance requirement is loading the extension in real Chrome and evaluating visual hierarchy, popup sizing, keyboard behavior, SPA transitions, redirects, session restore, and multiple windows. The implementation plan must not claim Chrome Web Store readiness before that acceptance pass.

## Risks and safeguards

The main risk is adding too much metaphor and making the product harder to understand. Every metaphor must have a plain-language label and deterministic state mapping. The second risk is visual polish increasing memory cost. The safeguard is native CSS/SVG with no continuous animation. The third risk is branch lifecycle actions accidentally deleting history. The safeguard is state-preservation tests and explicit local-only mutations. The fourth risk is expanding scope indefinitely. The safeguard is implementing in the phase order above, testing each phase, and excluding new integrations, accounts, AI, remote data, and unrelated framework migrations.
