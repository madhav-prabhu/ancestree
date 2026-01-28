# Coding Conventions

**Analysis Date:** 2026-01-26

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `AddMemberModal.tsx`, `MemberDetailPanel.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useFamilyData.ts`)
- Services: camelCase (e.g., `familyService.ts`)
- Models/Types: PascalCase (e.g., `FamilyMember.ts`, `Relationship.ts`)
- Utilities: camelCase (e.g., `dateUtils.ts`, `imageUtils.ts`)
- Test files: Adjacent to source with `.test.ts` or `.test.tsx` suffix, or in `__tests__` directory

**Functions:**
- Regular functions: camelCase (e.g., `calculateAge`, `handleAddMember`, `loadData`)
- React components: PascalCase (e.g., `AddMemberModal`, `MemberListSidebar`)
- Event handlers: `handleX` pattern (e.g., `handlePhotoChange`, `handleMemberSelect`, `handleOpenEditModal`)
- Callback generators: `create...Callback` pattern (e.g., `createFamilyMember`)
- Getter/convenience methods: simple name or `getX` pattern (e.g., `getMember`, `getParents`, `getChildren`)

**Variables:**
- State variables: camelCase (e.g., `selectedMember`, `isAddModalOpen`, `members`)
- Boolean flags: prefix with `is` or `has` (e.g., `isOpen`, `isSidebarCollapsed`, `isProcessingPhoto`, `hasError`)
- Callback refs: camelCase with `Ref` suffix (e.g., `modalRef`, `nameInputRef`, `fileInputRef`)

**Types:**
- Interfaces: PascalCase (e.g., `FamilyMember`, `Relationship`, `AddMemberModalProps`)
- Type unions: PascalCase (e.g., `RelationshipType`, `QuickRelationshipAction`)
- Input types for services: `CreateMemberInput`, `UpdateMemberInput` pattern
- Error types: PascalCase extending `Error` (e.g., `ValidationError`)

## Code Style

**Formatting:**
- Not explicitly configured with Prettier (no `.prettierrc` file in repo root)
- Code is well-formatted with consistent indentation (2 spaces)
- Line length varies but appears to target ~100 columns

**Linting:**
- ESLint configured with TypeScript support (`eslint.config.js`)
- Rules include:
  - `@eslint/js` recommended rules
  - `typescript-eslint` recommended rules
  - React hooks rules (`react-hooks/recommended`)
  - React Refresh rule (warns when exporting non-components)
- Strict TypeScript compilation enabled (`strict: true` in tsconfig.json)
  - Strict null checks required
  - No implicit any types
  - No unused locals or parameters

## Import Organization

**Order:**
1. React/external framework imports (e.g., `import { useState } from 'react'`)
2. Third-party library imports (e.g., `import { renderHook } from '@testing-library/react'`)
3. Internal service/hook imports (e.g., `import { familyService } from '../services'`)
4. Model/type imports (e.g., `import type { FamilyMember } from '../models'`)
5. Utility imports (e.g., `import { processImage } from '../utils/imageUtils'`)
6. Type-only imports at end (e.g., `import type { CreateMemberInput } from '../services'`)

**Path Aliases:**
- Configured in `tsconfig.json`: `@/*` → `src/*`
- Not actively used in current codebase (imports use relative paths like `../services`, `../models`)

**Barrel Files:**
- Used for component exports: `src/components/index.ts` exports all UI components
- Used for service exports: `src/services/index.ts`, `src/services/storage/index.ts`
- Used for model exports: `src/models/index.ts`
- Used for hook exports: `src/hooks/index.ts`

## Error Handling

**Patterns:**
- Custom error classes defined where needed: `ValidationError` in `familyService.ts`
- Extends standard `Error` with custom name property for instanceof checks
- Validation errors thrown during input validation with descriptive messages
- Error boundaries at component level with try-catch around async operations
- Components display error UI with messages: `{error.message}` for user visibility
- Hook-level error state tracking: `error: Error | null` in `useFamilyData`

**In Components:**
- Modal components catch submission errors and display in UI: `setErrors((prev) => ({ ...prev, general: ... }))`
- Components defer error handling to parent components when appropriate (e.g., modal passes `onSubmit` responsibility)
- Photo processing errors caught and displayed in photo error field: `photo?: string` error state

**In Services:**
- Validation errors thrown with specific messages for user feedback (e.g., "Name is required", "Date of birth cannot be before date of birth")
- Date validation centralizes with `validateMemberDates()` helper function
- Relationship validation includes business rule enforcement (circular chains, date ordering, member existence)

## Logging

**Framework:** `console` (no dedicated logging library)

**Patterns:**
- Minimal console logging in code
- No debug output in normal operation
- Errors logged implicitly through error messages in UI
- Focus on error handling via ValidationError exceptions rather than console.error

## Comments

**When to Comment:**
- JSDoc comments on exported functions and types
- Inline comments for non-obvious logic (e.g., "Reset file input so same file can be selected again")
- Section dividers in larger files (e.g., `// ==================`, `// Member Operations`)
- Explanation of business rules (e.g., "For parent-child: person1 is parent, person2 is child")

**JSDoc/TSDoc:**
- Extensive use on exported functions: `@param`, `@returns`, `@throws` tags
- Type documentation on interfaces: Comment above interface definition
- Example code blocks in hook documentation using markdown code fences

**Examples from codebase:**
```typescript
/**
 * Validate that a date string is in ISO format (YYYY-MM-DD).
 */
function isValidISODate(date: string): boolean {

/**
 * Add a new family member.
 * @param data - Member data without id and timestamps
 * @returns The created member
 * @throws ValidationError if data is invalid
 */
async addMember(data: CreateMemberInput): Promise<FamilyMember> {
```

## Function Design

**Size:** Functions are medium-sized, typically 20-100 lines
- Utility functions: 5-20 lines (e.g., `isValidISODate`, `calculateAge`)
- Event handlers: 10-50 lines with clear state management
- Service methods: 15-40 lines with validation and business logic
- Component functions: 100-300+ lines with multiple state and effect blocks

**Parameters:**
- Single object parameter for configuration/options (e.g., `{ isOpen, onClose, onSubmit }`)
- Explicit function signatures with type annotations
- Destructuring in parameters for clarity (common in React components)

**Return Values:**
- Functions clearly indicate return types with TypeScript annotations
- Service methods return entities (e.g., `FamilyMember`, `Relationship`)
- Hooks return structured objects with data and methods
- Async operations return Promises with typed resolution values
- Validation functions return boolean primitives

## Module Design

**Exports:**
- Components export as default in some cases, named exports in others
- Services export as named objects (e.g., `export const familyService = { ... }`)
- Models export interfaces and factory functions
- Hooks export as named functions with corresponding hook interfaces

**Barrel Files:**
- Centralize exports from index.ts files in each domain (components, hooks, services, models)
- Used for: components, services, models, hooks, scene components
- Example from `src/components/index.ts`:
```typescript
export { AddMemberModal } from './AddMemberModal'
export { MemberDetailPanel } from './MemberDetailPanel'
export { EditMemberModal } from './EditMemberModal'
export { MemberListSidebar } from './MemberListSidebar'
export { AddRelationshipModal } from './AddRelationshipModal'
export { Layout, Header, SaveIndicator, EmptyState } from './Layout'
```

## React-Specific Patterns

**Hooks Usage:**
- `useState` for local component state
- `useEffect` for side effects with dependency arrays
- `useCallback` for memoized callbacks (extensive use to prevent re-renders)
- `useMemo` for expensive computations with dependencies
- `useRef` for DOM references and persistent values
- Custom `useFamilyData` hook centralizes data access with reactive updates

**Component Props:**
- All props typed with interfaces (no `React.FC` pattern, using function signature instead)
- Props interfaces named with `Props` suffix (e.g., `AddMemberModalProps`)
- Destructuring in function parameters

**State Management:**
- Local component state for UI concerns (form state, modals, UI flags)
- Custom hook `useFamilyData` for domain state (members, relationships)
- State updates through callbacks from parents

## TypeScript Specifics

**Type Safety:**
- Strict mode enabled in tsconfig.json
- Type annotations required for function parameters and return values
- Interfaces used for object shapes (props, state, API contracts)
- Type-only imports with `import type` syntax

**Example patterns:**
```typescript
// Interfaces for component props
interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateMemberInput) => Promise<void>
}

// Type unions
export type RelationshipType = 'parent-child' | 'spouse' | 'sibling'

// Input/output types for services
export type CreateMemberInput = Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>
```

---

*Convention analysis: 2026-01-26*
