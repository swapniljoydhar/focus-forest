# Real-Browser Testing Checklist

Use this checklist when testing Focus Forest in a real Chrome instance.

## Setup

- [ ] Load unpacked extension from `focus-forest/` in `chrome://extensions`
- [ ] Open DevTools console on any page to watch for content script errors
- [ ] Open `chrome://serviceworker-internals/` to inspect service worker logs

## Page-Specific Rendering

- [ ] GitHub (`github.com`, repo page, issue page, PR page)
- [ ] YouTube (video page, search results, channel page)
- [ ] Notion (`notion.so`, `app.notion.so`)
- [ ] Gmail (`mail.google.com`)
- [ ] SPA navigation: click internal links on YouTube/GitHub/Notion and verify depth tracking continues without duplicate branches
- [ ] Search engine: plant mission on `google.com/search?q=...` and verify origin is set correctly

## Restricted Origins

- [ ] `chrome://newtab` — extension origin page loads normally
- [ ] `chrome://extensions` — content script does not inject
- [ ] `chrome://settings` — content script does not inject
- [ ] `edge://` — content script does not inject
- [ ] `file://` — content script does not inject (or degrades gracefully)

## Redirect Chains

- [ ] Single-hop redirect: link → redirect URL → final destination (one branch)
- [ ] Multi-hop redirect: link → transport A → transport B → final destination (one branch)
- [ ] Meta refresh redirect
- [ ] JavaScript `window.location` redirect

## Keyboard Focus

- [ ] Tab to companion chip, Enter/Space activates Pause/Resume
- [ ] Tab to choice sheet, arrow keys cycle actions, Enter selects
- [ ] Escape closes choice sheet
- [ ] Dashboard: arrow keys walk tree nodes, Enter opens detail panel, Escape closes
- [ ] Settings: all controls reachable via Tab, sliders respond to arrow keys

## Popup Sizing

- [ ] Viewport width 320px (mobile)
- [ ] Viewport width 768px (tablet)
- [ ] Viewport width 1440px (desktop)
- [ ] Viewport width 1920px+ (large desktop)
- [ ] Chip does not overflow or clip at any width

## Chrome Profiles

- [ ] Primary profile: mission plant, branch, compost, garden view
- [ ] Secondary profile: extension loads independently
- [ ] Incognito: extension enabled, same behavior (if user allows incognito)

## Browser Session Restore

- [ ] Plant mission, create branches, close all tabs
- [ ] Restore previous session (Ctrl+Shift+T or history)
- [ ] Verify garden state persists and origin remains correct

## Tab Groups / Window Splits

- [ ] Open two windows, plant mission in window A, branch in window B
- [ ] Verify `windowId` tracking prevents pending branch collision
- [ ] Drag tab between windows, verify node reattaches correctly

## Reduced Motion Preference

- [ ] Enable "Reduce motion" in OS/browser settings
- [ ] Plant mission — growth ritual should be skipped
- [ ] Enter new branch — growth ritual should be skipped
- [ ] Chip state changes should still function without animation

## High Contrast / Forced Colors

- [ ] Enable Windows High Contrast mode
- [ ] Verify chip and choice sheet remain readable
- [ ] Verify dashboard tree labels remain legible

## Zoom Levels

- [ ] 100% zoom — default layout
- [ ] 125% zoom — chip and choice sheet adapt
- [ ] 150% zoom — no overlap or clipping
- [ ] 200% zoom — all interactive elements remain accessible
