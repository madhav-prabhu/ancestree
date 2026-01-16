/**
 * Cosmic background for the galaxy visualization.
 * Creates an atmospheric starfield that enhances the No Man's Sky feel.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import { AdditiveBlending, BufferAttribute, Points as ThreePoints } from 'three'
import {
  STAR_COUNT,
  STAR_DEPTH_MIN,
  STAR_DEPTH_MAX,
  STAR_SPREAD,
} from './constants'

/**
 * Random number generator with seed for consistent star positions.
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

/**
 * Cosmic background with starfield particles.
 * Stars twinkle subtly for added atmosphere.
 */
export function CosmicBackground() {
  const pointsRef = useRef<ThreePoints>(null)

  // Generate star positions - memoized for performance
  const [positions, sizes] = useMemo(() => {
    const random = seededRandom(42) // Consistent seed for reproducible layout
    const posArray = new Float32Array(STAR_COUNT * 3)
    const sizeArray = new Float32Array(STAR_COUNT)

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3

      // Spread stars across a large area behind the scene
      posArray[i3] = (random() - 0.5) * STAR_SPREAD
      posArray[i3 + 1] = (random() - 0.5) * STAR_SPREAD
      posArray[i3 + 2] = STAR_DEPTH_MIN + random() * (STAR_DEPTH_MAX - STAR_DEPTH_MIN)

      // Vary star sizes - most small, some larger
      const sizeRand = random()
      sizeArray[i] = sizeRand < 0.9 ? 0.5 + random() * 0.5 : 1.0 + random() * 1.0
    }

    return [posArray, sizeArray]
  }, [])

  // Subtle twinkle animation
  useFrame((state) => {
    if (!pointsRef.current) return

    const time = state.clock.elapsedTime
    const geometry = pointsRef.current.geometry
    const sizeAttr = geometry.getAttribute('size') as BufferAttribute

    if (sizeAttr) {
      const baseArray = sizes
      const newSizes = sizeAttr.array as Float32Array

      for (let i = 0; i < STAR_COUNT; i++) {
        // Each star twinkles at slightly different rate
        const twinkle = Math.sin(time * 0.5 + i * 0.1) * 0.15 + 1
        newSizes[i] = baseArray[i] * twinkle
      }

      sizeAttr.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Main starfield */}
      <Points ref={pointsRef} positions={positions} stride={3}>
        <PointMaterial
          transparent
          color="#ffffff"
          size={0.08}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.7}
          blending={AdditiveBlending}
        />
        <bufferAttribute
          attach="geometry-attributes-size"
          args={[sizes, 1]}
        />
      </Points>

      {/* Distant colored nebula hints - subtle colored points */}
      <NebulaHints />
    </group>
  )
}

/**
 * Subtle colored points that suggest distant nebulae.
 * Adds depth and color variety to the background.
 */
function NebulaHints() {
  const positions = useMemo(() => {
    const random = seededRandom(123)
    const count = 50
    const posArray = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      posArray[i3] = (random() - 0.5) * STAR_SPREAD * 0.8
      posArray[i3 + 1] = (random() - 0.5) * STAR_SPREAD * 0.8
      posArray[i3 + 2] = STAR_DEPTH_MIN - 10 + random() * 20
    }

    return posArray
  }, [])

  // Cycle through nebula colors
  const colors = ['#4da6ff', '#9966ff', '#ff69b4', '#00cccc']

  return (
    <>
      {colors.map((color, idx) => (
        <Points
          key={color}
          positions={positions.slice(idx * 12 * 3, (idx + 1) * 12 * 3)}
          stride={3}
        >
          <PointMaterial
            transparent
            color={color}
            size={0.3}
            sizeAttenuation={true}
            depthWrite={false}
            opacity={0.15}
            blending={AdditiveBlending}
          />
        </Points>
      ))}
    </>
  )
}
