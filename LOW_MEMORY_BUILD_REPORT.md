# Focus Forest — Low-Memory, No-AI Build Report

## Purpose

This build is optimized for the user’s ultimate purpose: a natural, visually rich attention companion that stays light, private, and deterministic. It uses no generative AI, no summarization AI, no remote model, no embeddings, no page-content classifier, and no network runtime calls.

> The extension’s intelligence is the branch model itself: observable browser structure turned into a transparent, reversible moment of choice.

## Deterministic intelligence

| Browser signal | Local behavior |
|---|---|
| Direct link from a tracked page | Add one branch level. |
| New-tab link | Hold one short-lived pending relationship, then attach it once on destination load. |
| Unrelated tab | Keep it outside the garden. |
| Manual or unlinked navigation | Record a neutral external path only when it occurs in an already tracked tab. |
| Return to known URL | Reuse the known node rather than create artificial depth. |
| Branch depth 4 | Apply a softer drift atmosphere. |
| Branch depth 5 | Offer return, compost, or new-mission choices. |

No content is interpreted. No page text is summarized. The extension does not guess whether a page is “good” or “bad.”

## Low-memory improvements

The baseline project footprint was approximately 79 KB including source, documentation, and local icons, with approximately 42.6 KB in principal runtime source and styles. The important improvements target runtime allocation and retained state rather than merely file size.

| Improvement | Result |
|---|---|
| Active-view protocol | Page scripts receive only the current mission, pause state, and current node depth/state instead of the entire garden history. |
| No-op write avoidance | Repeated page observations and duplicate actions do not write to local storage. |
| Bounded state | Maximum 12 gardens, 96 nodes per garden, 72 events per garden, 80 compost items. |
| Compact state | Transition arrays were removed because node parent IDs already describe the tree. URLs are canonicalized and titles are truncated. |
| Narrow injection | Content scripts run only once in top-level HTTP(S) documents, not every frame or browser-internal page. |
| Idle work reduction | Hidden tabs keep no URL polling timer. Visible tabs use a low-frequency fallback plus browser navigation events. |
| Native rendering | No framework, no image downloads, no external fonts, no video, and no Canvas animation loop. |

## Visual refinement

The extension remains visually ambitious without becoming heavy. The New Tab page uses CSS hills, clouds, sun wash, grass, and a seed illustration. The page chip uses a leaf marker and paper-and-moss styling. The popup uses a compact ambient habitat. The garden uses layered hills, a soft-light cue, an SVG tree, accessible node titles, and low-cost branch-growth motion that disables under reduced-motion preferences.

## Privacy guarantee

All runtime behavior is local. The extension stores only mission, URL/title metadata, branch structure, concise local event notes, and saved compost items. It does not read page text, send data off-device, use accounts, or perform analytics.

## Validation

The final optimization pass passed all JavaScript syntax checks, the deterministic mocked-Chrome behavioral suite, Manifest V3 and permission-scope checks, icon checks, the active-view protocol assertions, schema/retention assertions, and a runtime scan confirming no AI or network-call references in the extension JavaScript.

This build is still an honest prototype until it is loaded into a real Chrome profile and checked against restricted origins, redirects, SPA navigation, multiple windows, and Chrome-managed environments.

## Package

Archive: `focus-forest-low-memory.zip`

SHA-256:

```text
5325c0680372eed820467cf13d53d4a033eec4e3348ce31bbb0bef4c7e17e3dc
```
