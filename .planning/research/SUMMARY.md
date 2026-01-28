# Project Research Summary

**Project:** Ancestree - Electron Desktop Wrapper
**Domain:** Desktop application wrapper for existing React + Vite + Three.js web app
**Researched:** 2026-01-26
**Confidence:** HIGH

## Executive Summary

Ancestree is adding an Electron desktop wrapper to an existing React 19 + Vite 7 + Three.js family tree visualization app. The research shows this is a well-supported pattern in 2026, with electron-vite (v5.0+) providing mature tooling for Vite 7 integration. The recommended approach treats the existing web app as the Electron renderer process with minimal modifications, using storage abstraction to detect and adapt to the desktop environment. Security must be configured correctly from day one—the IPC bridge pattern with contextBridge is non-negotiable.

The critical insight from research is that Electron introduces two distinct concerns: (1) **security boundaries** between trusted main process and untrusted renderer, and (2) **Three.js memory management** which becomes severe in long-running desktop apps. The existing codebase already has a storage abstraction layer, making it well-positioned for dual deployment (web + desktop). The highest risk area is Three.js GPU memory leaks, which users tolerate in web apps (they refresh) but will cause desktop app crashes after hours of use.

Phase sequencing should follow dependency order: basic Electron wrapper first (Phase 1), then native features leveraging that foundation (Phase 2), then packaging and distribution infrastructure (Phase 3), with polish features deferred to later iterations. The architecture research indicates electron-vite's triple-build structure (main/preload/renderer) integrates cleanly with Ancestree's existing agent boundaries—Main Process work maps to Data Agent, renderer stays with Frontend/3D agents.

## Key Findings

### Recommended Stack

Electron 40.0.0 with electron-vite 5.0.0 provides the optimal build tooling for Vite 7 + React 19 integration. This combination offers HMR for renderer process and hot reload for main/preload, drastically improving development velocity. electron-builder (v26.5.0) is recommended for packaging over Electron Forge due to maturity (621K weekly downloads) and extensive cross-platform customization.

**Core technologies:**
- **Electron 40.0.0**: Latest stable (Jan 2026), includes Chromium 144 which guarantees consistent WebGL/Three.js rendering across Windows/macOS/Linux—critical for 3D visualization reliability
- **electron-vite 5.0.0**: Unified config for main/preload/renderer with confirmed Vite 7 support (v4.0+ per CHANGELOG), eliminates build tool complexity
- **electron-builder 26.5.0**: Most mature packaging solution with cross-platform builds from single OS, code signing support, auto-update integration

**Supporting stack:**
- electron-updater (v6.8.1) for auto-updates (Phase 4 feature, plan architecture early)
- electron-store (v10.0.0) for app preferences (alternative to IndexedDB for settings)
- Avoid Tauri—inconsistent WebGL across system WebViews breaks Three.js rendering guarantees

### Expected Features

Desktop apps have different feature expectations than web apps. Users assume certain capabilities exist and notice when they're missing.

**Must have (table stakes):**
- **Native file dialogs** (Save/Open) — Desktop apps must use OS dialogs, critical for GEDCOM import/export
- **Application menu** — Every desktop app has File/Edit/View menus with standard keyboard shortcuts
- **Keyboard shortcuts** — Users expect Cmd/Ctrl+S, Cmd/Ctrl+O to work system-wide
- **Offline capability** — "Desktop app" implies works without internet (already implemented with IndexedDB)
- **External link handling** — Links open in default browser via shell.openExternal, not in-app
- **App icon and branding** — Professional appearance in dock/taskbar with platform-specific formats

**Should have (competitive advantage):**
- **GEDCOM file association** — Double-click .ged files to open in Ancestree (competitors like RootsMagic have this)
- **Recent documents** — Quick access via JumpList (Windows) or Dock menu (macOS)
- **Auto-updates** — Seamless updates without manual download, critical for ongoing maintenance
- **System tray presence** — Quick access, optional background operation for "always running" workflow
- **Export to PDF** — Print-quality family tree exports using webContents.printToPDF()

**Defer (v2+):**
- **Deep links** (ancestree:// protocol) — Only if web-to-desktop handoff is validated use case
- **Global shortcuts** — Only if users need to invoke app from anywhere
- **Native drag-and-drop export** — Polish feature, not essential for initial release

**Explicit anti-features:**
- Real-time sync — Adds massive complexity, conflicts, requires server; defer to distinct v2 feature
- Full frameless window — Breaks platform conventions and accessibility
- Node integration in renderer — Critical security vulnerability (XSS becomes RCE)

### Architecture Approach

Electron's multi-process architecture wraps the existing React app cleanly. The key pattern is **dual build strategy**: maintain both web and Electron builds from same codebase, with renderer process being the existing web app and minimal platform detection via storage abstraction layer.

**Major components:**
1. **Main Process** (electron/main.ts) — App lifecycle, native APIs (dialogs, menus, tray), IPC handler registration; runs in trusted Node.js context
2. **Preload Script** (electron/preload.ts) — Secure API bridge using contextBridge, exposes minimal validated API surface to renderer; sandboxed Node.js
3. **Renderer Process** (existing src/) — Unchanged React + Three.js web app; runs in untrusted Chromium sandbox
4. **Storage Abstraction** — Extend existing StorageInterface with FileSystemStorage implementation, factory detects environment and returns Dexie (web) or native files (desktop)
5. **IPC Handlers** (electron/ipc/) — Organized by feature (dialog.ts, storage.ts), registered in main process

**Critical architectural patterns:**
- **Secure IPC Bridge**: Never expose raw ipcRenderer; use contextBridge with explicit, validated methods per operation
- **Process boundaries**: Main (trusted, Node.js) vs Renderer (untrusted, Chromium) separation enforced via contextIsolation: true, nodeIntegration: false, sandbox: true
- **Storage factory pattern**: Detect window.electronAPI presence, return FileSystemStorage (desktop) or DexieStorage (web) from getStorage()

### Critical Pitfalls

Research identified eight critical pitfalls; top five requiring immediate attention:

1. **Security Misconfiguration** — Disabling contextIsolation or enabling nodeIntegration exposes app to RCE via XSS; must configure correctly in Phase 1 (retrofitting is painful). Prevention: Keep contextIsolation: true, nodeIntegration: false, sandbox: true; use contextBridge exclusively.

2. **Three.js Memory Leaks** — WebGL resources accumulate in GPU memory when components unmount without disposal; severe in long-running desktop apps (users don't refresh). Prevention: Call .dispose() on all geometries/materials/textures in useEffect cleanup; reuse WebGLRenderer across routes; monitor renderer.info.memory in development.

3. **Asset Loading Breaks in Production** — App works in dev but shows blank screens in packaged build due to Vite's absolute paths breaking file:// protocol. Prevention: Set base: './' in Vite config, use HashRouter (not BrowserRouter), test with electron-vite preview before Phase 2.

4. **IPC Message Validation Bypass** — Main process blindly trusting renderer enables file system attacks via compromised renderer. Prevention: Validate event.senderFrame in all ipcMain handlers, restrict file operations to userData directory, never construct commands from IPC arguments.

5. **IndexedDB Database Locking** — Multiple instances or crashes leave database locks, causing "Internal error opening backing store" failures especially on Windows. Prevention: Implement app.requestSingleInstanceLock() in Phase 1, handle second-instance event to focus existing window.

**Phase-specific pitfalls:**
- Phase 1: Security misconfiguration, asset loading, IPC validation
- Phase 2: Three.js memory leaks, database locking
- Phase 3: Dependency misplacement (devDependencies vs dependencies), cross-platform builds
- Phase 4: Auto-update security, code signing

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order and risk mitigation:

### Phase 1: Electron Foundation
**Rationale:** Security configuration and asset loading must be correct from day one—retrofitting is expensive. This phase establishes the IPC bridge pattern that all subsequent phases depend on.

**Delivers:** Functional Electron window loading existing React app with secure IPC foundation.

**Addresses:**
- Window chrome (close/minimize/maximize) — table stakes
- External link handling — table stakes
- App icon and branding — table stakes
- Secure IPC infrastructure for future features

**Avoids:**
- Security misconfiguration pitfall (set contextIsolation, sandbox, nodeIntegration correctly)
- Asset loading pitfall (configure base: './', HashRouter, test with preview)
- Establishes single-instance lock (prevents database locking later)

**Technical scope:**
- electron-vite configuration with main/preload/renderer separation
- Basic main process with BrowserWindow creation
- Preload script skeleton with contextBridge (empty API initially)
- Update package.json with electron scripts
- Verify both dev and production builds work

**Research flag:** Standard patterns, skip research-phase (well-documented in Electron docs)

### Phase 2: Native File Operations
**Rationale:** File dialogs are foundational—import/export and all file features depend on this working. This phase validates the IPC bridge pattern established in Phase 1 with low-risk, high-visibility features.

**Delivers:** Native Save/Open dialogs for GEDCOM import/export, replacing browser download/upload.

**Uses:**
- Electron dialog API (showOpenDialog, showSaveDialog)
- IPC handlers in main process (dialog:open, dialog:save)
- Exposed via preload contextBridge

**Addresses:**
- Native file dialogs — table stakes
- Keyboard shortcuts (Cmd/Ctrl+S, Cmd/Ctrl+O) via application menu — table stakes
- Application menu with File/Edit/View standard items — table stakes

**Avoids:**
- IPC validation pitfall (validate sender, restrict to safe paths)
- Establishes secure pattern for future IPC operations

**Technical scope:**
- Implement dialog IPC handlers in electron/ipc/dialog.ts
- Expose openFile/saveFile in preload script
- Add application menu with keyboard accelerators
- Update existing import/export UI to use electronAPI when available
- Platform detection utility (isElectron(), getElectronAPI())

**Research flag:** Standard patterns, skip research-phase (Electron dialog API is well-documented)

### Phase 3: Storage Integration
**Rationale:** Extends existing storage abstraction to leverage native file system in Electron while maintaining web compatibility. This phase is when database locking pitfalls become relevant.

**Delivers:** FileSystemStorage implementation, auto-detection factory switching between Dexie (web) and native files (desktop).

**Implements:**
- Storage abstraction pattern from ARCHITECTURE.md
- FileSystemStorage class implementing StorageInterface
- Factory pattern with environment detection

**Addresses:**
- Persistent storage in userData directory
- Enables future features like file association, recent documents

**Avoids:**
- IndexedDB locking pitfall (already addressed in Phase 1 with single-instance lock)
- Three.js memory leaks pitfall (add disposal in existing scene components during this phase)

**Technical scope:**
- Implement FileSystemStorage class (src/services/storage/FileSystemStorage.ts)
- Add fs:read, fs:write IPC handlers with path validation
- Update storage factory to detect environment and return appropriate backend
- Add memory monitoring for Three.js (renderer.info.memory logging)
- Implement proper disposal in existing FamilyNode components

**Research flag:** Needs research-phase for storage migration strategy (how to migrate existing IndexedDB data to files)

### Phase 4: Packaging & Distribution
**Rationale:** Cross-platform builds, code signing, and dependency optimization must be verified before any release. This phase has the most platform-specific pitfalls.

**Delivers:** Signed, distributable packages for macOS, Windows, Linux with proper dependency bundling.

**Uses:**
- electron-builder configuration
- Code signing certificates per platform
- CI/CD matrix builds

**Addresses:**
- Cross-platform builds — table stakes for release
- Professional installer/DMG/AppImage
- Dependency optimization (reduce bundle size)

**Avoids:**
- Dependency misplacement pitfall (audit dependencies vs devDependencies)
- Cross-platform build failures (establish CI matrix, test on actual platforms)
- Code signing failures (acquire certificates early, test signing process)

**Technical scope:**
- Configure electron-builder in package.json (mac/win/linux targets)
- Set up GitHub Actions matrix for macOS/Windows/Linux builds
- Acquire and configure code signing certificates
- Test with npm prune --production to verify runtime dependencies
- Create platform-specific icons (icns, ico, png)

**Research flag:** Needs research-phase for code signing process (platform-specific certificate requirements)

### Phase 5: Enhanced Features (v1.x)
**Rationale:** Polish features that enhance desktop experience once core functionality is stable and released.

**Delivers:** GEDCOM file association, recent documents, system tray, auto-updates.

**Addresses:**
- GEDCOM file association — competitive advantage
- Recent documents — competitive advantage
- System tray — competitive advantage
- Auto-updates — should-have for maintenance

**Avoids:**
- Auto-update security pitfall (HTTPS only, code signing, user prompts before install)

**Technical scope:**
- Register .ged file handler in installer
- Implement app.addRecentDocument() for opened files
- Create system tray with context menu
- Integrate electron-updater with GitHub Releases
- Handle open-file event (macOS), process.argv (Windows)

**Research flag:** Standard patterns for file association and tray, but needs research-phase for auto-update architecture

### Phase Ordering Rationale

- **Security first**: Phase 1 establishes security boundaries that are expensive to retrofit
- **Foundation before features**: IPC bridge (Phase 1) must work before native dialogs (Phase 2)
- **Validate patterns early**: Native dialogs (Phase 2) prove IPC security model with low-risk feature
- **Defer distribution complexity**: Packaging (Phase 4) needs working app to test; defer until core features complete
- **Memory management integrated**: Three.js disposal added in Phase 3 when touching scene code, not deferred

### Research Flags

Phases needing deeper research during planning:
- **Phase 3:** Storage migration strategy—how to migrate existing IndexedDB data to native files for current users
- **Phase 4:** Code signing process—platform-specific certificate acquisition, keychain configuration, notarization
- **Phase 5:** Auto-update architecture—GitHub Releases vs S3, delta updates, rollback strategy

Phases with standard patterns (skip research-phase):
- **Phase 1:** Electron + Vite integration is well-documented, electron-vite handles build complexity
- **Phase 2:** Dialog API and IPC patterns are standard Electron, extensive official documentation
- **Phase 5:** File association patterns are standard, though platform-specific implementation details vary

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Electron releases confirm v40.0.0 stable; electron-vite CHANGELOG confirms Vite 7 support in v4.0+; package popularity verified via npm trends |
| Features | HIGH | Feature expectations based on official Electron docs and competitor analysis (RootsMagic, Family Tree Maker, Gramps); security anti-features verified in Electron Security docs |
| Architecture | HIGH | Multi-process pattern is fundamental Electron architecture; IPC security model documented in official tutorials; storage abstraction leverages existing codebase design |
| Pitfalls | HIGH | Security pitfalls verified in official Electron Security docs; Three.js memory issues confirmed in community forums with maintainer responses; production build issues common in electron-vite troubleshooting guide |

**Overall confidence:** HIGH

### Gaps to Address

Areas where research was inconclusive or needs validation during implementation:

- **Storage migration path**: Research identified FileSystemStorage as the pattern but didn't specify how to migrate existing users' IndexedDB data to native files. Need to research migration strategy in Phase 3 planning (one-time export/import vs dual-backend transitional period).

- **Code signing workflow**: Research confirmed need for platform-specific certificates but didn't detail acquisition process (Apple Developer Program, Windows EV certificate, Linux not required). Need research-phase in Phase 4 for certificate procurement and CI integration.

- **Three.js disposal patterns**: Research identified the pitfall (GPU memory leaks) and general solution (call .dispose()) but existing Ancestree codebase uses react-three-fiber which has automatic disposal for some objects. Need to audit which components need explicit cleanup during Phase 3.

- **Auto-update rollback**: Research covered basic electron-updater integration but didn't address rollback strategy if update corrupts data or breaks compatibility. Defer to Phase 5 research-phase.

- **Performance at scale**: Research noted pagination/lazy loading for large trees (>1000 members) but didn't specify implementation approach. Not blocking for initial release but should be researched if beta testing reveals performance issues.

## Sources

### Primary (HIGH confidence)
- [Electron Official Releases](https://releases.electronjs.org/) — Electron 40.0.0 stable, Chromium 144, Node 24.11
- [electron-vite Documentation](https://electron-vite.org/guide/) — v5.0.0 Node requirements, Vite 7 compatibility
- [electron-vite CHANGELOG](https://github.com/alex8088/electron-vite/blob/master/CHANGELOG.md) — Vite 7 support confirmed in v4.0
- [electron-builder Releases](https://github.com/electron-userland/electron-builder/releases) — v26.5.0 Jan 2025
- [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security) — Context isolation, IPC security
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc) — contextBridge patterns
- [Electron Dialog API](https://www.electronjs.org/docs/latest/api/dialog) — File dialog usage
- [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) — Security boundaries

### Secondary (MEDIUM confidence)
- [npm trends](https://npmtrends.com/electron-builder-vs-electron-forge) — electron-builder 621K weekly downloads
- [Three.js Memory Management Discussion](https://discourse.threejs.org/t/webgl-memory-management-puzzlers/24583) — Disposal patterns
- [RxDB Electron Database Patterns](https://rxdb.info/electron-database.html) — Storage architecture
- [Electron + React Integration Patterns](https://gist.github.com/Arkellys/96359e7ba19e98260856c897bc378606) — Common issues
- Competitor analysis (RootsMagic, Family Tree Maker features) — Desktop app expectations

### Tertiary (LOW confidence)
- Tauri vs Electron WebGL claims — Based on community reports of WebKit vs Chromium differences, not systematic testing
- Performance at scale (10K+ members) — Inferred from general React + Three.js performance characteristics, not Ancestree-specific testing

---
*Research completed: 2026-01-26*
*Ready for roadmap: yes*
