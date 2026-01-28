import { useState, useEffect, useCallback } from 'react'
import { isElectron } from '../utils/platform'

/**
 * Update status states
 */
export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

/**
 * Update state interface
 */
export interface UpdateState {
  status: UpdateStatus
  version?: string
  progress?: number
  error?: string
}

/**
 * Return type for useUpdateEvents hook
 */
export interface UseUpdateEventsReturn extends UpdateState {
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  dismiss: () => void
}

/**
 * Hook for subscribing to update events from the main process.
 * Manages update state and provides actions for checking, downloading, and dismissing updates.
 *
 * @returns Update state and action functions
 */
export function useUpdateEvents(): UseUpdateEventsReturn {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })

  // Subscribe to update events from main process
  useEffect(() => {
    if (!isElectron()) return

    const unsubscribe = window.electronAPI!.onUpdateEvent((event, data) => {
      switch (event) {
        case 'available':
          setState({
            status: 'available',
            version: (data as { version?: string })?.version
          })
          break

        case 'notAvailable':
          setState({ status: 'idle' })
          break

        case 'progress':
          setState(s => ({
            ...s,
            status: 'downloading',
            progress: (data as { percent?: number })?.percent
          }))
          break

        case 'downloaded':
          setState(s => ({
            ...s,
            status: 'ready'
          }))
          break

        case 'error':
          setState({
            status: 'error',
            error: (data as { message?: string })?.message || 'Update failed'
          })
          break
      }
    })

    return () => unsubscribe()
  }, [])

  /**
   * Trigger a manual check for updates
   */
  const checkForUpdates = useCallback(async (): Promise<void> => {
    if (!isElectron()) return

    setState(s => ({ ...s, status: 'checking' }))
    try {
      await window.electronAPI!.invoke('update:check')
    } catch (err) {
      setState({
        status: 'error',
        error: (err as Error).message || 'Failed to check for updates'
      })
    }
  }, [])

  /**
   * Start downloading the available update
   */
  const downloadUpdate = useCallback(async (): Promise<void> => {
    if (!isElectron()) return

    setState(s => ({ ...s, status: 'downloading', progress: 0 }))
    try {
      await window.electronAPI!.invoke('update:download')
    } catch (err) {
      setState({
        status: 'error',
        error: (err as Error).message || 'Failed to download update'
      })
    }
  }, [])

  /**
   * Dismiss the update notification
   */
  const dismiss = useCallback((): void => {
    setState({ status: 'idle' })
  }, [])

  return {
    ...state,
    checkForUpdates,
    downloadUpdate,
    dismiss
  }
}
