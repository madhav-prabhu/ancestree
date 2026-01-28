# Testing Patterns

**Analysis Date:** 2026-01-26

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.ts`
- Environment: jsdom (browser-like DOM simulation)
- Globals: true (no need to import describe/it/expect)
- Setup files: `src/test/setup.ts`

**Assertion Library:**
- Vitest built-in expect API (compatible with Jest)
- @testing-library/jest-dom for DOM matchers (loaded in setup)
- Testing Library query/assertion methods

**Run Commands:**
```bash
npm test              # Run tests once (vitest)
npm run test:ui       # Watch mode with UI dashboard (vitest --ui)
npm run test:coverage # Generate coverage report (vitest --coverage)
npm run lint          # ESLint checks
npm run build         # TypeScript check + vite build
```

## Test File Organization

**Location:**
- Colocated adjacent to source: `Component.test.tsx` or `function.test.ts`
- Grouped in `__tests__` subdirectory: `src/components/__tests__/AddMemberModal.test.tsx`

**Mixed approach in current codebase:**
- Components: `src/components/__tests__/*.test.tsx` directory
- Services: `src/services/__tests__/familyService.test.ts` directory
- Hooks: `src/hooks/__tests__/useFamilyData.test.ts` directory
- Models: `src/models/FamilyMember.test.ts` colocated
- Layout/utility: `src/scene/layout/treeLayout.test.ts` colocated

**Naming:**
- Always `.test.ts` or `.test.tsx` suffix (never `.spec`)
- Match source filename pattern

**Structure:**
```
src/
├── components/
│   ├── AddMemberModal.tsx
│   ├── __tests__/
│   │   ├── AddMemberModal.test.tsx
│   │   ├── EditMemberModal.test.tsx
│   │   └── MemberDetailPanel.test.tsx
│   └── ...
├── services/
│   ├── familyService.ts
│   └── __tests__/
│       └── familyService.test.ts
└── models/
    ├── FamilyMember.ts
    └── FamilyMember.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('ComponentName', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      // test
    })
  })

  describe('Form validation', () => {
    it('should show error when name is empty on submit', async () => {
      // test
    })
  })

  describe('Form submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      // test
    })
  })

  describe('Modal behavior', () => {
    it('should close when clicking the close button', async () => {
      // test
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      // test
    })
  })
})
```

**Patterns:**
- Nested `describe` blocks for logical grouping
- Mocks initialized at suite level, cleared in `beforeEach`
- Setup helpers (e.g., `toDisplayDate`) defined at top of test file
- Clear test names using "should X" format

## Mocking

**Framework:** Vitest built-in `vi` object (vi.fn(), vi.mock(), etc.)

**Patterns:**

### Mock Functions:
```typescript
const mockOnClose = vi.fn()
const mockOnSubmit = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockOnSubmit.mockResolvedValue(undefined)
})

// In test:
await user.click(screen.getByRole('button', { name: /add member/i }))
await waitFor(() => {
  expect(mockOnSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    dateOfBirth: '1990-05-15',
  })
})
```

### Rejection Mocking:
```typescript
mockOnSubmit.mockRejectedValue(new Error('Server error'))

await act(async () => {
  try {
    await result.current.addMember({ name: '' })
  } catch {
    // Expected to throw
  }
})
```

### Controlled Promise Mocking:
```typescript
let resolveSubmit!: () => void
mockOnSubmit.mockReturnValue(
  new Promise<void>((resolve) => {
    resolveSubmit = resolve
  })
)

// Later in test:
resolveSubmit!()
```

**What to Mock:**
- Callback props passed to components (onClose, onSubmit, onDelete)
- Service method calls in tests
- Browser APIs when needed (handled by jsdom)

**What NOT to Mock:**
- Internal component state and effects (test behavior, not implementation)
- Custom hooks like `useFamilyData` are called directly in hook tests (not mocked)
- Data from service layer is used directly in service tests
- User interactions (use `userEvent` instead of mocking)

## Fixtures and Factories

**Test Data:**
```typescript
// Factory helper in AddMemberModal.test.tsx:
function toDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

// Usage:
fireEvent.change(dobInput, { target: { value: toDisplayDate('1990-05-15') } })
```

**Setup in service tests:**
```typescript
// In beforeEach, establish relationships:
const grandpa = await familyService.addMember({ name: 'Grandpa' })
const grandma = await familyService.addMember({ name: 'Grandma' })
const dad = await familyService.addMember({ name: 'Dad' })
const mom = await familyService.addMember({ name: 'Mom' })

// Set up relationships:
await familyService.addRelationship('spouse', grandpa.id, grandma.id)
await familyService.addRelationship('parent-child', grandpa.id, dad.id)
```

**Location:**
- Helpers: defined at top of test file
- Teardown: `beforeEach(async () => { await familyService.clearAll() })`
- No separate fixture files (factories created inline in tests)

## Coverage

**Requirements:** No specific coverage targets enforced in tooling

**View Coverage:**
```bash
npm run test:coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, components, or hooks in isolation
- Approach: Mock external dependencies, focus on unit behavior
- Examples: `FamilyMember.test.ts` (model factories), service method tests
- Tools: Vitest + Testing Library for components

**Integration Tests:**
- Scope: Multiple components/services working together, data layer integration
- Approach: Use real `familyService` with IndexedDB storage via `fake-indexeddb`
- Examples: `useFamilyData.test.ts` (hook with service layer), component with form submission
- Setup: Test setup imports `fake-indexeddb/auto` to provide IndexedDB in tests

**E2E Tests:**
- Framework: Not used
- Status: Not applicable (in-browser testing only, no e2e framework configured)

## Common Patterns

**Async Testing:**
```typescript
// Pattern 1: userEvent with async/await
const user = userEvent.setup()
await user.type(screen.getByLabelText(/name/i), 'John Doe')

// Pattern 2: fireEvent for immediate DOM events
fireEvent.change(dobInput, { target: { value: '01/01/2000' } })
fireEvent.click(screen.getByRole('button', { name: /add member/i }))

// Pattern 3: waitFor for async updates
await waitFor(() => {
  expect(mockOnSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    dateOfBirth: '1990-05-15',
  })
})

// Pattern 4: act for state updates
await act(async () => {
  newMember = await result.current.addMember({ name: 'New Member' })
})
```

**Error Testing:**
```typescript
// Validation errors:
it('should show error when name is empty on submit', async () => {
  render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)
  fireEvent.click(screen.getByRole('button', { name: /add member/i }))

  await waitFor(() => {
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })
  expect(mockOnSubmit).not.toHaveBeenCalled()
})

// Submission errors:
it('should show error message when submission fails', async () => {
  const user = userEvent.setup()
  mockOnSubmit.mockRejectedValue(new Error('Server error'))

  render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)
  await user.type(screen.getByLabelText(/name/i), 'John Doe')
  fireEvent.click(screen.getByRole('button', { name: /add member/i }))

  await waitFor(() => {
    expect(screen.getByText('Server error')).toBeInTheDocument()
  })
})

// Service-level validation errors:
await expect(familyService.addMember({ name: '' })).rejects.toThrow(ValidationError)
await expect(familyService.addMember({ name: 'Test', dateOfBirth: 'invalid' }))
  .rejects.toThrow('Date of birth must be in YYYY-MM-DD format')
```

**Hook Testing:**
```typescript
import { renderHook, act, waitFor } from '@testing-library/react'

describe('useFamilyData', () => {
  it('should add a member and update state', async () => {
    const { result } = renderHook(() => useFamilyData())

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Perform action
    let newMember: Awaited<ReturnType<typeof result.current.addMember>>
    await act(async () => {
      newMember = await result.current.addMember({ name: 'New Member' })
    })

    // Assert state updated
    await waitFor(() => {
      expect(result.current.members).toHaveLength(1)
    })
  })
})
```

**Accessibility Testing:**
```typescript
// ARIA attributes:
const dialog = screen.getByRole('dialog')
expect(dialog).toHaveAttribute('aria-modal', 'true')
expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')

// Focus management:
await waitFor(() => {
  expect(screen.getByLabelText(/name/i)).toHaveFocus()
})

// Role queries:
expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument()
expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
```

## Test Setup

**File:** `src/test/setup.ts`
```typescript
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
```

**What's configured:**
- DOM matchers from jest-dom (toBeInTheDocument, toHaveFocus, etc.)
- IndexedDB polyfill for tests using Dexie.js storage

## Best Practices Observed

1. **Clear test names** - "should X when Y" format makes intent obvious
2. **Consistent mocking cleanup** - `beforeEach` with `vi.clearAllMocks()`
3. **Meaningful assertions** - Multiple expectations per test when logically related
4. **Proper async handling** - Uses `waitFor`, `act`, `userEvent.setup()` appropriately
5. **No implementation details** - Tests query by role, label, text (not data-testid)
6. **Service-level data setup** - Tests use real service calls in `beforeEach` to establish test data
7. **Type-safe test code** - TypeScript used throughout tests with proper types
8. **Grouped test organization** - Tests grouped by feature/concern (Rendering, Validation, Submission, Behavior, Accessibility)

---

*Testing analysis: 2026-01-26*
