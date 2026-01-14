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

<!-- Add new decisions above this line -->
