/**
 * Types of relationships between family members.
 */
export type RelationshipType = 'parent-child' | 'spouse' | 'sibling'

/**
 * Represents a relationship between two family members.
 */
export interface Relationship {
  id: string
  type: RelationshipType

  // For parent-child: person1 is parent, person2 is child
  // For spouse/sibling: order doesn't matter
  person1Id: string
  person2Id: string

  // Optional metadata for spouse relationships
  marriageDate?: string
  divorceDate?: string

  createdAt: string
  updatedAt: string
}

/**
 * Helper to create a new relationship.
 */
export function createRelationship(
  type: RelationshipType,
  person1Id: string,
  person2Id: string,
  metadata?: { marriageDate?: string; divorceDate?: string }
): Relationship {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    type,
    person1Id,
    person2Id,
    ...metadata,
    createdAt: now,
    updatedAt: now,
  }
}
