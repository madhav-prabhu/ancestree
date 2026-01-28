# Phase 1: Electron Foundation - Research

**Researched:** 2026-01-26
**Domain:** Electron desktop wrapper with electron-vite for existing React + Vite + Three.js app
**Confidence:** HIGH

## Summary

Phase 1 establishes the Electron foundation for Ancestree, wrapping the existing React 19 + Vite 7 + Three.js web application in a secure desktop shell. The research confirms electron-vite 5.0 as the optimal build tooling, providing unified configuration for main/preload/renderer processes with HMR support. The critical architectural decision is establishing security boundaries from day one: `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` are non-negotiable defaults.

The existing codebase uses `BrowserRouter` which will not work in Electron's `file://` protocol production builds. This must be changed to `HashRouter` for Electron, or a dual-router pattern implemented if web deployment must be preserved. The existing Vite config is minimal and can be extended for electron-vite with the addition of `base: './'` for production asset loading.

**Primary recommendation:** Use electron-vite 5.0 with a custom project structure that keeps the existing `src/` as the renderer, adding `electron/main/` and `electron/preload/` for Electron-specific code. Implement an empty IPC bridge skeleton in Phase 1 that future phases will populate.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron | 40.0.0 | Desktop runtime | Latest stable, Chromium 144 for consistent WebGL/Three.js |
| electron-vite | 5.0.0 | Build tooling | Unified main/preload/renderer config, Vite 7 support |
| @electron-toolkit/preload | 3.0.0 | Preload utilities | Type-safe contextBridge helpers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @electron-toolkit/utils | 3.0.0 | Main process utilities | Platform detection, is.dev checks |
| electron-builder | 26.5.0 | Packaging (Phase 4) | Install now, configure later |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-vite | Electron Forge + Vite plugin | Forge's Vite support is experimental (v7.5.0+), electron-vite more mature |
| electron-vite | vite-plugin-electron | Less integrated, requires more manual config |
| HashRouter | MemoryRouter | Works but less intuitive for multi-page apps |

**Installation:**
```bash
npm install -D electron electron-vite electron-builder
npm install -D @electron-toolkit/preload @electron-toolkit/utils
```

## Architecture Patterns

### Recommended Project Structure
```
ancestree/
├── electron/
│   ├── main/
│   │   └── index.ts          # Main process entry
│   └── preload/
│       ├── index.ts          # Preload script entry
│       └── index.d.ts        # Type declarations for renderer
├── src/                      # Existing React app (renderer)
│   ├── components/
│   ├── scene/
│   ├── services/
│   └── ...
├── index.html                # Existing, keep at root
├── electron.vite.config.ts   # NEW: electron-vite config
├── vite.config.ts            # Keep for web-only builds
└── package.json
```

**Rationale:** This structure keeps the existing `src/` intact, adding Electron-specific code in a separate `electron/` folder. The existing `vite.config.ts` remains for web builds; `electron.vite.config.ts` handles Electron builds.

### Pattern 1: Secure IPC Bridge Skeleton

**What:** Empty API surface exposed via contextBridge, ready for future features
**When to use:** Always - establishes security pattern from Phase 1

```typescript
// electron/preload/index.ts
// Source: https://www.electronjs.org/docs/latest/tutorial/context-isolation
import { contextBridge, ipcRenderer } from 'electron'

// Expose a minimal, typed API to the renderer
// Phase 1: Empty skeleton, populated in later phases
const electronAPI = {
  // Phase 2 will add: openFile, saveFile
  // Phase 3 will add: storage operations

  // Utility: Check if running in Electron
  isElectron: true,

  // Placeholder for future IPC channels
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    // Allowlist of valid channels (currently empty)
    const validChannels: string[] = []
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`))
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI
```

```typescript
// electron/preload/index.d.ts
// Type declarations for use in renderer
export interface ElectronAPI {
  isElectron: boolean
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
```

### Pattern 2: Secure BrowserWindow Configuration

**What:** Window creation with all security settings enabled
**When to use:** Every BrowserWindow creation

```typescript
// electron/main/index.ts
// Source: https://www.electronjs.org/docs/latest/tutorial/security
import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      // Security: All three MUST be set correctly
      contextIsolation: true,    // Isolate preload from renderer
      nodeIntegration: false,    // No Node.js in renderer
      sandbox: true,             // OS-level sandboxing
      // Additional hardening
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    // Show window after content loads (prevents flash)
    show: false,
  })

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // External links open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  return mainWindow
}
```

### Pattern 3: Development vs Production Loading

**What:** Load dev server in development, bundled files in production
**When to use:** Main process window loading

```typescript
// electron/main/index.ts
// Source: https://electron-vite.org/guide/hmr-and-hot-reloading
function loadWindow(window: BrowserWindow): void {
  // electron-vite sets ELECTRON_RENDERER_URL in dev mode
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    // Production: load from bundled files
    window.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}
```

### Pattern 4: Single Instance Lock

**What:** Prevent multiple app instances, focus existing window
**When to use:** App initialization

```typescript
// electron/main/index.ts
// Source: https://www.electronjs.org/docs/latest/api/app
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus existing window when user tries to open another instance
    const window = BrowserWindow.getAllWindows()[0]
    if (window) {
      if (window.isMinimized()) window.restore()
      window.focus()
    }
  })

  app.whenReady().then(createWindow)
}
```

### Pattern 5: Dual Router Support (Web + Electron)

**What:** Use HashRouter in Electron, BrowserRouter in web
**When to use:** If maintaining both web and desktop builds

```typescript
// src/Router.tsx - Modified for dual support
// Source: https://gist.github.com/Arkellys/96359e7ba19e98260856c897bc378606
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import { TimelinePage } from './pages/TimelinePage'

// Detect Electron environment
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/timeline" element={<TimelinePage />} />
    </Routes>
  )
}

export function Router() {
  // Use HashRouter in Electron (file:// protocol)
  // Use BrowserRouter in web (http:// protocol)
  if (isElectron()) {
    return (
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    )
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

### Anti-Patterns to Avoid

- **Exposing raw ipcRenderer:** Never pass `ipcRenderer.send` or `ipcRenderer.on` directly to renderer. Always wrap in specific, validated functions.
- **Disabling security for convenience:** `nodeIntegration: true` or `contextIsolation: false` seems easier but creates critical vulnerabilities.
- **Using BrowserRouter in Electron:** Will cause blank screens in production builds due to `file://` protocol.
- **Forgetting single instance lock:** Multiple instances cause IndexedDB locking issues, especially on Windows.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IPC type safety | Manual types per channel | @electron-toolkit/preload | Provides type-safe contextBridge utilities |
| Dev vs prod detection | `process.env.NODE_ENV` checks | `app.isPackaged` or `@electron-toolkit/utils` | More reliable, accounts for all build scenarios |
| Window state persistence | Manual localStorage | electron-window-state | Handles multi-monitor edge cases |
| External link handling | Click event listeners | `setWindowOpenHandler` + `shell.openExternal` | Covers all link types (anchor, window.open) |

**Key insight:** Electron's security model requires careful implementation. Using well-tested utilities prevents subtle security holes that are difficult to detect.

## Common Pitfalls

### Pitfall 1: Asset Loading Breaks in Production

**What goes wrong:** App works in dev but shows blank screen or missing images in packaged build
**Why it happens:** Vite's default `base: '/'` creates absolute paths that fail with `file://` protocol
**How to avoid:** Set `base: './'` in electron.vite.config.ts renderer section
**Warning signs:** Works with `electron-vite dev` but fails with `electron-vite preview`

### Pitfall 2: Router Blank Screen

**What goes wrong:** Routes work in dev, blank page in production
**Why it happens:** BrowserRouter requires a server; Electron loads static files
**How to avoid:** Use HashRouter in Electron builds
**Warning signs:** `index.html` loads but navigation fails, URL shows `file:///path/index.html` not `file:///path/index.html#/`

### Pitfall 3: Security Misconfiguration

**What goes wrong:** XSS vulnerability becomes Remote Code Execution
**Why it happens:** `nodeIntegration: true` or `contextIsolation: false` exposes Node.js to renderer
**How to avoid:** Keep all three security settings: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
**Warning signs:** Code works "easier" without preload scripts (this is the trap)

### Pitfall 4: Module Format Mismatch

**What goes wrong:** `Error [ERR_REQUIRE_ESM]: require() of ES Module`
**Why it happens:** ES-only dependencies in CommonJS context, or vice versa
**How to avoid:** electron-vite handles this automatically for main/preload; ensure consistent module type
**Warning signs:** Works in dev, fails in build; works on one platform, fails on another

### Pitfall 5: HMR Not Working for Main/Preload

**What goes wrong:** Changes to main.ts or preload.ts require manual restart
**Why it happens:** Not using watch mode, or preload changes don't trigger reload
**How to avoid:** Use `electron-vite dev --watch`
**Warning signs:** Renderer HMR works but Electron-side changes seem ignored

## Code Examples

Verified patterns from official sources:

### electron.vite.config.ts - Complete Configuration

```typescript
// electron.vite.config.ts
// Source: https://electron-vite.org/config/
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'electron/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [react()],
    // CRITICAL: Relative base for file:// protocol
    base: './',
  }
})
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:electron": "electron-vite dev --watch",
    "build": "tsc -b && vite build",
    "build:electron": "electron-vite build",
    "preview:electron": "electron-vite preview",
    "test": "vitest"
  },
  "main": "./out/main/index.js"
}
```

### Complete Main Process Entry

```typescript
// electron/main/index.ts
// Source: Electron official docs + electron-vite guide
import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Intercept navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Load app
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// Handle second instance
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// macOS: re-create window when dock icon clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Create window when ready
app.whenReady().then(createWindow)
```

### Platform Detection Utility

```typescript
// src/utils/platform.ts
// Utility for detecting Electron vs web environment

export function isElectron(): boolean {
  return typeof window !== 'undefined' &&
         typeof window.electronAPI !== 'undefined' &&
         window.electronAPI.isElectron === true
}

export function getElectronAPI() {
  if (!isElectron()) {
    return null
  }
  return window.electronAPI
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| remote module | IPC + contextBridge | Electron 14 (deprecated), removed in 28 | Must use preload scripts |
| nodeIntegration: true | nodeIntegration: false + sandbox | Electron 20 (sandbox default) | Security-first default |
| CommonJS main process | ESM support | Electron 28+ | Can use ES modules in main |
| Manual Vite config | electron-vite unified config | electron-vite 1.0 (2022) | Single config file |

**Deprecated/outdated:**
- `remote` module: Removed in Electron 28, use IPC instead
- `nodeIntegration: true`: Security anti-pattern, never enable
- Electron Forge Vite plugin: Marked experimental (v7.5.0+), prefer electron-vite

## Open Questions

Things that couldn't be fully resolved:

1. **Vite 7 Compatibility Confirmation**
   - What we know: electron-vite 5.0 claims Vite 5.0+ support, CHANGELOG mentions Vite 7 support in v4.0+
   - What's unclear: No explicit Vite 7.0.0 compatibility statement found
   - Recommendation: Test early in implementation; fallback to vite-plugin-electron if issues arise

2. **Three.js GPU Context in Electron**
   - What we know: Chromium 144 in Electron 40 supports WebGL2
   - What's unclear: Whether GPU acceleration requires specific Electron flags
   - Recommendation: Test 3D rendering early; document any required command-line flags

3. **TypeScript Config for Dual Builds**
   - What we know: Need separate TS configs for main (Node) vs renderer (browser)
   - What's unclear: Best way to share types between main/preload/renderer
   - Recommendation: Create `tsconfig.electron.json` extending base config

## Sources

### Primary (HIGH confidence)
- [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security) - Security checklist, webPreferences
- [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) - contextBridge patterns
- [electron-vite Getting Started](https://electron-vite.org/guide/) - Installation, project structure
- [electron-vite Configuration](https://electron-vite.org/config/) - Config options, entry points
- [electron-vite HMR Guide](https://electron-vite.org/guide/hmr-and-hot-reloading) - Development workflow

### Secondary (MEDIUM confidence)
- [React+Electron Common Issues](https://gist.github.com/Arkellys/96359e7ba19e98260856c897bc378606) - Router patterns, asset loading
- [Electron IPC TypeScript Patterns](https://blog.logrocket.com/electron-ipc-response-request-architecture-with-typescript/) - Type-safe IPC
- [electron-vite Troubleshooting](https://electron-vite.org/guide/troubleshooting) - Common build issues

### Tertiary (LOW confidence)
- WebSearch results on Electron + Three.js GPU handling - Not verified with official sources
- Community discussions on electron-vite + Vite 7 - No official confirmation found

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Electron releases, electron-vite documentation
- Architecture: HIGH - Patterns from official Electron security tutorial
- Pitfalls: HIGH - Documented in electron-vite troubleshooting and community resources
- Development workflow: HIGH - Verified in electron-vite HMR guide

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable ecosystem)
