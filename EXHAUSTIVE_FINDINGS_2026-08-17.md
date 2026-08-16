
# Exhaustive audit findings — 2026-08-17

## Current baseline

The current `origin/main` commit is `0f30a074cb2600becf47efcfb5e8c199a8012ef8`. The repository is public (`isPrivate: false`). A fresh syntax, runtime-contract, state, tree-layout, security, service-worker, stress, and Chromium unpacked-extension smoke matrix passed before new edits. This confirms the prior published build is currently loadable and functionally covered by its existing tests; it does not prove the absence of remaining cross-page, accessibility, state-cache, or manual-Chrome defects.

## Confirmed remaining issue reproduced

`shared/error-tracing.js` defines `wrapWithErrorBoundary()` that logs and rethrows every caught error. A minimal probe importing the current repository wrapper and invoking it like a DOM event listener reproduced an `unhandledRejection` with `probe-event-failure`. Many page event listeners pass this wrapper directly to `addEventListener`, so an asynchronous handler failure can still become an unhandled promise rejection after logging. Recovery wrappers that intentionally call `.catch()` need to retain rethrow behavior; event-listener wrappers need an explicit non-rethrow/swallow mode or a terminal catch. This is a reliability defect, not a theoretical style concern.

## Coverage blind spot

`stress-service-worker.mjs` mocks `chrome.runtime` without `runtime.id` and defaults to a sender without `id`. Its check `sender.id !== chrome.runtime.id` therefore evaluates as `undefined !== undefined` → false, bypassing the production sender-identity guard. The stress test can pass while sender-boundary regressions exist. The stress mock must use a stable runtime ID and realistic sender IDs, then add a content-sender negative case.

## Shared-state audit gaps

`shared/state.js` exports `canonicalUrl()` with a raw truncated-string fallback on parse failure. Current privileged navigation paths use `safeHttpUrl()`, so no exploit is demonstrated, but the API naming makes unsafe reuse easy. `safeSessionUrl()` accepts any syntactically matching `chrome-extension://<id>/` URL for persisted origins/nodes; current storage is extension-scoped and current navigation checks are conservative, but this should be tested and narrowed where possible. `test-state.mjs` does not cover canonicalization directly, safe-session URL acceptance/rejection, or cache/load/save/onChanged behavior.

## Dashboard and popup recovery audit gaps

`dashboard/app.js` and `popup/app.js` use `renderSafely()` recovery wrappers, but many async DOM event listeners receive the rethrowing `wrapWithErrorBoundary()` directly. Popup pause reads `snap.session.interventionPaused` without a null guard after a separate render, so a mission ending between render and click can throw. Dashboard render failure updates mission/storyline copy but does not clear stale tree/events/compost content, so an error can leave misleading old data visible. These need focused reproductions and tests before changing implementation.

## Primary Chrome guidance consulted

Chrome’s Message Passing documentation states that content scripts are less trustworthy than the extension service worker, messages from content scripts should be validated and sanitized, data sent to content scripts may leak to the page, and privileged action scope should be limited. It documents callback responses with `return true` for asynchronous `sendResponse`; Promise-returning message listeners are only broadly available from Chrome 148 and rolling out, so the current callback-plus-`return true` pattern is the compatibility-safe choice.

Chrome’s Content Scripts documentation confirms static scripts run in an isolated world, `document_idle` is preferred when possible, `all_frames: false` limits injection to the top frame, and exposed extension resources must be declared as web-accessible resources. Chrome’s service-worker events documentation requires event listeners to be registered at global scope synchronously and notes that `tabs.onUpdated` fires on every tab navigation. Chrome’s storage documentation confirms `chrome.storage.local` is asynchronous, quota-limited, available to extension contexts, and that `storage.onChanged` is the supported cache-invalidation signal.

Sources:

- https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events
- https://developer.chrome.com/docs/extensions/reference/api/storage
