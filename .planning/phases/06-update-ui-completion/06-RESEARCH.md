# Phase 6: Update UI Completion - Research

**Researched:** 2026-01-27
**Domain:** TypeScript type definitions, React update notification UI
**Confidence:** HIGH

## Summary

This phase addresses tech debt identified in the v1 milestone audit: the `onUpdateEvent` method is implemented in the preload script but lacks TypeScript type definitions, and there's no in-app update UI component (the app currently relies on OS notifications as fallback).

The research confirmed that the existing codebase has all the patterns needed. The preload implementation at `electron/preload/index.ts:103-137` already implements `onUpdateEvent` following the same pattern as `onMenuAction`. The type definitions simply need to be added to both `electron/preload/index.d.ts` and `src/vite-env.d.ts`. The update notification component can follow the existing toast pattern used for import feedback in `App.tsx:515-570`.

**Primary recommendation:** Add `onUpdateEvent` type to `ElectronAPI` interface, then create a simple update notification component following existing codebase patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron-updater | ^6.7.3 | Auto-update backend | Already integrated, emits typed events |
| React | ^19.1.0 | UI framework | Existing hooks/components infrastructure |
| Tailwind CSS | ^4.1.10 | Styling | Existing design system |
| TypeScript | ~5.8.3 | Type safety | Existing type infrastructure |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron | ^40.0.0 | Desktop runtime | IPC type imports |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom toast | react-toastify | Overkill for single use case, adds dependency |
| Custom toast | sonner | Modern but unnecessary given existing pattern |

**Installation:**
```bash
# No new dependencies needed - all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── UpdateNotification.tsx   # New: In-app update UI
├── hooks/
│   └── useUpdateEvents.ts       # New: Update event subscription hook
└── vite-env.d.ts                # Update: Add onUpdateEvent type

electron/
└── preload/
    └── index.d.ts               # Update: Add onUpdateEvent type
```

### Pattern 1: Event Subscription with Cleanup
**What:** React hook pattern for IPC event listeners
**When to use:** Any main->renderer event subscription
**Example:**
```typescript
// Source: Existing pattern from App.tsx:88-155
useEffect(() => {
  if (!isElectron()) return

  const unsubscribe = window.electronAPI!.onUpdateEvent((event, data) => {
    // Handle update events
  })

  return () => unsubscribe()
}, [])
```

### Pattern 2: Toast Notification Component
**What:** Fixed-position notification with auto-dismiss
**When to use:** Non-blocking user feedback
**Example:**
```typescript
// Source: Existing pattern from App.tsx:515-570
// Position: absolute top-20 left-1/2 transform -translate-x-1/2 z-50
// Colors: emerald for success, blue for info, amber for warning
// Auto-dismiss: setTimeout for non-critical messages
```

### Pattern 3: Type Augmentation for Window
**What:** Extend global Window interface with typed API
**When to use:** Electron preload bridge typing
**Example:**
```typescript
// Source: Electron official docs + existing vite-env.d.ts
interface ElectronAPI {
  onUpdateEvent: (callback: (event: string, data?: unknown) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
```

### Anti-Patterns to Avoid
- **Duplicate type definitions:** Don't create separate type files. The project uses `vite-env.d.ts` and `electron/preload/index.d.ts` which must stay in sync.
- **Direct ipcRenderer exposure:** Never expose raw ipcRenderer. Use the existing wrapper pattern.
- **Missing cleanup function:** Always return unsubscribe function to prevent memory leaks.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event subscription | Custom listener management | Existing `onUpdateEvent` pattern | Pattern already tested, handles cleanup |
| Toast positioning | Custom CSS | Existing toast pattern | Consistent with import feedback UI |
| Platform detection | Custom check | `isElectron()` utility | Already handles all edge cases |
| Update data types | Custom interfaces | electron-updater's `UpdateInfo`, `ProgressInfo` | Authoritative source |

**Key insight:** The codebase already has all building blocks. This phase is about wiring existing patterns together, not creating new infrastructure.

## Common Pitfalls

### Pitfall 1: Memory Leak from Missing Cleanup
**What goes wrong:** IPC listeners accumulate across component re-renders
**Why it happens:** Forgetting to return cleanup function from useEffect
**How to avoid:** Always return unsubscribe function: `return () => unsubscribe()`
**Warning signs:** Multiple update notifications appearing, or events firing multiple times

### Pitfall 2: Type Definition Sync Issues
**What goes wrong:** TypeScript errors in renderer vs preload
**Why it happens:** `vite-env.d.ts` and `electron/preload/index.d.ts` have duplicate ElectronAPI definitions
**How to avoid:** Update BOTH files simultaneously with identical changes
**Warning signs:** TypeScript errors only in one build mode (electron vs web)

### Pitfall 3: Calling Update API in Development
**What goes wrong:** Errors because no update server in dev mode
**Why it happens:** electron-updater requires packaged app
**How to avoid:** Check `app.isPackaged` (already done in updater.ts), use `isElectron()` in renderer
**Warning signs:** Console errors about update server when running `npm run dev:electron`

### Pitfall 4: Stale State in Event Callback
**What goes wrong:** Callback has outdated state values
**Why it happens:** Closure captures initial state
**How to avoid:** Use refs for values needed in callbacks, or update dependency array
**Warning signs:** Progress shows wrong values, actions operate on stale data

### Pitfall 5: Z-index Conflicts
**What goes wrong:** Notification hidden behind modals or 3D canvas
**Why it happens:** Z-index not coordinated
**How to avoid:** Use z-50 (consistent with existing toast), ensure portal if needed
**Warning signs:** Notification not visible when modals are open

## Code Examples

Verified patterns from existing codebase:

### Type Definition Pattern
```typescript
// Source: electron/preload/index.d.ts (existing pattern to extend)
export interface ElectronAPI {
  isElectron: boolean
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  onMenuAction: (callback: (action: string) => void) => () => void
  // ADD: Update event subscription
  onUpdateEvent: (callback: (event: string, data?: unknown) => void) => () => void
}
```

### Event Subscription Hook Pattern
```typescript
// Source: Pattern from App.tsx:88-155, adapted for updates
import { useState, useEffect, useCallback } from 'react'
import { isElectron } from '../utils/platform'

interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'
  version?: string
  progress?: number
  error?: string
}

export function useUpdateEvents() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })

  useEffect(() => {
    if (!isElectron()) return

    const unsubscribe = window.electronAPI!.onUpdateEvent((event, data) => {
      switch (event) {
        case 'available':
          setState({ status: 'available', version: (data as { version: string })?.version })
          break
        case 'progress':
          setState(s => ({ ...s, status: 'downloading', progress: (data as { percent: number })?.percent }))
          break
        case 'downloaded':
          setState(s => ({ ...s, status: 'ready' }))
          break
        case 'error':
          setState({ status: 'error', error: data as string })
          break
      }
    })

    return () => unsubscribe()
  }, [])

  const checkForUpdates = useCallback(() => {
    if (!isElectron()) return
    setState({ status: 'checking' })
    window.electronAPI!.invoke('update:check')
  }, [])

  const downloadUpdate = useCallback(() => {
    if (!isElectron()) return
    window.electronAPI!.invoke('update:download')
  }, [])

  const dismiss = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  return { ...state, checkForUpdates, downloadUpdate, dismiss }
}
```

### Toast Notification Pattern
```typescript
// Source: App.tsx:515-570 (existing import feedback toast)
// Styling: bg-blue-600 for info, bg-emerald-600 for success
// Position: absolute top-20 left-1/2 transform -translate-x-1/2 z-50
// Features: Icon, message text, close button
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal dialogs for updates | Toast notifications | 2024+ | Non-blocking UX |
| Global event listeners | Hook-based subscriptions | React 16.8+ | Better cleanup, testability |
| Separate type files | Type augmentation | TypeScript 3.4+ | Single source of truth |

**Deprecated/outdated:**
- Electron `remote` module: Removed, use IPC patterns instead
- `autoUpdater.checkForUpdatesAndNotify()`: Still valid but less control than manual approach

## Open Questions

Things that couldn't be fully resolved:

1. **Progress bar granularity**
   - What we know: electron-updater emits progress at varying intervals
   - What's unclear: Exact frequency depends on download speed/file size
   - Recommendation: Debounce or throttle if updates too frequent

2. **Release notes rendering**
   - What we know: `UpdateInfo.releaseNotes` can be string or object
   - What's unclear: Whether to render markdown/HTML
   - Recommendation: Start with plain text, enhance if needed

## Sources

### Primary (HIGH confidence)
- Existing codebase: `electron/preload/index.ts` - onUpdateEvent implementation
- Existing codebase: `App.tsx:88-155` - onMenuAction subscription pattern
- Existing codebase: `App.tsx:515-570` - Toast notification pattern
- [Electron contextBridge docs](https://www.electronjs.org/docs/latest/api/context-bridge) - Type augmentation pattern
- [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) - Security best practices
- [electron-builder auto-update](https://www.electron.build/auto-update.html) - UpdateInfo, ProgressInfo types

### Secondary (MEDIUM confidence)
- [Knock's React notification libraries](https://knock.app/blog/the-top-notification-libraries-for-react) - Toast patterns and accessibility
- [React useEffect cleanup](https://blog.logrocket.com/understanding-react-useeffect-cleanup-function/) - Memory leak prevention

### Tertiary (LOW confidence)
- Community patterns for Electron update UIs - validated against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project
- Architecture: HIGH - All patterns exist in codebase
- Pitfalls: HIGH - Based on existing code and official docs

**Research date:** 2026-01-27
**Valid until:** 60 days (stable patterns, no fast-moving dependencies)
