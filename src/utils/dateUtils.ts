/**
 * Date formatting utilities for the Ancestree application.
 *
 * Display format: dd/mm/yyyy (European)
 * Storage format: ISO YYYY-MM-DD (unchanged)
 */

/**
 * Format a date string to European format (dd/mm/yyyy).
 *
 * Uses UTC to avoid timezone shifting issues with ISO date strings.
 *
 * @param isoDate - ISO date string (YYYY-MM-DD) or Date-parseable string
 * @returns Formatted date string like "15/01/1990" or "Unknown" if invalid
 */
export function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return 'Unknown'
  try {
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return isoDate
    const day = date.getUTCDate().toString().padStart(2, '0')
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return isoDate
  }
}

/**
 * Format a date/time string to European format with time (dd/mm/yyyy, HH:mm).
 *
 * Uses local time for timestamps (createdAt, updatedAt) since those include time.
 *
 * @param isoDate - ISO date/time string or Date-parseable string
 * @returns Formatted date/time string like "15/01/1990, 14:30" or the original string if invalid
 */
export function formatDateTime(isoDate: string | undefined): string {
  if (!isoDate) return 'Unknown'
  try {
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return isoDate
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${minutes}`
  } catch {
    return isoDate
  }
}

/**
 * Convert ISO date (YYYY-MM-DD) to display format (dd/mm/yyyy) for form inputs.
 *
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns Display format string (dd/mm/yyyy) or empty string if invalid
 */
export function isoToDisplay(isoDate: string | undefined): string {
  if (!isoDate) return ''
  // Simple string manipulation to avoid timezone issues
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return isoDate
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/**
 * Convert display format (dd/mm/yyyy) to ISO date (YYYY-MM-DD) for storage.
 *
 * @param displayDate - Display format string (dd/mm/yyyy)
 * @returns ISO date string (YYYY-MM-DD) or empty string if invalid
 */
export function displayToIso(displayDate: string | undefined): string {
  if (!displayDate) return ''
  const match = displayDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return displayDate
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

/**
 * Validate that a string is a valid dd/mm/yyyy date.
 *
 * @param displayDate - Display format string to validate
 * @returns true if valid date in dd/mm/yyyy format
 */
export function isValidDisplayDate(displayDate: string): boolean {
  if (!displayDate) return true // Empty is valid (optional field)
  const match = displayDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return false
  const [, day, month, year] = match
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  // Basic validation
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  if (y < 1000 || y > 9999) return false
  // Check the date is real
  const date = new Date(`${year}-${month}-${day}`)
  return !isNaN(date.getTime())
}
