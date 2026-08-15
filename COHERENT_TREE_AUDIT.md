# Coherent Tree Redesign Audit

## Confirmed visual failures from the supplied screenshots

| Surface | Failure | Root cause to address |
|---|---|---|
| Dashboard tree | Several leaf nodes float above the branch system with no connecting path. | The renderer filters closed nodes before drawing edges, so a visible child can lose its parent from the rendered set. |
| Dashboard tree | The composition reads as a left-to-right flow chart, not a tree. | X is derived primarily from depth and the trunk is attached to the left-side root; depth should rise from a centered root/base and branches should grow upward. |
| Dashboard tree | The “trunk” descends below a terminal dot and does not support the canopy. | The root point is placed at the left-middle and the trunk is drawn downward from it. The root/base needs to sit near the lower center with an upward branching canopy. |
| Dashboard tree | Branches merge into arbitrary horizontal lanes and long/deep branches look like colored wires. | Layout does not allocate a subtree’s horizontal span or reserve a stable parent-to-child fan. |
| Dashboard tree | Node labels sit on top of lines and neighboring nodes. | Labels are positioned independently of branch geometry and do not have a crowded-session presentation mode. |
| Empty garden | The empty-state “sapling” is an enclosed loop rather than a trunk with leaves. | The SVG path closes visually around the root; it should use an open trunk and two attached leaf shapes. |
| New Tab | At short viewport height, the lower recovery action is clipped beneath the Chrome new-tab footer area. | `body` uses `overflow:hidden` and the vertical hero spacing is too large for the available height. |
| Care dialog | The dialog is structurally sound but visually too small relative to the blurred dashboard and its action hierarchy is too compressed. | Dialog width, typography, and action sizing need a calm responsive minimum. |

## Redesign invariant

Every rendered non-root node must have a visible parent edge to either its direct rendered parent or a deterministic nearest rendered ancestor. Every node must occupy a position derived from its subtree, not merely its depth. The mission root must sit at the base of a centered trunk, and branches must grow upward into the garden. No decorative leaf may be rendered without corresponding node identity and an attached path.

## Scope

The redesign remains local and dependency-free. It changes the dashboard renderer and styles, adds a small deterministic `dashboard/tree-layout.js` module and focused layout tests, and rewrites both populated and empty SVG states through safe DOM construction. It does not change navigation semantics, storage schema, privacy behavior, or service-worker authority.

## 2026-08-15 refinement result

The renderer now uses a centered lower root, a visible bole, a deterministic trunk-fork anchor, weighted left/right primary limbs, upward secondary branches, tapering branch widths, and terminal leaf shapes attached to real session nodes. Missing or self-referential parents resolve to the root, so every visible non-root node receives a connected edge. The seed mode adds a trunk-tied shoot and crown bud instead of presenting only a circle. Labels are selected through a deterministic spacing pass and are suppressed when they would compete with neighboring branches; selected-node context remains available in the detail panel.

The SVG is now built with `createElementNS()`, `textContent`, and `replaceChildren()` rather than `innerHTML`. A temporary browser-scale fixture was checked with deep, saved/pruned, seed, and selected-root states. The populated fixture reads as a rooted tree with a central bole and connected canopy; the seed fixture reads as a young sapling. Automated layout, static security, service-worker, stress, and syntax checks pass.

The remaining limitation is intentional: visual acceptance was performed with a representative fixture rather than a live Chrome session containing real browsing history. Real-profile checks for restricted pages, SPA navigation, redirects, and browser-specific scale remain separate runtime coverage.


## Reference-driven refinement — 2026-08-15

The supplied references establish a more specific visual target than a generic canopy: a centered root and short bole, a horizontal primary limb junction, two sparse organic side branches, and terminal leaf tips. The dashboard now exposes explicit `primary` and `secondary` edge kinds. First-level paths share a stable horizontal branch level and originate at the trunk fork; deeper paths rise from their real parent branches. This keeps the tree legible at sparse session depths and avoids turning every node into an equal graph vertex.

The companion follows the same grammar at miniature scale. When a newly observed deeper node is confirmed, the chip briefly changes to a growing state, animates a tiny stem and two leaves, flickers for approximately one second, and then settles on the ordinary related-branch or long-branch notification. The ritual is bounded, cancellable, contained inside the existing chip dimensions, skipped under reduced-motion preferences, and does not use a timer loop or block the page.
