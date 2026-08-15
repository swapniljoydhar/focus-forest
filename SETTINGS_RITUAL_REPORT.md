# Focus Forest — Settings and End-of-Mission Ritual Refinement

## Settings surface

The settings experience is now framed as **Tend the forest**, not configuration. It gives the user three meaningful controls: when the path grows quieter, when a choice appears, and whether lightweight ambient motion is allowed. A live rhythm preview makes the consequences visible before saving. The choice threshold is always clamped to at least one branch after the gentle threshold, so the interaction cannot become contradictory.

The page communicates the privacy boundary directly: settings are saved only on the device, and they change timing rather than visibility. The surface uses native range controls, a semantic toggle, live status feedback, visible focus states, responsive layout, and reduced-motion support.

## End-of-mission ritual

The popup now closes a mission through a small **Let it rest** reflection rather than an immediate state change. The reflection is generated only from deterministic local facts: mission text, page count, branch count, deepest branch, neutral external paths, and compost events. It explicitly avoids grades, success claims, relevance judgments, or AI-generated summaries.

The ritual offers three agency-preserving outcomes: let the garden rest, keep tending, or return to the garden view. The completion surface is a semantic dialog with a labelled heading and keyboard-friendly controls.

## Engineering correction

The shared threshold contract now supports both legacy uppercase names and settings-aware names, preventing default depth calculations from receiving undefined values. Settings clamping is covered by regression tests.

## Validation

Fresh checks passed JavaScript syntax validation, the complete mocked-Chrome behavioral suite, settings clamping tests, accessibility identifier checks, Manifest V3 checks, HTTP(S)-only scope checks, and the no-AI/no-network runtime scan.

## Package

Archive: `focus-forest-settings-ritual.zip`

SHA-256:

```text
9d350b7cb7a429511f8c5ace6514540b4e3a47f80c423f635a9194bb7c8aa284
```

## Remaining boundary

The settings page and ritual are verified statically and through service-worker behavior. Real Chrome-profile testing is still required to evaluate the final visual density, popup sizing, keyboard focus behavior, and extension-page transitions in Chromium itself.
