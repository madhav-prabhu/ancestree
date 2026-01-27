/// <reference types="vite/client" />

declare module '*.css' {
  const content: string
  export default content
}

/**
 * Electron API exposed via contextBridge in preload script
 * Only available when running in Electron context
 */
interface ElectronAPI {
  /** Flag indicating the app is running in Electron context */
  isElectron: boolean
  /** Invoke an IPC handler on the main process (only allowed channels) */
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  /** Subscribe to menu action events from main process */
  onMenuAction: (callback: (action: string) => void) => () => void
  /** Subscribe to update events from main process (available, notAvailable, progress, downloaded, error) */
  onUpdateEvent: (callback: (event: string, data?: unknown) => void) => () => void
}

declare global {
  interface Window {
    /** Electron API - only present when running in Electron */
    electronAPI?: ElectronAPI
  }
}

export {}
