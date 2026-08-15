# Focus Forest — Structural Refinement Audit

This pass treats the supplied Chrome screenshots as a previous-version visual baseline. The goal is correction, not decoration.

| Observed defect | Likely owner | Correction direction |
|---|---|---|
| Tree reads as a wide graph rather than a rooted garden | `dashboard/app.js`, `dashboard/style.css` | Use a bounded, subtree-aware layout with a deliberate root zone, readable branch lanes, and a stable visual center. |
| Labels collide, run through branches, or compete with the next column | `dashboard/app.js`, tree label CSS | Make labels secondary to the path; show only high-value labels by default, keep selected context in the detail panel, clamp text, and anchor labels away from the next lane. |
| Root, trunk, and branch origins do not form a clear hierarchy | `dashboard/app.js` | Draw trunk/ground behind the root and begin child branches from a consistent root junction rather than treating every edge as an equal line. |
| Large tree card has an unbalanced visual field | `dashboard/index.html`, `dashboard/style.css` | Give the tree a defined composition zone and a useful empty state; keep the detail panel visually attached to the selected branch. |
| Legend communicates mostly through color | `dashboard/index.html`, `dashboard/style.css` | Use shape, stroke, dash, and text labels. |
| Trail notes and compost feel like detached data panels | `dashboard/style.css` | Add shared panel hierarchy, restrained empty states, and consistent section rhythm without turning the habitat into a metrics dashboard. |
| Dashboard controls are visually equal to destructive actions | `dashboard/style.css`, local care dialog | Group garden selection/navigation separately from irreversible-looking actions and use explicit calm confirmation copy. |
| Popup occupies too much of the garden and has a long vertical action stack | `popup/style.css` | Reduce physical footprint, strengthen primary/secondary/text hierarchy, and preserve readable touch targets. |
| Browser-native confirmation breaks the visual language | `dashboard/app.js` | Use a semantic local dialog with Escape, click-away dismissal, focus return, and explicit scope copy. |
| Responsive behavior is mostly a single breakpoint | dashboard/popup CSS | Add narrow-width rules for header actions, tree labels, detail actions, panels, and popup density. |

## Non-goals

No framework, dependency, remote asset, AI, page-content interpretation, continuous animation loop, Canvas, or network request is justified by this audit.
