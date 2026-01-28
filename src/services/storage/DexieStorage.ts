/**
 * Dexie.js implementation of the StorageInterface.
 *
 * Uses IndexedDB for persistent local storage of family tree data.
 * This is the primary storage backend for the application.
 */

import Dexie, { type Table } from 'dexie'
import type { FamilyMember, Relationship } from '../../models'
import type { StorageInterface, FamilyTreeExport } from './StorageInterface'

// Current export format version for compatibility checking
const EXPORT_VERSION = '1.0.0'

/**
 * Dexie database class for Ancestree.
 */
class AncestreeDB extends Dexie {
  members!: Table<FamilyMember, string>
  relationships!: Table<Relationship, string>

  constructor() {
    super('AncestreeDB')

    // Define database schema
    // Version 1: Initial schema
    this.version(1).stores({
      // Primary key is 'id', with indexes on common query fields
      members: 'id, name, createdAt',
      // Primary key is 'id', with indexes for querying by person
      relationships: 'id, person1Id, person2Id, type, createdAt',
    })
  }
}

// Singleton database instance
const db = new AncestreeDB()

// Change listeners for reactive updates
const changeListeners = new Set<() => void>()

/**
 * Notify all listeners that data has changed.
 */
function notifyChange(): void {
  changeListeners.forEach((listener) => listener())
}

/**
 * Dexie.js implementation of StorageInterface.
 */
export const DexieStorage: StorageInterface = {
  // ==================
  // Family Members
  // ==================

  async getMember(id: string): Promise<FamilyMember | null> {
    const member = await db.members.get(id)
    return member ?? null
  },

  async getAllMembers(): Promise<FamilyMember[]> {
    return db.members.toArray()
  },

  async saveMember(member: FamilyMember): Promise<void> {
    await db.members.put(member)
    notifyChange()
  },

  async updateMember(
    id: string,
    updates: Partial<Omit<FamilyMember, 'id' | 'createdAt'>>
  ): Promise<FamilyMember> {
    const existing = await db.members.get(id)
    if (!existing) {
      throw new Error(`Member with id "${id}" not found`)
    }

    const updated: FamilyMember = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID cannot be changed
      createdAt: existing.createdAt, // Ensure createdAt cannot be changed
      updatedAt: new Date().toISOString(),
    }

    await db.members.put(updated)
    notifyChange()
    return updated
  },

  async deleteMember(id: string): Promise<void> {
    // Delete member and all their relationships in a transaction
    await db.transaction('rw', [db.members, db.relationships], async () => {
      // Delete related relationships first
      await db.relationships
        .where('person1Id')
        .equals(id)
        .or('person2Id')
        .equals(id)
        .delete()

      // Delete the member
      await db.members.delete(id)
    })
    notifyChange()
  },

  // ==================
  // Relationships
  // ==================

  async getRelationship(id: string): Promise<Relationship | null> {
    const relationship = await db.relationships.get(id)
    return relationship ?? null
  },

  async getAllRelationships(): Promise<Relationship[]> {
    return db.relationships.toArray()
  },

  async getRelationshipsForMember(memberId: string): Promise<Relationship[]> {
    // Find relationships where member is either person1 or person2
    const asPerson1 = await db.relationships.where('person1Id').equals(memberId).toArray()
    const asPerson2 = await db.relationships.where('person2Id').equals(memberId).toArray()

    // Combine and deduplicate (in case of self-referential relationships, though unlikely)
    const combined = [...asPerson1, ...asPerson2]
    const uniqueById = new Map(combined.map((r) => [r.id, r]))
    return Array.from(uniqueById.values())
  },

  async saveRelationship(relationship: Relationship): Promise<void> {
    await db.relationships.put(relationship)
    notifyChange()
  },

  async deleteRelationship(id: string): Promise<void> {
    await db.relationships.delete(id)
    notifyChange()
  },

  async deleteRelationshipsForMember(memberId: string): Promise<void> {
    await db.relationships
      .where('person1Id')
      .equals(memberId)
      .or('person2Id')
      .equals(memberId)
      .delete()
    notifyChange()
  },

  // ==================
  // Bulk Operations
  // ==================

  async exportTree(): Promise<FamilyTreeExport> {
    const [members, relationships] = await Promise.all([
      db.members.toArray(),
      db.relationships.toArray(),
    ])

    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      members,
      relationships,
    }
  },

  async importTree(data: FamilyTreeExport, clearExisting = false): Promise<void> {
    await db.transaction('rw', [db.members, db.relationships], async () => {
      if (clearExisting) {
        await db.members.clear()
        await db.relationships.clear()
      }

      // Bulk insert members
      if (data.members.length > 0) {
        await db.members.bulkPut(data.members)
      }

      // Bulk insert relationships
      if (data.relationships.length > 0) {
        await db.relationships.bulkPut(data.relationships)
      }
    })
    notifyChange()
  },

  async clearAll(): Promise<void> {
    await db.transaction('rw', [db.members, db.relationships], async () => {
      await db.members.clear()
      await db.relationships.clear()
    })
    notifyChange()
  },

  // ==================
  // Utility
  // ==================

  async isReady(): Promise<boolean> {
    try {
      await db.open()
      return db.isOpen()
    } catch {
      return false
    }
  },

  onChange(callback: () => void): () => void {
    changeListeners.add(callback)
    return () => {
      changeListeners.delete(callback)
    }
  },
}

// Export the database instance for direct access if needed (e.g., for React hooks)
export { db as ancestreeDB }
