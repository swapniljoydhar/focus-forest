# Security Considerations

## Host Permissions

Focus Forest requests `host_permissions: ["http://*/*", "https://*/*"]` because the companion chip must be injected on every ordinary webpage to observe navigation signals, display mission state, and detect link activations. The extension does not read page content, inject scripts into frames, or exfiltrate data; it only renders a closed shadow-DOM chip and listens for trusted navigation events.

If the permission scope were narrowed, the companion would fail to appear on many sites, breaking the core browsing-companion experience.

## WebNavigation Permission

The `webNavigation` permission is used solely to track `historyStateUpdated` events in SPAs (YouTube, Notion, Gmail, GitHub, etc.) so that in-page navigations update the branch depth correctly. No additional browsing data is collected through this API.

## Error Handling

The service worker sanitizes all error responses returned to content scripts. Internal error details are never exposed to page context; content scripts receive only a generic `INTERNAL_ERROR` code.

## Message Validation

All runtime messages are validated against explicit per-type schemas before processing. Malformed or unexpected messages are rejected without side effects.

## State Canonicalization

Node tab associations are stored as `tabIds` arrays only. Legacy `tabId` fields are migrated to `tabIds` during state normalization. `findNode` and related helpers always search the canonical `tabIds` array.

## Content Script Isolation

The companion chip renders inside a closed shadow root. Its styles are scoped to the shadow boundary and never leak into the host page. No external stylesheet or web-accessible resource is used for the companion.

## Data Storage

All browsing data stays in `chrome.storage.local`. No remote servers, accounts, analytics, or external dependencies are used.
