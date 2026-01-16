/**
 * Modal dialog for adding a relationship between family members.
 *
 * Features:
 * - Select relationship type (parent-child, spouse, sibling)
 * - Select two members from dropdowns
 * - For parent-child: specify who is parent vs child
 * - For spouse: optional marriage date field
 * - Validates no duplicate relationships
 */

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react'
import type { FamilyMember, RelationshipType } from '../models'

interface AddRelationshipModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (
    type: RelationshipType,
    person1Id: string,
    person2Id: string,
    metadata?: { marriageDate?: string; divorceDate?: string }
  ) => Promise<void>
  /** Callback to create a new member - returns the new member's ID */
  onCreateMember?: (data: { name: string; dateOfBirth?: string }) => Promise<string>
  members: FamilyMember[]
  /** Pre-selected member (e.g., when opened from detail panel) */
  preSelectedMemberId?: string
  /** Pre-selected relationship type */
  preSelectedType?: RelationshipType
}

interface FormErrors {
  type?: string
  person1?: string
  person2?: string
  marriageDate?: string
  newMemberName?: string
  general?: string
}

/** Special value to indicate creating a new member */
const CREATE_NEW_MEMBER = '__create_new__'

type RelationshipTypeOption = {
  value: RelationshipType
  label: string
  description: string
  person1Label: string
  person2Label: string
}

const RELATIONSHIP_TYPES: RelationshipTypeOption[] = [
  {
    value: 'parent-child',
    label: 'Parent-Child',
    description: 'Define a parent and their child',
    person1Label: 'Parent',
    person2Label: 'Child',
  },
  {
    value: 'spouse',
    label: 'Spouse',
    description: 'Marriage or partnership',
    person1Label: 'First Person',
    person2Label: 'Second Person',
  },
  {
    value: 'sibling',
    label: 'Sibling',
    description: 'Brothers or sisters',
    person1Label: 'First Sibling',
    person2Label: 'Second Sibling',
  },
]

export function AddRelationshipModal({
  isOpen,
  onClose,
  onSubmit,
  onCreateMember,
  members,
  preSelectedMemberId,
  preSelectedType,
}: AddRelationshipModalProps) {
  // Form state
  const [relationshipType, setRelationshipType] = useState<RelationshipType | ''>('')
  const [person1Id, setPerson1Id] = useState('')
  const [person2Id, setPerson2Id] = useState('')
  // For parent-child: determines if we're adding a parent or child to the selected member
  const [parentChildDirection, setParentChildDirection] = useState<'add-child' | 'add-parent'>('add-child')
  const [marriageDate, setMarriageDate] = useState('')

  // New member form state (when creating a new member inline)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberDob, setNewMemberDob] = useState('')

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if we're creating a new member
  const isCreatingNewMember = person2Id === CREATE_NEW_MEMBER

  // Refs
  const modalRef = useRef<HTMLDivElement>(null)

  // Get the current type configuration
  const currentTypeConfig = RELATIONSHIP_TYPES.find((t) => t.value === relationshipType)

  // For parent-child, compute labels based on direction
  const person1Label = relationshipType === 'parent-child'
    ? (parentChildDirection === 'add-child' ? 'Parent' : 'Child')
    : (currentTypeConfig?.person1Label || 'First Person')

  const person2Label = relationshipType === 'parent-child'
    ? (parentChildDirection === 'add-child' ? 'Child' : 'Parent')
    : (currentTypeConfig?.person2Label || 'Second Person')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRelationshipType(preSelectedType || '')
      setPerson1Id(preSelectedMemberId || '')
      setPerson2Id('')
      setMarriageDate('')
      setNewMemberName('')
      setNewMemberDob('')
      setParentChildDirection('add-child')
      setErrors({})
      setIsSubmitting(false)
    }
  }, [isOpen, preSelectedMemberId, preSelectedType])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, onClose])

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isSubmitting) {
        onClose()
      }
    },
    [isSubmitting, onClose]
  )

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Type is required
    if (!relationshipType) {
      newErrors.type = 'Please select a relationship type'
    }

    // Person 1 is required
    if (!person1Id) {
      newErrors.person1 = `Please select the ${person1Label.toLowerCase()}`
    }

    // Person 2 is required (either existing member or creating new)
    if (!person2Id) {
      newErrors.person2 = `Please select the ${person2Label.toLowerCase()}`
    }

    // If creating new member, name is required
    if (isCreatingNewMember) {
      if (!newMemberName.trim()) {
        newErrors.newMemberName = 'Name is required for the new family member'
      }
    } else {
      // Can't select the same person (only check if not creating new)
      if (person1Id && person2Id && person1Id === person2Id) {
        newErrors.person2 = 'Cannot create a relationship with the same person'
      }
    }

    // Validate marriage date if provided
    if (marriageDate) {
      const date = new Date(marriageDate)
      if (isNaN(date.getTime())) {
        newErrors.marriageDate = 'Invalid date format'
      } else if (date > new Date()) {
        newErrors.marriageDate = 'Marriage date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      let actualPerson2Id = person2Id

      // If creating a new member, create them first
      if (isCreatingNewMember && onCreateMember) {
        actualPerson2Id = await onCreateMember({
          name: newMemberName.trim(),
          dateOfBirth: newMemberDob || undefined,
        })
      }

      const metadata =
        relationshipType === 'spouse' && marriageDate ? { marriageDate } : undefined

      // For parent-child with 'add-parent' direction, swap the IDs
      // because person1 is always parent and person2 is always child in the data model
      let finalPerson1Id = person1Id
      let finalPerson2Id = actualPerson2Id

      if (relationshipType === 'parent-child' && parentChildDirection === 'add-parent') {
        // person2 (the one we're adding) is the parent, person1 is the child
        finalPerson1Id = actualPerson2Id
        finalPerson2Id = person1Id
      }

      await onSubmit(relationshipType as RelationshipType, finalPerson1Id, finalPerson2Id, metadata)
      onClose()
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to add relationship',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get available members for person 2 (exclude person 1)
  const person2Options = members.filter((m) => m.id !== person1Id)

  // Get available members for person 1 (exclude person 2)
  const person1Options = members.filter((m) => m.id !== person2Id)

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
          <h2 id="modal-title" className="text-lg font-semibold">
            Add Relationship
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-white/70 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close modal"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* General error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.general}
            </div>
          )}

          {/* Relationship Type */}
          <div>
            <label
              htmlFor="relationshipType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Relationship Type <span className="text-red-500">*</span>
            </label>
            <select
              id="relationshipType"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as RelationshipType | '')}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select relationship type...</option>
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
            {currentTypeConfig && (
              <p className="mt-1 text-sm text-gray-500">{currentTypeConfig.description}</p>
            )}
          </div>

          {/* Direction toggle for parent-child relationships */}
          {relationshipType === 'parent-child' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setParentChildDirection('add-child')}
                disabled={isSubmitting}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  parentChildDirection === 'add-child'
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Add a Child
              </button>
              <button
                type="button"
                onClick={() => setParentChildDirection('add-parent')}
                disabled={isSubmitting}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  parentChildDirection === 'add-parent'
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Add a Parent
              </button>
            </div>
          )}

          {/* Person 1 */}
          <div>
            <label htmlFor="person1" className="block text-sm font-medium text-gray-700 mb-1">
              {person1Label}{' '}
              <span className="text-red-500">*</span>
            </label>
            <select
              id="person1"
              value={person1Id}
              onChange={(e) => setPerson1Id(e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                errors.person1 ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">
                Select {person1Label.toLowerCase()}...
              </option>
              {person1Options.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {member.dateOfBirth && ` (b. ${member.dateOfBirth.substring(0, 4)})`}
                </option>
              ))}
            </select>
            {errors.person1 && <p className="mt-1 text-sm text-red-600">{errors.person1}</p>}
          </div>

          {/* Person 2 */}
          <div>
            <label htmlFor="person2" className="block text-sm font-medium text-gray-700 mb-1">
              {person2Label}{' '}
              <span className="text-red-500">*</span>
            </label>
            <select
              id="person2"
              value={person2Id}
              onChange={(e) => setPerson2Id(e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                errors.person2 ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">
                Select {person2Label.toLowerCase()}...
              </option>
              {/* Option to create a new member */}
              {onCreateMember && (
                <option value={CREATE_NEW_MEMBER} className="font-semibold text-emerald-600">
                  ➕ Create new family member...
                </option>
              )}
              {/* Existing members */}
              {person2Options.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {member.dateOfBirth && ` (b. ${member.dateOfBirth.substring(0, 4)})`}
                </option>
              ))}
            </select>
            {errors.person2 && <p className="mt-1 text-sm text-red-600">{errors.person2}</p>}
          </div>

          {/* New member form (shown when creating a new member) */}
          {isCreatingNewMember && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-emerald-800">
                New {person2Label}
              </h3>

              <div>
                <label htmlFor="newMemberName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="newMemberName"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter name..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                    errors.newMemberName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.newMemberName && (
                  <p className="mt-1 text-sm text-red-600">{errors.newMemberName}</p>
                )}
              </div>

              <div>
                <label htmlFor="newMemberDob" className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="newMemberDob"
                  value={newMemberDob}
                  onChange={(e) => setNewMemberDob(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          )}

          {/* Marriage Date (only for spouse relationships) */}
          {relationshipType === 'spouse' && (
            <div>
              <label
                htmlFor="marriageDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Marriage Date
              </label>
              <input
                type="date"
                id="marriageDate"
                value={marriageDate}
                onChange={(e) => setMarriageDate(e.target.value)}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                  errors.marriageDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.marriageDate && (
                <p className="mt-1 text-sm text-red-600">{errors.marriageDate}</p>
              )}
            </div>
          )}

          {/* Relationship Preview */}
          {person1Id && person2Id && relationshipType && (isCreatingNewMember ? newMemberName.trim() : true) && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
              <strong>Preview:</strong>{' '}
              {(() => {
                const person1Name = members.find((m) => m.id === person1Id)?.name || 'Unknown'
                const person2Name = isCreatingNewMember ? `${newMemberName.trim()} (new)` : members.find((m) => m.id === person2Id)?.name || 'Unknown'

                if (relationshipType === 'parent-child') {
                  if (parentChildDirection === 'add-child') {
                    return <>{person1Name} is the parent of {person2Name}</>
                  } else {
                    return <>{person2Name} is the parent of {person1Name}</>
                  }
                }
                if (relationshipType === 'spouse') {
                  return <>{person1Name} and {person2Name} are spouses{marriageDate && ` (married ${marriageDate})`}</>
                }
                if (relationshipType === 'sibling') {
                  return <>{person1Name} and {person2Name} are siblings</>
                }
                return null
              })()}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Adding...
                </>
              ) : (
                'Add Relationship'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
