# Focus Forest — History, Tab Alias, and Garden Maintenance Refinement

## Deterministic history model

Focus Forest now treats a canonical URL as one garden path even when Chrome exposes it through browser history or a duplicated tab. Each node can hold a small list of attached tab IDs. A duplicate tab joins the known node rather than creating a deeper branch. Closing one duplicate detaches only that alias; the node stays alive until its last attached tab closes.

| Situation | Result |
|---|---|
| Reload current page | No new node or event. |
| Browser back/forward to known URL | Reuse the known node. |
| Duplicate tab of known URL | Attach a tab alias; no new branch. |
| Close one duplicate | Preserve the node if another alias remains. |
| Go Home | Close every tracked alias except the origin tab and leave unrelated tabs untouched. |
| Delete a selected garden | Remove only that local session; delete-all remains a separate explicit action. |

## Memory and privacy

Tab aliases are compact integer IDs stored on existing nodes rather than duplicate node records. The extension remains local-only, no-AI, and low-memory. It does not inspect page content or infer user intent from history movement.

## Validation

The latest build passed JavaScript syntax checks, deterministic service-worker regression tests, Manifest V3 checks, settings-page checks, and the no-AI/no-network runtime scan. Coverage now includes duplicate-tab alias attachment, history reuse, redirect chains, direct search roots, per-garden deletion, and existing recovery behavior.

## Package

Archive: `focus-forest-history-maintenance.zip`

SHA-256:

```text
e6a4b8eb4cd5fa7e93474a853d7b28f69319709323572dc38699e4ca4b11a5bc
```

## Honest boundary

This is still a deterministic prototype. Real Chrome testing is needed for session restore, group duplication, browser-level tab moves, enterprise policy restrictions, and unusual SPA history behavior before production claims.
