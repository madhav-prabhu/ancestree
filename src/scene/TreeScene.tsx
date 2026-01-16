/**
 * Main 3D scene component - Galaxy visualization.
 * Renders family tree as a No Man's Sky inspired cosmic map.
 * Features interactive spring physics for drag interactions.
 */

import { useMemo, useRef, useCallback, memo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CameraController } from './CameraController'
import { calculateTreeLayout, getBoundingBox, calculateGenerationMap } from './layout'
import {
  GalaxyNode,
  CosmicBackground,
  EtherealConnections,
  PhysicsProvider,
} from './galaxy'
import type { FamilyMember, Relationship } from '../models'

interface TreeSceneProps {
  members: FamilyMember[]
  relationships: Relationship[]
  selectedMemberId?: string
  onMemberSelect: (member: FamilyMember) => void
}

/**
 * Inner scene content with Three.js context access.
 * Wrapped in PhysicsProvider for spring physics simulation.
 */
const SceneContent = memo(function SceneContent({
  members,
  relationships,
  positions,
  generations,
  bounds,
  selectedMemberId,
  onMemberSelect,
  controlsRef,
}: {
  members: FamilyMember[]
  relationships: Relationship[]
  positions: Map<string, { x: number; y: number; z: number }>
  generations: Map<string, number>
  bounds: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    center: { x: number; y: number; z: number }
  }
  selectedMemberId?: string
  onMemberSelect: (member: FamilyMember) => void
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  // Member IDs for keyboard navigation
  const memberIds = useMemo(() => members.map((m) => m.id), [members])

  // Navigation handler
  const handleNavigate = useCallback(
    (memberId: string) => {
      const member = members.find((m) => m.id === memberId)
      if (member) {
        onMemberSelect(member)
      }
    },
    [members, onMemberSelect]
  )

  return (
    <PhysicsProvider positions={positions} relationships={relationships}>
      {/* Performance monitoring */}
      <PerformanceMonitor />

      {/* Adaptive DPR for high-res displays */}
      <AdaptiveDpr pixelated />

      {/* Cosmic lighting - darker, more atmospheric */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-15, -10, -10]} intensity={0.4} color="#818cf8" />

      {/* Starfield background */}
      <CosmicBackground />

      {/* Connection lines between family members */}
      <EtherealConnections relationships={relationships} />

      {/* Camera controller for navigation */}
      <CameraController
        positions={positions}
        bounds={bounds}
        selectedMemberId={selectedMemberId}
        memberIds={memberIds}
        onNavigate={handleNavigate}
        controlsRef={controlsRef}
        enableKeyboardNav={true}
      />

      {/* Galaxy nodes - glowing orbs */}
      {members.map((member) => {
        const pos = positions.get(member.id)
        const gen = generations.get(member.id) ?? 0
        return (
          <GalaxyNode
            key={member.id}
            member={member}
            position={pos ? [pos.x, pos.y, pos.z] : [0, 0, 0]}
            generation={gen}
            isSelected={member.id === selectedMemberId}
            onClick={() => onMemberSelect(member)}
          />
        )
      })}

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef}
        target={[bounds.center.x, bounds.center.y, bounds.center.z]}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={100}
        enableDamping={true}
        dampingFactor={0.05}
      />
    </PhysicsProvider>
  )
})

/**
 * Main galaxy tree scene component.
 *
 * Features:
 * - Glowing orb nodes for family members
 * - Ethereal connection lines that respond to physics
 * - Drag any node - connected nodes stretch like rubber bands
 * - Pull limits prevent infinite stretching
 * - Cosmic starfield background
 * - Keyboard navigation (Arrow keys, F to focus, Home to fit all)
 */
export function TreeScene({
  members,
  relationships,
  selectedMemberId,
  onMemberSelect,
}: TreeSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  // Calculate positions from layout algorithm
  const positions = useMemo(
    () => calculateTreeLayout(members, relationships),
    [members, relationships]
  )

  // Calculate generations for color coding
  const generations = useMemo(
    () => calculateGenerationMap(members, relationships),
    [members, relationships]
  )

  // Calculate bounding box for camera
  const bounds = useMemo(() => getBoundingBox(positions), [positions])

  // Initial camera position
  const cameraPosition = useMemo((): [number, number, number] => {
    if (members.length === 0) {
      return [0, 2, 10]
    }

    const treeWidth = bounds.max.x - bounds.min.x
    const treeHeight = bounds.max.y - bounds.min.y
    const maxDimension = Math.max(treeWidth, treeHeight, 5)

    return [bounds.center.x, bounds.center.y + 2, maxDimension * 1.5 + 5]
  }, [members.length, bounds])

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 60 }}
      style={{ background: 'linear-gradient(to bottom, #0c0f1a, #050608)' }}
      dpr={[1, 2]}
      frameloop="always"
    >
      <SceneContent
        members={members}
        relationships={relationships}
        positions={positions}
        generations={generations}
        bounds={bounds}
        selectedMemberId={selectedMemberId}
        onMemberSelect={onMemberSelect}
        controlsRef={controlsRef}
      />
    </Canvas>
  )
}
