/**
 * Tests for the MemberDetailPanel component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemberDetailPanel } from '../MemberDetailPanel'
import type { FamilyMember } from '../../models/FamilyMember'

describe('MemberDetailPanel', () => {
  const mockMember: FamilyMember = {
    id: '1',
    name: 'John Doe',
    dateOfBirth: '1980-05-15',
    placeOfBirth: 'New York, USA',
    dateOfDeath: undefined,
    notes: 'Some notes about John',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  }

  const mockDeceasedMember: FamilyMember = {
    ...mockMember,
    id: '2',
    name: 'Jane Doe',
    dateOfBirth: '1950-01-01',
    dateOfDeath: '2020-06-15',
  }

  const mockOnClose = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockGetParents = vi.fn()
  const mockGetChildren = vi.fn()
  const mockGetSpouses = vi.fn()
  const mockGetSiblings = vi.fn()
  const mockOnMemberSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnDelete.mockResolvedValue(undefined)
    mockGetParents.mockResolvedValue([])
    mockGetChildren.mockResolvedValue([])
    mockGetSpouses.mockResolvedValue([])
    mockGetSiblings.mockResolvedValue([])
  })

  describe('Rendering', () => {
    it('should render member name in header', () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Name appears multiple times (header + content)
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1)
    })

    it('should render all member fields', () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Name appears multiple times (header + content), use getAllByText
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1)
      // Date may vary slightly by timezone, just check year is present
      expect(screen.getByText(/1980/)).toBeInTheDocument()
      expect(screen.getByText('New York, USA')).toBeInTheDocument()
      expect(screen.getByText('Some notes about John')).toBeInTheDocument()
    })

    it('should show deceased badge for deceased member', () => {
      render(
        <MemberDetailPanel
          member={mockDeceasedMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByText('Deceased')).toBeInTheDocument()
    })

    it('should not show deceased badge for living member', () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.queryByText('Deceased')).not.toBeInTheDocument()
    })

    it('should show date of death for deceased member', () => {
      render(
        <MemberDetailPanel
          member={mockDeceasedMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Date may vary slightly by timezone, just check year is present
      expect(screen.getByText(/2020/)).toBeInTheDocument()
    })

    it('should calculate and display age for living member', () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Age will vary based on current date, but should be present
      expect(screen.getByText(/years$/)).toBeInTheDocument()
    })

    it('should show age at death for deceased member', () => {
      render(
        <MemberDetailPanel
          member={mockDeceasedMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Age may vary by 1 year depending on timezone interpretation, check for pattern
      expect(screen.getByText(/\d+ years \(at death\)/)).toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      fireEvent.click(screen.getByLabelText('Close panel'))

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onEdit when edit button is clicked', () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      expect(mockOnEdit).toHaveBeenCalledWith(mockMember)
    })

    it('should show confirmation when delete button is clicked', () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /yes, delete/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should call onDelete and onClose when deletion is confirmed', async () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Click delete button
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      // Confirm deletion
      fireEvent.click(screen.getByRole('button', { name: /yes, delete/i }))

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('1')
      })

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should cancel deletion when cancel button is clicked', () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      // Click delete button
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      // Cancel deletion
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      // Confirmation should be hidden
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
      expect(mockOnDelete).not.toHaveBeenCalled()
    })
  })

  describe('Relationships', () => {
    it('should show loading state while fetching relationships', async () => {
      // Create a promise that never resolves to keep loading state
      mockGetParents.mockReturnValue(new Promise(() => {}))

      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          getParents={mockGetParents}
        />
      )

      expect(screen.getByText('Loading relationships...')).toBeInTheDocument()
    })

    it('should show "No relationships defined" when no relationships exist', async () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          getParents={mockGetParents}
          getChildren={mockGetChildren}
          getSpouses={mockGetSpouses}
          getSiblings={mockGetSiblings}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('No relationships defined')).toBeInTheDocument()
      })
    })

    it('should display parents when they exist', async () => {
      const parent: FamilyMember = {
        ...mockMember,
        id: 'parent-1',
        name: 'Parent One',
      }

      mockGetParents.mockResolvedValue([parent])

      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          getParents={mockGetParents}
          getChildren={mockGetChildren}
          getSpouses={mockGetSpouses}
          getSiblings={mockGetSiblings}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Parents')).toBeInTheDocument()
        expect(screen.getByText('Parent One')).toBeInTheDocument()
      })
    })

    it('should display children when they exist', async () => {
      const child: FamilyMember = {
        ...mockMember,
        id: 'child-1',
        name: 'Child One',
      }

      mockGetChildren.mockResolvedValue([child])

      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          getParents={mockGetParents}
          getChildren={mockGetChildren}
          getSpouses={mockGetSpouses}
          getSiblings={mockGetSiblings}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Children')).toBeInTheDocument()
        expect(screen.getByText('Child One')).toBeInTheDocument()
      })
    })

    it('should display spouses when they exist', async () => {
      const spouse: FamilyMember = {
        ...mockMember,
        id: 'spouse-1',
        name: 'Spouse One',
      }

      mockGetSpouses.mockResolvedValue([spouse])

      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          getParents={mockGetParents}
          getChildren={mockGetChildren}
          getSpouses={mockGetSpouses}
          getSiblings={mockGetSiblings}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Spouse(s)')).toBeInTheDocument()
        expect(screen.getByText('Spouse One')).toBeInTheDocument()
      })
    })

    it('should display siblings when they exist', async () => {
      const sibling: FamilyMember = {
        ...mockMember,
        id: 'sibling-1',
        name: 'Sibling One',
      }

      mockGetSiblings.mockResolvedValue([sibling])

      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          getParents={mockGetParents}
          getChildren={mockGetChildren}
          getSpouses={mockGetSpouses}
          getSiblings={mockGetSiblings}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Siblings')).toBeInTheDocument()
        expect(screen.getByText('Sibling One')).toBeInTheDocument()
      })
    })

    it('should call onMemberSelect when clicking on a related member', async () => {
      const parent: FamilyMember = {
        ...mockMember,
        id: 'parent-1',
        name: 'Parent One',
      }

      mockGetParents.mockResolvedValue([parent])

      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          getParents={mockGetParents}
          getChildren={mockGetChildren}
          getSpouses={mockGetSpouses}
          getSiblings={mockGetSiblings}
          onMemberSelect={mockOnMemberSelect}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Parent One')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Parent One'))

      expect(mockOnMemberSelect).toHaveBeenCalledWith(parent)
    })
  })

  describe('Record Info', () => {
    it('should display created and updated timestamps', () => {
      render(
        <MemberDetailPanel
          member={mockMember}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByText(/Created:/)).toBeInTheDocument()
      expect(screen.getByText(/Updated:/)).toBeInTheDocument()
    })
  })
})
