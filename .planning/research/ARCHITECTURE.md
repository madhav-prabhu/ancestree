# Architecture Research: Electron + React + Vite Integration

**Domain:** Desktop app wrapper for existing React + Vite web application
**Researched:** 2026-01-26
**Confidence:** HIGH

## System Overview

Electron introduces a multi-process architecture that wraps the existing React app. The key insight is that the **existing web app becomes the renderer process** with minimal changes.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ELECTRON APPLICATION                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐         IPC          ┌─────────────────────┐   │
│  │    MAIN PROCESS     │◄────────────────────►│  RENDERER PROCESS   │   │
│  │     (Node.js)       │   contextBridge      │    (Chromium)       │   │
│  │                     │                      │                     │   │
│  │  • App lifecycle    │    ┌──────────┐      │  ┌───────────────┐  │   │
│  │  • Native dialogs   │◄───│ PRELOAD  │─────►│  │ EXISTING REACT│  │   │
│  │  • File system      │    │ SCRIPTS  │      │  │     APP       │  │   │
│  │  • System tray      │    └──────────┘      │  │               │  │   │
│  │  • Menu bar         │                      │  │ components/   │  │   │
│  │  • Auto-update      │                      │  │ hooks/        │  │   │
│  └─────────────────────┘                      │  │ services/     │  │   │
│                                               │  │ scene/        │  │   │
│                                               │  └───────────────┘  │   │
│                                               │                     │   │
│                                               └─────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Process Boundaries

| Process | Runtime | Capabilities | Security |
|---------|---------|--------------|----------|
| **Main** | Node.js | Full system access, native APIs | Trusted |
| **Preload** | Node.js (sandboxed) | Limited Node.js, contextBridge | Bridge layer |
| **Renderer** | Chromium | DOM, Web APIs only | Untrusted (web content) |

## Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **Main Process** | App lifecycle, native features, IPC handling | `electron/main.ts` - manages BrowserWindow, handles IPC |
| **Preload Script** | Secure API bridge, expose limited capabilities | `electron/preload.ts` - uses contextBridge |
| **Renderer (React)** | UI, user interaction, 3D visualization | Existing `src/` - unchanged web app |
| **Storage Adapter** | Abstract storage backend | Existing `StorageInterface` - add file system implementation |
| **IPC Handler** | Route native API calls | Main process handlers for file dialogs, etc. |

## Recommended Project Structure

```
ancestree/
├── electron/                    # NEW: Electron-specific code
│   ├── main.ts                  # Main process entry point
│   ├── preload.ts               # Preload script (contextBridge)
│   └── ipc/                     # IPC handlers organized by feature
│       ├── dialog.ts            # File open/save dialogs
│       ├── storage.ts           # Native file storage
│       └── index.ts             # Handler registration
├── src/                         # EXISTING: Web app (renderer)
│   ├── components/              # UI components
│   ├── hooks/                   # React hooks
│   ├── scene/                   # 3D visualization
│   ├── services/                # Business logic
│   │   └── storage/
│   │       ├── StorageInterface.ts    # Existing interface
│   │       ├── DexieStorage.ts        # Existing IndexedDB
│   │       ├── FileSystemStorage.ts   # NEW: Native file storage
│   │       └── index.ts               # Storage factory with detection
│   ├── models/                  # Data types
│   └── App.tsx                  # Main app
├── electron.vite.config.ts      # NEW: electron-vite configuration
├── vite.config.ts               # EXISTING: Web build config
└── package.json                 # Updated with electron scripts
```

### Structure Rationale

- **`electron/`**: Isolates Electron code from web app. Clean separation means web build doesn't include desktop code.
- **`electron/ipc/`**: Organizes IPC handlers by feature. Each file exports handlers that main.ts registers.
- **Storage factory**: Detects environment and returns appropriate storage implementation. Web uses Dexie, desktop can use file system.
- **Existing `src/`**: Minimal changes. React app continues to work as web build.

## Architectural Patterns

### Pattern 1: Dual Build Strategy

**What:** Maintain both web and Electron builds from the same codebase.

**When to use:** You want the app to work as both a website and desktop app.

**Trade-offs:**
- Pro: Maximum code reuse, single source of truth
- Pro: Users can choose deployment mode
- Con: Must handle platform detection gracefully
- Con: Some features may be desktop-only

**Implementation:**

```typescript
// electron.vite.config.ts - Electron build
export default {
  main: {
    build: { outDir: 'out/main' }
  },
  preload: {
    build: { outDir: 'out/preload' }
  },
  renderer: {
    root: '.',
    build: {
      outDir: 'out/renderer',
      rollupOptions: { input: 'index.html' }
    }
  }
}

// vite.config.ts - Web build (existing)
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' }
})
```

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",                           // Web dev
    "dev:electron": "electron-vite dev",     // Electron dev
    "build": "vite build",                   // Web production
    "build:electron": "electron-vite build", // Electron production
    "preview:electron": "electron-vite preview"
  }
}
```

### Pattern 2: Secure IPC Bridge

**What:** Expose only specific, validated APIs to renderer via preload script.

**When to use:** Always. This is the security model for modern Electron apps.

**Trade-offs:**
- Pro: Prevents arbitrary IPC messages from compromised renderer
- Pro: Type-safe API surface
- Con: More boilerplate than direct access
- Con: Must define explicit API for each native feature

**Implementation:**

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

// Type-safe API exposed to renderer
export interface ElectronAPI {
  // File operations
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>

  // App info
  getAppPath: () => Promise<string>
  getPlatform: () => string
}

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations - one method per IPC message
  showOpenDialog: (options) =>
    ipcRenderer.invoke('dialog:open', options),
  showSaveDialog: (options) =>
    ipcRenderer.invoke('dialog:save', options),
  readFile: (path) =>
    ipcRenderer.invoke('fs:read', path),
  writeFile: (path, content) =>
    ipcRenderer.invoke('fs:write', path, content),

  // App info
  getAppPath: () => ipcRenderer.invoke('app:getPath'),
  getPlatform: () => process.platform
} satisfies ElectronAPI)

// electron/main.ts
import { ipcMain, dialog, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'

// Register handlers
ipcMain.handle('dialog:open', async (event, options) => {
  // Validate sender
  if (!event.sender.getURL().startsWith('file://')) {
    throw new Error('Invalid sender')
  }
  return dialog.showOpenDialog(options)
})

ipcMain.handle('dialog:save', async (event, options) => {
  return dialog.showSaveDialog(options)
})

ipcMain.handle('fs:read', async (event, path) => {
  // Validate path is within allowed directory
  const appData = app.getPath('userData')
  if (!path.startsWith(appData)) {
    throw new Error('Path not allowed')
  }
  return readFile(path, 'utf-8')
})
```

```typescript
// src/utils/platform.ts - Platform detection for React app
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' &&
         window.electronAPI !== undefined
}

export const getElectronAPI = () => {
  if (!isElectron()) {
    throw new Error('Not running in Electron')
  }
  return window.electronAPI
}

// Global type declaration
declare global {
  interface Window {
    electronAPI?: import('../../electron/preload').ElectronAPI
  }
}
```

### Pattern 3: Storage Abstraction with Backend Detection

**What:** Extend existing StorageInterface to support file-based storage in Electron.

**When to use:** When you want native file access in desktop but IndexedDB in web.

**Trade-offs:**
- Pro: Leverages existing abstraction layer
- Pro: Single API for all storage operations
- Pro: Easy to add more backends later (cloud, etc.)
- Con: File system storage requires IPC round-trip

**Implementation:**

```typescript
// src/services/storage/FileSystemStorage.ts
import type { StorageInterface, FamilyTreeExport } from './StorageInterface'
import type { FamilyMember, Relationship } from '../../models'

export class FileSystemStorage implements StorageInterface {
  private dataPath: string | null = null
  private cache: { members: FamilyMember[], relationships: Relationship[] } | null = null
  private changeListeners: Set<() => void> = new Set()

  async initialize(): Promise<void> {
    const api = window.electronAPI!
    const appPath = await api.getAppPath()
    this.dataPath = `${appPath}/family-data.json`
    await this.loadFromDisk()
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const content = await window.electronAPI!.readFile(this.dataPath!)
      this.cache = JSON.parse(content)
    } catch {
      this.cache = { members: [], relationships: [] }
    }
  }

  private async saveToDisk(): Promise<void> {
    await window.electronAPI!.writeFile(
      this.dataPath!,
      JSON.stringify(this.cache, null, 2)
    )
    this.notifyChange()
  }

  // Implement StorageInterface methods using this.cache
  async getMember(id: string): Promise<FamilyMember | null> {
    return this.cache?.members.find(m => m.id === id) ?? null
  }

  async saveMember(member: FamilyMember): Promise<void> {
    const existing = this.cache!.members.findIndex(m => m.id === member.id)
    if (existing >= 0) {
      this.cache!.members[existing] = member
    } else {
      this.cache!.members.push(member)
    }
    await this.saveToDisk()
  }

  // ... rest of interface implementation
}

// src/services/storage/index.ts - Factory with detection
import { DexieStorage } from './DexieStorage'
import { FileSystemStorage } from './FileSystemStorage'
import type { StorageInterface } from './StorageInterface'

let storageInstance: StorageInterface | null = null

export async function getStorage(): Promise<StorageInterface> {
  if (storageInstance) return storageInstance

  // Detect environment
  if (typeof window !== 'undefined' && window.electronAPI) {
    const fs = new FileSystemStorage()
    await fs.initialize()
    storageInstance = fs
  } else {
    storageInstance = new DexieStorage()
  }

  return storageInstance
}

// For backwards compatibility
export const storage = new DexieStorage() // Will be replaced by factory
```

## Data Flow

### Native File Operations

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ React Component│     │ Preload Script │     │  Main Process  │
│                │     │                │     │                │
│ Save button    │     │ contextBridge  │     │ ipcMain.handle │
│     │          │     │     │          │     │     │          │
│     ▼          │     │     ▼          │     │     ▼          │
│ electronAPI.   │────►│ ipcRenderer.   │────►│ dialog.        │
│ showSaveDialog │     │ invoke()       │     │ showSaveDialog │
│                │     │                │     │     │          │
│     ▲          │     │     ▲          │     │     │          │
│     │          │◄────│     │          │◄────│     ▼          │
│ Promise result │     │ Promise        │     │ fs.writeFile   │
└────────────────┘     └────────────────┘     └────────────────┘
```

### Storage Operations (Electron Mode)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   useFamilyData    │     FileSystemStorage   │     Main Process     │
│    (hook)    │     │    (implements   │     │    (IPC handler) │
│              │     │   StorageInterface)    │                  │
│  addMember() │────►│  saveMember()    │────►│ fs:write handler │
│              │     │       │          │     │       │          │
│              │     │       ▼          │     │       ▼          │
│              │     │  writeFile IPC   │────►│ fs.writeFile()   │
│              │     │                  │     │                  │
│  onChange    │◄────│  notifyChange()  │     │                  │
│  callback    │     │                  │     │                  │
└──────────────┘     └──────────────────┘     └──────────────────┘
```

### Storage Operations (Web Mode)

```
┌──────────────┐     ┌──────────────────┐
│   useFamilyData    │     DexieStorage       │
│    (hook)    │     │    (existing)    │
│              │     │                  │
│  addMember() │────►│  saveMember()    │
│              │     │       │          │
│              │     │       ▼          │
│              │     │  IndexedDB       │
│              │     │                  │
│  onChange    │◄────│  Dexie hooks     │
└──────────────┘     └──────────────────┘
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user | Default file-based storage works fine |
| Large trees (10K+ members) | Consider lazy loading, pagination in 3D scene |
| Multiple files | Implement recent files list, file picker |
| Cloud sync | Add cloud storage backend to StorageInterface |

### Performance Notes

- **IndexedDB vs File System**: For Electron apps, file system storage in main process is often faster than IndexedDB in renderer because it avoids browser security layers.
- **IPC overhead**: Keep IPC messages chunked for large data. Don't send entire family tree in one message.
- **Renderer blocking**: Heavy file operations should be in main process to avoid blocking UI.

## Anti-Patterns

### Anti-Pattern 1: Exposing Full IPC API

**What people do:** Expose `ipcRenderer.send` or `ipcRenderer.invoke` directly to renderer.

**Why it's wrong:** Any compromised web content could send arbitrary IPC messages, executing any main process code.

**Do this instead:** Create specific, validated wrapper methods for each operation.

```typescript
// BAD - Never do this
contextBridge.exposeInMainWorld('ipc', ipcRenderer)

// GOOD - Specific methods only
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content: string) => ipcRenderer.invoke('file:save', content)
})
```

### Anti-Pattern 2: Node Integration in Renderer

**What people do:** Enable `nodeIntegration: true` in BrowserWindow for easier development.

**Why it's wrong:** Gives untrusted web content full Node.js access. Any XSS vulnerability becomes a system compromise.

**Do this instead:** Keep `nodeIntegration: false` (default) and use preload scripts with contextBridge.

### Anti-Pattern 3: Modifying Existing Web App for Electron

**What people do:** Add `if (isElectron)` checks throughout the React codebase.

**Why it's wrong:** Couples web app to desktop, makes testing harder, increases complexity.

**Do this instead:** Use the storage abstraction layer. Platform differences stay in the storage implementation and preload scripts, not in UI components.

```typescript
// BAD - Platform checks in components
function SaveButton() {
  const handleSave = async () => {
    if (isElectron()) {
      await window.electronAPI.showSaveDialog()
    } else {
      downloadAsBlob(data)
    }
  }
}

// GOOD - Abstraction handles it
function SaveButton() {
  const { exportTree } = useFamilyData() // Same API everywhere
  const handleSave = () => exportTree()
}
```

### Anti-Pattern 4: Blocking Main Process

**What people do:** Perform heavy computation or I/O in main process IPC handlers.

**Why it's wrong:** Main process is single-threaded. Blocking it freezes the entire application including window management.

**Do this instead:** Use worker threads for heavy computation, stream large files, or handle in renderer with web workers.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Native file system | IPC via preload | Use dialog.showOpenDialog for user selection |
| System tray | Main process | Optional, can add later |
| Auto-update | electron-updater | Recommended for production |
| Crash reporting | Sentry electron | Main + renderer integration |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React App <-> Native APIs | IPC via preload | Type-safe contextBridge |
| Storage <-> UI | Existing hooks | StorageInterface abstraction |
| Main <-> Preload | Direct require | Same process context |

## Build Order Implications

Recommended implementation sequence:

1. **electron-vite setup** - Configure build tool, verify React app loads in Electron window
2. **Basic main process** - Window creation, app lifecycle, dev tools
3. **Preload script skeleton** - Empty contextBridge, verify connection
4. **File dialog IPC** - First real native feature (low risk, high visibility)
5. **Export to native file** - Replace browser download with native save
6. **Import from native file** - Replace file input with native open
7. **Native storage backend** - Implement FileSystemStorage
8. **Storage factory** - Auto-detect and use appropriate backend
9. **Production build** - electron-builder configuration

This order minimizes risk: each step builds on the previous and can be tested independently. The web build continues working throughout.

## Sources

- [electron-vite Getting Started](https://electron-vite.org/guide/)
- [electron-vite Development Guide](https://electron-vite.org/guide/dev)
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- [RxDB Electron Database Patterns](https://rxdb.info/electron-database.html)
- [Electron Data Persistence Tutorial](https://10xdev.blog/electron-data-persistence/)

---
*Architecture research for: Electron + React + Vite desktop application*
*Researched: 2026-01-26*
