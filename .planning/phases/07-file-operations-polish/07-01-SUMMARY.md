---
phase: 07-file-operations-polish
plan: 01
subsystem: file-operations
tags: [electron, ipc, dirty-state, dialog, file-new]

# Dependency graph
requires:
  - phase: 02-native-file-dialogs
    provides: "Dirty state tracking and close confirmation dialog"
provides:
  - "Dirty check for New menu action"
  - "Save-then-continue coordination flow"
  - "file:proceedWithNew IPC channel"
  - "save:completed IPC notification"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pendingActionAfterSave pattern for coordinated save-then-action flows"
    - "confirmDiscardChanges helper for consistent confirmation dialogs"

key-files:
  created: []
  modified:
    - electron/main/index.ts
    - electron/preload/index.ts
    - electron/preload/index.d.ts
    - src/vite-env.d.ts
    - src/App.tsx

key-decisions:
  - "pendingActionAfterSave state for save-then-continue flow"
  - "file: prefix for non-menu IPC channels"
  - "save:completed invoke channel for fire-and-forget notification"

patterns-established:
  - "pendingActionAfterSave pattern: Track pending action, trigger after save completion"
  - "confirmDiscardChanges helper: Reusable dialog for save/discard/cancel confirmation"

# Metrics
duration: 5min
completed: 2026-01-27
---

# Phase 07 Plan 01: New Action Dirty Check Summary

**Dirty check for New menu action with automatic save-then-continue coordination via pendingActionAfterSave pattern**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-27T17:57:00Z
- **Completed:** 2026-01-27T18:02:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- New menu action now prompts to save when document is dirty
- Save-then-continue flow works automatically (user clicks Save, dialog closes, New proceeds)
- Don't Save option discards changes and proceeds with New immediately
- Cancel option returns to current document without action
- Existing close confirmation continues working unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add file:proceedWithNew channel to preload allowlist and types** - `2ad2bd8` (feat)
2. **Task 2: Extend setupDirtyStateHandling() for New action coordination** - `9c0dbcb` (feat)
3. **Task 3: Handle proceedWithNew event and signal save completion in renderer** - `42fdb1b` (feat)

## Files Created/Modified
- `electron/preload/index.ts` - Added file:proceedWithNew to receive channels, save:completed to invoke channels, updated onMenuAction handler
- `electron/preload/index.d.ts` - Updated onMenuAction documentation with proceedWithNew action
- `src/vite-env.d.ts` - Updated onMenuAction documentation with proceedWithNew action
- `electron/main/index.ts` - Added pendingActionAfterSave state, confirmDiscardChanges helper, menu:new handler, save:completed handler
- `src/App.tsx` - Added proceedWithNew case, updated menu:new to check dirty state, updated menu:save to signal completion

## Decisions Made
- **pendingActionAfterSave state**: Module-level variable tracks whether to proceed with 'new' or 'close' after save completes. Simple and effective for coordinating multi-step flows.
- **file: prefix for non-menu channels**: Distinguished from menu: prefix to indicate these are file operation events rather than direct menu actions.
- **save:completed as invoke channel**: Fire-and-forget notification from renderer to main process. No return value needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated onMenuAction handler for file: prefix**
- **Found during:** Task 1 (Preload allowlist update)
- **Issue:** Existing handler used `channel.replace('menu:', '')` which wouldn't work for `file:proceedWithNew`
- **Fix:** Updated to `channel.split(':')[1]` to extract action name from any prefix
- **Files modified:** electron/preload/index.ts
- **Verification:** Build passes, action name correctly extracted
- **Committed in:** 2ad2bd8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix was necessary for correct operation. No scope creep.

## Issues Encountered
- Pre-existing lint errors in codebase (unused variables, out/ directory not ignored) - not related to this plan

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Dirty check for New action complete
- All file operations now have proper data loss protection
- Ready for additional file operation polish tasks if any

---
*Phase: 07-file-operations-polish*
*Completed: 2026-01-27*
