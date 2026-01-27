/**
 * System tray module for Ancestree
 *
 * Provides tray icon with context menu showing current file,
 * window controls, and quit action.
 *
 * Platform-specific behavior:
 * - macOS: Click shows context menu (default behavior)
 * - Windows/Linux: Click toggles window visibility
 */
import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'

// Module-level tray reference to prevent garbage collection
let tray: Tray | null = null

// Current filename for display in menu
let currentFilename: string | null = null

/**
 * Get the platform-specific icon path
 * Icons are in build/icons/tray/ relative to project root
 * In compiled output, __dirname is out/main/, so ../../build/ reaches root
 */
function getIconPath(): string {
  if (process.platform === 'darwin') {
    // macOS: Template images auto-invert for dark mode
    return path.join(__dirname, '../../build/icons/tray/iconTemplate.png')
  } else if (process.platform === 'win32') {
    // Windows: ICO with multiple resolutions
    return path.join(__dirname, '../../build/icons/tray/icon.ico')
  } else {
    // Linux: 22x22 PNG (standard for GNOME/Unity)
    return path.join(__dirname, '../../build/icons/tray/icon.png')
  }
}

/**
 * Build the tray context menu
 * Linux requires rebuilding the entire menu for any changes
 */
function buildContextMenu(mainWindow: BrowserWindow): Menu {
  const menuItems: Electron.MenuItemConstructorOptions[] = []

  // Show current file in menu header (if set)
  if (currentFilename) {
    menuItems.push(
      { label: currentFilename, enabled: false },
      { type: 'separator' }
    )
  }

  // Show Window action
  menuItems.push({
    label: 'Show Window',
    click: () => {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Separator before Quit
  menuItems.push({ type: 'separator' })

  // Quit action
  menuItems.push({
    label: 'Quit',
    click: () => {
      app.quit()
    }
  })

  return Menu.buildFromTemplate(menuItems)
}

/**
 * Create the system tray icon
 * Call after main window is created
 */
export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = getIconPath()
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon)
  tray.setToolTip('Ancestree')
  tray.setContextMenu(buildContextMenu(mainWindow))

  // Platform-specific click behavior (per CONTEXT.md decision)
  if (process.platform !== 'darwin') {
    // Windows/Linux: Click toggles window visibility
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  }
  // macOS: Click shows context menu (default behavior, no handler needed)
}

/**
 * Update the tray context menu
 * Must rebuild entire menu for Linux compatibility
 * Call after setCurrentFilename to reflect changes
 */
export function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (tray) {
    tray.setContextMenu(buildContextMenu(mainWindow))
  }
}

/**
 * Set the current filename to display in tray menu
 * Call updateTrayMenu after to reflect change
 */
export function setCurrentFilename(filename: string | null): void {
  currentFilename = filename
}

/**
 * Destroy the tray icon
 * Call on app quit or window close
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
