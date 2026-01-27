# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-26)

**Core value:** Users can visualize and explore their family history through an interactive 3D experience that makes genealogy engaging and intuitive.
**Current focus:** Phase 2 - File Operations and Menus

## Current Position

Phase: 2 of 5 (File Operations and Menus)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-01-27 - Completed 02-01-PLAN.md (IPC File Dialog Handlers)

Progress: [###.......] 30%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~6.7 minutes
- Total execution time: 20 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01    | 2/2   | 13m   | 6.5m     |
| 02    | 1/3   | 7m    | 7m       |

**Recent Trend:**
- Last 5 plans: 01-01 (5m), 01-02 (8m), 02-01 (7m)
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

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-27 15:23 UTC
Stopped at: Completed 02-01-PLAN.md
Resume file: None

---
*Next: 02-02 Application Menu*
