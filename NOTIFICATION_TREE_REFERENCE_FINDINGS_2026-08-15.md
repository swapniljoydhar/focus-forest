# Notification and Tree Reference Findings — 2026-08-15

## Notification tiles 1–2

The first compact companion state is a rounded off-white card with a very light green border/shadow, a small leaf icon at left, an uppercase micro-label reading `CURRENT MISSION`, a bold mission title (`spark` in the reference), a single-line explanatory status beneath it, and a right-aligned `Pause` action. The card is deliberately quiet and narrow, with a strong text hierarchy rather than a large visual widget.

The second state preserves the same geometry while changing only the status line to `Related branch · 1 step away`. The dark blue page background makes the pale card and subtle shadow legible without making the card feel like a blocking overlay. The reference confirms that the animation should be brief and contained inside the companion’s compact habitat rather than expanding the page or introducing a modal.

## Notification tiles 3–4

The third reference shows `Related branch · 2 steps away`; the card becomes slightly wider in the source capture but keeps the same compact visual rhythm. The fourth shows `Related branch · 3 steps away` and remains a small horizontal card with the mission title and Pause action unchanged. The status copy is the main state signal, and the card never becomes a full-screen warning.

This supports a ritual sequence in which a tiny branch grows inside the companion first, the animation briefly flickers at completion, and only then does the final status copy appear. The animation should not alter the card’s dimensions or shift the Pause control.

## Long-branch and tree tile 5

The long-branch notification changes the status line to `This branch is getting long`, while preserving the same rounded pale card, leaf icon, mission title, and Pause action. It reads as a calm atmospheric cue rather than a red alert.

The large tree reference is structurally important. It shows a small, centered trunk rising from a lower root/ground line, a clear horizontal primary limb junction, and tall organic side branches that curl upward into simple leaf tips. The visual language is sparse: branches are thick, rounded, and asymmetrical; labels sit close to their corresponding growth; the trunk and primary limbs carry the composition, while node marks are secondary.

## Tree tile 6 and overlap reconciliation

The overlapping continuation confirms the same structure without introducing a different interpretation: a centered lower trunk/root, a horizontal primary branch line, an organic left branch with a leaf tip, and an organic right branch that carries a deeper dotted/quiet path before reaching a terminal node. The overlap is consistent across the two tiles. The reference is not a dense botanical canopy; it is a sparse, legible tree whose branch strokes and node labels carry the browsing story.

The redesign implication is to stop trying to make the dashboard look like a generic full canopy. It should use a few strong trunk and limb forms, with branch growth attached to them, and reserve leaf marks for terminal data nodes. The companion ritual can borrow the same visual grammar at miniature scale.

## Current Focus Forest tree comparison

The reference-driven geometry is now materially closer to the supplied tree image: the lower root is centered, a bole rises into a horizontal primary limb level, and the left/right paths grow upward into organic side branches. This is the correct structural direction. The remaining difference is stylistic rather than topological: Focus Forest still uses too many small node marks and a slightly rigid symmetric fork, while the reference uses fewer, thicker, more organic limbs with leaves that feel like branch tips. The next tree pass should soften primary-limb curvature, make branch stems feel more botanical, and keep terminal leaf marks larger and quieter so the tree silhouette dominates the data points.

## Companion ritual browser verification

The temporary companion fixture successfully showed the intermediate state `A small branch is growing` with a miniature trunk/branch icon inside the unchanged compact card. After the bounded ritual, the card settled on `Related branch · 1 step away`, with the mission title and Pause action preserved. The card did not expand, block the page, or introduce a continuous loop. The final state visually matches the supplied notification references more closely than the prior leaf-only marker.

## Final tree browser pass

The thicker primary-limb treatment improves the intended hierarchy: the root and horizontal branch junction are now the visual spine, while the upward side branches remain readable. The result is much closer to the supplied reference than the earlier generic canopy. The remaining apparent roughness comes from the screenshot’s browser annotation overlays and the intentionally data-dense fixture; the underlying tree structure is connected and accessible.
