# Stack Research: Electron Integration

**Domain:** Desktop application wrapper for existing Vite + React + Three.js web app
**Researched:** 2026-01-26
**Confidence:** HIGH

## Executive Summary

Adding Electron to an existing Vite 7 + React 19 application is well-supported in 2026. The recommended stack uses **electron-vite** for build tooling (confirmed Vite 7 support in v4.0+) and **electron-builder** for packaging. This combination provides the fastest development experience with HMR for all processes and reliable cross-platform builds.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Electron | ^40.0.0 | Desktop runtime | Latest stable (Jan 2026). Includes Chromium 144, Node 24.11, V8 14.4. Provides consistent WebGL/Three.js rendering across platforms. |
| electron-vite | ^5.0.0 | Build tooling | Unified config for main/preload/renderer. Vite 7 support confirmed in v4.0+. HMR for renderer, hot reload for main/preload. |
| electron-builder | ^26.5.0 | Packaging & distribution | Most mature packaging solution. Higher download count (621K weekly), extensive customization, cross-platform builds from single OS. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-updater | ^6.8.1 | Auto-updates | When distributing outside app stores. Handles differential updates, code signing verification. |
| electron-store | ^10.0.0 | Persistent settings | For app preferences that should survive reinstalls. Alternative to IndexedDB for small config. |
| electron-log | ^5.1.0 | Logging | For production debugging. Logs to file with rotation. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| @electron/remote | Remote module access | Only if legacy code requires it. Prefer IPC for new code. |
| electron-devtools-installer | React DevTools in Electron | Install React DevTools extension in development mode. |

## Project Structure

electron-vite expects this structure (adapts to existing Vite project):

```
ancestree/
├── electron.vite.config.ts       # Unified electron-vite config
├── package.json                  # Updated with electron scripts
├── src/
│   ├── main/                     # NEW: Electron main process
│   │   └── index.ts
│   ├── preload/                  # NEW: Preload scripts
│   │   └── index.ts
│   └── renderer/                 # MOVE: Existing React app
│       ├── src/                  # Existing components, hooks, etc.
│       ├── index.html            # Existing entry point
│       └── ...
├── out/                          # Build output (electron-vite default)
└── dist/                         # Packaged app (electron-builder)
```

**Migration note:** Move existing `src/` contents to `src/renderer/src/` and `index.html` to `src/renderer/`.

## Configuration

### electron.vite.config.ts

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'src/main/index.ts'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'src/preload/index.ts'
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          index: 'src/renderer/index.html'
        }
      }
    },
    plugins: [react()]
  }
})
```

### package.json Updates

```json
{
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-vite build && electron-builder",
    "package:mac": "electron-vite build && electron-builder --mac",
    "package:win": "electron-vite build && electron-builder --win",
    "package:linux": "electron-vite build && electron-builder --linux"
  },
  "build": {
    "appId": "com.ancestree.app",
    "productName": "Ancestree",
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*"
    ],
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "resources/icon.icns"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "resources/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "resources/icon.png"
    }
  }
}
```

## Installation

```bash
# Core Electron dependencies
npm install electron electron-vite electron-builder -D

# Type definitions
npm install @types/electron -D

# Optional but recommended
npm install electron-updater electron-store electron-log

# Development tools
npm install electron-devtools-installer -D
```

## IPC Pattern (Security Best Practice)

**CRITICAL:** Never expose `ipcRenderer` directly. Use typed, minimal API surface.

### Preload Script (src/preload/index.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron'

// Typed API exposed to renderer
export interface ElectronAPI {
  // File dialogs
  openFile: () => Promise<string | null>
  saveFile: (content: string, defaultName: string) => Promise<string | null>

  // App info
  getAppVersion: () => Promise<string>

  // Window controls
  minimize: () => void
  maximize: () => void
  close: () => void
}

const electronAPI: ElectronAPI = {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content, defaultName) =>
    ipcRenderer.invoke('dialog:saveFile', content, defaultName),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
```

### Main Process Handler (src/main/index.ts)

```typescript
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { writeFile, readFile } from 'fs/promises'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,  // REQUIRED for security
      nodeIntegration: false,  // REQUIRED for security
    },
  })

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled) return null
  return readFile(result.filePaths[0], 'utf-8')
})

ipcMain.handle('dialog:saveFile', async (_event, content: string, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, content, 'utf-8')
  return result.filePath
})

ipcMain.handle('app:getVersion', () => app.getVersion())

app.whenReady().then(createWindow)
```

### TypeScript Declarations (src/renderer/src/electron.d.ts)

```typescript
interface ElectronAPI {
  openFile: () => Promise<string | null>
  saveFile: (content: string, defaultName: string) => Promise<string | null>
  getAppVersion: () => Promise<string>
  minimize: () => void
  maximize: () => void
  close: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| electron-vite | vite-plugin-electron | If you need more fine-grained control or simpler API. Same underlying maintainer (electron-vite org). electron-vite is more batteries-included. |
| electron-vite | Electron Forge + Vite | If you need first-party Electron tooling or app store distribution workflows. Note: Marked experimental as of v7.5.0, may have breaking changes. |
| electron-builder | Electron Forge | If you need first-party support for new Electron features immediately (ASAR integrity, universal macOS). electron-builder may lag slightly. |
| Electron | Tauri | If bundle size and memory are critical concerns. **NOT recommended for this project** due to WebGL/Three.js consistency issues across system WebViews (especially WebKit on macOS). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `nodeIntegration: true` | Critical security vulnerability. Renderer XSS can access full Node.js API. | contextBridge + IPC |
| Direct `ipcRenderer` exposure | Allows arbitrary IPC messages from compromised renderer. | Typed, minimal API via contextBridge |
| `BrowserRouter` (react-router) | Electron doesn't manage browser history. Breaks on page refresh. | `HashRouter` |
| `file://` protocol | Security issues, XSS can access local files. | Custom protocol or dev server |
| `@electron/remote` | Deprecated pattern, synchronous IPC, security concerns. | Async IPC via ipcRenderer.invoke |
| Tauri (for this project) | Inconsistent WebGL rendering across platforms. Three.js may behave differently on WebKit (macOS/Linux) vs Chromium (Windows). | Electron (bundled Chromium guarantees consistency) |

## Three.js / WebGL Considerations

**Why Electron over Tauri for Ancestree:**

Electron bundles Chromium, guaranteeing identical WebGL behavior on Windows, macOS, and Linux. Tauri uses system WebViews:
- Windows: Edge WebView2 (Chromium) - OK
- macOS: WebKit - Different WebGL implementation
- Linux: WebKitGTK - Different WebGL implementation

For a 3D visualization app using react-three-fiber, Electron ensures:
- Consistent shader compilation across platforms
- Identical Three.js renderer behavior
- Same WebGL extension availability
- Predictable performance characteristics

This is a **CRITICAL** consideration for Ancestree's 3D family tree visualization.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| electron-vite@5.0.0 | Vite 7.x | v4.0 added Vite 7 support (CHANGELOG verified) |
| electron-vite@5.0.0 | Node 20.19+, 22.12+ | Per official docs |
| electron@40.0.0 | Node 24.11.1 (bundled) | Uses its own Node, not system Node |
| electron-builder@26.5.0 | Electron 40.x | Latest stable, full compatibility |
| react@19.1.0 | Electron 40 renderer | Standard web compatibility |

## System Tray Integration

For Ancestree's system tray requirement:

```typescript
// src/main/tray.ts
import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow) {
  // Use 16x16 or 22x22 PNG for best results
  const icon = nativeImage.createFromPath(
    join(__dirname, '../../resources/tray-icon.png')
  )

  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Ancestree', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setToolTip('Ancestree')
  tray.setContextMenu(contextMenu)

  // Windows: Click to show window
  tray.on('click', () => mainWindow.show())
}
```

**Platform notes:**
- Windows: Use .ico for best quality, GUID recommended for signed apps
- macOS: Use template images (@2x) for dark/light mode support
- Linux: Requires libappindicator1 on some distributions

## Sources

**HIGH Confidence (Official/Verified):**
- [Electron Releases](https://releases.electronjs.org/) - Electron 40.0.0 current stable
- [electron-vite Getting Started](https://electron-vite.org/guide/) - v5.0.0, Node requirements
- [electron-vite GitHub Releases](https://github.com/alex8088/electron-vite/releases) - v5.0.0 Dec 2024
- [electron-vite CHANGELOG](https://github.com/alex8088/electron-vite/blob/master/CHANGELOG.md) - Vite 7 support in v4.0
- [electron-builder Releases](https://github.com/electron-userland/electron-builder/releases) - v26.5.0 Jan 2025
- [Electron contextBridge Docs](https://www.electronjs.org/docs/latest/api/context-bridge) - IPC security patterns
- [Electron Security Docs](https://www.electronjs.org/docs/latest/tutorial/security) - Best practices
- [Electron Dialog API](https://www.electronjs.org/docs/latest/api/dialog) - File dialog usage
- [Electron Tray API](https://www.electronjs.org/docs/latest/api/tray) - System tray

**MEDIUM Confidence (Verified with multiple sources):**
- [electron-vite Troubleshooting](https://electron-vite.org/guide/troubleshooting) - Common issues
- [npm trends comparison](https://npmtrends.com/electron-builder-vs-electron-forge-vs-electron-packager) - Package popularity
- [Electron Forge Why](https://www.electronforge.io/core-concepts/why-electron-forge) - Forge vs Builder philosophy

**LOW Confidence (Community sources, needs validation):**
- Tauri vs Electron WebGL consistency claims - Based on community reports, not systematic testing

---
*Stack research for: Electron desktop wrapper*
*Researched: 2026-01-26*
