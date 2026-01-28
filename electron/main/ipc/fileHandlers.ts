import { app, BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from 'electron'
import { readFile, writeFile } from 'fs/promises'

/**
 * Result types for file dialog operations
 */
interface OpenFileResult {
  canceled: boolean
  data: unknown | null
  filePath: string | null
  error?: string
}

interface SaveFileResult {
  canceled: boolean
  filePath: string | null
}

interface ExportFileResult {
  canceled: boolean
  filePath: string | null
}

/**
 * File filters for JSON family tree files
 */
const JSON_FILTERS = [{ name: 'JSON Files', extensions: ['json'] }]

/**
 * Get the parent BrowserWindow from an IPC event
 * Used to attach dialogs to the correct window
 */
function getParentWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined
}

/**
 * Validate that parsed JSON has the expected family tree structure
 * Basic validation: must have a 'members' array
 */
function isValidFamilyTreeData(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const obj = data as Record<string, unknown>
  return Array.isArray(obj.members)
}

/**
 * IPC handler for dialog:open
 * Opens a native file dialog and reads the selected JSON file
 *
 * @returns OpenFileResult with parsed data or error
 */
async function handleOpenDialog(event: IpcMainInvokeEvent): Promise<OpenFileResult> {
  const parentWindow = getParentWindow(event)

  const result = await dialog.showOpenDialog({
    ...(parentWindow && { parentWindow }),
    defaultPath: app.getPath('documents'),
    filters: JSON_FILTERS,
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, data: null, filePath: null }
  }

  const filePath = result.filePaths[0]

  try {
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    // Validate basic structure
    if (!isValidFamilyTreeData(data)) {
      return {
        canceled: false,
        data: null,
        filePath,
        error: 'Invalid family tree format: missing "members" array'
      }
    }

    return { canceled: false, data, filePath }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error reading file'
    return { canceled: false, data: null, filePath, error: `Failed to parse JSON: ${message}` }
  }
}

/**
 * IPC handler for dialog:save
 * Saves data to a file, prompting for location if filePath is not provided
 *
 * @param data - The data to save
 * @param filePath - Optional path to save to (prompts if null)
 * @returns SaveFileResult with the saved file path
 */
async function handleSaveDialog(
  event: IpcMainInvokeEvent,
  { data, filePath }: { data: unknown; filePath: string | null }
): Promise<SaveFileResult> {
  let targetPath = filePath

  // If no file path provided, show save dialog
  if (!targetPath) {
    const parentWindow = getParentWindow(event)

    const result = await dialog.showSaveDialog({
      ...(parentWindow && { parentWindow }),
      defaultPath: app.getPath('documents') + '/Untitled.json',
      filters: JSON_FILTERS
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true, filePath: null }
    }

    targetPath = result.filePath
  }

  // Write the file
  await writeFile(targetPath, JSON.stringify(data, null, 2), 'utf-8')

  return { canceled: false, filePath: targetPath }
}

/**
 * IPC handler for dialog:saveAs
 * Always shows save dialog, optionally with a default path suggestion
 *
 * @param data - The data to save
 * @param defaultPath - Optional default filename to suggest
 * @returns SaveFileResult with the saved file path
 */
async function handleSaveAsDialog(
  event: IpcMainInvokeEvent,
  { data, defaultPath }: { data: unknown; defaultPath?: string }
): Promise<SaveFileResult> {
  const parentWindow = getParentWindow(event)

  // Build default path for dialog
  const suggestedPath = defaultPath
    ? defaultPath
    : app.getPath('documents') + '/Untitled.json'

  const result = await dialog.showSaveDialog({
    ...(parentWindow && { parentWindow }),
    defaultPath: suggestedPath,
    filters: JSON_FILTERS
  })

  if (result.canceled || !result.filePath) {
    return { canceled: true, filePath: null }
  }

  // Write the file
  await writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8')

  return { canceled: false, filePath: result.filePath }
}

/**
 * File filters for GEDCOM files
 */
const GEDCOM_FILTERS = [
  { name: 'GEDCOM Files', extensions: ['ged'] },
  { name: 'All Files', extensions: ['*'] }
]

/**
 * IPC handler for dialog:export
 * Exports family tree data to GEDCOM format
 *
 * @param gedcomContent - The GEDCOM-formatted content to save
 * @param defaultName - Optional default filename to suggest
 * @returns ExportFileResult with the saved file path
 */
async function handleExportDialog(
  event: IpcMainInvokeEvent,
  { gedcomContent, defaultName }: { gedcomContent: string; defaultName?: string }
): Promise<ExportFileResult> {
  const parentWindow = getParentWindow(event)

  const suggestedPath = defaultName
    ? app.getPath('documents') + '/' + defaultName
    : app.getPath('documents') + '/family-tree.ged'

  const result = await dialog.showSaveDialog({
    ...(parentWindow && { parentWindow }),
    title: 'Export Family Tree',
    defaultPath: suggestedPath,
    filters: GEDCOM_FILTERS
  })

  if (result.canceled || !result.filePath) {
    return { canceled: true, filePath: null }
  }

  // Write the GEDCOM content directly (already formatted)
  await writeFile(result.filePath, gedcomContent, 'utf-8')

  return { canceled: false, filePath: result.filePath }
}

/**
 * Register all file dialog IPC handlers
 * Call this in app.whenReady() before creating windows
 */
export function registerFileHandlers(): void {
  ipcMain.handle('dialog:open', handleOpenDialog)
  ipcMain.handle('dialog:save', handleSaveDialog)
  ipcMain.handle('dialog:saveAs', handleSaveAsDialog)
  ipcMain.handle('dialog:export', handleExportDialog)
}
