# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ancestree is a family tree visualization tool designed to replace static genealogy websites with an interactive 3D experience. The project is in early development.

## Core Features (Planned)

- **Family Member Management**: Add members with name, date of birth, place of birth, date of death, and notes
- **3D Visualization**: Interactive tree that users can navigate by moving, scrolling, and clicking nodes
- **Unlimited Scale**: No restrictions on family tree size

## Current State

This is a greenfield project. No build system, dependencies, or source code exist yet. Technology stack decisions are pending.

## Architecture Considerations

When implementing, consider:
- **Data Model**: Family members form a graph structure (not a pure tree due to marriages connecting branches)
- **Relationships**: Parent-child, spouse, and sibling connections need distinct handling
- **3D Rendering**: Libraries like Three.js or similar will be needed for interactive visualization
- **Persistence**: Local storage, file-based, or database backend for saving family data
