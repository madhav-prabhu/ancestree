/**
 * Main application layout with header, sidebar, main content area, and detail panel.
 *
 * Features:
 * - Header with title and add button
 * - Collapsible sidebar on left
 * - 3D scene in center
 * - Detail panel on right (when member selected)
 * - Responsive design
 */

import { type ReactNode } from 'react'

interface LayoutProps {
  /** Header content */
  header: ReactNode
  /** Left sidebar content */
  sidebar?: ReactNode
  /** Whether sidebar is collapsed */
  sidebarCollapsed?: boolean
  /** Main content area (typically 3D scene) */
  children: ReactNode
  /** Right side panel content (typically detail panel) */
  detailPanel?: ReactNode
}

export function Layout({
  header,
  sidebar,
  sidebarCollapsed = false,
  children,
  detailPanel,
}: LayoutProps) {
  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex-shrink-0">{header}</header>

      {/* Main content area with sidebar and panels */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        {sidebar && (
          <aside
            className={`flex-shrink-0 transition-all duration-300 ${
              sidebarCollapsed ? 'w-12' : 'w-72'
            }`}
          >
            {sidebar}
          </aside>
        )}

        {/* Center content (3D scene) */}
        <div className="flex-1 relative overflow-hidden">{children}</div>

        {/* Right detail panel */}
        {detailPanel && (
          <aside className="flex-shrink-0 w-80 lg:w-96 transition-all duration-300">
            {detailPanel}
          </aside>
        )}
      </main>
    </div>
  )
}

/**
 * Header component for the application.
 */
interface HeaderProps {
  /** Number of family members */
  memberCount: number
  /** Callback when add member button is clicked */
  onAddMember: () => void
  /** Callback when clear all button is clicked */
  onClearAll: () => void
}

export function Header({ memberCount, onAddMember, onClearAll }: HeaderProps) {
  return (
    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Ancestree</h1>
        <span className="text-sm text-slate-400">
          {memberCount} member{memberCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClearAll}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors text-sm"
        >
          Clear All
        </button>
        <button
          onClick={onAddMember}
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors"
        >
          + Add Member
        </button>
      </div>
    </div>
  )
}

/**
 * Data persistence indicator component.
 */
export function SaveIndicator() {
  return (
    <div className="absolute top-4 right-4 bg-emerald-600/90 text-white text-xs px-3 py-1 rounded-full">
      Data saved locally
    </div>
  )
}

/**
 * Empty state component shown when no family members exist.
 */
export function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center text-white/70">
        <p className="text-lg">No family members yet.</p>
        <p className="text-sm">Click "Add Member" to get started!</p>
      </div>
    </div>
  )
}
