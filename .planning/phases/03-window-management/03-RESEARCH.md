# Phase 3: Window Management - Research

**Researched:** 2026-01-27
**Domain:** Electron BrowserWindow state persistence, platform-native window controls
**Confidence:** HIGH

## Summary

Phase 3 implements window state persistence for Ancestree, ensuring the app window appears at the same size and position after restart. The research confirms that Electron's BrowserWindow API provides all necessary methods for getting/setting window bounds (`getBounds()`, `setBounds()`), and the `resize`/`move` events enable tracking state changes. The project already uses electron-store for auto-save drafts, making it the natural choice for window state persistence per the user's decision.

The key technical challenges are: (1) validating saved positions against current display configuration (a monitor may have been disconnected), (2) debouncing save operations to avoid excessive writes during drag/resize, and (3) handling corrupted state files gracefully. Electron's `screen` module provides `getAllDisplays()` for multi-monitor validation.

The user explicitly decided against persisting fullscreen/maximized state (always open windowed), display ID (use absolute coordinates), and zoom level (always 100%). This simplifies implementation to storing only x, y, width, height.

**Primary recommendation:** Implement a WindowStateManager service using electron-store that saves window bounds on debounced resize/move events (500ms), validates positions against available displays on restore, and falls back to centered defaults when state is invalid or corrupted.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron (BrowserWindow) | 40.0.0 | Window creation, bounds management | Built-in, getBounds/setBounds APIs |
| electron (screen) | 40.0.0 | Display detection, bounds validation | Built-in, getAllDisplays for multi-monitor |
| electron-store | 11.0.2 | State persistence | Already used for auto-save, atomic writes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | Custom debounce is trivial (5 lines) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-store | electron-window-state | Feature overlap with auto-save, adds dependency |
| Custom validation | electron-window-state | Would auto-restore maximized state (against user decision) |
| Custom debounce | lodash.debounce | Overkill for single use case |

**Installation:**
```bash
# No new dependencies - electron-store already installed
```

## Architecture Patterns

### Recommended Project Structure
```
electron/
├── main/
│   ├── index.ts              # Window creation (modify)
│   ├── services/
│   │   ├── autoSave.ts       # Existing auto-save
│   │   └── windowState.ts    # NEW: Window state persistence
```

### Pattern 1: Window State Store Schema

**What:** Typed store for window bounds with defaults
**When to use:** Initializing the window state service

```typescript
// electron/main/services/windowState.ts
// Source: https://github.com/sindresorhus/electron-store
import Store from 'electron-store'
import { screen } from 'electron'

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface WindowStateSchema {
  bounds: WindowBounds | null
}

// Default size: 80% of primary display work area
function getDefaultBounds(): WindowBounds {
  const { workArea } = screen.getPrimaryDisplay()
  const width = Math.round(workArea.width * 0.8)
  const height = Math.round(workArea.height * 0.8)
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height
  }
}

const windowStateStore = new Store<WindowStateSchema>({
  name: 'ancestree-window-state',
  defaults: { bounds: null }
})
```

### Pattern 2: Position Validation Against Displays

**What:** Check if saved position is visible on any connected display
**When to use:** Before restoring saved window position

```typescript
// electron/main/services/windowState.ts
// Source: https://dev.to/craftzdog/how-to-check-if-a-browser-window-is-inside-of-screens-on-electron-1eme
import { screen } from 'electron'

function isPositionVisible(x: number, y: number): boolean {
  const displays = screen.getAllDisplays()
  return displays.some(display => {
    const { x: areaX, y: areaY, width, height } = display.workArea
    return (
      x >= areaX &&
      y >= areaY &&
      x < areaX + width &&
      y < areaY + height
    )
  })
}

function validateBounds(bounds: WindowBounds, minWidth: number, minHeight: number): WindowBounds | null {
  // Validate dimensions
  if (bounds.width < minWidth || bounds.height < minHeight) {
    return null // Invalid dimensions
  }

  // Check if position is on any visible display
  if (!isPositionVisible(bounds.x, bounds.y)) {
    return null // Off-screen, use defaults
  }

  return bounds
}
```

### Pattern 3: Debounced State Save

**What:** Save window bounds after resize/move settles
**When to use:** Event handlers for window resize and move events

```typescript
// electron/main/services/windowState.ts
// Source: Electron RFC 0016 recommends batched writes

let saveTimeout: NodeJS.Timeout | null = null
const SAVE_DEBOUNCE_MS = 500

function debouncedSave(bounds: WindowBounds): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    windowStateStore.set('bounds', bounds)
    if (!app.isPackaged) {
      console.log('[WindowState] Saved bounds:', bounds)
    }
    saveTimeout = null
  }, SAVE_DEBOUNCE_MS)
}
```

### Pattern 4: Window State Manager Integration

**What:** Complete service exposing load/track/cleanup methods
**When to use:** Main process window creation

```typescript
// electron/main/services/windowState.ts
import { BrowserWindow, app, screen } from 'electron'
import Store from 'electron-store'

const MIN_WIDTH = 400
const MIN_HEIGHT = 300

export function loadWindowState(): WindowBounds {
  try {
    const saved = windowStateStore.get('bounds')
    if (saved) {
      const validated = validateBounds(saved, MIN_WIDTH, MIN_HEIGHT)
      if (validated) {
        return validated
      }
      // Invalid state, log and fallback
      if (!app.isPackaged) {
        console.warn('[WindowState] Invalid saved bounds, using defaults')
      }
    }
  } catch (error) {
    // Corrupted store, log and continue with defaults
    if (!app.isPackaged) {
      console.error('[WindowState] Failed to load state:', error)
    }
  }
  return getDefaultBounds()
}

export function trackWindowState(window: BrowserWindow): () => void {
  const handleBoundsChange = (): void => {
    if (!window.isMaximized() && !window.isFullScreen()) {
      debouncedSave(window.getBounds())
    }
  }

  window.on('resize', handleBoundsChange)
  window.on('move', handleBoundsChange)

  // Return cleanup function
  return (): void => {
    window.removeListener('resize', handleBoundsChange)
    window.removeListener('move', handleBoundsChange)
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
  }
}
```

### Pattern 5: BrowserWindow Creation with State

**What:** Use loaded state for initial window dimensions
**When to use:** createWindow function in main process

```typescript
// electron/main/index.ts (modification)
import { loadWindowState, trackWindowState } from './services/windowState'

function createWindow(): void {
  const bounds = loadWindowState()

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 400,
    minHeight: 300,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Start tracking state changes
  const cleanup = trackWindowState(mainWindow)

  mainWindow.on('closed', () => {
    cleanup()
    mainWindow = null
  })

  // ... rest of window setup
}
```

### Anti-Patterns to Avoid

- **Saving on every resize/move event:** Causes excessive disk writes during drag operations. Always debounce (500ms recommended).
- **Persisting maximized/fullscreen state when user decided against it:** The user explicitly requested always opening windowed.
- **Storing display ID:** Display IDs are not persistent across reboots. Use absolute screen coordinates.
- **Trusting saved state without validation:** Monitors disconnect. Always validate position against current displays.
- **Sync file operations:** electron-store handles this, but custom implementations should never block the main process.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic file writes | Manual temp file + rename | electron-store | Handles crash-safe writes automatically |
| Display bounds detection | Manual coordinate math | screen.getAllDisplays() | Handles DPI scaling, multiple displays |
| Default window centering | Manual calculation | screen.getPrimaryDisplay().workArea | Accounts for taskbars, docks |

**Key insight:** electron-store provides crash-safe atomic writes that won't corrupt data even if the app crashes mid-write. The Electron screen module handles platform differences in display coordinates and DPI scaling automatically.

## Common Pitfalls

### Pitfall 1: Window Opens Off-Screen

**What goes wrong:** App opens with window invisible (user thinks it crashed)
**Why it happens:** Saved position was on a monitor that's no longer connected
**How to avoid:** Validate position against `screen.getAllDisplays()` before restoring
**Warning signs:** Users report "app won't open" when they disconnected secondary monitor

### Pitfall 2: Excessive Disk Writes During Resize

**What goes wrong:** App feels sluggish during window resize, disk thrashing
**Why it happens:** Saving state on every resize event (can fire 60+ times/second)
**How to avoid:** Debounce save operations with 500ms delay
**Warning signs:** High CPU during resize, slow SSD writes visible in system monitor

### Pitfall 3: Maximized State Saved as Normal Bounds

**What goes wrong:** After maximizing and closing, window opens filling entire screen but not actually maximized
**Why it happens:** Saving bounds while window is maximized captures full-screen dimensions
**How to avoid:** Check `window.isMaximized()` before saving; skip save when maximized
**Warning signs:** Window opens at screen-filling size but can't be "restored" (already in normal mode)

### Pitfall 4: Corrupted State File Crashes App

**What goes wrong:** App fails to start after state file corrupted (power loss, disk error)
**Why it happens:** JSON.parse throws, uncaught exception crashes main process
**How to avoid:** Wrap state loading in try/catch, fallback to defaults silently
**Warning signs:** Works until one day it doesn't; hard to reproduce

### Pitfall 5: Initial Position Undefined

**What goes wrong:** Window opens at (0, 0) or system default instead of centered
**Why it happens:** electron-store returns `null` on first run, passed directly to BrowserWindow
**How to avoid:** Always have fallback defaults; calculate centered position from workArea
**Warning signs:** First launch looks different from subsequent launches

### Pitfall 6: Minimum Size Not Enforced

**What goes wrong:** User resizes window too small, UI becomes unusable
**Why it happens:** Only setting minWidth/minHeight in state, not in BrowserWindow options
**How to avoid:** Set `minWidth` and `minHeight` in BrowserWindow constructor options
**Warning signs:** Users can drag window to 50x50 pixels

## Code Examples

Verified patterns from official sources:

### Complete WindowState Service

```typescript
// electron/main/services/windowState.ts
// Source: Electron BrowserWindow API + screen API + electron-store
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
```

### Modified Main Process Window Creation

```typescript
// electron/main/index.ts (relevant section)
// Source: Electron BrowserWindow docs
import { loadWindowState, trackWindowState, getMinimumDimensions } from './services/windowState'

function createWindow(): void {
  const bounds = loadWindowState()
  const { minWidth, minHeight } = getMinimumDimensions()

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth,
    minHeight,
    // No maxWidth/maxHeight per user decision
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // Start tracking window state
  const cleanupWindowState = trackWindowState(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    cleanupWindowState()
    mainWindow = null
  })

  // ... rest of existing window setup
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| electron-window-state library | electron-store custom | Project decision | Aligns with existing auto-save pattern |
| Sync save on close | Debounced save on change | Best practice | Prevents data loss on crash |
| Store display ID | Absolute coordinates + validation | Multi-monitor standard | Works when displays change |
| Custom file I/O | electron-store atomic writes | electron-store adoption | Crash-safe persistence |

**Deprecated/outdated:**
- `remote` module for screen access: Removed in Electron 28, use `screen` in main process
- Synchronous file writes: Block main process, risk corruption

**Upcoming:**
- Electron RFC 0016 proposes built-in `windowStatePersistence` option (GSoC 2025 project)
- When available, could simplify implementation, but current custom approach gives required control

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal default window size percentage**
   - What we know: 80% is common in desktop apps, looks good on most displays
   - What's unclear: Whether 3D visualization has specific aspect ratio preferences
   - Recommendation: Start with 80%, adjust based on testing

2. **High-DPI display coordinate handling**
   - What we know: Electron's screen API returns DIP (device-independent pixels), BrowserWindow uses same
   - What's unclear: Whether there are edge cases with mixed-DPI multi-monitor setups
   - Recommendation: Test on mixed-DPI setup; the isPositionVisible check should handle this

3. **Window position on Linux with tiling window managers**
   - What we know: Some WMs (i3, sway) ignore position hints
   - What's unclear: Whether saved bounds even matter in tiling context
   - Recommendation: Accept WM override; tiling users expect this behavior

## Sources

### Primary (HIGH confidence)
- [Electron BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window) - getBounds, setBounds, resize/move events
- [Electron screen API](https://www.electronjs.org/docs/latest/api/screen) - getAllDisplays, getPrimaryDisplay
- [electron-store GitHub](https://github.com/sindresorhus/electron-store) - atomic writes, TypeScript support

### Secondary (MEDIUM confidence)
- [Electron RFC 0016: Save/Restore Window State](https://github.com/electron/rfcs/blob/main/text/0016-save-restore-window-state.md) - Design patterns for window state
- [electron-window-state GitHub](https://github.com/mawie81/electron-window-state) - Reference implementation patterns
- [DEV.to: Check if window is inside screens](https://dev.to/craftzdog/how-to-check-if-a-browser-window-is-inside-of-screens-on-electron-1eme) - Position validation pattern

### Tertiary (LOW confidence)
- WebSearch results on Electron multi-monitor issues - Community patterns, not officially verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses already-installed electron-store, built-in Electron APIs
- Architecture: HIGH - Patterns from official Electron docs and established libraries
- Pitfalls: HIGH - Documented in Electron issues and community articles, verified against API docs
- Off-screen handling: MEDIUM - Based on community pattern, not official Electron recommendation

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable Electron APIs, established patterns)
