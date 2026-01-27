/**
 * Import utilities for Ancestree.
 * Provides functions to import family tree data from JSON files.
 */

import type { FamilyMember } from '../models/FamilyMember'
import type { Relationship, RelationshipType } from '../models/Relationship'
import type { AncestreeExport } from './exportUtils'
import type { CreateMemberInput } from '../services/familyService'

/**
 * Result of an import operation.
 */
export interface ImportResult {
  success: boolean
  error?: string
  memberCount?: number
  relationshipCount?: number
}

/**
 * Validates the structure of an Ancestree export file.
 * This is a basic validation that checks required fields and types.
 * Can be replaced with schema validation from src/schemas if available.
 */
export function validateAncestreeExport(data: unknown): { valid: boolean; error?: string } {
  // Check if data is an object
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Invalid JSON structure: expected an object' }
  }

  const exportData = data as Record<string, unknown>

  // Check required fields
  if (typeof exportData.version !== 'string') {
    return { valid: false, error: 'Missing or invalid "version" field' }
  }

  if (!Array.isArray(exportData.members)) {
    return { valid: false, error: 'Missing or invalid "members" field: expected an array' }
  }

  if (!Array.isArray(exportData.relationships)) {
    return { valid: false, error: 'Missing or invalid "relationships" field: expected an array' }
  }

  // Validate each member
  for (let i = 0; i < exportData.members.length; i++) {
    const member = exportData.members[i] as Record<string, unknown>
    if (typeof member !== 'object' || member === null) {
      return { valid: false, error: `Invalid member at index ${i}: expected an object` }
    }
    if (typeof member.id !== 'string' || member.id.trim() === '') {
      return { valid: false, error: `Invalid member at index ${i}: missing or invalid "id"` }
    }
    if (typeof member.name !== 'string' || member.name.trim() === '') {
      return { valid: false, error: `Invalid member at index ${i}: missing or invalid "name"` }
    }
    // Optional date fields should be strings if present
    if (member.dateOfBirth !== undefined && typeof member.dateOfBirth !== 'string') {
      return { valid: false, error: `Invalid member at index ${i}: "dateOfBirth" must be a string` }
    }
    if (member.dateOfDeath !== undefined && typeof member.dateOfDeath !== 'string') {
      return { valid: false, error: `Invalid member at index ${i}: "dateOfDeath" must be a string` }
    }
    if (member.placeOfBirth !== undefined && typeof member.placeOfBirth !== 'string') {
      return { valid: false, error: `Invalid member at index ${i}: "placeOfBirth" must be a string` }
    }
    if (member.notes !== undefined && typeof member.notes !== 'string') {
      return { valid: false, error: `Invalid member at index ${i}: "notes" must be a string` }
    }
    if (member.photo !== undefined && typeof member.photo !== 'string') {
      return { valid: false, error: `Invalid member at index ${i}: "photo" must be a string` }
    }
  }

  // Validate each relationship
  const validRelationshipTypes = ['parent-child', 'spouse', 'sibling']
  for (let i = 0; i < exportData.relationships.length; i++) {
    const rel = exportData.relationships[i] as Record<string, unknown>
    if (typeof rel !== 'object' || rel === null) {
      return { valid: false, error: `Invalid relationship at index ${i}: expected an object` }
    }
    if (typeof rel.id !== 'string' || rel.id.trim() === '') {
      return { valid: false, error: `Invalid relationship at index ${i}: missing or invalid "id"` }
    }
    if (typeof rel.type !== 'string' || !validRelationshipTypes.includes(rel.type)) {
      return { valid: false, error: `Invalid relationship at index ${i}: invalid "type" (must be one of: ${validRelationshipTypes.join(', ')})` }
    }
    if (typeof rel.person1Id !== 'string' || rel.person1Id.trim() === '') {
      return { valid: false, error: `Invalid relationship at index ${i}: missing or invalid "person1Id"` }
    }
    if (typeof rel.person2Id !== 'string' || rel.person2Id.trim() === '') {
      return { valid: false, error: `Invalid relationship at index ${i}: missing or invalid "person2Id"` }
    }
    // Optional date fields
    if (rel.marriageDate !== undefined && typeof rel.marriageDate !== 'string') {
      return { valid: false, error: `Invalid relationship at index ${i}: "marriageDate" must be a string` }
    }
    if (rel.divorceDate !== undefined && typeof rel.divorceDate !== 'string') {
      return { valid: false, error: `Invalid relationship at index ${i}: "divorceDate" must be a string` }
    }
  }

  // Check for duplicate member IDs
  const memberIds = new Set<string>()
  for (const member of exportData.members as { id: string }[]) {
    if (memberIds.has(member.id)) {
      return { valid: false, error: `Duplicate member ID found: "${member.id}"` }
    }
    memberIds.add(member.id)
  }

  // Check that all relationship references point to valid members
  for (let i = 0; i < exportData.relationships.length; i++) {
    const rel = exportData.relationships[i] as { person1Id: string; person2Id: string }
    if (!memberIds.has(rel.person1Id)) {
      return { valid: false, error: `Relationship at index ${i} references unknown member: "${rel.person1Id}"` }
    }
    if (!memberIds.has(rel.person2Id)) {
      return { valid: false, error: `Relationship at index ${i} references unknown member: "${rel.person2Id}"` }
    }
  }

  return { valid: true }
}

/**
 * Reads a file as text.
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Imports family tree data from a JSON file.
 *
 * @param file - The JSON file to import
 * @param clearAll - Function to clear all existing data
 * @param addMember - Function to add a new member
 * @param addRelationship - Function to add a new relationship
 * @returns Import result with success status and counts
 */
export async function importFromJson(
  file: File,
  clearAll: () => Promise<void>,
  addMember: (data: CreateMemberInput) => Promise<FamilyMember>,
  addRelationship: (
    type: RelationshipType,
    person1Id: string,
    person2Id: string,
    metadata?: { marriageDate?: string; divorceDate?: string }
  ) => Promise<Relationship>
): Promise<ImportResult> {
  try {
    // Read file contents
    const text = await readFileAsText(file)

    // Parse JSON
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return { success: false, error: 'Invalid JSON file: could not parse file contents' }
    }

    // Validate using basic validation
    // Note: If schema validation is implemented in src/schemas/index.ts,
    // you can enhance this to use that validation instead
    const validationResult = validateAncestreeExport(data)

    if (!validationResult.valid) {
      return { success: false, error: validationResult.error || 'Validation failed' }
    }

    const exportData = data as AncestreeExport

    // Clear existing data
    await clearAll()

    // Create a mapping of old IDs to new IDs
    const idMapping = new Map<string, string>()

    // Add all members first (with new IDs generated by addMember)
    for (const member of exportData.members) {
      const memberInput: CreateMemberInput = {
        name: member.name,
        dateOfBirth: member.dateOfBirth,
        dateOfDeath: member.dateOfDeath,
        placeOfBirth: member.placeOfBirth,
        notes: member.notes,
        photo: member.photo,
      }

      const newMember = await addMember(memberInput)
      idMapping.set(member.id, newMember.id)
    }

    // Add relationships using mapped IDs
    let relationshipCount = 0
    for (const relationship of exportData.relationships) {
      const newPerson1Id = idMapping.get(relationship.person1Id)
      const newPerson2Id = idMapping.get(relationship.person2Id)

      if (!newPerson1Id || !newPerson2Id) {
        // This shouldn't happen if validation passed, but handle gracefully
        console.warn('Skipping relationship with unmapped IDs:', relationship)
        continue
      }

      const metadata: { marriageDate?: string; divorceDate?: string } = {}
      if (relationship.marriageDate) {
        metadata.marriageDate = relationship.marriageDate
      }
      if (relationship.divorceDate) {
        metadata.divorceDate = relationship.divorceDate
      }

      try {
        await addRelationship(
          relationship.type,
          newPerson1Id,
          newPerson2Id,
          Object.keys(metadata).length > 0 ? metadata : undefined
        )
        relationshipCount++
      } catch (err) {
        // Some relationships might be duplicates (e.g., auto-created spouse-child relationships)
        // Log but continue
        console.warn('Could not create relationship:', err)
      }
    }

    return {
      success: true,
      memberCount: exportData.members.length,
      relationshipCount,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    return { success: false, error: errorMessage }
  }
}
