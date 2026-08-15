# Focus Forest test report

## Automated checks passed

The Manifest V3 JSON parsed successfully. All JavaScript files passed Node syntax checking. Required extension entry files exist for the background service worker, content script, New Tab page, popup, and dashboard.

A deterministic mocked-Chrome behavioral harness passed the following cases:

| Case | Result |
|---|---|
| First ordinary page becomes depth-0 origin after planting a mission | Passed |
| Unrelated browser tab is ignored | Passed |
| Same-tab link chain increments depth one branch at a time | Passed |
| Five-link chain reaches interruption depth | Passed |
| Depth 5 node receives interrupted state | Passed |
| Compost saves one item | Passed |
| Compost closes the current tab through the tabs API | Passed |
| New-tab link inherits source depth | Passed |
| Go Home closes tracked branch tab | Passed |
| Go Home activates the origin tab | Passed |

## Manual Chrome test still required

The sandbox test does not launch a real installed Chrome extension. Before treating this as production-ready, load the folder through `chrome://extensions` and manually verify New Tab override behavior, content-script rendering on representative websites, desaturation appearance, keyboard focus in the modal, popup interactions, restricted pages, redirects, and service-worker reload persistence.

The implementation should be considered a validated MVP prototype, not a fully browser-certified release. Navigation depth remains an approximation for SPAs, redirects, search engines, address-bar navigation, and pages where content scripts cannot run.
