/**
 * Hook for handling node drag interactions in the galaxy visualization.
 * Uses raycasting to project mouse movement onto a plane perpendicular to the camera.
 */

import { useRef, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3, Plane, Raycaster, Vector2 } from 'three'
import { usePhysics } from './PhysicsContext'

interface UseNodeDragOptions {
  /** Node ID for this draggable element */
  nodeId: string
  /** Optional callback when drag starts */
  onDragStart?: () => void
  /** Optional callback when drag ends */
  onDragEnd?: () => void
}

interface UseNodeDragResult {
  /** Pointer down handler - attach to mesh */
  onPointerDown: (event: { stopPropagation: () => void; pointerId: number }) => void
  /** Pointer move handler - attach to mesh or use on document */
  onPointerMove: (event: { clientX: number; clientY: number }) => void
  /** Pointer up handler - attach to mesh or use on document */
  onPointerUp: (event: { pointerId: number }) => void
  /** Whether this node is currently being dragged */
  isDragging: boolean
}

/**
 * Hook for making a galaxy node draggable with physics integration.
 *
 * Usage:
 * ```tsx
 * const { onPointerDown, isDragging } = useNodeDrag({ nodeId: member.id })
 * return <mesh onPointerDown={onPointerDown}>...</mesh>
 * ```
 */
export function useNodeDrag({
  nodeId,
  onDragStart,
  onDragEnd,
}: UseNodeDragOptions): UseNodeDragResult {
  const { camera, gl } = useThree()
  const physics = usePhysics()

  // Refs for drag state (avoid recreating every render)
  const dragPlaneRef = useRef(new Plane())
  const raycasterRef = useRef(new Raycaster())
  const pointerRef = useRef(new Vector2())
  const intersectionRef = useRef(new Vector3())
  const isDraggingRef = useRef(false)

  /**
   * Convert screen coordinates to normalized device coordinates.
   */
  const updatePointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect()
      pointerRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
      pointerRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1
    },
    [gl.domElement]
  )

  /**
   * Handle pointer down - start dragging.
   */
  const onPointerDown = useCallback(
    (event: { stopPropagation: () => void; pointerId: number }) => {
      event.stopPropagation()

      // Capture pointer for reliable tracking
      gl.domElement.setPointerCapture(event.pointerId)

      // Get current node position
      const position = physics.getPosition(nodeId)
      if (!position) return

      // Set up drag plane perpendicular to camera view direction
      const cameraDirection = new Vector3()
      camera.getWorldDirection(cameraDirection)
      dragPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDirection, position)

      // Start physics drag
      physics.startDrag(nodeId)
      isDraggingRef.current = true

      onDragStart?.()
    },
    [camera, gl.domElement, nodeId, physics, onDragStart]
  )

  /**
   * Handle pointer move - update drag position.
   */
  const onPointerMove = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (!isDraggingRef.current) return

      // Update pointer position
      updatePointer(event.clientX, event.clientY)

      // Raycast from camera through pointer
      raycasterRef.current.setFromCamera(pointerRef.current, camera)

      // Find intersection with drag plane
      const intersected = raycasterRef.current.ray.intersectPlane(
        dragPlaneRef.current,
        intersectionRef.current
      )

      if (intersected) {
        physics.updateDrag(nodeId, intersectionRef.current)
      }
    },
    [camera, nodeId, physics, updatePointer]
  )

  /**
   * Handle pointer up - end dragging.
   */
  const onPointerUp = useCallback(
    (event: { pointerId: number }) => {
      if (!isDraggingRef.current) return

      // Release pointer capture
      try {
        gl.domElement.releasePointerCapture(event.pointerId)
      } catch {
        // Pointer may have already been released
      }

      // End physics drag - node will spring back
      physics.endDrag(nodeId)
      isDraggingRef.current = false

      onDragEnd?.()
    },
    [gl.domElement, nodeId, physics, onDragEnd]
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isDragging: physics.isDragging(nodeId),
  }
}
