---
phase: 08-fix-ui-bugs
plan: 02
subsystem: ui
tags: [react, three.js, physics, drag-and-drop, persistence]

# Dependency graph
requires:
  - phase: 03-storage-bridge
    provides: IndexedDB storage via Dexie.js, updateMember function
provides:
  - Node position persistence after drag
  - Position field on FamilyMember model
  - onPositionChange callback in PhysicsContext
  - Position merge in TreeScene layout
affects: [export-import, file-operations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Callback prop drilling for physics events
    - Position overlay on calculated layout

key-files:
  created: []
  modified:
    - src/models/FamilyMember.ts
    - src/scene/galaxy/PhysicsContext.tsx
    - src/scene/TreeScene.tsx
    - src/App.tsx

key-decisions:
  - "Optional position field on FamilyMember for backward compatibility"
  - "Position merge: persisted positions overlay calculated layout"
  - "onPositionChange callback called on endDrag for persistence"

patterns-established:
  - "Position persistence: onPositionChange callback from physics layer to App"
  - "Position merge: calculated layout, then overlay member.position if present"

# Metrics
duration: 6min
completed: 2026-01-31
---

# Phase 8 Plan 2: Node Position Persistence Summary

**Drag position persistence via optional FamilyMember.position field with callback wiring from PhysicsContext through TreeScene to App**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-31T17:43:00Z
- **Completed:** 2026-01-31T17:49:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- FamilyMember model extended with optional position field for drag positions
- PhysicsContext calls onPositionChange on drag end with new position
- TreeScene merges persisted positions with calculated layout
- App.tsx wires position changes to updateMember for persistence
- Positions automatically included in JSON exports (part of FamilyMember interface)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add position field to FamilyMember model** - `e7fc9ac` (feat)
2. **Task 2: Add onPositionChange callback to PhysicsContext** - `d3be7a2` (feat)
3. **Task 3: Wire position persistence in TreeScene and App** - `2e550ea` (feat)

## Files Created/Modified
- `src/models/FamilyMember.ts` - Added optional position field for custom drag positions
- `src/scene/galaxy/PhysicsContext.tsx` - Added onPositionChange prop and callback invocation on endDrag
- `src/scene/TreeScene.tsx` - Added onPositionChange prop threading and position merge logic
- `src/App.tsx` - Added handlePositionChange handler that persists via updateMember

## Decisions Made
- **Optional position field**: Added as optional so old exports/imports work without migration
- **Position merge strategy**: Calculate layout first, then overlay any persisted positions from members
- **Callback invocation**: Call onPositionChange at endDrag (after anchor update) for single save per drag

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Node position persistence complete
- Ready for Phase 8 Plan 1 (relationship persistence bug fix)
- Export/import automatically includes positions (TypeScript interface)

---
*Phase: 08-fix-ui-bugs*
*Completed: 2026-01-31*
