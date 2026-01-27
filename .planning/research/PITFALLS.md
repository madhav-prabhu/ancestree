# Pitfalls Research: Electron + React Integration

**Domain:** Desktop Application - Electron with React 19 + Vite 7 + Three.js
**Researched:** 2026-01-26
**Confidence:** HIGH (verified with official Electron docs and electron-vite documentation)

## Critical Pitfalls

### Pitfall 1: Security Misconfiguration - Disabling Context Isolation

**What goes wrong:**
Developers disable `contextIsolation` or enable `nodeIntegration` in renderer processes to "make things work faster," exposing the app to remote code execution (RCE) attacks. An XSS vulnerability in the renderer can escalate to full system compromise.

**Why it happens:**
- Legacy tutorials recommend `nodeIntegration: true` for simplicity
- Developers want to use Node.js APIs directly in React components
- Frustration with IPC boilerplate leads to shortcuts

**How to avoid:**
1. Keep `contextIsolation: true` (default since Electron 12)
2. Keep `nodeIntegration: false` (default)
3. Enable `sandbox: true` for renderer processes
4. Use `contextBridge` in preload scripts to expose only specific, validated APIs
5. Never expose raw IPC channels to renderer

```javascript
// WRONG - exposes everything
contextBridge.exposeInMainWorld('api', ipcRenderer);

// CORRECT - expose specific, validated methods
contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveTree: (data) => ipcRenderer.invoke('tree:save', sanitize(data))
});
```

**Warning signs:**
- BrowserWindow config contains `nodeIntegration: true`
- Preload script exposes `ipcRenderer` or `require` directly
- Console warnings about security misconfigurations
- Code using `remote` module (deprecated, insecure)

**Phase to address:**
Phase 1 - Initial Electron Integration. Security must be configured correctly from the start; retrofitting is painful.

---

### Pitfall 2: Three.js Memory Leaks in Electron

**What goes wrong:**
WebGL resources (geometries, textures, materials) accumulate in GPU memory when React components unmount without proper cleanup. In Electron, this is especially severe because users don't refresh the page - the app runs for hours/days, causing memory exhaustion, GPU crashes, or app freezes.

**Why it happens:**
- `scene.remove(object)` does NOT dispose GPU memory
- React's automatic cleanup doesn't extend to Three.js resources
- react-three-fiber abstracts disposal, but custom objects need manual handling
- WebGLRenderer recreation on route changes leaks GPU contexts

**How to avoid:**
1. Always call `.dispose()` on geometries, materials, and textures
2. Implement cleanup in useEffect return functions
3. Reuse WebGLRenderer instance across route changes
4. Use `invalidateFrameloop` for on-demand rendering
5. Monitor with `renderer.info.memory` in development

```typescript
// Proper cleanup in React Three Fiber
useEffect(() => {
  return () => {
    geometry.dispose();
    material.dispose();
    if (texture) texture.dispose();
  };
}, []);
```

**Warning signs:**
- `renderer.info.memory.geometries` growing without bounds
- GPU memory usage increasing over time (visible in Task Manager)
- App becoming sluggish after extended use
- Chrome DevTools showing WebGL context warnings

**Phase to address:**
Phase 2 - Core Features. Must be addressed when integrating existing Three.js scene with Electron lifecycle.

---

### Pitfall 3: IPC Message Validation Bypass

**What goes wrong:**
Main process blindly trusts IPC messages from renderer, allowing malicious renderer code (via XSS or compromised dependencies) to execute privileged operations like file system access, arbitrary command execution, or data exfiltration.

**Why it happens:**
- IPC handlers assume messages come from trusted code
- No validation of message sender or content
- Pattern-matching on channel names instead of explicit allowlists

**How to avoid:**
1. Validate `event.senderFrame` in IPC handlers
2. Implement strict input validation for all IPC arguments
3. Use TypeScript types but also runtime validation (Zod, etc.)
4. Limit file system operations to specific directories
5. Never construct shell commands from IPC arguments

```typescript
// WRONG - trusts all input
ipcMain.handle('file:save', async (event, path, data) => {
  await fs.writeFile(path, data); // Arbitrary file write!
});

// CORRECT - validate sender and sanitize input
ipcMain.handle('file:save', async (event, filename, data) => {
  // Verify sender is expected window
  if (!validateSender(event.senderFrame)) return;

  // Restrict to safe directory, validate filename
  const safeName = path.basename(filename);
  const safePath = path.join(app.getPath('userData'), 'trees', safeName);
  await fs.writeFile(safePath, data);
});
```

**Warning signs:**
- IPC handlers accepting file paths directly from renderer
- No sender validation in ipcMain handlers
- Dynamic channel names based on renderer input
- File operations outside userData directory

**Phase to address:**
Phase 1 - Initial Electron Integration. IPC patterns established early propagate throughout codebase.

---

### Pitfall 4: Asset Loading Breaks in Production

**What goes wrong:**
App works perfectly in development but shows blank screens, missing images, or "file not found" errors in packaged builds. This affects static assets, route navigation, and dynamically loaded content.

**Why it happens:**
- Vite uses absolute paths (`/`) by default, broken for `file://` protocol
- BrowserRouter uses `pushState` which doesn't work with file protocol
- Development server masks path resolution issues
- Packaged app has different directory structure

**How to avoid:**
1. Set `base: './'` in Vite config for relative paths
2. Use `HashRouter` instead of `BrowserRouter` for React Router
3. Use `path.join(app.getAppPath(), 'assets')` for dynamic assets
4. Test with `electron-vite preview` before packaging
5. Handle both dev server URL and file:// loading in main process

```typescript
// Vite config
export default defineConfig({
  base: './',
  // ...
});

// React Router - use HashRouter
import { HashRouter } from 'react-router-dom';

// Main process - handle both dev and prod
if (process.env.VITE_DEV_SERVER_URL) {
  mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
} else {
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}
```

**Warning signs:**
- White screen after packaging with no console errors
- 404 errors for assets in packaged app
- Route navigation returning to home
- Works in `npm run dev` but not `npm run preview`

**Phase to address:**
Phase 1 - Initial Electron Integration. This is the #1 reason "it works on my machine" fails for Electron.

---

### Pitfall 5: IndexedDB/Dexie Database Locking

**What goes wrong:**
App fails to open with cryptic IndexedDB errors when user launches second instance, or database becomes corrupted/inaccessible after crash. With Dexie.js specifically, "Internal error opening backing store" errors appear.

**Why it happens:**
- IndexedDB acquires exclusive locks on database files
- Multiple Electron instances compete for same database
- Hard crashes leave locks unreleased
- Windows file locking is stricter than macOS/Linux

**How to avoid:**
1. Implement single-instance enforcement with `app.requestSingleInstanceLock()`
2. Handle `second-instance` event to focus existing window
3. Add database connection retry logic with exponential backoff
4. Consider SQLite via better-sqlite3 for more robust locking
5. Store database in userData directory, not app installation path

```typescript
// Enforce single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
```

**Warning signs:**
- "DOMException: Internal error opening backing store" on launch
- Database errors only on Windows, not macOS
- Errors after force-quitting app
- Multiple processes in Task Manager with same app name

**Phase to address:**
Phase 2 - Storage Integration. Critical when moving from browser-only Dexie to Electron persistence.

---

### Pitfall 6: Dependency Misplacement - devDependencies vs dependencies

**What goes wrong:**
Packaged app crashes with "Cannot find module 'XXX'" errors for modules that worked in development. Alternatively, app bundle bloats to 500MB+ by including test frameworks and build tools.

**Why it happens:**
- electron-builder excludes `devDependencies` during packaging
- Developers move packages to wrong category to "fix" immediate errors
- Some packages (like react-three-fiber) have complex dependency chains
- pnpm's flat node_modules structure causes additional issues

**How to avoid:**
1. Runtime dependencies go in `dependencies` (React, Three.js, Dexie)
2. Build-time only goes in `devDependencies` (Vite, Vitest, ESLint)
3. Use `electron-builder --dir` to inspect unpacked output
4. For pnpm, add `shamefully-hoist=true` to `.npmrc`
5. Test with `npm prune --production` before packaging

```json
{
  "dependencies": {
    "react": "^19.1.0",
    "three": "^0.176.0",
    "dexie": "^4.0.11",
    "@react-three/fiber": "^9.1.2"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "vitest": "^3.2.4",
    "electron-builder": "^24.0.0"
  }
}
```

**Warning signs:**
- "Cannot find module" only in packaged app
- Package.json `dependencies` includes build tools
- App bundle > 200MB for simple app
- Different errors on different platforms

**Phase to address:**
Phase 3 - Packaging & Distribution. Must be verified before any release builds.

---

### Pitfall 7: Cross-Platform Build Failures

**What goes wrong:**
Builds succeed on developer's macOS but fail for Windows/Linux, or vice versa. Code signing fails silently. Native modules compiled for wrong platform. App crashes immediately on target platform.

**Why it happens:**
- macOS code signing ONLY works on macOS
- Native modules must be compiled per-platform
- Path separators differ (`/` vs `\`)
- Case sensitivity differs (macOS HFS+ is insensitive)

**How to avoid:**
1. Use CI/CD with platform-specific runners (GitHub Actions matrix)
2. Never hardcode path separators - use `path.join()`
3. Use consistent casing for all imports (Linux is case-sensitive)
4. Set up code signing early with proper certificates
5. Test on actual platforms, not just cross-compile

```yaml
# GitHub Actions matrix build
jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm run package
```

**Warning signs:**
- Import paths with hardcoded `/` or `\\`
- Inconsistent casing in imports (`./Component` vs `./component`)
- Only testing on one platform
- "Code signature invalid" errors on first macOS test

**Phase to address:**
Phase 3 - Packaging & Distribution. Cross-platform CI should be established before first release.

---

### Pitfall 8: Auto-Update Security and UX Failures

**What goes wrong:**
Auto-update checks fail silently, update downloads corrupt, or updates cause data loss. Worse: unsigned updates allow man-in-the-middle code injection. Users lose work when app force-restarts.

**Why it happens:**
- No Linux support in built-in auto-updater
- macOS requires signed app (no ad-hoc signing)
- Windows first-launch has file lock preventing update check
- quitAndInstall() called without warning user

**How to avoid:**
1. HTTPS-only update server (verify TLS certificate)
2. Code sign all releases (not just to avoid warnings)
3. Skip update check on Windows first launch (`--squirrel-firstrun`)
4. Prompt user before installing, don't force quit
5. For Linux, direct to package manager updates

```typescript
// Safe auto-update pattern
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version is ready. Restart now to update?',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

// Skip on first Windows launch
if (!process.argv.includes('--squirrel-firstrun')) {
  autoUpdater.checkForUpdates();
}
```

**Warning signs:**
- Update check on app launch without delay
- No user prompt before quitAndInstall
- HTTP (not HTTPS) update feed URL
- Linux build promises auto-update

**Phase to address:**
Phase 4 - Polish & Distribution. Auto-update is a later-phase feature but plan architecture early.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `remote` module | Quick IPC bypass | Deprecated, major security hole, removed in Electron 22+ | Never |
| Disabling sandbox | Native module compatibility | Security vulnerability surface | Only for specific trusted windows |
| Skipping code signing | Faster local builds | Users can't install (Gatekeeper), no auto-update | Development only |
| Putting all deps in `dependencies` | No missing module errors | 2-5x bundle size, slower updates | Never |
| Using BrowserRouter | Familiar API | Breaks in production | Never in Electron |
| Inline `new THREE.Geometry()` | Quick prototyping | Memory leaks accumulate | Only with explicit dispose |
| Single package.json for all | Simpler structure | Can't optimize renderer bundle | MVP only, refactor for production |

## Integration Gotchas

Common mistakes when connecting to external services and native features.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Native File Dialogs | Using HTML5 file input | Use `dialog.showOpenDialog()` via IPC from main process |
| System Tray | Same icon for all platforms | Use platform-specific icons (PNG for Linux/Win, Template for macOS) |
| File System | Direct fs access in renderer | IPC to main process, sandbox file operations to userData |
| Clipboard | Using web Clipboard API | Use `clipboard` module for full format support |
| Shell Links | Opening URLs with window.open | Use `shell.openExternal()` via IPC |
| Native Menus | Building menu in renderer | Build Menu in main process, communicate via IPC |
| Deep Links | Not handling protocol | Register protocol handler, parse on `open-url` event |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Continuous 60fps rendering | High CPU/battery drain, fan noise | Use `invalidateFrameloop`, render on demand | Immediately on laptops |
| Loading entire tree into memory | Slow startup, memory exhaustion | Pagination, lazy loading, virtualization | > 1000 family members |
| Synchronous IPC | UI freezes during file operations | Use `ipcRenderer.invoke` (async), show loading states | Files > 1MB |
| Storing images in IndexedDB | Database bloat, slow queries | Store file paths, keep images in userData folder | > 50 images |
| Re-creating WebGLRenderer | GPU context exhaustion | Single renderer instance, reuse across routes | After ~16 navigations |
| Bundling unoptimized assets | Long startup, large download | Compress images, tree-shake imports | App > 150MB |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing `shell.openExternal` without URL validation | Arbitrary command execution via malicious URLs | Validate URL protocol (http/https only) |
| Storing API keys in renderer code | Keys extractable from asar | Store in main process, environment variables, or OS keychain |
| Using `webview` tag without strict config | Embedded content has elevated privileges | Set `webpreferences` to minimum permissions, validate src |
| Running shell commands with user input | Command injection | Never construct commands from user input; use specific APIs |
| Trusting `file://` URLs | Local file exfiltration | Use custom protocol, validate all file paths |
| Logging sensitive data | Credentials in log files | Sanitize logs, use secure storage for secrets |

## UX Pitfalls

Common user experience mistakes in Electron + React apps.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading states during IPC | App appears frozen | Show spinners/skeletons for any operation > 100ms |
| Missing window state persistence | Window position resets each launch | Save/restore bounds, maximized state |
| No offline handling | Cryptic errors when network unavailable | Detect offline, queue operations, show status |
| Blocking main process | Entire app freezes | Move heavy work to worker threads or renderer |
| Inconsistent native feel | App feels "web-like" | Use native menus, dialogs, notifications |
| No progress for long operations | User doesn't know if working | Show progress bars for imports/exports, cancellation |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **File Save Dialog:** Often missing write error handling - verify disk full, permission denied cases
- [ ] **Database Migration:** Often missing upgrade path - verify older data versions still load
- [ ] **Tray Icon:** Often missing click handling - verify show/hide, context menu on all platforms
- [ ] **Window Close:** Often missing unsaved changes prompt - verify dirty state tracking
- [ ] **Export Feature:** Often missing large file handling - verify 100MB+ export works
- [ ] **Auto-Update:** Often missing rollback - verify corrupted update doesn't brick app
- [ ] **Cross-Platform Build:** Often missing Linux - verify AppImage, deb, rpm actually run
- [ ] **Keyboard Shortcuts:** Often missing global shortcuts - verify work when window not focused
- [ ] **Three.js Scene:** Often missing cleanup - verify GPU memory stable after 1 hour
- [ ] **Deep Link Handler:** Often missing cold start - verify works when app not running

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Security misconfiguration deployed | HIGH | Immediate patch release, security advisory, assume breach |
| Three.js memory leaks in production | MEDIUM | Add dispose calls, may need scene restructuring |
| Asset loading broken in release | MEDIUM | Hotfix base path, rebuild and redistribute |
| Database corruption | HIGH | Add recovery mode, import from backup, document data loss |
| Wrong dependencies packaged | LOW | Fix package.json, rebuild, redistribute |
| Cross-platform build failing | LOW | Set up CI matrix, fix path issues |
| Auto-update loop/failure | MEDIUM | Manual download link, investigate signing |
| IPC validation bypass exploited | HIGH | Emergency patch, audit all IPC handlers |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Security misconfiguration | Phase 1 - Initial Integration | Security audit checklist, test contextIsolation |
| Three.js memory leaks | Phase 2 - Core Features | Monitor `renderer.info.memory` in dev, test 1-hour session |
| IPC message validation | Phase 1 - Initial Integration | Review all ipcMain handlers for validation |
| Asset loading in production | Phase 1 - Initial Integration | Test `electron-vite preview` before Phase 2 |
| IndexedDB locking | Phase 2 - Storage Integration | Test multi-instance launch, crash recovery |
| Dependency misplacement | Phase 3 - Packaging | Run `npm prune --production`, check bundle size |
| Cross-platform builds | Phase 3 - Packaging | CI matrix builds on all 3 platforms |
| Auto-update issues | Phase 4 - Polish | Test full update cycle on each platform |

## Sources

### Official Documentation
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security) - Context isolation, IPC security
- [Electron Performance Guide](https://www.electronjs.org/docs/latest/tutorial/performance) - Profiling, optimization
- [electron-vite Troubleshooting](https://electron-vite.org/guide/troubleshooting) - Common build issues

### Community Resources
- [Three.js Memory Management](https://discourse.threejs.org/t/webgl-memory-management-puzzlers/24583) - Disposal patterns
- [Three.js Memory Leaks Discussion](https://discourse.threejs.org/t/does-threejs-leak-memory/51054) - Common causes
- [electron-builder Documentation](https://www.electron.build/) - Packaging, code signing
- [Electron + React Common Questions](https://gist.github.com/Arkellys/96359e7ba19e98260856c897bc378606) - Integration patterns

### Security Research
- [Electron IPC Security Risks](https://codiewhitaker.medium.com/enhancing-electron-ipc-b8c731dfedae) - IPC attack vectors
- [Doyensec Electron Security Blog](https://blog.doyensec.com/2019/04/03/subverting-electron-apps-via-insecure-preload.html) - Preload vulnerabilities

### Platform-Specific Issues
- [Dexie.js Electron Issue #11284](https://github.com/electron/electron/issues/11284) - IndexedDB Windows issues
- [electron-builder Cross-Platform](https://www.electron.build/multi-platform-build.html) - Build limitations

---
*Pitfalls research for: Electron + React 19 + Vite 7 + Three.js Desktop Application*
*Researched: 2026-01-26*
