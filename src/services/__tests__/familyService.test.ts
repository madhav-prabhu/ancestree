/**
 * Tests for the Family Service Layer.
 *
 * These tests verify business logic, validation rules,
 * and derived data methods.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { familyService, ValidationError } from '../familyService'

describe('familyService', () => {
  // Clear data before each test
  beforeEach(async () => {
    await familyService.clearAll()
  })

  describe('Member validation', () => {
    it('should require a name', async () => {
      await expect(familyService.addMember({ name: '' })).rejects.toThrow(ValidationError)
      await expect(familyService.addMember({ name: '   ' })).rejects.toThrow(
        'Name is required'
      )
    })

    it('should trim names', async () => {
      const member = await familyService.addMember({ name: '  John Doe  ' })
      expect(member.name).toBe('John Doe')
    })

    it('should validate date format', async () => {
      await expect(
        familyService.addMember({ name: 'Test', dateOfBirth: 'invalid' })
      ).rejects.toThrow('Date of birth must be in YYYY-MM-DD format')

      await expect(
        familyService.addMember({ name: 'Test', dateOfDeath: '2020/01/01' })
      ).rejects.toThrow('Date of death must be in YYYY-MM-DD format')
    })

    it('should validate death date is after birth date', async () => {
      await expect(
        familyService.addMember({
          name: 'Test',
          dateOfBirth: '2000-01-01',
          dateOfDeath: '1999-12-31',
        })
      ).rejects.toThrow('Date of death cannot be before date of birth')
    })

    it('should accept valid dates', async () => {
      const member = await familyService.addMember({
        name: 'Test',
        dateOfBirth: '1990-05-15',
        dateOfDeath: '2020-10-20',
      })
      expect(member.dateOfBirth).toBe('1990-05-15')
      expect(member.dateOfDeath).toBe('2020-10-20')
    })
  })

  describe('Member CRUD', () => {
    it('should add and retrieve a member', async () => {
      const member = await familyService.addMember({
        name: 'John Doe',
        dateOfBirth: '1980-01-15',
        placeOfBirth: 'New York',
      })

      expect(member.id).toBeDefined()
      expect(member.name).toBe('John Doe')
      expect(member.createdAt).toBeDefined()

      const retrieved = await familyService.getMember(member.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('John Doe')
    })

    it('should update a member', async () => {
      const member = await familyService.addMember({ name: 'Original Name' })

      const updated = await familyService.updateMember(member.id, {
        name: 'Updated Name',
        notes: 'Some notes',
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.notes).toBe('Some notes')
      expect(updated.id).toBe(member.id)
    })

    it('should reject empty name on update', async () => {
      const member = await familyService.addMember({ name: 'Test' })

      await expect(
        familyService.updateMember(member.id, { name: '' })
      ).rejects.toThrow('Name cannot be empty')
    })

    it('should delete a member', async () => {
      const member = await familyService.addMember({ name: 'To Delete' })
      await familyService.deleteMember(member.id)

      const retrieved = await familyService.getMember(member.id)
      expect(retrieved).toBeNull()
    })

    it('should get all members', async () => {
      await familyService.addMember({ name: 'Alice' })
      await familyService.addMember({ name: 'Bob' })
      await familyService.addMember({ name: 'Charlie' })

      const members = await familyService.getAllMembers()
      expect(members).toHaveLength(3)
    })
  })

  describe('Relationship validation', () => {
    it('should prevent self-relationships', async () => {
      const member = await familyService.addMember({ name: 'Test' })

      await expect(
        familyService.addRelationship('spouse', member.id, member.id)
      ).rejects.toThrow('Cannot create a relationship with oneself')
    })

    it('should require both members to exist', async () => {
      const member = await familyService.addMember({ name: 'Test' })

      await expect(
        familyService.addRelationship('spouse', member.id, 'nonexistent')
      ).rejects.toThrow('Member with id "nonexistent" not found')

      await expect(
        familyService.addRelationship('spouse', 'nonexistent', member.id)
      ).rejects.toThrow('Member with id "nonexistent" not found')
    })

    it('should prevent duplicate relationships', async () => {
      const alice = await familyService.addMember({ name: 'Alice' })
      const bob = await familyService.addMember({ name: 'Bob' })

      await familyService.addRelationship('spouse', alice.id, bob.id)

      // Exact duplicate
      await expect(
        familyService.addRelationship('spouse', alice.id, bob.id)
      ).rejects.toThrow('This relationship already exists')

      // Reverse order (for spouse, order doesn't matter)
      await expect(
        familyService.addRelationship('spouse', bob.id, alice.id)
      ).rejects.toThrow('This relationship already exists')
    })

    it('should allow different relationship types between same people', async () => {
      const alice = await familyService.addMember({ name: 'Alice' })
      const bob = await familyService.addMember({ name: 'Bob' })

      await familyService.addRelationship('sibling', alice.id, bob.id)
      // This would be weird but technically allowed
      const spouse = await familyService.addRelationship('spouse', alice.id, bob.id)
      expect(spouse).toBeDefined()
    })

    it('should validate parent is older than child', async () => {
      const child = await familyService.addMember({
        name: 'Child',
        dateOfBirth: '2000-01-01',
      })
      const parent = await familyService.addMember({
        name: 'Parent',
        dateOfBirth: '2010-01-01', // Born after child - invalid
      })

      await expect(
        familyService.addRelationship('parent-child', parent.id, child.id)
      ).rejects.toThrow('Parent must be born before child')
    })

    it('should prevent circular parent chains', async () => {
      const grandparent = await familyService.addMember({ name: 'Grandparent' })
      const parent = await familyService.addMember({ name: 'Parent' })
      const child = await familyService.addMember({ name: 'Child' })

      // Establish valid chain: grandparent -> parent -> child
      await familyService.addRelationship('parent-child', grandparent.id, parent.id)
      await familyService.addRelationship('parent-child', parent.id, child.id)

      // Try to make child a parent of grandparent (creates cycle)
      await expect(
        familyService.addRelationship('parent-child', child.id, grandparent.id)
      ).rejects.toThrow('This relationship would create a circular parent chain')
    })

    it('should validate marriage date format', async () => {
      const alice = await familyService.addMember({ name: 'Alice' })
      const bob = await familyService.addMember({ name: 'Bob' })

      await expect(
        familyService.addRelationship('spouse', alice.id, bob.id, {
          marriageDate: 'invalid',
        })
      ).rejects.toThrow('Marriage date must be in YYYY-MM-DD format')
    })

    it('should validate divorce is after marriage', async () => {
      const alice = await familyService.addMember({ name: 'Alice' })
      const bob = await familyService.addMember({ name: 'Bob' })

      await expect(
        familyService.addRelationship('spouse', alice.id, bob.id, {
          marriageDate: '2020-01-01',
          divorceDate: '2019-12-31',
        })
      ).rejects.toThrow('Divorce date cannot be before marriage date')
    })
  })

  describe('Relationship CRUD', () => {
    it('should add and retrieve a relationship', async () => {
      const parent = await familyService.addMember({ name: 'Parent' })
      const child = await familyService.addMember({ name: 'Child' })

      const relationship = await familyService.addRelationship(
        'parent-child',
        parent.id,
        child.id
      )

      expect(relationship.id).toBeDefined()
      expect(relationship.type).toBe('parent-child')
      expect(relationship.person1Id).toBe(parent.id)
      expect(relationship.person2Id).toBe(child.id)

      const retrieved = await familyService.getRelationship(relationship.id)
      expect(retrieved).not.toBeNull()
    })

    it('should delete a relationship', async () => {
      const alice = await familyService.addMember({ name: 'Alice' })
      const bob = await familyService.addMember({ name: 'Bob' })

      const relationship = await familyService.addRelationship('spouse', alice.id, bob.id)
      await familyService.deleteRelationship(relationship.id)

      const retrieved = await familyService.getRelationship(relationship.id)
      expect(retrieved).toBeNull()
    })

    it('should get all relationships', async () => {
      const alice = await familyService.addMember({ name: 'Alice' })
      const bob = await familyService.addMember({ name: 'Bob' })
      const charlie = await familyService.addMember({ name: 'Charlie' })

      await familyService.addRelationship('spouse', alice.id, bob.id)
      await familyService.addRelationship('parent-child', alice.id, charlie.id)
      // Note: bob→charlie is auto-created since alice and bob are spouses

      const relationships = await familyService.getAllRelationships()
      expect(relationships).toHaveLength(3)
    })

    it('should get relationships for a specific member', async () => {
      const alice = await familyService.addMember({ name: 'Alice' })
      const bob = await familyService.addMember({ name: 'Bob' })
      const charlie = await familyService.addMember({ name: 'Charlie' })

      await familyService.addRelationship('spouse', alice.id, bob.id)
      await familyService.addRelationship('parent-child', alice.id, charlie.id)
      await familyService.addRelationship('sibling', bob.id, charlie.id)

      const aliceRels = await familyService.getRelationshipsForMember(alice.id)
      expect(aliceRels).toHaveLength(2) // spouse + parent-child
    })
  })

  describe('Convenience methods', () => {
    let grandpa: Awaited<ReturnType<typeof familyService.addMember>>
    let grandma: Awaited<ReturnType<typeof familyService.addMember>>
    let dad: Awaited<ReturnType<typeof familyService.addMember>>
    let mom: Awaited<ReturnType<typeof familyService.addMember>>
    let child1: Awaited<ReturnType<typeof familyService.addMember>>
    let child2: Awaited<ReturnType<typeof familyService.addMember>>

    beforeEach(async () => {
      // Create a family tree:
      // grandpa + grandma (spouses)
      //    |
      //   dad + mom (spouses)
      //    |
      // child1, child2 (siblings)

      grandpa = await familyService.addMember({ name: 'Grandpa' })
      grandma = await familyService.addMember({ name: 'Grandma' })
      dad = await familyService.addMember({ name: 'Dad' })
      mom = await familyService.addMember({ name: 'Mom' })
      child1 = await familyService.addMember({ name: 'Child 1' })
      child2 = await familyService.addMember({ name: 'Child 2' })

      // Set up relationships
      // Note: When adding a child to a married parent, the child is auto-connected to the spouse
      await familyService.addRelationship('spouse', grandpa.id, grandma.id)
      await familyService.addRelationship('parent-child', grandpa.id, dad.id)
      // grandma→dad is auto-created since grandpa+grandma are spouses
      await familyService.addRelationship('spouse', dad.id, mom.id)
      await familyService.addRelationship('parent-child', dad.id, child1.id)
      // mom→child1 is auto-created since dad+mom are spouses
      await familyService.addRelationship('parent-child', dad.id, child2.id)
      // mom→child2 is auto-created since dad+mom are spouses
    })

    it('should get parents', async () => {
      const parents = await familyService.getParents(child1.id)
      expect(parents).toHaveLength(2)
      expect(parents.map((p) => p.name).sort()).toEqual(['Dad', 'Mom'])
    })

    it('should get children', async () => {
      const children = await familyService.getChildren(dad.id)
      expect(children).toHaveLength(2)
      expect(children.map((c) => c.name).sort()).toEqual(['Child 1', 'Child 2'])
    })

    it('should get spouse', async () => {
      const spouses = await familyService.getSpouses(dad.id)
      expect(spouses).toHaveLength(1)
      expect(spouses[0].name).toBe('Mom')
    })

    it('should get siblings (through shared parents)', async () => {
      const siblings = await familyService.getSiblings(child1.id)
      expect(siblings).toHaveLength(1)
      expect(siblings[0].name).toBe('Child 2')
    })

    it('should get ancestors', async () => {
      const ancestors = await familyService.getAncestors(child1.id)
      expect(ancestors).toHaveLength(4)
      expect(ancestors.map((a) => a.name).sort()).toEqual([
        'Dad',
        'Grandma',
        'Grandpa',
        'Mom',
      ])
    })

    it('should get descendants', async () => {
      const descendants = await familyService.getDescendants(grandpa.id)
      expect(descendants).toHaveLength(3)
      expect(descendants.map((d) => d.name).sort()).toEqual(['Child 1', 'Child 2', 'Dad'])
    })

    it('should handle members with no relationships', async () => {
      const loner = await familyService.addMember({ name: 'Loner' })

      expect(await familyService.getParents(loner.id)).toHaveLength(0)
      expect(await familyService.getChildren(loner.id)).toHaveLength(0)
      expect(await familyService.getSpouses(loner.id)).toHaveLength(0)
      expect(await familyService.getSiblings(loner.id)).toHaveLength(0)
      expect(await familyService.getAncestors(loner.id)).toHaveLength(0)
      expect(await familyService.getDescendants(loner.id)).toHaveLength(0)
    })
  })

  describe('Bulk operations', () => {
    it('should export and import data', async () => {
      // Create some data
      const alice = await familyService.addMember({ name: 'Alice' })
      const bob = await familyService.addMember({ name: 'Bob' })
      await familyService.addRelationship('spouse', alice.id, bob.id)

      // Export
      const exported = await familyService.exportTree()
      expect(exported.members).toHaveLength(2)
      expect(exported.relationships).toHaveLength(1)

      // Clear and reimport
      await familyService.clearAll()
      expect(await familyService.getAllMembers()).toHaveLength(0)

      await familyService.importTree(exported, false)
      expect(await familyService.getAllMembers()).toHaveLength(2)
      expect(await familyService.getAllRelationships()).toHaveLength(1)
    })
  })
})
