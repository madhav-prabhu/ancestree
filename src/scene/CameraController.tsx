/**
 * CameraController Component
 *
 * Provides camera navigation functionality:
 * - Focus on member: smoothly animate camera to center on a selected node
 * - Fit all: zoom out to show the entire tree
 * - Keyboard navigation: arrow keys to navigate between members
 */

import { useRef, useEffect, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { PositionMap } from './layout'

interface CameraControllerProps {
  /** Map of member IDs to their 3D positions */
  positions: PositionMap
  /** Bounding box of the tree */
  bounds: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    center: { x: number; y: number; z: number }
  }
  /** Currently selected member ID */
  selectedMemberId?: string
  /** Sorted list of member IDs for keyboard navigation */
  memberIds: string[]
  /** Callback when navigating to a different member */
  onNavigate?: (memberId: string) => void
  /** Reference to OrbitControls for target manipulation */
  controlsRef?: React.RefObject<OrbitControlsImpl | null>
  /** Whether keyboard navigation is enabled */
  enableKeyboardNav?: boolean
  /** Callback when camera target changes (for minimap sync) */
  onTargetChange?: (target: { x: number; y: number; z: number }) => void
  /** External navigation request (from minimap) */
  navigateToPosition?: { x: number; y: number; z: number } | null
}

/**
 * Animation state for camera transitions
 */
interface AnimationState {
  active: boolean
  startPosition: THREE.Vector3
  targetPosition: THREE.Vector3
  startTarget: THREE.Vector3
  targetTarget: THREE.Vector3
  progress: number
  duration: number
}

/**
 * Camera controller hook that manages camera animations and keyboard navigation.
 */
export function CameraController({
  positions,
  bounds,
  selectedMemberId,
  memberIds,
  onNavigate,
  controlsRef,
  enableKeyboardNav = true,
  onTargetChange,
  navigateToPosition,
}: CameraControllerProps) {
  const { camera } = useThree()
  const animationRef = useRef<AnimationState>({
    active: false,
    startPosition: new THREE.Vector3(),
    targetPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    targetTarget: new THREE.Vector3(),
    progress: 0,
    duration: 0.8,
  })

  /**
   * Smoothly animate camera to focus on a specific position
   */
  const focusOnPosition = useCallback(
    (targetPos: { x: number; y: number; z: number }) => {
      if (!controlsRef?.current) return

      const controls = controlsRef.current
      const anim = animationRef.current

      // Calculate camera position (offset from target)
      const offset = 5 // Distance from target
      const newCameraPos = new THREE.Vector3(
        targetPos.x,
        targetPos.y + 1,
        targetPos.z + offset
      )
      const newTarget = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z)

      // Set up animation
      anim.startPosition.copy(camera.position)
      anim.targetPosition.copy(newCameraPos)
      anim.startTarget.copy(controls.target)
      anim.targetTarget.copy(newTarget)
      anim.progress = 0
      anim.active = true
    },
    [camera, controlsRef]
  )

  /**
   * Focus camera on the currently selected member
   */
  const focusOnSelected = useCallback(() => {
    if (!selectedMemberId) return

    const pos = positions.get(selectedMemberId)
    if (pos) {
      focusOnPosition(pos)
    }
  }, [selectedMemberId, positions, focusOnPosition])

  /**
   * Zoom camera to fit the entire tree in view
   */
  const fitAll = useCallback(() => {
    if (!controlsRef?.current) return

    const width = bounds.max.x - bounds.min.x
    const height = bounds.max.y - bounds.min.y
    const maxDimension = Math.max(width, height, 5)

    // Calculate camera position to see the whole tree
    const distance = maxDimension * 1.5 + 5
    const newCameraPos = new THREE.Vector3(
      bounds.center.x,
      bounds.center.y + 2,
      bounds.center.z + distance
    )
    const newTarget = new THREE.Vector3(
      bounds.center.x,
      bounds.center.y,
      bounds.center.z
    )

    const anim = animationRef.current
    anim.startPosition.copy(camera.position)
    anim.targetPosition.copy(newCameraPos)
    anim.startTarget.copy(controlsRef.current.target)
    anim.targetTarget.copy(newTarget)
    anim.progress = 0
    anim.active = true
  }, [bounds, camera, controlsRef])

  /**
   * Navigate to adjacent member using keyboard
   */
  const navigateToMember = useCallback(
    (direction: 'next' | 'prev' | 'up' | 'down') => {
      if (!selectedMemberId || memberIds.length === 0) return

      const currentIndex = memberIds.indexOf(selectedMemberId)
      if (currentIndex === -1) return

      let newIndex = currentIndex

      if (direction === 'next') {
        newIndex = (currentIndex + 1) % memberIds.length
      } else if (direction === 'prev') {
        newIndex = (currentIndex - 1 + memberIds.length) % memberIds.length
      } else {
        // For up/down, try to find member at different Y level
        const currentPos = positions.get(selectedMemberId)
        if (!currentPos) return

        let bestId: string | null = null
        let bestDistance = Infinity

        for (const id of memberIds) {
          if (id === selectedMemberId) continue
          const pos = positions.get(id)
          if (!pos) continue

          // Check if in the right direction vertically
          if (direction === 'up' && pos.y <= currentPos.y) continue
          if (direction === 'down' && pos.y >= currentPos.y) continue

          // Calculate horizontal distance (prefer members roughly above/below)
          const xDist = Math.abs(pos.x - currentPos.x)
          const yDist = Math.abs(pos.y - currentPos.y)
          const distance = xDist + yDist * 0.5 // Weight vertical movement less

          if (distance < bestDistance) {
            bestDistance = distance
            bestId = id
          }
        }

        if (bestId) {
          onNavigate?.(bestId)
          const pos = positions.get(bestId)
          if (pos) focusOnPosition(pos)
        }
        return
      }

      const newMemberId = memberIds[newIndex]
      onNavigate?.(newMemberId)

      // Focus on the new member
      const pos = positions.get(newMemberId)
      if (pos) {
        focusOnPosition(pos)
      }
    },
    [selectedMemberId, memberIds, positions, onNavigate, focusOnPosition]
  )

  /**
   * Handle keyboard events for navigation
   */
  useEffect(() => {
    if (!enableKeyboardNav) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          navigateToMember('next')
          break
        case 'ArrowLeft':
          event.preventDefault()
          navigateToMember('prev')
          break
        case 'ArrowUp':
          event.preventDefault()
          navigateToMember('up')
          break
        case 'ArrowDown':
          event.preventDefault()
          navigateToMember('down')
          break
        case 'f':
        case 'F':
          // Focus on selected member
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault()
            focusOnSelected()
          }
          break
        case 'Home':
          event.preventDefault()
          fitAll()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardNav, navigateToMember, focusOnSelected, fitAll])

  // Track previous target position to avoid redundant callbacks
  const prevTargetRef = useRef({ x: 0, y: 0, z: 0 })

  /**
   * Single useFrame hook to handle both animation and target change tracking.
   * Consolidates camera animation and user interaction tracking.
   */
  useFrame((_, delta) => {
    if (!controlsRef?.current) return

    const anim = animationRef.current
    const controls = controlsRef.current

    // Handle animation if active
    if (anim.active) {
      // Update progress
      anim.progress += delta / anim.duration

      if (anim.progress >= 1) {
        // Animation complete
        anim.progress = 1
        anim.active = false
      }

      // Easing function (ease out cubic)
      const t = 1 - Math.pow(1 - anim.progress, 3)

      // Interpolate camera position
      camera.position.lerpVectors(anim.startPosition, anim.targetPosition, t)

      // Interpolate controls target
      controls.target.lerpVectors(anim.startTarget, anim.targetTarget, t)
      controls.update()
    }

    // Report target change only when values actually change
    if (onTargetChange) {
      const currentTarget = controls.target
      const prevTarget = prevTargetRef.current

      // Check if target has changed (with small epsilon for floating point comparison)
      const epsilon = 0.0001
      const hasChanged =
        Math.abs(currentTarget.x - prevTarget.x) > epsilon ||
        Math.abs(currentTarget.y - prevTarget.y) > epsilon ||
        Math.abs(currentTarget.z - prevTarget.z) > epsilon

      if (hasChanged) {
        prevTargetRef.current = {
          x: currentTarget.x,
          y: currentTarget.y,
          z: currentTarget.z,
        }
        onTargetChange({
          x: currentTarget.x,
          y: currentTarget.y,
          z: currentTarget.z,
        })
      }
    }
  })

  // Handle external navigation request (from minimap)
  useEffect(() => {
    if (navigateToPosition) {
      focusOnPosition(navigateToPosition)
    }
  }, [navigateToPosition, focusOnPosition])

  // Auto-focus on selected member when it changes
  useEffect(() => {
    if (selectedMemberId && positions.has(selectedMemberId)) {
      // Small delay to allow layout to settle
      const timer = setTimeout(() => {
        focusOnSelected()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [selectedMemberId, positions, focusOnSelected])

  // Component doesn't render anything - it just controls the camera
  return null
}

/**
 * Hook to get camera control functions
 */
export function useCameraControls(
  controlsRef: React.RefObject<OrbitControlsImpl>,
  bounds: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
    center: { x: number; y: number; z: number }
  }
) {
  const { camera } = useThree()

  const fitAll = useCallback(() => {
    if (!controlsRef.current) return

    const width = bounds.max.x - bounds.min.x
    const height = bounds.max.y - bounds.min.y
    const maxDimension = Math.max(width, height, 5)
    const distance = maxDimension * 1.5 + 5

    camera.position.set(
      bounds.center.x,
      bounds.center.y + 2,
      bounds.center.z + distance
    )
    controlsRef.current.target.set(
      bounds.center.x,
      bounds.center.y,
      bounds.center.z
    )
    controlsRef.current.update()
  }, [bounds, camera, controlsRef])

  return { fitAll }
}
