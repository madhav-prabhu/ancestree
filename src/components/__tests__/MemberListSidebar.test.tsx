/**
 * Tests for the MemberListSidebar component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberListSidebar } from '../MemberListSidebar'
import type { FamilyMember } from '../../models/FamilyMember'

describe('MemberListSidebar', () => {
  const mockMembers: FamilyMember[] = [
    {
      id: '1',
      name: 'Alice Smith',
      dateOfBirth: '1980-01-15',
      placeOfBirth: 'New York',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      name: 'Bob Johnson',
      dateOfBirth: '1975-06-20',
      dateOfDeath: '2020-03-10',
      placeOfBirth: 'Boston',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: '3',
      name: 'Carol Williams',
      dateOfBirth: '1990-12-05',
      placeOfBirth: 'Chicago',
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-05T00:00:00.000Z',
    },
  ]

  const mockOnMemberSelect = vi.fn()
  const mockOnToggleCollapse = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the sidebar with member count', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      expect(screen.getByText('Family Members (3)')).toBeInTheDocument()
    })

    it('should render all members in the list', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      expect(screen.getByText('Carol Williams')).toBeInTheDocument()
    })

    it('should show lifespan for members with birth dates', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      expect(screen.getByText('b. 1980')).toBeInTheDocument()
      expect(screen.getByText('1975 - 2020')).toBeInTheDocument()
      expect(screen.getByText('b. 1990')).toBeInTheDocument()
    })

    it('should show empty state when no members', () => {
      render(<MemberListSidebar members={[]} onMemberSelect={mockOnMemberSelect} />)

      expect(screen.getByText('No family members yet.')).toBeInTheDocument()
    })

    it('should render search input', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      expect(screen.getByPlaceholderText('Search members...')).toBeInTheDocument()
    })

    it('should render sort buttons', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Birth' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Recent' })).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('should highlight selected member', () => {
      render(
        <MemberListSidebar
          members={mockMembers}
          selectedMemberId="1"
          onMemberSelect={mockOnMemberSelect}
        />
      )

      // Check that the selected member has the selected class
      const selectedItem = screen.getByRole('option', { selected: true })
      expect(selectedItem).toBeInTheDocument()
    })

    it('should call onMemberSelect when clicking a member', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      await user.click(screen.getByText('Alice Smith'))

      expect(mockOnMemberSelect).toHaveBeenCalledWith(mockMembers[0])
    })

    it('should call onMemberSelect when pressing Enter on a member', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      const aliceButton = screen.getByText('Alice Smith').closest('button')!
      fireEvent.keyDown(aliceButton, { key: 'Enter' })

      expect(mockOnMemberSelect).toHaveBeenCalledWith(mockMembers[0])
    })
  })

  describe('Search', () => {
    it('should filter members by name', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      await user.type(screen.getByPlaceholderText('Search members...'), 'Alice')

      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument()
      expect(screen.queryByText('Carol Williams')).not.toBeInTheDocument()
    })

    it('should filter members by place of birth', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      await user.type(screen.getByPlaceholderText('Search members...'), 'Boston')

      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      expect(screen.queryByText('Carol Williams')).not.toBeInTheDocument()
    })

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      await user.type(screen.getByPlaceholderText('Search members...'), 'xyz123')

      expect(screen.getByText('No results found.')).toBeInTheDocument()
    })

    it('should clear search when clicking clear button', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      await user.type(screen.getByPlaceholderText('Search members...'), 'Alice')

      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument()

      await user.click(screen.getByLabelText('Clear search'))

      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    })

    it('should show filtered count', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      await user.type(screen.getByPlaceholderText('Search members...'), 'Alice')

      expect(screen.getByText('Showing 1 of 3 members')).toBeInTheDocument()
    })

    it('should be case-insensitive', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      await user.type(screen.getByPlaceholderText('Search members...'), 'alice')

      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('should sort by name by default', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      const listItems = screen.getAllByRole('option')
      // Expect alphabetical order: Alice, Bob, Carol
      expect(listItems[0]).toHaveTextContent('Alice Smith')
      expect(listItems[1]).toHaveTextContent('Bob Johnson')
      expect(listItems[2]).toHaveTextContent('Carol Williams')
    })

    it('should sort by birth date when selected', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      await user.click(screen.getByRole('button', { name: 'Birth' }))

      const listItems = screen.getAllByRole('option')
      // Expect birth order: Bob (1975), Alice (1980), Carol (1990)
      expect(listItems[0]).toHaveTextContent('Bob Johnson')
      expect(listItems[1]).toHaveTextContent('Alice Smith')
      expect(listItems[2]).toHaveTextContent('Carol Williams')
    })

    it('should sort by recent activity when selected', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      await user.click(screen.getByRole('button', { name: 'Recent' }))

      const listItems = screen.getAllByRole('option')
      // Expect recent order: Carol (2024-01-05), Bob (2024-01-02), Alice (2024-01-01)
      expect(listItems[0]).toHaveTextContent('Carol Williams')
      expect(listItems[1]).toHaveTextContent('Bob Johnson')
      expect(listItems[2]).toHaveTextContent('Alice Smith')
    })

    it('should highlight active sort option', async () => {
      const user = userEvent.setup()
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      const birthButton = screen.getByRole('button', { name: 'Birth' })
      await user.click(birthButton)

      expect(birthButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Collapsed state', () => {
    it('should show collapsed view when isCollapsed is true', () => {
      render(
        <MemberListSidebar
          members={mockMembers}
          onMemberSelect={mockOnMemberSelect}
          isCollapsed={true}
          onToggleCollapse={mockOnToggleCollapse}
        />
      )

      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
      expect(screen.queryByText('Family Members (3)')).not.toBeInTheDocument()
    })

    it('should show member count in collapsed view', () => {
      render(
        <MemberListSidebar
          members={mockMembers}
          onMemberSelect={mockOnMemberSelect}
          isCollapsed={true}
          onToggleCollapse={mockOnToggleCollapse}
        />
      )

      expect(screen.getByText('3 members')).toBeInTheDocument()
    })

    it('should call onToggleCollapse when clicking expand button', async () => {
      const user = userEvent.setup()
      render(
        <MemberListSidebar
          members={mockMembers}
          onMemberSelect={mockOnMemberSelect}
          isCollapsed={true}
          onToggleCollapse={mockOnToggleCollapse}
        />
      )

      await user.click(screen.getByLabelText('Expand sidebar'))

      expect(mockOnToggleCollapse).toHaveBeenCalled()
    })

    it('should call onToggleCollapse when clicking collapse button', async () => {
      const user = userEvent.setup()
      render(
        <MemberListSidebar
          members={mockMembers}
          onMemberSelect={mockOnMemberSelect}
          isCollapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      )

      await user.click(screen.getByLabelText('Collapse sidebar'))

      expect(mockOnToggleCollapse).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper listbox role', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('should have proper option roles for each member', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      expect(screen.getAllByRole('option')).toHaveLength(3)
    })

    it('should have aria-label on search input', () => {
      render(<MemberListSidebar members={mockMembers} onMemberSelect={mockOnMemberSelect} />)

      expect(screen.getByLabelText('Search members')).toBeInTheDocument()
    })
  })
})
