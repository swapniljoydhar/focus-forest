# Chrome Web Store Listing — Focus Forest

> Last Updated: 2026-09-11

## Store Listing

**Extension Name**
Focus Forest

**Short Description**
A gentle mission-aware browsing companion that helps you notice rabbit holes without blocking the web.

**Detailed Description**
Focus Forest is a calm, local-first browsing companion that helps you notice when you are wandering down rabbit holes—without blocking pages, scolding you, or breaking the web.

When you sit down to research or work, plant an intention for what you are setting out to do. As you click links and explore, Focus Forest quietly keeps track of how many branches deep you have traveled from your original task.

When you wander too far into an unrelated trail, Focus Forest offers a gentle moment of reflection: a quiet choice sheet that lets you prune the branch, save the distracting article to compost for later reading, or return safely to your starting page with one click.

Key Features:
- Non-blocking companion: A discreet leaf chip tucked into the corner of your page that shows your current depth and mission.
- Organic tree visualization: Visit the Garden Dashboard to view your browsing trail rendered as a living botanical tree.
- Mindful choices: When you venture 4 or 5 links deep, pause to reflect with gentle options—not loud sirens or blocking walls.
- Compost for later: Save interesting discoveries into your personal compost bin with one click or via the context menu.
- 100% Offline and Private: All session histories and settings stay strictly in your browser's local storage. Zero telemetry, zero external servers, zero tracking.
- Dark mode and reduced motion support: Built with full accessibility in mind, supporting light/dark themes and system reduced-motion preferences.
- Single-page application awareness: Tracks branch transitions accurately on modern web apps like YouTube, GitHub, and Notion.

How to Use:
1. Open a new tab or click the Focus Forest toolbar icon.
2. Enter your intention (for example: "Research camera lenses for landscape photography").
3. Browse normally. Watch the discreet companion chip at the top right of the page.
4. If you wander several links deep, choose whether to return to your intention, compost the page for later, or keep exploring.
5. Open the Garden Dashboard anytime to see the tree you grew and explore your weekly focus insights.

Privacy & Offline Guarantee:
Focus Forest is completely local. It never connects to an external server, transmits any browsing history, or includes third-party analytics. Your data belongs exclusively to you.

**Category**
Productivity

**Single Purpose**
Tracks browsing depth relative to a stated focus intention and provides non-blocking tools to navigate back or save distractions locally.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | Ready | icons/icon-128.png |
| Screenshot 1 (Garden Map) | 1280×800 | To capture | screenshots/dashboard-map.png |
| Screenshot 2 (Insights & Stats) | 1280×800 | To capture | screenshots/dashboard-stats.png |
| Screenshot 3 (New Tab Plant) | 1280×800 | To capture | screenshots/newtab-plant.png |
| Screenshot 4 (Companion Chip) | 1280×800 | To capture | screenshots/companion-overlay.png |
| Screenshot 5 (Choice Sheet) | 1280×800 | To capture | screenshots/choice-sheet.png |
| Small Promo Tile | 440×280 | To create | promo/promo-small.png |
| Marquee Promo Tile | 1400×560 | To create | promo/promo-marquee.png |

### Screenshot Notes
- Screenshot 1: The interactive Garden Map showing a branching botanical tree with healthy, long, and composted leaves.
- Screenshot 2: The Insights & Stats tab displaying weekly focus minutes, consecutive day streak, and top visited domains.
- Screenshot 3: The peaceful new-tab page inviting the user to plant their intention.
- Screenshot 4: A normal webpage with the compact leaf chip resting quietly in the corner without obscuring page content.
- Screenshot 5: The gentle choice sheet offering "Go Home", "Compost for Later", or "Keep Exploring".

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Required to store user session trees, garden statistics, composted items, and preferences locally in `chrome.storage.local`. |
| `tabs` | permissions | Required to associate tabs with active focus sessions, detect new-tab replacements across Chromium browsers, and return to origin tabs via "Go Home". |
| `webNavigation` | permissions | Required to observe in-page client-side navigations (`onHistoryStateUpdated`) on single-page apps (such as YouTube and GitHub) so link depth is accurate. |
| `alarms` | permissions | Required to schedule periodic storage quota checks to keep local extension data bounded and healthy. |
| `contextMenus` | permissions | Required to provide right-click shortcuts for "Compost for Later" and "End Focus Mission" directly from any webpage. |
| `http://*/*`, `https://*/*` | host_permissions | Required to inject the isolated content script that renders the non-blocking companion chip and observes link clicks during active sessions. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

Focus Forest operates entirely offline on the client device. It does not transmit, collect, or sell any user data, browsing history, or personal information.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | None | No |
| Health info | No | No | None | No |
| Financial info | No | No | None | No |
| Authentication info | No | No | None | No |
| Personal communications | No | No | None | No |
| Location | No | No | None | No |
| Web history | No | No | Kept only locally in `chrome.storage.local` during sessions | No |
| User activity | No | No | None | No |
| Website content | No | No | None | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name**: Focus Forest
**Support**: GitHub Issues repository

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.2.0 | 2026-09-11 | Cleaned repository, eliminated dead external logs and unused dynamic imports, hardened message schemas, refined sub-minute statistics aggregation, added dark theme styling, automated browser testing. | Draft |

