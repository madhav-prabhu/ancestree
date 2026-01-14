/**
 * Represents a single family member in the tree.
 */
export interface FamilyMember {
  id: string
  name: string
  dateOfBirth?: string      // ISO date string (YYYY-MM-DD)
  placeOfBirth?: string
  dateOfDeath?: string      // ISO date string, undefined if alive
  notes?: string

  // Metadata
  createdAt: string
  updatedAt: string
}

/**
 * Helper to create a new family member with required fields.
 */
export function createFamilyMember(
  data: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>
): FamilyMember {
  const now = new Date().toISOString()
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
}
