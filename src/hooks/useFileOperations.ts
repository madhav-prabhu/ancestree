import { useState, useCallback } from 'react'
import { isElectron } from '../utils/platform'

interface FileState {
  filePath: string | null
  isDirty: boolean
  isLoading: boolean
  error: string | null
  fileName: string
}

interface UseFileOperationsReturn extends FileState {
  save: (data: unknown) => Promise<boolean>
  saveAs: (data: unknown) => Promise<boolean>
  open: () => Promise<unknown | null>
  newFile: () => void
  markDirty: () => void
  markClean: () => void
  updateAutoSave: (data: unknown) => Promise<void>
  checkForDraft: () => Promise<{ hasDraft: boolean; draft: unknown | null }>
  clearDraft: () => Promise<void>
}

export function useFileOperations(): UseFileOperationsReturn {
  const [state, setState] = useState<FileState>({
    filePath: null,
    isDirty: false,
    isLoading: false,
    error: null,
    fileName: 'Untitled'
  })

  const getFileName = (filePath: string | null): string => {
    if (!filePath) return 'Untitled'
    const parts = filePath.split(/[/\\]/)
    return parts[parts.length - 1].replace('.json', '')
  }

  const save = useCallback(async (data: unknown): Promise<boolean> => {
    if (!isElectron()) return false

    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const result = await window.electronAPI!.invoke('dialog:save', {
        data,
        filePath: state.filePath
      }) as { canceled: boolean; filePath: string | null }

      if (!result.canceled && result.filePath) {
        setState(s => ({
          ...s,
          filePath: result.filePath,
          fileName: getFileName(result.filePath),
          isDirty: false,
          isLoading: false
        }))
        return true
      }

      setState(s => ({ ...s, isLoading: false }))
      return false
    } catch (err) {
      setState(s => ({
        ...s,
        error: (err as Error).message,
        isLoading: false
      }))
      return false
    }
  }, [state.filePath])

  const saveAs = useCallback(async (data: unknown): Promise<boolean> => {
    if (!isElectron()) return false

    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const result = await window.electronAPI!.invoke('dialog:saveAs', {
        data,
        defaultPath: state.filePath || 'Untitled.json'
      }) as { canceled: boolean; filePath: string | null }

      if (!result.canceled && result.filePath) {
        setState(s => ({
          ...s,
          filePath: result.filePath,
          fileName: getFileName(result.filePath),
          isDirty: false,
          isLoading: false
        }))
        return true
      }

      setState(s => ({ ...s, isLoading: false }))
      return false
    } catch (err) {
      setState(s => ({
        ...s,
        error: (err as Error).message,
        isLoading: false
      }))
      return false
    }
  }, [state.filePath])

  const open = useCallback(async (): Promise<unknown | null> => {
    if (!isElectron()) return null

    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const result = await window.electronAPI!.invoke('dialog:open') as {
        canceled: boolean
        data: unknown | null
        filePath: string | null
        error?: string
      }

      if (result.error) {
        setState(s => ({ ...s, error: result.error!, isLoading: false }))
        return null
      }

      if (!result.canceled && result.data) {
        setState({
          filePath: result.filePath,
          fileName: getFileName(result.filePath),
          isDirty: false,
          isLoading: false,
          error: null
        })
        return result.data
      }

      setState(s => ({ ...s, isLoading: false }))
      return null
    } catch (err) {
      setState(s => ({
        ...s,
        error: (err as Error).message,
        isLoading: false
      }))
      return null
    }
  }, [])

  const newFile = useCallback(() => {
    setState({
      filePath: null,
      fileName: 'Untitled',
      isDirty: false,
      isLoading: false,
      error: null
    })
  }, [])

  const markDirty = useCallback(() => {
    setState(s => ({ ...s, isDirty: true }))
  }, [])

  const markClean = useCallback(() => {
    setState(s => ({ ...s, isDirty: false }))
  }, [])

  const updateAutoSave = useCallback(async (data: unknown): Promise<void> => {
    if (!isElectron()) return
    await window.electronAPI!.invoke('autosave:update', data, state.filePath)
  }, [state.filePath])

  const checkForDraft = useCallback(async () => {
    if (!isElectron()) return { hasDraft: false, draft: null }
    const hasDraft = await window.electronAPI!.invoke('autosave:has') as boolean
    if (!hasDraft) return { hasDraft: false, draft: null }
    const draft = await window.electronAPI!.invoke('autosave:get') as { data: unknown } | null
    return { hasDraft: true, draft: draft?.data || null }
  }, [])

  const clearDraft = useCallback(async (): Promise<void> => {
    if (!isElectron()) return
    await window.electronAPI!.invoke('autosave:clear')
  }, [])

  return {
    ...state,
    save,
    saveAs,
    open,
    newFile,
    markDirty,
    markClean,
    updateAutoSave,
    checkForDraft,
    clearDraft
  }
}
