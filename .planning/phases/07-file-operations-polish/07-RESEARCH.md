# Phase 7: File Operations Polish - Research

**Researched:** 2026-01-27
**Domain:** Electron/React file operation coordination, confirmation dialogs
**Confidence:** HIGH

## Summary

This phase addresses two specific gaps from the v1 milestone audit: (1) the "New" menu action does not prompt to save dirty documents, and (2) the save-then-close flow requires manual coordination. Both are polish items on existing, working file operations infrastructure.

The current implementation already has:
- Dirty state tracking via `useFileOperations` hook (`isDirty`, `markDirty`, `markClean`)
- Window close confirmation dialog in main process (`electron/main/index.ts`)
- IPC wiring for menu actions (`menu:new`, `menu:save`, etc.)
- Save/SaveAs operations that return success/failure status

The pattern already established for window close (main process shows native dialog, coordinates save-then-close) should be extended to the "New" action. The key insight: use the same dialog.showMessageBox API with identical messaging to maintain consistency.

**Primary recommendation:** Extend the existing close confirmation pattern to handle "New" action in main process, add IPC for save-then-continue flow, and create a shared confirmation handler.

## Standard Stack

This phase uses no new libraries - it enhances existing infrastructure.

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | 35+ | Desktop framework | Already used; dialog API for native confirmations |
| React | 19 | UI framework | Already used; hook patterns for state |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | No new dependencies needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Main process dialog | React modal in renderer | Native dialogs are already used for close; maintain consistency |
| Promise-based confirm hook | Existing pattern | Would require UI changes; main process pattern already works |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
electron/
├── main/
│   ├── index.ts           # Extend setupDirtyStateHandling()
│   └── ipc/
│       └── fileHandlers.ts   # Add confirmation flow handlers
src/
├── hooks/
│   └── useFileOperations.ts  # No changes needed
└── App.tsx                    # Handle save-then-continue response
```

### Pattern 1: Unified Dirty Check Confirmation
**What:** Single function in main process that shows the same dialog for New, Open, and Close actions
**When to use:** Any action that would discard unsaved changes
**Example:**
```typescript
// Source: electron/main/index.ts pattern (extended)
async function confirmDiscardChanges(
  parentWindow: BrowserWindow,
  action: 'new' | 'open' | 'close'
): Promise<'save' | 'discard' | 'cancel'> {
  const result = await dialog.showMessageBox(parentWindow, {
    type: 'question',
    buttons: ['Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    message: 'Save changes?',
    detail: 'Your changes will be lost if you don\'t save.'
  })

  if (result.response === 0) return 'save'
  if (result.response === 1) return 'discard'
  return 'cancel'
}
```

### Pattern 2: Save-Then-Continue Flow
**What:** After user clicks "Save" in confirmation, save completes then action continues automatically
**When to use:** When save succeeds, the original action (New/Close) should proceed without re-prompting
**Example:**
```typescript
// Source: Electron documentation on IPC coordination
// In renderer (App.tsx):
case 'new': {
  // Wait for save result if triggered by confirmation
  const pendingAction = sessionStorage.getItem('pending-action')
  if (pendingAction === 'new') {
    sessionStorage.removeItem('pending-action')
    // Save just completed, now proceed with new
    fileOps.newFile()
    await clearAll()
    return
  }

  if (fileOps.isDirty) {
    // Don't proceed - main process will show dialog and coordinate
    return
  }

  fileOps.newFile()
  await clearAll()
  break
}
```

### Pattern 3: Action Queue for In-Progress Save
**What:** If user triggers New/Close while a save is in progress, queue the action
**When to use:** Prevents race conditions when auto-save or manual save is running
**Example:**
```typescript
// Source: Standard async state machine pattern
let pendingActionAfterSave: 'new' | 'close' | null = null

ipcMain.handle('file:queueAction', (_event, action: 'new' | 'close') => {
  pendingActionAfterSave = action
})

// After save completes:
if (pendingActionAfterSave) {
  const action = pendingActionAfterSave
  pendingActionAfterSave = null
  // Trigger the queued action
  mainWindow.webContents.send(`menu:${action}`)
}
```

### Anti-Patterns to Avoid
- **Showing React modal for this confirmation:** Native dialogs are already used for close; mixing UI paradigms creates inconsistency
- **Separate dialog text for New vs Close:** Per CONTEXT.md, same dialog for both actions
- **Including document name in dialog:** Per CONTEXT.md, generic text only
- **Blocking main process synchronously:** Always use async `showMessageBox`, not `showMessageBoxSync`

## Don't Hand-Roll

This phase doesn't require any new libraries - the existing infrastructure is sufficient.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native dialog | React modal component | `dialog.showMessageBox` | Already used for close; maintains OS-native look |
| State machine for flows | Complex custom reducer | Simple flag/queue in main process | Three states (save/discard/cancel) is simple enough |
| Keyboard shortcuts for dialog | Custom key handling | Electron dialog API | Handles Enter/Escape automatically |

**Key insight:** This phase is about wiring, not building new UI. The confirmation dialog exists and works for close - extend that pattern.

## Common Pitfalls

### Pitfall 1: Renderer-Side Dialog Instead of Main Process
**What goes wrong:** Creating a React confirmation dialog for New action while using native dialog for Close
**Why it happens:** Seems simpler to handle in renderer where the action originates
**How to avoid:** Route New action through main process like Close does
**Warning signs:** Different dialog appearance between New and Close actions

### Pitfall 2: Save Success Not Triggering Original Action
**What goes wrong:** User clicks "Save" in confirmation, save completes, but New/Close doesn't happen
**Why it happens:** Missing coordination between save completion and pending action
**How to avoid:** Track pending action, fire it after save succeeds
**Warning signs:** User has to click New/Close twice after saving

### Pitfall 3: Race Condition with Auto-Save
**What goes wrong:** User clicks New while 30-second auto-save is in progress, gets confusing state
**Why it happens:** `isLoading` flag is set but confirmation dialog appears anyway
**How to avoid:** Check `isLoading` before showing confirmation; queue action if save in progress
**Warning signs:** Dialog appears but save is already happening in background

### Pitfall 4: Save As Cancellation Treated as Error
**What goes wrong:** Never-saved doc shows Save As, user cancels, treated as failure
**Why it happens:** Both "user cancelled" and "write error" return falsy result
**How to avoid:** Distinguish between `canceled: true` and actual error from file operation
**Warning signs:** Error message when user just decided not to save

### Pitfall 5: Keyboard Shortcuts Fire During Dialog
**What goes wrong:** User hits Cmd+N while confirmation dialog is open, queues another New
**Why it happens:** Menu shortcuts still active when dialog is showing
**How to avoid:** Native dialogs in main process automatically block menu; if using modal, disable shortcuts
**Warning signs:** Multiple actions queued, unexpected behavior after dialog closes

## Code Examples

### Complete New Action Handler (Main Process)
```typescript
// Source: Extending existing pattern in electron/main/index.ts

// Track pending action that triggered save
let pendingActionAfterSave: 'new' | 'close' | null = null

// Add IPC handler for dirty check before new
ipcMain.on('menu:new', async () => {
  if (!isDirty || !mainWindow) {
    // Not dirty - proceed immediately (renderer will handle)
    return
  }

  // Show confirmation dialog
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    message: 'Save changes?',
    detail: 'Your changes will be lost if you don\'t save.'
  })

  if (result.response === 0) {
    // Save - trigger save, then new after completion
    pendingActionAfterSave = 'new'
    mainWindow.webContents.send('menu:save')
  } else if (result.response === 1) {
    // Don't Save - proceed with new, discarding changes
    isDirty = false
    mainWindow.webContents.send('file:proceedWithNew')
  }
  // Cancel (response === 2): do nothing
})

// Listen for save completion to trigger pending action
ipcMain.on('save:completed', () => {
  if (pendingActionAfterSave && mainWindow) {
    const action = pendingActionAfterSave
    pendingActionAfterSave = null

    if (action === 'new') {
      mainWindow.webContents.send('file:proceedWithNew')
    } else if (action === 'close') {
      isDirty = false
      mainWindow.close()
    }
  }
})
```

### Renderer Handler for New Action
```typescript
// Source: Extending existing pattern in src/App.tsx

// Additional channel for proceeding with new after save/discard
useEffect(() => {
  if (!isElectron()) return

  const handleProceedWithNew = async () => {
    fileOps.newFile()
    await clearAll()
    sessionStorage.removeItem('ancestree-seeded')
    setSelectedMember(null)
  }

  // Subscribe to proceed signal from main process
  window.electronAPI!.on?.('file:proceedWithNew', handleProceedWithNew)

  return () => {
    window.electronAPI!.off?.('file:proceedWithNew', handleProceedWithNew)
  }
}, [fileOps, clearAll])

// Modify existing menu handler
case 'new':
  // Main process handles dirty check and shows dialog if needed
  // Only proceed if not dirty (main process will send proceedWithNew otherwise)
  if (!fileOps.isDirty) {
    fileOps.newFile()
    await clearAll()
    sessionStorage.removeItem('ancestree-seeded')
    setSelectedMember(null)
  }
  // If dirty, main process will show dialog and coordinate
  break
```

### Save Handler with Completion Signal
```typescript
// Source: Pattern for useFileOperations.ts

const save = useCallback(async (data: unknown): Promise<boolean> => {
  if (!isElectron()) return false

  setState(s => ({ ...s, isLoading: true, error: null }))

  try {
    const result = await window.electronAPI!.invoke('dialog:save', {
      data,
      filePath: state.filePath
    }) as { canceled: boolean; filePath: string | null }

    if (!result.canceled && result.filePath) {
      setState(s => ({
        ...s,
        filePath: result.filePath,
        fileName: getFileName(result.filePath),
        isDirty: false,
        isLoading: false
      }))

      // Signal to main process that save completed
      window.electronAPI!.invoke('save:completed')

      return true
    }

    setState(s => ({ ...s, isLoading: false }))
    return false
  } catch (err) {
    setState(s => ({
      ...s,
      error: (err as Error).message,
      isLoading: false
    }))
    return false
  }
}, [state.filePath])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Browser `confirm()` | `dialog.showMessageBox()` | Always in Electron | Native dialogs look better, are more accessible |
| `beforeunload` string return | `event.preventDefault()` + dialog | Electron standardized | Browser string prompts not shown in Electron |
| Sync dialog.showMessageBoxSync | Async dialog.showMessageBox | Electron best practice | Prevents UI thread blocking |

**Deprecated/outdated:**
- `onbeforeunload` string return value: Electron ignores the string, must use dialog API
- `confirm()` in `beforeunload` handler: Chrome blocks this

## Open Questions

None - the decisions in CONTEXT.md and existing codebase patterns resolve all implementation questions.

## Sources

### Primary (HIGH confidence)
- [Electron BrowserWindow docs](https://www.electronjs.org/docs/latest/api/browser-window) - close event, event.preventDefault(), win.destroy()
- [Electron dialog docs](https://www.electronjs.org/docs/latest/api/dialog) - showMessageBox API, options, button configuration
- Project codebase - `electron/main/index.ts` lines 179-206 (existing close confirmation pattern)

### Secondary (MEDIUM confidence)
- [Electron GitHub Issue #20689](https://github.com/electron/electron/issues/20689) - Confirm dialog before closing patterns
- [Electron GitHub Issue #2301](https://github.com/electron/electron/issues/2301) - beforeunload behavior in Electron

### Tertiary (LOW confidence)
- None - all patterns verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, using existing Electron/React patterns
- Architecture: HIGH - Extending proven pattern already in codebase
- Pitfalls: HIGH - Based on official docs and existing implementation experience

**Research date:** 2026-01-27
**Valid until:** 2026-03-27 (60 days - stable Electron APIs, no major changes expected)
