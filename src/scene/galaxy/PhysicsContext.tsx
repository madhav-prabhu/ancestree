/**
 * Physics context for interactive drag with spring effects.
 * Manages node positions and runs spring simulation.
 */

import { createContext, useContext, useRef, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

// Physics constants
const DAMPING = 0.92 // Smooth movement decay
const MAX_DRAG_DISTANCE = 3.0 // Maximum distance a node can be dragged from its anchor
const FLOAT_AMPLITUDE = 0.06 // Visible floating amplitude
const FLOAT_SPEED = 0.6 // Gentle floating speed

interface PhysicsNode {
  position: Vector3
  velocity: Vector3
  restPosition: Vector3 // Original layout position
  anchorPosition: Vector3 // Where node settles after drag (can differ from rest)
  isDragging: boolean
  driftPhase: number // Random phase for organic drift
}

interface PhysicsContextValue {
  getPosition: (id: string) => Vector3
  startDrag: (id: string) => void
  updateDrag: (id: string, newPos: Vector3) => void
  endDrag: (id: string) => void
  isDragging: (id: string) => boolean
}

const PhysicsContext = createContext<PhysicsContextValue | null>(null)

export function usePhysics(): PhysicsContextValue {
  const ctx = useContext(PhysicsContext)
  if (!ctx) throw new Error('usePhysics must be used within PhysicsProvider')
  return ctx
}

interface PhysicsProviderProps {
  positions: Map<string, { x: number; y: number; z: number }>
  relationships: Array<{ person1Id: string; person2Id: string }>
  children: React.ReactNode
}

export function PhysicsProvider({ positions, children }: PhysicsProviderProps) {
  // Store physics state in ref to avoid re-renders
  const nodesRef = useRef<Map<string, PhysicsNode>>(new Map())
  const draggedIdRef = useRef<string | null>(null)

  // Initialize/update nodes when positions change
  useMemo(() => {
    const nodes = nodesRef.current
    for (const [id, pos] of positions) {
      if (!nodes.has(id)) {
        nodes.set(id, {
          position: new Vector3(pos.x, pos.y, pos.z),
          velocity: new Vector3(),
          restPosition: new Vector3(pos.x, pos.y, pos.z),
          anchorPosition: new Vector3(pos.x, pos.y, pos.z),
          isDragging: false,
          driftPhase: Math.random() * Math.PI * 2, // Random starting phase
        })
      } else {
        // Update rest position but keep current physics state
        const node = nodes.get(id)!
        node.restPosition.set(pos.x, pos.y, pos.z)
        // Only update anchor if node hasn't been dragged
        if (node.anchorPosition.equals(node.restPosition)) {
          node.anchorPosition.set(pos.x, pos.y, pos.z)
        }
      }
    }
    // Remove nodes that no longer exist
    for (const id of nodes.keys()) {
      if (!positions.has(id)) nodes.delete(id)
    }
  }, [positions])

  // Track time for floating animation
  const timeRef = useRef(0)

  // Physics simulation with subtle floating animation
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1) * 60 // Normalize to ~60fps
    timeRef.current += delta
    const time = timeRef.current
    const nodes = nodesRef.current

    for (const [, node] of nodes) {
      if (node.isDragging) continue

      // Apply damping to any existing velocity (from drag release)
      if (node.velocity.lengthSq() > 0.0001) {
        node.velocity.multiplyScalar(DAMPING)
        node.position.add(node.velocity.clone().multiplyScalar(dt))
      } else {
        // Subtle floating animation - oscillate around anchor position
        // Each node has unique phase for organic feel
        const floatX = Math.sin(time * FLOAT_SPEED + node.driftPhase) * FLOAT_AMPLITUDE
        const floatY = Math.sin(time * FLOAT_SPEED * 0.7 + node.driftPhase + 1.5) * FLOAT_AMPLITUDE
        const floatZ = Math.sin(time * FLOAT_SPEED * 0.5 + node.driftPhase + 3.0) * FLOAT_AMPLITUDE * 0.5

        // Set position to anchor + float offset (doesn't accumulate)
        node.position.x = node.anchorPosition.x + floatX
        node.position.y = node.anchorPosition.y + floatY
        node.position.z = node.anchorPosition.z + floatZ
      }
    }
  })

  const getPosition = useCallback((id: string): Vector3 => {
    const node = nodesRef.current.get(id)
    return node?.position ?? new Vector3()
  }, [])

  const startDrag = useCallback((id: string) => {
    const node = nodesRef.current.get(id)
    if (node) {
      node.isDragging = true
      node.velocity.set(0, 0, 0)
      draggedIdRef.current = id
    }
  }, [])

  const updateDrag = useCallback((id: string, newPos: Vector3) => {
    const node = nodesRef.current.get(id)
    if (node?.isDragging) {
      // Clamp to maximum drag distance from anchor
      const dist = newPos.distanceTo(node.anchorPosition)
      if (dist > MAX_DRAG_DISTANCE) {
        // Move in the direction of newPos but only up to MAX_DRAG_DISTANCE
        const dir = newPos.clone().sub(node.anchorPosition).normalize()
        node.position.copy(node.anchorPosition).add(dir.multiplyScalar(MAX_DRAG_DISTANCE))
      } else {
        node.position.copy(newPos)
      }
    }
  }, [])

  const endDrag = useCallback((id: string) => {
    const node = nodesRef.current.get(id)
    if (node) {
      node.isDragging = false
      // Update anchor to current position - node stays where dropped
      node.anchorPosition.copy(node.position)
      draggedIdRef.current = null
    }
  }, [])

  const isDragging = useCallback((id: string): boolean => {
    return nodesRef.current.get(id)?.isDragging ?? false
  }, [])

  const value: PhysicsContextValue = {
    getPosition,
    startDrag,
    updateDrag,
    endDrag,
    isDragging,
  }

  return <PhysicsContext.Provider value={value}>{children}</PhysicsContext.Provider>
}
