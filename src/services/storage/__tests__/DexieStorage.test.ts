/**
 * Tests for DexieStorage implementation.
 *
 * These tests verify that the IndexedDB storage layer correctly
 * implements all CRUD operations for members and relationships.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DexieStorage } from '../DexieStorage'
import { createFamilyMember, createRelationship } from '../../../models'
import type { FamilyMember } from '../../../models'

describe('DexieStorage', () => {
  // Clear database before each test
  beforeEach(async () => {
    await DexieStorage.clearAll()
  })

  describe('Member CRUD operations', () => {
    it('should save and retrieve a member', async () => {
      const member = createFamilyMember({ name: 'John Doe' })
      await DexieStorage.saveMember(member)

      const retrieved = await DexieStorage.getMember(member.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('John Doe')
      expect(retrieved?.id).toBe(member.id)
    })

    it('should return null for non-existent member', async () => {
      const retrieved = await DexieStorage.getMember('non-existent-id')
      expect(retrieved).toBeNull()
    })

    it('should get all members', async () => {
      const member1 = createFamilyMember({ name: 'Alice' })
      const member2 = createFamilyMember({ name: 'Bob' })
      const member3 = createFamilyMember({ name: 'Charlie' })

      await DexieStorage.saveMember(member1)
      await DexieStorage.saveMember(member2)
      await DexieStorage.saveMember(member3)

      const allMembers = await DexieStorage.getAllMembers()
      expect(allMembers).toHaveLength(3)
      expect(allMembers.map((m) => m.name).sort()).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('should update a member', async () => {
      const member = createFamilyMember({ name: 'John Doe' })
      await DexieStorage.saveMember(member)

      const updated = await DexieStorage.updateMember(member.id, {
        name: 'John Smith',
        dateOfBirth: '1990-01-15',
      })

      expect(updated.name).toBe('John Smith')
      expect(updated.dateOfBirth).toBe('1990-01-15')
      expect(updated.id).toBe(member.id) // ID should not change
      expect(updated.createdAt).toBe(member.createdAt) // createdAt should not change
      expect(updated.updatedAt).not.toBe(member.updatedAt) // updatedAt should change
    })

    it('should throw error when updating non-existent member', async () => {
      await expect(
        DexieStorage.updateMember('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Member with id "non-existent-id" not found')
    })

    it('should delete a member', async () => {
      const member = createFamilyMember({ name: 'John Doe' })
      await DexieStorage.saveMember(member)

      await DexieStorage.deleteMember(member.id)

      const retrieved = await DexieStorage.getMember(member.id)
      expect(retrieved).toBeNull()
    })

    it('should delete related relationships when deleting a member', async () => {
      const parent = createFamilyMember({ name: 'Parent' })
      const child = createFamilyMember({ name: 'Child' })
      await DexieStorage.saveMember(parent)
      await DexieStorage.saveMember(child)

      const relationship = createRelationship('parent-child', parent.id, child.id)
      await DexieStorage.saveRelationship(relationship)

      // Verify relationship exists
      const beforeDelete = await DexieStorage.getAllRelationships()
      expect(beforeDelete).toHaveLength(1)

      // Delete parent
      await DexieStorage.deleteMember(parent.id)

      // Relationship should also be deleted
      const afterDelete = await DexieStorage.getAllRelationships()
      expect(afterDelete).toHaveLength(0)
    })
  })

  describe('Relationship CRUD operations', () => {
    let member1: FamilyMember
    let member2: FamilyMember

    beforeEach(async () => {
      member1 = createFamilyMember({ name: 'Person 1' })
      member2 = createFamilyMember({ name: 'Person 2' })
      await DexieStorage.saveMember(member1)
      await DexieStorage.saveMember(member2)
    })

    it('should save and retrieve a relationship', async () => {
      const relationship = createRelationship('spouse', member1.id, member2.id, {
        marriageDate: '2020-06-15',
      })
      await DexieStorage.saveRelationship(relationship)

      const retrieved = await DexieStorage.getRelationship(relationship.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.type).toBe('spouse')
      expect(retrieved?.person1Id).toBe(member1.id)
      expect(retrieved?.person2Id).toBe(member2.id)
      expect(retrieved?.marriageDate).toBe('2020-06-15')
    })

    it('should return null for non-existent relationship', async () => {
      const retrieved = await DexieStorage.getRelationship('non-existent-id')
      expect(retrieved).toBeNull()
    })

    it('should get all relationships', async () => {
      const member3 = createFamilyMember({ name: 'Person 3' })
      await DexieStorage.saveMember(member3)

      const rel1 = createRelationship('spouse', member1.id, member2.id)
      const rel2 = createRelationship('parent-child', member1.id, member3.id)

      await DexieStorage.saveRelationship(rel1)
      await DexieStorage.saveRelationship(rel2)

      const allRelationships = await DexieStorage.getAllRelationships()
      expect(allRelationships).toHaveLength(2)
    })

    it('should get relationships for a specific member', async () => {
      const member3 = createFamilyMember({ name: 'Person 3' })
      await DexieStorage.saveMember(member3)

      const rel1 = createRelationship('spouse', member1.id, member2.id)
      const rel2 = createRelationship('parent-child', member1.id, member3.id)
      const rel3 = createRelationship('sibling', member2.id, member3.id)

      await DexieStorage.saveRelationship(rel1)
      await DexieStorage.saveRelationship(rel2)
      await DexieStorage.saveRelationship(rel3)

      // member1 should have 2 relationships (rel1, rel2)
      const member1Rels = await DexieStorage.getRelationshipsForMember(member1.id)
      expect(member1Rels).toHaveLength(2)

      // member3 should have 2 relationships (rel2, rel3)
      const member3Rels = await DexieStorage.getRelationshipsForMember(member3.id)
      expect(member3Rels).toHaveLength(2)
    })

    it('should delete a relationship', async () => {
      const relationship = createRelationship('spouse', member1.id, member2.id)
      await DexieStorage.saveRelationship(relationship)

      await DexieStorage.deleteRelationship(relationship.id)

      const retrieved = await DexieStorage.getRelationship(relationship.id)
      expect(retrieved).toBeNull()
    })

    it('should delete all relationships for a member', async () => {
      const member3 = createFamilyMember({ name: 'Person 3' })
      await DexieStorage.saveMember(member3)

      const rel1 = createRelationship('spouse', member1.id, member2.id)
      const rel2 = createRelationship('parent-child', member1.id, member3.id)
      const rel3 = createRelationship('sibling', member2.id, member3.id)

      await DexieStorage.saveRelationship(rel1)
      await DexieStorage.saveRelationship(rel2)
      await DexieStorage.saveRelationship(rel3)

      // Delete all relationships for member1
      await DexieStorage.deleteRelationshipsForMember(member1.id)

      // Only rel3 should remain (between member2 and member3)
      const remaining = await DexieStorage.getAllRelationships()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(rel3.id)
    })
  })

  describe('Export/Import operations', () => {
    it('should export all data with metadata', async () => {
      const member = createFamilyMember({ name: 'Test Person' })
      await DexieStorage.saveMember(member)

      const exported = await DexieStorage.exportTree()

      expect(exported.version).toBe('1.0.0')
      expect(exported.exportedAt).toBeDefined()
      expect(exported.members).toHaveLength(1)
      expect(exported.members[0].name).toBe('Test Person')
      expect(exported.relationships).toHaveLength(0)
    })

    it('should import data and clear existing', async () => {
      // Add initial data
      const member1 = createFamilyMember({ name: 'Existing' })
      await DexieStorage.saveMember(member1)

      // Import new data with clear
      const importData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        members: [
          createFamilyMember({ name: 'Imported 1' }),
          createFamilyMember({ name: 'Imported 2' }),
        ],
        relationships: [],
      }

      await DexieStorage.importTree(importData, true)

      const allMembers = await DexieStorage.getAllMembers()
      expect(allMembers).toHaveLength(2)
      expect(allMembers.map((m) => m.name).sort()).toEqual(['Imported 1', 'Imported 2'])
    })

    it('should import data and merge with existing', async () => {
      // Add initial data
      const member1 = createFamilyMember({ name: 'Existing' })
      await DexieStorage.saveMember(member1)

      // Import new data without clear (merge)
      const importData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        members: [createFamilyMember({ name: 'Imported' })],
        relationships: [],
      }

      await DexieStorage.importTree(importData, false)

      const allMembers = await DexieStorage.getAllMembers()
      expect(allMembers).toHaveLength(2)
      expect(allMembers.map((m) => m.name).sort()).toEqual(['Existing', 'Imported'])
    })

    it('should round-trip data correctly', async () => {
      // Create complex data
      const parent = createFamilyMember({
        name: 'Parent',
        dateOfBirth: '1970-01-01',
        placeOfBirth: 'New York',
      })
      const child = createFamilyMember({
        name: 'Child',
        dateOfBirth: '2000-05-15',
      })

      await DexieStorage.saveMember(parent)
      await DexieStorage.saveMember(child)

      const relationship = createRelationship('parent-child', parent.id, child.id)
      await DexieStorage.saveRelationship(relationship)

      // Export
      const exported = await DexieStorage.exportTree()

      // Clear and reimport
      await DexieStorage.clearAll()
      await DexieStorage.importTree(exported, false)

      // Verify
      const members = await DexieStorage.getAllMembers()
      const relationships = await DexieStorage.getAllRelationships()

      expect(members).toHaveLength(2)
      expect(relationships).toHaveLength(1)

      const retrievedParent = members.find((m) => m.name === 'Parent')
      expect(retrievedParent?.dateOfBirth).toBe('1970-01-01')
      expect(retrievedParent?.placeOfBirth).toBe('New York')
    })
  })

  describe('Utility operations', () => {
    it('should report ready status', async () => {
      const ready = await DexieStorage.isReady()
      expect(ready).toBe(true)
    })

    it('should clear all data', async () => {
      const member = createFamilyMember({ name: 'Test' })
      await DexieStorage.saveMember(member)

      await DexieStorage.clearAll()

      const members = await DexieStorage.getAllMembers()
      const relationships = await DexieStorage.getAllRelationships()

      expect(members).toHaveLength(0)
      expect(relationships).toHaveLength(0)
    })

    it('should notify on change', async () => {
      let changeCount = 0
      const unsubscribe = DexieStorage.onChange(() => {
        changeCount++
      })

      const member = createFamilyMember({ name: 'Test' })
      await DexieStorage.saveMember(member)
      expect(changeCount).toBe(1)

      await DexieStorage.updateMember(member.id, { name: 'Updated' })
      expect(changeCount).toBe(2)

      await DexieStorage.deleteMember(member.id)
      expect(changeCount).toBe(3)

      // Unsubscribe and verify no more notifications
      unsubscribe()
      await DexieStorage.saveMember(createFamilyMember({ name: 'Another' }))
      expect(changeCount).toBe(3) // Should not increase
    })
  })
})
