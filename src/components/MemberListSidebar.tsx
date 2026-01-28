/**
 * Collapsible sidebar listing all family members.
 *
 * Features:
 * - Searchable/filterable list
 * - Click to select (highlights in 3D view)
 * - Shows basic info (name, dates)
 * - Sorted alphabetically or by generation
 * - Collapsible sidebar
 */

import { useState, useMemo, useCallback } from 'react'
import type { FamilyMember } from '../models/FamilyMember'

interface MemberListSidebarProps {
  members: FamilyMember[]
  selectedMemberId?: string
  onMemberSelect: (member: FamilyMember) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

type SortOption = 'name' | 'birth' | 'recent'

/**
 * Format a date for display in the list.
 */
function formatDateShort(dateString: string | undefined): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.getFullYear().toString()
  } catch {
    return ''
  }
}

/**
 * Get lifespan string for a member.
 */
function getLifespan(member: FamilyMember): string {
  const birth = formatDateShort(member.dateOfBirth)
  const death = formatDateShort(member.dateOfDeath)

  if (birth && death) {
    return `${birth} - ${death}`
  } else if (birth) {
    return `b. ${birth}`
  } else if (death) {
    return `d. ${death}`
  }
  return ''
}

export function MemberListSidebar({
  members,
  selectedMemberId,
  onMemberSelect,
  isCollapsed = false,
  onToggleCollapse,
}: MemberListSidebarProps) {
  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return members
    }

    const query = searchQuery.toLowerCase().trim()
    return members.filter((member) => {
      const name = member.name.toLowerCase()
      const place = (member.placeOfBirth || '').toLowerCase()
      const notes = (member.notes || '').toLowerCase()

      return name.includes(query) || place.includes(query) || notes.includes(query)
    })
  }, [members, searchQuery])

  // Sort filtered members
  const sortedMembers = useMemo(() => {
    const sorted = [...filteredMembers]

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'birth':
        sorted.sort((a, b) => {
          const aDate = a.dateOfBirth || ''
          const bDate = b.dateOfBirth || ''
          // Members without birth dates go to the end
          if (!aDate && !bDate) return a.name.localeCompare(b.name)
          if (!aDate) return 1
          if (!bDate) return -1
          return aDate.localeCompare(bDate)
        })
        break
      case 'recent':
        sorted.sort((a, b) => {
          // Sort by updatedAt descending (most recent first)
          return b.updatedAt.localeCompare(a.updatedAt)
        })
        break
    }

    return sorted
  }, [filteredMembers, sortBy])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, member: FamilyMember) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onMemberSelect(member)
      }
    },
    [onMemberSelect]
  )

  // Collapsed state - show only toggle button
  if (isCollapsed) {
    return (
      <div className="h-full bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
        <div className="mt-4 text-gray-500 text-sm" style={{ writingMode: 'vertical-rl' }}>
          {members.length} member{members.length !== 1 ? 's' : ''}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col w-72">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">
          Family Members ({members.length})
        </h2>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            aria-label="Search members"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 absolute left-2.5 top-2.5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Sort options */}
      <div className="px-4 py-2 border-b border-gray-200 flex gap-2">
        <span className="text-xs text-gray-500 mr-1">Sort:</span>
        {(['name', 'birth', 'recent'] as SortOption[]).map((option) => (
          <button
            key={option}
            onClick={() => setSortBy(option)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              sortBy === option
                ? 'bg-emerald-100 text-emerald-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-pressed={sortBy === option}
          >
            {option === 'name' ? 'Name' : option === 'birth' ? 'Birth' : 'Recent'}
          </button>
        ))}
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto">
        {sortedMembers.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            {members.length === 0 ? (
              <>
                <p className="text-sm">No family members yet.</p>
                <p className="text-xs mt-1">Add your first member to get started.</p>
              </>
            ) : (
              <>
                <p className="text-sm">No results found.</p>
                <p className="text-xs mt-1">Try a different search term.</p>
              </>
            )}
          </div>
        ) : (
          <ul className="py-2" role="listbox" aria-label="Family members">
            {sortedMembers.map((member) => {
              const isSelected = member.id === selectedMemberId
              const lifespan = getLifespan(member)

              return (
                <li key={member.id} role="option" aria-selected={isSelected}>
                  <button
                    onClick={() => onMemberSelect(member)}
                    onKeyDown={(e) => handleKeyDown(e, member)}
                    className={`w-full px-4 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 border-l-4 border-emerald-500'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-medium text-sm truncate ${
                          isSelected ? 'text-emerald-700' : 'text-gray-900'
                        }`}
                      >
                        {member.name}
                      </span>
                      {member.dateOfDeath && (
                        <span
                          className="text-xs text-gray-400 ml-2 flex-shrink-0"
                          title="Deceased"
                        >
                          *
                        </span>
                      )}
                    </div>
                    {lifespan && (
                      <div className="text-xs text-gray-500 mt-0.5">{lifespan}</div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer with count */}
      {searchQuery && sortedMembers.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          Showing {sortedMembers.length} of {members.length} members
        </div>
      )}
    </div>
  )
}
