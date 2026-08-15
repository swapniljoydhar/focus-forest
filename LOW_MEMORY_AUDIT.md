# Focus Forest — Low-Memory and No-AI Audit

## What "intelligence" means in this build

Focus Forest will use **no generative AI, no language model, no summarizer, no remote inference, no embeddings, no content classifier, and no external analytics**. Its behavior is fully deterministic and inspectable.

The extension only uses browser-observable structure:

| Signal | Deterministic meaning |
|---|---|
| A normal link activated in a tracked page | One directly connected branch level. |
| A link opened in a new tab | A pending branch, attached only once the destination tab loads. |
| An unrelated tab | Outside the garden. |
| A manually entered or unlinked URL inside a tracked tab | A neutral external path, depth zero. |
| A previously known URL | Reuse the existing node rather than create a new branch. |
| Deep branch threshold | A locally calculated reminder based only on branch count. |

This is structural awareness, not AI. It never claims to understand the content of a page or the user's intent.

## Baseline footprint

The extension source and local assets total approximately **79 KB** before packaging, with roughly **42.6 KB** in the main runtime source and styles. The existing visual design is already lightweight: no framework, no webfont, no image download, no Canvas loop, no video, and no third-party runtime library.

The meaningful performance risks were not decorative CSS; they were avoidable retained state and repeated data transfer:

| Finding | Memory/performance implication | Refinement |
|---|---|---|
| Full historical state returned to content scripts on every refresh | Repeated serialization and allocation as history grows | Add a minimal active-view message for page scripts. |
| Every message mutation writes local state, including no-op tab updates | Unnecessary storage work and service-worker activity | Save only when a state mutation is real. |
| Unused transition records duplicate node-parent information | Persistent state grows without powering the UI | Remove transitions and derive lines from node parent IDs. |
| Unbounded per-session node and event arrays | Long browsing sessions retain unnecessary history | Cap branches and event notes using transparent retention limits. |
| Full URLs and arbitrary titles may be long | Avoidable local-state growth | Canonicalize URLs, omit fragments, and truncate stored titles. |
| One content script runs a 1.2-second SPA URL poll while visible | Continuous background work per page | Use a 3.2-second visibility-aware check, browser navigation events, and remove the timer when the document is hidden. |

## Design decision

The extension now implements that decision: page scripts receive only `{ mission, interventionPaused, current node depth/state }` through `GET_ACTIVE_VIEW`; they never receive the full session history. Hidden tabs do not keep an active polling timer. Content scripts run only once in top-level HTTP(S) documents. The extension retains only the data needed for a private garden: a capped branch graph, concise event notes, a local compost list, and a selected mission. It keeps the visual richness in CSS and inline SVG, which avoids heavy image/video assets.
