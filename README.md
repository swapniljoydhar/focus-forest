# Focus Forest

Focus Forest is a calm, local-first Chrome extension that helps a person return to intention when useful research gradually becomes wandering. It contains **no generative AI, no summarizer, no remote model, no embeddings, and no page-content classifier**. Its intelligence is a transparent branch model built only from browser navigation signals. It is not a domain blocker and does not judge whether a page is relevant. It observes how pages are reached, keeps the current mission visible, and offers a gentle moment of choice when a tracked branch becomes unusually deep.

## The experience

Open a new tab and plant a mission such as “Compare laptops for university.” The mission chip stays quietly available on supported pages. Related links grow healthy branches. At a deeper branch, the page becomes subtly quieter and the chip says that the branch is getting long. At the interruption threshold, the extension offers three equal choices: **Return to my mission**, **Save this for later**, or **Start a new mission**.

A garden view preserves completed missions locally. It shows what grew from the intention, where the path changed, and which curiosities were composted for later. The garden is a reflection, not a productivity score.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `focus-forest` directory.
5. Open a new tab and plant a mission.

## Navigation semantics

The origin is the first ordinary webpage after a mission is planted. A link activated in a tracked page creates one branch level. A new tab opened from a tracked page waits until the destination loads, then attaches exactly once using the opener relationship or a short-lived pending-link relationship. Unrelated tabs remain outside the tree.

Manually entered URLs, bookmarks, and other unlinked navigations are recorded as neutral external paths when they occur inside a tracked tab; they do not automatically become deeper distractions. Returning to a known URL reuses its existing node instead of creating artificial depth. Chrome cannot expose every semantic relationship, so the extension records confidence internally and remains intentionally humble about what it knows.

## Privacy

Session data, URL/title metadata, navigation events, and compost items are stored in `chrome.storage.local`. The extension does not collect page text, send browsing data to a server, use an account, or run remote analytics. Local history is bounded to 12 gardens and the compost pile to 80 items. The dashboard provides an explicit delete-all-data action.

## Permissions

The extension uses local storage for gardens and the `tabs` permission for branch-aware recovery. It uses page access to render the mission chip and detect eligible link activations. Chrome-internal, restricted, and other protected pages may not support the content script and degrade gracefully.

## Accessibility and agency

The mission chip, choice sheet, and garden-care dialog use semantic controls, visible focus states, keyboard navigation, Escape handling, focus containment, readable text alternatives, and reduced-motion support. The companion is deliberately compact, habitat-themed, and positioned at the upper-right so it avoids common site branding and navigation areas; it adapts to narrow viewports without becoming a page overlay. Its mission, branch state, and Pause/Resume action have separate hierarchy, deterministic state styling, and an accessible group label. The garden uses a shape-and-text legend rather than color alone, and destructive-looking actions use a calm local dialog instead of a browser-native prompt. Dashboard controls are separated into garden selection and local-data care groups. The extension does not close unrelated tabs. Recovery actions are phrased as choices, not warnings or punishments.

## Living garden and branch care

The garden dashboard renders the deterministic session graph as a living rooted tree with four visual modes: seed, sapling, canopy, and deep. The mission root sits at the base of a centered trunk; child paths grow upward into weighted branch fans, and every visible leaf has a connected parent edge. Neutral paths appear as side trails, long paths use quiet overgrowth, and completed gardens settle into a distinct resting palette. Empty gardens show a small open-trunk sapling rather than an enclosed loop. To keep dense sessions readable, labels yield when a branch lane is crowded while every node remains keyboard-selectable and the selected-path panel provides depth, relationship confidence, parent context, and care actions. **Prune this path** and **Return to compost** change only the local visual state and preserve the historical trail note.

The dashboard tree uses native SVG and CSS transitions only. It does not run a frame loop, use Canvas, download images, or add a rendering dependency. Its horizontal lanes scale to the garden’s actual maximum depth, branch strokes become quieter with depth, and labels yield when a lane becomes crowded while remaining available through node semantics and the selected-path panel. Reduced-motion preferences disable the growth transitions. The New Tab uses only short entrance motion; it has no continuous CSS animation loops and can scroll safely on short viewports so the recovery choices are not clipped.

## History and tab behavior

Returning to a known URL reuses its canonical garden node. If Chrome opens a duplicate tab on a known path, Focus Forest attaches the new tab as an alias instead of creating a deeper branch. Closing one alias does not erase the path while another attached tab remains. Go Home activates the validated origin without closing tracked or unrelated tabs. Composting also preserves the current page; it changes only the local branch state.

The garden dashboard provides **Forget this garden** for removing one selected local session, alongside the explicit delete-all action.

## Tending controls and completion ritual

Open **Tend the forest** from the popup or Chrome’s extension details to choose when the page grows quieter and when the choice sheet appears. The extension enforces a one-branch gap between those moments. Ambient motion can be turned off, and every setting stays local.

Ending a mission opens a small reflection moment with only deterministic facts: pages grown, deepest branch, and saved curiosities. The user can let the garden rest, keep tending, or return to the garden view. No session is graded.

Redirect-like URLs are treated as structural transport when they immediately lead to a final destination. They do not add an extra branch level. Search pages reached directly remain neutral; links clicked from them are ordinary branches.

## Low-memory design

The runtime is dependency-free and uses native HTML, CSS, and SVG. Page scripts receive only a compact active-view object rather than the full garden history. The service worker avoids storage writes for no-op observations, caps sessions, branches, events, compost, aliases, and pending relationship records, canonicalizes URLs, and injects only once into top-level HTTP(S) documents. Ambient visuals are CSS/SVG layers rather than images, video, Canvas loops, or external fonts.

## Security and reliability audit

The service worker treats runtime messages and content-script payloads as untrusted inputs. It rejects malformed message shapes, validates sender-tab metadata and HTTP(S) URLs, ignores synthetic page-dispatched clicks, serializes storage mutations, bounds pending relationships, clears redirect state when tabs are removed, keys target-blank relationships by source tab plus destination, detaches all tab aliases when a path is composted, and revalidates the stored origin tab before Go Home. If the tab ID was reused or the origin moved to another window, it focuses only the validated origin window; otherwise it opens a safe new origin tab without closing anything. The redundant `tabs` permission has been removed. The companion now owns its static CSS inside a closed ShadowRoot; no companion stylesheet is exposed as a web-accessible resource. Dashboard data-bearing lists and detail controls use DOM construction, while popup, New Tab, and dashboard startup failures show local recovery copy instead of remaining blank.

The audit inventory and primary-source comparison are recorded in [`SECURITY_REVIEW_2026-08-15.md`](SECURITY_REVIEW_2026-08-15.md). Run `node test-security.mjs` for static boundary contracts and `node stress-service-worker.mjs` for concurrent navigation, malformed-message, storage-bound, and threshold-ordering stress fixtures. These checks supplement `node test-service-worker.mjs`.

## Development and validation

The source intentionally remains dependency-light and loadable without a build step. The service worker is the source of truth; content scripts render page UI and report navigation signals; New Tab, popup, and dashboard are separate extension pages. Run `node test-service-worker.mjs` for the deterministic mocked-Chrome behavioral suite. The test covers mission origin creation, unrelated-tab exclusion, same-tab depth, new-tab deduplication, external paths, known-page reuse, interruption depth, non-destructive composting, mission history, non-destructive Go Home recovery, malformed messages, collision-safe pending branches, alias detachment, and safe origin navigation. Additional checks cover unsafe URL rejection, invalid identifier rejection, serialized state mutation, bounded storage normalization, rooted tree topology, terminal-leaf rendering, collision-reduced labels, shape-based legend, grouped controls, local confirmation dialog, popup density, closed-shadow companion isolation, no-loop/no-network runtime boundaries, and no-AI references.

This is a polished MVP prototype, not a Chrome Web Store-certified release. The depth-aware redesign was informed by comparison with [History Tree](https://github.com/initialshl/history-tree), [Galaxy Tab History Graph](https://github.com/Katee/galaxy-tab), and [Focus Pilot](https://github.com/Nahid-mahmud555/focus-pilot-pro-official), but no code or dependency was imported. Automated checks pass for syntax, deterministic behavior, depth-mode contracts, focus-preserving branch selection, no-loop/no-network runtime boundaries, no-continuous-animation CSS checks, and no-AI references. Real-browser testing is still required for page-specific rendering, restricted origins, redirects, SPA behavior, multiple windows, keyboard focus, popup sizing, and Chrome profile differences.
