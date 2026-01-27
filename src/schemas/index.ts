/**
 * Schema validation for Ancestree import/export data.
 *
 * Provides JSON Schema definition and runtime validation for family tree data.
 */

import type { FamilyMember, Relationship, RelationshipType } from '../models'
import ancestreeSchema from './ancestree.schema.json'

/**
 * Export format for Ancestree family tree data.
 */
export interface AncestreeExport {
  version: string
  exportedAt: string
  members: FamilyMember[]
  relationships: Relationship[]
}

/**
 * Result of validation operation.
 */
export interface ValidationResult {
  valid: boolean
  errors?: string[]
  data?: AncestreeExport
}

/**
 * Current schema version.
 */
export const SCHEMA_VERSION = '1.0.0'

/**
 * Valid relationship types.
 */
const VALID_RELATIONSHIP_TYPES: RelationshipType[] = [
  'parent-child',
  'spouse',
  'sibling',
]

/**
 * ISO 8601 date pattern (YYYY-MM-DD).
 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * ISO 8601 datetime pattern.
 */
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/

/**
 * Semver pattern for version field.
 */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/

/**
 * Base64 data URL pattern for images.
 */
const BASE64_IMAGE_PATTERN = /^data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/]+=*$/

/**
 * Validates a date string is in ISO 8601 date format (YYYY-MM-DD).
 */
function isValidISODate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false
  }
  const date = new Date(value)
  return !isNaN(date.getTime())
}

/**
 * Validates a datetime string is in ISO 8601 format.
 */
function isValidISODateTime(value: string): boolean {
  if (!ISO_DATETIME_PATTERN.test(value)) {
    return false
  }
  const date = new Date(value)
  return !isNaN(date.getTime())
}

/**
 * Validates that the input is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Validates a single family member object.
 */
function validateMember(
  member: unknown,
  index: number,
  errors: string[]
): member is FamilyMember {
  const prefix = `members[${index}]`

  if (typeof member !== 'object' || member === null) {
    errors.push(`${prefix}: must be an object`)
    return false
  }

  const m = member as Record<string, unknown>
  let valid = true

  // Required fields
  if (!isNonEmptyString(m.id)) {
    errors.push(`${prefix}.id: required and must be a non-empty string`)
    valid = false
  }

  if (!isNonEmptyString(m.name)) {
    errors.push(`${prefix}.name: required and must be a non-empty string`)
    valid = false
  }

  if (!isNonEmptyString(m.createdAt)) {
    errors.push(`${prefix}.createdAt: required`)
    valid = false
  } else if (!isValidISODateTime(m.createdAt)) {
    errors.push(
      `${prefix}.createdAt: must be a valid ISO 8601 datetime (e.g., "2024-01-15T10:30:00.000Z")`
    )
    valid = false
  }

  if (!isNonEmptyString(m.updatedAt)) {
    errors.push(`${prefix}.updatedAt: required`)
    valid = false
  } else if (!isValidISODateTime(m.updatedAt)) {
    errors.push(
      `${prefix}.updatedAt: must be a valid ISO 8601 datetime (e.g., "2024-01-15T10:30:00.000Z")`
    )
    valid = false
  }

  // Optional date fields
  if (m.dateOfBirth !== undefined) {
    if (typeof m.dateOfBirth !== 'string') {
      errors.push(`${prefix}.dateOfBirth: must be a string`)
      valid = false
    } else if (!isValidISODate(m.dateOfBirth)) {
      errors.push(
        `${prefix}.dateOfBirth: must be a valid ISO 8601 date (YYYY-MM-DD)`
      )
      valid = false
    }
  }

  if (m.dateOfDeath !== undefined) {
    if (typeof m.dateOfDeath !== 'string') {
      errors.push(`${prefix}.dateOfDeath: must be a string`)
      valid = false
    } else if (!isValidISODate(m.dateOfDeath)) {
      errors.push(
        `${prefix}.dateOfDeath: must be a valid ISO 8601 date (YYYY-MM-DD)`
      )
      valid = false
    }
  }

  // Optional string fields
  if (m.placeOfBirth !== undefined && typeof m.placeOfBirth !== 'string') {
    errors.push(`${prefix}.placeOfBirth: must be a string`)
    valid = false
  }

  if (m.notes !== undefined && typeof m.notes !== 'string') {
    errors.push(`${prefix}.notes: must be a string`)
    valid = false
  }

  if (m.photo !== undefined) {
    if (typeof m.photo !== 'string') {
      errors.push(`${prefix}.photo: must be a string`)
      valid = false
    } else if (!BASE64_IMAGE_PATTERN.test(m.photo)) {
      errors.push(`${prefix}.photo: must be a valid base64 data URL for an image`)
      valid = false
    }
  }

  return valid
}

/**
 * Validates a single relationship object.
 */
function validateRelationship(
  relationship: unknown,
  index: number,
  memberIds: Set<string>,
  errors: string[]
): relationship is Relationship {
  const prefix = `relationships[${index}]`

  if (typeof relationship !== 'object' || relationship === null) {
    errors.push(`${prefix}: must be an object`)
    return false
  }

  const r = relationship as Record<string, unknown>
  let valid = true

  // Required fields
  if (!isNonEmptyString(r.id)) {
    errors.push(`${prefix}.id: required and must be a non-empty string`)
    valid = false
  }

  if (!isNonEmptyString(r.type)) {
    errors.push(`${prefix}.type: required`)
    valid = false
  } else if (!VALID_RELATIONSHIP_TYPES.includes(r.type as RelationshipType)) {
    errors.push(
      `${prefix}.type: must be one of: ${VALID_RELATIONSHIP_TYPES.join(', ')}`
    )
    valid = false
  }

  if (!isNonEmptyString(r.person1Id)) {
    errors.push(`${prefix}.person1Id: required and must be a non-empty string`)
    valid = false
  } else if (!memberIds.has(r.person1Id)) {
    errors.push(
      `${prefix}.person1Id: references non-existent member "${r.person1Id}"`
    )
    valid = false
  }

  if (!isNonEmptyString(r.person2Id)) {
    errors.push(`${prefix}.person2Id: required and must be a non-empty string`)
    valid = false
  } else if (!memberIds.has(r.person2Id)) {
    errors.push(
      `${prefix}.person2Id: references non-existent member "${r.person2Id}"`
    )
    valid = false
  }

  if (!isNonEmptyString(r.createdAt)) {
    errors.push(`${prefix}.createdAt: required`)
    valid = false
  } else if (!isValidISODateTime(r.createdAt)) {
    errors.push(
      `${prefix}.createdAt: must be a valid ISO 8601 datetime (e.g., "2024-01-15T10:30:00.000Z")`
    )
    valid = false
  }

  if (!isNonEmptyString(r.updatedAt)) {
    errors.push(`${prefix}.updatedAt: required`)
    valid = false
  } else if (!isValidISODateTime(r.updatedAt)) {
    errors.push(
      `${prefix}.updatedAt: must be a valid ISO 8601 datetime (e.g., "2024-01-15T10:30:00.000Z")`
    )
    valid = false
  }

  // Optional date fields (only meaningful for spouse relationships)
  if (r.marriageDate !== undefined) {
    if (typeof r.marriageDate !== 'string') {
      errors.push(`${prefix}.marriageDate: must be a string`)
      valid = false
    } else if (!isValidISODate(r.marriageDate)) {
      errors.push(
        `${prefix}.marriageDate: must be a valid ISO 8601 date (YYYY-MM-DD)`
      )
      valid = false
    }
  }

  if (r.divorceDate !== undefined) {
    if (typeof r.divorceDate !== 'string') {
      errors.push(`${prefix}.divorceDate: must be a string`)
      valid = false
    } else if (!isValidISODate(r.divorceDate)) {
      errors.push(
        `${prefix}.divorceDate: must be a valid ISO 8601 date (YYYY-MM-DD)`
      )
      valid = false
    }
  }

  return valid
}

/**
 * Validates import data against the Ancestree schema.
 *
 * Performs comprehensive validation including:
 * - Required field checks
 * - Date format validation (ISO 8601)
 * - Relationship type validation
 * - Referential integrity (person IDs exist in members array)
 *
 * @param data - The data to validate (typically parsed JSON)
 * @returns Validation result with errors array if invalid, or typed data if valid
 *
 * @example
 * ```typescript
 * const result = validateImportData(parsedJson);
 * if (result.valid) {
 *   // result.data is typed as AncestreeExport
 *   console.log(`Imported ${result.data.members.length} members`);
 * } else {
 *   // result.errors contains helpful messages
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
export function validateImportData(data: unknown): ValidationResult {
  const errors: string[] = []

  // Check top-level structure
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      errors: ['Data must be an object'],
    }
  }

  const d = data as Record<string, unknown>

  // Validate version
  if (!isNonEmptyString(d.version)) {
    errors.push('version: required and must be a string')
  } else if (!SEMVER_PATTERN.test(d.version)) {
    errors.push('version: must be in semver format (e.g., "1.0.0")')
  }

  // Validate exportedAt
  if (!isNonEmptyString(d.exportedAt)) {
    errors.push('exportedAt: required and must be a string')
  } else if (!isValidISODateTime(d.exportedAt)) {
    errors.push(
      'exportedAt: must be a valid ISO 8601 datetime (e.g., "2024-01-15T10:30:00.000Z")'
    )
  }

  // Validate members array
  if (!Array.isArray(d.members)) {
    errors.push('members: required and must be an array')
  }

  // Validate relationships array
  if (!Array.isArray(d.relationships)) {
    errors.push('relationships: required and must be an array')
  }

  // If basic structure is invalid, return early
  if (errors.length > 0 && (!Array.isArray(d.members) || !Array.isArray(d.relationships))) {
    return { valid: false, errors }
  }

  const members = d.members as unknown[]
  const relationships = d.relationships as unknown[]

  // Validate each member and collect IDs
  const memberIds = new Set<string>()
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    if (validateMember(member, i, errors)) {
      const m = member as FamilyMember
      if (memberIds.has(m.id)) {
        errors.push(`members[${i}].id: duplicate ID "${m.id}"`)
      } else {
        memberIds.add(m.id)
      }
    }
  }

  // Validate each relationship
  const relationshipIds = new Set<string>()
  for (let i = 0; i < relationships.length; i++) {
    const relationship = relationships[i]
    if (validateRelationship(relationship, i, memberIds, errors)) {
      const r = relationship as Relationship
      if (relationshipIds.has(r.id)) {
        errors.push(`relationships[${i}].id: duplicate ID "${r.id}"`)
      } else {
        relationshipIds.add(r.id)
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: data as AncestreeExport,
  }
}

/**
 * Creates an export object with current timestamp and schema version.
 *
 * @param members - Array of family members to export
 * @param relationships - Array of relationships to export
 * @returns Complete export object ready for serialization
 *
 * @example
 * ```typescript
 * const exportData = createExport(members, relationships);
 * const json = JSON.stringify(exportData, null, 2);
 * ```
 */
export function createExport(
  members: FamilyMember[],
  relationships: Relationship[]
): AncestreeExport {
  return {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    members,
    relationships,
  }
}

/**
 * Validates export data and returns a simplified result compatible with legacy code.
 *
 * This is a convenience wrapper around validateImportData for backwards compatibility
 * with existing import utilities.
 *
 * @param data - The data to validate
 * @returns Simple validation result with valid flag and optional error message
 *
 * @example
 * ```typescript
 * const result = validateExportData(parsedJson);
 * if (!result.valid) {
 *   console.error('Validation error:', result.error);
 * }
 * ```
 */
export function validateExportData(data: unknown): { valid: boolean; error?: string } {
  const result = validateImportData(data)

  if (result.valid) {
    return { valid: true }
  }

  // Combine all errors into a single message for legacy compatibility
  const error = result.errors?.join('; ') || 'Validation failed'
  return { valid: false, error }
}

/**
 * JSON Schema definition for external use (e.g., IDE validation).
 */
export { ancestreeSchema }
