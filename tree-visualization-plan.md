# Focus Forest — Living Tree and Branch Lifecycle Plan

## Goal

Add a visually tangible, living tree to the Focus Forest garden dashboard so the mission feels like a habitat rather than a metrics view. The tree will grow branches as deterministic navigation nodes appear, visually quiet long branches, let users prune or compost paths without erasing historical truth, and rest when a mission ends. The implementation must remain local-first, no-AI, dependency-free, accessible, and low-memory.

## Product thesis

The tree should make the session’s structure visible without judging the user. The mission is the root, intentional link paths become branches, neutral external paths become side trails, long paths become overgrowth, and composted items become fallen leaves or soil. “Destroy branch” will not be presented as destructive punishment. The user will be offered **Prune this path** or **Return it to compost**, while the historical trail remains available in the garden record.

## Scope and assumptions

The existing dashboard SVG tree, node graph, local compost model, session history, and deterministic service-worker state are the source of truth. The first implementation will enhance the dashboard only; the page chip and popup will remain lightweight. No Canvas loop, third-party animation library, image assets, network call, AI, content classifier, or page-level animated tree will be added.

The current node model already contains depth, parent ID, relationship confidence, state, URL/title metadata, and tab aliases. That is sufficient to derive the visual tree. If the existing state model cannot safely distinguish an active branch from a composted historical node, the implementation will add the smallest bounded local state field and a regression test rather than infer it from page text.

## Implementation phases

### Phase 1 — Inspect and establish the visual/state contract

Read the current dashboard renderer, dashboard markup/styles, shared state normalizer, service-worker node lifecycle, compost actions, and test harness. Document the existing node-to-SVG mapping and identify whether branch removal can reuse current compost state. Define the following rendering contract before editing: root node, direct branch, tab-inferred branch, neutral path, long branch, deep branch, composted node, and resting/completed garden.

Write a focused failing behavioral test for the first new observable rule: a branch rendered from a node must not mutate session state, and composting/pruning must preserve the node in historical session data while removing it from the active visual tree.

### Phase 2 — Build the lightweight living tree renderer

Refactor only the dashboard tree renderer into small deterministic functions that create a trunk, curved branch paths, leaf-shaped nodes, and accessible SVG `<title>` descriptions. Keep the existing parent/depth layout, but use natural forms instead of generic circles. Render the root as a seed/trunk junction, healthy branches as green growth, long branches as ochre overgrowth, deep branches as muted clay, neutral paths as pale side trails, and composted paths as fallen leaves or dotted historical trails.

Add state-based CSS transitions that run only when the SVG changes. Use `prefers-reduced-motion` to disable them. Do not create a permanent animation timer. New branch growth should be represented by a short path-draw transition and leaf arrival effect; the dashboard should settle after the transition.

### Phase 3 — Add branch lifecycle actions with historical preservation

Add a selected-node interaction on the dashboard using native SVG or adjacent accessible controls. A user can inspect a branch, then choose **Prune this path**, **Return to compost**, or **Leave it growing**. “Prune” will update only the local node’s bounded visual state; “Return to compost” will reuse the existing compost path where safe. Neither action will delete the historical node or rewrite the mission’s event truth.

If a new action is needed, add one narrowly scoped service-worker message with explicit session/node IDs, validate that the selected node belongs to the requested session, update local state through the existing mutation path, and add a concise deterministic event. Never accept arbitrary URLs or page-provided state as authority.

### Phase 4 — Add completion/resting presentation

When a garden is completed, render the tree in a resting state rather than clearing it. The active tree becomes slightly quieter, the trunk and branches remain visible, and the narrative header explains that the garden is resting. The selected historical garden must remain viewable. Do not add a second animation system; use a body/data attribute and CSS variables for the resting palette.

### Phase 5 — Accessibility, low-memory, and regression verification

Ensure every interactive branch has an accessible name, keyboard focus path, visible focus styling, and a non-color description. Provide a text trail note for users who cannot or do not want to interpret the SVG. Confirm no continuous timers, observers, framework dependencies, remote assets, or full-session transfers are introduced.

Extend the mocked-Chrome test harness with focused cases for node selection state, prune/compost preservation, invalid session/node rejection, completed-garden rendering data, and unchanged unrelated-tab behavior. Run JavaScript syntax checks, the service-worker behavioral suite, manifest checks, no-AI/no-network scan, and a static dashboard accessibility check.

## Expected files and ownership

| File | Planned responsibility |
|---|---|
| `dashboard/index.html` | Add the tree legend, accessible branch action region, and resting-state hooks. |
| `dashboard/app.js` | Refactor deterministic SVG rendering, node selection, lifecycle actions, and text trail descriptions. |
| `dashboard/style.css` | Add lightweight trunk/branch/leaf styling, state palettes, transitions, focus states, and reduced-motion behavior. |
| `background/service-worker.js` | Only if required: validate and persist prune/compost node actions through a narrow message. |
| `shared/state.js` | Only if required: normalize a bounded lifecycle field without breaking existing sessions. |
| `test-service-worker.mjs` | Add focused state-preservation and invalid-action regressions. |
| `TREE_VISUALIZATION_REPORT.md` | Record decisions, test evidence, and remaining Chrome-profile limitations. |

No new dependency or permission is planned.

## Acceptance criteria

The work is complete when the dashboard visibly reads as a living tree, new branches grow through a short state-based transition, long/deep/neutral/composted paths remain distinguishable without relying on color alone, completed gardens rest instead of disappearing, and prune/compost actions preserve historical truth. Keyboard and reduced-motion behavior must be supported. Service-worker tests must prove that lifecycle actions are session-scoped, bounded, deterministic, and non-destructive to unrelated data. All fresh validation commands must pass before packaging.

## Risks and safeguards

The primary risk is visual complexity increasing dashboard cost or confusing the underlying tree. The safeguard is to keep the current depth/parent layout and replace only node/branch forms. The second risk is accidentally deleting historical branches when pruning. The safeguard is to make lifecycle actions state changes only and add explicit preservation tests. The third risk is adding animation work that consumes memory. The safeguard is CSS/SVG transitions only, no loops, and a reduced-motion path.

Real Chrome-profile testing remains a required follow-up for popup/dashboard sizing, keyboard behavior inside Chromium extension pages, and visual evaluation across display scales. No Chrome Web Store readiness claim will be made from static or mocked tests alone.
