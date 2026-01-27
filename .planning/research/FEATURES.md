# Feature Research: Electron Desktop Features

**Domain:** Electron desktop app features (adding to existing React web app)
**Researched:** 2026-01-26
**Confidence:** HIGH

## Context

Ancestree is an existing React 3D family tree visualization app. This research focuses on **desktop-specific features that Electron enables**, not the core app functionality which already exists.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in desktop apps. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Native file dialogs (Save/Open)** | Desktop apps must use OS dialogs for files | LOW | Use `dialog.showOpenDialog()` / `dialog.showSaveDialog()` via IPC. Critical for GEDCOM import/export. |
| **Application menu** | Every desktop app has File/Edit/View menus | LOW | Use Electron's `Menu` module. Include standard items: Undo/Redo, Cut/Copy/Paste, Preferences, Quit. |
| **Keyboard shortcuts** | Desktop users expect Cmd/Ctrl+S, Cmd/Ctrl+O | LOW | Configure accelerators on menu items. Cross-platform: use `CommandOrControl` not just `Cmd` or `Ctrl`. |
| **Window chrome (close/minimize/maximize)** | Basic window management | LOW | Default Electron behavior. Consider platform-native title bar styles on macOS. |
| **Offline capability** | "Desktop app" implies works without internet | LOW | Already local-first with IndexedDB. Electron adds true filesystem access. |
| **Native notifications** | Alerts for completed exports, sync status | MEDIUM | Use `Notification` class. Platform-specific options (macOS: actions, Linux: urgency). |
| **External link handling** | Links open in default browser, not app | LOW | Use `shell.openExternal()` for URLs. Prevents security issues with in-app navigation. |
| **App icon and branding** | Professional appearance in dock/taskbar | LOW | Configure in electron-builder. Need platform-specific icon formats (icns, ico, png). |
| **Crash handling** | App should not lose data on crash | MEDIUM | Use Electron's `crashReporter` or Sentry. Auto-save before operations. |

### Differentiators (Competitive Advantage)

Features that set Ancestree apart from web apps and competing desktop genealogy software.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **GEDCOM file association** | Double-click .ged files to open in Ancestree | MEDIUM | Register as file handler in installer. Handle `open-file` event on macOS, `process.argv` on Windows. Competitors (RootsMagic, FTM) have this. |
| **Recent documents** | Quick access to recently opened family trees | LOW | Use `app.addRecentDocument()`. Shows in JumpList (Windows) or Dock menu (macOS). |
| **System tray presence** | Quick access, background operation | MEDIUM | Use `Tray` module. Show context menu with recent trees, quick actions. Good for "always running" apps. |
| **Auto-updates** | Seamless app updates without manual download | MEDIUM | Use `electron-updater` with GitHub Releases or S3. Critical for ongoing maintenance. |
| **Native drag-and-drop** | Drag GEDCOM files onto app to open, drag exports out | MEDIUM | Handle `drop` events in renderer, use `webContents.startDrag()` for outbound. Enhances UX significantly. |
| **Export to PDF** | Print-quality family tree exports | HIGH | Use `webContents.printToPDF()`. May need to render tree differently for print layout. |
| **Deep links / custom protocol** | Open `ancestree://tree/123` from browser or email | MEDIUM | Use `setAsDefaultProtocolClient()`. Enables web-to-desktop handoff. |
| **Taskbar progress** | Show export/import progress in taskbar | LOW | Use `win.setProgressBar()`. Works on Windows and macOS dock. |
| **Global shortcuts** | Hotkeys work even when app is minimized | MEDIUM | Use `globalShortcut.register()`. Consider carefully - invasive if overused. |
| **Native print dialog** | Print family tree charts | MEDIUM | Use `webContents.print()`. Integrates with OS print services. |
| **Login item (start at login)** | App available immediately | LOW | Use `app.setLoginItemSettings()`. Optional - genealogy app probably doesn't need this. |
| **Badge count** | Show pending items on dock icon | LOW | Use `app.setBadgeCount()`. Could show number of hints/matches to review. macOS only. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. **Do NOT implement these.**

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time sync everywhere** | "Keep data in sync across devices" | Adds massive complexity. Conflicts, merge issues, requires server. | Export/import GEDCOM. Add cloud sync as distinct v2 feature if needed. |
| **Full frameless window** | "Modern look like Spotify" | Breaks platform conventions. Accessibility issues. Drag regions complex. | Use platform-native title bars. macOS `hiddenInset` style is acceptable. |
| **Transparent windows** | "Cool visual effects" | Non-resizable, DevTools breaks, maximizing breaks. | Use solid windows. Transparency is fragile. |
| **Background sync while closed** | "Always up to date" | Requires running service, complex IPC, user trust issues. | Sync on app launch. Users can leave app running if desired (tray). |
| **Node integration in renderer** | "Easier to access filesystem" | Critical security vulnerability. XSS becomes RCE. | Always use preload + contextBridge. Never enable nodeIntegration. |
| **Multiple windows for same data** | "View tree and details side by side" | Complex state sync, race conditions, UX confusion. | Use panels/tabs within single window. Split view if needed. |
| **Custom window controls** | "Match our brand" | Platform inconsistency, accessibility regression. | Use native controls. Brand through content, not chrome. |
| **Storing credentials in localStorage** | "Already using it for other data" | Not encrypted, visible in DevTools. | Use Electron's `safeStorage` API or OS keychain. |
| **Running heavy computation in renderer** | "Simpler architecture" | Blocks UI, poor performance. | Use worker threads or move to main process for CPU-intensive tasks. |

---

## Feature Dependencies

```
[Native File Dialogs]
    |
    +---> [GEDCOM Import/Export]
    |         |
    |         +---> [File Association] (requires dialogs to work)
    |         |
    |         +---> [Recent Documents] (requires files to be opened)
    |
    +---> [Native Drag-and-Drop] (enhances file handling)

[Application Menu]
    |
    +---> [Keyboard Shortcuts] (accelerators defined on menu items)
    |
    +---> [Recent Documents Menu] (submenu using recents role)

[System Tray]
    |
    +---> [Context Menu] (same Menu module knowledge)
    |
    +---> [Tray Icon] (requires icon assets)

[Auto-Updates]
    +---> [Signed Builds] (required for macOS, recommended for Windows)
         |
         +---> [Code Signing Certificate] (prerequisite)

[Export to PDF]
    +---> [Print Dialog] (shares printToPDF infrastructure)
```

### Dependency Notes

- **File dialogs are foundational**: Almost all file-related features depend on dialog infrastructure working
- **Menu system enables shortcuts**: Keyboard shortcuts are configured as accelerators on menu items
- **Auto-updates need signing**: macOS requires signed apps for Squirrel.Mac updates
- **Tray reuses Menu patterns**: Same Menu module used for app menu and tray context menu

---

## MVP Definition

### Launch With (v1)

Minimum viable Electron wrapper - what's needed to ship a functional desktop app.

- [x] **Native file dialogs** - Essential for saving/loading family trees
- [x] **Application menu** - File, Edit, View, Window, Help menus with standard items
- [x] **Keyboard shortcuts** - Cmd/Ctrl+S, Cmd/Ctrl+O, Cmd/Ctrl+Q basics
- [x] **External link handling** - Links open in browser, not break app
- [x] **App icon and branding** - Professional appearance
- [x] **Window state persistence** - Remember size/position on restart
- [x] **Cross-platform builds** - macOS, Windows, Linux packages

### Add After Validation (v1.x)

Features to add once core desktop app is stable.

- [ ] **GEDCOM file association** - After confirming file handling works smoothly
- [ ] **Recent documents** - After file open/save is battle-tested
- [ ] **Auto-updates** - After build/release pipeline is stable
- [ ] **System tray** - After determining if users want "always running" behavior
- [ ] **Notifications** - When there's something meaningful to notify about

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Export to PDF** - Complex layout considerations, defer until users request
- [ ] **Deep links** - Only if web-to-desktop handoff is a validated use case
- [ ] **Global shortcuts** - Only if users need to invoke app from anywhere
- [ ] **Native drag-and-drop export** - Nice-to-have polish feature

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Native file dialogs | HIGH | LOW | **P1** |
| Application menu | HIGH | LOW | **P1** |
| Keyboard shortcuts | HIGH | LOW | **P1** |
| External link handling | HIGH | LOW | **P1** |
| Window state persistence | MEDIUM | LOW | **P1** |
| Cross-platform builds | HIGH | MEDIUM | **P1** |
| App icon/branding | MEDIUM | LOW | **P1** |
| GEDCOM file association | HIGH | MEDIUM | **P2** |
| Recent documents | MEDIUM | LOW | **P2** |
| Auto-updates | HIGH | MEDIUM | **P2** |
| Native notifications | MEDIUM | MEDIUM | **P2** |
| System tray | MEDIUM | MEDIUM | **P2** |
| Drag-and-drop files | MEDIUM | MEDIUM | **P3** |
| Export to PDF | MEDIUM | HIGH | **P3** |
| Taskbar progress | LOW | LOW | **P3** |
| Deep links | LOW | MEDIUM | **P3** |
| Print dialog | LOW | MEDIUM | **P3** |

**Priority key:**
- P1: Must have for launch - core desktop app functionality
- P2: Should have, add in v1.x - enhances desktop experience significantly
- P3: Nice to have, future consideration - polish and advanced features

---

## Competitor Feature Analysis

| Feature | RootsMagic | Family Tree Maker | Gramps | Our Approach |
|---------|------------|-------------------|--------|--------------|
| Native file dialogs | Yes | Yes | Yes | P1 - Essential |
| GEDCOM import/export | Yes | Yes | Yes | P1 - Core requirement |
| File association (.ged) | Yes | Yes | Yes | P2 - After core stable |
| Auto-updates | Yes | Yes | Manual | P2 - Essential for maintenance |
| Recent documents | Yes | Yes | Yes | P2 - Expected by power users |
| Print/export charts | Yes (extensive) | Yes (extensive) | Yes | P3 - Complex, defer |
| Cloud sync | Ancestry/FamilySearch | Ancestry | No | Not planned (complexity) |
| Mobile companion | Yes (viewer) | No | No | Future consideration |
| Multiple databases | Yes | Limited | Yes | Single tree focus initially |
| Offline-first | Yes | Yes | Yes | Already implemented |

### Competitive Positioning

Ancestree differentiates through **3D visualization**, not through feature parity with established genealogy software. Focus desktop features on:

1. **Smooth file handling** - Import/export GEDCOM seamlessly
2. **Professional distribution** - Auto-updates, signed builds, installer
3. **Native experience** - Menus, shortcuts, OS integration
4. **Don't compete on features RootsMagic spent 20 years building** - Reports, charts, source management

---

## Sources

### Official Documentation (HIGH confidence)
- [Electron - Dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- [Electron - IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron - Tray API](https://www.electronjs.org/docs/latest/api/tray)
- [Electron - Keyboard Shortcuts](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)
- [Electron - Recent Documents](https://www.electronjs.org/docs/latest/tutorial/recent-documents)
- [Electron - Auto Updater](https://www.electronjs.org/docs/latest/api/auto-updater)
- [Electron - Deep Links](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
- [Electron - Taskbar Customization](https://www.electronjs.org/docs/latest/tutorial/windows-taskbar)
- [Electron - Native File Drag & Drop](https://www.electronjs.org/docs/latest/tutorial/native-file-drag-drop)
- [Electron - Notification API](https://www.electronjs.org/docs/latest/api/notification)
- [Electron - Shell API](https://www.electronjs.org/docs/latest/api/shell)
- [Electron - Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)

### Third-Party Tools (MEDIUM confidence)
- [electron-builder Auto Update](https://www.electron.build/auto-update.html)
- [Sentry for Electron](https://docs.sentry.io/platforms/javascript/guides/electron/)

### Market Research (MEDIUM confidence)
- [RootsMagic - Genealogy Software](https://www.rootsmagic.com/)
- [Best Family Tree Software 2026 - Venngage](https://venngage.com/blog/best-family-tree-software/)
- [Top Genealogy Software 2026 - No1Reviews](https://genealogy-software.no1reviews.com/)
- [Electron Desktop App Development Guide 2026 - Fora Soft](https://www.forasoft.com/blog/article/electron-desktop-app-development-guide-for-business)

### Security and Best Practices (HIGH confidence)
- [Electron Security Documentation](https://www.electronjs.org/docs/latest/tutorial/security)
- [Common Misconfigurations in Electron Apps - Cobalt](https://www.cobalt.io/blog/common-misconfigurations-electron-apps-part-1)

---
*Feature research for: Electron desktop app (Ancestree)*
*Researched: 2026-01-26*
