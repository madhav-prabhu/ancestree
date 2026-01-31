# Phase 8: Fix UI Bugs - Research

**Researched:** 2026-01-31
**Domain:** Data Persistence & State Management (Bug Fixes)
**Confidence:** HIGH

## Summary

This phase addresses two bugs discovered during testing:

1. **Relationships lost on refresh** - When refreshing an unsaved board, relationships disappear
2. **Node positions not persisting** - After dragging nodes to new positions, they reset to layout-calculated positions on save/refresh

Root cause analysis reveals these are architectural issues, not simple bugs:

1. **Relationship Bug**: The app imports members by calling `addMember()` which creates NEW IDs. The old relationship `person1Id`/`person2Id` references become invalid because they point to old (now non-existent) member IDs. The import code in `App.tsx` (lines 122-133) has a comment explicitly acknowledging this: "Note: Relationships would need ID mapping - for now skip"

2. **Position Bug**: Node positions are calculated algorithmically by `calculateTreeLayout()` on every render based on members and relationships. The physics layer (`PhysicsContext.tsx`) tracks `anchorPosition` for dragged nodes, but this is in-memory only. Positions are never persisted to storage. When the app refreshes, positions are recalculated from scratch.

**Primary recommendation:** Fix the relationship import to use ID mapping (already implemented in `importFromJson()`), and extend the data model to persist custom node positions.

## Standard Stack

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie.js | ^4.x | IndexedDB wrapper | Already used for storage |
| React | 19 | UI framework | Already used |
| Three.js | via r3f | 3D rendering | Already used |

### Supporting (No New Dependencies Needed)
This is a bug fix phase. No new libraries required - solutions use existing stack.

## Architecture Patterns

### Recommended Fix Structure

```
src/
├── models/
│   └── FamilyMember.ts    # Add optional position?: {x, y, z} field
├── services/
│   └── storage/
│       └── DexieStorage.ts # DB schema v2 to support position field
├── scene/
│   ├── TreeScene.tsx       # Merge persisted + calculated positions
│   └── galaxy/
│       └── PhysicsContext.tsx # Callback to persist position on drag end
└── App.tsx                 # Fix relationship import (use proper ID mapping)
```

### Pattern 1: ID Mapping for Relationship Import
**What:** Map old IDs to new IDs during import, update relationship references
**When to use:** When importing members that already have relationships
**Example:**
```typescript
// Already implemented in src/utils/importUtils.ts lines 186-237
// The App.tsx open handler (lines 122-133) bypasses this and loses relationships

// Current broken code in App.tsx:
for (const member of fileData.members || []) {
  await addMember({...}) // Creates NEW ID, loses old ID
}
// Note: Relationships would need ID mapping - for now skip

// Fix: Either use importFromJson() or replicate ID mapping logic
const idMapping = new Map<string, string>()
for (const member of fileData.members || []) {
  const newMember = await addMember({...})
  idMapping.set(member.id, newMember.id)
}
for (const rel of fileData.relationships || []) {
  const newPerson1Id = idMapping.get(rel.person1Id)
  const newPerson2Id = idMapping.get(rel.person2Id)
  if (newPerson1Id && newPerson2Id) {
    await addRelationship(rel.type, newPerson1Id, newPerson2Id, metadata)
  }
}
```

### Pattern 2: Position Persistence
**What:** Store custom node positions alongside family member data
**When to use:** When user drags a node to a custom position
**Example:**
```typescript
// Option A: Add position field to FamilyMember model
interface FamilyMember {
  id: string
  name: string
  // ... existing fields
  position?: { x: number; y: number; z: number } // NEW: custom position
}

// Option B: Separate positions table (more flexible)
interface NodePosition {
  memberId: string
  x: number
  y: number
  z: number
  updatedAt: string
}

// In PhysicsContext.tsx endDrag callback:
const endDrag = useCallback((id: string) => {
  const node = nodesRef.current.get(id)
  if (node) {
    node.isDragging = false
    node.anchorPosition.copy(node.position)
    // NEW: Persist position
    onPositionChange?.(id, {
      x: node.position.x,
      y: node.position.y,
      z: node.position.z
    })
  }
}, [onPositionChange])
```

### Pattern 3: Position Merging
**What:** Merge persisted positions with calculated layout
**When to use:** On TreeScene initialization
**Example:**
```typescript
// In TreeScene.tsx
const mergedPositions = useMemo(() => {
  const calculated = calculateTreeLayout(members, relationships)
  // Overlay persisted positions
  for (const member of members) {
    if (member.position) {
      calculated.set(member.id, member.position)
    }
  }
  return calculated
}, [members, relationships])
```

### Anti-Patterns to Avoid
- **Storing positions in localStorage**: App uses IndexedDB via Dexie; mixing storage mechanisms creates sync issues
- **Re-calculating positions on every state change**: Expensive and loses custom positions
- **Bypassing the import utility**: `importFromJson()` already handles ID mapping correctly

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID mapping | Custom mapping logic in App.tsx | `importFromJson()` from utils | Already handles edge cases, validation |
| IndexedDB migrations | Manual schema updates | Dexie version upgrade | Dexie handles migration automatically |
| Position storage | localStorage/custom | Extend FamilyMember model | Keeps data together, exports/imports cleanly |

**Key insight:** The relationship import bug exists because `App.tsx` open handler duplicates import logic instead of using the existing `importFromJson()` utility which already handles ID mapping correctly.

## Common Pitfalls

### Pitfall 1: Breaking Existing Exports
**What goes wrong:** Adding position field breaks import of old export files
**Why it happens:** Old exports don't have position field
**How to avoid:** Make position field optional, handle undefined gracefully
**Warning signs:** Import failures with old JSON files

### Pitfall 2: Database Schema Migration Issues
**What goes wrong:** Dexie fails to open database after schema change
**Why it happens:** Improper version upgrade, missing migration
**How to avoid:** Increment Dexie version, use upgrade() for data migration if needed
**Warning signs:** "UpgradeError" in console, blank data after update

### Pitfall 3: Race Condition in Position Save
**What goes wrong:** Rapid drags cause multiple saves, final position incorrect
**Why it happens:** Async save operations interleave
**How to avoid:** Debounce position saves, only save on drag end (not during)
**Warning signs:** Nodes jumping to wrong positions after drag

### Pitfall 4: Memory Leak in Physics Context
**What goes wrong:** Physics nodes accumulate, performance degrades
**Why it happens:** Nodes not cleaned up when members deleted
**How to avoid:** Already handled in PhysicsContext lines 76-78, but verify cleanup path
**Warning signs:** Growing memory usage, slow performance over time

## Code Examples

### Bug 1 Fix: Relationship Import (App.tsx)
```typescript
// Current code (lines 115-134) creates members without relationships
// Replace with call to importFromJson or replicate its ID mapping

case 'open': {
  const data = await fileOps.open()
  if (data) {
    const fileData = data as AncestreeExport
    // Use existing import utility that handles ID mapping
    await importFromJson(
      new Blob([JSON.stringify(fileData)], { type: 'application/json' }),
      clearAll,
      addMember,
      addRelationship
    )
    setSelectedMember(null)
  }
  break
}

// Or if avoiding file conversion, replicate ID mapping:
const idMapping = new Map<string, string>()
for (const member of fileData.members || []) {
  const newMember = await addMember({
    name: member.name,
    dateOfBirth: member.dateOfBirth,
    placeOfBirth: member.placeOfBirth,
    dateOfDeath: member.dateOfDeath,
    notes: member.notes,
    photo: member.photo,
  })
  idMapping.set(member.id, newMember.id)
}

// Import relationships with mapped IDs
for (const rel of fileData.relationships || []) {
  const newPerson1Id = idMapping.get(rel.person1Id)
  const newPerson2Id = idMapping.get(rel.person2Id)
  if (newPerson1Id && newPerson2Id) {
    try {
      await addRelationship(
        rel.type,
        newPerson1Id,
        newPerson2Id,
        { marriageDate: rel.marriageDate, divorceDate: rel.divorceDate }
      )
    } catch (err) {
      // Skip duplicates (auto-created by addRelationship logic)
      console.warn('Skipped relationship:', err)
    }
  }
}
```

### Bug 2 Fix: Position Persistence

**Step 1: Extend FamilyMember model**
```typescript
// src/models/FamilyMember.ts
export interface FamilyMember {
  id: string
  name: string
  dateOfBirth?: string
  placeOfBirth?: string
  dateOfDeath?: string
  notes?: string
  photo?: string
  position?: { x: number; y: number; z: number }  // NEW
  createdAt: string
  updatedAt: string
}
```

**Step 2: No Dexie schema change needed**
```typescript
// DexieStorage.ts - No schema change required!
// Dexie stores objects as-is, new optional fields work automatically
// Only need version bump if adding indexes
```

**Step 3: Add position update to familyService**
```typescript
// src/services/familyService.ts
async updateMemberPosition(
  id: string,
  position: { x: number; y: number; z: number }
): Promise<FamilyMember> {
  return this.updateMember(id, { position })
}
```

**Step 4: Add callback to PhysicsContext**
```typescript
// src/scene/galaxy/PhysicsContext.tsx
interface PhysicsProviderProps {
  positions: Map<string, { x: number; y: number; z: number }>
  relationships: Array<{ person1Id: string; person2Id: string }>
  onPositionChange?: (id: string, pos: { x: number; y: number; z: number }) => void  // NEW
  children: React.ReactNode
}

// In endDrag:
const endDrag = useCallback((id: string) => {
  const node = nodesRef.current.get(id)
  if (node) {
    node.isDragging = false
    node.anchorPosition.copy(node.position)
    // Persist the new position
    onPositionChange?.(id, {
      x: node.position.x,
      y: node.position.y,
      z: node.position.z
    })
  }
}, [onPositionChange])
```

**Step 5: Use persisted positions in TreeScene**
```typescript
// src/scene/TreeScene.tsx
const positions = useMemo(() => {
  const calculated = calculateTreeLayout(members, relationships)
  // Overlay saved positions
  for (const member of members) {
    if (member.position) {
      calculated.set(member.id, member.position)
    }
  }
  return calculated
}, [members, relationships])

// Pass callback to PhysicsProvider
<PhysicsProvider
  positions={positions}
  relationships={relationships}
  onPositionChange={(id, pos) => updateMember(id, { position: pos })}
>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ignore position on import | ID mapping in importFromJson | Already implemented | App.tsx bypasses it |
| Calculate-only positions | Persist custom positions | Needs implementation | User drag persistence |

**Current State:**
- `importFromJson()` correctly handles ID mapping but isn't used by Electron open handler
- Positions are purely calculated, never persisted

## Open Questions

1. **Should position reset button exist?**
   - What we know: Users might want to reset to algorithmic layout
   - What's unclear: UI/UX for triggering reset
   - Recommendation: Add "Reset Layout" option, sets position to undefined for all members

2. **Auto-save interaction with position changes**
   - What we know: Auto-save triggers every 30 seconds when dirty
   - What's unclear: Should position changes mark document dirty?
   - Recommendation: Yes, position is user data - treat same as other edits

3. **Export format for positions**
   - What we know: AncestreeExport includes full FamilyMember objects
   - What's unclear: Already includes position if we add to model
   - Recommendation: No change needed - position exports automatically

## Sources

### Primary (HIGH confidence)
- `/home/madhav/projects/ancestree/src/App.tsx` - Current open handler with TODO comment (lines 115-134)
- `/home/madhav/projects/ancestree/src/utils/importFromJson.ts` - Working ID mapping (lines 186-237)
- `/home/madhav/projects/ancestree/src/scene/galaxy/PhysicsContext.tsx` - In-memory position management
- `/home/madhav/projects/ancestree/src/scene/layout/treeLayout.ts` - Position calculation algorithm
- `/home/madhav/projects/ancestree/src/models/FamilyMember.ts` - Current model (no position field)

### Secondary (MEDIUM confidence)
- Dexie.js documentation on schema versioning
- React Three Fiber patterns for state persistence

### Tertiary (LOW confidence)
- None - this is codebase-specific bug fixing

## Metadata

**Confidence breakdown:**
- Root cause analysis: HIGH - Verified by reading actual code, TODO comment confirms
- Solution approach: HIGH - Uses existing patterns in codebase
- Implementation details: MEDIUM - Untested, may have edge cases

**Research date:** 2026-01-31
**Valid until:** Indefinite (bug fix documentation)
