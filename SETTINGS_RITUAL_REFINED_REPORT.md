# Focus Forest — Settings and End-of-Mission Refinement

## Settings experience

The **Tend the forest** surface now gives the user an understandable rhythm rather than a collection of raw controls. A live preview shows the root, the quieter reminder, and the choice threshold before anything is saved. The interface explains the effect of earlier and later thresholds in plain language, keeps the choice at least one branch after the reminder, and respects reduced-motion preferences.

The settings page now tracks unsaved changes, disables Save when there is nothing new to save, announces saved and error states through a live status region, and handles local-storage/message failures without pretending that a change succeeded. Reset remains explicit and immediately restores the original rhythm.

## End-of-mission ritual

The popup’s **Let this garden rest** action now opens a semantic dialog with a labelled title and description. The footer action disappears while the ritual is open, the first choice receives focus, Escape closes the ritual and returns focus to the initiating action, and the pause control exposes its pressed state.

The reflection remains entirely deterministic. It uses only the mission text and local structural facts: pages, branch count, deepest branch, neutral paths, and composted items. The copy gives the session a beginning, path, and resolution without scoring success, guessing relevance, or generating a summary.

The three outcomes are explicit: **Let it rest**, **Keep tending**, and **Open the garden map**. These preserve agency and make the difference between ending, postponing, and reviewing unmistakable.

## Validation

Fresh validation passed JavaScript syntax checks, the full mocked-Chrome behavioral suite, settings clamping and state checks, semantic-dialog and live-preview structure checks, Manifest V3 checks, HTTP(S)-only scope checks, and the no-AI/no-network runtime scan.

## Package

Archive: `focus-forest-settings-ritual-refined.zip`

SHA-256:

```text
b2da4d65ed6f2af0132e107c76b9222ab27b34f625b272b72a1e4c0dd22f0d4f
```

## Remaining boundary

The interaction contracts are verified statically and through the deterministic test harness. A real Chrome profile is still required to judge popup sizing, focus behavior during native popup dismissal, and visual rhythm in Chromium itself.
