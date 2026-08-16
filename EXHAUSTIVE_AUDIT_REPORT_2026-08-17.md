# Focus Forest Exhaustive Security and Reliability Audit

**Date:** 17 August 2026  
**Repository:** [`swapniljoydhar/focus-forest`](https://github.com/swapniljoydhar/focus-forest)  
**Audit worktree:** `/home/ubuntu/focus-forest-exhaustive-audit`  
**Author:** Manus AI

## Executive conclusion

The repository was audited as a complete Manifest V3 Chrome extension rather than as a collection of isolated files. The review covered the service worker, content script, extension pages, shared state and error utilities, manifest, styles, tests, and repository-authored audit documentation. A fresh baseline matrix showed that the published build was loadable and that its existing automated suites passed, but the line-by-line review and targeted reproductions identified several reliability and boundary defects that the original test suite did not cover.

The repaired build now has explicit non-rethrow behavior for asynchronous event listeners, preserves rethrow behavior for recovery wrappers that intentionally attach `.catch()`, rejects malformed canonical URLs, binds persisted extension URLs to the current runtime ID, supplies safe default depth thresholds, hardens Go Home origin validation, protects the popup pause action from a mission-ending race, clears stale dashboard data on render failure, and exercises the sender boundary in the stress harness. The project remains **local-first, deterministic, dependency-free, low-memory, non-blocking, and free of AI, telemetry, remote model calls, and network requests**.

No remaining automated finding demonstrates arbitrary code execution, cross-site scripting through extension-rendered data, destructive browser control, remote data exfiltration, or a bypass of the service-worker sender boundary. The remaining limitations are principally manual Chrome coverage and intentionally broad HTTP(S) host permissions required by the companion-chip product boundary.

## Audit scope and baseline

The audit began from the repository’s published `main` state at commit `0f30a074cb2600becf47efcfb5e8c199a8012ef8` and used an isolated worktree. The complete baseline inventory was recorded in [`EXHAUSTIVE_INVENTORY_2026-08-17.md`](./EXHAUSTIVE_INVENTORY_2026-08-17.md). Every tracked source, configuration, test, documentation, and asset contract in that baseline surface was read, including the repository’s own comparison and planning artifacts.

The extension’s security model was evaluated against Chrome’s primary guidance. Chrome explicitly states that content scripts are less trustworthy than the extension service worker and that messages received from content scripts must be validated and sanitized before privileged actions are taken [1]. Chrome also requires service-worker event listeners to be registered synchronously at global scope [2]. Focus Forest’s listeners are globally registered, and the service worker validates sender identity, message schemas, URL schemes, identifiers, and extension-page boundaries before privileged operations.

| Baseline area | Result |
|---|---|
| Manifest V3 structure and permission surface | Valid; `storage` and `webNavigation` only, with HTTP(S) host permissions intentionally required for the companion |
| Source and configuration inventory | Complete baseline inventory recorded; no hidden source surface identified |
| JavaScript syntax | Green before and after repairs |
| Existing behavioral suites | Green before repairs; re-run green after repairs |
| Real Chromium unpacked-extension smoke | Green after repairs; new-tab override rendered Focus Forest content |
| Local-first policy | Preserved; no runtime network or telemetry path found |

## Findings reproduced during the audit

### 1. Asynchronous event wrappers rethrew into unhandled promise rejections — high reliability risk

`shared/error-tracing.js` originally logged an error and unconditionally rethrew it from `wrapWithErrorBoundary()`. That behavior is appropriate for a recovery helper when the caller immediately attaches `.catch()`, but it is unsafe when the returned async function is registered directly as a DOM or browser event listener. Event dispatch does not consume the returned Promise, so a rejected handler becomes an unhandled rejection after the error has already been logged.

This was reproduced with a minimal Node probe that invoked the wrapper like a DOM event callback and listened for `unhandledRejection`. The failing regression test captured `event-boundary-failure`, proving that the defect was observable rather than hypothetical. Chrome’s messaging guidance distinguishes asynchronous response handling from ordinary event callbacks; the repair therefore keeps explicit recovery semantics separate from listener semantics [1].

### 2. The stress harness bypassed the production sender boundary — test-security blind spot

The production service worker rejects messages when `sender.id !== chrome.runtime.id`. The original stress mock omitted `chrome.runtime.id` and also defaulted to a sender without `id`. Both values were therefore `undefined`, causing the guard to evaluate as false and allowing the stress suite to pass without exercising the real boundary.

This was repaired by adding a stable mock runtime ID and realistic sender IDs. The stress suite now sends `CLEAR_DATA` from an untrusted extension sender and verifies that the stored state is unchanged before continuing with its 500-navigation, 300-settings-update, malformed-message, and bound checks.

### 3. Canonical URL fallback returned malformed raw strings — state-boundary risk

`canonicalUrl()` originally returned a truncated raw string when URL parsing failed. Although current privileged paths generally called `safeHttpUrl()` first, the helper’s name and export made unsafe reuse easy. A malformed value could therefore survive canonicalization if a future caller used the helper directly.

The repair makes canonicalization return `null` for malformed values and for non-HTTP(S) schemes. `safeHttpUrl()` continues to be the public HTTP(S) gate and still removes tracking parameters and fragments. Direct malformed, `javascript:`, and normalized HTTP(S) cases are now unit-tested.

### 4. Persisted extension URLs were broader than necessary — navigation-boundary risk

`safeSessionUrl()` and the service worker’s origin/navigation helpers originally accepted any syntactically valid `chrome-extension://<id>/` URL. Extension storage is scoped, but the persisted value could still cause Go Home to target an unrelated extension page if poisoned state or a future message path introduced such a value.

The repaired shared helper accepts `chrome://newtab` placeholders, HTTP(S) URLs, and only the current extension’s own `chrome-extension://<runtime-id>/...` URLs. Service-worker `safeOriginUrl()` and `safeNavigationUrl()` now reuse that helper instead of maintaining a broader duplicate regex. Foreign extension IDs, missing paths, dangerous schemes, and malformed values are rejected by tests.

### 5. `getDepthState()` had an unsafe default binding — latent runtime defect

The function signature used `thresholds = THRESHOLDS`, but the actual callers generally supplied an explicit object and the original tests never called the default path. The repaired implementation uses `DEFAULT_SETTINGS` as its default threshold object, preserving the same depth values while eliminating the latent undeclared-default failure mode. Both explicit and default threshold paths are now tested.

### 6. Popup pause action could dereference a mission that ended between reads — race defect

The popup fetched a snapshot and immediately read `snap.session.interventionPaused`. If another context ended the mission after the popup rendered but before the click handler’s snapshot completed, `snap.session` could be null and the async listener would throw. The handler now returns when no session exists and awaits its recovery render, while the listener itself uses swallow mode.

### 7. Dashboard recovery could leave stale garden data visible — correctness defect

When dashboard rendering failed, the original recovery path updated only the mission and storyline copy. The previous SVG tree, event history, compost entries, and selected detail could remain visible, creating a misleading representation of local state. The recovery path now replaces the session selector, renders the empty garden state, clears event and compost content, clears branch detail, hides the detail region, and marks the body with an explicit error state.

### 8. Fire-and-forget content-script messages created another unhandled rejection path

The document click listener sent `LINK_CLICK` without awaiting it. If the service worker was unavailable during extension shutdown, reload, or a transient messaging failure, the returned rejection was not connected to the listener boundary. The listener now awaits the message inside a swallow-mode wrapper. Content-script navigation, visibility, and startup helper wrappers were also made explicit about whether they are recovery or event boundaries.

## Repairs implemented

The error boundary now derives a `shouldRethrow` decision from `rethrow !== false && !swallow`. Recovery wrappers retain the historical default rethrow behavior, while DOM, content-script, and browser-event listeners pass `swallow: true`, log the error, and terminate cleanly. A regression suite verifies all three contracts: swallow mode prevents an unhandled rejection, explicit `rethrow: true` rethrows, and the default mode still rethrows.

All direct event-listener registrations in popup, New Tab, dashboard, settings, the content companion, and navigation-related service-worker listeners were reviewed and converted to explicit swallow mode. This includes click, submit, input, change, keydown, pointer-adjacent navigation, SPA history, tab-update, tab-removal, and installation boundaries. Explicit render/load recovery helpers continue to use `.catch()` or enclosing `try/catch` blocks.

The state layer now has a strict malformed URL contract, a current-runtime extension-origin contract, a safe default depth threshold, and direct cache tests for initial reads, external `storage.onChanged` invalidation, and the `ownWriteInFlight` guard. Chrome documents `storage.onChanged` as the supported change signal and describes storage as asynchronous and quota-limited [3]; the new tests exercise the local cache contract rather than assuming synchronous storage behavior.

The dashboard and popup repairs are intentionally non-punitive. A failed render does not delete data, and a missing session does not block the user or close a tab. The service worker retains bounded sessions, nodes, events, compost, pending redirects, SPA deduplication, and mutation behavior.

## Security and policy review

The repaired source continues to satisfy the product’s security constraints. The companion uses a closed ShadowRoot and inlined CSS, does not expose a web-accessible stylesheet, and rejects synthetic clicks through `event.isTrusted`. The dashboard builds SVG and HTML using element construction, attributes, and `textContent`; dynamic data is not assigned through `innerHTML`, `outerHTML`, or `insertAdjacentHTML`. No `eval`, `new Function`, remote script, fetch, XHR, WebSocket, telemetry, or model call was found in runtime source. No `window.close`, `chrome.tabs.remove`, `chrome.windows.remove`, or tab-discard operation is present.

The manifest requests only `storage` and `webNavigation` as API permissions and does not request the redundant `tabs` permission. The HTTP(S) host permission remains broad because the product’s stated purpose is to observe ordinary browsing navigation and render a companion on ordinary pages. Chrome’s content-script documentation confirms that static content scripts can be scoped with match patterns, that `document_idle` is the preferred run point when possible, and that `all_frames: false` limits injection to top-level pages [4]. Focus Forest uses those constraints and does not inject into Chrome-internal or non-HTTP(S) pages.

| Boundary | Hardened behavior |
|---|---|
| Sender identity | Rejects messages whose sender ID does not equal the extension runtime ID |
| Extension-page privilege | Full snapshots and destructive management operations require an extension-page sender URL from the same runtime ID |
| Message shape | Per-message schema validation rejects unknown or malformed structures |
| Navigation URLs | HTTP(S) canonicalization plus current-extension/new-tab allowlist |
| Render sinks | DOM construction, SVG namespace APIs, and `textContent`; no HTML interpretation |
| Browser control | No window/tab removal or browser-closing API |
| Storage | Local-only `chrome.storage.local`, bounded state, cache invalidation on external writes |
| Animation | Bounded CSS/timer ritual; no continuous animation loop and reduced-motion support |

## Verification evidence

The following validation matrix was run after the final source repairs. The error-tracing suite intentionally prints structured traces while proving that the event failure is swallowed and the recovery failures rethrow; those printed traces are expected test evidence, not test failures.

| Command or check | Result |
|---|---|
| `node test-error-tracing.mjs` | Passed; swallow, explicit rethrow, and default rethrow contracts verified |
| `node test-runtime-contracts.mjs` | Passed |
| `node test-state.mjs` | Passed; 14 tests covering URL, state, bounds, defaults, and cache behavior |
| `node test-tree-layout.mjs` | Passed |
| `node test-security.mjs` | Passed; static security contracts include swallow mode and URL boundaries |
| `node test-service-worker.mjs` | Passed; navigation, redirect, tab-reuse, stale-origin, and multi-window regressions remained green |
| `node stress-service-worker.mjs` | Passed; 96-node and 72-event bounds held under concurrent traffic, and untrusted clear-data was rejected |
| `node --check` over every JavaScript file | Passed |
| `git diff --check` | Passed before publication |
| Chromium headless unpacked-extension new-tab smoke | Passed; actual `chrome://newtab/` override contained Focus Forest content |
| Source policy scan | Passed; no runtime AI, network, telemetry, unsafe-DOM, or destructive-browser pattern found |

## Documentation drift and historical notes

Several repository-authored planning and comparison documents describe intermediate local-fork states rather than the exact current tracked tree. For example, the comparison plan claims files and test suites that are not present in the baseline inventory, and the 15 August security review correctly labels an earlier Google redirect as historical behavior that had already been removed. These documents were treated as historical evidence, not as executable authority. The inventory and current source were used as the authoritative audit surface.

This distinction matters because a repository can have green tests while its planning documents describe an older or broader implementation. The audit report, current regression tests, and published source should be used for current behavior; older reports should be retained only as dated engineering history.

## Remaining manual-coverage gaps

Automated tests cannot fully substitute for real Chrome interaction. The following scenarios remain recommended manual or browser-lab checks, but none is an unresolved confirmed vulnerability in the repaired source.

| Scenario | Why manual coverage remains useful |
|---|---|
| Chrome-internal, restricted, PDF, and extension pages | Content scripts are intentionally unavailable or differently governed there; graceful degradation should be visually confirmed |
| Real SPA journeys on YouTube, Notion, Gmail, GitHub, and Google Workspace | `webNavigation` events, page URL changes, tab lifecycle, and content fallback polling should be observed together |
| Multiple windows and restart/reload sequences | Window IDs, origin-tab reuse, service-worker restart, and stale cached state need end-to-end confirmation |
| Incognito and split-incognito profiles | Chrome storage and extension context behavior should be verified under the intended installation policy |
| Keyboard focus and screen-reader semantics | Popup, New Tab, dashboard dialogs, SVG node controls, and companion choice sheet need real assistive-technology checks |
| Reduced motion, zoom, high contrast, narrow viewports, and long mission text | Visual density and focus order should be verified across user display settings |
| Storage quota and interrupted writes | Chrome’s real quota/error behavior should be exercised with a controlled profile; state bounds reduce but do not eliminate quota failure risk |
| Extension update and disable/re-enable lifecycle | `storage.local` persistence, cache reset, and service-worker restart behavior should be checked during a real update |

## Final assessment

The repository now has a materially stronger reliability and security posture than the audited baseline. The most consequential defect—async event wrappers producing unhandled promise rejections—was reproduced, fixed across all relevant contexts, and regression-tested. The sender-boundary blind spot was removed from the stress harness, and the state/navigation helpers now have explicit, testable contracts rather than permissive fallbacks.

The remaining product trade-offs are intentional: broad HTTP(S) host permissions are required for an always-available browsing companion, and Chrome-restricted pages cannot host the companion. The extension does not block navigation, punish exploration, destroy branches irreversibly by default, interpret page content, or send data off device. It remains a deterministic garden metaphor implemented with bounded local state and native browser primitives.

## References

[1]: https://developer.chrome.com/docs/extensions/develop/concepts/messaging "Chrome for Developers — Message passing"

[2]: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events "Chrome for Developers — Events in service workers"

[3]: https://developer.chrome.com/docs/extensions/reference/api/storage "Chrome for Developers — chrome.storage API"

[4]: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts "Chrome for Developers — Content scripts"
