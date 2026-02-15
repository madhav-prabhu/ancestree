---
status: testing
phase: 08-fix-ui-bugs
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md]
started: 2026-01-31T23:00:00Z
updated: 2026-01-31T23:00:00Z
---

## Current Test

number: 1
name: Relationship persistence on file open
expected: |
  1. Create 3 family members (e.g., Alice, Bob, Carol)
  2. Add relationships: Alice → Bob (parent-child), Bob ↔ Carol (spouse)
  3. Save file via File > Save As
  4. Close app completely
  5. Reopen app
  6. Open the saved file via File > Open
  → Both relationships should be restored and visible in the tree
awaiting: user response

## Tests

### 1. Relationship persistence on file open
expected: Create family tree with relationships, save file, close app, reopen, load file. All relationships should be present after opening the file.
result: [pending]

### 2. Relationship persistence on crash recovery
expected: Create family tree with relationships, force-quit app without saving (kill process), relaunch app, accept crash recovery prompt. All relationships should be restored from auto-save draft.
result: [pending]

### 3. Node position persistence on page refresh
expected: In the app (web or Electron), drag a node to a new position, wait 1 second, refresh the page. The node should appear at the dragged position, not the calculated default position.
result: [pending]

### 4. Node position persistence in file save/open cycle
expected: Create family tree, drag a node to custom position, save file, close app, reopen, load file. The dragged node should appear at its custom position.
result: [pending]

### 5. Node positions included in export
expected: Create family tree, drag a node to custom position, export as JSON (File > Save As). Open the JSON file in a text editor. The family member should have a "position" field with x, y, z coordinates.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0

## Gaps

[none yet]
