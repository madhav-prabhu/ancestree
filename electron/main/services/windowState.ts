import { BrowserWindow, app, screen } from 'electron'
import Store from 'electron-store'

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface WindowStateSchema {
  bounds: WindowBounds | null
}

// Constants
const MIN_WIDTH = 400
const MIN_HEIGHT = 300
const DEFAULT_SIZE_PERCENT = 0.8
const SAVE_DEBOUNCE_MS = 500

// Store instance
const windowStateStore = new Store<WindowStateSchema>({
  name: 'ancestree-window-state',
  defaults: { bounds: null }
})

// Debounce timer
let saveTimeout: NodeJS.Timeout | null = null

/**
 * Calculate default window bounds centered on primary display
 */
function getDefaultBounds(): WindowBounds {
  const { workArea } = screen.getPrimaryDisplay()
  const width = Math.round(workArea.width * DEFAULT_SIZE_PERCENT)
  const height = Math.round(workArea.height * DEFAULT_SIZE_PERCENT)
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height
  }
}

/**
 * Check if a point is visible on any connected display
 */
function isPositionVisible(x: number, y: number): boolean {
  const displays = screen.getAllDisplays()
  return displays.some(display => {
    const area = display.workArea
    return (
      x >= area.x &&
      y >= area.y &&
      x < area.x + area.width &&
      y < area.y + area.height
    )
  })
}

/**
 * Validate saved bounds against current display configuration
 */
function validateBounds(bounds: WindowBounds): WindowBounds | null {
  // Check minimum dimensions
  if (bounds.width < MIN_WIDTH || bounds.height < MIN_HEIGHT) {
    return null
  }

  // Check position is on a visible display
  if (!isPositionVisible(bounds.x, bounds.y)) {
    return null
  }

  return bounds
}

/**
 * Save bounds with debouncing to avoid excessive writes
 */
function debouncedSave(bounds: WindowBounds): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    windowStateStore.set('bounds', bounds)
    if (!app.isPackaged) {
      console.log('[WindowState] Saved bounds:', JSON.stringify(bounds))
    }
    saveTimeout = null
  }, SAVE_DEBOUNCE_MS)
}

/**
 * Load window state from storage with validation and fallback
 */
export function loadWindowState(): WindowBounds {
  try {
    const saved = windowStateStore.get('bounds')
    if (saved) {
      const validated = validateBounds(saved)
      if (validated) {
        return validated
      }
      if (!app.isPackaged) {
        console.warn('[WindowState] Saved bounds invalid, using defaults')
      }
    }
  } catch (error) {
    if (!app.isPackaged) {
      console.error('[WindowState] Failed to load:', error)
    }
  }
  return getDefaultBounds()
}

/**
 * Track window state changes and persist on resize/move
 * Returns cleanup function to remove listeners
 */
export function trackWindowState(window: BrowserWindow): () => void {
  const handleBoundsChange = (): void => {
    // Don't save while maximized or fullscreen (user decided against persisting these)
    if (!window.isMaximized() && !window.isFullScreen()) {
      debouncedSave(window.getBounds())
    }
  }

  window.on('resize', handleBoundsChange)
  window.on('move', handleBoundsChange)

  return (): void => {
    window.removeListener('resize', handleBoundsChange)
    window.removeListener('move', handleBoundsChange)
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
  }
}

/**
 * Get minimum dimensions for BrowserWindow options
 */
export function getMinimumDimensions(): { minWidth: number; minHeight: number } {
  return { minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT }
}
