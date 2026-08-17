# Focus Forest API Reference

## Overview
This document provides a comprehensive reference for all public APIs, message types, state structures, and functions used in Focus Forest.

## Message Protocol

All communication between extension components uses `chrome.runtime.sendMessage()` with the following structure:

```javascript
{ type: string, ...payload }
```

### Message Types

#### GET_SNAPSHOT
**Direction:** Any → Background  
**Payload:** None  
**Response:** 
```javascript
{
  session: Session | null,
  state: {
    sessions: Session[],
    compostItems: CompostItem[],
    thresholds: { DESATURATE: number, INTERRUPT: number }
  }
}
```

#### START_MISSION
**Direction:** Popup/New Tab → Background  
**Payload:** `{ mission: string }`  
**Response:** `{ session: Session }`  
**Side Effects:** Creates new session, plants root node

#### END_MISSION
**Direction:** Popup → Background  
**Payload:** `{ reason: 'user_ended' | 'browse_without_mission' }`  
**Response:** `{ success: boolean }`  
**Side Effects:** Ends current session, triggers reflection

#### GO_HOME
**Direction:** Popup → Background  
**Payload:** None  
**Response:** None  
**Side Effects:** Navigates to chrome://newtab

#### PAUSE_INTERVENTION
**Direction:** Popup → Background  
**Payload:** `{ paused: boolean }`  
**Response:** `{ success: boolean }`  
**Side Effects:** Toggles intervention pause state

#### PRUNE_NODE
**Direction:** Dashboard → Background  
**Payload:** `{ sessionId: string, nodeId: string, toCompost: boolean }`  
**Response:** `{ success: boolean }`  
**Side Effects:** Prunes node, optionally adds to compost

#### DELETE_COMPOST
**Direction:** Dashboard → Background  
**Payload:** `{ id: string }`  
**Response:** `{ success: boolean }`  
**Side Effects:** Removes item from compost

## State Structure

### Session Object
```typescript
interface Session {
  id: string;                    // UUID v4
  mission: string;               // User's intention statement
  createdAt: number;             // Timestamp (ms since epoch)
  endedAt?: number;              // Timestamp when mission ended
  nodes: Node[];                 // All nodes in this session
  events: SessionEvent[];        // Event log for audit trail
  interventionPaused: boolean;   // Whether interventions are paused
}
```

### Node Object
```typescript
interface Node {
  id: string;                    // UUID v4
  tabIds: number[];              // Chrome tab IDs associated
  url: string;                   // Full URL
  title: string;                 // Page title
  parentId: string | null;       // Parent node ID (null for root)
  depth: number;                 // Distance from root (0 = root)
  firstSeenAt: number;           // Timestamp when first visited
  relationshipConfidence: 'direct' | 'tab-inferred' | 'external';
  state: 'normal' | 'desaturated' | 'interrupted' | 'paused' | 'pruned' | 'composted';
  closedAt?: number;             // Timestamp when tab closed
  prunedAt?: number;             // Timestamp when pruned
}
```

### SessionEvent Object
```typescript
interface SessionEvent {
  type: EventType;
  timestamp: number;
  url?: string;
  mission?: string;
  reason?: string;
}

type EventType = 
  | 'mission_started'
  | 'origin_planted'
  | 'navigation'
  | 'external_path'
  | 'tab_joined_path'
  | 'return_to_path'
  | 'composted'
  | 'pruned'
  | 'mission_changed'
  | 'mission_ended';
```

### CompostItem Object
```typescript
interface CompostItem {
  id: string;                    // UUID v4
  url: string;
  title: string;
  sessionId: string;             // Origin session ID
  createdAt: number;
}
```

## Core Functions

### Background Service Worker

#### `createSession(mission: string): Session`
Creates a new session with the given mission statement.
- **Returns:** New Session object with root node
- **Side Effects:** Persists to chrome.storage.local

#### `endSession(sessionId: string, reason: string): void`
Ends the specified session.
- **Side Effects:** Sets endedAt, triggers reflection

#### `pruneNode(sessionId: string, nodeId: string, toCompost: boolean): void`
Prunes a node from the tree.
- **Side Effects:** Updates node state, may add to compost

#### `handleNavigation(tabId: number, url: string, transitionType: string): void`
Processes navigation events and updates session tree.
- **Logic:** Determines if URL is continuation, branch, or external

### Shared State Management

#### `getState(): Promise<State>`
Retrieves current extension state from storage.
- **Returns:** Complete state object

#### `setState(state: State): Promise<void>`
Persists state to chrome.storage.local.
- **Validation:** Checks schema before saving

#### `checkStorageQuota(): Promise<{ bytesInUse: number, warning: boolean }>`
Monitors storage usage and warns when approaching quota.
- **Thresholds:** Warning at 4MB, critical at 7MB

### Error Tracing

#### `logError(error: Error, context: ErrorContext): void`
Logs errors with contextual metadata.
- **Context includes:** category, function, component, userId (hashed)

#### `wrapWithErrorBoundary(fn: Function, context: ErrorContext): Function`
Higher-order function that wraps callbacks with try-catch.
- **Options:** swallow (boolean) - whether to suppress errors

### Tree Layout

#### `layoutTree(nodes: Node[]): TreeLayout`
Computes visual layout for tree visualization.
- **Returns:** TreeLayout with positions, edges, labels
- **Algorithm:** Force-directed with botanical constraints

## CSS Custom Properties

### Light Theme (default)
```css
--bg-primary: #f5f7f5;
--text-primary: #2d3a2d;
--accent-green: #6fa36f;
--border-color: #d8e0d8;
```

### Dark Theme
```css
[data-theme="dark"] {
  --bg-primary: #1a1f1a;
  --text-primary: #e8f0e5;
  --accent-green: #6fa36f;
  --border-color: #2d3a2d;
}
```

## Error Categories

```javascript
const ERROR_CATEGORIES = {
  MESSAGING: 'messaging',
  STATE_MUTATION: 'state_mutation',
  UI_RENDER: 'ui_render',
  STORAGE: 'storage',
  NAVIGATION_TRACKING: 'navigation_tracking',
  SERVICE_WORKER: 'service_worker'
};
```

## Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `ArrowDown` | Navigate to child node | Tree focused |
| `ArrowUp` | Navigate to parent node | Tree focused |
| `ArrowRight` | Navigate to next sibling/child | Tree focused |
| `ArrowLeft` | Navigate to previous sibling/parent | Tree focused |
| `Enter` / `Space` | Select node | Node focused |
| `Escape` | Close dialog | Dialog open |
| `Alt+Shift+F` | Open popup | Global |
| `Alt+Shift+N` | New tab with mission | Global |
| `Alt+Shift+G` | Open garden dashboard | Global |

## Version History

- **v1.0.0** - Initial release with core tracking
- **v1.1.0** - Added dark theme, keyboard navigation, export
- **v1.2.0** - Added mission templates, enhanced accessibility
