# Focus Forest — Redirect and Search-Journey Refinement

## Deterministic journey model

Focus Forest now models redirect and search journeys using only browser-observable structure. It does not read page text, use AI, classify results, or infer semantic relevance.

| Navigation pattern | Deterministic handling |
|---|---|
| First ordinary page is a search page | It is the neutral root of the mission. |
| A link is clicked from a search page | It is a normal direct branch. |
| Link enters `/url`, `/redirect`, `/out`, `/away`, or `/click` transport | The transport is held as a short-lived pending relationship. |
| Multiple transport hops occur | They reuse the same parent relationship; no extra depth is added. |
| Final destination loads | Exactly one direct branch node is created. |
| New tab enters a redirect transport | The opener/pending-link relationship becomes the parent after transport resolves. |
| A known final URL returns | The existing node is reused and pending transport state is cleared. |
| Campaign identifier appears in a URL | Known tracking parameters are removed during local canonicalization. |

## Memory and resilience

Pending redirect state is limited to four entries per active session and expires after 15 seconds. Unlike the earlier in-memory-only approach, it is stored in the bounded local session state, so a service-worker suspension between redirect hops does not lose the relationship. It is removed when the final destination resolves.

## Regression coverage

The deterministic suite now verifies direct roots, unrelated tabs, same-tab depth, new-tab inheritance, one-hop redirect collapse, multi-hop redirect collapse, cleared pending redirect state, direct search roots, external paths, known-page reuse, settings thresholds, completion history, and Go Home recovery.

## Validation and package

The final pass passed JavaScript syntax checks, the behavioral suite, Manifest V3 validation, settings-page checks, and the no-AI/no-network runtime scan.

Archive: `focus-forest-journeys.zip`

SHA-256:

```text
470517c85524650bdca30c1f605a2c80a1bf58bc29ef3d993bf59a897b4e3c98
```

## Honest boundary

Redirect providers differ widely, and browser navigation events do not expose every underlying network hop. The implementation intentionally recognizes only transparent URL-shape and timing patterns. Real Chrome testing remains needed for providers with custom redirects, SPA route changes, and enterprise browser constraints.
