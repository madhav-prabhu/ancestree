# Phase 2: File Operations & Menus - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Native file save/open dialogs and application menus with keyboard shortcuts. Users can save and open family tree files using OS-native dialogs, and navigate the app via standard menus (File, Edit, View, Help) with keyboard shortcuts.

Scope includes: file dialogs, menu bar, keyboard shortcuts, dirty state tracking, and export functionality.

Not in scope: recent files list (v2), file associations (v2), multiple windows (explicitly excluded).

</domain>

<decisions>
## Implementation Decisions

### File format & naming
- Use `.json` extension — standard format, users can inspect/edit manually
- Save tree data only (members and relationships) — no view state or app settings
- Default filename: `Untitled.json`
- File dialogs filter to `.json` files only

### Unsaved changes handling
- Platform-appropriate dirty indicator: dot on macOS, asterisk on Windows/Linux
- Confirm dialog on close with unsaved changes: "Save changes?" with Save / Don't Save / Cancel
- Auto-save draft to temp location periodically for crash recovery
- "New" triggers same confirm dialog as close when there are unsaved changes

### Menu organization
- **File menu**: New, Open, Save, Save As, Export..., Quit (standard)
- **Edit menu**: Undo, Redo, separator, Cut, Copy, Paste, Select All
  - Undo/Redo for tree modifications (not just clipboard)
- **View menu**: Zoom In, Zoom Out, Reset Zoom, separator, Reset Camera, Toggle Grid, Switch View Mode
  - 3D-specific controls in View menu
- **Help menu**: About Ancestree, separator, Documentation, Visit Website, Report Issue
- **DevTools**: Hidden shortcut (Cmd+Option+I) works in production, but no menu item

### Save/Export behavior
- "Save" prompts for location on first save, then overwrites silently
- "Save As" always prompts for new location
- Export dialog with format selection (not separate menu items)
- Export formats: JSON and GEDCOM (for genealogy software compatibility)
- "Open" replaces current tree (with unsaved changes prompt if needed)

### Claude's Discretion
- Exact auto-save interval and temp file location
- GEDCOM export field mapping details
- Keyboard shortcut for 3D view controls (if any)
- Error handling for corrupt/invalid files

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User preferences align with conventional desktop app patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-file-operations-menus*
*Context gathered: 2026-01-27*
