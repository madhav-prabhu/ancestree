# Architecture

**Analysis Date:** 2026-01-26

## Pattern Overview

**Overall:** Layered architecture with separation of concerns across data, business logic, UI, and 3D visualization layers.

**Key Characteristics:**
- Clean layering: Storage → Services → Hooks → Components/Scenes
- Abstracted storage backend enabling future cloud migration
- React for UI state and composition
- Three.js + react-three-fiber for 3D visualization
- Graph data model supporting complex family relationships (non-tree structures)
- Reactive data updates via observer pattern

## Layers

**Storage Layer:**
- Purpose: Abstract data persistence using storage backend interface
- Location: `src/services/storage/`
- Contains: `StorageInterface` (abstract contract), `DexieStorage` (IndexedDB implementation)
- Depends on: Models (`FamilyMember`, `Relationship`)
- Used by: `familyService`

**Business Logic / Service Layer:**
- Purpose: Enforce validation, derived data, and complex operations on family trees
- Location: `src/services/familyService.ts`
- Contains: Member CRUD, relationship CRUD, validation, convenience methods (getParents, getChildren, getSpouses, getSiblings, getAncestors, getDescendants)
- Depends on: Storage layer, Models
- Used by: `useFamilyData` hook, utilities (importUtils)

**Data Models:**
- Purpose: Define core entities and type contracts
- Location: `src/models/`
- Contains: `FamilyMember` (person with biographical data), `Relationship` (parent-child, spouse, sibling connections), helper constructors
- Depends on: None (pure type definitions)
- Used by: All layers above storage

**State Management Hook:**
- Purpose: Bridge React components to business logic with reactive loading/error states
- Location: `src/hooks/useFamilyData.ts`
- Contains: State wrapper around familyService, auto-refresh on changes, mutation methods (addMember, updateMember, etc.)
- Depends on: familyService, Models
- Used by: React components (`App.tsx`, pages)

**UI Components Layer:**
- Purpose: Render React UI for modals, sidebars, panels, and layout
- Location: `src/components/`
- Contains: Layout system (header, sidebar, detail panel), modals (AddMember, EditMember, AddRelationship), sidebar (MemberListSidebar), detail panel (MemberDetailPanel)
- Depends on: useFamilyData hook, Models
- Used by: `App.tsx`, `Router.tsx`

**3D Visualization Layer:**
- Purpose: Render interactive 3D family tree visualization
- Location: `src/scene/`
- Contains: TreeScene (main Canvas container), CameraController, galaxy components (GalaxyNode, EtherealConnections, CosmicBackground, PhysicsContext), layout algorithms
- Depends on: Models, useFamilyData hook
- Used by: `App.tsx`

**Layout Algorithm Layer:**
- Purpose: Calculate 3D positions for family members based on relationships
- Location: `src/scene/layout/treeLayout.ts`
- Contains: Tree layout algorithm, position calculations, bounding box computation, generation mapping
- Depends on: Models
- Used by: TreeScene, MiniMap

**Utility Layer:**
- Purpose: Helper functions for specific tasks
- Location: `src/utils/`
- Contains: Export/import JSON (exportUtils, importUtils), date parsing (dateUtils), image handling (imageUtils)
- Depends on: Models, Services
- Used by: App (import/export handlers), Components (image preview)

## Data Flow

**Member Creation Flow:**

1. User opens AddMemberModal → enters form data
2. Modal calls `handleAddMember(data)` from App.tsx
3. `addMember()` from useFamilyData hook calls `familyService.addMember()`
4. Service validates dates, name, then calls `storage.saveMember()`
5. DexieStorage writes to IndexedDB, calls `notifyChange()`
6. Storage notifies familyService subscribers
7. useFamilyData receives change notification, re-fetches all members/relationships
8. Component state updates (members array), causes App and TreeScene re-render

**Relationship Creation Flow:**

1. User opens AddRelationshipModal → selects type and two members
2. Modal calls `handleAddRelationship(type, person1Id, person2Id)` from App.tsx
3. `addRelationship()` from useFamilyData hook validates and calls `familyService.addRelationship()`
4. Service validates:
   - Both members exist
   - No self-relationships
   - No duplicate relationships
   - For parent-child: parent older than child, no circular parentage
   - For spouse: valid marriage/divorce dates
5. Service creates relationship via `storage.saveRelationship()`
6. **Auto-linking:** If spouse relationship, service automatically creates parent-child relationships between new spouse and existing children
7. Storage notifies subscribers, useFamilyData refreshes data
8. 3D scene re-renders with updated tree layout and connections

**3D Rendering Flow:**

1. App component calls `calculateTreeLayout(members, relationships)` → PositionMap
2. TreeScene receives members, relationships, positions
3. TreeScene wraps content in `PhysicsProvider` with positions/relationships
4. For each member, renders `GalaxyNode` at calculated position
5. Renders `EtherealConnections` lines between related members
6. CameraController handles camera targeting and navigation
7. OrbitControls allow manual camera manipulation
8. User clicks a node → `onMemberSelect(member)` → updates selectedMemberId state in App
9. App updates detail panel with selected member's info

**State Management:**

- Member and relationship arrays stored in useFamilyData hook state
- selectedMember, modal open/close states, sidebar collapse state managed in App.tsx
- 3D node positions calculated from relationships (not stored, derived)
- Camera target position passed from TreeScene to MiniMap for synchronization
- Changes to data automatically trigger refresh via onChange subscription

## Key Abstractions

**StorageInterface:**
- Purpose: Decouple application from storage backend implementation
- Examples: `src/services/storage/StorageInterface.ts`, `src/services/storage/DexieStorage.ts`
- Pattern: Interface-based design allowing IndexedDB (current) or cloud backend (future)

**FamilyService (Business Logic):**
- Purpose: Centralize validation and business rules
- Examples: `src/services/familyService.ts`
- Pattern: Service object with static methods, single entry point for all family tree operations

**useFamilyData Hook:**
- Purpose: React state wrapper around familyService
- Examples: `src/hooks/useFamilyData.ts`
- Pattern: Custom hook providing reactive access to data with loading/error states

**TreeLayout Algorithm:**
- Purpose: Convert graph of relationships into 3D positions
- Examples: `src/scene/layout/treeLayout.ts`
- Pattern: Positional algorithm placing members by generation (Y), family groups (X), and depth (Z)

**GalaxyNode Component:**
- Purpose: Render individual family member as interactive 3D node
- Examples: `src/scene/galaxy/GalaxyNode.tsx`
- Pattern: Three.js mesh with click handlers, spring physics integration

## Entry Points

**Application Entry:**
- Location: `src/main.tsx`
- Triggers: Browser load
- Responsibilities: Mount React app at root, initialize Router

**Router Entry:**
- Location: `src/Router.tsx`
- Triggers: Application load
- Responsibilities: Define routes, lazy-load pages (Galaxy at `/`, Timeline at `/timeline`)

**Main App Component:**
- Location: `src/App.tsx`
- Triggers: Route `/`
- Responsibilities: Load data via useFamilyData, coordinate all UI components, manage modal states, handle member selection, orchestrate import/export

**Scene Entry:**
- Location: `src/scene/TreeScene.tsx`
- Triggers: Rendered by App.tsx
- Responsibilities: Render Three.js canvas, manage camera, position family members, render connections

**Timeline Page Entry:**
- Location: `src/pages/TimelinePage.tsx`
- Triggers: Route `/timeline`
- Responsibilities: Alternative chronological view of family tree

## Error Handling

**Strategy:** Validation at service layer with clear error messages

**Patterns:**
- `ValidationError` thrown by familyService for invalid input (caught by components and displayed to user)
- Error state in useFamilyData hook captures and exposes exceptions
- Components display loading state during async operations
- Try-catch in modal handlers prevents unhandled promise rejections

**Specific Validations:**
- Member dates: ISO format validation, death after birth
- Relationships: Members must exist, no self-relationships, parent-child age check, no circular parentage
- Marriage dates: Format validation, divorce after marriage

## Cross-Cutting Concerns

**Logging:** Not implemented - browser console for debugging

**Validation:**
- Centralized in `familyService` (date formats, business rules)
- Modal-level validation for form fields (required fields, date ranges)

**Authentication:**
- Local-first (no auth required)
- Data stored in user's IndexedDB, not shared

**State Consistency:**
- Observer pattern via `onChange` subscriptions ensures components stay in sync
- All mutations go through services, no direct storage writes from components

**Performance Optimization:**
- useMemo for position calculations and layout
- Memoization of components (TreeScene content)
- Lazy loading of pages via Router
- AdaptiveDpr in Three.js for responsive rendering

---

*Architecture analysis: 2026-01-26*
