/**
 * React hook for accessing and managing family tree data.
 *
 * Provides reactive data access with loading and error states,
 * and mutation methods for CRUD operations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { familyService, ValidationError } from '../services/familyService'
import type { FamilyMember, Relationship, RelationshipType } from '../models'
import type { CreateMemberInput, UpdateMemberInput } from '../services/familyService'

/**
 * State returned by the useFamilyData hook.
 */
export interface FamilyDataState {
  // Data
  members: FamilyMember[]
  relationships: Relationship[]

  // Loading/error states
  loading: boolean
  error: Error | null

  // Mutation methods
  addMember: (data: CreateMemberInput) => Promise<FamilyMember>
  updateMember: (id: string, updates: UpdateMemberInput) => Promise<FamilyMember>
  deleteMember: (id: string) => Promise<void>

  addRelationship: (
    type: RelationshipType,
    person1Id: string,
    person2Id: string,
    metadata?: { marriageDate?: string; divorceDate?: string }
  ) => Promise<Relationship>
  deleteRelationship: (id: string) => Promise<void>

  // Convenience methods
  getMember: (id: string) => FamilyMember | undefined
  getRelationship: (id: string) => Relationship | undefined
  getParents: (memberId: string) => Promise<FamilyMember[]>
  getChildren: (memberId: string) => Promise<FamilyMember[]>
  getSpouses: (memberId: string) => Promise<FamilyMember[]>
  getSiblings: (memberId: string) => Promise<FamilyMember[]>
  getRelationshipsForMember: (memberId: string) => Promise<Relationship[]>

  // Refresh data
  refresh: () => Promise<void>

  // Clear all data
  clearAll: () => Promise<void>
}

/**
 * Hook for managing family tree data with React.
 *
 * Features:
 * - Auto-loads data on mount
 * - Auto-refreshes when data changes
 * - Provides loading and error states
 * - Exposes mutation methods for CRUD operations
 *
 * @example
 * ```tsx
 * function FamilyTree() {
 *   const { members, loading, error, addMember } = useFamilyData();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {members.map(m => <MemberCard key={m.id} member={m} />)}
 *       <button onClick={() => addMember({ name: 'New Member' })}>
 *         Add Member
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFamilyData(): FamilyDataState {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Load all data from storage.
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [membersData, relationshipsData] = await Promise.all([
        familyService.getAllMembers(),
        familyService.getAllRelationships(),
      ])

      setMembers(membersData)
      setRelationships(relationshipsData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'))
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Subscribe to data changes and load initial data.
   */
  useEffect(() => {
    // Load initial data
    loadData()

    // Subscribe to changes
    const unsubscribe = familyService.onChange(() => {
      loadData()
    })

    return unsubscribe
  }, [loadData])

  // ==================
  // Mutation Methods
  // ==================

  const addMember = useCallback(async (data: CreateMemberInput): Promise<FamilyMember> => {
    try {
      setError(null)
      const member = await familyService.addMember(data)
      // Data will auto-refresh via onChange subscription
      return member
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add member')
      setError(error)
      throw error
    }
  }, [])

  const updateMember = useCallback(
    async (id: string, updates: UpdateMemberInput): Promise<FamilyMember> => {
      try {
        setError(null)
        const member = await familyService.updateMember(id, updates)
        return member
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update member')
        setError(error)
        throw error
      }
    },
    []
  )

  const deleteMember = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await familyService.deleteMember(id)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete member')
      setError(error)
      throw error
    }
  }, [])

  const addRelationship = useCallback(
    async (
      type: RelationshipType,
      person1Id: string,
      person2Id: string,
      metadata?: { marriageDate?: string; divorceDate?: string }
    ): Promise<Relationship> => {
      try {
        setError(null)
        const relationship = await familyService.addRelationship(
          type,
          person1Id,
          person2Id,
          metadata
        )
        return relationship
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add relationship')
        setError(error)
        throw error
      }
    },
    []
  )

  const deleteRelationship = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await familyService.deleteRelationship(id)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete relationship')
      setError(error)
      throw error
    }
  }, [])

  // ==================
  // Convenience Methods
  // ==================

  const getMember = useCallback(
    (id: string): FamilyMember | undefined => {
      return members.find((m) => m.id === id)
    },
    [members]
  )

  const getRelationship = useCallback(
    (id: string): Relationship | undefined => {
      return relationships.find((r) => r.id === id)
    },
    [relationships]
  )

  const getParents = useCallback(
    async (memberId: string): Promise<FamilyMember[]> => {
      return familyService.getParents(memberId)
    },
    []
  )

  const getChildren = useCallback(
    async (memberId: string): Promise<FamilyMember[]> => {
      return familyService.getChildren(memberId)
    },
    []
  )

  const getSpouses = useCallback(
    async (memberId: string): Promise<FamilyMember[]> => {
      return familyService.getSpouses(memberId)
    },
    []
  )

  const getSiblings = useCallback(
    async (memberId: string): Promise<FamilyMember[]> => {
      return familyService.getSiblings(memberId)
    },
    []
  )

  const getRelationshipsForMember = useCallback(
    async (memberId: string): Promise<Relationship[]> => {
      return familyService.getRelationshipsForMember(memberId)
    },
    []
  )

  const refresh = useCallback(async (): Promise<void> => {
    await loadData()
  }, [loadData])

  const clearAll = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      await familyService.clearAll()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear data')
      setError(error)
      throw error
    }
  }, [])

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      members,
      relationships,
      loading,
      error,
      addMember,
      updateMember,
      deleteMember,
      addRelationship,
      deleteRelationship,
      getMember,
      getRelationship,
      getParents,
      getChildren,
      getSpouses,
      getSiblings,
      getRelationshipsForMember,
      refresh,
      clearAll,
    }),
    [
      members,
      relationships,
      loading,
      error,
      addMember,
      updateMember,
      deleteMember,
      addRelationship,
      deleteRelationship,
      getMember,
      getRelationship,
      getParents,
      getChildren,
      getSpouses,
      getSiblings,
      getRelationshipsForMember,
      refresh,
      clearAll,
    ]
  )
}

/**
 * Hook to check if a validation error occurred.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}
