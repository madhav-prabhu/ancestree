# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ancestree is a family tree visualization tool designed to replace static genealogy websites with an interactive 3D experience.

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite 7
- **3D Rendering**: Three.js via react-three-fiber + @react-three/drei
- **Storage**: Dexie.js (IndexedDB) with abstraction layer for future cloud migration
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest + React Testing Library

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # TypeScript check + production build
npm run test      # Run tests once
npm run test:ui   # Run tests with UI
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Project Structure

```
src/
├── components/    # React UI components (Frontend Agent domain)
├── hooks/         # Custom React hooks
├── scene/         # 3D scene components (3D Agent domain)
│   ├── TreeScene.tsx   # Main Canvas with lighting and controls
│   └── FamilyNode.tsx  # Individual 3D node for a family member
├── services/      # Data layer and storage (Data Agent domain)
├── models/        # TypeScript interfaces (FamilyMember, Relationship)
├── test/          # Test setup
└── App.tsx        # Main app with demo data
```

## Agent System

This project uses a multi-agent architecture. See `AGENTS.md` for full documentation.

### Quick Reference

| Agent | Location | Domain |
|-------|----------|--------|
| Orchestrator | `.claude/agents/orchestrator.md` | Project coordination |
| Frontend | `.claude/agents/frontend.md` | UI components, hooks, styling |
| 3D | `.claude/agents/three-d.md` | Three.js, visualization |
| Data | `.claude/agents/data.md` | Models, storage, persistence |
| Code Review | `.claude/agents/code-review.md` | Quality checks |
| **Verification** | `.claude/agents/verification.md` | **Build, test, deploy, confirm** |

### Mandatory Verification

**⚠️ Every feature must be verified before proceeding.** The Orchestrator enforces this workflow:

```
Implement → Verify → (Pass? Continue : Fix & Re-verify)
```

Verification includes: build passes, tests pass, dev server runs, feature works.

### Invoking Agents

```
"Use the Orchestrator agent to implement [feature]"
"Spin up the 3D agent to create [visualization element]"
```

### Shared State

Check `.claude/state/decisions.md` for architectural decisions before starting work.

## Core Data Model

Family trees are **graphs** (not pure trees) because marriages connect branches:

- `FamilyMember`: Person with name, dates, birthplace, notes
- `Relationship`: Connections (parent-child, spouse, sibling)
- `FamilyTree`: Collection of members and relationships

## Architecture Principles

- **Storage Abstraction**: All data access through service layer (enables cloud migration)
- **Agent Boundaries**: Each agent owns specific directories—coordinate via Orchestrator
- **Local-First**: Data stored in browser (IndexedDB), exportable as JSON
