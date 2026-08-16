# Focus Forest Remote Audit Findings — 2026-08-16

## Scope

Audited `origin/main` at commit `beb4eddd6b60342e6df5a5ecb73cbe23675b23b2` in an isolated worktree and compared it with the last verified local build at `9820a0a4821ba2a0b1e83ffc42f25f2e9c23b5d5`.

## First live-browser reproduction

A temporary local fixture loaded the modified `content/content.js` with a mocked Chrome runtime. The companion rendered partially, but the first startup error was:

> `ReferenceError: send is not defined`

The error originated in `loadSettings()` at `content/content.js:89`, which calls `send('GET_SNAPSHOT')`. The modified content script contains multiple calls to `send(...)` but no `send` helper definition. Because the startup call is wrapped, the failure is logged and the script continues into a partially initialized state; later actions can fail independently.

## Confirmed static symbol mismatches

The same content script contains additional unresolved or mismatched references:

- `update()` calls `showChoiceCard(depth)`, but only `showChoiceSheet(depth)` is defined.
- `showChoiceSheet()` references `backdrop` and `sheetCopy`, but the actual elements are named `choiceCard` and `choiceCopy`.
- `onNavigation()` references `backdrop`, but the actual card is `choiceCard`.
- The source uses `rootEl.innerHTML` for the complete companion markup, contrary to the README/security claim that the companion uses DOM-safe construction throughout. The string is static today, so this is primarily a maintenance/security-drift finding rather than the first live failure.

## Reproduction state

The temporary fixture showed the page link, the companion card, and the Pause button, but the console contained the `send is not defined` error before the settings and refresh flow could complete normally. The fixture is outside the repository and is not intended for packaging.

## Follow-up browser fixture

A second fixture run supplied a temporary `window.send` bridge to bypass the missing helper. It reached four mocked message calls and created the closed shadow host (`#focus-forest-root`), but the interruption card did not become visible in the public DOM. The closed shadow root is correctly inaccessible from the page (`shadowRoot === null`). The initial live failure remains the missing production helper; the interruption path also contains statically confirmed name mismatches that require direct source repair and a real extension-context test.

## Primary-source checks

Chrome’s current documentation confirms that statically matched content scripts run in the isolated world at `document_idle`, that runtime messages from content scripts must be treated as less trustworthy and validated, and that `web_accessible_resources` should remain empty unless a resource must be exposed to web pages. The modified manifest is consistent with the intended top-level HTTP(S) companion scope and does not expose resources, but the runtime regressions violate the message/rendering reliability claims.

The broad `host_permissions` and `content_scripts.matches` scope remains an intentional product boundary for an all-web companion. It should be documented and reviewed as a user-facing permission trade-off, not silently replaced with `activeTab`, because that would change the core experience.

Sources consulted:

- https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
- https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources

## Repaired live-browser result

After adding the runtime helper, correcting the choice-card references, and replacing the companion markup sink with DOM construction, the same browser fixture displayed the mission chip and the interruption choice card. The console contained no errors. This confirms the first startup failure was a real runtime blocker rather than only a static naming concern.

## Real Chromium smoke test

Chromium 151 loaded the unpacked Manifest V3 worktree successfully with exit status 0. The screenshot showed the repaired companion chip at the top right and the interruption choice card at the bottom right. This confirms manifest loading and content-script injection in a real Chromium process, beyond the Node mocks. The fixture’s low-contrast styling is a separate visual polish concern; the functional surfaces are present and interactive.
