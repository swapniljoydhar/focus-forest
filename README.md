# Focus Forest

Focus Forest is a calm, local-first Chrome extension that helps you return to intention when useful research gradually becomes wandering. It contains **no generative AI, no summarizer, no remote model, no embeddings, and no page-content classifier**. Its intelligence is a transparent branch model built only from browser navigation signals. It is not a domain blocker and does not judge whether a page is relevant. It observes how pages are reached, keeps the current mission visible, and offers a gentle moment of choice when a tracked branch becomes unusually deep.

## The experience

Open a new tab and plant a mission such as "Compare laptops for university." The mission chip stays quietly available on supported pages. Related links grow healthy branches. At a deeper branch, the page becomes subtly quieter and the chip says that the branch is getting long. At the interruption threshold, the extension offers three equal choices: **Return to my mission**, **Save this for later**, or **Start a new mission**.

A garden view preserves completed missions locally. It shows what grew from the intention, where the path changed, and which curiosities were composted for later. The garden is a reflection, not a productivity score.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `focus-forest` directory.
5. Open a new tab and plant a mission.

## File structure

```text
focus-forest/
  manifest.json
  background/service-worker.js
  content/content.js
  shared/state.js
  shared/error-tracing.js
  popup/
  newtab/
  dashboard/
  settings/
  icons/
```

## Navigation semantics

The origin is the first ordinary webpage after a mission is planted. A link activated in a tracked page creates one branch level. A new tab opened from a tracked page waits until the destination loads, then attaches exactly once using the opener relationship or a short-lived pending-link relationship. Unrelated tabs remain outside the tree.

Manually entered URLs, bookmarks, and other unlinked navigations are recorded as neutral external paths when they occur inside a tracked tab; they do not automatically become deeper distractions. Returning to a known URL reuses its existing node instead of creating artificial depth. Chrome cannot expose every semantic relationship, so the extension records confidence internally and remains intentionally humble about what it knows.

## Privacy

Session data, URL/title metadata, navigation events, and compost items are stored in `chrome.storage.local`. The extension does not collect page text, send browsing data to a server, use an account, or run remote analytics. Local history is bounded to 12 gardens and the compost pile to 80 items. The dashboard provides an explicit delete-all-data action.

## Permissions

The extension uses local storage for gardens and does not request the redundant `tabs` permission. It uses declared HTTP(S) page access to render the mission chip and detect eligible link activations, plus `webNavigation` to support SPA history tracking on YouTube, Notion, Gmail, GitHub, and similar sites. Chrome-internal, restricted, and other protected pages may not support the content script and degrade gracefully.

## Accessibility and agency

The mission chip, choice sheet, and garden-care dialog use semantic controls, visible focus states, keyboard navigation, Escape handling, focus containment, readable text alternatives, and reduced-motion support. The companion is deliberately compact, habitat-themed, and positioned at the upper-right so it avoids common site branding and navigation areas; it adapts to narrow viewports without becoming a page overlay. When a deeper branch is first observed, a tiny trunk-and-leaf mark grows inside the unchanged chip, flickers briefly, and then settles into the ordinary notification copy. This bounded ritual is skipped under reduced-motion preferences and never blocks the page. Its mission, branch state, and Pause/Resume action have separate hierarchy, deterministic state styling, and an accessible group label. The garden uses a shape-and-text legend rather than color alone, and destructive-looking actions use a calm local dialog instead of a browser-native prompt. Dashboard controls are separated into garden selection and local-data care groups. The extension does not close unrelated tabs. Recovery actions are phrased as choices, not warnings or punishments.

## Living garden and branch care

The garden dashboard renders the deterministic session graph as a living rooted tree with four visual modes: `seed`, `sapling`, `canopy`, and `deep`. The mission root sits at the base of a centered trunk; first-level paths open into a sparse horizontal limb junction, deeper paths rise as side branches, and every terminal node becomes a connected leaf tip. In the sparse seed and sapling modes, the illustration includes a substantial organic bole, a planted root flare, unequal curved shoots, and two visible leaf-buds even before the browsing canopy is dense. Neutral paths appear as side trails, long paths use quiet overgrowth, and completed gardens settle into a distinct resting palette. Empty gardens show a small open-trunk sapling rather than an enclosed loop. To keep dense sessions readable, labels yield when a branch lane is crowded while every node remains keyboard-selectable and the selected-path panel provides depth, relationship confidence, parent context, and care actions. **Prune this path** and **Return to compost** change only the local visual state and preserve the historical trail note.

The dashboard tree uses native SVG DOM construction and CSS transitions only. It does not run a frame loop, use Canvas, download images, or add a rendering dependency. Branches are rendered as tapered filled paths (wide at the parent, narrow at the tip) with bark-like coloring rather than stroked lines, terminal nodes become leaf clusters, and the mission root is a planted sprout. Selecting a node highlights the full path from root to that leaf. A centered planted root feeds a visible bole and trunk fork; primary limbs open across a stable branch level, secondary branches rise with depth, and terminal nodes become attached leaves. Branch strokes taper and quiet with depth, while saved and pruned paths remain connected through dash and opacity treatment. Labels yield when neighboring branches are crowded and the selected-path panel provides the full context. Reduced-motion preferences disable the growth transitions. The New Tab uses only short entrance motion; it has no continuous CSS animation loops and can scroll safely on short viewports so the recovery choices are not clipped.

## History and tab behavior

Returning to a known URL reuses its canonical garden node. If Chrome opens a duplicate tab on a known path, Focus Forest attaches the new tab as an alias instead of creating a deeper branch. Closing one alias does not erase the path while another attached tab remains. Go Home activates the validated origin without closing tracked or unrelated tabs. Composting also preserves the current page; it changes only the local branch state.

The garden dashboard provides **Forget this garden** for removing one selected local session, alongside the explicit delete-all action.

## Tending controls and completion ritual

Open **Tend the forest** from the popup or Chrome's extension details to choose when the page grows quieter and when the choice sheet appears. The extension enforces a one-branch gap between those moments. Ambient motion can be turned off, and every setting stays local.

Ending a mission opens a small reflection moment with only deterministic facts: pages grown, deepest branch, and saved curiosities. The user can let the garden rest, keep tending, or return to the garden view. No session is graded.

Redirect-like URLs are treated as structural transport when they immediately lead to a final destination. They do not add an extra branch level. Search pages reached directly remain neutral; links clicked from them are ordinary branches.

## Low-memory design

The runtime is dependency-free and uses native HTML, CSS, and SVG. Page scripts receive only a compact active-view object rather than the full garden history. The service worker caches normalized state in memory to reduce storage round-trips, avoids storage writes for no-op observations, caps sessions, branches, events, compost, aliases, and pending relationship records, canonicalizes URLs, and injects only once into top-level HTTP(S) documents. Ambient visuals are CSS/SVG layers rather than images, video, Canvas loops, or external fonts.

## Security and reliability

The service worker validates sender identity, treats runtime messages and content-script payloads as untrusted inputs, and rejects malformed message shapes. It validates sender-tab metadata and HTTP(S) URLs, ignores synthetic page-dispatched clicks, serializes storage mutations, bounds pending relationships and SPA deduplication, clears redirect state when tabs are removed, keys target-blank relationships by source tab plus destination, detaches all tab aliases when a path is composted, excludes pruned/composted paths from active reuse, and revalidates the stored origin tab before Go Home. If the tab ID was reused or the origin moved to another window, it focuses only the validated origin window; otherwise it opens a safe new origin tab without closing anything. The companion renders inside a closed `ShadowRoot` and uses DOM-safe construction for all companion markup and dynamic content; no companion stylesheet is exposed as a web-accessible resource. Content scripts receive only the compact active view, while full garden snapshots, settings writes, session deletion, pruning, compost deletion, and clear-data operations require an extension-page sender. The companion host element uses `pointer-events: none` so the page behind it (text, links, scroll) stays fully interactive; only the chip and the choice card opt back in with `pointer-events: auto`. The chip is draggable via a pointer-events handle and remembers its position per tab. The choice prompt appears as a non-blocking corner card rather than a full-screen modal, so it never hides page content. Dashboard data-bearing lists and detail controls use DOM construction, while popup, New Tab, and dashboard startup failures show local recovery copy instead of remaining blank.

For the original security review, see [`SECURITY_REVIEW_2026-08-15.md`](SECURITY_REVIEW_2026-08-15.md) and [`SECURITY.md`](SECURITY.md). For the modified-fork audit and repair record, see [`AUDIT_REPORT_2026-08-16.md`](AUDIT_REPORT_2026-08-16.md).

The security review and primary-source comparison are recorded in [`SECURITY_REVIEW_2026-08-15.md`](SECURITY_REVIEW_2026-08-15.md). Automated checks include ES-module syntax validation, error-boundary rejection contracts, runtime/message contracts, state normalization and storage-failure behavior, deterministic tree geometry, sender-boundary and prototype-message checks, service-worker behavior, bounded stress, repository-integrity and local-asset checks, no-loop/no-network runtime boundaries, no-continuous-animation CSS checks, and no-AI references. The repaired worktree also includes `test-error-tracing.mjs`, `test-runtime-contracts.mjs`, `test-state.mjs`, `test-tree-layout.mjs`, `test-security.mjs`, `test-service-worker.mjs`, `stress-service-worker.mjs`, and `test-repository-integrity.mjs`. Real-browser testing is still required for page-specific rendering, restricted origins, redirects, SPA behavior, multiple windows, keyboard focus, popup sizing, and Chrome profile differences.

## Development and validation

The source intentionally remains dependency-light and loadable without a build step. The service worker is the source of truth; content scripts render page UI and report navigation signals; New Tab, popup, and dashboard are separate extension pages. This is a polished MVP prototype, not a Chrome Web Store-certified release. The depth-aware redesign was informed by comparison with [History Tree](https://github.com/initialshl/history-tree), [Galaxy Tab History Graph](https://github.com/Katee/galaxy-tab-history-graph), and [Focus Pilot](https://github.com/Nahid-mahmud555/focus-pilot-pro-official), but no code or dependency was imported.
