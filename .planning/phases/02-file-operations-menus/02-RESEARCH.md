# Phase 2: File Operations & Menus - Research

**Researched:** 2026-01-27
**Domain:** Electron dialog API, Menu API, file operations, GEDCOM export
**Confidence:** HIGH

## Summary

Phase 2 implements native file dialogs, application menus, and keyboard shortcuts for Ancestree. The research confirms that Electron provides comprehensive APIs for all required functionality: `dialog.showOpenDialog()` and `dialog.showSaveDialog()` for native file pickers, `Menu.buildFromTemplate()` for application menus, and MenuItem roles for standard behaviors (undo, redo, cut, copy, paste).

The existing preload script with channel allowlist pattern from Phase 1 provides the security foundation. File operations will add new IPC channels (`dialog:open`, `dialog:save`, `dialog:saveAs`, `dialog:export`) to the allowlist, with handlers in the main process accessing the filesystem. The renderer communicates through the secure bridge, never directly accessing Node.js fs module.

For auto-save/crash recovery, `electron-store` provides atomic writes that won't corrupt on crash. For GEDCOM export, the format is well-documented with GEDCOM 7.0 being the current standard (UTF-8, plain text with hierarchical tags).

**Primary recommendation:** Implement IPC handlers for file dialogs in main process, expose typed APIs through preload, and use electron-store for auto-save drafts. Build menus with Menu.buildFromTemplate using platform detection for macOS app menu.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron (dialog) | 40.0.0 | Native file dialogs | Built-in, cross-platform, OS-native look |
| electron (Menu) | 40.0.0 | Application menus | Built-in, supports roles, accelerators |
| electron-store | 10.0.0+ | Auto-save drafts | Atomic writes, crash-safe, TypeScript support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @electron-toolkit/utils | 4.0.0 | Platform helpers | Already installed, use for `is.dev` checks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-store | app.getPath('temp') + fs | Manual atomic write handling, more code |
| Menu.buildFromTemplate | electron-default-menu | Less control, template approach preferred |

**Installation:**
```bash
npm install electron-store
```

## Architecture Patterns

### Recommended Project Structure
```
electron/
├── main/
│   ├── index.ts          # App lifecycle (existing)
│   ├── menu.ts           # NEW: Menu template and setup
│   ├── ipc/
│   │   └── fileHandlers.ts  # NEW: File dialog IPC handlers
│   └── services/
│       └── autoSave.ts   # NEW: Auto-save draft management
├── preload/
│   ├── index.ts          # Preload script (extend existing)
│   └── index.d.ts        # Type declarations (extend existing)
src/
├── hooks/
│   └── useFileOperations.ts  # NEW: Hook for file save/open
├── services/
│   └── fileService.ts        # NEW: Renderer-side file operations
└── utils/
    └── gedcom.ts             # NEW: GEDCOM export converter
```

### Pattern 1: IPC Channel Handlers for File Dialogs

**What:** Main process handlers for file dialogs, exposed via typed preload API
**When to use:** All file dialog operations (open, save, export)

```typescript
// electron/main/ipc/fileHandlers.ts
// Source: https://www.electronjs.org/docs/latest/api/dialog
import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs/promises'

export function registerFileHandlers(): void {
  // Open file dialog
  ipcMain.handle('dialog:open', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window!, {
      title: 'Open Family Tree',
      defaultPath: app.getPath('documents'),
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, data: null, filePath: null }
    }

    const filePath = result.filePaths[0]
    const content = await fs.readFile(filePath, 'utf-8')
    return { canceled: false, data: JSON.parse(content), filePath }
  })

  // Save file dialog
  ipcMain.handle('dialog:save', async (event, { data, filePath }) => {
    const window = BrowserWindow.fromWebContents(event.sender)

    // If no filePath, prompt for location (first save)
    let targetPath = filePath
    if (!targetPath) {
      const result = await dialog.showSaveDialog(window!, {
        title: 'Save Family Tree',
        defaultPath: 'Untitled.json',
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      })
      if (result.canceled) {
        return { canceled: true, filePath: null }
      }
      targetPath = result.filePath!
    }

    await fs.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf-8')
    return { canceled: false, filePath: targetPath }
  })

  // Save As dialog (always prompts)
  ipcMain.handle('dialog:saveAs', async (event, { data, defaultPath }) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(window!, {
      title: 'Save Family Tree As',
      defaultPath: defaultPath || 'Untitled.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    })

    if (result.canceled) {
      return { canceled: true, filePath: null }
    }

    await fs.writeFile(result.filePath!, JSON.stringify(data, null, 2), 'utf-8')
    return { canceled: false, filePath: result.filePath }
  })
}
```

### Pattern 2: Cross-Platform Application Menu

**What:** Menu template with platform detection for macOS app menu
**When to use:** App initialization, before window creation

```typescript
// electron/main/menu.ts
// Source: https://www.electronjs.org/docs/latest/tutorial/application-menu
import { app, Menu, shell, BrowserWindow } from 'electron'

const isMac = process.platform === 'darwin'

export function createApplicationMenu(mainWindow: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS App Menu (first item must be app name)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CommandOrControl+N',
          click: () => mainWindow.webContents.send('menu:new')
        },
        {
          label: 'Open...',
          accelerator: 'CommandOrControl+O',
          click: () => mainWindow.webContents.send('menu:open')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CommandOrControl+S',
          click: () => mainWindow.webContents.send('menu:save')
        },
        {
          label: 'Save As...',
          accelerator: 'CommandOrControl+Shift+S',
          click: () => mainWindow.webContents.send('menu:saveAs')
        },
        { type: 'separator' },
        {
          label: 'Export...',
          click: () => mainWindow.webContents.send('menu:export')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit Menu (use built-in roles)
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Help Menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Ancestree',
          click: () => {
            // Show about dialog or navigate to about page
          }
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://ancestree.app/docs')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/ancestree/issues')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
```

### Pattern 3: Document Dirty State Tracking

**What:** Track unsaved changes, show indicator, prompt before close
**When to use:** Any document-based app with save functionality

```typescript
// electron/main/index.ts - Window creation with dirty state
// Source: https://www.electronjs.org/docs/latest/api/browser-window
import { BrowserWindow, app, dialog } from 'electron'

let mainWindow: BrowserWindow | null = null
let isDirty = false
let currentFilePath: string | null = null

function setDocumentEdited(edited: boolean): void {
  isDirty = edited
  if (mainWindow) {
    // macOS: Shows dot in close button
    mainWindow.setDocumentEdited(edited)

    // Update title with dirty indicator
    const baseName = currentFilePath
      ? path.basename(currentFilePath)
      : 'Untitled'
    const indicator = process.platform === 'darwin' ? '' : (edited ? ' *' : '')
    mainWindow.setTitle(`${baseName}${indicator} - Ancestree`)
  }
}

// Handle close with unsaved changes
mainWindow.on('close', async (event) => {
  if (isDirty) {
    event.preventDefault()

    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'question',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      message: 'Do you want to save changes?',
      detail: 'Your changes will be lost if you close without saving.'
    })

    if (result.response === 0) {
      // Save then close
      mainWindow!.webContents.send('menu:save')
      // Close handled after save completes via IPC
    } else if (result.response === 1) {
      // Don't save, force close
      isDirty = false
      mainWindow!.close()
    }
    // Cancel: do nothing, window stays open
  }
})
```

### Pattern 4: Auto-Save with electron-store

**What:** Periodic draft saves to temp location for crash recovery
**When to use:** Apps with document editing

```typescript
// electron/main/services/autoSave.ts
// Source: https://github.com/sindresorhus/electron-store
import Store from 'electron-store'

interface AutoSaveData {
  filePath: string | null
  data: unknown
  timestamp: number
}

const draftStore = new Store<{ draft: AutoSaveData | null }>({
  name: 'draft',
  defaults: { draft: null }
})

// Auto-save interval: 30 seconds
const AUTO_SAVE_INTERVAL = 30000

let autoSaveTimer: NodeJS.Timeout | null = null

export function startAutoSave(getData: () => unknown, getFilePath: () => string | null): void {
  stopAutoSave()

  autoSaveTimer = setInterval(() => {
    const data = getData()
    const filePath = getFilePath()

    draftStore.set('draft', {
      filePath,
      data,
      timestamp: Date.now()
    })
  }, AUTO_SAVE_INTERVAL)
}

export function stopAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}

export function clearDraft(): void {
  draftStore.delete('draft')
}

export function getDraft(): AutoSaveData | null {
  return draftStore.get('draft')
}

export function hasDraft(): boolean {
  const draft = getDraft()
  return draft !== null && draft.data !== null
}
```

### Pattern 5: Preload API Extension

**What:** Extend existing preload with file operation channels
**When to use:** Building on Phase 1 foundation

```typescript
// electron/preload/index.ts - Extended version
import { contextBridge, ipcRenderer } from 'electron'

const ALLOWED_CHANNELS: string[] = [
  // File operations
  'dialog:open',
  'dialog:save',
  'dialog:saveAs',
  'dialog:export',
  // Dirty state
  'document:setDirty',
  'document:getDirty',
]

// Menu event channels (receive from main)
const ALLOWED_RECEIVE_CHANNELS: string[] = [
  'menu:new',
  'menu:open',
  'menu:save',
  'menu:saveAs',
  'menu:export',
]

const electronAPI = {
  isElectron: true,

  // Invoke main process handlers
  invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}`)
    }
    return ipcRenderer.invoke(channel, ...args)
  },

  // Listen for menu events from main
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => {
      callback(action)
    }

    ALLOWED_RECEIVE_CHANNELS.forEach(channel => {
      ipcRenderer.on(channel, () => handler(null as any, channel.replace('menu:', '')))
    })

    // Return unsubscribe function
    return () => {
      ALLOWED_RECEIVE_CHANNELS.forEach(channel => {
        ipcRenderer.removeAllListeners(channel)
      })
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
```

### Anti-Patterns to Avoid

- **Exposing fs module to renderer:** Never use `nodeIntegration: true` to access filesystem from renderer. Always go through IPC.
- **Blocking main process:** Use async dialog methods, not sync versions, to prevent UI freezing.
- **Ignoring platform differences:** macOS requires app menu as first item; Windows/Linux use different dirty indicators.
- **Missing file filter validation:** Always validate loaded JSON matches expected schema before use.
- **Hardcoding accelerators:** Use `CommandOrControl` not `Control` or `Cmd` for cross-platform shortcuts.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Crash-safe config writes | Manual temp file + rename | electron-store | Atomic writes, tested edge cases |
| Clipboard operations | Custom clipboard handling | MenuItem roles (cut/copy/paste) | Platform-native behavior |
| Standard menu behavior | Custom undo/redo handlers | MenuItem roles | Built-in, accessible |
| File dialog styling | Custom HTML file picker | dialog.showOpenDialog | Native OS look and feel |
| About dialog (macOS) | Custom modal | app.setAboutPanelOptions + role: 'about' | Native macOS about panel |

**Key insight:** Electron's built-in MenuItem roles handle platform-specific behavior automatically. Custom implementations lose accessibility features and native look.

## Common Pitfalls

### Pitfall 1: Menu Not Showing on macOS

**What goes wrong:** Application menu doesn't appear or shows wrong name
**Why it happens:** macOS requires app menu as first item with `label: app.name`, or using Info.plist
**How to avoid:** Use platform check and add app menu template first when `process.platform === 'darwin'`
**Warning signs:** Menu works on Windows/Linux but not macOS

### Pitfall 2: Accelerators Don't Work Globally

**What goes wrong:** Keyboard shortcuts only work when app is focused
**Why it happens:** Menu accelerators are local by design; need globalShortcut for global
**How to avoid:** For app-specific shortcuts (Cmd+S), menu accelerators are correct. Only use globalShortcut for truly global needs.
**Warning signs:** Expecting Cmd+S to save from background

### Pitfall 3: Modal Dialogs Block Main Process

**What goes wrong:** App becomes unresponsive during dialog
**Why it happens:** Using synchronous dialog methods (`showSaveDialogSync`)
**How to avoid:** Always use async versions (`showSaveDialog`)
**Warning signs:** Using any method ending in `Sync`

### Pitfall 4: Unsaved Changes Lost on Quit

**What goes wrong:** User closes app without being prompted about unsaved changes
**Why it happens:** Not handling the 'close' event on BrowserWindow
**How to avoid:** Handle 'close' event, check dirty state, show confirmation dialog
**Warning signs:** `app.quit()` called directly without window close checks

### Pitfall 5: File Encoding Issues

**What goes wrong:** Non-ASCII characters corrupted in saved files
**Why it happens:** Not specifying UTF-8 encoding
**How to avoid:** Always specify `'utf-8'` in `fs.readFile` and `fs.writeFile`
**Warning signs:** Umlauts, accents, or non-Latin names appear garbled

### Pitfall 6: Invalid JSON Crashes App

**What goes wrong:** App crashes when opening malformed file
**Why it happens:** No try/catch around JSON.parse
**How to avoid:** Wrap file reading in try/catch, validate against schema
**Warning signs:** Importing user-provided files works "sometimes"

## Code Examples

Verified patterns from official sources:

### Complete File Open Handler

```typescript
// electron/main/ipc/fileHandlers.ts
// Source: https://www.electronjs.org/docs/latest/api/dialog
import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

interface OpenResult {
  canceled: boolean
  data: unknown | null
  filePath: string | null
  error?: string
}

ipcMain.handle('dialog:open', async (event): Promise<OpenResult> => {
  const window = BrowserWindow.fromWebContents(event.sender)

  const result = await dialog.showOpenDialog(window!, {
    title: 'Open Family Tree',
    defaultPath: app.getPath('documents'),
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, data: null, filePath: null }
  }

  const filePath = result.filePaths[0]

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    // Validate data structure
    if (!data.version || !Array.isArray(data.members)) {
      return {
        canceled: false,
        data: null,
        filePath,
        error: 'Invalid file format: missing required fields'
      }
    }

    return { canceled: false, data, filePath }
  } catch (err) {
    return {
      canceled: false,
      data: null,
      filePath,
      error: `Failed to read file: ${(err as Error).message}`
    }
  }
})
```

### GEDCOM Export Function

```typescript
// src/utils/gedcom.ts
// Source: https://gedcom.io/specifications/FamilySearchGEDCOMv7.pdf
import type { FamilyMember, Relationship } from '../models'

/**
 * Convert Ancestree data to GEDCOM 7.0 format
 *
 * GEDCOM structure:
 * - Level 0: Record markers (HEAD, INDI, FAM, TRLR)
 * - Level 1: Record properties
 * - Level 2: Sub-properties
 */
export function exportToGedcom(
  members: FamilyMember[],
  relationships: Relationship[]
): string {
  const lines: string[] = []

  // Header
  lines.push('0 HEAD')
  lines.push('1 SOUR ANCESTREE')
  lines.push('2 VERS 1.0')
  lines.push('2 NAME Ancestree')
  lines.push('1 GEDC')
  lines.push('2 VERS 7.0')
  lines.push('1 CHAR UTF-8')
  lines.push(`1 DATE ${formatGedcomDate(new Date())}`)

  // Individual records
  const memberIdMap = new Map<string, string>()
  members.forEach((member, index) => {
    const gedcomId = `@I${index + 1}@`
    memberIdMap.set(member.id, gedcomId)

    lines.push(`0 ${gedcomId} INDI`)

    // Name (required)
    const nameParts = member.name.split(' ')
    const surname = nameParts.length > 1 ? nameParts.pop() : ''
    const givenName = nameParts.join(' ')
    lines.push(`1 NAME ${givenName} /${surname}/`)

    // Birth
    if (member.dateOfBirth || member.placeOfBirth) {
      lines.push('1 BIRT')
      if (member.dateOfBirth) {
        lines.push(`2 DATE ${formatGedcomDate(new Date(member.dateOfBirth))}`)
      }
      if (member.placeOfBirth) {
        lines.push(`2 PLAC ${member.placeOfBirth}`)
      }
    }

    // Death
    if (member.dateOfDeath) {
      lines.push('1 DEAT')
      lines.push(`2 DATE ${formatGedcomDate(new Date(member.dateOfDeath))}`)
    }

    // Notes
    if (member.notes) {
      lines.push(`1 NOTE ${member.notes}`)
    }
  })

  // Family records (for spouse relationships)
  const spouseRelationships = relationships.filter(r => r.type === 'spouse')
  spouseRelationships.forEach((rel, index) => {
    const famId = `@F${index + 1}@`
    const person1Id = memberIdMap.get(rel.person1Id)
    const person2Id = memberIdMap.get(rel.person2Id)

    if (person1Id && person2Id) {
      lines.push(`0 ${famId} FAM`)
      lines.push(`1 HUSB ${person1Id}`)  // Note: GEDCOM terms, gender-agnostic in v7
      lines.push(`1 WIFE ${person2Id}`)

      if (rel.marriageDate) {
        lines.push('1 MARR')
        lines.push(`2 DATE ${formatGedcomDate(new Date(rel.marriageDate))}`)
      }

      // Find children
      const children = relationships.filter(r =>
        r.type === 'parent-child' &&
        (r.person1Id === rel.person1Id || r.person1Id === rel.person2Id)
      )
      children.forEach(child => {
        const childId = memberIdMap.get(child.person2Id)
        if (childId) {
          lines.push(`1 CHIL ${childId}`)
        }
      })
    }
  })

  // Trailer
  lines.push('0 TRLR')

  return lines.join('\n')
}

function formatGedcomDate(date: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}
```

### React Hook for File Operations

```typescript
// src/hooks/useFileOperations.ts
import { useState, useEffect, useCallback } from 'react'
import { isElectron } from '../utils/platform'

interface FileState {
  filePath: string | null
  isDirty: boolean
  isLoading: boolean
  error: string | null
}

export function useFileOperations() {
  const [state, setState] = useState<FileState>({
    filePath: null,
    isDirty: false,
    isLoading: false,
    error: null
  })

  const save = useCallback(async (data: unknown) => {
    if (!isElectron()) return

    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const result = await window.electronAPI!.invoke('dialog:save', {
        data,
        filePath: state.filePath
      }) as { canceled: boolean; filePath: string | null }

      if (!result.canceled) {
        setState(s => ({
          ...s,
          filePath: result.filePath,
          isDirty: false,
          isLoading: false
        }))
      } else {
        setState(s => ({ ...s, isLoading: false }))
      }
    } catch (err) {
      setState(s => ({
        ...s,
        error: (err as Error).message,
        isLoading: false
      }))
    }
  }, [state.filePath])

  const open = useCallback(async () => {
    if (!isElectron()) return null

    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const result = await window.electronAPI!.invoke('dialog:open') as {
        canceled: boolean
        data: unknown
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

  const markDirty = useCallback(() => {
    setState(s => ({ ...s, isDirty: true }))
  }, [])

  return {
    ...state,
    save,
    open,
    markDirty
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom menu handling | MenuItem roles | Electron 1.x+ | Use `role` for standard actions |
| Sync dialogs | Async dialogs | Always recommended | Non-blocking UI |
| nodeIntegration: true | IPC + contextBridge | Electron 12+ | Security requirement |
| GEDCOM 5.5.1 | GEDCOM 7.0 | 2021 | UTF-8, cleaner spec |

**Deprecated/outdated:**
- `remote` module: Removed, use IPC
- `showSaveDialogSync`/`showOpenDialogSync`: Blocks main process, avoid
- `nodeIntegration: true`: Security anti-pattern

## Open Questions

Things that couldn't be fully resolved:

1. **GEDCOM photo export**
   - What we know: GEDCOM 7.0 supports OBJE (object) records with FILE references
   - What's unclear: Best practice for embedding vs. linking base64 photos
   - Recommendation: For Phase 2, export GEDCOM without photos; add photo support in v2

2. **Undo/Redo integration with tree modifications**
   - What we know: Edit menu roles handle clipboard undo/redo automatically
   - What's unclear: How to integrate app-specific undo (add person, delete relationship) with menu
   - Recommendation: Use custom undo/redo handlers for tree operations, separate from Edit menu roles

3. **Recent files list**
   - What we know: `app.addRecentDocument()` exists for OS-level recent files
   - What's unclear: Deferred to v2 per CONTEXT.md
   - Recommendation: Skip for Phase 2, document pattern for later

## Sources

### Primary (HIGH confidence)
- [Electron Dialog API](https://www.electronjs.org/docs/latest/api/dialog) - showOpenDialog, showSaveDialog, showMessageBox
- [Electron Menu API](https://www.electronjs.org/docs/latest/api/menu) - Menu.buildFromTemplate, setApplicationMenu
- [Electron MenuItem API](https://www.electronjs.org/docs/latest/api/menu-item) - roles, accelerators
- [Electron Application Menu Tutorial](https://www.electronjs.org/docs/latest/tutorial/application-menu) - Complete menu examples
- [Electron Keyboard Shortcuts](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts) - Accelerator syntax
- [Electron BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window) - setDocumentEdited, setTitle
- [Electron app API](https://www.electronjs.org/docs/latest/api/app) - getPath, setAboutPanelOptions

### Secondary (MEDIUM confidence)
- [electron-store GitHub](https://github.com/sindresorhus/electron-store) - Auto-save, atomic writes
- [GEDCOM 7.0 Specification](https://gedcom.io/) - File format structure
- [GEDCOM Worked Example](http://microformats.org/wiki/GEDCOM_Worked_example) - Practical GEDCOM structure

### Tertiary (LOW confidence)
- WebSearch results on Electron menu patterns - Community patterns, not officially verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Electron documentation
- Architecture: HIGH - Patterns from Electron tutorials and Phase 1 foundation
- Pitfalls: HIGH - Documented in Electron guides and verified with official docs
- GEDCOM export: MEDIUM - Specification clear but photo handling needs validation

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable Electron APIs)
