/**
 * Tree Layout Algorithm for Family Tree Visualization
 *
 * Positions family members in 3D space based on their relationships:
 * - Y-axis: Generation level (parents above children)
 * - X-axis: Horizontal spread for siblings and families
 * - Z-axis: Depth for visual separation
 *
 * Features:
 * - Handles complex trees (remarriage, multiple spouses)
 * - Minimizes line crossings
 * - Groups spouses together
 * - Centers children under their parents
 */

import type { FamilyMember, Relationship } from '../../models'

/**
 * Position in 3D space
 */
export interface NodePosition {
  x: number
  y: number
  z: number
}

/**
 * Map of member IDs to their positions
 */
export type PositionMap = Map<string, NodePosition>

/**
 * Layout configuration options
 */
export interface LayoutConfig {
  /** Horizontal spacing between siblings */
  horizontalSpacing: number
  /** Vertical spacing between generations */
  verticalSpacing: number
  /** Spacing between spouses */
  spouseSpacing: number
  /** Depth offset for visual layering */
  depthOffset: number
}

/**
 * Default layout configuration
 */
export const DEFAULT_CONFIG: LayoutConfig = {
  horizontalSpacing: 2.5,
  verticalSpacing: 3,
  spouseSpacing: 1.5,
  depthOffset: 0,
}

/**
 * Build relationship lookup maps for fast access
 */
function buildRelationshipMaps(relationships: Relationship[]) {
  const parentToChildren = new Map<string, Set<string>>()
  const childToParents = new Map<string, Set<string>>()
  const spouses = new Map<string, Set<string>>()
  const siblings = new Map<string, Set<string>>()

  for (const rel of relationships) {
    if (rel.type === 'parent-child') {
      // person1 is parent, person2 is child
      if (!parentToChildren.has(rel.person1Id)) {
        parentToChildren.set(rel.person1Id, new Set())
      }
      parentToChildren.get(rel.person1Id)!.add(rel.person2Id)

      if (!childToParents.has(rel.person2Id)) {
        childToParents.set(rel.person2Id, new Set())
      }
      childToParents.get(rel.person2Id)!.add(rel.person1Id)
    } else if (rel.type === 'spouse') {
      if (!spouses.has(rel.person1Id)) {
        spouses.set(rel.person1Id, new Set())
      }
      spouses.get(rel.person1Id)!.add(rel.person2Id)

      if (!spouses.has(rel.person2Id)) {
        spouses.set(rel.person2Id, new Set())
      }
      spouses.get(rel.person2Id)!.add(rel.person1Id)
    } else if (rel.type === 'sibling') {
      if (!siblings.has(rel.person1Id)) {
        siblings.set(rel.person1Id, new Set())
      }
      siblings.get(rel.person1Id)!.add(rel.person2Id)

      if (!siblings.has(rel.person2Id)) {
        siblings.set(rel.person2Id, new Set())
      }
      siblings.get(rel.person2Id)!.add(rel.person1Id)
    }
  }

  return { parentToChildren, childToParents, spouses, siblings }
}

/**
 * Find root members (those with no parents or the earliest generation)
 */
function findRootMembers(
  members: FamilyMember[],
  childToParents: Map<string, Set<string>>
): FamilyMember[] {
  // Members with no parents are roots
  const roots = members.filter((m) => {
    const parents = childToParents.get(m.id)
    return !parents || parents.size === 0
  })

  // If no roots found (circular?), just return the first member
  if (roots.length === 0 && members.length > 0) {
    return [members[0]]
  }

  return roots
}

/**
 * Calculate generation (depth) for each member using BFS from roots
 * with spouse unification to ensure married couples are always in the same generation.
 */
function calculateGenerations(
  members: FamilyMember[],
  parentToChildren: Map<string, Set<string>>,
  childToParents: Map<string, Set<string>>,
  spouses: Map<string, Set<string>>
): Map<string, number> {
  const generations = new Map<string, number>()
  const memberSet = new Set(members.map((m) => m.id))

  // Find true roots: members with no parents AND whose spouse (if any) also has no parents
  // This prevents treating someone as gen 0 when their spouse is gen 1+
  const allRoots = findRootMembers(members, childToParents)
  const trueRoots = allRoots.filter((root) => {
    const rootSpouses = spouses.get(root.id)
    if (!rootSpouses) return true

    // Check if any spouse has parents (meaning root should inherit spouse's generation)
    for (const spouseId of rootSpouses) {
      const spouseParents = childToParents.get(spouseId)
      if (spouseParents && spouseParents.size > 0) {
        return false // This root's spouse has parents, so root is not a true root
      }
    }
    return true
  })

  // Use true roots if available, otherwise fall back to all roots
  const roots = trueRoots.length > 0 ? trueRoots : allRoots

  // BFS to assign initial generations
  const queue: { id: string; gen: number }[] = []
  const visited = new Set<string>()

  // Start with roots at generation 0
  for (const root of roots) {
    queue.push({ id: root.id, gen: 0 })
  }

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!

    if (visited.has(id)) {
      // Update if we found a longer path (higher generation)
      const currentGen = generations.get(id) ?? 0
      if (gen > currentGen) {
        generations.set(id, gen)
      }
      continue
    }

    visited.add(id)
    generations.set(id, gen)

    // Process spouses at same generation
    const memberSpouses = spouses.get(id)
    if (memberSpouses) {
      for (const spouseId of memberSpouses) {
        if (!visited.has(spouseId) && memberSet.has(spouseId)) {
          queue.push({ id: spouseId, gen })
        }
      }
    }

    // Process children at next generation
    const children = parentToChildren.get(id)
    if (children) {
      for (const childId of children) {
        if (memberSet.has(childId)) {
          queue.push({ id: childId, gen: gen + 1 })
        }
      }
    }
  }

  // Handle any unvisited members (disconnected nodes)
  for (const member of members) {
    if (!generations.has(member.id)) {
      generations.set(member.id, 0)
    }
  }

  // Second pass: Unify spouse generations and propagate changes
  // This fixes edge cases where spouses ended up in different generations
  let changed = true
  let iterations = 0
  const maxIterations = members.length + 1 // Prevent infinite loops

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    // Unify spouse generations (take the higher one)
    for (const member of members) {
      const memberGen = generations.get(member.id) ?? 0
      const memberSpouses = spouses.get(member.id)

      if (memberSpouses) {
        for (const spouseId of memberSpouses) {
          const spouseGen = generations.get(spouseId) ?? 0
          if (spouseGen > memberGen) {
            generations.set(member.id, spouseGen)
            changed = true
          }
        }
      }
    }

    // Propagate to children: child gen should be max(parent gens) + 1
    for (const member of members) {
      const parents = childToParents.get(member.id)
      if (parents && parents.size > 0) {
        let maxParentGen = 0
        for (const parentId of parents) {
          const parentGen = generations.get(parentId) ?? 0
          maxParentGen = Math.max(maxParentGen, parentGen)
        }
        const expectedGen = maxParentGen + 1
        const currentGen = generations.get(member.id) ?? 0
        if (expectedGen > currentGen) {
          generations.set(member.id, expectedGen)
          changed = true
        }
      }
    }
  }

  return generations
}

/**
 * Main layout calculation function
 *
 * @param members - Array of family members
 * @param relationships - Array of relationships between members
 * @param config - Layout configuration options
 * @returns Map of member IDs to their 3D positions
 */
export function calculateTreeLayout(
  members: FamilyMember[],
  relationships: Relationship[],
  config: LayoutConfig = DEFAULT_CONFIG
): PositionMap {
  const positions: PositionMap = new Map()

  if (members.length === 0) {
    return positions
  }

  // Build relationship maps
  const { parentToChildren, childToParents, spouses } =
    buildRelationshipMaps(relationships)

  // Calculate generations
  const generations = calculateGenerations(
    members,
    parentToChildren,
    childToParents,
    spouses
  )

  // Group members by generation
  const generationGroups = new Map<number, FamilyMember[]>()
  for (const member of members) {
    const gen = generations.get(member.id) ?? 0
    if (!generationGroups.has(gen)) {
      generationGroups.set(gen, [])
    }
    generationGroups.get(gen)!.push(member)
  }

  // Track which members have been positioned
  const positioned = new Set<string>()

  // Position each generation
  const sortedGens = Array.from(generationGroups.keys()).sort((a, b) => a - b)

  for (const gen of sortedGens) {
    const genMembers = generationGroups.get(gen)!
    const y = -gen * config.verticalSpacing // Negative so roots are at top

    // Group spouses together
    const spouseGroups: FamilyMember[][] = []
    const processedInGen = new Set<string>()

    for (const member of genMembers) {
      if (processedInGen.has(member.id)) continue

      const group: FamilyMember[] = [member]
      processedInGen.add(member.id)

      // Add spouses to the same group
      const memberSpouses = spouses.get(member.id)
      if (memberSpouses) {
        for (const spouseId of memberSpouses) {
          const spouseMember = genMembers.find((m) => m.id === spouseId)
          if (spouseMember && !processedInGen.has(spouseId)) {
            group.push(spouseMember)
            processedInGen.add(spouseId)
          }
        }
      }

      spouseGroups.push(group)
    }

    // Sort spouse groups: try to position under parents
    spouseGroups.sort((a, b) => {
      // Get parent positions for first member of each group
      const aParents = childToParents.get(a[0].id)
      const bParents = childToParents.get(b[0].id)

      let aParentX = 0
      let bParentX = 0

      if (aParents) {
        for (const pId of aParents) {
          const pPos = positions.get(pId)
          if (pPos) aParentX = pPos.x
        }
      }

      if (bParents) {
        for (const pId of bParents) {
          const pPos = positions.get(pId)
          if (pPos) bParentX = pPos.x
        }
      }

      return aParentX - bParentX
    })

    // Calculate total width needed for this generation
    let totalWidth = 0
    const groupWidths: number[] = []

    for (const group of spouseGroups) {
      // Width for the spouse group itself
      let groupWidth = (group.length - 1) * config.spouseSpacing + config.horizontalSpacing

      // Also consider children width
      let childrenWidth = 0
      for (const member of group) {
        const children = parentToChildren.get(member.id)
        if (children) {
          childrenWidth += children.size * config.horizontalSpacing
        }
      }

      groupWidth = Math.max(groupWidth, childrenWidth)
      groupWidths.push(groupWidth)
      totalWidth += groupWidth
    }

    // Position each spouse group
    let currentX = -totalWidth / 2

    for (let i = 0; i < spouseGroups.length; i++) {
      const group = spouseGroups[i]
      const groupWidth = groupWidths[i]
      const groupCenterX = currentX + groupWidth / 2

      // Try to center under parents if positioned
      let targetX = groupCenterX
      const firstMemberParents = childToParents.get(group[0].id)
      if (firstMemberParents && firstMemberParents.size > 0) {
        let parentSumX = 0
        let parentCount = 0
        for (const pId of firstMemberParents) {
          const pPos = positions.get(pId)
          if (pPos) {
            parentSumX += pPos.x
            parentCount++
          }
        }
        if (parentCount > 0) {
          targetX = parentSumX / parentCount
        }
      }

      // Position each member in the spouse group
      const spouseGroupWidth = (group.length - 1) * config.spouseSpacing
      let memberX = targetX - spouseGroupWidth / 2

      for (const member of group) {
        if (!positioned.has(member.id)) {
          positions.set(member.id, {
            x: memberX,
            y,
            z: config.depthOffset,
          })
          positioned.add(member.id)
        }
        memberX += config.spouseSpacing
      }

      currentX += groupWidth
    }
  }

  // Final pass: adjust any overlapping nodes
  resolveOverlaps(positions, config)

  return positions
}

/**
 * Resolve overlapping nodes by spreading them apart
 */
function resolveOverlaps(positions: PositionMap, config: LayoutConfig): void {
  const minDistance = config.horizontalSpacing * 0.8

  // Group by Y position (generation)
  const byY = new Map<number, string[]>()
  for (const [id, pos] of positions) {
    const y = Math.round(pos.y * 100) / 100
    if (!byY.has(y)) {
      byY.set(y, [])
    }
    byY.get(y)!.push(id)
  }

  // For each generation, resolve overlaps
  for (const [, ids] of byY) {
    if (ids.length < 2) continue

    // Sort by x position
    ids.sort((a, b) => {
      const posA = positions.get(a)!
      const posB = positions.get(b)!
      return posA.x - posB.x
    })

    // Check for overlaps and spread apart
    for (let i = 1; i < ids.length; i++) {
      const prevPos = positions.get(ids[i - 1])!
      const currPos = positions.get(ids[i])!

      const gap = currPos.x - prevPos.x
      if (gap < minDistance) {
        // Push current node right
        currPos.x = prevPos.x + minDistance
      }
    }
  }
}

/**
 * Get the generation level for a member (0 = root)
 */
export function getGeneration(
  memberId: string,
  members: FamilyMember[],
  relationships: Relationship[]
): number {
  const { parentToChildren, childToParents, spouses } =
    buildRelationshipMaps(relationships)

  const generations = calculateGenerations(
    members,
    parentToChildren,
    childToParents,
    spouses
  )

  return generations.get(memberId) ?? 0
}

/**
 * Get the maximum generation in the tree
 */
export function getMaxGeneration(
  members: FamilyMember[],
  relationships: Relationship[]
): number {
  const { parentToChildren, childToParents, spouses } =
    buildRelationshipMaps(relationships)

  const generations = calculateGenerations(
    members,
    parentToChildren,
    childToParents,
    spouses
  )

  let max = 0
  for (const gen of generations.values()) {
    if (gen > max) max = gen
  }

  return max
}

/**
 * Calculate the bounding box of all positions
 */
export function getBoundingBox(positions: PositionMap): {
  min: NodePosition
  max: NodePosition
  center: NodePosition
} {
  if (positions.size === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      center: { x: 0, y: 0, z: 0 },
    }
  }

  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity

  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    minZ = Math.min(minZ, pos.z)
    maxX = Math.max(maxX, pos.x)
    maxY = Math.max(maxY, pos.y)
    maxZ = Math.max(maxZ, pos.z)
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2,
    },
  }
}

/**
 * Calculate generation map for all members
 * Returns a Map of member ID to generation number (0 = root/oldest)
 */
export function calculateGenerationMap(
  members: FamilyMember[],
  relationships: Relationship[]
): Map<string, number> {
  const { parentToChildren, childToParents, spouses } =
    buildRelationshipMaps(relationships)

  return calculateGenerations(
    members,
    parentToChildren,
    childToParents,
    spouses
  )
}
