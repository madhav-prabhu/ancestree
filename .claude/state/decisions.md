# Architectural Decisions Log

This file tracks key architectural decisions for the Ancestree project. Agents should read this before starting work and update it after making significant decisions.

---

## 2026-01-12 - Tech Stack Selection

**Decision**: Use React + TypeScript + Vite for frontend, react-three-fiber for 3D, Dexie.js for storage

**Rationale**:
- React: Large ecosystem, good for learning, excellent 3D integration via R3F
- TypeScript: Type safety for complex family tree data structures
- Vite: Fast development experience
- react-three-fiber: Declarative 3D with React patterns
- Dexie.js: Simple IndexedDB API, handles large datasets well

**Affected areas**: Entire codebase

---

## 2026-01-12 - Multi-Agent Architecture

**Decision**: Use Orchestrator pattern with specialist agents (Frontend, 3D, Data, Code Review)

**Rationale**:
- Clear separation of concerns
- Parallel development possible
- Specialized expertise per domain

**Affected areas**: Development workflow, `.claude/agents/`

---

## 2026-01-12 - Storage Abstraction

**Decision**: Abstract storage behind interface for future cloud migration

**Rationale**: User wants local-first now but may want cloud sync later

**Affected areas**: `src/services/storage/`

---

## 2026-01-12 - Project Scaffolding Complete

**Decision**: Initial project structure created with:
- React 19 + TypeScript + Vite 7
- react-three-fiber + drei for 3D
- Tailwind CSS v4 for styling
- Vitest for testing
- Basic FamilyNode 3D component with hover/click interactions

**Verification**: ✅ PASSED
- Build: Success (591 modules)
- Tests: 2/2 passing
- Dev server: Running on http://localhost:5173

**Next steps**:
- Implement storage service layer (Data Agent)
- Build add member form (Frontend Agent)
- Connect form to 3D scene (Orchestrator coordination)

**Affected areas**: Entire codebase

---

## 2026-01-12 - Phase 1: Data Foundation Complete

**Decision**: Implemented complete data persistence layer with:
- Storage Interface abstraction (`src/services/storage/StorageInterface.ts`)
- Dexie.js IndexedDB implementation (`src/services/storage/DexieStorage.ts`)
- Family Service business logic layer (`src/services/familyService.ts`)
- React integration hook (`src/hooks/useFamilyData.ts`)

**Key Features**:
- Full CRUD operations for members and relationships
- Data validation (dates, required fields, relationship constraints)
- Circular parent-chain prevention
- Age-appropriate parent-child validation
- Derived data methods (getParents, getChildren, getSiblings, getSpouses, getAncestors, getDescendants)
- Change subscription for reactive updates
- Export/import support

**Testing**:
- 65 tests passing
- Unit tests for storage layer
- Unit tests for service layer
- Unit tests for React hook

**Verification**: ✅ PASSED
- Build: Success (602 modules)
- Tests: 65/65 passing
- App integrated with persistent storage

**Technical Notes**:
- Used fake-indexeddb for testing (jsdom doesn't have IndexedDB)
- Storage change notifications enable automatic React state updates
- ValidationError class for distinguishing user errors from system errors

**Next steps**:
- Phase 2: Core UI Components (AddMemberModal, EditMemberModal, MemberDetailPanel)

**Affected areas**: `src/services/`, `src/hooks/`, `src/App.tsx`

---

## 2026-01-12 - Phase 2: Core UI Components Complete

**Decision**: Implemented comprehensive UI component library with:
- AddMemberModal (`src/components/AddMemberModal.tsx`)
- MemberDetailPanel (`src/components/MemberDetailPanel.tsx`)
- EditMemberModal (`src/components/EditMemberModal.tsx`)
- MemberListSidebar (`src/components/MemberListSidebar.tsx`)
- Layout components (`src/components/Layout.tsx`)

**Key Features**:
- **AddMemberModal**: Form with validation for name (required), DOB, place of birth, date of death, notes. Closes on success, escape key, or clicking outside.
- **MemberDetailPanel**: Full member details view with edit/delete options, relationship display (parents, children, spouses, siblings), age calculation, deceased indicator.
- **EditMemberModal**: Pre-populated form for editing existing members with same validation as AddMemberModal.
- **MemberListSidebar**: Collapsible sidebar with search, sort (name/birth/recent), selection highlighting. Responsive with member count.
- **Layout**: Modular layout with header, collapsible sidebar, main content area, and optional detail panel.

**UI/UX Patterns**:
- Tailwind CSS v4 for styling
- Form validation with user-friendly error messages
- Modal behavior (escape to close, click outside to close)
- Loading and disabled states during async operations
- Delete confirmation dialogs
- Accessibility support (ARIA attributes, keyboard navigation, focus management)

**Testing**:
- 148 tests passing (83 new tests for components)
- AddMemberModal: 19 tests
- MemberDetailPanel: 20 tests
- EditMemberModal: 18 tests
- MemberListSidebar: 26 tests
- Integration with useFamilyData hook verified

**Verification**: ✅ PASSED
- Build: Success (608 modules)
- Tests: 148/148 passing
- All components integrated into App.tsx
- Dev server runs without errors

**Component Architecture**:
- Components use useFamilyData hook for data operations
- Barrel exports via `src/components/index.ts`
- Clear prop interfaces with TypeScript
- Callback-based communication with parent App component

**Next steps**:
- Phase 3: Relationship Management (AddRelationshipModal, validation, display)

**Affected areas**: `src/components/`, `src/App.tsx`

---

## 2026-01-12 - Phase 3: Relationship Management Complete

**Decision**: Implemented comprehensive relationship management system with:
- AddRelationshipModal (`src/components/AddRelationshipModal.tsx`)
- Enhanced MemberDetailPanel with relationship display and removal
- Quick relationship action buttons for rapid relationship creation
- Full integration with existing data layer

**Key Features**:

**AddRelationshipModal**:
- Dropdown for relationship type selection (parent-child, spouse, sibling)
- Smart member selectors that exclude invalid options
- Parent/Child labels change dynamically based on relationship type
- Marriage date field (appears only for spouse relationships)
- Relationship preview showing what will be created
- Pre-selection support for member and relationship type (via quick actions)
- Validation for duplicate relationships, same-person relationships

**Relationship Display (MemberDetailPanel)**:
- Groups relationships by type: Parents, Spouse(s), Siblings, Children
- Each related member is clickable to navigate to their details
- Marriage date displayed for spouse relationships
- Remove button on hover with confirmation dialog
- "Add" button in relationships section header

**Quick Relationship Actions**:
- Four quick action buttons: "+ Parent", "+ Child", "+ Spouse", "+ Sibling"
- Opens AddRelationshipModal pre-configured with the selected type
- Current member is pre-selected as the first person

**Data Layer Enhancements**:
- Added `getRelationshipsForMember` to useFamilyData hook
- Relationship IDs tracked for deletion support
- Existing validation already comprehensive (circular chains, age validation, duplicates)

**Testing**:
- 175 tests passing (27 new tests for AddRelationshipModal)
- Tests cover rendering, validation, form submission, pre-selection, previews
- All existing tests continue to pass

**Verification**: PASSED
- Build: Success (609 modules)
- Tests: 175/175 passing
- All features integrated into App.tsx
- Dev server runs without errors

**Component Architecture**:
- AddRelationshipModal receives members list and pre-selection props
- MemberDetailPanel receives relationship query and mutation functions
- QuickRelationshipAction type exported for type-safe quick action handling
- Clean separation between UI and data operations

**Next steps**:
- Phase 4: 3D Visualization Enhancements (relationship lines, layout algorithms)

**Affected areas**: `src/components/`, `src/hooks/`, `src/App.tsx`

---

## Phase 4: 3D Visualization Enhancement - COMPLETE
**Date**: 2026-01-13

### Decision Summary
Implemented comprehensive 3D visualization enhancements including tree layout algorithm, connection lines, improved nodes, camera navigation, and performance optimizations.

### Step 4.1: Tree Layout Algorithm
**Files**: `src/scene/layout/treeLayout.ts`, `src/scene/layout/index.ts`

**Algorithm Features**:
- Calculates positions based on family relationships
- Y-axis represents generations (parents above children)
- Spouses positioned side-by-side at same level
- Siblings spread horizontally
- Handles complex trees (remarriage, multiple spouses)
- Minimizes overlaps with automatic resolution

**Key Functions**:
- `calculateTreeLayout()`: Main layout computation
- `calculateGenerationMap()`: Returns generation levels for each member
- `getBoundingBox()`: Calculates tree bounds for camera positioning
- `getGeneration()`, `getMaxGeneration()`: Generation utilities

### Step 4.2: Connection Lines
**Files**: `src/scene/ConnectionLines.tsx`

**Line Types**:
- Parent-child: L-shaped blue lines (`#60a5fa`)
- Spouse: Curved pink lines (`#f472b6`) with upward arc
- Sibling: Dashed green curved lines (`#34d399`)

**Implementation**:
- Uses `@react-three/drei` Line and QuadraticBezierLine components
- Different line widths per relationship type
- Smart positioning to avoid node overlaps

### Step 4.3: Node Improvements
**Files**: `src/scene/FamilyNode.tsx`

**Visual Enhancements**:
- Circular avatar with member initials
- Generation-based color coding (6 colors for different generations)
- Living vs deceased distinction (opacity, dagger symbol)
- Selected state with amber glow and ring
- Hoverable with emerald highlight
- Date/age display on nodes
- Generation badge indicator

**Generation Colors**:
```
Gen 0: Blue (#3b82f6)
Gen 1: Purple (#8b5cf6)
Gen 2: Cyan (#06b6d4)
Gen 3: Emerald (#10b981)
Gen 4: Amber (#f59e0b)
Gen 5+: Red (#ef4444)
```

### Step 4.4: Camera Navigation
**Files**: `src/scene/CameraController.tsx`

**Features**:
- **Focus on member**: Smooth camera animation to selected node
- **Fit all**: Zoom to show entire tree (Home key)
- **Keyboard navigation**:
  - Arrow Left/Right: Navigate to prev/next member
  - Arrow Up/Down: Navigate to member in parent/child direction
  - F: Focus on selected member
  - Home: Fit all members in view
- Eased animation transitions (cubic ease-out)
- Auto-focus when member selection changes

### Step 4.5: Scene Optimization
**Files**: `src/scene/OptimizedFamilyNode.tsx`, `src/scene/TreeScene.tsx`

**Performance Features**:
- **LOD (Level of Detail)**: Simplified rendering for distant nodes
  - Near view: Full detail with text, avatar, badges
  - Far view: Simple box with basic coloring
- **Optimization threshold**: 30 members triggers optimized mode
- **Adaptive DPR**: Adjusts pixel ratio for performance
- **Performance Monitor**: Built-in @react-three/drei monitoring
- **Conditional rendering**:
  - Environment map disabled for large trees
  - Reduced point lights
  - On-demand frame loop for large trees
- **Memoization**: Components wrapped with React.memo

**Threshold Settings**:
- < 30 members: Full quality (environment, damping, full DPR)
- >= 30 members: Optimized (LOD nodes, reduced effects, lower DPR)

### Testing
- 194 tests passing (19 new tests for tree layout)
- Layout algorithm fully tested with various tree structures
- Tests cover single member, parent-child, spouse pairs, complex families

### Verification: PASSED
- Build: Success (614 modules)
- Tests: 194/194 passing
- All features integrated and working
- Dev server runs without errors

### Component Architecture
```
TreeScene
├── SceneContent (memoized)
│   ├── PerformanceMonitor
│   ├── AdaptiveDpr
│   ├── Lighting (conditional)
│   ├── Environment (conditional)
│   ├── CameraController
│   ├── ConnectionLines
│   ├── FamilyNode / OptimizedFamilyNode (per member)
│   └── OrbitControls
└── Canvas (with performance settings)
```

### Next Steps
- Phase 5: Export/Import features
- Future: Real-time collaboration, cloud sync

**Affected areas**: `src/scene/`, `src/App.tsx`

---

<!-- Add new decisions above this line -->
