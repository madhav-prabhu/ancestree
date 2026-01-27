/**
 * Tests for the EditMemberModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditMemberModal } from '../EditMemberModal'
import type { FamilyMember } from '../../models/FamilyMember'

describe('EditMemberModal', () => {
  const mockMember: FamilyMember = {
    id: '1',
    name: 'John Doe',
    dateOfBirth: '1990-05-15',
    placeOfBirth: 'New York, USA',
    dateOfDeath: undefined,
    notes: 'Some notes about John',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  }

  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <EditMemberModal
          isOpen={false}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should not render when member is null', () => {
      render(
        <EditMemberModal
          isOpen={true}
          member={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true and member is provided', () => {
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Family Member')).toBeInTheDocument()
    })

    it('should pre-populate form with member data', () => {
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe')
      expect(screen.getByLabelText(/date of birth/i)).toHaveValue('15/05/1990')
      expect(screen.getByLabelText(/place of birth/i)).toHaveValue('New York, USA')
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Some notes about John')
    })

    it('should handle member with optional fields undefined', () => {
      const minimalMember: FamilyMember = {
        id: '2',
        name: 'Jane Doe',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      render(
        <EditMemberModal
          isOpen={true}
          member={minimalMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByLabelText(/name/i)).toHaveValue('Jane Doe')
      expect(screen.getByLabelText(/date of birth/i)).toHaveValue('')
      expect(screen.getByLabelText(/place of birth/i)).toHaveValue('')
      expect(screen.getByLabelText(/date of death/i)).toHaveValue('')
      expect(screen.getByLabelText(/notes/i)).toHaveValue('')
    })
  })

  describe('Form validation', () => {
    it('should show error when name is cleared', async () => {
      const user = userEvent.setup()
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const nameInput = screen.getByLabelText(/name/i)
      await user.clear(nameInput)

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show error when date of death is before date of birth', async () => {
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const dodInput = screen.getByLabelText(/date of death/i)
      fireEvent.change(dodInput, { target: { value: '01/01/1980' } })

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText('Date of death cannot be before date of birth')).toBeInTheDocument()
      })
    })
  })

  describe('Form submission', () => {
    it('should call onSubmit with updated data when valid', async () => {
      const user = userEvent.setup()
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      // Change the name
      const nameInput = screen.getByLabelText(/name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'John Smith')

      // Change notes
      const notesInput = screen.getByLabelText(/notes/i)
      await user.clear(notesInput)
      await user.type(notesInput, 'Updated notes')

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('1', {
          name: 'John Smith',
          dateOfBirth: '1990-05-15',
          placeOfBirth: 'New York, USA',
          dateOfDeath: undefined,
          notes: 'Updated notes',
        })
      })
    })

    it('should call onClose after successful submission', async () => {
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should show error message when submission fails', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Server error'))

      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should disable form while submitting', async () => {
      // Create a promise that we can control
      let resolveSubmit!: () => void
      mockOnSubmit.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        })
      )

      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeDisabled()
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
      })

      // Resolve the promise
      resolveSubmit()

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Modal behavior', () => {
    it('should close when clicking the close button', async () => {
      const user = userEvent.setup()
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.click(screen.getByLabelText(/close modal/i))

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close when clicking the cancel button', async () => {
      const user = userEvent.setup()
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close when pressing Escape', async () => {
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close when clicking the backdrop', async () => {
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const backdrop = screen.getByRole('dialog')
      fireEvent.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should update form when member prop changes', async () => {
      const { rerender } = render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe')

      const newMember: FamilyMember = {
        ...mockMember,
        id: '2',
        name: 'Jane Doe',
        dateOfBirth: '1985-03-20',
      }

      rerender(
        <EditMemberModal
          isOpen={true}
          member={newMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toHaveValue('Jane Doe')
        expect(screen.getByLabelText(/date of birth/i)).toHaveValue('20/03/1985')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'edit-modal-title')
    })

    it('should focus name input when opened', async () => {
      render(
        <EditMemberModal
          isOpen={true}
          member={mockMember}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toHaveFocus()
      })
    })
  })
})
