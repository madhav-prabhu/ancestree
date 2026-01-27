---
phase: 02-file-operations-menus
plan: 05
subsystem: ipc
tags: [electron, dirty-state, window-title, close-confirmation, document-edited]

# Dependency graph
requires:
  - phase: 01-electron-foundation
    provides: Electron setup with secure preload and IPC
  - plan: 02-03
    provides: useFileOperations hook with isDirty and filePath state
provides:
  - Dirty state IPC handlers (document:setDirty, document:getDirty)
  - Window title dirty indicator (asterisk on Windows/Linux, dot on macOS)
  - Close confirmation dialog for unsaved changes
  - React-to-main-process dirty state synchronization
affects: [ui-enhancements, auto-save-improvements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dirty state synced from React hook to main process via IPC"
    - "Platform-specific window indicators (setDocumentEdited on macOS)"
    - "Close event interception with dialog.showMessageBox"

key-files:
  created: []
  modified:
    - electron/main/index.ts
    - electron/main/ipc/fileHandlers.ts
    - electron/preload/index.ts
    - src/App.tsx

key-decisions:
  - "macOS uses setDocumentEdited (dot in close button) instead of title asterisk"
  - "Windows/Linux show asterisk in window title when dirty"
  - "Close confirmation offers Save/Don't Save/Cancel options"
  - "Save option delegates to renderer (sends menu:save event)"

patterns-established:
  - "Dirty state as module-level variable in main process"
  - "useEffect in App.tsx syncs isDirty changes to main process"
  - "Window title format: '{filename}{indicator} - Ancestree'"

# Metrics
duration: 5min
completed: 2026-01-27
---

# Phase 02 Plan 05: Dirty State and Close Confirmation Summary

**Window dirty indicators and close confirmation dialog prevent data loss from unsaved changes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-27T15:38:59Z
- **Completed:** 2026-01-27T15:39:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Dirty state IPC handlers in main process track unsaved changes
- Window title shows dirty indicator (asterisk on Win/Linux, dot on macOS)
- Close confirmation dialog with Save/Don't Save/Cancel options
- React hook state synced to main process via useEffect
- Phase 2 (File Operations and Menus) complete

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Dirty State IPC Handlers and Close Confirmation** - `576129e` (feat)
2. **Task 2: Wire Dirty State from App.tsx to Main Process** - `5d2d380` (feat)

## Files Created/Modified

- `electron/main/index.ts` - Module-level isDirty tracking, setDocumentEdited, close event handler
- `electron/main/ipc/fileHandlers.ts` - document:setDirty and document:getDirty IPC handlers
- `electron/preload/index.ts` - Added document:setDirty and document:getDirty to ALLOWED_CHANNELS
- `src/App.tsx` - useEffect syncs fileOps.isDirty and fileOps.filePath to main process

## Platform-Specific Behavior

**macOS:**
- `setDocumentEdited(true)` shows dot in close button
- Window title has no asterisk (dot is sufficient)

**Windows/Linux:**
- Window title shows asterisk: "Untitled * - Ancestree"
- No close button dot

**All platforms:**
- Close with unsaved changes shows dialog with 3 options
- Save delegates to renderer (sends 'menu:save' event)
- Don't Save clears dirty flag and forces close
- Cancel keeps window open

## Integration Flow

**React -> Main Process sync:**
```
fileOps.isDirty changes
    -> useEffect triggers
    -> window.electronAPI.invoke('document:setDirty', isDirty, filePath)
    -> Main process updates:
        - isDirty module variable
        - setDocumentEdited(dirty) on macOS
        - setTitle() with platform-specific indicator
```

**Close confirmation:**
```
User clicks close (X button or Cmd/Ctrl+W)
    -> close event fires
    -> If !isDirty: allow close
    -> If isDirty: event.preventDefault()
        -> showMessageBox with Save/Don't Save/Cancel
        -> Save: send 'menu:save' to renderer
        -> Don't Save: clear dirty, close window
        -> Cancel: do nothing
```

## Decisions Made

- **Platform-specific indicators**: macOS uses native setDocumentEdited API (dot in close button), Windows/Linux use title asterisk
- **Save delegation**: Close confirmation's "Save" option sends event to renderer rather than duplicating save logic in main process
- **Module-level state**: isDirty and currentFilePath tracked as module variables in main process for access across handlers and event listeners
- **Title format**: Always includes app name ("Ancestree") for brand consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 2 (File Operations and Menus) Complete:**
- ✅ Native file dialogs (Open, Save, Save As, Export)
- ✅ Application menus with keyboard shortcuts
- ✅ GEDCOM export
- ✅ Auto-save crash recovery
- ✅ Dirty state tracking and close confirmation

**Ready for Phase 3:**
- Storage layer migration from in-memory to Dexie.js (IndexedDB)
- File operations infrastructure established and tested
- Dirty state system can integrate with database persistence

---
*Phase: 02-file-operations-menus*
*Completed: 2026-01-27*
