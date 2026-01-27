# Phase 5: System Integration - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

System tray presence and auto-update capability. Users can access Ancestree from the system tray and receive updates without manual downloads. Creating new features, changing app behavior, or adding new UI screens are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Tray Behavior
- Close button (X) quits the app entirely — no minimize-to-tray behavior
- Click behavior follows platform conventions: macOS shows menu on click, Windows/Linux toggle window
- Claude's discretion: when tray icon appears, whether to show status indicators

### Context Menu Items
- Show current tree filename in menu header
- Include "Check for Updates" menu item for manual update checks
- No "Open Recent" submenu — keep menu minimal
- Menu structure: [Current File] > Show Window > Check for Updates > Quit
- Claude's discretion: whether to include quick actions beyond these

### Update Notifications
- Use OS-native system notifications (non-blocking, can be dismissed)
- Show version number and brief changelog in notification
- User can dismiss and be reminded on next launch (no permanent skip)
- Claude's discretion: check frequency (on launch, daily, etc.)

### Update Installation
- Download starts only when user clicks "Download" (not automatic)
- Show progress indicator during download
- Install silently on next app quit (no restart prompt)
- Use GitHub Releases as update server

### Claude's Discretion
- Tray icon visibility timing (always visible vs only when minimized)
- Tray status indicators (badge for update available, etc.)
- Specific quick actions beyond Show/Check/Quit
- Update check frequency
- Progress indicator placement (tray tooltip, in-app, or both)

</decisions>

<specifics>
## Specific Ideas

- GitHub Releases for hosting updates — familiar workflow, free, integrates with CI
- System notifications feel native and non-intrusive
- "Install on quit" pattern avoids disrupting user workflow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-system-integration*
*Context gathered: 2026-01-27*
