/**
 * Type definitions for the galaxy visualization physics system.
 */

import type { Vector3 } from 'three'

/**
 * Physics state for a single node.
 * Tracks position, velocity, and interaction state.
 */
export interface PhysicsNode {
  /** Unique identifier (matches FamilyMember.id) */
  id: string

  /** Current position in 3D space */
  position: Vector3

  /** Current velocity vector */
  velocity: Vector3

  /** Rest position from layout algorithm */
  restPosition: Vector3

  /** Whether this node is currently being dragged */
  isDragging: boolean
}

/**
 * Connection between two nodes for physics simulation.
 * Used to calculate pull forces when one node is dragged.
 */
export interface PhysicsConnection {
  /** Source node ID */
  fromId: string

  /** Target node ID */
  toId: string

  /** Rest length between nodes (calculated from initial layout) */
  restLength: number
}

/**
 * Complete physics state for the entire graph.
 */
export interface PhysicsState {
  /** All nodes indexed by ID */
  nodes: Map<string, PhysicsNode>

  /** All connections between nodes */
  connections: PhysicsConnection[]

  /** ID of the currently dragged node, or null */
  draggedNodeId: string | null

  /** Whether any node has significant velocity (for optimization) */
  isSimulating: boolean
}

/**
 * Position data from the layout algorithm.
 */
export interface LayoutPosition {
  x: number
  y: number
  z: number
}

/**
 * Props for the PhysicsContext provider.
 */
export interface PhysicsProviderProps {
  /** Layout-calculated positions for all members */
  positions: Map<string, LayoutPosition>

  /** Relationships for connection physics */
  relationships: Array<{
    id: string
    type: string
    person1Id: string
    person2Id: string
  }>

  /** React children */
  children: React.ReactNode
}

/**
 * Value provided by PhysicsContext.
 */
export interface PhysicsContextValue {
  /** Get current position for a node (for rendering) */
  getPosition: (nodeId: string) => Vector3 | null

  /** Start dragging a node */
  startDrag: (nodeId: string) => void

  /** Update dragged node position */
  updateDrag: (nodeId: string, position: Vector3) => void

  /** End dragging (node will spring back) */
  endDrag: (nodeId: string) => void

  /** Check if a node is being dragged */
  isDragging: (nodeId: string) => boolean

  /** Get all connection endpoints for rendering lines */
  getConnections: () => Array<{
    id: string
    type: string
    start: Vector3
    end: Vector3
  }>
}
