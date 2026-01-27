# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-26)

**Core value:** Users can visualize and explore their family history through an interactive 3D experience that makes genealogy engaging and intuitive.
**Current focus:** Phase 4 - Packaging & Branding

## Current Position

Phase: 3 of 5 (Window Management) - COMPLETE
Plan: 1 of 1 in current phase
Status: Phase verified and complete
Last activity: 2026-01-27 - Phase 3 verified by user

Progress: [########..] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: ~7.4 minutes
- Total execution time: 52 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01    | 2/2   | 13m   | 6.5m     |
| 02    | 4/4   | 31m   | 7.8m     |
| 03    | 1/1   | 8m    | 8.0m     |

**Recent Trend:**
- Last 5 plans: 02-02 (10m), 02-03 (8m), 02-04 (6m), 02-05 (pending), 03-01 (8m)
- Trend: Stable

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

### Pending Todos

None.

### Blockers/Concerns

- **Environment issue:** Node.js v24 + Electron v40 runtime incompatibility. Code compiles and builds correctly but runtime testing blocked. Not a code issue - recommend using Node.js v20 or v22 LTS for development.

## Session Continuity

Last session: 2026-01-27
Stopped at: Phase 3 complete and verified
Resume file: None

---
*Next: Ready for Phase 4 (Packaging & Branding)*
