/**
 * Tests for the useFamilyData React hook.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFamilyData } from '../useFamilyData'
import { familyService, ValidationError } from '../../services/familyService'

describe('useFamilyData', () => {
  // Clear data before each test
  beforeEach(async () => {
    await familyService.clearAll()
  })

  describe('Initial state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useFamilyData())

      expect(result.current.loading).toBe(true)
      expect(result.current.members).toEqual([])
      expect(result.current.relationships).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should load data and set loading to false', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.members).toEqual([])
      expect(result.current.relationships).toEqual([])
    })

    it('should load existing data', async () => {
      // Add data before mounting hook
      await familyService.addMember({ name: 'Pre-existing' })

      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.members).toHaveLength(1)
      expect(result.current.members[0].name).toBe('Pre-existing')
    })
  })

  describe('Member operations', () => {
    it('should add a member and update state', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let newMember: Awaited<ReturnType<typeof result.current.addMember>>

      await act(async () => {
        newMember = await result.current.addMember({ name: 'New Member' })
      })

      await waitFor(() => {
        expect(result.current.members).toHaveLength(1)
      })

      expect(result.current.members[0].name).toBe('New Member')
      expect(newMember!.id).toBeDefined()
    })

    it('should update a member', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let member: Awaited<ReturnType<typeof result.current.addMember>>

      await act(async () => {
        member = await result.current.addMember({ name: 'Original' })
      })

      await waitFor(() => {
        expect(result.current.members).toHaveLength(1)
      })

      await act(async () => {
        await result.current.updateMember(member!.id, { name: 'Updated' })
      })

      await waitFor(() => {
        expect(result.current.members[0].name).toBe('Updated')
      })
    })

    it('should delete a member', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let member: Awaited<ReturnType<typeof result.current.addMember>>

      await act(async () => {
        member = await result.current.addMember({ name: 'To Delete' })
      })

      await waitFor(() => {
        expect(result.current.members).toHaveLength(1)
      })

      await act(async () => {
        await result.current.deleteMember(member!.id)
      })

      await waitFor(() => {
        expect(result.current.members).toHaveLength(0)
      })
    })

    it('should set error on validation failure', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        try {
          await result.current.addMember({ name: '' })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBeInstanceOf(ValidationError)
      expect(result.current.error?.message).toBe('Name is required')
    })
  })

  describe('Relationship operations', () => {
    it('should add a relationship', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let member1: Awaited<ReturnType<typeof result.current.addMember>>
      let member2: Awaited<ReturnType<typeof result.current.addMember>>

      await act(async () => {
        member1 = await result.current.addMember({ name: 'Alice' })
        member2 = await result.current.addMember({ name: 'Bob' })
      })

      await waitFor(() => {
        expect(result.current.members).toHaveLength(2)
      })

      await act(async () => {
        await result.current.addRelationship('spouse', member1!.id, member2!.id)
      })

      await waitFor(() => {
        expect(result.current.relationships).toHaveLength(1)
      })

      expect(result.current.relationships[0].type).toBe('spouse')
    })

    it('should delete a relationship', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let member1: Awaited<ReturnType<typeof result.current.addMember>>
      let member2: Awaited<ReturnType<typeof result.current.addMember>>
      let relationship: Awaited<ReturnType<typeof result.current.addRelationship>>

      await act(async () => {
        member1 = await result.current.addMember({ name: 'Alice' })
        member2 = await result.current.addMember({ name: 'Bob' })
        relationship = await result.current.addRelationship('spouse', member1!.id, member2!.id)
      })

      await waitFor(() => {
        expect(result.current.relationships).toHaveLength(1)
      })

      await act(async () => {
        await result.current.deleteRelationship(relationship!.id)
      })

      await waitFor(() => {
        expect(result.current.relationships).toHaveLength(0)
      })
    })
  })

  describe('Convenience methods', () => {
    it('should get a member by id', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let member: Awaited<ReturnType<typeof result.current.addMember>>

      await act(async () => {
        member = await result.current.addMember({ name: 'Test' })
      })

      await waitFor(() => {
        expect(result.current.members).toHaveLength(1)
      })

      const found = result.current.getMember(member!.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe('Test')

      const notFound = result.current.getMember('nonexistent')
      expect(notFound).toBeUndefined()
    })

    it('should get parents, children, spouses', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let parent: Awaited<ReturnType<typeof result.current.addMember>>
      let child: Awaited<ReturnType<typeof result.current.addMember>>

      await act(async () => {
        parent = await result.current.addMember({ name: 'Parent' })
        child = await result.current.addMember({ name: 'Child' })
        await result.current.addRelationship('parent-child', parent!.id, child!.id)
      })

      await waitFor(() => {
        expect(result.current.relationships).toHaveLength(1)
      })

      let parents: FamilyMember[]
      let children: FamilyMember[]

      await act(async () => {
        parents = await result.current.getParents(child!.id)
        children = await result.current.getChildren(parent!.id)
      })

      expect(parents!).toHaveLength(1)
      expect(parents![0].name).toBe('Parent')
      expect(children!).toHaveLength(1)
      expect(children![0].name).toBe('Child')
    })
  })

  describe('Refresh and clear', () => {
    it('should refresh data', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Add data directly through service (bypassing hook)
      await familyService.addMember({ name: 'Added Directly' })

      // Manually refresh
      await act(async () => {
        await result.current.refresh()
      })

      // Note: The data should already be there due to onChange subscription,
      // but refresh ensures we have the latest
      expect(result.current.members.some((m) => m.name === 'Added Directly')).toBe(true)
    })

    it('should clear all data', async () => {
      const { result } = renderHook(() => useFamilyData())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.addMember({ name: 'Member 1' })
        await result.current.addMember({ name: 'Member 2' })
      })

      await waitFor(() => {
        expect(result.current.members).toHaveLength(2)
      })

      await act(async () => {
        await result.current.clearAll()
      })

      await waitFor(() => {
        expect(result.current.members).toHaveLength(0)
      })
    })
  })
})

// Import for type reference
import type { FamilyMember } from '../../models'
