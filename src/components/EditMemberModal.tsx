/**
 * Modal dialog for editing an existing family member.
 *
 * Features:
 * - Pre-populated with existing member data
 * - Same validation as AddMemberModal
 * - Closes on success, escape key, or clicking outside
 */

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react'
import type { FamilyMember } from '../models/FamilyMember'
import type { UpdateMemberInput } from '../services/familyService'

interface EditMemberModalProps {
  isOpen: boolean
  member: FamilyMember | null
  onClose: () => void
  onSubmit: (id: string, data: UpdateMemberInput) => Promise<void>
}

interface FormErrors {
  name?: string
  dateOfBirth?: string
  dateOfDeath?: string
  general?: string
}

export function EditMemberModal({ isOpen, member, onClose, onSubmit }: EditMemberModalProps) {
  // Form state
  const [name, setName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [placeOfBirth, setPlaceOfBirth] = useState('')
  const [dateOfDeath, setDateOfDeath] = useState('')
  const [notes, setNotes] = useState('')

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Refs
  const modalRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Populate form when modal opens or member changes
  useEffect(() => {
    if (isOpen && member) {
      setName(member.name)
      setDateOfBirth(member.dateOfBirth || '')
      setPlaceOfBirth(member.placeOfBirth || '')
      setDateOfDeath(member.dateOfDeath || '')
      setNotes(member.notes || '')
      setErrors({})
      setIsSubmitting(false)

      // Focus name input when modal opens
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [isOpen, member])

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

    // Name is required
    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    // Date of birth validation
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth)
      if (isNaN(dob.getTime())) {
        newErrors.dateOfBirth = 'Invalid date format'
      } else if (dob > new Date()) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future'
      }
    }

    // Date of death validation
    if (dateOfDeath) {
      const dod = new Date(dateOfDeath)
      if (isNaN(dod.getTime())) {
        newErrors.dateOfDeath = 'Invalid date format'
      } else if (dod > new Date()) {
        newErrors.dateOfDeath = 'Date of death cannot be in the future'
      } else if (dateOfBirth) {
        const dob = new Date(dateOfBirth)
        if (dod < dob) {
          newErrors.dateOfDeath = 'Date of death cannot be before date of birth'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !member) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const data: UpdateMemberInput = {
        name: name.trim(),
        dateOfBirth: dateOfBirth || undefined,
        placeOfBirth: placeOfBirth.trim() || undefined,
        dateOfDeath: dateOfDeath || undefined,
        notes: notes.trim() || undefined,
      }

      await onSubmit(member.id, data)
      onClose()
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to update member',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !member) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
          <h2 id="edit-modal-title" className="text-lg font-semibold">
            Edit Family Member
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

          {/* Name field (required) */}
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter full name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Date of Birth */}
          <div>
            <label
              htmlFor="edit-dateOfBirth"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date of Birth
            </label>
            <input
              type="date"
              id="edit-dateOfBirth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dateOfBirth && (
              <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
            )}
          </div>

          {/* Place of Birth */}
          <div>
            <label
              htmlFor="edit-placeOfBirth"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Place of Birth
            </label>
            <input
              type="text"
              id="edit-placeOfBirth"
              value={placeOfBirth}
              onChange={(e) => setPlaceOfBirth(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
              placeholder="City, Country"
            />
          </div>

          {/* Date of Death */}
          <div>
            <label
              htmlFor="edit-dateOfDeath"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date of Death
            </label>
            <input
              type="date"
              id="edit-dateOfDeath"
              value={dateOfDeath}
              onChange={(e) => setDateOfDeath(e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                errors.dateOfDeath ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dateOfDeath && (
              <p className="mt-1 text-sm text-red-600">{errors.dateOfDeath}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 resize-none"
              placeholder="Additional notes about this person..."
            />
          </div>

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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
