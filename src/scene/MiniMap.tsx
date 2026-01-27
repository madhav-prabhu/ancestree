/**
 * MiniMap Component - Bird's eye navigation for the 3D scene.
 *
 * Features:
 * - Small picture-in-picture view in bottom-left
 * - Orthographic camera showing entire tree
 * - Simplified node dots (green, selected=gold)
 * - Viewport indicator showing current camera position
 * - Click to navigate main camera
 * - Drag to navigate with real-time camera updates
 * - Toggle on/off
 */

import { useRef, useCallback, useMemo, useEffect, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { FamilyMember } from '../models'
import type { PositionMap } from './layout'

interface MiniMapProps {
  /** Family members to display */
  members: FamilyMember[]
  /** Position map from layout */
  positions: PositionMap
  /** Bounding box of the tree */
  bounds: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    center: { x: number; y: number; z: number }
  }
  /** Currently selected member ID */
  selectedMemberId?: string
  /** Current camera target position */
  cameraTarget: { x: number; y: number; z: number }
  /** Callback when user clicks on minimap to navigate */
  onNavigate: (position: { x: number; y: number; z: number }) => void
  /** Whether the minimap is visible */
  visible: boolean
}

/**
 * Simplified node dot for minimap.
 */
function MiniMapNode({
  position,
  isSelected,
}: {
  position: [number, number, number]
  isSelected: boolean
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshBasicMaterial color={isSelected ? '#fbbf24' : '#10b981'} />
    </mesh>
  )
}

/**
 * Viewport indicator showing current camera view area.
 */
function ViewportIndicator({
  target,
  viewSize = 10,
  isDragging = false,
}: {
  target: { x: number; y: number; z: number }
  viewSize?: number
  isDragging?: boolean
}) {
  const halfSize = viewSize / 2

  // Create geometry and material once, memoized
  const geometry = useMemo(() => new THREE.BufferGeometry(), [])
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#f59e0b', linewidth: 2 }),
    []
  )

  // Create line object once
  const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material])

  // Update material color when dragging state changes
  useEffect(() => {
    material.color.set(isDragging ? '#fbbf24' : '#f59e0b')
  }, [isDragging, material])

  // Update geometry points when target changes
  useEffect(() => {
    const points = [
      new THREE.Vector3(target.x - halfSize, target.y - halfSize, 0.1),
      new THREE.Vector3(target.x + halfSize, target.y - halfSize, 0.1),
      new THREE.Vector3(target.x + halfSize, target.y + halfSize, 0.1),
      new THREE.Vector3(target.x - halfSize, target.y + halfSize, 0.1),
      new THREE.Vector3(target.x - halfSize, target.y - halfSize, 0.1),
    ]
    geometry.setFromPoints(points)
  }, [target.x, target.y, halfSize, geometry])

  // Cleanup: dispose geometry and material on unmount
  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return <primitive object={line} />
}

/**
 * Inner minimap scene content.
 */
function MiniMapScene({
  members,
  positions,
  bounds,
  selectedMemberId,
  cameraTarget,
  onNavigate,
}: Omit<MiniMapProps, 'visible'>) {
  const { camera, size } = useThree()
  const planeRef = useRef<THREE.Mesh>(null)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const lastNavigatePosition = useRef<{ x: number; y: number } | null>(null)

  // Calculate camera frustum size based on bounds
  const frustumSize = useMemo(() => {
    const width = bounds.max.x - bounds.min.x
    const height = bounds.max.y - bounds.min.y
    return Math.max(width, height) * 1.3 + 10
  }, [bounds])

  // Update orthographic camera
  useFrame(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      const aspect = size.width / size.height
      camera.left = (-frustumSize * aspect) / 2
      camera.right = (frustumSize * aspect) / 2
      camera.top = frustumSize / 2
      camera.bottom = -frustumSize / 2
      camera.updateProjectionMatrix()
    }
  })

  // Clamp position to bounds with some padding
  const clampToBounds = useCallback(
    (x: number, y: number) => {
      const padding = 2
      return {
        x: Math.max(bounds.min.x - padding, Math.min(bounds.max.x + padding, x)),
        y: Math.max(bounds.min.y - padding, Math.min(bounds.max.y + padding, y)),
      }
    },
    [bounds]
  )

  // Navigate to a position (used by both click and drag)
  const navigateToPoint = useCallback(
    (point: THREE.Vector3, throttle = false) => {
      const clamped = clampToBounds(point.x, point.y)

      // Throttle updates during drag to avoid spamming callbacks
      if (throttle && lastNavigatePosition.current) {
        const dx = Math.abs(clamped.x - lastNavigatePosition.current.x)
        const dy = Math.abs(clamped.y - lastNavigatePosition.current.y)
        // Only update if moved more than 0.5 units
        if (dx < 0.5 && dy < 0.5) {
          return
        }
      }

      lastNavigatePosition.current = clamped
      onNavigate({
        x: clamped.x,
        y: clamped.y,
        z: 0,
      })
    },
    [clampToBounds, onNavigate]
  )

  // Handle pointer down - start drag
  const handlePointerDown = useCallback(
    (event: { stopPropagation: () => void; point?: THREE.Vector3 }) => {
      event.stopPropagation()
      if (event.point) {
        setIsDragging(true)
        navigateToPoint(event.point, false)
      }
    },
    [navigateToPoint]
  )

  // Handle pointer move - drag navigation
  const handlePointerMove = useCallback(
    (event: { point?: THREE.Vector3 }) => {
      if (isDragging && event.point) {
        navigateToPoint(event.point, true)
      }
    },
    [isDragging, navigateToPoint]
  )

  // Handle pointer up - end drag
  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      lastNavigatePosition.current = null
    }
  }, [isDragging])

  // Clickable plane covering the scene
  const planeSize = frustumSize * 2

  return (
    <>
      {/* Background */}
      <color attach="background" args={['#0f172a']} />

      {/* Orthographic camera looking down */}
      <OrthographicCamera
        makeDefault
        position={[bounds.center.x, bounds.center.y, 50]}
        zoom={1}
        near={0.1}
        far={100}
      />

      {/* Ambient light */}
      <ambientLight intensity={1} />

      {/* Interactive background plane - supports click and drag */}
      <mesh
        ref={planeRef}
        position={[bounds.center.x, bounds.center.y, -1]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0} />
      </mesh>

      {/* Grid helper */}
      <gridHelper
        args={[frustumSize, 10, '#334155', '#1e293b']}
        position={[bounds.center.x, bounds.center.y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Node dots */}
      {members.map((member) => {
        const pos = positions.get(member.id)
        if (!pos) return null
        return (
          <MiniMapNode
            key={member.id}
            position={[pos.x, pos.y, 0]}
            isSelected={member.id === selectedMemberId}
          />
        )
      })}

      {/* Viewport indicator */}
      <ViewportIndicator target={cameraTarget} isDragging={isDragging} />
    </>
  )
}

/**
 * MiniMap component - renders a small bird's eye view of the family tree.
 * Uses CSS 'hidden' class instead of returning null to preserve WebGL context on toggle.
 */
export function MiniMap({
  members,
  positions,
  bounds,
  selectedMemberId,
  cameraTarget,
  onNavigate,
  visible,
}: MiniMapProps) {
  return (
    <div className={`absolute bottom-4 left-4 z-10 ${visible ? '' : 'hidden'}`}>
      <div className="w-48 h-32 rounded-lg overflow-hidden border-2 border-slate-600 shadow-xl bg-slate-900 cursor-crosshair">
        <Canvas
          frameloop="demand"
          dpr={1}
          gl={{ antialias: false }}
        >
          <MiniMapScene
            members={members}
            positions={positions}
            bounds={bounds}
            selectedMemberId={selectedMemberId}
            cameraTarget={cameraTarget}
            onNavigate={onNavigate}
          />
        </Canvas>
      </div>
      <p className="text-xs text-slate-500 mt-1 text-center">Click or drag to navigate</p>
    </div>
  )
}
