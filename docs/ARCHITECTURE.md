# Focus Forest Architecture

## System Overview

Focus Forest is a Chrome Extension built with Manifest V3 architecture. It follows a local-first, privacy-respecting design with zero external dependencies.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Browser                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Popup     │  │  Dashboard   │  │   New Tab       │   │
│  │   (UI)      │  │  (SVG Tree)  │  │   (Mission)     │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                │                    │            │
│         └────────────────┼────────────────────┘            │
│                          │                                 │
│                   chrome.runtime                           │
│                   sendMessage()                            │
│                          │                                 │
│  ┌───────────────────────▼────────────────────────┐       │
│  │          Service Worker (Background)           │       │
│  │  ┌──────────────────────────────────────────┐  │       │
│  │  │  Message Router & Command Handler        │  │       │
│  │  ├──────────────────────────────────────────┤  │       │
│  │  │  Session Management                      │  │       │
│  │  │  - createSession()                       │  │       │
│  │  │  - endSession()                          │  │       │
│  │  │  - pruneNode()                           │  │       │
│  │  ├──────────────────────────────────────────┤  │       │
│  │  │  Navigation Tracking                     │  │       │
│  │  │  - chrome.webNavigation                  │  │       │
│  │  │  - chrome.tabs.onUpdated                 │  │       │
│  │  │  - handleNavigation()                    │  │       │
│  │  ├──────────────────────────────────────────┤  │       │
│  │  │  State Management                        │  │       │
│  │  │  - chrome.storage.local                  │  │       │
│  │  │  - getState() / setState()               │  │       │
│  │  └──────────────────────────────────────────┘  │       │
│  └───────────────────────┬────────────────────────┘       │
│                          │                                 │
│                   chrome.storage.local                     │
│                          │                                 │
│  ┌───────────────────────▼────────────────────────┐       │
│  │            Content Script (Per Tab)            │       │
│  │  ┌──────────────────────────────────────────┐  │       │
│  │  │  DOM Observation                         │  │       │
│  │  │  - MutationObserver                      │  │       │
│  │  │  - Link click detection                  │  │       │
│  │  ├──────────────────────────────────────────┤  │       │
│  │  │  UI Overlays                             │  │       │
│  │  │  - Mini tree visualization               │  │       │
│  │  │  - Intervention prompts                  │  │       │
│  │  └──────────────────────────────────────────┘  │       │
│  └────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Service Worker (`background/service-worker.js`)

**Role:** Central command and control center

**Responsibilities:**
- Message routing between components
- Session lifecycle management (create, update, end)
- Navigation event processing
- Tree structure maintenance
- State persistence to `chrome.storage.local`
- Intervention logic (desaturation, pause prompts)

**Key Characteristics:**
- Event-driven architecture
- Stateless between events (data in storage)
- Terminates when idle (Manifest V3 behavior)
- Maximum 537 lines (monolithic but focused)

### Content Script (`content/content.js`)

**Role:** In-page observer and UI injector

**Responsibilities:**
- Observe DOM mutations for link clicks
- Inject mini tree visualization overlay
- Display intervention prompts
- Report navigation events to service worker
- Handle drag-to-reposition of overlay

**Key Characteristics:**
- Runs in context of each web page
- Isolated from page JavaScript (content script isolation)
- Minimal footprint (~300 lines)
- Error-resilient with automatic cleanup

### Popup (`popup/`)

**Role:** Quick status and mission control

**Files:**
- `index.html` - UI structure
- `app.js` - State display and user actions
- `style.css` - Visual styling

**Responsibilities:**
- Show current mission status
- Display depth meter and stats
- Provide pause/resume interventions
- End mission with reflection
- Navigate to dashboard or settings

**Key Characteristics:**
- Opens on extension icon click
- Closes when user clicks away
- Real-time state synchronization

### Dashboard (`dashboard/`)

**Role:** Full garden visualization and management

**Files:**
- `index.html` - Layout structure
- `app.js` - Tree rendering and interactions
- `tree-layout.js` - Botanical layout algorithm
- `style.css` - Visual theming

**Responsibilities:**
- Render SVG tree visualization
- Handle node selection and keyboard navigation
- Display session details and events
- Manage compost pile
- Export session data
- Theme switching (light/dark)

**Key Characteristics:**
- Persistent tab (doesn't auto-close)
- Complex SVG rendering (~400 lines app.js + ~300 lines tree-layout.js)
- Accessibility features (keyboard nav, ARIA labels)

### Shared Utilities (`shared/`)

**Role:** Common functionality across components

**Files:**
- `error-tracing.js` - Error logging and boundaries
- `state.js` - Storage operations and quota monitoring

**Key Characteristics:**
- Imported via ES6 modules
- No side effects on import
- Pure functions where possible

## Data Flow

### Mission Start Flow
```
User opens new tab
    ↓
New Tab page shows mission input
    ↓
User types mission and submits
    ↓
Message: START_MISSION → Service Worker
    ↓
Service Worker: createSession(mission)
    ↓
Service Worker: setState(newState)
    ↓
chrome.storage.local updated
    ↓
Service Worker: { session } ← response
    ↓
New Tab redirects to root URL
    ↓
Content script injects on root page
```

### Navigation Tracking Flow
```
User clicks link or navigates
    ↓
chrome.webNavigation.onCommitted fires
    ↓
Service Worker: handleNavigation(tabId, url, transitionType)
    ↓
Service Worker: getState()
    ↓
Determine relationship: direct/tab-inferred/external
    ↓
Update node tree structure
    ↓
Check thresholds (DESATURATE, INTERRUPT)
    ↓
If intervention needed: message content script
    ↓
Content script shows prompt
    ↓
Service Worker: setState(updatedState)
```

### Tree Rendering Flow
```
Dashboard opens
    ↓
Message: GET_SNAPSHOT → Service Worker
    ↓
Service Worker: getState()
    ↓
Service Worker: { session, state } ← response
    ↓
Dashboard: layoutTree(nodes)
    ↓
Compute positions, edges, labels
    ↓
Render SVG elements (structure, branches, nodes, labels)
    ↓
Attach event listeners (click, keyboard, hover)
```

## State Schema

```typescript
interface State {
  sessions: Session[];          // All sessions (active + ended)
  compostItems: CompostItem[];  // Saved items across sessions
  thresholds: {
    DESATURATE: number;         // Default: 4
    INTERRUPT: number;          // Default: 5
  };
}

interface Session {
  id: string;
  mission: string;
  createdAt: number;
  endedAt?: number;
  nodes: Node[];
  events: SessionEvent[];
  interventionPaused: boolean;
}

interface Node {
  id: string;
  tabIds: number[];
  url: string;
  title: string;
  parentId: string | null;
  depth: number;
  firstSeenAt: number;
  relationshipConfidence: 'direct' | 'tab-inferred' | 'external';
  state: 'normal' | 'desaturated' | 'interrupted' | 'paused' | 'pruned' | 'composted';
  closedAt?: number;
  prunedAt?: number;
}
```

## Design Principles

### 1. Local-First
All data stored in `chrome.storage.local`. No cloud sync, no external servers, no analytics.

### 2. Zero Dependencies
No npm packages, no build tools, no frameworks. Pure vanilla JavaScript, HTML, CSS.

### 3. Calm Technology
Interventions are gentle suggestions, not forced interruptions. User maintains agency.

### 4. Transparent Branch Model
Users can see exactly how the tree grew, why branches formed, and make informed choices.

### 5. Error Resilience
Every user-facing function wrapped in error boundaries. Failures logged but don't crash UX.

### 6. Privacy by Design
- No data leaves the browser
- URLs stored only for session context
- No user identification or tracking
- Incognito mode supported

## Security Model

### Content Security Policy (CSP)
Strict CSP in manifest.json prevents:
- Inline scripts (except required for MV3)
- External resource loading
- eval() and new Function()

### Permission Minimization
Only essential permissions requested:
- `tabs` - Track tab creation/closure
- `webNavigation` - Detect navigation events
- `storage` - Persist state locally

### Isolation Boundaries
- Content scripts isolated from page context
- Service worker isolated from UI components
- No shared mutable state between components

## Performance Considerations

### Service Worker Lifecycle
- Wakes on events, terminates when idle
- State always persisted to storage
- No in-memory state between invocations

### Content Script Efficiency
- Single MutationObserver per page
- Debounced overlay updates
- Cleanup on page unload

### Dashboard Rendering
- SVG virtualization for large trees
- Incremental re-rendering on changes
- Layout computed once per session view

## Extension Points

### Adding New Message Types
1. Add handler in service-worker.js message router
2. Define payload schema in API_REFERENCE.md
3. Update error category if needed

### Adding New Node States
1. Update Node.state type in state.js
2. Add rendering logic in dashboard/app.js
3. Add CSS styles in dashboard/style.css
4. Update state transition logic in service-worker.js

### Adding New Interventions
1. Define threshold in state.js
2. Add check in service-worker.js navigation handler
3. Add content script prompt in content.js
4. Add UI in popup for configuration

## Testing Strategy

### Manual Testing
- Multi-tab scenarios
- SPA navigation (history API)
- Extension reload/update
- Incognito mode
- Different website types (search, video, docs, etc.)

### Automated Testing (Future)
- Unit tests for tree layout algorithm
- Integration tests for message passing
- E2E tests for critical user flows

## Future Architectural Considerations

### Potential Improvements
- TypeScript migration for type safety
- Modular service worker (split into feature modules)
- Build step for minification and linting
- Integration test suite
- Event sourcing pattern for better audit trail

### Trade-offs to Preserve
- Keep zero dependencies
- Maintain local-first architecture
- Avoid complexity that requires build tools
- Preserve calm technology philosophy
