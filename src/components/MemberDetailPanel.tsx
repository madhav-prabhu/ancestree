/**
 * Side panel showing full details of a selected family member.
 *
 * Features:
 * - Shows all member fields
 * - Edit button to open edit form
 * - Delete button with confirmation
 * - Shows relationships (parents, children, spouse) with remove option
 * - Close button
 */

import { useState, useEffect, useCallback } from 'react'
import type { FamilyMember } from '../models/FamilyMember'
import type { Relationship, RelationshipType } from '../models/Relationship'

/**
 * Quick action type for adding specific relationship types.
 */
export type QuickRelationshipAction = 'parent' | 'child' | 'spouse' | 'sibling'

interface MemberDetailPanelProps {
  member: FamilyMember
  onClose: () => void
  onEdit: (member: FamilyMember) => void
  onDelete: (memberId: string) => Promise<void>
  getParents?: (memberId: string) => Promise<FamilyMember[]>
  getChildren?: (memberId: string) => Promise<FamilyMember[]>
  getSpouses?: (memberId: string) => Promise<FamilyMember[]>
  getSiblings?: (memberId: string) => Promise<FamilyMember[]>
  onMemberSelect?: (member: FamilyMember) => void
  /** Get all relationships for a member */
  getRelationshipsForMember?: (memberId: string) => Promise<Relationship[]>
  /** Delete a relationship by ID */
  onDeleteRelationship?: (relationshipId: string) => Promise<void>
  /** Open the add relationship modal */
  onAddRelationship?: () => void
  /** Open add relationship modal with pre-configured type */
  onQuickAddRelationship?: (action: QuickRelationshipAction) => void
}

/**
 * Format a date string for display.
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Unknown'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

/**
 * Calculate age from date of birth (and optionally date of death).
 */
function calculateAge(
  dateOfBirth: string | undefined,
  dateOfDeath: string | undefined
): string | null {
  if (!dateOfBirth) return null

  const birthDate = new Date(dateOfBirth)
  const endDate = dateOfDeath ? new Date(dateOfDeath) : new Date()

  let age = endDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = endDate.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
    age--
  }

  return age >= 0 ? `${age} years${dateOfDeath ? ' (at death)' : ''}` : null
}

/**
 * Represents a related member with their relationship info.
 */
interface RelatedMember {
  member: FamilyMember
  relationshipId: string
  relationshipType: RelationshipType
  marriageDate?: string
}

export function MemberDetailPanel({
  member,
  onClose,
  onEdit,
  onDelete,
  getParents,
  getChildren,
  getSpouses,
  getSiblings,
  onMemberSelect,
  getRelationshipsForMember,
  onDeleteRelationship,
  onAddRelationship,
  onQuickAddRelationship,
}: MemberDetailPanelProps) {
  // UI state
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Relationship state
  const [parents, setParents] = useState<RelatedMember[]>([])
  const [children, setChildren] = useState<RelatedMember[]>([])
  const [spouses, setSpouses] = useState<RelatedMember[]>([])
  const [siblings, setSiblings] = useState<RelatedMember[]>([])
  const [loadingRelationships, setLoadingRelationships] = useState(false)

  // Relationship deletion state
  const [deletingRelationshipId, setDeletingRelationshipId] = useState<string | null>(null)
  const [confirmDeleteRelationship, setConfirmDeleteRelationship] = useState<{
    id: string
    memberName: string
    type: string
  } | null>(null)

  // Load relationships when member changes
  useEffect(() => {
    const loadRelationships = async () => {
      setLoadingRelationships(true)
      try {
        // Get relationships with IDs
        const relationships = getRelationshipsForMember
          ? await getRelationshipsForMember(member.id)
          : []

        // Get the related members
        const [parentsList, childrenList, spousesList, siblingsList] = await Promise.all([
          getParents?.(member.id) || Promise.resolve([]),
          getChildren?.(member.id) || Promise.resolve([]),
          getSpouses?.(member.id) || Promise.resolve([]),
          getSiblings?.(member.id) || Promise.resolve([]),
        ])

        // Map members to RelatedMember with relationship info
        const mapToRelatedMembers = (
          members: FamilyMember[],
          type: RelationshipType,
          isChild: boolean = false
        ): RelatedMember[] => {
          return members.map((m) => {
            // Find the relationship for this member
            const rel = relationships.find((r) => {
              if (r.type !== type) return false
              if (type === 'parent-child') {
                // For parents: this member is person2Id (child), parent is person1Id
                // For children: this member is person1Id (parent), child is person2Id
                if (isChild) {
                  return r.person1Id === member.id && r.person2Id === m.id
                } else {
                  return r.person2Id === member.id && r.person1Id === m.id
                }
              }
              // For spouse/sibling: either order
              return (
                (r.person1Id === member.id && r.person2Id === m.id) ||
                (r.person1Id === m.id && r.person2Id === member.id)
              )
            })

            return {
              member: m,
              relationshipId: rel?.id || '',
              relationshipType: type,
              marriageDate: rel?.marriageDate,
            }
          })
        }

        setParents(mapToRelatedMembers(parentsList, 'parent-child', false))
        setChildren(mapToRelatedMembers(childrenList, 'parent-child', true))
        setSpouses(mapToRelatedMembers(spousesList, 'spouse'))
        setSiblings(mapToRelatedMembers(siblingsList, 'sibling'))
      } catch (error) {
        console.error('Error loading relationships:', error)
      } finally {
        setLoadingRelationships(false)
      }
    }

    loadRelationships()
  }, [member.id, getParents, getChildren, getSpouses, getSiblings, getRelationshipsForMember])

  // Handle member delete
  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(member.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete member:', error)
      // Reset state if deletion fails
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Handle relationship delete
  const handleDeleteRelationship = useCallback(async () => {
    if (!confirmDeleteRelationship || !onDeleteRelationship) return

    setDeletingRelationshipId(confirmDeleteRelationship.id)
    try {
      await onDeleteRelationship(confirmDeleteRelationship.id)
      setConfirmDeleteRelationship(null)
    } catch (error) {
      console.error('Failed to delete relationship:', error)
    } finally {
      setDeletingRelationshipId(null)
    }
  }, [confirmDeleteRelationship, onDeleteRelationship])

  // Calculate age
  const age = calculateAge(member.dateOfBirth, member.dateOfDeath)

  // Check if member is deceased
  const isDeceased = !!member.dateOfDeath

  // Check if we can manage relationships
  const canManageRelationships = !!onDeleteRelationship

  return (
    <div className="bg-white h-full flex flex-col shadow-lg border-l border-gray-200">
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold truncate">{member.name}</h2>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
          aria-label="Close panel"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status badge */}
        {isDeceased && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
            Deceased
          </div>
        )}

        {/* Basic Information */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Basic Information
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Full Name</dt>
              <dd className="text-base font-medium text-gray-900">{member.name}</dd>
            </div>

            {member.dateOfBirth && (
              <div>
                <dt className="text-sm text-gray-500">Date of Birth</dt>
                <dd className="text-base text-gray-900">{formatDate(member.dateOfBirth)}</dd>
              </div>
            )}

            {member.placeOfBirth && (
              <div>
                <dt className="text-sm text-gray-500">Place of Birth</dt>
                <dd className="text-base text-gray-900">{member.placeOfBirth}</dd>
              </div>
            )}

            {member.dateOfDeath && (
              <div>
                <dt className="text-sm text-gray-500">Date of Death</dt>
                <dd className="text-base text-gray-900">{formatDate(member.dateOfDeath)}</dd>
              </div>
            )}

            {age && (
              <div>
                <dt className="text-sm text-gray-500">Age</dt>
                <dd className="text-base text-gray-900">{age}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Notes */}
        {member.notes && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Notes
            </h3>
            <p className="text-base text-gray-700 whitespace-pre-wrap">{member.notes}</p>
          </section>
        )}

        {/* Relationships */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Relationships
            </h3>
            {onAddRelationship && (
              <button
                onClick={onAddRelationship}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                + Add
              </button>
            )}
          </div>

          {/* Relationship delete confirmation */}
          {confirmDeleteRelationship && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700 mb-2">
                Remove {confirmDeleteRelationship.type} relationship with{' '}
                <strong>{confirmDeleteRelationship.memberName}</strong>?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteRelationship}
                  disabled={!!deletingRelationshipId}
                  className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                >
                  {deletingRelationshipId ? 'Removing...' : 'Remove'}
                </button>
                <button
                  onClick={() => setConfirmDeleteRelationship(null)}
                  disabled={!!deletingRelationshipId}
                  className="px-3 py-1 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loadingRelationships ? (
            <p className="text-sm text-gray-500">Loading relationships...</p>
          ) : (
            <div className="space-y-4">
              {/* Parents */}
              {parents.length > 0 && (
                <RelationshipGroup
                  title="Parents"
                  relatedMembers={parents}
                  onMemberClick={onMemberSelect}
                  onRemove={
                    canManageRelationships
                      ? (rm) =>
                          setConfirmDeleteRelationship({
                            id: rm.relationshipId,
                            memberName: rm.member.name,
                            type: 'parent',
                          })
                      : undefined
                  }
                />
              )}

              {/* Spouses */}
              {spouses.length > 0 && (
                <RelationshipGroup
                  title="Spouse(s)"
                  relatedMembers={spouses}
                  onMemberClick={onMemberSelect}
                  onRemove={
                    canManageRelationships
                      ? (rm) =>
                          setConfirmDeleteRelationship({
                            id: rm.relationshipId,
                            memberName: rm.member.name,
                            type: 'spouse',
                          })
                      : undefined
                  }
                  showMarriageDate
                />
              )}

              {/* Siblings */}
              {siblings.length > 0 && (
                <RelationshipGroup
                  title="Siblings"
                  relatedMembers={siblings}
                  onMemberClick={onMemberSelect}
                  onRemove={
                    canManageRelationships
                      ? (rm) =>
                          setConfirmDeleteRelationship({
                            id: rm.relationshipId,
                            memberName: rm.member.name,
                            type: 'sibling',
                          })
                      : undefined
                  }
                />
              )}

              {/* Children */}
              {children.length > 0 && (
                <RelationshipGroup
                  title="Children"
                  relatedMembers={children}
                  onMemberClick={onMemberSelect}
                  onRemove={
                    canManageRelationships
                      ? (rm) =>
                          setConfirmDeleteRelationship({
                            id: rm.relationshipId,
                            memberName: rm.member.name,
                            type: 'child',
                          })
                      : undefined
                  }
                />
              )}

              {/* No relationships */}
              {parents.length === 0 &&
                spouses.length === 0 &&
                siblings.length === 0 &&
                children.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No relationships defined</p>
                )}

              {/* Quick action buttons */}
              {onQuickAddRelationship && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Quick add:</p>
                  <div className="flex flex-wrap gap-2">
                    <QuickActionButton
                      label="+ Parent"
                      onClick={() => onQuickAddRelationship('parent')}
                    />
                    <QuickActionButton
                      label="+ Child"
                      onClick={() => onQuickAddRelationship('child')}
                    />
                    <QuickActionButton
                      label="+ Spouse"
                      onClick={() => onQuickAddRelationship('spouse')}
                    />
                    <QuickActionButton
                      label="+ Sibling"
                      onClick={() => onQuickAddRelationship('sibling')}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Metadata */}
        <section className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Record Info
          </h3>
          <dl className="space-y-2 text-xs text-gray-500">
            <div>
              <dt className="inline">Created: </dt>
              <dd className="inline">{new Date(member.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="inline">Updated: </dt>
              <dd className="inline">{new Date(member.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Are you sure you want to delete <strong>{member.name}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(member)}
              className="flex-1 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Helper component to display a group of related family members.
 */
interface RelationshipGroupProps {
  title: string
  relatedMembers: RelatedMember[]
  onMemberClick?: (member: FamilyMember) => void
  onRemove?: (relatedMember: RelatedMember) => void
  showMarriageDate?: boolean
}

function RelationshipGroup({
  title,
  relatedMembers,
  onMemberClick,
  onRemove,
  showMarriageDate,
}: RelationshipGroupProps) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      <ul className="space-y-2">
        {relatedMembers.map((rm) => (
          <li key={rm.member.id} className="flex items-center justify-between group">
            <div className="flex-1">
              {onMemberClick ? (
                <button
                  onClick={() => onMemberClick(rm.member)}
                  className="text-emerald-600 hover:text-emerald-700 hover:underline text-sm"
                >
                  {rm.member.name}
                </button>
              ) : (
                <span className="text-sm text-gray-800">{rm.member.name}</span>
              )}
              {showMarriageDate && rm.marriageDate && (
                <span className="text-xs text-gray-500 ml-2">
                  (married {rm.marriageDate})
                </span>
              )}
            </div>
            {onRemove && rm.relationshipId && (
              <button
                onClick={() => onRemove(rm)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-opacity"
                aria-label={`Remove relationship with ${rm.member.name}`}
                title="Remove relationship"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Quick action button for adding relationships.
 */
interface QuickActionButtonProps {
  label: string
  onClick: () => void
}

function QuickActionButton({ label, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
    >
      {label}
    </button>
  )
}
