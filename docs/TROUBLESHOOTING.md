# Focus Forest Troubleshooting Guide

## Common Issues & Solutions

### Extension Icon Not Appearing

**Symptoms:** Focus Forest icon doesn't show in Chrome toolbar after installation.

**Solutions:**
1. **Check installation:** Navigate to `chrome://extensions/` and verify Focus Forest is listed and enabled
2. **Pin the extension:** Click the puzzle piece icon in Chrome toolbar, find Focus Forest, click the pin icon
3. **Reload the extension:** On `chrome://extensions/`, click the reload icon next to Focus Forest
4. **Check permissions:** Ensure all required permissions are granted (tabs, webNavigation, storage)

### Content Script Not Loading on Certain Sites

**Symptoms:** Focus Forest doesn't track browsing on specific websites.

**Causes:**
- Chrome internal pages (`chrome://`, `about:`, `file://`)
- Web Store pages (`chrome.google.com/webstore`)
- Sites with strict Content Security Policy (CSP)
- Incognito mode (extension not enabled for incognito)

**Solutions:**
1. **Enable for incognito:** Go to `chrome://extensions/`, click Details, enable "Allow in incognito"
2. **Check site compatibility:** Content scripts cannot run on Chrome internal URLs by design
3. **Reload the tab:** Sometimes the content script fails to inject on first load; refresh the page
4. **Check console errors:** Open DevTools (F12), look for Focus Forest errors in Console tab

### Data Lost After Update

**Symptoms:** Sessions, compost items, or settings disappear after extension update.

**Prevention:**
- Regularly export important sessions using the Export button in Dashboard
- Avoid clearing browser data selectively for extensions

**Recovery:**
1. **Check storage:** Navigate to `chrome://extensions/`, click Details, check if data persists
2. **Re-import:** If you exported data previously, unfortunately import isn't supported yet (planned feature)
3. **Report the issue:** This shouldn't happen; report to developers with steps to reproduce

### High Memory Usage

**Symptoms:** Chrome task manager shows Focus Forest service worker using excessive memory.

**Diagnosis:**
1. Open Chrome Task Manager (`Shift+Esc`)
2. Look for "Extension: Focus Forest" process
3. Normal usage: < 50MB; Concerning: > 200MB

**Solutions:**
1. **End old missions:** Long-running sessions with many nodes consume more memory
2. **Clear compost:** Remove old composted items you no longer need
3. **Reload extension:** Go to `chrome://extensions/`, click reload icon
4. **Reduce thresholds:** Lower DESATURATE and INTERRUPT thresholds in settings to prune earlier

### Tree Not Rendering Correctly

**Symptoms:** Dashboard shows blank tree, overlapping nodes, or missing branches.

**Solutions:**
1. **Refresh dashboard:** Press F5 or click refresh button
2. **Select different session:** Use session dropdown to switch sessions
3. **Check console errors:** Open DevTools Console on dashboard page
4. **Clear browser cache:** `chrome://settings/clearBrowserData` → Cached images and files
5. **Reset extension:** As last resort, remove and reinstall extension (export data first!)

### Keyboard Shortcuts Not Working

**Symptoms:** Alt+Shift+F/G/N shortcuts don't trigger expected actions.

**Solutions:**
1. **Check conflicts:** Another extension or Chrome may be using same shortcut
   - Go to `chrome://extensions/shortcuts` to view and modify shortcuts
2. **Focus context:** Some shortcuts only work when browser window is focused
3. **Mac users:** Try Option instead of Alt key
4. **Incognito mode:** Shortcuts may not work in incognito unless extension is enabled

### Mission Templates Not Appearing

**Symptoms:** Template chips don't show in popup empty state.

**Solutions:**
1. **Check popup state:** Templates only appear when no active mission exists
2. **Reload popup:** Close and reopen the popup
3. **Clear cache:** Clear browser cache and reload extension
4. **Check console:** Look for JavaScript errors in popup's DevTools console

## FAQ

### Q: Can I use Focus Forest in multiple Chrome profiles?
**A:** Yes, each Chrome profile maintains separate Focus Forest data. Install the extension in each profile.

### Q: Does Focus Forest work in Firefox or Safari?
**A:** No, Focus Forest is currently Chrome-only due to Manifest V3 APIs. Firefox/Safari versions may come later.

### Q: Can I sync my data across devices?
**A:** Not currently. All data is stored locally via `chrome.storage.local`. Export/import feature is planned.

### Q: How long is data retained?
**A:** Indefinitely, until you manually end missions, delete compost, or uninstall the extension.

### Q: Does Focus Forest track my browsing history?
**A:** No. Focus Forest only tracks pages visited during active missions and stores data locally. It does not access or transmit your general browsing history.

### Q: Can I recover a pruned or composted item?
**A:** Composted items can be deleted but not restored to the tree. Pruned items remain in the trail for reflection. This is intentional design to encourage mindful choices.

### Q: Why doesn't Focus Forest work on [specific site]?
**A:** Common reasons:
- Site uses frames/iframes that block content scripts
- Strict CSP prevents script injection
- Site dynamically recreates DOM elements
- You're in incognito without enabling extension

## Reset Procedures

### Soft Reset (Recommended First Step)
1. End any active missions
2. Clear compost items you don't need
3. Reload extension from `chrome://extensions/`
4. Refresh all tabs where Focus Forest should be active

### Hard Reset (Use When Data Is Corrupted)
⚠️ **Warning:** This will delete all sessions, compost items, and settings.

1. **Export important data** from Dashboard if possible
2. Go to `chrome://extensions/`
3. Click "Remove" on Focus Forest
4. Restart Chrome completely
5. Reinstall Focus Forest from Chrome Web Store or load unpacked
6. Start fresh with new missions

### Storage Inspection (Advanced)
For debugging storage issues:

1. Open DevTools on any Focus Forest page (popup, dashboard, etc.)
2. Go to Console tab
3. Run: `chrome.storage.local.get(null, console.log)`
4. Examine output for missing or corrupted data

## Getting Help

If these solutions don't resolve your issue:

1. **Check existing issues:** Visit the GitHub repository issues page
2. **Create a bug report:** Include:
   - Chrome version (`chrome://version`)
   - Extension version (from `chrome://extensions/`)
   - Steps to reproduce
   - Screenshots or screen recordings
   - Console error messages
3. **Provide diagnostic data:**
   - Export a session if possible
   - Describe your typical usage pattern
   - Note any recent changes to your system

## Performance Tips

- Keep active missions focused and time-boxed
- Regularly review and clean compost pile
- End missions when complete rather than letting them run indefinitely
- Use keyboard shortcuts for faster workflow
- Consider lowering intervention thresholds for simpler trees
