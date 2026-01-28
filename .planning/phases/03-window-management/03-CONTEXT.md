# Phase 3: Window Management - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

The app window behaves like a native application with persistent size/position and platform-appropriate window controls. Users restart the app and window appears where they left it. Standard window controls (minimize, maximize, close) work as expected on each platform.

</domain>

<decisions>
## Implementation Decisions

### State Persistence Scope
- Persist size and position only (x, y, width, height)
- Do NOT persist fullscreen/maximized state — always open windowed
- Do NOT persist display/monitor ID — use absolute screen coordinates
- Do NOT persist zoom level — always start at 100%
- Store window state using electron-store (same approach as auto-save drafts)

### Edge Case Handling
- Enforce minimum window size (prevents unusably small windows)
- No maximum window size constraint (window can fill entire screen)
- Log corrupted/invalid state errors for debugging, then fallback to defaults
- Don't notify user about state corruption — silent recovery

### Initial Window State
- Position: Let OS decide on first launch (system default placement)
- Size: Percentage of screen dimensions (adapts to any display)
- First-launch experience should feel native to each platform

### Save Timing
- Debounced save on resize/move (500ms delay)
- No separate save on close — debounce handles it
- Log save events in development mode only, silent in production

### Claude's Discretion
- Exact percentage for initial window size (optimize for 3D visualization)
- Exact minimum window dimensions (based on UI requirements)
- Off-screen position recovery strategy (center vs. snap to edge)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches that feel native on each platform.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-window-management*
*Context gathered: 2026-01-27*
