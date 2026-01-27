import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

/**
 * Allowed IPC channels for invoke (renderer -> main)
 * Only channels in this list can be invoked from the renderer
 */
const ALLOWED_CHANNELS = [
  'dialog:open',
  'dialog:save',
  'dialog:saveAs',
  'dialog:export',
  'autosave:get',
  'autosave:clear',
  'autosave:has',
  'autosave:update',
  'document:setDirty',
  'document:getDirty',
  // Update channels
  'update:check',
  'update:download'
] as const

/**
 * Allowed IPC channels for receiving events (main -> renderer)
 * Used for menu actions triggered from the native menu bar
 */
const ALLOWED_RECEIVE_CHANNELS = [
  'menu:new',
  'menu:open',
  'menu:save',
  'menu:saveAs',
  'menu:export',
  // Update events
  'update:available',
  'update:notAvailable',
  'update:progress',
  'update:downloaded',
  'update:error'
] as const

/**
 * Electron API exposed to the renderer process
 * Uses contextBridge for secure IPC communication
 *
 * SECURITY: Never expose raw ipcRenderer methods
 * All IPC calls go through wrappers with channel allowlists
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
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    if (!ALLOWED_CHANNELS.includes(channel as (typeof ALLOWED_CHANNELS)[number])) {
      throw new Error(`Invalid channel: ${channel}. Channel not in allowlist.`)
    }
    return ipcRenderer.invoke(channel, ...args)
  },

  /**
   * Subscribe to menu action events from the main process
   * Sets up listeners for all allowed receive channels
   *
   * @param callback - Function called with action name when menu item clicked
   * @returns Unsubscribe function to remove all listeners
   */
  onMenuAction: (callback: (action: string) => void): (() => void) => {
    // Create listeners for each allowed receive channel
    const listeners: Array<{
      channel: (typeof ALLOWED_RECEIVE_CHANNELS)[number]
      handler: (_event: IpcRendererEvent) => void
    }> = []

    for (const channel of ALLOWED_RECEIVE_CHANNELS) {
      const handler = (_event: IpcRendererEvent): void => {
        // Extract action name from channel (e.g., 'menu:save' -> 'save')
        const action = channel.replace('menu:', '')
        callback(action)
      }
      ipcRenderer.on(channel, handler)
      listeners.push({ channel, handler })
    }

    // Return unsubscribe function
    return (): void => {
      for (const { channel, handler } of listeners) {
        ipcRenderer.removeListener(channel, handler)
      }
    }
  },

  /**
   * Subscribe to update events from the main process
   *
   * @param callback - Function called with event type and data
   * @returns Unsubscribe function to remove all listeners
   */
  onUpdateEvent: (callback: (event: string, data?: unknown) => void): (() => void) => {
    const updateChannels = [
      'update:available',
      'update:notAvailable',
      'update:progress',
      'update:downloaded',
      'update:error'
    ] as const

    const listeners: Array<{
      channel: string
      handler: (_event: IpcRendererEvent, data?: unknown) => void
    }> = []

    for (const channel of updateChannels) {
      const handler = (_event: IpcRendererEvent, data?: unknown): void => {
        const eventType = channel.replace('update:', '')
        callback(eventType, data)
      }
      ipcRenderer.on(channel, handler)
      listeners.push({ channel, handler })
    }

    return (): void => {
      for (const { channel, handler } of listeners) {
        ipcRenderer.removeListener(channel, handler)
      }
    }
  }
}

// Expose the API to the renderer via contextBridge
// This creates window.electronAPI in the renderer context
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
