---
phase: 01
plan: 01
subsystem: electron-foundation
tags: [electron, electron-vite, security, ipc, preload]

dependency-graph:
  requires: []
  provides:
    - electron-main-process
    - electron-preload-bridge
    - electron-vite-config
  affects:
    - 01-02 (file dialogs will use IPC channels)
    - 02-xx (all Phase 2 IPC features)

tech-stack:
  added:
    - electron@40.0.0
    - electron-vite@5.0.0
    - electron-builder@26.4.0
    - "@electron-toolkit/preload@3.0.2"
    - "@electron-toolkit/utils@4.0.0"
  patterns:
    - contextBridge IPC with channel allowlist
    - single instance lock
    - external link interception

key-files:
  created:
    - electron.vite.config.ts
    - electron/main/index.ts
    - electron/preload/index.ts
    - electron/preload/index.d.ts
  modified:
    - package.json
    - src/vite-env.d.ts
    - .gitignore

decisions:
  - decision: "Use channel allowlist pattern for IPC security"
    rationale: "Prevents renderer from invoking arbitrary IPC handlers"
  - decision: "Build preload as ESM (.mjs) via electron-vite"
    rationale: "Matches project type:module configuration"
  - decision: "Add out/ to .gitignore"
    rationale: "Build artifacts should not be committed"

metrics:
  duration: "~5 minutes"
  completed: 2026-01-27
---

# Phase 01 Plan 01: Electron Foundation Setup Summary

**One-liner:** Electron runtime with secure BrowserWindow, contextBridge IPC skeleton, and electron-vite unified builds

## What Was Built

### 1. Electron-vite Build Configuration
- Unified build config for main, preload, and renderer processes
- Main and preload use `externalizeDepsPlugin` for Node.js deps
- Renderer reuses existing React/Vite setup with `base: './'` for file:// protocol

### 2. Secure Main Process (`electron/main/index.ts`)
- **Single instance lock**: Prevents multiple instances (IndexedDB locking issues)
- **BrowserWindow with all security settings**:
  - `contextIsolation: true` - isolate preload from renderer
  - `nodeIntegration: false` - no Node.js in renderer
  - `sandbox: true` - OS-level sandboxing
  - `webSecurity: true` - same-origin policy
  - `allowRunningInsecureContent: false`
- **External link handling**: HTTP/HTTPS links open in system browser via `shell.openExternal`
- **Platform lifecycle**: macOS activate handling, proper quit behavior

### 3. Preload Script with IPC Bridge (`electron/preload/index.ts`)
- Exposes `window.electronAPI` via contextBridge
- `isElectron: true` flag for renderer context detection
- `invoke()` wrapper with channel allowlist (empty, ready for Phase 2)
- Invalid channels rejected with error
- TypeScript declarations for type-safe renderer usage

### 4. Package.json Updates
- `main` entry pointing to compiled main process
- New scripts: `dev:electron`, `build:electron`, `preview:electron`
- Existing web scripts preserved (`dev`, `build`, `test`)

## Verification Results

| Check | Status | Notes |
|-------|--------|-------|
| `npm run build:electron` | PASS | Creates out/main, out/preload, out/renderer |
| `npm run build` | PASS | Web build unaffected |
| Security settings | PASS | contextIsolation, nodeIntegration, sandbox all correct |
| Preload pattern | PASS | contextBridge.exposeInMainWorld used |
| Min lines met | PASS | main:137, preload:48, preload.d.ts:37, config:39 |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 47e3cfc | Install Electron dependencies and configure electron-vite |
| 2 | e4441fc | Implement secure main process with BrowserWindow |
| 3 | 572e4f3 | Create secure preload script with IPC bridge skeleton |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### IPC Security Pattern
The preload script uses a channel allowlist pattern:
```typescript
const ALLOWED_CHANNELS: string[] = []  // Add channels in Phase 2

invoke: async (channel: string, ...args: unknown[]) => {
  if (!ALLOWED_CHANNELS.includes(channel)) {
    throw new Error(`Invalid channel: ${channel}`)
  }
  return ipcRenderer.invoke(channel, ...args)
}
```

This prevents the renderer from invoking arbitrary IPC handlers - only explicitly allowed channels can be called.

### External Link Handling
Two mechanisms prevent in-app navigation to external URLs:
1. `setWindowOpenHandler` - intercepts `window.open()` and `target="_blank"`
2. `will-navigate` event - intercepts same-window navigation

Both open external URLs in system browser via `shell.openExternal()`.

## Next Phase Readiness

Phase 1 Plan 2 prerequisites met:
- [x] Main process running
- [x] IPC bridge exposed to renderer
- [x] Empty channel allowlist ready for file dialog channels
- [x] Security configuration in place

Ready to implement file dialogs and native I/O.
