# Focus Forest — Next Refinement Specification

## Control model

Controls should increase agency without turning the extension into a settings dashboard. The initial surface will be the existing popup, with one compact **Tend the forest** control that reveals a lightweight settings page. All settings remain local and are immediately reversible.

| Control | Default | Purpose |
|---|---:|---|
| Gentle reminder depth | 4 | Choose when the atmosphere becomes quieter. |
| Choice-sheet depth | 5 | Choose when the recovery sheet appears. |
| Ambient motion | On | Allow leaf and branch motion; respects system reduced-motion by default. |
| Pause this mission | Off | Suspend intervention without losing the garden. |

The extension will enforce `choice-sheet depth ≥ gentle reminder depth + 1`. No setting invokes remote services or interprets page content.

## Completion ritual

Ending a mission should not feel like deleting a task. The popup’s “Let this garden rest” action will open a small completion sheet. It reflects only deterministic local facts: pages grown, deepest branch, items composted, and the mission’s title. The user can choose **Let it rest**, **Return to the garden**, or **Keep tending**. It will never grade the session or claim whether the mission was successful.

## Redirect and search policy

The extension will keep a short-lived local redirect map. When a tracked tab completes a navigation to a new URL shortly after an in-tab direct link, it updates the most recent node instead of creating a second branch. This treats search-result and tracking redirects as one step.

Direct navigation in a tracked tab remains a neutral external path. A search results page that the user reaches directly is a root/neutral path; links clicked from that page are normal branches. This is transparent structural logic, not content understanding.
