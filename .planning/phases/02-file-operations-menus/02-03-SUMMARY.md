---
phase: 02-file-operations-menus
plan: 03
subsystem: ui
tags: [electron, hooks, auto-save, file-operations, crash-recovery]

# Dependency graph
requires:
  - phase: 01-electron-foundation
    provides: Electron setup with secure preload and IPC
  - plan: 02-01
    provides: File dialog IPC handlers (dialog:open, dialog:save, dialog:saveAs)
  - plan: 02-02
    provides: Application menus with onMenuAction listener
provides:
  - React hook for file operations (save, open, saveAs, newFile)
  - Auto-save crash recovery system with electron-store
  - Menu event integration connecting native menus to React state
  - Dirty state tracking for unsaved changes
affects: [03-storage-migration, ui-enhancements]

# Tech tracking
tech-stack:
  added:
    - electron-store (atomic draft storage)
  patterns:
    - "useFileOperations hook for renderer file operations"
    - "Auto-save with electron-store every 30 seconds"
    - "Menu-to-hook wiring via onMenuAction subscription"

key-files:
  created:
    - electron/main/services/autoSave.ts
    - src/hooks/useFileOperations.ts
  modified:
    - electron/main/index.ts
    - electron/preload/index.ts
    - electron/preload/index.d.ts
    - src/App.tsx
    - src/vite-env.d.ts
    - package.json

key-decisions:
  - "Auto-save interval: 30 seconds (balance between safety and performance)"
  - "Draft storage via electron-store for atomic writes"
  - "Hook returns false/null in web mode for graceful degradation"
  - "Crash recovery prompts user before restoring draft"

patterns-established:
  - "File operations through useFileOperations hook, not direct IPC"
  - "Auto-save updates on tree data changes via useEffect"
  - "onMenuAction subscription in useEffect with cleanup"

# Metrics
duration: 8min
completed: 2026-01-27
---

# Phase 02 Plan 03: Dirty State and Auto-Save Summary

**React file operations hook with auto-save crash recovery and menu event integration**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-27T10:33:00Z
- **Completed:** 2026-01-27T10:36:30Z
- **Tasks:** 4
- **Files created:** 2
- **Files modified:** 6

## Accomplishments

- Installed electron-store for atomic draft storage
- Created auto-save service with 30-second interval timer
- Implemented IPC handlers for draft operations (get, clear, has, update)
- Created useFileOperations React hook with full file operation API
- Integrated hook with App.tsx for menu event handling
- Added crash recovery with user confirmation dialog

## Task Commits

Each task was committed atomically:

1. **Task 1: Install electron-store and Create Auto-Save Service** - `dfa8869` (feat)
2. **Task 2: Extend Preload with Auto-Save Channels** - `ee50cdf` (feat)
3. **Task 3: Create useFileOperations React Hook** - `bc9750f` (feat)
4. **Task 4: Wire Menu Events to Hook in App.tsx** - `5ef9b6c` (feat)

## Files Created/Modified

**Created:**
- `electron/main/services/autoSave.ts` - Auto-save service with electron-store, 30s interval
- `src/hooks/useFileOperations.ts` - React hook for save/open/saveAs/newFile operations

**Modified:**
- `electron/main/index.ts` - Register auto-save handlers, start/stop timer on lifecycle
- `electron/preload/index.ts` - Added autosave:* channels to ALLOWED_CHANNELS
- `electron/preload/index.d.ts` - Exported AutoSaveData interface
- `src/App.tsx` - Integrated useFileOperations, menu event subscription, crash recovery
- `src/vite-env.d.ts` - Added onMenuAction to ElectronAPI type
- `package.json` - Added electron-store dependency

## Key Integrations

**Menu -> Hook -> Data flow:**
```
Native Menu Click
    -> webContents.send('menu:save')
    -> onMenuAction('save')
    -> fileOps.save(treeData)
    -> IPC 'dialog:save'
    -> Native save dialog
```

**Auto-save flow:**
```
Tree data changes
    -> useEffect triggers
    -> fileOps.markDirty()
    -> fileOps.updateAutoSave(data)
    -> IPC 'autosave:update'
    -> electron-store writes draft
```

**Crash recovery flow:**
```
App mount
    -> checkForDraft()
    -> User confirms recovery
    -> Load draft into tree state
    -> clearDraft()
```

## Decisions Made

- **30-second auto-save interval**: Balances data safety with write frequency
- **Atomic draft storage**: electron-store provides crash-safe writes
- **Graceful web fallback**: Hook returns false/null when not in Electron
- **User confirmation for recovery**: Avoids silent data replacement

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Type duplication**: ElectronAPI interface was defined in both `vite-env.d.ts` and `electron/preload/index.d.ts`. Added `onMenuAction` to `vite-env.d.ts` since that's what the renderer uses.
- **FamilyMember fields**: Plan referenced `placeOfDeath` which doesn't exist in the model. Fixed to use actual fields.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- File operations complete and ready for use
- Phase 2 (File Operations and Menus) is now complete
- Phase 3 (Storage Layer) can begin - may need to extend file format for relationships with ID mapping

---
*Phase: 02-file-operations-menus*
*Completed: 2026-01-27*
