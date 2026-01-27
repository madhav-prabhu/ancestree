import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow, Notification, app } from 'electron'

// Module-level state for window reference
let mainWindow: BrowserWindow | null = null

/**
 * Initialize the auto-updater with configuration and event handlers
 *
 * Configuration follows CONTEXT.md requirements:
 * - autoDownload: false - User must click "Download" to start download
 * - autoInstallOnAppQuit: true - Install silently when app quits
 */
export function initAutoUpdater(win: BrowserWindow): void {
  mainWindow = win

  // Configure updater behavior
  autoUpdater.autoDownload = false // User-controlled downloads
  autoUpdater.autoInstallOnAppQuit = true // Install on quit

  // Event: Update available
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    // Show OS-native notification (non-blocking per CONTEXT.md)
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Update Available',
        body: `Ancestree ${info.version} is available.`,
        silent: false
      })
      notification.on('click', () => {
        mainWindow?.show()
        mainWindow?.focus()
      })
      notification.show()
    }

    // Send to renderer for in-app UI
    mainWindow?.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  // Event: No update available
  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update:notAvailable')
  })

  // Event: Download progress
  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    // Send progress to renderer
    mainWindow?.webContents.send('update:progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    })

    // Show taskbar progress (platform-dependent, gracefully handled)
    mainWindow?.setProgressBar(progress.percent / 100)
  })

  // Event: Update downloaded and ready
  autoUpdater.on('update-downloaded', () => {
    // Clear taskbar progress
    mainWindow?.setProgressBar(-1)

    // Send to renderer
    mainWindow?.webContents.send('update:downloaded')

    // Show notification that update is ready
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Update Ready',
        body: 'The update will be installed when you quit Ancestree.',
        silent: false
      })
      notification.show()
    }
  })

  // Event: Error during update process
  autoUpdater.on('error', (error: Error) => {
    // Send error to renderer
    mainWindow?.webContents.send('update:error', error.message)

    // Clear taskbar progress on error
    mainWindow?.setProgressBar(-1)
  })
}

/**
 * Check for available updates
 *
 * Guarded to only run in packaged app - electron-updater
 * cannot check updates in development mode (no update server)
 */
export function checkForUpdates(): void {
  // Skip in development mode (see RESEARCH.md pitfall)
  if (!app.isPackaged) {
    return
  }

  autoUpdater.checkForUpdates()
}

/**
 * Start downloading the available update
 *
 * Called by renderer when user clicks "Download" button
 */
export function downloadUpdate(): void {
  autoUpdater.downloadUpdate()
}
