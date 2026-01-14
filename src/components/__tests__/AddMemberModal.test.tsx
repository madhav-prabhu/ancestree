/**
 * Tests for the AddMemberModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddMemberModal } from '../AddMemberModal'

describe('AddMemberModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<AddMemberModal isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', () => {
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Add Family Member')).toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/place of birth/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date of death/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('should show name as required', () => {
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      const nameLabel = screen.getByText('Name')
      expect(nameLabel.parentElement).toHaveTextContent('*')
    })
  })

  describe('Form validation', () => {
    it('should show error when name is empty on submit', async () => {
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /add member/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should show error when date of birth is in the future', async () => {
      const user = userEvent.setup()
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await user.type(screen.getByLabelText(/name/i), 'John Doe')

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const futureDateStr = futureDate.toISOString().split('T')[0]

      const dobInput = screen.getByLabelText(/date of birth/i)
      fireEvent.change(dobInput, { target: { value: futureDateStr } })

      fireEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(screen.getByText('Date of birth cannot be in the future')).toBeInTheDocument()
      })
    })

    it('should show error when date of death is before date of birth', async () => {
      const user = userEvent.setup()
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await user.type(screen.getByLabelText(/name/i), 'John Doe')

      const dobInput = screen.getByLabelText(/date of birth/i)
      const dodInput = screen.getByLabelText(/date of death/i)

      fireEvent.change(dobInput, { target: { value: '2000-01-01' } })
      fireEvent.change(dodInput, { target: { value: '1999-01-01' } })

      fireEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(screen.getByText('Date of death cannot be before date of birth')).toBeInTheDocument()
      })
    })
  })

  describe('Form submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      const user = userEvent.setup()
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await user.type(screen.getByLabelText(/name/i), 'John Doe')

      const dobInput = screen.getByLabelText(/date of birth/i)
      fireEvent.change(dobInput, { target: { value: '1990-05-15' } })

      await user.type(screen.getByLabelText(/place of birth/i), 'New York')
      await user.type(screen.getByLabelText(/notes/i), 'Test notes')

      fireEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          dateOfBirth: '1990-05-15',
          placeOfBirth: 'New York',
          dateOfDeath: undefined,
          notes: 'Test notes',
        })
      })
    })

    it('should call onClose after successful submission', async () => {
      const user = userEvent.setup()
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await user.type(screen.getByLabelText(/name/i), 'John Doe')

      fireEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should show error message when submission fails', async () => {
      const user = userEvent.setup()
      mockOnSubmit.mockRejectedValue(new Error('Server error'))

      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await user.type(screen.getByLabelText(/name/i), 'John Doe')

      fireEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should disable form while submitting', async () => {
      const user = userEvent.setup()
      // Create a promise that we can control
      let resolveSubmit!: () => void
      mockOnSubmit.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        })
      )

      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await user.type(screen.getByLabelText(/name/i), 'John Doe')

      fireEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeDisabled()
        expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled()
      })

      // Resolve the promise
      resolveSubmit!()

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Modal behavior', () => {
    it('should close when clicking the close button', async () => {
      const user = userEvent.setup()
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await user.click(screen.getByLabelText(/close modal/i))

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close when clicking the cancel button', async () => {
      const user = userEvent.setup()
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close when pressing Escape', async () => {
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close when clicking the backdrop', async () => {
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      // The dialog itself has the backdrop role - clicking directly on it (not the inner modal) closes it
      const backdrop = screen.getByRole('dialog')
      // Fire click event directly on the backdrop element
      fireEvent.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not close when clicking inside the modal', async () => {
      const user = userEvent.setup()
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await user.click(screen.getByLabelText(/name/i))

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should reset form when reopened', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />
      )

      // Fill in the form
      await user.type(screen.getByLabelText(/name/i), 'John Doe')

      // Close the modal
      rerender(<AddMemberModal isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      // Reopen the modal
      rerender(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      // Form should be empty
      expect(screen.getByLabelText(/name/i)).toHaveValue('')
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria attributes', () => {
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
    })

    it('should focus name input when opened', async () => {
      render(<AddMemberModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />)

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toHaveFocus()
      })
    })
  })
})
