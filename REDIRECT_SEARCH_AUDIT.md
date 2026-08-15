# Redirect and Search Journey Audit

## Current edge cases

| Journey | Desired result |
|---|---|
| Directly opened search page | It becomes the neutral mission root when it is the first ordinary page. |
| Search result clicked in the same tab | A redirect transport chain resolves to one direct branch node. |
| Search result opened in a new tab | The opener relationship and redirect chain resolve to one branch node. |
| Multi-hop redirect | All transport hops remain invisible to branch depth; the final URL creates one node. |
| Redirect URL loaded without a click signal | If it occurs in a tracked tab, treat it as transport after the current node rather than a false external branch. |
| Search pagination or ordinary internal link | It remains an ordinary direct branch because the browser exposed a real link activation. |
| Manual entry of a redirect-shaped URL | It stays neutral unless it follows a tracked current path; no content is interpreted. |
| Campaign parameters (`utm_*`, `gclid`, `fbclid`, `msclkid`) | Remove only known tracking parameters when canonicalizing URLs; preserve meaningful search parameters. |
| Worker suspension between redirect hops | Keep a tiny pending redirect record in local session state so the deterministic relationship survives service-worker sleep. |

## No-AI boundary

The model never reads page text or evaluates search-result relevance. It only uses URL shape, browser tab/opener relationships, explicit link activation, and short-lived local transport state. A redirect-shaped URL is handled as transport because of its observable URL structure, not because of a semantic page judgment.
