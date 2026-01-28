# Ancestree Project Plan

This document outlines the step-by-step implementation plan for the Ancestree family tree visualization tool. The Orchestrator agent should follow these phases in order, verifying each step before proceeding.

---

## Phase 1: Data Foundation
**Goal**: Establish persistent storage so family data survives browser refreshes.

### Step 1.1: Storage Service Interface
**Agent**: Data Agent
**Files**: `src/services/storage/StorageInterface.ts`
**Task**: Create the storage abstraction interface defining all CRUD operations
**Acceptance Criteria**:
- Interface defines methods for members and relationships
- Supports future backend swapping (local → cloud)

### Step 1.2: IndexedDB Implementation
**Agent**: Data Agent
**Files**: `src/services/storage/DexieStorage.ts`, `src/services/storage/index.ts`
**Task**: Implement storage interface using Dexie.js (IndexedDB wrapper)
**Acceptance Criteria**:
- All interface methods implemented
- Data persists across page refreshes
- Unit tests for CRUD operations

### Step 1.3: Family Service Layer
**Agent**: Data Agent
**Files**: `src/services/familyService.ts`
**Task**: Create business logic layer that uses storage (validation, derived data)
**Acceptance Criteria**:
- Validates data before saving (dates make sense, required fields present)
- Prevents invalid relationships (can't be own parent)
- Provides convenience methods (getChildren, getSpouse, getSiblings)

### Step 1.4: React Integration Hook
**Agent**: Frontend Agent
**Files**: `src/hooks/useFamilyData.ts`
**Task**: Create React hook that provides family data to components with loading/error states
**Acceptance Criteria**:
- Hook returns { members, relationships, loading, error }
- Auto-refreshes when data changes
- Provides mutation methods (addMember, updateMember, deleteMember)

**Phase 1 Verification**:
- [ ] Storage persists data across refresh
- [ ] All CRUD operations work
- [ ] Tests pass
- [ ] No console errors

---

## Phase 2: Core UI Components
**Goal**: Build the essential UI for managing family members.

### Step 2.1: Add Member Modal
**Agent**: Frontend Agent
**Files**: `src/components/AddMemberModal.tsx`
**Task**: Create modal form to add a new family member
**Acceptance Criteria**:
- Form fields: name (required), DOB, place of birth, date of death, notes
- Date pickers for date fields
- Form validation with error messages
- Calls familyService.addMember on submit
- Closes on success, shows error on failure

### Step 2.2: Member Detail Panel
**Agent**: Frontend Agent
**Files**: `src/components/MemberDetailPanel.tsx`
**Task**: Create side panel showing full member details with edit/delete options
**Acceptance Criteria**:
- Shows all member fields
- Edit button opens edit form
- Delete button with confirmation
- Shows relationships (parents, children, spouse)
- Close button

### Step 2.3: Edit Member Modal
**Agent**: Frontend Agent
**Files**: `src/components/EditMemberModal.tsx`
**Task**: Create modal to edit existing member (reuse form from AddMemberModal)
**Acceptance Criteria**:
- Pre-populated with existing data
- Same validation as add form
- Calls familyService.updateMember on submit

### Step 2.4: Member List Sidebar
**Agent**: Frontend Agent
**Files**: `src/components/MemberListSidebar.tsx`
**Task**: Create collapsible sidebar listing all family members
**Acceptance Criteria**:
- Searchable/filterable list
- Click to select (highlights in 3D view)
- Shows basic info (name, dates)
- Sorted alphabetically or by generation

### Step 2.5: App Layout Integration
**Agent**: Frontend Agent
**Files**: `src/App.tsx`, `src/components/Layout.tsx`
**Task**: Integrate all components into cohesive layout
**Acceptance Criteria**:
- Header with title and add button
- Sidebar on left (collapsible)
- 3D scene in center
- Detail panel on right (when member selected)
- Responsive design

**Phase 2 Verification**:
- [ ] Can add new member via form
- [ ] Can view member details
- [ ] Can edit existing member
- [ ] Can delete member (with confirmation)
- [ ] All data persists
- [ ] Tests pass

---

## Phase 3: Relationship Management
**Goal**: Allow users to define how family members are related.

### Step 3.1: Add Relationship Modal
**Agent**: Frontend Agent
**Files**: `src/components/AddRelationshipModal.tsx`
**Task**: Create modal to define relationship between two members
**Acceptance Criteria**:
- Select relationship type (parent-child, spouse, sibling)
- Select two members from dropdowns
- For parent-child: specify who is parent vs child
- For spouse: optional marriage date field
- Validates no duplicate relationships

### Step 3.2: Relationship Validation
**Agent**: Data Agent
**Files**: `src/services/familyService.ts` (update)
**Task**: Add validation rules for relationships
**Acceptance Criteria**:
- Can't be own parent/child/spouse
- No circular parent chains (A parent of B parent of A)
- Limit spouse relationships (configurable: 1 or unlimited)
- Age-appropriate checks (parent older than child, if dates exist)

### Step 3.3: Relationship Display
**Agent**: Frontend Agent
**Files**: `src/components/MemberDetailPanel.tsx` (update), `src/components/RelationshipList.tsx`
**Task**: Show relationships in member detail panel with ability to remove
**Acceptance Criteria**:
- Lists all relationships grouped by type
- Each shows related person's name (clickable to navigate)
- Delete relationship button with confirmation

### Step 3.4: Quick Relationship Actions
**Agent**: Frontend Agent
**Files**: `src/components/QuickActions.tsx`
**Task**: Add shortcuts like "Add Parent", "Add Child", "Add Spouse" to detail panel
**Acceptance Criteria**:
- Opens pre-configured AddMemberModal + auto-creates relationship
- Or allows selecting existing member

**Phase 3 Verification**:
- [ ] Can create all relationship types
- [ ] Validation prevents invalid relationships
- [ ] Relationships display correctly
- [ ] Can delete relationships
- [ ] Tests pass

---

## Phase 4: 3D Visualization Enhancement
**Goal**: Make the 3D tree actually visualize family relationships properly.

### Step 4.1: Tree Layout Algorithm
**Agent**: 3D Agent
**Files**: `src/scene/layout/treeLayout.ts`
**Task**: Implement algorithm to position nodes based on relationships
**Acceptance Criteria**:
- Parents above children (Y-axis represents generations)
- Spouses positioned side-by-side
- Siblings spread horizontally
- Handles complex trees (remarriage, large families)
- Minimizes line crossings

### Step 4.2: Connection Lines
**Agent**: 3D Agent
**Files**: `src/scene/ConnectionLines.tsx`
**Task**: Draw 3D lines/curves connecting related members
**Acceptance Criteria**:
- Parent-child: vertical lines
- Spouse: horizontal connector
- Different colors/styles per relationship type
- Lines update when nodes move

### Step 4.3: Node Improvements
**Agent**: 3D Agent
**Files**: `src/scene/FamilyNode.tsx` (update)
**Task**: Enhance node visuals with more info and states
**Acceptance Criteria**:
- Show photo placeholder or initials
- Visual distinction: living vs deceased
- Selected state (highlighted when clicked)
- Generation indicator (color/position)

### Step 4.4: Camera Navigation
**Agent**: 3D Agent
**Files**: `src/scene/CameraController.tsx`
**Task**: Implement smart camera behaviors
**Acceptance Criteria**:
- "Focus on member" - smoothly animates camera to center on selected node
- "Fit all" - zooms to show entire tree
- "Follow" mode - camera follows selected member during layout changes
- Keyboard shortcuts (arrow keys to navigate between members)

### Step 4.5: Scene Optimization
**Agent**: 3D Agent
**Files**: `src/scene/` (various)
**Task**: Optimize for large trees
**Acceptance Criteria**:
- Level-of-detail: distant nodes render simpler
- Instancing for similar geometries
- Culling for off-screen nodes
- Maintains 60fps with 100+ members

**Phase 4 Verification**:
- [ ] Tree layout correctly represents relationships
- [ ] Lines connect related members
- [ ] Camera navigation works smoothly
- [ ] Performance acceptable with 50+ members
- [ ] Tests pass

---

## Phase 5: Import/Export & Persistence
**Goal**: Allow users to save, backup, and share their family trees.

### Step 5.1: JSON Export
**Agent**: Data Agent
**Files**: `src/services/exportService.ts`
**Task**: Export entire family tree as downloadable JSON file
**Acceptance Criteria**:
- Exports all members and relationships
- Includes metadata (export date, app version)
- Human-readable format
- Download triggers file save dialog

### Step 5.2: JSON Import
**Agent**: Data Agent
**Files**: `src/services/importService.ts`
**Task**: Import family tree from JSON file
**Acceptance Criteria**:
- Validates JSON structure before import
- Option to merge with existing data or replace
- Handles ID conflicts (regenerates IDs)
- Shows preview before confirming import

### Step 5.3: Import/Export UI
**Agent**: Frontend Agent
**Files**: `src/components/ImportExportPanel.tsx`
**Task**: Create UI for import/export functionality
**Acceptance Criteria**:
- Export button downloads JSON
- Import button opens file picker
- Import preview modal with confirmation
- Progress indicator for large imports

### Step 5.4: Auto-Save Indicator
**Agent**: Frontend Agent
**Files**: `src/components/SaveIndicator.tsx`
**Task**: Show users that their data is being saved
**Acceptance Criteria**:
- Shows "Saving..." during writes
- Shows "Saved" with timestamp after success
- Shows error state if save fails

**Phase 5 Verification**:
- [ ] Can export tree to JSON
- [ ] Can import tree from JSON
- [ ] Import/export round-trips correctly
- [ ] Tests pass

---

## Phase 6: Polish & UX
**Goal**: Refine the user experience with helpful features.

### Step 6.1: Onboarding Flow
**Agent**: Frontend Agent
**Files**: `src/components/Onboarding.tsx`
**Task**: Guide new users through creating their first family member
**Acceptance Criteria**:
- Detects first-time user (empty tree)
- Step-by-step wizard: "Start by adding yourself"
- Explains key features with tooltips
- Can be dismissed and re-triggered

### Step 6.2: Search & Filter
**Agent**: Frontend Agent
**Files**: `src/components/SearchBar.tsx`, `src/hooks/useSearch.ts`
**Task**: Allow searching for members by name or other fields
**Acceptance Criteria**:
- Search input in header or sidebar
- Filters member list in real-time
- Highlights matching members in 3D view
- "Enter" focuses first result

### Step 6.3: Undo/Redo
**Agent**: Data Agent + Frontend Agent
**Files**: `src/services/historyService.ts`, `src/hooks/useHistory.ts`
**Task**: Implement undo/redo for all actions
**Acceptance Criteria**:
- Ctrl+Z undoes last action
- Ctrl+Shift+Z redoes
- History survives page navigation (session)
- Shows what action was undone in toast

### Step 6.4: Keyboard Shortcuts
**Agent**: Frontend Agent
**Files**: `src/hooks/useKeyboardShortcuts.ts`
**Task**: Add keyboard shortcuts for common actions
**Acceptance Criteria**:
- `N` - New member
- `E` - Edit selected
- `Delete` - Delete selected (with confirmation)
- `Escape` - Close modals, deselect
- `?` - Show shortcuts help

### Step 6.5: Error Handling & Toasts
**Agent**: Frontend Agent
**Files**: `src/components/ToastContainer.tsx`, `src/hooks/useToast.ts`
**Task**: Unified error handling with user-friendly messages
**Acceptance Criteria**:
- Toast notifications for success/error/info
- Auto-dismiss after timeout
- Errors are actionable ("Retry" button)
- No uncaught exceptions visible to user

**Phase 6 Verification**:
- [ ] Onboarding guides new users
- [ ] Search works across all fields
- [ ] Undo/redo functions correctly
- [ ] Keyboard shortcuts work
- [ ] Error handling is graceful
- [ ] Tests pass

---

## Final Verification

Before considering the project complete:

1. **Full Flow Test**:
   - [ ] Create new tree from scratch
   - [ ] Add 10+ members with relationships
   - [ ] Export, clear data, re-import
   - [ ] Verify all relationships preserved

2. **Performance Test**:
   - [ ] Import sample tree with 50+ members
   - [ ] Verify smooth 3D navigation
   - [ ] Verify search is responsive

3. **Code Review**:
   - [ ] Code Review Agent reviews all code
   - [ ] No security issues
   - [ ] No console errors/warnings
   - [ ] Consistent code style

4. **Documentation**:
   - [ ] README updated with usage instructions
   - [ ] All components have JSDoc comments
   - [ ] CLAUDE.md reflects final architecture

---

## How the Orchestrator Should Use This Plan

1. **Work through phases in order** (1 → 2 → 3 → 4 → 5 → 6)
2. **For each step**:
   - Spawn the designated agent with the task
   - Include the acceptance criteria in the agent prompt
   - After agent completes, spawn Verification Agent
   - Only proceed if verification passes
3. **Update decisions.md** after each phase
4. **Pause for user review** after each phase completes
