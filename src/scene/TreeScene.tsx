import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { FamilyNode } from './FamilyNode'
import type { FamilyMember } from '../models/FamilyMember'

interface TreeSceneProps {
  members: FamilyMember[]
  onMemberSelect: (member: FamilyMember) => void
}

/**
 * Main 3D scene component that renders the family tree visualization.
 */
export function TreeScene({ members, onMemberSelect }: TreeSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 60 }}
      style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a)' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#60a5fa" />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Family member nodes */}
      {members.map((member, index) => (
        <FamilyNode
          key={member.id}
          member={member}
          position={[index * 2 - (members.length - 1), 0, 0]}
          onClick={() => onMemberSelect(member)}
        />
      ))}

      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.5} />
      </mesh>

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
      />
    </Canvas>
  )
}
