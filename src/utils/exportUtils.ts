/**
 * Export utilities for Ancestree.
 * Provides functions to export family tree data as JSON.
 */

import type { FamilyMember } from '../models/FamilyMember'
import type { Relationship } from '../models/Relationship'

/**
 * Export data format for Ancestree.
 */
export interface AncestreeExport {
  version: string
  exportedAt: string
  members: FamilyMember[]
  relationships: Relationship[]
}

/**
 * Formats a date for use in filenames (YYYY-MM-DD).
 */
function getFormattedDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Exports family tree data as a JSON file download.
 *
 * @param members - Array of family members to export
 * @param relationships - Array of relationships to export
 */
export function exportToJson(
  members: FamilyMember[],
  relationships: Relationship[]
): void {
  const exportData: AncestreeExport = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    members,
    relationships,
  }

  const jsonString = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const filename = `ancestree-export-${getFormattedDate()}.json`

  // Create a temporary anchor element to trigger download
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
