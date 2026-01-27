import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import path from 'path'
import { registerFileHandlers } from './ipc/fileHandlers'
import { createApplicationMenu } from './menu'
import { registerAutoSaveHandlers, startAutoSave, stopAutoSave } from './services/autoSave'
import { loadWindowState, trackWindowState, getMinimumDimensions } from './services/windowState'
import { createTray, destroyTray, setCurrentFilename, updateTrayMenu } from './tray'

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null

// Window state tracking cleanup function
let cleanupWindowState: (() => void) | null = null

// Module-level state for dirty tracking
let isDirty = false
let currentFilePath: string | null = null

/**
 * Single instance lock to prevent multiple instances
 * Multiple instances can cause IndexedDB locking issues
 */
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit()
} else {
  // Focus existing window when second instance is attempted
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })
}

/**
 * Create the main browser window with secure settings
 */
function createWindow(): void {
  // Load persisted window bounds or calculate defaults
  const bounds = loadWindowState()
  const { minWidth, minHeight } = getMinimumDimensions()

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth,
    minHeight,
    show: false, // Show when ready to prevent visual flash
    webPreferences: {
      // Preload script path (relative to compiled main process)
      preload: path.join(__dirname, '../preload/index.cjs'),

      // SECURITY: Isolate preload script from renderer context
      contextIsolation: true,

      // SECURITY: Disable Node.js integration in renderer
      nodeIntegration: false,

      // SECURITY: Enable OS-level sandboxing
      sandbox: true,

      // SECURITY: Enforce same-origin policy
      webSecurity: true,

      // SECURITY: Block insecure content
      allowRunningInsecureContent: false
    }
  })

  // Start tracking window state changes
  cleanupWindowState = trackWindowState(mainWindow)

  // Show window when ready to prevent visual flash
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    if (cleanupWindowState) {
      cleanupWindowState()
      cleanupWindowState = null
    }
    destroyTray()
    mainWindow = null
  })

  /**
   * External link handling (FILE-03 requirement)
   * Intercept new window requests and open external URLs in system browser
   */
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open HTTP/HTTPS URLs in system browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    // Deny all in-app window creation
    return { action: 'deny' }
  })

  /**
   * Intercept navigation to external URLs
   * Prevent navigating away from the app to external sites
   */
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentURL = mainWindow?.webContents.getURL() || ''

    // Allow navigation within the app (same origin or file://)
    if (
      url.startsWith('file://') ||
      (process.env.ELECTRON_RENDERER_URL && url.startsWith(process.env.ELECTRON_RENDERER_URL))
    ) {
      return // Allow internal navigation
    }

    // Block external navigation and open in system browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  /**
   * Load the renderer
   * - Development: Load from Vite dev server (HMR enabled)
   * - Production: Load from built files
   */
  if (process.env.ELECTRON_RENDERER_URL) {
    // Development: Vite dev server URL provided by electron-vite
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    // Production: Load from packaged files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Setup dirty state tracking and close confirmation
 * Must be called after mainWindow is created
 */
function setupDirtyStateHandling(): void {
  // Register IPC handlers for dirty state
  ipcMain.handle('document:setDirty', (_event, dirty: boolean, filePath: string | null) => {
    isDirty = dirty
    currentFilePath = filePath

    if (mainWindow) {
      // macOS: dot in close button when document is edited
      mainWindow.setDocumentEdited(dirty)

      // Update window title with dirty indicator
      const baseName = filePath
        ? path.basename(filePath)
        : 'Untitled'
      // macOS uses the close button dot, so no asterisk needed
      // Windows/Linux show asterisk in title
      const indicator = process.platform === 'darwin' ? '' : (dirty ? ' *' : '')
      mainWindow.setTitle(`${baseName}${indicator} - Ancestree`)

      // Update tray menu with current filename
      setCurrentFilename(filePath ? path.basename(filePath) : null)
      updateTrayMenu(mainWindow)
    }

    return true
  })

  ipcMain.handle('document:getDirty', () => isDirty)

  // Handle window close with unsaved changes confirmation
  mainWindow!.on('close', async (event) => {
    if (!isDirty) return // Allow close if no unsaved changes

    event.preventDefault()

    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'question',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Unsaved Changes',
      message: 'Do you want to save changes?',
      detail: 'Your changes will be lost if you close without saving.'
    })

    if (result.response === 0) {
      // Save - send to renderer, renderer will save then close
      mainWindow!.webContents.send('menu:save')
      // After save completes, renderer should call window.close() again
      // Note: renderer needs to set isDirty=false after successful save
    } else if (result.response === 1) {
      // Don't Save - force close by clearing dirty flag first
      isDirty = false
      mainWindow!.close()
    }
    // Cancel (response === 2): do nothing, keep window open
  })
}

/**
 * App lifecycle event handlers
 */

// Create window when Electron is ready
app.whenReady().then(() => {
  // Register IPC handlers before creating windows
  registerFileHandlers()
  registerAutoSaveHandlers()

  createWindow()

  // Setup dirty state tracking and close confirmation
  setupDirtyStateHandling()

  // Start auto-save timer after window creation
  startAutoSave()

  // Set up application menu (after window exists)
  if (mainWindow) {
    createApplicationMenu(mainWindow)
  }

  // Create system tray
  if (mainWindow) {
    createTray(mainWindow)
  }

  // macOS: Re-create window when dock icon clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up auto-save timer and tray before quitting
app.on('before-quit', () => {
  stopAutoSave()
  destroyTray()
})
