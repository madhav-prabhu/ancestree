# Phase 7: File Operations Polish - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Handle edge cases in file operations: prompt to save when creating new file, coordinate save-then-close flow. This closes the TODO gaps from the milestone audit. No new file operation features — just polish existing flows.

</domain>

<decisions>
## Implementation Decisions

### Dialog Messaging
- Direct/minimal tone: "Save changes?"
- Generic text — no document name included
- Same dialog for both New and Close actions
- Brief subtext: "Your changes will be lost if you don't save."

### Button Choices
- Labels: Save / Don't Save / Cancel (macOS-style)
- Save button is primary (blue/emphasized)
- Cancel aborts completely — returns to current document
- Keyboard: Escape = Cancel, Enter = Save

### Flow After Save
- Auto-continue: After successful save, New/Close proceeds automatically
- Save failure: Abort action, show error, stay on document (no retry dialog)
- Never-saved documents: Show Save As dialog before continuing
- Save As cancelled: Abort completely (treat as Cancel)

### Edge Cases
- Save in progress: Queue the New/Close action, show dialog after save completes
- No double-click debouncing — trust user
- Both window X and Cmd+Q trigger same save confirmation
- Claude's discretion: behavior if close clicked while dialog is open

### Claude's Discretion
- Exact error message wording for save failures
- Dialog styling beyond Tailwind defaults
- Handling of dialog + window close interaction

</decisions>

<specifics>
## Specific Ideas

- Follow macOS "Save / Don't Save / Cancel" convention — it's clearer than Yes/No
- Auto-continue after save keeps flow snappy, no unnecessary confirmations

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-file-operations-polish*
*Context gathered: 2026-01-27*
