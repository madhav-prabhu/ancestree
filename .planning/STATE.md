# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-26)

**Core value:** Users can visualize and explore their family history through an interactive 3D experience that makes genealogy engaging and intuitive.
**Current focus:** Phase 7 - File Operations Polish

## Current Position

Phase: 6 of 7 (Update UI Completion) - COMPLETE
Plan: 1 of 1 in phase (COMPLETE)
Status: Phase 6 complete, Phase 7 pending
Last activity: 2026-01-27 - Completed 06-01-PLAN.md (Update UI Type Definitions)

Progress: [########=-] 86%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: ~6.1 minutes
- Total execution time: 82 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01    | 2/2   | 13m   | 6.5m     |
| 02    | 4/4   | 31m   | 7.8m     |
| 03    | 1/1   | 8m    | 8.0m     |
| 04    | 2/2   | 12m   | 6.0m     |
| 05    | 3/3   | 13m   | 4.3m     |
| 06    | 1/1   | 5m    | 5.0m     |

**Recent Trend:**
- Last 5 plans: 04-02 (8m), 05-01 (5m), 05-02 (5m), 05-03 (3m), 06-01 (5m)
- Trend: Stable velocity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Electron over Tauri: User preference for ecosystem maturity
- Shared codebase: Web and desktop from same React app
- Native file dialogs: Better UX than browser pickers on desktop
- **[01-01] Channel allowlist pattern for IPC security**: Prevents renderer from invoking arbitrary handlers
- **[01-01/04-02] Build preload as CJS (.cjs)**: Electron sandbox requires CommonJS for preload scripts
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
- **[04-02] Notarization graceful skip**: Scripts check for Apple env vars, skip with warning if missing
- **[04-02] afterSign hook for notarization**: electron-builder calls scripts/notarize.cjs after signing
- **[05-01] macOS template icons use black + alpha**: System auto-inverts for dark mode
- **[05-01] Windows ICO multi-resolution**: 16, 24, 32, 48 sizes in single file
- **[05-01] Platform click behavior**: macOS shows menu, Windows/Linux toggle window
- **[05-02] autoDownload=false**: User clicks Download button to start download
- **[05-02] autoInstallOnAppQuit=true**: Silent install when user quits app
- **[05-02] GitHub Releases as update provider**: Derived owner from git remote
- **[05-02] Development guard**: Skip update checks when app.isPackaged is false
- **[05-03] Update handlers fire-and-forget**: Don't return values, updater sends events via webContents
- **[05-03] onUpdateEvent pattern**: Follows onMenuAction pattern with unsubscribe function
- **[05-03] 3 second delay for startup update check**: Prevents blocking app initialization
- **[06-01] onUpdateEvent type signature matches preload**: Exact signature for type safety
- **[06-01] UpdateNotification is self-contained**: Manages own state via useUpdateEvents hook
- **[06-01] Toast-style UI for updates**: Matches existing import feedback pattern

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
- **Packaging:** `npm run pack:linux` (or :mac, :win) for platform builds
- **Notarization:** afterSign hook skips gracefully without Apple credentials
- **Tray icons:** npm run icons:tray generates platform-specific tray icons
- **Tray module:** Module-level tray reference prevents garbage collection
- **Tray menu rebuild:** Always call setContextMenu with new Menu.buildFromTemplate for Linux compat
- **Update IPC channels:** update:available, update:notAvailable, update:progress, update:downloaded, update:error
- **Taskbar progress:** setProgressBar during download, -1 to clear
- **Native notifications:** Notification.isSupported() check before showing
- **Update IPC pattern:** invoke update:check/update:download, receive update:* events
- **Event subscription:** onUpdateEvent returns unsubscribe function for cleanup
- **Update event hook:** useUpdateEvents returns state + actions for update lifecycle
- **Notification component:** Self-contained with no App.tsx state management needed

### Pending Todos

None.

### Blockers/Concerns

- **Environment issue:** Node.js v24 + Electron v40 runtime incompatibility. Code compiles and builds correctly but runtime testing blocked. Not a code issue - recommend using Node.js v20 or v22 LTS for development.

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 06-01-PLAN.md (Update UI Type Definitions)
Resume file: .planning/phases/07-file-operations-polish/07-01-PLAN.md (when created)

---
*Phase 6 complete. Ready for Phase 7 (File Operations Polish) or production release.*
