import { ipcMain } from 'electron'
import { checkForUpdates, downloadUpdate } from '../updater'

/**
 * Register IPC handlers for auto-update operations
 * Called during app initialization in main/index.ts
 *
 * These handlers don't return values - the updater sends events
 * back to the renderer via webContents.send()
 */
export function registerUpdateHandlers(): void {
  // Manual update check (from renderer or tray menu)
  ipcMain.handle('update:check', () => {
    checkForUpdates()
  })

  // User-initiated download (after seeing update available)
  ipcMain.handle('update:download', () => {
    downloadUpdate()
  })
}
