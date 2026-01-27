/**
 * Timeline Page - Horizontal chronological view of family members.
 *
 * Features:
 * - Horizontal scrollable timeline
 * - Members positioned by birth year
 * - Life span lines (birth to death)
 * - Zoom controls (25% - 300%)
 * - Click member name to navigate to galaxy view
 * - First names only for cleaner display
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useFamilyData } from '../hooks/useFamilyData'
import type { FamilyMember } from '../models/FamilyMember'

/**
 * Extract first name from full name.
 */
function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName
}

/**
 * Parse birth year from ISO date string.
 */
function getBirthYear(member: FamilyMember): number | null {
  if (!member.dateOfBirth) return null
  return new Date(member.dateOfBirth).getFullYear()
}

/**
 * Parse death year from ISO date string.
 */
function getDeathYear(member: FamilyMember): number | null {
  if (!member.dateOfDeath) return null
  return new Date(member.dateOfDeath).getFullYear()
}

/**
 * Timeline member with calculated positions.
 */
interface TimelineMember {
  member: FamilyMember
  birthYear: number
  deathYear: number | null
  row: number
}

/**
 * Calculate year range and member positions.
 */
function calculateTimelineData(members: FamilyMember[]): {
  timelineMembers: TimelineMember[]
  minYear: number
  maxYear: number
} {
  // Filter members with birth dates
  const membersWithDates = members
    .map((member) => ({
      member,
      birthYear: getBirthYear(member),
      deathYear: getDeathYear(member),
    }))
    .filter((m): m is { member: FamilyMember; birthYear: number; deathYear: number | null } =>
      m.birthYear !== null
    )

  if (membersWithDates.length === 0) {
    return { timelineMembers: [], minYear: 1900, maxYear: 2025 }
  }

  // Sort by birth year
  membersWithDates.sort((a, b) => a.birthYear - b.birthYear)

  // Find year range
  const birthYears = membersWithDates.map((m) => m.birthYear)
  const deathYears = membersWithDates
    .map((m) => m.deathYear)
    .filter((y): y is number => y !== null)
  const currentYear = new Date().getFullYear()

  const minYear = Math.min(...birthYears) - 5
  const maxYear = Math.max(...birthYears, ...deathYears, currentYear) + 5

  // Assign rows (simple algorithm to avoid overlap)
  const rowEndYears: number[] = []
  const timelineMembers: TimelineMember[] = membersWithDates.map((m) => {
    const endYear = m.deathYear ?? currentYear
    let row = 0

    // Find first row where this member fits
    for (let i = 0; i < rowEndYears.length; i++) {
      if (m.birthYear > rowEndYears[i] + 2) {
        row = i
        break
      }
      row = i + 1
    }

    rowEndYears[row] = endYear
    return { ...m, row }
  })

  return { timelineMembers, minYear, maxYear }
}

/**
 * Generate year markers with adaptive spacing.
 */
function generateYearMarkers(minYear: number, maxYear: number, zoom: number): number[] {
  let interval: number

  // Adaptive interval based on zoom level and range
  if (zoom >= 200) {
    interval = 5
  } else if (zoom >= 100) {
    interval = 10
  } else if (zoom >= 50) {
    interval = 20
  } else {
    interval = 50
  }

  const markers: number[] = []
  const startYear = Math.ceil(minYear / interval) * interval
  for (let year = startYear; year <= maxYear; year += interval) {
    markers.push(year)
  }

  return markers
}

export function TimelinePage() {
  const navigate = useNavigate()
  const { members, loading, error } = useFamilyData()
  const [zoom, setZoom] = useState(100)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Calculate timeline data
  const { timelineMembers, minYear, maxYear } = useMemo(
    () => calculateTimelineData(members),
    [members]
  )

  // Generate year markers
  const yearMarkers = useMemo(
    () => generateYearMarkers(minYear, maxYear, zoom),
    [minYear, maxYear, zoom]
  )

  // Calculate dimensions
  const yearWidth = 20 * (zoom / 100) // pixels per year
  const rowHeight = 60
  const totalWidth = (maxYear - minYear) * yearWidth
  const totalRows = Math.max(...timelineMembers.map((m) => m.row), 0) + 1
  const totalHeight = totalRows * rowHeight + 100

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 25, 300))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 25, 25))
  }, [])

  // Handle member click - navigate to galaxy view with member selected
  const handleMemberClick = useCallback(
    (memberId: string) => {
      // Navigate to galaxy view - member selection will be handled by URL params in future
      navigate('/', { state: { selectedMemberId: memberId } })
    },
    [navigate]
  )

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Loading timeline...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-red-400 text-xl">Error: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex-shrink-0 bg-slate-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Galaxy View
          </Link>
          <div className="w-px h-6 bg-slate-600" />
          <h1 className="text-xl font-bold">Timeline</h1>
          <span className="text-sm text-slate-400">
            {timelineMembers.length} member{timelineMembers.length !== 1 ? 's' : ''} with dates
          </span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 25}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm text-slate-300 w-16 text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 300}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Timeline content */}
      <main className="flex-1 overflow-auto" ref={scrollContainerRef}>
        {timelineMembers.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white/70">
              <p className="text-lg">No family members with birth dates.</p>
              <p className="text-sm mt-2">
                Add birth dates to your family members to see them on the timeline.
              </p>
              <Link
                to="/"
                className="inline-block mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Go to Galaxy View
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="relative"
            style={{
              width: Math.max(totalWidth + 200, scrollContainerRef.current?.clientWidth || 800),
              height: Math.max(totalHeight, scrollContainerRef.current?.clientHeight || 400),
              minWidth: '100%',
            }}
          >
            {/* Year markers */}
            <div className="sticky top-0 z-10 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700">
              <div className="relative h-10" style={{ width: totalWidth + 200 }}>
                {yearMarkers.map((year) => {
                  const x = (year - minYear) * yearWidth + 100
                  return (
                    <div
                      key={year}
                      className="absolute top-0 h-full flex flex-col items-center justify-end pb-2"
                      style={{ left: x }}
                    >
                      <span className="text-xs text-slate-400">{year}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Grid lines */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: totalWidth + 200, height: totalHeight }}
            >
              {yearMarkers.map((year) => {
                const x = (year - minYear) * yearWidth + 100
                return (
                  <line
                    key={year}
                    x1={x}
                    y1={40}
                    x2={x}
                    y2={totalHeight}
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                )
              })}
            </svg>

            {/* Timeline entries */}
            <div className="relative pt-12" style={{ width: totalWidth + 200, height: totalHeight }}>
              {timelineMembers.map(({ member, birthYear, deathYear, row }) => {
                const startX = (birthYear - minYear) * yearWidth + 100
                const currentYear = new Date().getFullYear()
                const endYear = deathYear ?? currentYear
                const lineWidth = (endYear - birthYear) * yearWidth
                const y = row * rowHeight + 20

                return (
                  <div key={member.id} className="absolute" style={{ left: startX, top: y }}>
                    {/* Life span line */}
                    <div
                      className={`absolute top-3 h-1 rounded-full ${
                        deathYear ? 'bg-slate-500' : 'bg-emerald-500/50'
                      }`}
                      style={{ width: Math.max(lineWidth, 2) }}
                    />

                    {/* Birth marker */}
                    <div
                      className="absolute -left-1.5 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900"
                      title={`Born: ${birthYear}`}
                    />

                    {/* Death marker */}
                    {deathYear && (
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-slate-900"
                        style={{ left: lineWidth - 6 }}
                        title={`Died: ${deathYear}`}
                      />
                    )}

                    {/* Name label */}
                    <button
                      onClick={() => handleMemberClick(member.id)}
                      className="absolute -top-1 left-6 text-sm text-white hover:text-emerald-400 transition-colors whitespace-nowrap"
                      title={`${member.name} (${birthYear}${deathYear ? `-${deathYear}` : ' - present'})`}
                    >
                      {getFirstName(member.name)}
                    </button>

                    {/* Year labels */}
                    <span className="absolute top-5 -left-1 text-xs text-slate-500">
                      {birthYear}
                    </span>
                    {deathYear && (
                      <span
                        className="absolute top-5 text-xs text-slate-500"
                        style={{ left: lineWidth - 10 }}
                      >
                        {deathYear}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="fixed bottom-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Birth</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Death</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 rounded-full bg-emerald-500/50" />
                  <span>Living</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 rounded-full bg-slate-500" />
                  <span>Deceased</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
