# Codebase Concerns

**Analysis Date:** 2026-01-26

## Tech Debt

**Session Storage for Seeding Flag:**
- Issue: Uses `sessionStorage` to prevent duplicate seeding on app load. This is a workaround rather than proper initialization logic.
- Files: `src/App.tsx` (lines 100-117)
- Impact: If page is refreshed before initial data loads, may cause duplicate seed data; session storage is ephemeral and won't survive browser restart
- Fix approach: Replace with a database-level check (e.g., add `isSeeded` flag to storage, or check if members table is empty before seeding)

**Layout Algorithm Complexity:**
- Issue: Tree layout calculation is complex (~580 lines) and handles multiple edge cases (disconnected nodes, generation assignment, overlapping prevention)
- Files: `src/scene/layout/treeLayout.ts`
- Impact: Algorithm is difficult to maintain and modify; no documentation of coordinate system assumptions; scaling unknown for very large trees
- Fix approach: Add detailed algorithm documentation; break into smaller helper functions; add performance profiling for large datasets

**Import/Export Validation Incomplete:**
- Issue: Import validation checks structure but doesn't validate business logic (e.g., circular parent chains, impossible age relationships)
- Files: `src/utils/importUtils.ts` (lines 26-126)
- Impact: Invalid family trees could be imported and silently skip relationships; no user feedback on why relationships were rejected during import
- Fix approach: Run full familyService validation during import; collect and report all validation errors before import; provide detailed failure reasons

**Relationship Lookup Performance:**
- Issue: `findExistingRelationship()` in familyService loads ALL relationships then filters in memory
- Files: `src/services/familyService.ts` (lines 277-298)
- Impact: O(n) operation per relationship check; scales poorly with large family trees (hundreds/thousands of relationships)
- Fix approach: Add indexed queries to DexieStorage (query by person1Id + type, person2Id + type)

## Fragile Areas

**MiniMap Three.js Resources:**
- Issue: ViewportIndicator creates Three.js geometry and material resources in useMemo, relies on useEffect cleanup. Memory leaks possible if component unmounts before useEffect runs.
- Files: `src/scene/MiniMap.tsx` (lines 74-107)
- Impact: Potential memory leak if MiniMap is rapidly toggled; WebGL context could accumulate undisposed resources
- Safe modification: Test rapid visibility toggling; add ref-based disposal pattern; consider using a ref to track geometry/material lifecycle

**Member Detail Panel Relationship Loading:**
- Issue: Complex relationship mapping logic (lines 129-161) with multiple conditional branches for parent/child ordering. Easy to introduce bugs when modifying relationship types.
- Files: `src/components/MemberDetailPanel.tsx` (lines 111-175)
- Impact: Bugs in relationship display could cause incorrect relationships shown or relationships not appearing; affects UI trust
- Safe modification: Add comprehensive test cases for each relationship type combination; use type-safe relationship type discrimination

**Camera Controller Navigation:**
- Issue: Multiple focus mechanisms (keyboard, mouse, minimap) interact with OrbitControls reference; complex state management with external refs
- Files: `src/scene/CameraController.tsx` (full file), `src/App.tsx` (lines 78-107)
- Impact: Camera behavior is unpredictable when multiple navigation sources trigger simultaneously; race conditions possible
- Safe modification: Add state machine for camera control priority; test rapid mouse + keyboard + minimap interactions; add e2e tests for camera behavior

**Date Validation Regex:**
- Issue: Simple regex `/^\d{4}-\d{2}-\d{2}$/` validates format but `new Date(dateString)` can parse invalid dates (e.g., "2025-02-30")
- Files: `src/services/familyService.ts` (lines 35-41)
- Impact: Invalid dates silently accepted; may cause calculation errors in age computation or ancestor traversal
- Safe modification: Add additional validation: `date.getFullYear() === year && date.getMonth() === month-1 && date.getDate() === day`

## Performance Bottlenecks

**Ancestor/Descendant Traversal Without Memoization:**
- Issue: `getAncestors()` and `getDescendants()` load all parent/child relationships for each node in the traversal
- Files: `src/services/familyService.ts` (lines 458-504)
- Impact: Exponential queries for deep family trees (e.g., 10 generations = 1000+ database queries per traversal); noticeable lag on medium trees
- Improvement path: Cache visited relationships; batch load relationships for traversal; consider materialized paths (denormalized ancestor chains)

**MemberDetailPanel Loads All Relationships Per Member:**
- Issue: Always calls `getRelationshipsForMember()` which loads all relationships, then filters. Happens on every member selection.
- Files: `src/components/MemberDetailPanel.tsx` (lines 116-118)
- Impact: Unnecessary queries; lags when tree has thousands of relationships; no pagination or lazy loading
- Improvement path: Add indexed query by memberId; implement pagination if needed; cache relationship sets

**3D Scene Re-renders on Every Data Change:**
- Issue: TreeScene recalculates layout on every members/relationships change via useMemo
- Files: `src/scene/TreeScene.tsx` (lines 163-175)
- Impact: Large trees become slow when adding/editing members (full layout recalculation); visible stutter during input
- Improvement path: Implement incremental layout updates; use web worker for layout calculation; profile with DevTools

**Import Creates N Relations During Spouse Connection:**
- Issue: `connectSpouseToChildren()` makes serial database calls for each spouse-child relationship
- Files: `src/services/familyService.ts` (lines 247-271)
- Impact: Importing a tree with complex marriages is slow; no batch operation
- Improvement path: Collect all relationships to create, then batch-insert; use Dexie transaction optimization

## Security Considerations

**Base64 Photo Storage Without Size Limit:**
- Risk: Users can upload arbitrarily large photos; Base64 encoding inflates data by 33%; IndexedDB quota is browser-dependent
- Files: `src/models/FamilyMember.ts` (line 11), `src/components/AddMemberModal.tsx` (photo upload section)
- Current mitigation: None
- Recommendations: Add file size limit (e.g., 2MB max); add image compression before storage; warn user of quota usage; implement cleanup strategy for old photos

**No Input Sanitization on Notes Field:**
- Risk: Notes field allows arbitrary strings; could contain malicious content if tree is shared (future cloud migration)
- Files: `src/components/MemberDetailPanel.tsx` (line 318, rendered as `whitespace-pre-wrap`)
- Current mitigation: Client-only, no server execution risk currently
- Recommendations: Add HTML sanitization if cloud migration happens; consider markdown escaping for future rich text

**Export File Contains Raw Data:**
- Risk: Exported JSON has no encryption; could be intercepted; contains all dates and names in plaintext
- Files: `src/utils/exportUtils.ts`
- Current mitigation: None
- Recommendations: Add encryption option for exports (user-provided password); warn users before export; add data minimization option

**IndexedDB Access Unrestricted:**
- Risk: IndexedDB is per-origin but any code in origin can access all family data (no per-user authentication)
- Files: `src/services/storage/DexieStorage.ts`
- Current mitigation: Browser same-origin policy
- Recommendations: Add user-level encryption when cloud backend is added; don't rely on browser security for sensitive genealogy data

## Scaling Limits

**Single Database Instance:**
- Current capacity: Works well up to ~1,000 members (measured informally); Dexie v4 handles large IndexedDB well
- Limit: Browser IndexedDB quota (50MB typical, varies by browser); queries become slow at 10,000+ members
- Scaling path: Implement virtual scrolling for lists; add query pagination; consider service worker or server-based sync

**Layout Algorithm Coordinates:**
- Current capacity: Handles trees with generations 5-10 levels deep; coordinates can exceed ±1000 units
- Limit: No bounds checking; negative coordinates possible; 3D scene camera doesn't auto-fit very large trees
- Scaling path: Implement coordinate normalization; use logarithmic spacing for deep trees; add camera auto-fit improvement

**Memory Usage in 3D Scene:**
- Current capacity: 500+ nodes render smoothly; Chrome GPU memory ~100MB typical
- Limit: No LOD (level of detail); all nodes rendered every frame; no frustum culling
- Scaling path: Implement node pooling; add frustum culling via Three.js; reduce detail for distant nodes; add scene memory monitoring

## Test Coverage Gaps

**MiniMap Drag Interaction:**
- What's not tested: ViewportIndicator geometry updates; drag throttling logic; bounds clamping during drag
- Files: `src/scene/MiniMap.tsx`
- Risk: Drag behavior could regress silently; throttling might not work as expected
- Priority: Medium (visual feature but important for UX)

**Import Relationship Deduplication:**
- What's not tested: Handling of duplicate relationships in import (e.g., importing same tree twice); bidirectional relationship handling
- Files: `src/utils/importUtils.ts`
- Risk: Could create duplicate relationships; could fail silently in import workflow
- Priority: High (data integrity issue)

**Ancestor/Descendant Graph Cycles:**
- What's not tested: Very complex cycle detection scenarios; performance of cycle detection on large trees
- Files: `src/services/familyService.ts` (lines 322-325)
- Risk: Cycle detection could fail or be slow on unusual graph structures
- Priority: High (data corruption risk)

**Camera Controller Keyboard Navigation:**
- What's not tested: Rapid key presses; conflicting inputs (arrow left + arrow right); interaction with mouse controls
- Files: `src/scene/CameraController.tsx`
- Risk: Camera could jump unexpectedly; keyboard nav could be disabled by mouse interaction
- Priority: Medium (UX feature)

**Date Edge Cases:**
- What's not tested: Leap year dates (Feb 29); century boundaries; very old dates (year 1000); future dates; null/undefined handling
- Files: `src/services/familyService.ts` (date validation), `src/utils/dateUtils.ts`
- Risk: Age calculations could be wrong; date comparisons could fail; export/import could lose dates
- Priority: Medium (correctness issue)

**localStorage vs IndexedDB Boundary:**
- What's not tested: Storage quota exceeded scenarios; storage disabled (private browsing); quota upgrade scenarios
- Files: `src/App.tsx` (sessionStorage), `src/services/storage/DexieStorage.ts`
- Risk: App could fail silently when storage unavailable; no fallback
- Priority: Low (browser-level issue but affects users on quota)

## Known Issues

**Empty State Not Updated After Delete Last Member:**
- Symptoms: After deleting all members, detail panel may stay visible; empty state banner may not show
- Files: `src/App.tsx` (lines 120-130 updates selected member, but detail panel state not reset)
- Trigger: Create member → delete member → detail panel still visible
- Workaround: Close detail panel manually or select another member

**MiniMap May Render Off-Canvas:**
- Symptoms: MiniMap appears in wrong position when sidebar is toggled quickly
- Files: `src/App.tsx` (lines 351, dynamic left calculation)
- Trigger: Rapid sidebar collapse/expand
- Workaround: Wait for sidebar animation to complete before toggling minimap

**Relationship Deletion During Bulk Import:**
- Symptoms: Some relationships silently fail to create during import (logged as console.warn, not shown to user)
- Files: `src/utils/importUtils.ts` (lines 224-236)
- Trigger: Import tree with relationships that violate new constraints (e.g., spouse becomes parent-child)
- Workaround: Manual re-import or manual relationship creation

## Dependencies at Risk

**Three.js Version Pinning:**
- Risk: Three.js is pinned to ^0.176.0; major versions have breaking changes
- Impact: Cannot upgrade easily; may miss security fixes and performance improvements
- Migration plan: Consider semantic versioning; add compatibility layer if upgrade needed; test heavily before upgrade

**Dexie React Hooks Package:**
- Risk: `dexie-react-hooks` is small package; may have maintenance risk
- Impact: Custom hook `useFamilyData` would need refactor if package abandoned
- Migration plan: Code already abstractable to pure React hooks + context; could migrate without Dexie hooks if needed

**react-router-dom Version Jump:**
- Risk: Updated to ^7.12.0 (major version); routing API changed significantly
- Impact: If Router breaks, need significant refactor
- Migration plan: Good separation of routing in `src/Router.tsx`; upgrade went smooth, low risk now

## Missing Critical Features

**No Undo/Redo for Deletions:**
- Problem: Deleting member is permanent; only manual re-add is recovery option
- Blocks: Safe data editing; production readiness
- Recommendation: Add soft deletes (mark deleted, hide from UI); implement undo stack; persist undo history to IndexedDB

**No Data Validation UI Errors:**
- Problem: Validation errors from familyService are caught but UI shows generic "Error" without details
- Blocks: Users can't understand why operations failed (e.g., "parent must be older than child")
- Recommendation: Pass ValidationError messages to UI; show specific error messages in modals; use error boundary

**No Bulk Operations UI:**
- Problem: Can't batch edit (e.g., change all birthdates for a branch); must edit one by one
- Blocks: Efficient data management for large trees
- Recommendation: Add bulk edit mode; implement batch selection

**No Cloud Sync (Future Blocker):**
- Problem: Storage is IndexedDB-only; no cloud backup, no cross-device sync, no sharing
- Blocks: Production deployment; cross-device usage; sharing with family
- Recommendation: StorageInterface is ready for cloud backend; implement Firebase/Supabase provider; add conflict resolution strategy

---

*Concerns audit: 2026-01-26*
