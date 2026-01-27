# Roadmap: Ancestree Desktop

## Overview

This milestone transforms Ancestree from a web-only application into a cross-platform desktop app using Electron. The journey begins with establishing a secure Electron foundation (Phase 1), then adds native file operations and menus (Phase 2), polishes window management (Phase 3), creates distributable packages for all platforms (Phase 4), and finally adds system integration features like tray and updates (Phase 5). Throughout, the existing web version continues working unchanged.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Electron Foundation** - Secure Electron wrapper running existing React app on all platforms
- [x] **Phase 2: File Operations & Menus** - Native file dialogs and application menu with keyboard shortcuts
- [ ] **Phase 3: Window Management** - Persistent window state and platform-native window behavior
- [ ] **Phase 4: Packaging & Branding** - Signed installers for macOS, Windows, and Linux
- [ ] **Phase 5: System Integration** - System tray, context menu, and auto-updates

## Phase Details

### Phase 1: Electron Foundation
**Goal**: Users can launch Ancestree as a standalone desktop application on macOS, Windows, or Linux with the same 3D visualization experience as the web version
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, SYS-05, FILE-03
**Success Criteria** (what must be TRUE):
  1. User can launch desktop app and see the 3D family tree visualization
  2. App runs on macOS, Windows, and Linux from the same codebase
  3. Existing web version at localhost:5173 still works independently
  4. App works offline without network connectivity
  5. External links (help docs, etc.) open in the user's default browser, not in-app
**Plans**: 2 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Electron setup with secure main process and preload script
- [x] 01-02-PLAN.md — Dual-mode router and cross-platform verification

### Phase 2: File Operations & Menus
**Goal**: Users can save and open family tree files using native OS dialogs, and navigate the app via standard menus and keyboard shortcuts
**Depends on**: Phase 1
**Requirements**: FILE-01, FILE-02, MENU-01, MENU-02, MENU-03, MENU-04, MENU-05, MENU-06
**Success Criteria** (what must be TRUE):
  1. User can save family tree to any location on their filesystem via native Save dialog
  2. User can open family tree from any location via native Open dialog
  3. File menu has New, Open, Save, Save As, Export, Quit options
  4. Cmd/Ctrl+S saves, Cmd/Ctrl+O opens, Cmd/Ctrl+Q quits
  5. macOS shows "Ancestree" in the menu bar with standard app menu items
**Plans**: 5 plans in 3 waves

Plans:
- [x] 02-01-PLAN.md — IPC file dialog handlers and preload extension
- [x] 02-02-PLAN.md — Application menu with keyboard shortcuts
- [x] 02-03-PLAN.md — React hook for file operations, auto-save, and menu event wiring
- [x] 02-04-PLAN.md — GEDCOM export
- [x] 02-05-PLAN.md — Dirty state tracking and close confirmation

### Phase 3: Window Management
**Goal**: The app window behaves like a native application with persistent size/position and platform-appropriate window controls
**Depends on**: Phase 2
**Requirements**: WIN-01, WIN-02, WIN-03
**Success Criteria** (what must be TRUE):
  1. User restarts app and window appears at the same size and position as before
  2. Window has platform-native title bar (not custom frameless)
  3. Minimize, maximize, and close buttons work as expected on each platform
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Packaging & Branding
**Goal**: Users can download and install Ancestree on any platform with professional branding and signed installers
**Depends on**: Phase 3
**Requirements**: BRAND-01, BRAND-02, BRAND-03, BRAND-04
**Success Criteria** (what must be TRUE):
  1. App shows custom Ancestree icon in dock/taskbar (not default Electron icon)
  2. macOS users can install via signed .dmg that passes Gatekeeper
  3. Windows users can install via .exe or .msi installer
  4. Linux users can install via AppImage or .deb package
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: System Integration
**Goal**: Users can access Ancestree from the system tray and receive updates without manual downloads
**Depends on**: Phase 4
**Requirements**: SYS-01, SYS-02, SYS-03, SYS-04
**Success Criteria** (what must be TRUE):
  1. System tray icon appears when app is running
  2. Tray icon has context menu with Show Window, Quick Actions, and Quit
  3. App checks for updates on launch and notifies user if available
  4. User can install updates from within the app without visiting website
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Electron Foundation | 2/2 | Complete | 2026-01-27 |
| 2. File Operations & Menus | 5/5 | Complete | 2026-01-27 |
| 3. Window Management | 0/1 | Not started | - |
| 4. Packaging & Branding | 0/2 | Not started | - |
| 5. System Integration | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-26*
*Last updated: 2026-01-27*
