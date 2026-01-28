import type { FamilyMember, Relationship } from '../models'

/**
 * Convert Ancestree data to GEDCOM 7.0 format
 * https://gedcom.io/specifications/FamilySearchGEDCOMv7.pdf
 */
export function exportToGedcom(
  members: FamilyMember[],
  relationships: Relationship[]
): string {
  const lines: string[] = []

  // Header
  lines.push('0 HEAD')
  lines.push('1 SOUR ANCESTREE')
  lines.push('2 VERS 1.0')
  lines.push('2 NAME Ancestree')
  lines.push('1 GEDC')
  lines.push('2 VERS 7.0')
  lines.push('1 CHAR UTF-8')
  lines.push(`1 DATE ${formatGedcomDate(new Date())}`)

  // Map member IDs to GEDCOM IDs
  const memberIdMap = new Map<string, string>()
  members.forEach((member, index) => {
    memberIdMap.set(member.id, `@I${index + 1}@`)
  })

  // Individual records
  members.forEach((member, index) => {
    const gedcomId = `@I${index + 1}@`
    lines.push(`0 ${gedcomId} INDI`)

    // Name - split into given name and surname
    const nameParts = member.name.trim().split(' ')
    const surname = nameParts.length > 1 ? nameParts.pop()! : ''
    const givenName = nameParts.join(' ')
    lines.push(`1 NAME ${givenName} /${surname}/`)
    if (givenName) lines.push(`2 GIVN ${givenName}`)
    if (surname) lines.push(`2 SURN ${surname}`)

    // Birth
    if (member.dateOfBirth || member.placeOfBirth) {
      lines.push('1 BIRT')
      if (member.dateOfBirth) {
        lines.push(`2 DATE ${formatGedcomDateFromISO(member.dateOfBirth)}`)
      }
      if (member.placeOfBirth) {
        lines.push(`2 PLAC ${member.placeOfBirth}`)
      }
    }

    // Death
    if (member.dateOfDeath) {
      lines.push('1 DEAT')
      lines.push(`2 DATE ${formatGedcomDateFromISO(member.dateOfDeath)}`)
    }

    // Notes
    if (member.notes) {
      // Split long notes into continuation lines
      const noteLines = splitLongText(member.notes, 248)
      lines.push(`1 NOTE ${noteLines[0]}`)
      for (let i = 1; i < noteLines.length; i++) {
        lines.push(`2 CONT ${noteLines[i]}`)
      }
    }
  })

  // Family records (for spouse relationships)
  const spouseRelationships = relationships.filter(r => r.type === 'spouse')
  spouseRelationships.forEach((rel, index) => {
    const famId = `@F${index + 1}@`
    const person1Id = memberIdMap.get(rel.person1Id)
    const person2Id = memberIdMap.get(rel.person2Id)

    if (person1Id && person2Id) {
      lines.push(`0 ${famId} FAM`)
      lines.push(`1 HUSB ${person1Id}`)
      lines.push(`1 WIFE ${person2Id}`)

      // Marriage date
      if (rel.marriageDate) {
        lines.push('1 MARR')
        lines.push(`2 DATE ${formatGedcomDateFromISO(rel.marriageDate)}`)
      }

      // Find children of this couple
      const parentChildRels = relationships.filter(r =>
        r.type === 'parent-child' &&
        (r.person1Id === rel.person1Id || r.person1Id === rel.person2Id)
      )

      // Group children by checking if both parents are in this couple
      const childIds = new Set<string>()
      parentChildRels.forEach(pcr => {
        // Check if the other parent is also in this couple
        const otherParentRels = relationships.filter(r =>
          r.type === 'parent-child' &&
          r.person2Id === pcr.person2Id &&
          r.person1Id !== pcr.person1Id
        )
        const otherParentInCouple = otherParentRels.some(r =>
          r.person1Id === rel.person1Id || r.person1Id === rel.person2Id
        )

        if (otherParentInCouple || otherParentRels.length === 0) {
          childIds.add(pcr.person2Id)
        }
      })

      childIds.forEach(childId => {
        const childGedcomId = memberIdMap.get(childId)
        if (childGedcomId) {
          lines.push(`1 CHIL ${childGedcomId}`)
        }
      })
    }
  })

  // Trailer
  lines.push('0 TRLR')

  return lines.join('\n')
}

function formatGedcomDate(date: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function formatGedcomDateFromISO(isoDate: string): string {
  // Handle YYYY-MM-DD format
  const parts = isoDate.split('-')
  if (parts.length === 3) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    const day = parseInt(parts[2], 10)
    const month = months[parseInt(parts[1], 10) - 1]
    const year = parts[0]
    return `${day} ${month} ${year}`
  }
  // Fallback: try to parse as Date
  const date = new Date(isoDate)
  if (!isNaN(date.getTime())) {
    return formatGedcomDate(date)
  }
  // Return as-is if can't parse
  return isoDate
}

function splitLongText(text: string, maxLength: number): string[] {
  const result: string[] = []
  let remaining = text

  while (remaining.length > maxLength) {
    // Find last space within limit
    let splitIndex = remaining.lastIndexOf(' ', maxLength)
    if (splitIndex === -1) splitIndex = maxLength

    result.push(remaining.substring(0, splitIndex))
    remaining = remaining.substring(splitIndex).trim()
  }

  if (remaining) result.push(remaining)
  return result
}
