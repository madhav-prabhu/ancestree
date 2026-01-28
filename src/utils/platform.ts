/**
 * Platform detection utilities for Electron vs Web environments.
 * Used to conditionally enable desktop-specific features.
 */

/**
 * Check if running in Electron desktop app.
 * Returns true only when electronAPI is exposed via preload script.
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' &&
         typeof window.electronAPI !== 'undefined' &&
         window.electronAPI.isElectron === true
}

/**
 * Get the Electron API if available.
 * Returns null in web browser environment.
 */
export function getElectronAPI() {
  if (!isElectron()) {
    return null
  }
  return window.electronAPI
}

/**
 * Get current platform.
 * In Electron, this could be extended to use process.platform via IPC.
 * For now, uses navigator.platform as fallback.
 */
export function getPlatform(): 'mac' | 'windows' | 'linux' | 'unknown' {
  const platform = navigator.platform.toLowerCase()
  if (platform.includes('mac')) return 'mac'
  if (platform.includes('win')) return 'windows'
  if (platform.includes('linux')) return 'linux'
  return 'unknown'
}
