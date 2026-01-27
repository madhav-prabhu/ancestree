# Requirements: Ancestree Desktop

**Defined:** 2026-01-26
**Core Value:** Users can visualize and explore their family history through an interactive 3D experience that makes genealogy engaging and intuitive.

## v1 Requirements

Requirements for desktop app release. Each maps to roadmap phases.

### Core Desktop

- [ ] **CORE-01**: Electron wrapper successfully runs existing React app
- [ ] **CORE-02**: Desktop app builds and runs on macOS
- [ ] **CORE-03**: Desktop app builds and runs on Windows
- [ ] **CORE-04**: Desktop app builds and runs on Linux
- [ ] **CORE-05**: Website continues working independently (no regressions)
- [ ] **CORE-06**: Secure IPC bridge between renderer and main process

### File Operations

- [ ] **FILE-01**: User can save family tree to filesystem via native save dialog
- [ ] **FILE-02**: User can open family tree from filesystem via native open dialog
- [ ] **FILE-03**: External links open in default browser, not in app

### Menus & Shortcuts

- [ ] **MENU-01**: Application has File menu (New, Open, Save, Save As, Export, Quit)
- [ ] **MENU-02**: Application has Edit menu (Undo, Redo, Cut, Copy, Paste, Select All)
- [ ] **MENU-03**: Application has View menu (Zoom In, Zoom Out, Reset Zoom, Toggle DevTools)
- [ ] **MENU-04**: Application has Help menu (About, Website link)
- [ ] **MENU-05**: Keyboard shortcuts work (Cmd/Ctrl+S Save, Cmd/Ctrl+O Open, Cmd/Ctrl+Q Quit)
- [ ] **MENU-06**: macOS menu bar shows app name and standard items

### Window Management

- [ ] **WIN-01**: Window size and position persist across app restarts
- [ ] **WIN-02**: Window uses platform-native title bar and controls
- [ ] **WIN-03**: App responds to minimize, maximize, close buttons correctly

### Branding & Packaging

- [ ] **BRAND-01**: App has custom icon for macOS (icns), Windows (ico), and Linux (png)
- [ ] **BRAND-02**: macOS build produces signed .dmg installer
- [ ] **BRAND-03**: Windows build produces installer (.exe or .msi)
- [ ] **BRAND-04**: Linux build produces AppImage or .deb package

### System Integration

- [ ] **SYS-01**: System tray icon appears when app is running
- [ ] **SYS-02**: System tray has context menu (Show Window, Quick Actions, Quit)
- [ ] **SYS-03**: App checks for updates on launch
- [ ] **SYS-04**: User can install updates from within the app
- [ ] **SYS-05**: App works offline (no network required for core functionality)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced File Handling

- **FILE-04**: Double-click .ancestree files to open in app (file association)
- **FILE-05**: Recent documents appear in File menu and dock/jumplist
- **FILE-06**: Drag-and-drop files onto app window to open

### Notifications & Polish

- **NOTIF-01**: Native notifications for completed exports
- **NOTIF-02**: Taskbar progress indicator during long operations

### Advanced Features

- **ADV-01**: Export family tree to PDF
- **ADV-02**: Deep link support (ancestree:// protocol)
- **ADV-03**: Print family tree via native print dialog

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Frameless/transparent windows | Breaks platform conventions, accessibility issues |
| Node integration in renderer | Critical security vulnerability per Electron best practices |
| Real-time cloud sync | Massive complexity; keep local-first for v1 |
| Cloud storage backend | Separate milestone; local-first is current architecture |
| Mobile app | Desktop and web first; mobile is separate effort |
| Multiple simultaneous windows | Complex state sync; use panels/tabs instead |
| GEDCOM file association | Defer until basic file handling is battle-tested |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| CORE-04 | Phase 1 | Pending |
| CORE-05 | Phase 1 | Pending |
| CORE-06 | Phase 1 | Pending |
| FILE-01 | Phase 2 | Pending |
| FILE-02 | Phase 2 | Pending |
| FILE-03 | Phase 2 | Pending |
| MENU-01 | Phase 2 | Pending |
| MENU-02 | Phase 2 | Pending |
| MENU-03 | Phase 2 | Pending |
| MENU-04 | Phase 2 | Pending |
| MENU-05 | Phase 2 | Pending |
| MENU-06 | Phase 2 | Pending |
| WIN-01 | Phase 3 | Pending |
| WIN-02 | Phase 3 | Pending |
| WIN-03 | Phase 3 | Pending |
| BRAND-01 | Phase 4 | Pending |
| BRAND-02 | Phase 4 | Pending |
| BRAND-03 | Phase 4 | Pending |
| BRAND-04 | Phase 4 | Pending |
| SYS-01 | Phase 5 | Pending |
| SYS-02 | Phase 5 | Pending |
| SYS-03 | Phase 5 | Pending |
| SYS-04 | Phase 5 | Pending |
| SYS-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-26*
*Last updated: 2026-01-26 after initial definition*
