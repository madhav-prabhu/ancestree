/**
 * Storage Interface - Abstraction layer for family tree data persistence.
 *
 * This interface allows swapping storage backends (IndexedDB, cloud, etc.)
 * without changing the rest of the application.
 */

import type { FamilyMember, Relationship } from '../../models'

/**
 * Metadata for export/import operations.
 */
export interface FamilyTreeExport {
  version: string
  exportedAt: string
  members: FamilyMember[]
  relationships: Relationship[]
}

/**
 * Abstract storage interface for family tree data.
 *
 * All implementations must support:
 * - CRUD operations for family members
 * - CRUD operations for relationships
 * - Bulk operations for import/export
 */
export interface StorageInterface {
  // ==================
  // Family Members
  // ==================

  /**
   * Retrieve a single family member by ID.
   * @param id - The unique identifier of the member
   * @returns The member if found, null otherwise
   */
  getMember(id: string): Promise<FamilyMember | null>

  /**
   * Retrieve all family members.
   * @returns Array of all family members
   */
  getAllMembers(): Promise<FamilyMember[]>

  /**
   * Save a family member (create or update).
   * If member with same ID exists, it will be updated.
   * @param member - The family member to save
   */
  saveMember(member: FamilyMember): Promise<void>

  /**
   * Update an existing family member.
   * @param id - The ID of the member to update
   * @param updates - Partial member data to merge
   * @returns The updated member
   * @throws Error if member not found
   */
  updateMember(id: string, updates: Partial<Omit<FamilyMember, 'id' | 'createdAt'>>): Promise<FamilyMember>

  /**
   * Delete a family member by ID.
   * Note: This should also delete related relationships.
   * @param id - The unique identifier of the member to delete
   */
  deleteMember(id: string): Promise<void>

  // ==================
  // Relationships
  // ==================

  /**
   * Retrieve a single relationship by ID.
   * @param id - The unique identifier of the relationship
   * @returns The relationship if found, null otherwise
   */
  getRelationship(id: string): Promise<Relationship | null>

  /**
   * Retrieve all relationships.
   * @returns Array of all relationships
   */
  getAllRelationships(): Promise<Relationship[]>

  /**
   * Retrieve all relationships involving a specific member.
   * @param memberId - The ID of the family member
   * @returns Array of relationships where the member is person1 or person2
   */
  getRelationshipsForMember(memberId: string): Promise<Relationship[]>

  /**
   * Save a relationship (create or update).
   * If relationship with same ID exists, it will be updated.
   * @param relationship - The relationship to save
   */
  saveRelationship(relationship: Relationship): Promise<void>

  /**
   * Delete a relationship by ID.
   * @param id - The unique identifier of the relationship to delete
   */
  deleteRelationship(id: string): Promise<void>

  /**
   * Delete all relationships involving a specific member.
   * @param memberId - The ID of the family member
   */
  deleteRelationshipsForMember(memberId: string): Promise<void>

  // ==================
  // Bulk Operations
  // ==================

  /**
   * Export the entire family tree for backup/sharing.
   * @returns Complete family tree data with metadata
   */
  exportTree(): Promise<FamilyTreeExport>

  /**
   * Import a family tree, optionally clearing existing data.
   * @param data - The family tree data to import
   * @param clearExisting - If true, clears all existing data before import
   */
  importTree(data: FamilyTreeExport, clearExisting?: boolean): Promise<void>

  /**
   * Clear all data from storage.
   * Use with caution - this is destructive.
   */
  clearAll(): Promise<void>

  // ==================
  // Utility
  // ==================

  /**
   * Check if storage is ready and accessible.
   * @returns true if storage is operational
   */
  isReady(): Promise<boolean>

  /**
   * Subscribe to data changes.
   * @param callback - Function called when data changes
   * @returns Unsubscribe function
   */
  onChange(callback: () => void): () => void
}
