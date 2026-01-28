# Ancestree

## What This Is

Ancestree is an interactive 3D family tree visualization tool that replaces static genealogy websites with an immersive experience. Users can create, explore, and manage family trees with a galaxy-themed 3D view. This milestone adds Electron-based desktop app support alongside the existing web version, sharing the same React + Three.js codebase.

## Core Value

Users can visualize and explore their family history through an interactive 3D experience that makes genealogy engaging and intuitive.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — existing codebase capabilities -->

- ✓ 3D family tree visualization with galaxy theme — existing
- ✓ Family member CRUD (create, read, update, delete) — existing
- ✓ Relationship management (parent-child, spouse, sibling) — existing
- ✓ Local data persistence via IndexedDB — existing
- ✓ JSON import/export for family tree data — existing
- ✓ Timeline view for chronological exploration — existing
- ✓ Image support for family member photos — existing
- ✓ Reactive data updates (changes reflect immediately) — existing
- ✓ Member detail panel with biographical info — existing
- ✓ Minimap for navigation in 3D space — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Electron wrapper for desktop app builds
- [ ] Desktop app runs on macOS, Windows, and Linux
- [ ] Website continues working as-is (no regressions)
- [ ] Native file save dialog to export family trees
- [ ] Native file open dialog to import family trees
- [ ] System tray icon with quick access menu
- [ ] Menu bar integration (macOS) / taskbar presence (Windows/Linux)
- [ ] Desktop app shares codebase with web version

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- App store distribution — Focus on building first, distribution later
- Cloud storage/sync — Keep local-first architecture for this milestone
- Mobile app — Desktop and web first, mobile is a separate effort
- Auto-update mechanism — Can add in future milestone
- Desktop-only features beyond file dialogs and tray — Keep feature parity with web

## Context

Ancestree is a brownfield project with a mature React 19 + TypeScript codebase. It uses:
- **Vite 7** for building (already compatible with Electron)
- **Three.js + react-three-fiber** for 3D rendering
- **Dexie.js** for IndexedDB storage (works in Electron's Chromium)
- **Tailwind CSS** for styling

The storage layer has an abstraction interface (`StorageInterface`) designed for future cloud migration, which also makes it easy to adapt for desktop file system access.

The codebase follows a clean layered architecture: Storage → Services → Hooks → Components/Scenes. This separation makes it straightforward to add Electron-specific code without modifying the core application logic.

## Constraints

- **Framework**: Electron (user choice over Tauri for ecosystem maturity)
- **Shared Codebase**: Web and desktop must use the same React app — no forking
- **Platforms**: Must build for macOS, Windows, and Linux
- **Web Compatibility**: Website must continue working independently of Electron

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Electron over Tauri | User preference; larger ecosystem, more mature, battle-tested | — Pending |
| Shared codebase (web + desktop) | Avoid maintenance burden of separate codebases | — Pending |
| Native file dialogs for import/export | Better UX than browser file pickers on desktop | — Pending |

---
*Last updated: 2026-01-26 after initialization*
