import { describe, it, expect } from 'vitest'
import { createFamilyMember } from './FamilyMember'

describe('FamilyMember', () => {
  it('should create a family member with generated id and timestamps', () => {
    const member = createFamilyMember({
      name: 'John Doe',
      dateOfBirth: '1990-05-15',
      placeOfBirth: 'New York',
    })

    expect(member.id).toBeDefined()
    expect(member.id.length).toBeGreaterThan(0)
    expect(member.name).toBe('John Doe')
    expect(member.dateOfBirth).toBe('1990-05-15')
    expect(member.placeOfBirth).toBe('New York')
    expect(member.createdAt).toBeDefined()
    expect(member.updatedAt).toBeDefined()
  })

  it('should allow optional fields to be undefined', () => {
    const member = createFamilyMember({
      name: 'Jane Doe',
    })

    expect(member.name).toBe('Jane Doe')
    expect(member.dateOfBirth).toBeUndefined()
    expect(member.dateOfDeath).toBeUndefined()
    expect(member.notes).toBeUndefined()
  })
})
