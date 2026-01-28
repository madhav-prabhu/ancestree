/**
 * Galaxy-style node component for family members.
 * Renders as a subtle glowing orb with drag interaction.
 */

import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { FamilyMember } from '../../models/FamilyMember'
import { usePhysics } from './PhysicsContext'
import {
  GALAXY_COLORS,
  ORB_RADIUS,
  EMISSIVE_INTENSITY,
  ORB_LIGHT_INTENSITY,
  ORB_LIGHT_DISTANCE,
} from './constants'

interface GalaxyNodeProps {
  member: FamilyMember
  position: [number, number, number]
  generation?: number
  isSelected?: boolean
  onClick: () => void
}

function getGenerationColor(generation: number): string {
  const index = Math.min(generation, GALAXY_COLORS.length - 1)
  return GALAXY_COLORS[index]
}

function isDeceased(member: FamilyMember): boolean {
  return !!member.dateOfDeath
}

export function GalaxyNode({
  member,
  position,
  generation = 0,
  isSelected = false,
  onClick,
}: GalaxyNodeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)

  const { camera, gl } = useThree()
  const physics = usePhysics()

  // Drag plane and raycaster refs
  const dragPlane = useRef(new THREE.Plane())
  const raycaster = useRef(new THREE.Raycaster())
  const pointer = useRef(new THREE.Vector2())
  const intersection = useRef(new THREE.Vector3())

  const deceased = useMemo(() => isDeceased(member), [member])
  const baseColor = useMemo(() => getGenerationColor(generation), [generation])

  const displayColor = useMemo(() => {
    if (isSelected) return '#fbbf24'
    if (hovered || dragging) return '#34d399'
    return baseColor
  }, [isSelected, hovered, dragging, baseColor])

  const emissiveIntensity = useMemo(() => {
    let intensity = EMISSIVE_INTENSITY
    if (deceased) intensity *= 0.6
    if (isSelected) intensity *= 1.4
    if (hovered || dragging) intensity *= 1.2
    return intensity
  }, [deceased, isSelected, hovered, dragging])

  // Update position from physics every frame
  useFrame(() => {
    if (groupRef.current) {
      const pos = physics.getPosition(member.id)
      groupRef.current.position.copy(pos)
    }
  })

  // Pointer event handlers
  const handlePointerDown = useCallback((e: THREE.Event & { stopPropagation?: () => void }) => {
    e.stopPropagation?.()
    ;(gl.domElement as HTMLElement).setPointerCapture((e as unknown as PointerEvent).pointerId)

    // Set up drag plane perpendicular to camera
    const pos = physics.getPosition(member.id)
    const camDir = new THREE.Vector3()
    camera.getWorldDirection(camDir)
    dragPlane.current.setFromNormalAndCoplanarPoint(camDir, pos)

    physics.startDrag(member.id)
    setDragging(true)
  }, [camera, gl.domElement, member.id, physics])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragging) return

    // Convert to normalized device coordinates
    const rect = gl.domElement.getBoundingClientRect()
    pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    // Raycast to drag plane
    raycaster.current.setFromCamera(pointer.current, camera)
    if (raycaster.current.ray.intersectPlane(dragPlane.current, intersection.current)) {
      physics.updateDrag(member.id, intersection.current)
    }
  }, [camera, dragging, gl.domElement, member.id, physics])

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!dragging) return
    try {
      ;(gl.domElement as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
    physics.endDrag(member.id)
    setDragging(false)
  }, [dragging, gl.domElement, member.id, physics])

  // Attach global listeners for drag
  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
    }
  }, [gl.domElement, handlePointerMove, handlePointerUp])

  return (
    <group ref={groupRef} position={position}>
      {/* Core sphere - clickable and draggable */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerDown={handlePointerDown}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[ORB_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.1}
          roughness={0.7}
          transparent
          opacity={deceased ? 0.7 : 0.95}
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[ORB_RADIUS * 1.4, 24, 24]} />
        <meshBasicMaterial
          color={displayColor}
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[ORB_RADIUS * 1.8, 16, 16]} />
        <meshBasicMaterial
          color={displayColor}
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Point light */}
      <pointLight
        color={displayColor}
        intensity={ORB_LIGHT_INTENSITY}
        distance={ORB_LIGHT_DISTANCE}
        decay={2}
      />

      {/* Name label */}
      <Text
        position={[0, ORB_RADIUS * 2.2, 0]}
        fontSize={0.22}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.015}
        outlineColor="#000000"
      >
        {member.name.length > 18 ? member.name.substring(0, 17) + '…' : member.name}
      </Text>

      {/* Generation notation */}
      <Text
        position={[0, -ORB_RADIUS * 1.8, 0]}
        fontSize={0.12}
        color={baseColor}
        anchorX="center"
        anchorY="top"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        Gen {generation}
      </Text>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ORB_RADIUS * 1.6, ORB_RADIUS * 1.8, 32]} />
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}
