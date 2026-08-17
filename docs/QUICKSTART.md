# Focus Forest Developer Quick Start Guide

## Overview
Focus Forest is a local-first Chrome extension that helps users maintain intentional browsing habits. This guide covers development workflow, debugging, and architecture.

## Development Setup

### Prerequisites
- Chrome/Chromium browser (v102+)
- Basic knowledge of Chrome Extensions Manifest V3
- Text editor with JavaScript support

### Installation for Development
1. Clone or download the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the root folder of the repository
6. The extension icon should appear in your toolbar

## Project Structure

```
focus-forest/
├── manifest.json          # Extension configuration
├── background/            # Service worker
│   └── service-worker.js
├── content/               # Content scripts
│   └── content.js
├── popup/                 # Popup UI
│   ├── index.html
│   ├── app.js
│   └── style.css
├── dashboard/             # Main garden visualization
│   ├── index.html
│   ├── app.js
│   ├── tree-layout.js
│   └── style.css
├── shared/                # Shared utilities
│   ├── error-tracing.js
│   └── state.js
└── docs/                  # Documentation
    ├── QUICKSTART.md
    ├── API_REFERENCE.md
    ├── TROUBLESHOOTING.md
    └── ARCHITECTURE.md
```

## Debugging Tips

### Service Worker Debugging
1. Go to `chrome://extensions/`
2. Find Focus Forest
3. Click "service worker" under "Inspect views"
4. Use DevTools for breakpoints, console logging, and network inspection

**Common Issue**: Service workers terminate after inactivity. To keep alive during debugging:
- Keep the DevTools panel open
- Use `chrome.runtime.onMessage` listeners to trigger wake-up

### Content Script Debugging
1. Navigate to any webpage
2. Open DevTools (F12)
3. Look for "content.js" in Sources panel
4. Console logs appear in the page's console

**Note**: Content scripts run in an isolated world. They cannot access page variables directly.

### Popup Debugging
1. Right-click extension icon → "Inspect popup"
2. Separate DevTools window opens
3. Reload popup by closing and reopening

### Dashboard Debugging
1. Open garden dashboard from popup
2. Standard DevTools apply
3. SVG elements inspectable in Elements panel

## Architecture Overview

### Data Flow
```
User Action → Content Script → Service Worker → State Storage
                                      ↓
                                 Dashboard/Popup (via messaging)
```

### Key Components

**Service Worker (`background/service-worker.js`)**
- Central message router
- Session lifecycle management
- Navigation tracking via `chrome.webNavigation`
- Tab relationship inference

**Content Script (`content/content.js`)**
- Page metadata extraction
- SPA navigation detection
- History state change monitoring

**State Management (`shared/state.js`)**
- Immutable state updates
- Event sourcing pattern
- Local storage persistence
- Quota monitoring

**Error Handling (`shared/error-tracing.js`)**
- Centralized error logging
- Error boundaries for UI rendering
- Category-based error classification

### Message Types
See `API_REFERENCE.md` for complete message schema.

## Common Development Tasks

### Adding New Message Type
1. Define type in service worker message handler
2. Add payload validation
3. Update state mutations if needed
4. Document in API reference

### Modifying Tree Visualization
1. Edit `dashboard/tree-layout.js` for layout algorithm
2. Update `dashboard/app.js` for rendering logic
3. Adjust `dashboard/style.css` for styling

### Testing Changes
1. Reload extension (`chrome://extensions/` → reload icon)
2. Test in clean browser profile
3. Verify no console errors
4. Check multiple tab scenarios

## Performance Considerations

- Service worker should respond quickly (< 100ms)
- Avoid large synchronous operations in service worker
- Use `chrome.storage.local` efficiently (quota: ~10MB)
- Minimize content script overhead

## Security Guidelines

- No external network requests (local-first principle)
- All data stays on user's device
- CSP enforced via manifest
- No eval() or dynamic code execution
- Validate all message payloads

## Build & Deployment

Currently no build step required - extension loads directly from source.

For production:
1. Test thoroughly in incognito mode
2. Verify manifest permissions are minimal
3. Package via `chrome://extensions/` → "Pack extension"
4. Submit to Chrome Web Store

## Resources

- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Service Worker Best Practices](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
