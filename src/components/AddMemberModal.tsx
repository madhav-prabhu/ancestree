/**
 * Modal dialog for adding a new family member.
 *
 * Features:
 * - Form fields: name (required), DOB, place of birth, date of death, notes
 * - Form validation with error messages
 * - Closes on success, escape key, or clicking outside
 */

import { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react'
import type { CreateMemberInput } from '../services/familyService'
import { processImage, getInitials } from '../utils/imageUtils'
import { displayToIso, isValidDisplayDate } from '../utils/dateUtils'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateMemberInput) => Promise<void>
}

interface FormErrors {
  name?: string
  dateOfBirth?: string
  dateOfDeath?: string
  photo?: string
  general?: string
}

export function AddMemberModal({ isOpen, onClose, onSubmit }: AddMemberModalProps) {
  // Form state
  const [name, setName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [placeOfBirth, setPlaceOfBirth] = useState('')
  const [dateOfDeath, setDateOfDeath] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<string | undefined>(undefined)

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)

  // Refs
  const modalRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setDateOfBirth('')
      setPlaceOfBirth('')
      setDateOfDeath('')
      setNotes('')
      setPhoto(undefined)
      setErrors({})
      setIsSubmitting(false)
      setIsProcessingPhoto(false)

      // Focus name input when modal opens
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Handle photo upload
  const handlePhotoChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingPhoto(true)
    setErrors((prev) => ({ ...prev, photo: undefined }))

    try {
      const processed = await processImage(file)
      setPhoto(processed)
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        photo: err instanceof Error ? err.message : 'Failed to process image',
      }))
    } finally {
      setIsProcessingPhoto(false)
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [])

  // Remove photo
  const handleRemovePhoto = useCallback(() => {
    setPhoto(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

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

    // Date of birth validation (format: dd/mm/yyyy)
    if (dateOfBirth) {
      if (!isValidDisplayDate(dateOfBirth)) {
        newErrors.dateOfBirth = 'Invalid date format (use dd/mm/yyyy)'
      } else {
        const isoDate = displayToIso(dateOfBirth)
        const dob = new Date(isoDate)
        if (dob > new Date()) {
          newErrors.dateOfBirth = 'Date of birth cannot be in the future'
        }
      }
    }

    // Date of death validation (format: dd/mm/yyyy)
    if (dateOfDeath) {
      if (!isValidDisplayDate(dateOfDeath)) {
        newErrors.dateOfDeath = 'Invalid date format (use dd/mm/yyyy)'
      } else {
        const isoDate = displayToIso(dateOfDeath)
        const dod = new Date(isoDate)
        if (dod > new Date()) {
          newErrors.dateOfDeath = 'Date of death cannot be in the future'
        } else if (dateOfBirth && isValidDisplayDate(dateOfBirth)) {
          const dobIso = displayToIso(dateOfBirth)
          const dob = new Date(dobIso)
          if (dod < dob) {
            newErrors.dateOfDeath = 'Date of death cannot be before date of birth'
          }
        }
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
      const data: CreateMemberInput = {
        name: name.trim(),
        dateOfBirth: dateOfBirth ? displayToIso(dateOfBirth) : undefined,
        placeOfBirth: placeOfBirth.trim() || undefined,
        dateOfDeath: dateOfDeath ? displayToIso(dateOfDeath) : undefined,
        notes: notes.trim() || undefined,
        photo: photo || undefined,
      }

      await onSubmit(data)
      onClose()
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to add member',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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
            Add Family Member
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

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo
            </label>
            <div className="flex items-center gap-4">
              {/* Photo preview or placeholder */}
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                {photo ? (
                  <img
                    src={photo}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-gray-400">
                    {name ? getInitials(name) : '?'}
                  </span>
                )}
              </div>

              {/* Upload/Remove buttons */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={isSubmitting || isProcessingPhoto}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className={`px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors ${
                    isProcessingPhoto
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {isProcessingPhoto ? 'Processing...' : photo ? 'Change Photo' : 'Upload Photo'}
                </label>
                {photo && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            {errors.photo && <p className="mt-1 text-sm text-red-600">{errors.photo}</p>}
          </div>

          {/* Name field (required) */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
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
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="text"
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={isSubmitting}
              placeholder="dd/mm/yyyy"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
          </div>

          {/* Place of Birth */}
          <div>
            <label htmlFor="placeOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
              Place of Birth
            </label>
            <input
              type="text"
              id="placeOfBirth"
              value={placeOfBirth}
              onChange={(e) => setPlaceOfBirth(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
              placeholder="City, Country"
            />
          </div>

          {/* Date of Death */}
          <div>
            <label htmlFor="dateOfDeath" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Death
            </label>
            <input
              type="text"
              id="dateOfDeath"
              value={dateOfDeath}
              onChange={(e) => setDateOfDeath(e.target.value)}
              disabled={isSubmitting}
              placeholder="dd/mm/yyyy"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
                errors.dateOfDeath ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.dateOfDeath && <p className="mt-1 text-sm text-red-600">{errors.dateOfDeath}</p>}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 resize-none"
              placeholder="Add biographical information, stories, memories, or any other notes..."
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">Optional notes about this person</p>
              <span className={`text-xs ${notes.length > 1800 ? 'text-amber-600' : 'text-gray-400'}`}>
                {notes.length}/2000
              </span>
            </div>
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
                  Adding...
                </>
              ) : (
                'Add Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
