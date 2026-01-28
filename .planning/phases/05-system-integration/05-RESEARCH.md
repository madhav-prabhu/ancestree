# Phase 5: System Integration - Research

**Researched:** 2026-01-27
**Domain:** Electron system tray, auto-updates with electron-updater, OS notifications
**Confidence:** HIGH

## Summary

This phase implements system tray presence and auto-update capability for Ancestree. The project already uses electron-builder 26.4.0 which includes the companion electron-updater package for auto-updates. The standard approach is: create a Tray instance with platform-appropriate icons, build context menus dynamically, configure electron-updater with GitHub Releases as the update provider, and use Electron's Notification API for OS-native update alerts.

The key complexity lies in cross-platform tray behavior. macOS requires template images (black + alpha channel) with the `Template` suffix, Windows expects ICO format and uses different click behavior, and Linux requires rebuilding the entire menu for any changes. For auto-updates, electron-updater handles the heavy lifting but requires careful configuration of `autoDownload: false` for user-controlled downloads and proper IPC communication for progress reporting.

User decisions from CONTEXT.md constrain implementation: close button quits entirely (no minimize-to-tray), platform-specific click behavior (macOS shows menu, Windows/Linux toggle window), and "install on quit" pattern (using `autoInstallOnAppQuit: true`). GitHub Releases is the update server, with OS-native notifications for update alerts.

**Primary recommendation:** Use Electron's built-in Tray class with platform-conditional icon paths, electron-updater with `autoDownload: false` and manual `downloadUpdate()` calls, and Electron's Notification API for update alerts. Extend existing preload API pattern for update progress IPC.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| electron (Tray, Notification) | ^40.0.0 | System tray icon, context menu, OS notifications | Already installed; built into Electron |
| electron-updater | ^6.x | Auto-update downloads and installation | Bundled with electron-builder; standard for Electron apps |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| electron-log | ^5.x | Structured logging for updater events | Optional but recommended for debugging update issues |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-updater | update-electron-app | update-electron-app is simpler but requires update.electronjs.org; electron-updater supports GitHub Releases directly |
| electron-updater | Squirrel.Windows | Squirrel has file lock issues on first launch; electron-updater is more reliable |
| Electron Notification | node-notifier | Electron's built-in Notification is sufficient and has no extra dependencies |

**Installation:**
```bash
npm install electron-updater
# Optional for logging:
npm install electron-log
```

## Architecture Patterns

### Recommended Project Structure
```
electron/
├── main/
│   ├── index.ts           # Main process entry, tray initialization
│   ├── menu.ts            # Application menu (existing)
│   ├── tray.ts            # NEW: Tray icon and context menu
│   ├── updater.ts         # NEW: Auto-updater logic
│   ├── ipc/
│   │   ├── fileHandlers.ts    # Existing file operations
│   │   └── updateHandlers.ts  # NEW: Update IPC handlers
│   └── services/
│       ├── autoSave.ts    # Existing auto-save
│       └── windowState.ts # Existing window state
├── preload/
│   ├── index.ts           # Preload script (extend with update channels)
│   └── index.d.ts         # Type declarations (extend with update types)
└── resources/
    └── icons/
        ├── tray/
        │   ├── iconTemplate.png      # macOS tray (16x16, black + alpha)
        │   ├── iconTemplate@2x.png   # macOS tray retina (32x32)
        │   ├── icon.ico              # Windows tray (16x16, 32x32 multi-res)
        │   └── icon.png              # Linux tray (16x16 or 22x22)
        └── tray-update/              # Optional: icons with update badge
            ├── iconUpdateTemplate.png
            └── ...
```

### Pattern 1: Tray Module with Dynamic Menu
**What:** Separate tray management into its own module with menu rebuild on state changes
**When to use:** Always for tray with dynamic content (current file, update status)
**Example:**
```typescript
// electron/main/tray.ts
// Source: https://www.electronjs.org/docs/latest/api/tray
import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import path from 'path'

let tray: Tray | null = null
let currentFilename: string | null = null
let updateAvailable = false

function getIconPath(): string {
  // Platform-specific icon paths
  if (process.platform === 'darwin') {
    // macOS: Template images for menu bar (auto-inverts for dark mode)
    return path.join(__dirname, '../resources/icons/tray/iconTemplate.png')
  } else if (process.platform === 'win32') {
    return path.join(__dirname, '../resources/icons/tray/icon.ico')
  } else {
    return path.join(__dirname, '../resources/icons/tray/icon.png')
  }
}

function buildContextMenu(mainWindow: BrowserWindow): Menu {
  const menuItems: Electron.MenuItemConstructorOptions[] = []

  // Show current file in menu header
  if (currentFilename) {
    menuItems.push(
      { label: currentFilename, enabled: false },
      { type: 'separator' }
    )
  }

  menuItems.push(
    {
      label: 'Show Window',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: 'Check for Updates',
      click: () => {
        // Trigger manual update check via IPC
        mainWindow.webContents.send('update:checkManual')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  )

  return Menu.buildFromTemplate(menuItems)
}

export function createTray(mainWindow: BrowserWindow): void {
  const icon = nativeImage.createFromPath(getIconPath())
  tray = new Tray(icon)

  tray.setToolTip('Ancestree')
  tray.setContextMenu(buildContextMenu(mainWindow))

  // Platform-specific click behavior (per CONTEXT.md decision)
  if (process.platform === 'darwin') {
    // macOS: click shows context menu (default behavior)
    // No additional handler needed
  } else {
    // Windows/Linux: click toggles window visibility
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  }
}

export function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (tray) {
    tray.setContextMenu(buildContextMenu(mainWindow))
  }
}

export function setCurrentFilename(filename: string | null): void {
  currentFilename = filename
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
```

### Pattern 2: Auto-Updater with Manual Download Control
**What:** Configure electron-updater for user-controlled updates with progress reporting
**When to use:** When user must initiate download (per CONTEXT.md decision)
**Example:**
```typescript
// electron/main/updater.ts
// Source: https://www.electron.build/auto-update.html
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow, Notification } from 'electron'

let mainWindow: BrowserWindow | null = null

export function initAutoUpdater(win: BrowserWindow): void {
  mainWindow = win

  // Disable automatic download (per CONTEXT.md: user clicks "Download")
  autoUpdater.autoDownload = false

  // Install silently on quit (per CONTEXT.md: no restart prompt)
  autoUpdater.autoInstallOnAppQuit = true

  // Optional: Enable logging for debugging
  // autoUpdater.logger = log

  // Event: Update available
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    // Show OS-native notification (per CONTEXT.md)
    const notification = new Notification({
      title: 'Update Available',
      body: `Ancestree ${info.version} is available. Click to download.`,
      silent: false
    })

    notification.on('click', () => {
      // Send to renderer to show in-app download UI
      mainWindow?.webContents.send('update:available', {
        version: info.version,
        releaseNotes: info.releaseNotes
      })
    })

    notification.show()

    // Also notify renderer for in-app handling
    mainWindow?.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update:notAvailable')
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    mainWindow?.webContents.send('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })

    // Also show in taskbar/dock
    mainWindow?.setProgressBar(progress.percent / 100)
  })

  autoUpdater.on('update-downloaded', () => {
    // Clear taskbar progress
    mainWindow?.setProgressBar(-1)

    mainWindow?.webContents.send('update:downloaded')

    // Show notification that update will install on quit
    new Notification({
      title: 'Update Ready',
      body: 'The update will be installed when you quit Ancestree.',
      silent: true
    }).show()
  })

  autoUpdater.on('error', (error: Error) => {
    mainWindow?.webContents.send('update:error', error.message)
    mainWindow?.setProgressBar(-1) // Clear progress on error
  })
}

export function checkForUpdates(): void {
  // Only check in packaged app
  if (!app.isPackaged) {
    console.log('Skipping update check in development')
    return
  }
  autoUpdater.checkForUpdates()
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate()
}

// Note: quitAndInstall() is available but not needed per CONTEXT.md
// since autoInstallOnAppQuit handles the install-on-quit pattern
```

### Pattern 3: IPC Channels for Updates (Extending Existing Pattern)
**What:** Extend the existing preload allowlist pattern for update-related IPC
**When to use:** For secure update status communication between main and renderer
**Example:**
```typescript
// electron/main/ipc/updateHandlers.ts
import { ipcMain } from 'electron'
import { checkForUpdates, downloadUpdate } from '../updater'

export function registerUpdateHandlers(): void {
  // Manual update check (from tray menu or renderer)
  ipcMain.handle('update:check', () => {
    checkForUpdates()
  })

  // User initiated download
  ipcMain.handle('update:download', () => {
    downloadUpdate()
  })
}
```

```typescript
// Additions to electron/preload/index.ts
const ALLOWED_CHANNELS = [
  // ... existing channels
  'update:check',
  'update:download'
] as const

const ALLOWED_RECEIVE_CHANNELS = [
  // ... existing channels
  'update:available',
  'update:notAvailable',
  'update:progress',
  'update:downloaded',
  'update:error',
  'update:checkManual'
] as const
```

### Anti-Patterns to Avoid
- **Global tray variable without reference:** Always store tray reference globally to prevent garbage collection
- **Modifying MenuItems directly:** On Linux, changes don't take effect; always rebuild entire menu with `Menu.buildFromTemplate()`
- **Hardcoded icon paths:** Use `__dirname` or `app.getAppPath()` for reliable paths in packaged app
- **Calling autoUpdater in development:** Always check `app.isPackaged` before update operations
- **Using quitAndInstall() with restart:** Per CONTEXT.md, use `autoInstallOnAppQuit: true` instead

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Update metadata | Custom version checking | electron-updater + latest.yml | Handles all platforms, signatures, rollbacks |
| Download with progress | Custom HTTP download | autoUpdater.downloadUpdate() | Resume support, verification, atomic writes |
| Install on quit | Manual installer invocation | autoInstallOnAppQuit: true | Handles process cleanup, Windows UAC, macOS permissions |
| OS notifications | Custom notification UI | Electron Notification API | Native appearance, action center integration |
| Tray icon dark mode | Manual icon switching | macOS Template images | Automatic inversion for light/dark mode |

**Key insight:** Electron and electron-updater handle many platform-specific edge cases (Windows UAC, macOS Gatekeeper, Linux desktop environments). Custom solutions miss these and cause support issues.

## Common Pitfalls

### Pitfall 1: Tray Garbage Collection
**What goes wrong:** Tray icon disappears randomly after a few minutes
**Why it happens:** JavaScript garbage collector destroys the Tray object if not stored in a persistent reference
**How to avoid:** Store tray in module-level or global variable: `let tray: Tray | null = null`
**Warning signs:** Tray appears initially then vanishes; no errors in console

### Pitfall 2: macOS Template Image Colors
**What goes wrong:** Tray icon looks wrong in dark mode or appears as solid black square
**Why it happens:** macOS template images must be black + alpha only; using colors or non-template naming
**How to avoid:** Use only black (#000000) and transparency; filename must end with `Template` (e.g., `iconTemplate.png`)
**Warning signs:** Icon doesn't adapt to menu bar color; icon is visible only in one mode

### Pitfall 3: Linux Menu Updates Not Reflected
**What goes wrong:** Context menu shows stale data after calling menu item update
**Why it happens:** Linux requires complete menu rebuild; modifying MenuItem properties doesn't trigger update
**How to avoid:** Always call `tray.setContextMenu(Menu.buildFromTemplate(newTemplate))` for any change
**Warning signs:** Works on macOS/Windows but not on Linux

### Pitfall 4: Update Check in Development
**What goes wrong:** Error: "Cannot find latest.yml" or similar during development
**Why it happens:** electron-updater expects production build with metadata files
**How to avoid:** Guard with `if (!app.isPackaged) return` or use `dev-app-update.yml` for testing
**Warning signs:** Errors on `npm run dev:electron` but works in packaged app

### Pitfall 5: download-progress Event Not Firing
**What goes wrong:** Update downloads but progress events never fire
**Why it happens:** Known issue in some electron-updater versions; related to HTTP caching or redirect handling
**How to avoid:** Update to latest electron-updater; implement timeout fallback; show indeterminate progress as backup
**Warning signs:** `update-available` and `update-downloaded` fire but no progress events between

### Pitfall 6: quitAndInstall Process Lock on Windows
**What goes wrong:** Update installer shows "app is running" dialog; requires manual task manager kill
**Why it happens:** Electron process or child process holds file lock; quitAndInstall() doesn't fully terminate
**How to avoid:** Use `autoInstallOnAppQuit: true` instead of calling `quitAndInstall()` (per CONTEXT.md decision)
**Warning signs:** Works in testing but users report update installation failures

### Pitfall 7: Private Repository Without Token
**What goes wrong:** Update check fails with 404 or rate limit errors
**Why it happens:** GitHub API requires authentication for private repos; rate limits apply without token
**How to avoid:** For private repos, set `GH_TOKEN` environment variable on user machines; for public repos, no token needed
**Warning signs:** Works locally (with git credentials) but fails for end users

## Code Examples

Verified patterns from official sources:

### GitHub Releases Publish Configuration
```yaml
# electron-builder.yml additions
# Source: https://www.electron.build/publish.html
publish:
  provider: github
  owner: your-github-username
  repo: ancestree
  releaseType: release  # or 'draft' for manual publishing
```

### Check for Updates on Launch
```typescript
// In electron/main/index.ts app.whenReady()
// Source: https://www.electron.build/auto-update.html
import { initAutoUpdater, checkForUpdates } from './updater'

app.whenReady().then(() => {
  // ... existing setup
  createWindow()

  // Initialize updater after window exists
  if (mainWindow) {
    initAutoUpdater(mainWindow)
  }

  // Check for updates on launch (per CONTEXT.md)
  // Delay slightly to not block startup
  setTimeout(() => {
    checkForUpdates()
  }, 3000)
})
```

### Platform-Specific Tray Icons
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/tray
import { nativeImage } from 'electron'
import path from 'path'

function getTrayIcon(): Electron.NativeImage {
  const iconDir = path.join(__dirname, '../resources/icons/tray')

  if (process.platform === 'darwin') {
    // macOS: Template image (black + alpha, auto-inverts)
    // Must include @2x for Retina
    return nativeImage.createFromPath(
      path.join(iconDir, 'iconTemplate.png')
    )
  } else if (process.platform === 'win32') {
    // Windows: ICO with multiple sizes embedded
    return nativeImage.createFromPath(
      path.join(iconDir, 'icon.ico')
    )
  } else {
    // Linux: PNG, typically 22x22 for Unity/GNOME
    return nativeImage.createFromPath(
      path.join(iconDir, 'icon.png')
    )
  }
}
```

### Taskbar/Dock Progress Bar
```typescript
// Source: https://www.electronjs.org/docs/latest/tutorial/progress-bar
import { BrowserWindow } from 'electron'

function setDownloadProgress(win: BrowserWindow, percent: number): void {
  // 0-1 for actual progress
  // > 1 for indeterminate (Windows)
  // -1 to remove
  win.setProgressBar(percent / 100)
}

function clearProgress(win: BrowserWindow): void {
  win.setProgressBar(-1)
}
```

### OS-Native Notification for Updates
```typescript
// Source: https://www.electronjs.org/docs/latest/api/notification
import { Notification } from 'electron'

function showUpdateNotification(version: string, releaseNotes?: string): void {
  // Check if notifications are supported
  if (!Notification.isSupported()) {
    console.log('Notifications not supported on this platform')
    return
  }

  const notification = new Notification({
    title: 'Update Available',
    body: `Ancestree ${version} is ready to download.`,
    silent: false,  // Play notification sound
    // icon: path.join(__dirname, 'icon.png')  // Optional custom icon
  })

  notification.on('click', () => {
    // Handle notification click (e.g., focus window, show update UI)
    mainWindow?.show()
    mainWindow?.focus()
  })

  notification.show()
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Squirrel.Windows | electron-updater | Stable since electron-builder 20+ | No file lock issues on first launch |
| Manual NSIS installer invocation | autoInstallOnAppQuit | electron-updater 4.x+ | Cleaner quit-and-update flow |
| electron's built-in autoUpdater | electron-updater | Original electron-builder | More features, better cross-platform |
| Polling for updates | checkForUpdates() on events | Best practice | Reduced bandwidth, user control |

**Deprecated/outdated:**
- **setFeedURL():** Don't call it; electron-builder creates `app-update.yml` automatically
- **Squirrel.Windows:** Replaced by NSIS + electron-updater for better reliability
- **Custom update servers:** GitHub Releases is free and well-supported; custom servers add complexity

## Open Questions

Things that couldn't be fully resolved:

1. **Tray Icon Visibility Timing**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - Options: Always visible after app launch vs only when minimized
   - Recommendation: **Always visible after launch** - consistent with user expectations for desktop apps, provides persistent access point

2. **Update Check Frequency**
   - What we know: CONTEXT.md specifies "on launch" but leaves frequency to discretion
   - Options: On launch only, daily, every N hours
   - Recommendation: **On launch only** - respects user bandwidth, update-on-quit means users get updates naturally when they restart the app

3. **Progress Indicator Placement**
   - What we know: CONTEXT.md allows tray tooltip, in-app, or both
   - Recommendation: **Both taskbar progress + in-app UI** - taskbar shows system-wide progress, in-app provides detailed control

4. **Tray Status Indicators (Update Badge)**
   - What we know: CONTEXT.md allows badge for update available
   - Recommendation: **Simple approach first** - avoid custom badge icons initially; rely on notification + menu item. Add badge later if user feedback requests it

## Sources

### Primary (HIGH confidence)
- [Electron Tray API](https://www.electronjs.org/docs/latest/api/tray) - Complete Tray class documentation
- [Electron Notification API](https://www.electronjs.org/docs/latest/api/notification) - Native notification documentation
- [electron-builder Auto Update](https://www.electron.build/auto-update.html) - electron-updater configuration
- [electron-builder Publish](https://www.electron.build/publish.html) - GitHub Releases configuration
- [Electron Progress Bar Tutorial](https://www.electronjs.org/docs/latest/tutorial/progress-bar) - setProgressBar API
- [Electron Tray Menu Tutorial](https://www.electronjs.org/docs/latest/tutorial/tray) - Platform-specific guidance

### Secondary (MEDIUM confidence)
- [electron-updater jsDocs](https://www.jsdocs.io/package/electron-updater) - Full API reference
- [electron-updater-example GitHub](https://github.com/iffy/electron-updater-example) - Working example repo
- [Electron nativeImage](https://www.electronjs.org/docs/latest/api/native-image) - Template image documentation

### Tertiary (LOW confidence)
- Community GitHub issues on electron-updater - Known issues and workarounds
- Blog posts on Electron auto-update patterns - May need adaptation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Electron built-ins and electron-updater are well-documented
- Architecture: HIGH - Patterns verified from official docs and existing project structure
- Pitfalls: HIGH - Documented in official docs and GitHub issues
- Platform specifics: MEDIUM - Some behaviors vary by OS version

**Research date:** 2026-01-27
**Valid until:** 60 days (Electron APIs stable; electron-updater follows Electron releases)
