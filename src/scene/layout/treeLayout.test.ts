import { describe, it, expect } from 'vitest'
import {
  calculateTreeLayout,
  getGeneration,
  getMaxGeneration,
  getBoundingBox,
  DEFAULT_CONFIG,
} from './treeLayout'
import type { FamilyMember, Relationship } from '../../models'

// Helper to create test members
function createMember(id: string, name: string): FamilyMember {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Helper to create relationships
function createRelationship(
  id: string,
  type: 'parent-child' | 'spouse' | 'sibling',
  person1Id: string,
  person2Id: string
): Relationship {
  return {
    id,
    type,
    person1Id,
    person2Id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('calculateTreeLayout', () => {
  it('returns empty map for empty members', () => {
    const positions = calculateTreeLayout([], [])
    expect(positions.size).toBe(0)
  })

  it('positions single member at origin', () => {
    const members = [createMember('1', 'John')]
    const positions = calculateTreeLayout(members, [])

    expect(positions.size).toBe(1)
    expect(positions.has('1')).toBe(true)

    const pos = positions.get('1')!
    expect(pos.y).toBeCloseTo(0, 5) // Single member at generation 0
  })

  it('positions parent above child', () => {
    const members = [
      createMember('parent', 'Parent'),
      createMember('child', 'Child'),
    ]
    const relationships = [
      createRelationship('r1', 'parent-child', 'parent', 'child'),
    ]

    const positions = calculateTreeLayout(members, relationships)

    const parentPos = positions.get('parent')!
    const childPos = positions.get('child')!

    // Parent should be higher (less negative Y) than child
    expect(parentPos.y).toBeGreaterThan(childPos.y)
  })

  it('positions spouses side by side at same Y level', () => {
    const members = [
      createMember('spouse1', 'Spouse 1'),
      createMember('spouse2', 'Spouse 2'),
    ]
    const relationships = [
      createRelationship('r1', 'spouse', 'spouse1', 'spouse2'),
    ]

    const positions = calculateTreeLayout(members, relationships)

    const pos1 = positions.get('spouse1')!
    const pos2 = positions.get('spouse2')!

    // Spouses should be at same Y level
    expect(pos1.y).toBe(pos2.y)
    // Spouses should be at different X positions
    expect(pos1.x).not.toBe(pos2.x)
  })

  it('positions siblings at same generation level', () => {
    const members = [
      createMember('parent', 'Parent'),
      createMember('child1', 'Child 1'),
      createMember('child2', 'Child 2'),
    ]
    const relationships = [
      createRelationship('r1', 'parent-child', 'parent', 'child1'),
      createRelationship('r2', 'parent-child', 'parent', 'child2'),
    ]

    const positions = calculateTreeLayout(members, relationships)

    const child1Pos = positions.get('child1')!
    const child2Pos = positions.get('child2')!

    // Siblings should be at same Y level
    expect(child1Pos.y).toBe(child2Pos.y)
    // Siblings should be spread horizontally
    expect(child1Pos.x).not.toBe(child2Pos.x)
  })

  it('handles three generation tree', () => {
    const members = [
      createMember('grandparent', 'Grandparent'),
      createMember('parent', 'Parent'),
      createMember('child', 'Child'),
    ]
    const relationships = [
      createRelationship('r1', 'parent-child', 'grandparent', 'parent'),
      createRelationship('r2', 'parent-child', 'parent', 'child'),
    ]

    const positions = calculateTreeLayout(members, relationships)

    const gpPos = positions.get('grandparent')!
    const pPos = positions.get('parent')!
    const cPos = positions.get('child')!

    // Each generation should be at different Y levels
    expect(gpPos.y).toBeGreaterThan(pPos.y)
    expect(pPos.y).toBeGreaterThan(cPos.y)
  })

  it('handles complex family with remarriage', () => {
    const members = [
      createMember('p1', 'Parent 1'),
      createMember('p2', 'Parent 2 (ex)'),
      createMember('p3', 'Parent 3 (current)'),
      createMember('c1', 'Child from first marriage'),
      createMember('c2', 'Child from second marriage'),
    ]
    const relationships = [
      // First marriage with child
      createRelationship('r1', 'spouse', 'p1', 'p2'),
      createRelationship('r2', 'parent-child', 'p1', 'c1'),
      createRelationship('r3', 'parent-child', 'p2', 'c1'),
      // Second marriage with child
      createRelationship('r4', 'spouse', 'p1', 'p3'),
      createRelationship('r5', 'parent-child', 'p1', 'c2'),
      createRelationship('r6', 'parent-child', 'p3', 'c2'),
    ]

    const positions = calculateTreeLayout(members, relationships)

    // All parents should be at same generation
    const p1Pos = positions.get('p1')!
    const p2Pos = positions.get('p2')!
    const p3Pos = positions.get('p3')!

    expect(p1Pos.y).toBe(p2Pos.y)
    expect(p2Pos.y).toBe(p3Pos.y)

    // All children should be at same generation (below parents)
    const c1Pos = positions.get('c1')!
    const c2Pos = positions.get('c2')!

    expect(c1Pos.y).toBe(c2Pos.y)
    expect(c1Pos.y).toBeLessThan(p1Pos.y)
  })

  it('applies custom config spacing', () => {
    const members = [
      createMember('parent', 'Parent'),
      createMember('child', 'Child'),
    ]
    const relationships = [
      createRelationship('r1', 'parent-child', 'parent', 'child'),
    ]

    const customConfig = {
      ...DEFAULT_CONFIG,
      verticalSpacing: 5,
    }

    const positions = calculateTreeLayout(members, relationships, customConfig)

    const parentPos = positions.get('parent')!
    const childPos = positions.get('child')!

    // Vertical spacing should match config
    expect(parentPos.y - childPos.y).toBe(5)
  })

  it('handles disconnected members', () => {
    const members = [
      createMember('a', 'Person A'),
      createMember('b', 'Person B'),
      createMember('c', 'Person C'),
    ]
    // No relationships - all disconnected

    const positions = calculateTreeLayout(members, [])

    // All members should have positions
    expect(positions.size).toBe(3)
    expect(positions.has('a')).toBe(true)
    expect(positions.has('b')).toBe(true)
    expect(positions.has('c')).toBe(true)

    // All at same generation level (roots)
    const posA = positions.get('a')!
    const posB = positions.get('b')!
    const posC = positions.get('c')!

    expect(posA.y).toBe(posB.y)
    expect(posB.y).toBe(posC.y)
  })
})

describe('getGeneration', () => {
  it('returns 0 for root member', () => {
    const members = [createMember('1', 'Root')]
    const gen = getGeneration('1', members, [])
    expect(gen).toBe(0)
  })

  it('returns correct generation for child', () => {
    const members = [
      createMember('parent', 'Parent'),
      createMember('child', 'Child'),
    ]
    const relationships = [
      createRelationship('r1', 'parent-child', 'parent', 'child'),
    ]

    expect(getGeneration('parent', members, relationships)).toBe(0)
    expect(getGeneration('child', members, relationships)).toBe(1)
  })

  it('returns correct generation for grandchild', () => {
    const members = [
      createMember('gp', 'Grandparent'),
      createMember('p', 'Parent'),
      createMember('c', 'Child'),
    ]
    const relationships = [
      createRelationship('r1', 'parent-child', 'gp', 'p'),
      createRelationship('r2', 'parent-child', 'p', 'c'),
    ]

    expect(getGeneration('gp', members, relationships)).toBe(0)
    expect(getGeneration('p', members, relationships)).toBe(1)
    expect(getGeneration('c', members, relationships)).toBe(2)
  })

  it('returns 0 for unknown member', () => {
    const members = [createMember('1', 'Known')]
    const gen = getGeneration('unknown', members, [])
    expect(gen).toBe(0)
  })
})

describe('getMaxGeneration', () => {
  it('returns 0 for single member', () => {
    const members = [createMember('1', 'Single')]
    const max = getMaxGeneration(members, [])
    expect(max).toBe(0)
  })

  it('returns correct max for linear family', () => {
    const members = [
      createMember('1', 'Gen 0'),
      createMember('2', 'Gen 1'),
      createMember('3', 'Gen 2'),
    ]
    const relationships = [
      createRelationship('r1', 'parent-child', '1', '2'),
      createRelationship('r2', 'parent-child', '2', '3'),
    ]

    const max = getMaxGeneration(members, relationships)
    expect(max).toBe(2)
  })

  it('returns 0 for empty members', () => {
    const max = getMaxGeneration([], [])
    expect(max).toBe(0)
  })
})

describe('getBoundingBox', () => {
  it('returns zero box for empty positions', () => {
    const positions = new Map()
    const box = getBoundingBox(positions)

    expect(box.min).toEqual({ x: 0, y: 0, z: 0 })
    expect(box.max).toEqual({ x: 0, y: 0, z: 0 })
    expect(box.center).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('returns correct bounds for single position', () => {
    const positions = new Map([['1', { x: 5, y: 3, z: 1 }]])
    const box = getBoundingBox(positions)

    expect(box.min).toEqual({ x: 5, y: 3, z: 1 })
    expect(box.max).toEqual({ x: 5, y: 3, z: 1 })
    expect(box.center).toEqual({ x: 5, y: 3, z: 1 })
  })

  it('returns correct bounds for multiple positions', () => {
    const positions = new Map([
      ['1', { x: -2, y: 0, z: 0 }],
      ['2', { x: 4, y: -6, z: 2 }],
      ['3', { x: 0, y: 3, z: -1 }],
    ])
    const box = getBoundingBox(positions)

    expect(box.min).toEqual({ x: -2, y: -6, z: -1 })
    expect(box.max).toEqual({ x: 4, y: 3, z: 2 })
    expect(box.center).toEqual({ x: 1, y: -1.5, z: 0.5 })
  })
})
