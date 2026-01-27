# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-26)

**Core value:** Users can visualize and explore their family history through an interactive 3D experience that makes genealogy engaging and intuitive.
**Current focus:** Phase 4 - Packaging & Branding

## Current Position

Phase: 4 of 5 (Packaging & Branding)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-01-27 - Completed 04-01-PLAN.md

Progress: [########..] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: ~7.1 minutes
- Total execution time: 56 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01    | 2/2   | 13m   | 6.5m     |
| 02    | 4/4   | 31m   | 7.8m     |
| 03    | 1/1   | 8m    | 8.0m     |
| 04    | 1/3   | 4m    | 4.0m     |

**Recent Trend:**
- Last 5 plans: 02-03 (8m), 02-04 (6m), 03-01 (8m), 04-01 (4m)
- Trend: Improving

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Electron over Tauri: User preference for ecosystem maturity
- Shared codebase: Web and desktop from same React app
- Native file dialogs: Better UX than browser pickers on desktop
- **[01-01] Channel allowlist pattern for IPC security**: Prevents renderer from invoking arbitrary handlers
- **[01-01] Build preload as ESM (.mjs)**: Matches project type:module configuration
- **[01-02] HashRouter for Electron**: Required for file:// protocol in production builds
- **[01-02] BrowserRouter preserved for web**: Cleaner URLs and server-side routing support
- **[01-02] Platform detection via electronAPI.isElectron**: Reliable flag set by preload script
- **[02-01] IPC handlers organized in electron/main/ipc/ directory**: Domain-based organization
- **[02-01] Channel naming: dialog: and menu: prefixes**: Clear namespacing for IPC channels
- **[02-01] Main process built as CJS**: ESM imports fail in Electron runtime
- **[02-02] CommandOrControl accelerator prefix**: Cross-platform keyboard shortcuts
- **[02-02] Built-in MenuItem roles for Edit menu**: Native undo/redo/clipboard behavior
- **[02-02] webContents.send for menu actions**: Renderer handles business logic
- **[02-03] Auto-save interval 30 seconds**: Balance between data safety and write frequency
- **[02-03] Atomic draft storage via electron-store**: Crash-safe writes
- **[02-03] User confirmation for crash recovery**: Avoids silent data replacement
- **[02-04] GEDCOM 7.0 format for export**: Modern standard with UTF-8 encoding
- **[02-04] Separate export handler from save handler**: Different file types (.ged vs .json)
- **[03-01] 80% of primary display for first-launch window size**: Good balance for 3D visualization
- **[03-01] 400x300 minimum window dimensions**: Prevents unusably small windows
- **[03-01] 500ms debounce for window state saves**: Balances responsiveness and disk write frequency
- **[03-01] Display validation via getAllDisplays**: Handles disconnected monitor recovery
- **[04-01] sharp over ImageMagick for icon generation**: Node.js native, no system dependency
- **[04-01] Icon pipeline via npm script**: Reproducible generation from source

### Research Insights

From .planning/research/SUMMARY.md:
- Security first: contextIsolation=true, nodeIntegration=false, sandbox=true from day one
- electron-vite 5.0.0 recommended for Vite 7 integration
- Phase 3 needs research: storage migration from IndexedDB to native files
- Phase 4 needs research: code signing process for each platform

### Patterns Established

- **Platform detection:** Always use `isElectron()` from `src/utils/platform.ts`
- **Router selection:** Automatic based on environment, no manual configuration
- **IPC security:** Channel allowlist pattern in preload script
- **IPC handlers:** Create handler file in `electron/main/ipc/`, export `registerXHandlers()`
- **Preload allowlists:** Separate `ALLOWED_CHANNELS` (invoke) and `ALLOWED_RECEIVE_CHANNELS` (on)
- **Event listeners:** Return unsubscribe function for cleanup
- **Menu template:** macOS app menu first only when `process.platform === 'darwin'`
- **Menu IPC:** `webContents.send('menu:action')` pattern for renderer notification
- **File operations:** Use `useFileOperations` hook, not direct IPC calls
- **Auto-save:** Updates on tree data changes via useEffect
- **Export operations:** Convert data format, then invoke dialog:export IPC
- **Window state service:** loadWindowState + trackWindowState + cleanup pattern
- **Debounced saves:** clearTimeout/setTimeout pattern for high-frequency UI events
- **electron-store import:** Use `ElectronStore.default ?? ElectronStore` for ESM/CJS interop
- **electron-store config:** Always include `projectName: 'ancestree'` for dev mode compatibility
- **Icon pipeline:** Source (1024x1024) -> electron-icon-builder -> all formats
- **Build resources:** build/ directory for electron-builder assets

### Pending Todos

None.

### Blockers/Concerns

- **Environment issue:** Node.js v24 + Electron v40 runtime incompatibility. Code compiles and builds correctly but runtime testing blocked. Not a code issue - recommend using Node.js v20 or v22 LTS for development.

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 04-01-PLAN.md
Resume file: None

---
*Next: 04-02-PLAN.md (macOS Code Signing & Notarization)*
