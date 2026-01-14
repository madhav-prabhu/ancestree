import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, RoundedBox } from '@react-three/drei'
import type { Mesh } from 'three'
import type { FamilyMember } from '../models/FamilyMember'

interface FamilyNodeProps {
  member: FamilyMember
  position: [number, number, number]
  onClick: () => void
}

/**
 * 3D representation of a family member as an interactive node.
 */
export function FamilyNode({ member, position, onClick }: FamilyNodeProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1
    }
  })

  return (
    <group position={position}>
      {/* Main node */}
      <RoundedBox
        ref={meshRef}
        args={[1.2, 0.8, 0.3]}
        radius={0.1}
        smoothness={4}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={hovered ? '#10b981' : '#3b82f6'}
          metalness={0.3}
          roughness={0.4}
        />
      </RoundedBox>

      {/* Name label */}
      <Text
        position={[0, 0, 0.2]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={1}
      >
        {member.name}
      </Text>

      {/* Glow effect when hovered */}
      {hovered && (
        <pointLight position={[0, 0, 0.5]} intensity={0.5} color="#10b981" distance={2} />
      )}
    </group>
  )
}
