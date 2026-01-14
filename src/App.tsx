/**
 * Main application component for Ancestree.
 *
 * Integrates all UI components:
 * - Layout with header, sidebar, and detail panel
 * - Member list sidebar
 * - Add/Edit member modals
 * - Add relationship modal
 * - Member detail panel
 * - 3D tree visualization
 */

import { useState, useEffect, useCallback } from 'react'
import { TreeScene } from './scene/TreeScene'
import { useFamilyData } from './hooks/useFamilyData'
import {
  AddMemberModal,
  EditMemberModal,
  MemberDetailPanel,
  MemberListSidebar,
  AddRelationshipModal,
} from './components'
import { Layout, Header, SaveIndicator, EmptyState } from './components/Layout'
import type { FamilyMember } from './models/FamilyMember'
import type { RelationshipType } from './models/Relationship'
import type { CreateMemberInput, UpdateMemberInput } from './services/familyService'
import type { QuickRelationshipAction } from './components/MemberDetailPanel'

function App() {
  // State
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddRelationshipModalOpen, setIsAddRelationshipModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [preSelectedRelationshipType, setPreSelectedRelationshipType] = useState<RelationshipType | undefined>(undefined)

  // Data hook
  const {
    members,
    loading,
    error,
    addMember,
    updateMember,
    deleteMember,
    addRelationship,
    deleteRelationship,
    clearAll,
    getParents,
    getChildren,
    getSpouses,
    getSiblings,
    getRelationshipsForMember,
  } = useFamilyData()

  // Seed initial data if empty (only once on first load)
  useEffect(() => {
    const seedData = async () => {
      if (!loading && members.length === 0) {
        // Check if we've already tried to seed
        const seeded = sessionStorage.getItem('ancestree-seeded')
        if (!seeded) {
          sessionStorage.setItem('ancestree-seeded', 'true')
          await addMember({
            name: 'Your Name',
            dateOfBirth: '1990-01-01',
            placeOfBirth: 'Your City',
            notes: 'This is you! Start adding your family members.',
          })
        }
      }
    }
    seedData()
  }, [loading, members.length, addMember])

  // Update selected member when members change (in case it was updated)
  useEffect(() => {
    if (selectedMember) {
      const updated = members.find((m) => m.id === selectedMember.id)
      if (updated) {
        setSelectedMember(updated)
      } else {
        // Member was deleted
        setSelectedMember(null)
      }
    }
  }, [members, selectedMember])

  // Handlers
  const handleAddMember = useCallback(async (data: CreateMemberInput) => {
    await addMember(data)
  }, [addMember])

  const handleUpdateMember = useCallback(async (id: string, data: UpdateMemberInput) => {
    await updateMember(id, data)
  }, [updateMember])

  const handleDeleteMember = useCallback(async (id: string) => {
    await deleteMember(id)
    setSelectedMember(null)
  }, [deleteMember])

  const handleAddRelationship = useCallback(async (
    type: RelationshipType,
    person1Id: string,
    person2Id: string,
    metadata?: { marriageDate?: string; divorceDate?: string }
  ) => {
    await addRelationship(type, person1Id, person2Id, metadata)
  }, [addRelationship])

  const handleDeleteRelationship = useCallback(async (id: string) => {
    await deleteRelationship(id)
  }, [deleteRelationship])

  const handleClearAll = useCallback(async () => {
    if (confirm('Delete all family members? This cannot be undone.')) {
      await clearAll()
      sessionStorage.removeItem('ancestree-seeded')
      setSelectedMember(null)
    }
  }, [clearAll])

  const handleOpenAddModal = useCallback(() => {
    setIsAddModalOpen(true)
  }, [])

  const handleCloseAddModal = useCallback(() => {
    setIsAddModalOpen(false)
  }, [])

  const handleOpenEditModal = useCallback((member: FamilyMember) => {
    setEditingMember(member)
    setIsEditModalOpen(true)
  }, [])

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false)
    setEditingMember(null)
  }, [])

  const handleOpenAddRelationshipModal = useCallback(() => {
    setPreSelectedRelationshipType(undefined)
    setIsAddRelationshipModalOpen(true)
  }, [])

  const handleCloseAddRelationshipModal = useCallback(() => {
    setIsAddRelationshipModalOpen(false)
    setPreSelectedRelationshipType(undefined)
  }, [])

  /**
   * Handle quick relationship action from the detail panel.
   * Maps quick action types to relationship types and pre-selects them in the modal.
   */
  const handleQuickAddRelationship = useCallback((action: QuickRelationshipAction) => {
    // Map quick action to relationship type
    const typeMap: Record<QuickRelationshipAction, RelationshipType> = {
      parent: 'parent-child',
      child: 'parent-child',
      spouse: 'spouse',
      sibling: 'sibling',
    }
    setPreSelectedRelationshipType(typeMap[action])
    setIsAddRelationshipModalOpen(true)
  }, [])

  const handleMemberSelect = useCallback((member: FamilyMember) => {
    setSelectedMember(member)
  }, [])

  const handleCloseDetailPanel = useCallback(() => {
    setSelectedMember(null)
  }, [])

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-red-400 text-xl">Error: {error.message}</div>
      </div>
    )
  }

  return (
    <>
      <Layout
        header={
          <Header
            memberCount={members.length}
            onAddMember={handleOpenAddModal}
            onClearAll={handleClearAll}
          />
        }
        sidebar={
          <MemberListSidebar
            members={members}
            selectedMemberId={selectedMember?.id}
            onMemberSelect={handleMemberSelect}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
        }
        sidebarCollapsed={isSidebarCollapsed}
        detailPanel={
          selectedMember ? (
            <MemberDetailPanel
              member={selectedMember}
              onClose={handleCloseDetailPanel}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteMember}
              getParents={getParents}
              getChildren={getChildren}
              getSpouses={getSpouses}
              getSiblings={getSiblings}
              onMemberSelect={handleMemberSelect}
              getRelationshipsForMember={getRelationshipsForMember}
              onDeleteRelationship={handleDeleteRelationship}
              onAddRelationship={handleOpenAddRelationshipModal}
              onQuickAddRelationship={handleQuickAddRelationship}
            />
          ) : undefined
        }
      >
        {/* 3D Scene */}
        <TreeScene members={members} onMemberSelect={handleMemberSelect} />

        {/* Empty state */}
        {members.length === 0 && <EmptyState />}

        {/* Save indicator */}
        <SaveIndicator />
      </Layout>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSubmit={handleAddMember}
      />

      {/* Edit Member Modal */}
      <EditMemberModal
        isOpen={isEditModalOpen}
        member={editingMember}
        onClose={handleCloseEditModal}
        onSubmit={handleUpdateMember}
      />

      {/* Add Relationship Modal */}
      <AddRelationshipModal
        isOpen={isAddRelationshipModalOpen}
        onClose={handleCloseAddRelationshipModal}
        onSubmit={handleAddRelationship}
        members={members}
        preSelectedMemberId={selectedMember?.id}
        preSelectedType={preSelectedRelationshipType}
      />
    </>
  )
}

export default App
