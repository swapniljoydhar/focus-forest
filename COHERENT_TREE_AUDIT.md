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

The redesign remains local and dependency-free. It changes the dashboard renderer and styles, the empty-state SVG, the New Tab viewport safety rules, and the care dialog sizing. It does not change navigation semantics, storage schema, privacy behavior, or service-worker authority.
