/**
 * Tests for AddRelationshipModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddRelationshipModal } from './AddRelationshipModal'
import type { FamilyMember } from '../models'

/**
 * Helper to get the submit button (vs the header title).
 */
function getSubmitButton() {
  return screen.getByRole('button', { name: /Add Relationship/i })
}

// Mock family members for testing
const mockMembers: FamilyMember[] = [
  {
    id: 'member-1',
    name: 'John Smith',
    dateOfBirth: '1960-05-15',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'member-2',
    name: 'Jane Smith',
    dateOfBirth: '1962-08-20',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'member-3',
    name: 'Tommy Smith',
    dateOfBirth: '1985-03-10',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
]

describe('AddRelationshipModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  // ==================
  // Rendering Tests
  // ==================

  describe('rendering', () => {
    it('renders nothing when closed', () => {
      render(
        <AddRelationshipModal
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders modal when open', () => {
      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Add Relationship' })).toBeInTheDocument()
    })

    it('renders relationship type dropdown', () => {
      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      expect(screen.getByLabelText(/Relationship Type/)).toBeInTheDocument()
      expect(screen.getByText('Parent-Child')).toBeInTheDocument()
      expect(screen.getByText('Spouse')).toBeInTheDocument()
      expect(screen.getByText('Sibling')).toBeInTheDocument()
    })

    it('renders member selection dropdowns', () => {
      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      // Before selecting type, labels are generic
      expect(screen.getByLabelText(/First Person/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Second Person/)).toBeInTheDocument()
    })

    it('renders all members in dropdowns', () => {
      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      // All members should appear in both dropdowns
      const options = screen.getAllByRole('option')
      expect(options.some((opt) => opt.textContent?.includes('John Smith'))).toBe(true)
      expect(options.some((opt) => opt.textContent?.includes('Jane Smith'))).toBe(true)
      expect(options.some((opt) => opt.textContent?.includes('Tommy Smith'))).toBe(true)
    })

    it('shows create new member option when onCreateMember is provided', () => {
      const mockOnCreateMember = vi.fn()
      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={[mockMembers[0]]}
          onCreateMember={mockOnCreateMember}
        />
      )

      // With onCreateMember prop, user should be able to select "Create new family member"
      const person2Select = screen.getByLabelText(/Second Person/)
      expect(person2Select).toBeInTheDocument()

      // The dropdown should have the "Create new family member" option
      expect(screen.getByText(/Create new family member/)).toBeInTheDocument()
    })
  })

  // ==================
  // Interaction Tests
  // ==================

  describe('interactions', () => {
    it('closes when clicking close button', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.click(screen.getByLabelText('Close modal'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes when clicking backdrop', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.click(screen.getByRole('dialog'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes when pressing Escape', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.keyboard('{Escape}')
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes when clicking Cancel', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.click(screen.getByText('Cancel'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('changes labels based on relationship type selection', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      // Select parent-child
      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'parent-child')

      expect(screen.getByLabelText(/Parent/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Child/)).toBeInTheDocument()
    })

    it('shows marriage date field only for spouse relationship', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      // Initially no marriage date field
      expect(screen.queryByLabelText(/Marriage Date/)).not.toBeInTheDocument()

      // Select spouse
      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'spouse')

      // Now marriage date field should appear
      expect(screen.getByLabelText(/Marriage Date/)).toBeInTheDocument()
    })

    it('excludes selected person from other dropdown', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      // Select John as person 1
      const person1Dropdown = screen.getByLabelText(/First Person/)
      await user.selectOptions(person1Dropdown, 'member-1')

      // John should not appear in person 2 dropdown
      const person2Dropdown = screen.getByLabelText(/Second Person/)
      const person2Options = Array.from(person2Dropdown.querySelectorAll('option'))
      expect(person2Options.some((opt) => opt.value === 'member-1')).toBe(false)
    })
  })

  // ==================
  // Validation Tests
  // ==================

  describe('validation', () => {
    it('shows error when submitting without relationship type', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.click(getSubmitButton())

      expect(screen.getByText(/Please select a relationship type/)).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('shows error when submitting without person 1', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'spouse')
      await user.selectOptions(screen.getByLabelText(/Second Person/), 'member-2')
      await user.click(getSubmitButton())

      expect(screen.getByText(/Please select the first person/)).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('shows error when submitting without person 2', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'spouse')
      await user.selectOptions(screen.getByLabelText(/First Person/), 'member-1')
      await user.click(getSubmitButton())

      expect(screen.getByText(/Please select the second person/)).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('shows error for future marriage date', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'spouse')
      await user.selectOptions(screen.getByLabelText(/First Person/), 'member-1')
      await user.selectOptions(screen.getByLabelText(/Second Person/), 'member-2')

      const marriageDateInput = screen.getByLabelText(/Marriage Date/)
      fireEvent.change(marriageDateInput, { target: { value: '2099-01-01' } })

      await user.click(getSubmitButton())

      expect(screen.getByText(/Marriage date cannot be in the future/)).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  // ==================
  // Submission Tests
  // ==================

  describe('submission', () => {
    it('submits parent-child relationship successfully', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'parent-child')
      await user.selectOptions(screen.getByLabelText(/Parent/), 'member-1')
      await user.selectOptions(screen.getByLabelText(/Child/), 'member-3')
      await user.click(getSubmitButton())

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          'parent-child',
          'member-1',
          'member-3',
          undefined
        )
      })
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('submits spouse relationship with marriage date', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'spouse')
      await user.selectOptions(screen.getByLabelText(/First Person/), 'member-1')
      await user.selectOptions(screen.getByLabelText(/Second Person/), 'member-2')

      const marriageDateInput = screen.getByLabelText(/Marriage Date/)
      fireEvent.change(marriageDateInput, { target: { value: '1985-06-15' } })

      await user.click(getSubmitButton())

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('spouse', 'member-1', 'member-2', {
          marriageDate: '1985-06-15',
        })
      })
    })

    it('submits sibling relationship successfully', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'sibling')
      await user.selectOptions(screen.getByLabelText(/First Sibling/), 'member-1')
      await user.selectOptions(screen.getByLabelText(/Second Sibling/), 'member-2')
      await user.click(getSubmitButton())

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('sibling', 'member-1', 'member-2', undefined)
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'spouse')
      await user.selectOptions(screen.getByLabelText(/First Person/), 'member-1')
      await user.selectOptions(screen.getByLabelText(/Second Person/), 'member-2')
      await user.click(getSubmitButton())

      await waitFor(() => {
        expect(screen.getByText('Adding...')).toBeInTheDocument()
      })
    })

    it('shows error message on submission failure', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue(new Error('This relationship already exists'))

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'spouse')
      await user.selectOptions(screen.getByLabelText(/First Person/), 'member-1')
      await user.selectOptions(screen.getByLabelText(/Second Person/), 'member-2')
      await user.click(getSubmitButton())

      await waitFor(() => {
        expect(screen.getByText('This relationship already exists')).toBeInTheDocument()
      })
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  // ==================
  // Pre-selection Tests
  // ==================

  describe('pre-selection', () => {
    it('pre-selects member when provided', () => {
      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
          preSelectedMemberId="member-1"
        />
      )

      const person1Dropdown = screen.getByLabelText(/First Person/) as HTMLSelectElement
      expect(person1Dropdown.value).toBe('member-1')
    })

    it('pre-selects relationship type when provided', () => {
      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
          preSelectedType="spouse"
        />
      )

      const typeDropdown = screen.getByLabelText(/Relationship Type/) as HTMLSelectElement
      expect(typeDropdown.value).toBe('spouse')
    })
  })

  // ==================
  // Preview Tests
  // ==================

  describe('relationship preview', () => {
    it('shows parent-child preview', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'parent-child')
      await user.selectOptions(screen.getByLabelText(/Parent/), 'member-1')
      await user.selectOptions(screen.getByLabelText(/Child/), 'member-3')

      expect(screen.getByText(/John Smith is the parent of Tommy Smith/)).toBeInTheDocument()
    })

    it('shows spouse preview with marriage date', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'spouse')
      await user.selectOptions(screen.getByLabelText(/First Person/), 'member-1')
      await user.selectOptions(screen.getByLabelText(/Second Person/), 'member-2')

      const marriageDateInput = screen.getByLabelText(/Marriage Date/)
      fireEvent.change(marriageDateInput, { target: { value: '1985-06-15' } })

      expect(
        screen.getByText(/John Smith and Jane Smith are spouses \(married 1985-06-15\)/)
      ).toBeInTheDocument()
    })

    it('shows sibling preview', async () => {
      const user = userEvent.setup()

      render(
        <AddRelationshipModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          members={mockMembers}
        />
      )

      await user.selectOptions(screen.getByLabelText(/Relationship Type/), 'sibling')
      await user.selectOptions(screen.getByLabelText(/First Sibling/), 'member-1')
      await user.selectOptions(screen.getByLabelText(/Second Sibling/), 'member-2')

      expect(screen.getByText(/John Smith and Jane Smith are siblings/)).toBeInTheDocument()
    })
  })
})
