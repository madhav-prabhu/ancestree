/**
 * Physics and visual constants for the galaxy map visualization.
 * Tuned for a subtle, soothing feel inspired by No Man's Sky's galaxy map.
 */

// ==================
// Physics Constants
// ==================

/** Spring stiffness - higher = faster return to rest position */
export const SPRING_CONSTANT = 0.12

/** Velocity decay per frame - higher = more damping, smoother motion */
export const DAMPING = 0.88

/** Maximum distance a node can be dragged from its rest position */
export const MAX_DISPLACEMENT = 3.5

/** How strongly connected nodes follow a dragged node (0-1) */
export const CONNECTION_PULL_STRENGTH = 0.4

/** Minimum velocity before a node is considered "at rest" */
export const REST_VELOCITY_THRESHOLD = 0.001

/** Physics simulation timestep multiplier */
export const PHYSICS_TIMESTEP = 60

// ==================
// Visual Constants
// ==================

/** Generation-based color palette - cosmic theme */
export const GALAXY_COLORS = [
  '#4da6ff',  // Gen 0: Blue star
  '#9966ff',  // Gen 1: Purple nebula
  '#00cccc',  // Gen 2: Cyan plasma
  '#66ff99',  // Gen 3: Green aurora
  '#ffcc00',  // Gen 4: Gold supernova
  '#ff6666',  // Gen 5+: Red giant
] as const

/** Connection line colors by relationship type */
export const CONNECTION_COLORS = {
  'parent-child': '#4da6ff80',  // Blue, semi-transparent
  'spouse': '#ff69b480',        // Pink, semi-transparent
  'sibling': '#66ff9980',       // Green, semi-transparent
} as const

/** Core orb radius */
export const ORB_RADIUS = 0.35

/** Inner glow layer radius multiplier */
export const INNER_GLOW_SCALE = 1.4

/** Outer glow layer radius multiplier */
export const OUTER_GLOW_SCALE = 1.8

/** Base emissive intensity for orbs (subtle, not bright) */
export const EMISSIVE_INTENSITY = 0.35

/** Point light intensity around each orb */
export const ORB_LIGHT_INTENSITY = 0.25

/** Point light distance */
export const ORB_LIGHT_DISTANCE = 2.5

/** Number of background stars */
export const STAR_COUNT = 600

/** Background star field depth range */
export const STAR_DEPTH_MIN = -60
export const STAR_DEPTH_MAX = -30

/** Background star spread (x/y range) */
export const STAR_SPREAD = 120

/** Connection line base opacity */
export const CONNECTION_OPACITY = 0.35

/** Connection line glow opacity */
export const CONNECTION_GLOW_OPACITY = 0.12

// ==================
// Animation Constants
// ==================

/** Pulse animation speed (radians per second) */
export const PULSE_SPEED = 0.6

/** Pulse intensity range (multiplied by base emissive) */
export const PULSE_AMPLITUDE = 0.15

/** Shimmer animation speed for connections */
export const SHIMMER_SPEED = 1.5

/** Shimmer intensity range */
export const SHIMMER_AMPLITUDE = 0.08
