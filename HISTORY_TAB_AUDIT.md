# History and Tab Duplication Audit

## Edge cases to preserve

| Situation | Desired behavior |
|---|---|
| Browser back/forward to a known URL | Reuse the known node and keep its branch depth. |
| Reload of the current URL | Do not write a new event or node. |
| Duplicate tab of a known URL | Reuse the known page node while attaching the new tab ID as an alias. |
| Closing one duplicate tab | Keep the node alive if another attached tab remains. |
| Closing the last attached child tab | Mark that node closed for Go Home and visual history. |
| Go Home with duplicated tabs | Close every tracked tab ID except the origin tab. |
| Reopening a known URL from a new tab | Do not create a phantom deeper branch. |

The model remains structural and local. It does not infer why a tab was duplicated or whether a return was intentional; it only avoids counting the same canonical URL as a new branch when Chrome exposes it as the same known path.
