/**
 * Result type for file open dialog
 */
export interface OpenFileResult {
  canceled: boolean
  data: unknown | null
  filePath: string | null
  error?: string
}

/**
 * Result type for file save dialogs
 */
export interface SaveFileResult {
  canceled: boolean
  filePath: string | null
}

/**
 * Auto-save draft data structure
 */
export interface AutoSaveData {
  filePath: string | null
  data: unknown
  timestamp: number
}

/**
 * Type declarations for the Electron preload API
 * This interface matches what is exposed via contextBridge in index.ts
 */
export interface ElectronAPI {
  /**
   * Flag indicating the app is running in Electron context
   */
  isElectron: boolean

  /**
   * Invoke an IPC handler on the main process
   * Only allowed channels can be invoked
   *
   * @param channel - The IPC channel to invoke
   * @param args - Arguments to pass to the handler
   * @returns Promise resolving to the handler's return value
   * @throws Error if channel is not in allowlist
   */
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>

  /**
   * Subscribe to menu action events from the main process
   *
   * @param callback - Function called with action name ('new', 'open', 'save', 'saveAs', 'export', 'proceedWithNew')
   * @returns Unsubscribe function to remove all listeners
   */
  onMenuAction: (callback: (action: string) => void) => () => void

  /**
   * Subscribe to update events from the main process
   * Events include: 'available', 'notAvailable', 'progress', 'downloaded', 'error'
   *
   * @param callback - Function called with event type and optional data
   * @returns Unsubscribe function to remove all listeners
   */
  onUpdateEvent: (callback: (event: string, data?: unknown) => void) => () => void
}

/**
 * Extend the global Window interface to include electronAPI
 * This makes window.electronAPI type-safe in renderer code
 */
declare global {
  interface Window {
    /**
     * Electron API exposed via contextBridge
     * Only available when running in Electron context
     */
    electronAPI?: ElectronAPI
  }
}

export {}
