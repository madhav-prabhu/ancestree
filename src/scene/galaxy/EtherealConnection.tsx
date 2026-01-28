/**
 * Ethereal connection lines for the galaxy visualization.
 * Lines stretch dynamically when nodes are dragged.
 */

import { useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { QuadraticBezierLine } from '@react-three/drei'
import { Vector3 } from 'three'
import type { Relationship } from '../../models/Relationship'
import { usePhysics } from './PhysicsContext'

const CONNECTION_COLORS = {
  'parent-child': '#4da6ff',
  'spouse': '#ff69b4',
  'sibling': '#66ff99',
} as const

interface EtherealConnectionsProps {
  relationships: Relationship[]
}

/**
 * Calculate the midpoint for a bezier curve based on relationship type.
 */
function calculateMidpoint(start: Vector3, end: Vector3, type: string): Vector3 {
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5)

  if (type === 'parent-child') {
    // Gentle curve - offset perpendicular to line
    mid.z += 0.4
  } else if (type === 'spouse') {
    // Arc above the line
    mid.y += 0.5
  } else {
    // Sibling - arc below
    mid.y -= 0.4
  }

  return mid
}

/**
 * Single connection that updates with physics.
 * Uses state to trigger re-renders when positions change significantly.
 */
function PhysicsConnection({ relationship }: { relationship: Relationship }) {
  const physics = usePhysics()

  // Track positions in state for re-rendering
  const [points, setPoints] = useState(() => {
    const start = physics.getPosition(relationship.person1Id).clone()
    const end = physics.getPosition(relationship.person2Id).clone()
    const type = relationship.type
    const mid = calculateMidpoint(start, end, type)
    return { start, mid, end }
  })

  const type = relationship.type as keyof typeof CONNECTION_COLORS
  const color = CONNECTION_COLORS[type] ?? CONNECTION_COLORS['parent-child']

  // Update positions from physics each frame
  useFrame(() => {
    const start = physics.getPosition(relationship.person1Id)
    const end = physics.getPosition(relationship.person2Id)

    // Check if positions have changed enough to warrant update
    const startDiff = points.start.distanceToSquared(start)
    const endDiff = points.end.distanceToSquared(end)

    // Update if either endpoint moved more than threshold
    if (startDiff > 0.0001 || endDiff > 0.0001) {
      const newStart = start.clone()
      const newEnd = end.clone()
      const newMid = calculateMidpoint(newStart, newEnd, type)
      setPoints({ start: newStart, mid: newMid, end: newEnd })
    }
  })

  return (
    <group>
      <QuadraticBezierLine
        start={points.start}
        mid={points.mid}
        end={points.end}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.5}
        dashed={type === 'sibling'}
        dashScale={8}
        dashSize={0.3}
        gapSize={0.15}
      />
      <QuadraticBezierLine
        start={points.start}
        mid={points.mid}
        end={points.end}
        color={color}
        lineWidth={6}
        transparent
        opacity={0.12}
      />
    </group>
  )
}

/**
 * Container for all connections.
 */
export function EtherealConnections({ relationships }: EtherealConnectionsProps) {
  return (
    <group>
      {relationships.map((rel) => (
        <PhysicsConnection key={rel.id} relationship={rel} />
      ))}
    </group>
  )
}
