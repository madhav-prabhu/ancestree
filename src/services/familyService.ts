/**
 * Family Service Layer
 *
 * Business logic layer for managing family members and relationships.
 * Provides validation, derived data, and convenience methods.
 */

import { storage } from './storage'
import { createFamilyMember, createRelationship } from '../models'
import type { FamilyMember, Relationship, RelationshipType } from '../models'

/**
 * Input data for creating a new family member.
 */
export type CreateMemberInput = Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Input data for updating an existing family member.
 */
export type UpdateMemberInput = Partial<Omit<FamilyMember, 'id' | 'createdAt'>>

/**
 * Validation error thrown when input data is invalid.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate that a date string is in ISO format (YYYY-MM-DD).
 */
function isValidISODate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(date)) return false

  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * Validate member dates (death after birth).
 */
function validateMemberDates(member: { dateOfBirth?: string; dateOfDeath?: string }): void {
  if (member.dateOfBirth && !isValidISODate(member.dateOfBirth)) {
    throw new ValidationError('Date of birth must be in YYYY-MM-DD format')
  }

  if (member.dateOfDeath && !isValidISODate(member.dateOfDeath)) {
    throw new ValidationError('Date of death must be in YYYY-MM-DD format')
  }

  if (member.dateOfBirth && member.dateOfDeath) {
    const birth = new Date(member.dateOfBirth)
    const death = new Date(member.dateOfDeath)
    if (death < birth) {
      throw new ValidationError('Date of death cannot be before date of birth')
    }
  }
}

/**
 * Family Service - business logic for family tree operations.
 */
export const familyService = {
  // ==================
  // Member Operations
  // ==================

  /**
   * Add a new family member.
   * @param data - Member data without id and timestamps
   * @returns The created member
   * @throws ValidationError if data is invalid
   */
  async addMember(data: CreateMemberInput): Promise<FamilyMember> {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new ValidationError('Name is required')
    }

    // Validate dates
    validateMemberDates(data)

    // Create and save the member
    const member = createFamilyMember({
      ...data,
      name: data.name.trim(),
    })

    await storage.saveMember(member)
    return member
  },

  /**
   * Update an existing family member.
   * @param id - The ID of the member to update
   * @param updates - Partial member data to update
   * @returns The updated member
   * @throws ValidationError if data is invalid
   * @throws Error if member not found
   */
  async updateMember(id: string, updates: UpdateMemberInput): Promise<FamilyMember> {
    // Get existing member to merge with updates for validation
    const existing = await storage.getMember(id)
    if (!existing) {
      throw new Error(`Member with id "${id}" not found`)
    }

    // Validate name if provided
    if (updates.name !== undefined && updates.name.trim() === '') {
      throw new ValidationError('Name cannot be empty')
    }

    // Validate dates
    const merged = {
      dateOfBirth: updates.dateOfBirth ?? existing.dateOfBirth,
      dateOfDeath: updates.dateOfDeath ?? existing.dateOfDeath,
    }
    validateMemberDates(merged)

    // Trim name if provided
    const cleanUpdates = { ...updates }
    if (cleanUpdates.name) {
      cleanUpdates.name = cleanUpdates.name.trim()
    }

    return storage.updateMember(id, cleanUpdates)
  },

  /**
   * Delete a family member and all their relationships.
   * @param id - The ID of the member to delete
   */
  async deleteMember(id: string): Promise<void> {
    await storage.deleteMember(id)
  },

  /**
   * Get a single family member by ID.
   * @param id - The member ID
   * @returns The member if found, null otherwise
   */
  async getMember(id: string): Promise<FamilyMember | null> {
    return storage.getMember(id)
  },

  /**
   * Get all family members.
   * @returns Array of all members
   */
  async getAllMembers(): Promise<FamilyMember[]> {
    return storage.getAllMembers()
  },

  // ==================
  // Relationship Operations
  // ==================

  /**
   * Add a relationship between two members.
   * For spouse relationships, automatically creates parent-child connections
   * between the new spouse and existing children of the partner.
   *
   * @param type - The type of relationship
   * @param person1Id - First person (for parent-child: the parent)
   * @param person2Id - Second person (for parent-child: the child)
   * @param metadata - Optional metadata (e.g., marriage date)
   * @returns The created relationship
   * @throws ValidationError if relationship is invalid
   */
  async addRelationship(
    type: RelationshipType,
    person1Id: string,
    person2Id: string,
    metadata?: { marriageDate?: string; divorceDate?: string }
  ): Promise<Relationship> {
    // Cannot relate to self
    if (person1Id === person2Id) {
      throw new ValidationError('Cannot create a relationship with oneself')
    }

    // Verify both members exist
    const [person1, person2] = await Promise.all([
      storage.getMember(person1Id),
      storage.getMember(person2Id),
    ])

    if (!person1) {
      throw new ValidationError(`Member with id "${person1Id}" not found`)
    }
    if (!person2) {
      throw new ValidationError(`Member with id "${person2Id}" not found`)
    }

    // Check for duplicate relationship
    const existing = await this.findExistingRelationship(type, person1Id, person2Id)
    if (existing) {
      throw new ValidationError('This relationship already exists')
    }

    // Validate parent-child age (if dates available)
    if (type === 'parent-child') {
      await this.validateParentChildAge(person1Id, person2Id)

      // Check for circular parent chain
      const wouldCreateCycle = await this.wouldCreateParentCycle(person1Id, person2Id)
      if (wouldCreateCycle) {
        throw new ValidationError('This relationship would create a circular parent chain')
      }
    }

    // Validate marriage dates if provided
    if (metadata?.marriageDate && !isValidISODate(metadata.marriageDate)) {
      throw new ValidationError('Marriage date must be in YYYY-MM-DD format')
    }
    if (metadata?.divorceDate && !isValidISODate(metadata.divorceDate)) {
      throw new ValidationError('Divorce date must be in YYYY-MM-DD format')
    }
    if (metadata?.marriageDate && metadata?.divorceDate) {
      const marriage = new Date(metadata.marriageDate)
      const divorce = new Date(metadata.divorceDate)
      if (divorce < marriage) {
        throw new ValidationError('Divorce date cannot be before marriage date')
      }
    }

    // Create and save the relationship
    const relationship = createRelationship(type, person1Id, person2Id, metadata)
    await storage.saveRelationship(relationship)

    // For spouse relationships, automatically connect new spouse to existing children
    if (type === 'spouse') {
      await this.connectSpouseToChildren(person1Id, person2Id)
    }

    // For parent-child relationships, automatically connect child to parent's spouse(s)
    if (type === 'parent-child') {
      await this.connectChildToParentSpouse(person1Id, person2Id)
    }

    return relationship
  },

  /**
   * When a spouse relationship is created, automatically create parent-child
   * relationships between the new spouse and any existing children.
   * This makes the new spouse a parent of existing children from both sides.
   */
  async connectSpouseToChildren(spouse1Id: string, spouse2Id: string): Promise<void> {
    // Get children of both spouses
    const [children1, children2] = await Promise.all([
      this.getChildren(spouse1Id),
      this.getChildren(spouse2Id),
    ])

    // Connect spouse2 to spouse1's children (if not already connected)
    for (const child of children1) {
      const existingRel = await this.findExistingRelationship('parent-child', spouse2Id, child.id)
      if (!existingRel) {
        const rel = createRelationship('parent-child', spouse2Id, child.id)
        await storage.saveRelationship(rel)
      }
    }

    // Connect spouse1 to spouse2's children (if not already connected)
    for (const child of children2) {
      const existingRel = await this.findExistingRelationship('parent-child', spouse1Id, child.id)
      if (!existingRel) {
        const rel = createRelationship('parent-child', spouse1Id, child.id)
        await storage.saveRelationship(rel)
      }
    }
  },

  /**
   * When a parent-child relationship is created, automatically create a parent-child
   * relationship between the parent's spouse(s) and the new child.
   * This ensures children are connected to both parents when parents are married.
   */
  async connectChildToParentSpouse(parentId: string, childId: string): Promise<void> {
    const spouses = await this.getSpouses(parentId)

    for (const spouse of spouses) {
      const existingRel = await this.findExistingRelationship('parent-child', spouse.id, childId)
      if (!existingRel) {
        const rel = createRelationship('parent-child', spouse.id, childId)
        await storage.saveRelationship(rel)
      }
    }
  },

  /**
   * Find an existing relationship of the same type between two people.
   * Handles bidirectional relationships (spouse, sibling).
   */
  async findExistingRelationship(
    type: RelationshipType,
    person1Id: string,
    person2Id: string
  ): Promise<Relationship | null> {
    const relationships = await storage.getAllRelationships()

    return relationships.find((r) => {
      if (r.type !== type) return false

      // For parent-child, order matters (person1 is parent, person2 is child)
      if (type === 'parent-child') {
        return r.person1Id === person1Id && r.person2Id === person2Id
      }

      // For spouse and sibling, order doesn't matter
      return (
        (r.person1Id === person1Id && r.person2Id === person2Id) ||
        (r.person1Id === person2Id && r.person2Id === person1Id)
      )
    }) ?? null
  },

  /**
   * Validate that parent is older than child (if dates available).
   */
  async validateParentChildAge(parentId: string, childId: string): Promise<void> {
    const [parent, child] = await Promise.all([
      storage.getMember(parentId),
      storage.getMember(childId),
    ])

    if (parent?.dateOfBirth && child?.dateOfBirth) {
      const parentBirth = new Date(parent.dateOfBirth)
      const childBirth = new Date(child.dateOfBirth)
      if (parentBirth >= childBirth) {
        throw new ValidationError('Parent must be born before child')
      }
    }
  },

  /**
   * Check if adding person2 as child of person1 would create a cycle.
   * A cycle exists if person2 is already an ancestor of person1.
   */
  async wouldCreateParentCycle(parentId: string, childId: string): Promise<boolean> {
    const ancestors = await this.getAncestors(parentId)
    return ancestors.some((a) => a.id === childId)
  },

  /**
   * Delete a relationship by ID.
   * @param id - The relationship ID
   */
  async deleteRelationship(id: string): Promise<void> {
    await storage.deleteRelationship(id)
  },

  /**
   * Get a relationship by ID.
   * @param id - The relationship ID
   * @returns The relationship if found, null otherwise
   */
  async getRelationship(id: string): Promise<Relationship | null> {
    return storage.getRelationship(id)
  },

  /**
   * Get all relationships.
   * @returns Array of all relationships
   */
  async getAllRelationships(): Promise<Relationship[]> {
    return storage.getAllRelationships()
  },

  /**
   * Get all relationships for a specific member.
   * @param memberId - The member ID
   * @returns Array of relationships involving the member
   */
  async getRelationshipsForMember(memberId: string): Promise<Relationship[]> {
    return storage.getRelationshipsForMember(memberId)
  },

  // ==================
  // Convenience Methods (Derived Data)
  // ==================

  /**
   * Get the parents of a member.
   * @param memberId - The member ID
   * @returns Array of parent members
   */
  async getParents(memberId: string): Promise<FamilyMember[]> {
    const relationships = await storage.getRelationshipsForMember(memberId)
    const parentRelationships = relationships.filter(
      (r) => r.type === 'parent-child' && r.person2Id === memberId
    )

    const parents = await Promise.all(
      parentRelationships.map((r) => storage.getMember(r.person1Id))
    )

    return parents.filter((p): p is FamilyMember => p !== null)
  },

  /**
   * Get the children of a member.
   * @param memberId - The member ID
   * @returns Array of child members
   */
  async getChildren(memberId: string): Promise<FamilyMember[]> {
    const relationships = await storage.getRelationshipsForMember(memberId)
    const childRelationships = relationships.filter(
      (r) => r.type === 'parent-child' && r.person1Id === memberId
    )

    const children = await Promise.all(
      childRelationships.map((r) => storage.getMember(r.person2Id))
    )

    return children.filter((c): c is FamilyMember => c !== null)
  },

  /**
   * Get the spouse(s) of a member.
   * @param memberId - The member ID
   * @returns Array of spouse members
   */
  async getSpouses(memberId: string): Promise<FamilyMember[]> {
    const relationships = await storage.getRelationshipsForMember(memberId)
    const spouseRelationships = relationships.filter((r) => r.type === 'spouse')

    const spouseIds = spouseRelationships.map((r) =>
      r.person1Id === memberId ? r.person2Id : r.person1Id
    )

    const spouses = await Promise.all(spouseIds.map((id) => storage.getMember(id)))

    return spouses.filter((s): s is FamilyMember => s !== null)
  },

  /**
   * Get the siblings of a member.
   * @param memberId - The member ID
   * @returns Array of sibling members
   */
  async getSiblings(memberId: string): Promise<FamilyMember[]> {
    // Get direct sibling relationships
    const relationships = await storage.getRelationshipsForMember(memberId)
    const siblingRelationships = relationships.filter((r) => r.type === 'sibling')

    const siblingIds = siblingRelationships.map((r) =>
      r.person1Id === memberId ? r.person2Id : r.person1Id
    )

    // Also get siblings through shared parents
    const parents = await this.getParents(memberId)
    const parentChildrenSets = await Promise.all(
      parents.map((parent) => this.getChildren(parent.id))
    )

    // Flatten and get unique sibling IDs (excluding self)
    const siblingsFromParents = parentChildrenSets.flat().filter((c) => c.id !== memberId)
    const allSiblingIds = new Set([
      ...siblingIds,
      ...siblingsFromParents.map((s) => s.id),
    ])

    const siblings = await Promise.all(
      Array.from(allSiblingIds).map((id) => storage.getMember(id))
    )

    return siblings.filter((s): s is FamilyMember => s !== null)
  },

  /**
   * Get all ancestors of a member (parents, grandparents, etc.).
   * @param memberId - The member ID
   * @returns Array of ancestor members
   */
  async getAncestors(memberId: string): Promise<FamilyMember[]> {
    const ancestors: FamilyMember[] = []
    const visited = new Set<string>()
    const queue = [memberId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const parents = await this.getParents(currentId)
      for (const parent of parents) {
        if (!visited.has(parent.id)) {
          ancestors.push(parent)
          queue.push(parent.id)
        }
      }
    }

    return ancestors
  },

  /**
   * Get all descendants of a member (children, grandchildren, etc.).
   * @param memberId - The member ID
   * @returns Array of descendant members
   */
  async getDescendants(memberId: string): Promise<FamilyMember[]> {
    const descendants: FamilyMember[] = []
    const visited = new Set<string>()
    const queue = [memberId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const children = await this.getChildren(currentId)
      for (const child of children) {
        if (!visited.has(child.id)) {
          descendants.push(child)
          queue.push(child.id)
        }
      }
    }

    return descendants
  },

  // ==================
  // Bulk Operations
  // ==================

  /**
   * Export the entire family tree.
   * @returns Export data with metadata
   */
  async exportTree() {
    return storage.exportTree()
  },

  /**
   * Import a family tree.
   * @param data - Import data
   * @param clearExisting - Clear existing data before import
   */
  async importTree(
    data: Awaited<ReturnType<typeof storage.exportTree>>,
    clearExisting = false
  ) {
    return storage.importTree(data, clearExisting)
  },

  /**
   * Clear all data.
   */
  async clearAll() {
    return storage.clearAll()
  },

  /**
   * Subscribe to data changes.
   * @param callback - Called when data changes
   * @returns Unsubscribe function
   */
  onChange(callback: () => void): () => void {
    return storage.onChange(callback)
  },
}
