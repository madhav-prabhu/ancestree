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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { TreeScene } from './scene/TreeScene'
import { MiniMap } from './scene/MiniMap'
import { useFamilyData } from './hooks/useFamilyData'
import { useFileOperations } from './hooks/useFileOperations'
import { calculateTreeLayout, getBoundingBox } from './scene/layout'
import {
  AddMemberModal,
  EditMemberModal,
  MemberDetailPanel,
  MemberListSidebar,
  AddRelationshipModal,
} from './components'
import { Layout, Header, SaveIndicator, EmptyState } from './components/Layout'
import { exportToJson } from './utils/exportUtils'
import { importFromJson } from './utils/importUtils'
import { isElectron } from './utils/platform'
import type { FamilyMember } from './models/FamilyMember'
import type { Relationship, RelationshipType } from './models/Relationship'
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

  // MiniMap state
  const [showMiniMap, setShowMiniMap] = useState(true)
  const [cameraTarget, setCameraTarget] = useState({ x: 0, y: 0, z: 0 })
  const [minimapNavTarget, setMinimapNavTarget] = useState<{ x: number; y: number; z: number } | null>(null)

  // Import feedback state
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Data hook
  const {
    members,
    relationships,
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

  // File operations hook for Electron native save/open
  const fileOps = useFileOperations()

  // Ref to hold current tree data for save operations (avoids stale closures)
  const treeDataRef = useRef<{ members: FamilyMember[]; relationships: Relationship[] }>({
    members: [],
    relationships: []
  })

  // Update ref when tree data changes
  useEffect(() => {
    treeDataRef.current = { members, relationships }
  }, [members, relationships])

  // Subscribe to menu events from main process (Electron only)
  useEffect(() => {
    if (!isElectron()) return

    const unsubscribe = window.electronAPI!.onMenuAction(async (action) => {
      switch (action) {
        case 'new':
          // TODO: Prompt to save if dirty
          fileOps.newFile()
          // Reset tree data to initial state
          await clearAll()
          sessionStorage.removeItem('ancestree-seeded')
          setSelectedMember(null)
          break

        case 'open': {
          const data = await fileOps.open()
          if (data) {
            // Load the data into tree state
            const fileData = data as { members: FamilyMember[]; relationships: Relationship[] }
            await clearAll()
            sessionStorage.removeItem('ancestree-seeded')
            // Import members first, then relationships
            for (const member of fileData.members || []) {
              await addMember({
                name: member.name,
                dateOfBirth: member.dateOfBirth,
                placeOfBirth: member.placeOfBirth,
                dateOfDeath: member.dateOfDeath,
                notes: member.notes,
                photo: member.photo,
              })
            }
            // Note: Relationships would need ID mapping - for now skip
            // This will be enhanced in future plans
            setSelectedMember(null)
          }
          break
        }

        case 'save':
          await fileOps.save(treeDataRef.current)
          break

        case 'saveAs':
          await fileOps.saveAs(treeDataRef.current)
          break

        case 'export':
          // Use existing export functionality
          exportToJson(members, relationships)
          break
      }
    })

    return () => unsubscribe()
  }, [fileOps, clearAll, addMember, members, relationships])

  // Mark dirty and update auto-save when tree data changes
  useEffect(() => {
    if (!isElectron()) return
    // Only mark dirty if there's actual data (not initial empty state)
    if (members.length > 0 || relationships.length > 0) {
      fileOps.markDirty()
      fileOps.updateAutoSave({ members, relationships })
    }
  }, [members, relationships, fileOps])

  // Check for draft on mount (crash recovery)
  useEffect(() => {
    if (!isElectron()) return

    const checkDraft = async () => {
      const { hasDraft, draft } = await fileOps.checkForDraft()
      if (hasDraft && draft) {
        // Show confirmation dialog for recovery
        const shouldRecover = confirm('A previous session was not saved. Would you like to recover it?')
        if (shouldRecover) {
          const draftData = draft as { members: FamilyMember[]; relationships: Relationship[] }
          await clearAll()
          sessionStorage.removeItem('ancestree-seeded')
          // Import recovered members
          for (const member of draftData.members || []) {
            await addMember({
              name: member.name,
              dateOfBirth: member.dateOfBirth,
              placeOfBirth: member.placeOfBirth,
              dateOfDeath: member.dateOfDeath,
              notes: member.notes,
              photo: member.photo,
            })
          }
          setSelectedMember(null)
        }
        // Clear draft after handling (whether recovered or dismissed)
        await fileOps.clearDraft()
      }
    }

    checkDraft()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  // Calculate positions and bounds for minimap
  const positions = useMemo(
    () => calculateTreeLayout(members, relationships),
    [members, relationships]
  )

  const bounds = useMemo(() => getBoundingBox(positions), [positions])

  // MiniMap handlers
  const handleCameraTargetChange = useCallback(
    (target: { x: number; y: number; z: number }) => {
      setCameraTarget(target)
    },
    []
  )

  const handleMinimapNavigate = useCallback(
    (position: { x: number; y: number; z: number }) => {
      setMinimapNavTarget(position)
      // Clear the nav target after a short delay so it can be triggered again
      setTimeout(() => setMinimapNavTarget(null), 100)
    },
    []
  )

  const handleToggleMiniMap = useCallback(() => {
    setShowMiniMap((prev) => !prev)
  }, [])

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

  /** Create a new member and return their ID (used by AddRelationshipModal) */
  const handleCreateMemberForRelationship = useCallback(async (data: { name: string; dateOfBirth?: string }): Promise<string> => {
    const newMember = await addMember({
      name: data.name,
      dateOfBirth: data.dateOfBirth,
    })
    return newMember.id
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

  const handleExport = useCallback(() => {
    exportToJson(members, relationships)
  }, [members, relationships])

  const handleImport = useCallback(async (file: File) => {
    // Clear any previous message
    setImportMessage(null)

    const result = await importFromJson(
      file,
      async () => {
        await clearAll()
        sessionStorage.removeItem('ancestree-seeded')
      },
      addMember,
      addRelationship
    )

    if (result.success) {
      setSelectedMember(null)
      setImportMessage({
        type: 'success',
        text: `Successfully imported ${result.memberCount} member${result.memberCount !== 1 ? 's' : ''} and ${result.relationshipCount} relationship${result.relationshipCount !== 1 ? 's' : ''}.`,
      })
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setImportMessage(null), 5000)
    } else {
      setImportMessage({
        type: 'error',
        text: result.error || 'Failed to import file.',
      })
    }
  }, [clearAll, addMember, addRelationship])

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
            onExport={handleExport}
            onImport={handleImport}
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
        <TreeScene
          members={members}
          relationships={relationships}
          selectedMemberId={selectedMember?.id}
          onMemberSelect={handleMemberSelect}
          onCameraTargetChange={handleCameraTargetChange}
          navigateToPosition={minimapNavTarget}
        />

        {/* MiniMap */}
        <MiniMap
          members={members}
          positions={positions}
          bounds={bounds}
          selectedMemberId={selectedMember?.id}
          cameraTarget={cameraTarget}
          onNavigate={handleMinimapNavigate}
          visible={showMiniMap}
        />

        {/* MiniMap toggle button */}
        <button
          onClick={handleToggleMiniMap}
          className="absolute bottom-4 left-4 z-20 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition-colors"
          style={{ left: showMiniMap ? '220px' : '16px' }}
          title={showMiniMap ? 'Hide mini-map' : 'Show mini-map'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </button>

        {/* Empty state */}
        {members.length === 0 && <EmptyState />}

        {/* Save indicator */}
        <SaveIndicator />

        {/* Import feedback message */}
        {importMessage && (
          <div
            className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
              importMessage.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {importMessage.type === 'success' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span>{importMessage.text}</span>
            <button
              onClick={() => setImportMessage(null)}
              className="ml-2 hover:opacity-80"
              title="Dismiss"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
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
        onCreateMember={handleCreateMemberForRelationship}
        members={members}
        preSelectedMemberId={selectedMember?.id}
        preSelectedType={preSelectedRelationshipType}
      />
    </>
  )
}

export default App
