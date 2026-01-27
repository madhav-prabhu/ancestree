import { app, BrowserWindow, shell } from 'electron'
import path from 'path'

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null

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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Show when ready to prevent visual flash
    webPreferences: {
      // Preload script path (relative to compiled main process)
      preload: path.join(__dirname, '../preload/index.mjs'),

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

  // Show window when ready to prevent visual flash
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
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
 * App lifecycle event handlers
 */

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow()

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
