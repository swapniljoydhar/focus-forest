# Focus Forest — Security and Reliability Audit

## Scope

This audit covers the browser-closing report, privileged tab operations, message boundaries, URL handling, local storage normalization, mutation concurrency, rendering sinks, and the rooted-tree renderer. It does not claim a complete Chrome-process security certification; the findings below are limited to the inspected source and fresh automated checks.

## Confirmed findings and remediations

| Severity | Finding | Remediation | Evidence |
|---|---|---|---|
| High user-impact | Resume called `window.close()` after `GO_HOME`. | Removed the direct window-close call. Resume now requests a safe return-home action and leaves the current extension page open. | Static contract: no `window.close` in New Tab; syntax and behavior tests pass. |
| High user-impact | `GO_HOME` removed every tracked tab except the origin tab, and could remove all tracked tabs when the origin was missing or stale. | Go Home no longer removes tabs. It activates a validated origin tab or creates a validated return page only when necessary. | Regression asserts no `tabs.remove` action and preserves origin activation. |
| High user-impact | Compost automatically removed the current page tab. | Compost now records local curiosity state without closing the page. | Regression asserts compost creates no tab-removal action. |
| High integrity | State mutations could overlap and overwrite each other because each mutation loaded and saved independently. | Added a serialized mutation queue while keeping the event-driven, bounded architecture. | Concurrent settings update regression passes and threshold ordering remains valid. |
| High integrity | Navigation boundaries accepted any `URL` scheme through the permissive canonicalizer. | Added strict HTTP(S) validation at observation, link, and compost boundaries; unsafe `javascript:` and `data:` URLs are rejected. | Unsafe URL regression passes with no node, event, or compost mutation. |
| Medium integrity | Persisted local storage accepted broad session/node/event/compost shapes and could preserve unsafe URLs or malformed relationships. | Added bounded field-level normalization, URL filtering, state/confidence allowlists, safe parent IDs, bounded tab IDs, and safe event fields. | Syntax and behavioral suite pass against normal and malformed request paths. |
| Medium security | External compost links used `target="_blank"` with only `noreferrer`. | Added explicit `noopener noreferrer` and render only normalized HTTP(S) URLs. | Static rendering contract passes. |
| Medium integrity | Message handlers accepted loosely typed identifiers, reasons, settings, and tab-originated payloads. | Added strict ID, reason, record, boolean, and sender-tab checks before mutation. | Invalid-identifier and boundary tests pass without state changes. |
| High user-impact | A removed origin tab could leave a stale tab ID in session state; Chrome tab-ID reuse could make Go Home activate an unrelated tab. | `onRemoved` now clears the session origin tab ID before Go Home can act. | Stale-origin regression passes with no update or create action. |
| Medium visual semantics | Every non-root node was rendered as an ellipse, so intermediate branch junctions looked like floating leaves. | Intermediate nodes now render as connected junction buds; terminal nodes alone render as leaf shapes derived from the actual tree topology. | Tree contract checks pass for `children`, `junction-mark`, and `terminal-leaf`. |

## Unproven or environment-dependent items

The source contains no `chrome.windows.remove` call and no browser-exit API. The original report that the whole browser closed is therefore not proven as a process-level shutdown. The most credible previous mechanisms were mass tab removal, a stale origin tab ID, and `window.close()`; all three paths are now removed or guarded.

Real Chrome testing is still required to verify Chrome’s exact behavior for extension-page navigation, stale tab IDs, multiple windows, profile-specific tab ownership, restricted pages, and popup focus. The automated harness proves intended tab actions in a mocked API; it cannot prove Chrome’s window manager behavior.

## Remaining manual acceptance matrix

| Scenario | Expected result |
|---|---|
| Resume with valid origin tab | Origin tab becomes active; no tab or window closes. |
| Resume with stale/missing origin | A validated origin page may be created; unrelated tabs remain open. |
| Compost current page | Page remains open; branch is saved locally and marked composted. |
| Go Home with unrelated tabs | Only the valid origin is activated; unrelated tabs remain untouched. |
| Malformed `javascript:` or `data:` input | No navigation node, event, compost item, or external link is created. |
| Root-only garden | A centered trunk, root, and attached young leaves read as one sapling. |
| Deep garden | Main limbs, connected junction buds, terminal leaves, and bounded labels remain inside the SVG. |
| Restricted page | Companion is absent or degrades without an exception. |
