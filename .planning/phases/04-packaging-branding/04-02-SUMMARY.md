---
phase: 04-packaging-branding
plan: 02
subsystem: infra
tags: [electron-builder, code-signing, notarization, appimage, deb, linux, macos]

# Dependency graph
requires:
  - phase: 04-packaging-branding/04-01
    provides: application icons and electron-builder.yml
provides:
  - macOS code signing infrastructure (entitlements + notarization)
  - Working Linux installers (AppImage and deb)
  - Verified packaging pipeline
affects: [05-01]

# Tech tracking
tech-stack:
  added: ["@electron/notarize"]
  patterns: [afterSign hook, graceful credential skipping]

key-files:
  created:
    - build/entitlements.mac.plist
    - scripts/notarize.cjs
    - dist/Ancestree-0.1.0.AppImage
    - dist/ancestree_0.1.0_amd64.deb
  modified:
    - electron-builder.yml
    - electron.vite.config.ts
    - electron/main/index.ts
    - package.json

key-decisions:
  - "Preload script must be CommonJS for Electron sandbox compatibility"
  - "Notarization script skips gracefully when Apple credentials not set"
  - "afterSign hook only runs on macOS builds"

patterns-established:
  - "Preload output: always .cjs format when sandbox: true"
  - "Notarization: check env vars, skip with warning if missing"

# Metrics
duration: 8min
completed: 2026-01-27
---

# Phase 4 Plan 2: macOS Signing & Linux Build Summary

**macOS code signing infrastructure and verified Linux packaging pipeline**

## Performance

- **Duration:** ~8 min (including checkpoint)
- **Started:** 2026-01-27
- **Completed:** 2026-01-27
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 8

## Accomplishments
- Created macOS entitlements file for hardened runtime
- Created notarization script that gracefully handles missing credentials
- Built and verified Linux AppImage (218MB) and deb package
- Fixed critical preload ESM/CJS compatibility issue discovered during testing
- User-verified AppImage launches correctly with 3D visualization

## Task Commits

Each task was committed atomically:

1. **Task 1: Create macOS entitlements and notarization script** - `b3ad14d` (feat)
2. **Task 2: Build Linux packages and fix ESM/CJS** - `d1d31e5` (feat)
3. **Checkpoint fix: Build preload as CommonJS** - `a9d1c03` (fix)

## Files Created/Modified
- `build/entitlements.mac.plist` - macOS hardened runtime entitlements
- `scripts/notarize.cjs` - afterSign hook for Apple notarization
- `electron-builder.yml` - Added afterSign hook configuration
- `electron.vite.config.ts` - Changed preload output to CommonJS (.cjs)
- `electron/main/index.ts` - Updated preload path reference to .cjs
- `package.json` - Added @electron/notarize, author, description
- `dist/Ancestree-0.1.0.AppImage` - Linux portable application
- `dist/ancestree_0.1.0_amd64.deb` - Debian package

## Decisions Made
- **Preload as CommonJS:** Electron's sandbox mode only supports CommonJS for preload scripts. Changed from .mjs to .cjs.
- **Graceful credential skipping:** Notarization script checks for APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID and skips with informative message if missing.
- **Config-only verification for Windows/macOS:** These platforms require their native OS to build; verified config presence via grep.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Preload script ESM/CJS incompatibility**
- **Found during:** Checkpoint verification (AppImage showed blank white page)
- **Issue:** Preload built as .mjs but Electron sandbox requires CommonJS
- **Fix:** Updated electron.vite.config.ts to output preload as .cjs, updated main process reference
- **Files modified:** electron.vite.config.ts, electron/main/index.ts
- **Verification:** AppImage launches correctly, 3D visualization works
- **Committed in:** a9d1c03

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Critical fix - without this, packaged app would not work at all.

## Issues Encountered
- Initial AppImage showed blank white page due to preload ESM error in sandbox mode
- D-Bus warnings on Linux (harmless, related to Chromium sandboxing)

## User Setup Required

For macOS code signing and notarization (optional for development):
- `APPLE_ID` - Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD` - Generated at Apple ID portal
- `APPLE_TEAM_ID` - From Apple Developer Membership page

Without these, builds work but won't be signed/notarized (Gatekeeper warnings on macOS).

## Verification Results
- Linux AppImage: Launches successfully, shows 3D family tree
- Custom icon: Visible in taskbar (green "A" placeholder)
- Window state: Persists between sessions (Phase 3 feature)
- Windows config: Present in electron-builder.yml (requires Windows to build)
- macOS config: Present in electron-builder.yml (requires macOS to build)

---
*Phase: 04-packaging-branding*
*Completed: 2026-01-27*
