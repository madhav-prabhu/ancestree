import { contextBridge, ipcRenderer } from 'electron'

/**
 * Allowed IPC channels for security
 * Only channels in this list can be invoked from the renderer
 * Add channels here as features are implemented in later phases
 */
const ALLOWED_CHANNELS: string[] = [
  // Phase 2 will add file dialog channels:
  // 'dialog:openFile'
  // 'dialog:saveFile'
  // etc.
]

/**
 * Electron API exposed to the renderer process
 * Uses contextBridge for secure IPC communication
 *
 * SECURITY: Never expose raw ipcRenderer methods
 * All IPC calls go through the invoke wrapper with channel allowlist
 */
const electronAPI = {
  /**
   * Flag to detect if running in Electron context
   * Useful for conditional rendering/behavior in shared codebase
   */
  isElectron: true,

  /**
   * Invoke an IPC handler on the main process
   * Only allowed channels can be invoked (security measure)
   *
   * @param channel - The IPC channel to invoke
   * @param args - Arguments to pass to the handler
   * @returns Promise resolving to the handler's return value
   * @throws Error if channel is not in allowlist
   */
  invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}. Channel not in allowlist.`)
    }
    return ipcRenderer.invoke(channel, ...args)
  }
}

// Expose the API to the renderer via contextBridge
// This creates window.electronAPI in the renderer context
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
