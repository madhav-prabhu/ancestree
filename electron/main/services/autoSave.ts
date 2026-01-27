import Store from 'electron-store'
import { ipcMain } from 'electron'

interface AutoSaveData {
  filePath: string | null
  data: unknown
  timestamp: number
}

interface StoreSchema {
  draft: AutoSaveData | null
}

const draftStore = new Store<StoreSchema>({
  name: 'ancestree-draft',
  defaults: { draft: null }
})

// Auto-save interval: 30 seconds
const AUTO_SAVE_INTERVAL = 30000
let autoSaveTimer: NodeJS.Timeout | null = null
let currentData: unknown = null
let currentFilePath: string | null = null

export function startAutoSave(): void {
  stopAutoSave()
  autoSaveTimer = setInterval(() => {
    if (currentData !== null) {
      draftStore.set('draft', {
        filePath: currentFilePath,
        data: currentData,
        timestamp: Date.now()
      })
    }
  }, AUTO_SAVE_INTERVAL)
}

export function stopAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}

export function updateAutoSaveData(data: unknown, filePath: string | null): void {
  currentData = data
  currentFilePath = filePath
}

export function clearDraft(): void {
  draftStore.delete('draft')
  currentData = null
  currentFilePath = null
}

export function getDraft(): AutoSaveData | null {
  return draftStore.get('draft')
}

export function hasDraft(): boolean {
  const draft = getDraft()
  return draft !== null && draft.data !== null
}

export function registerAutoSaveHandlers(): void {
  ipcMain.handle('autosave:get', () => getDraft())
  ipcMain.handle('autosave:clear', () => { clearDraft(); return true })
  ipcMain.handle('autosave:has', () => hasDraft())
  ipcMain.handle('autosave:update', (_event, data: unknown, filePath: string | null) => {
    updateAutoSaveData(data, filePath)
    return true
  })
}
