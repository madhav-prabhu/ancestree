# Agent Architecture Documentation

This document explains how the multi-agent system works in this project, its mechanics, limitations, and potential pitfalls.

## How Claude Code Agents Work

### The Task Tool

Claude Code uses a `Task` tool to spawn sub-agents. When invoked:

```
Task(
  prompt: "Your instructions to the agent",
  subagent_type: "general-purpose" | "Explore" | "Bash" | "Plan",
  description: "Short description"
)
```

1. A new Claude instance is created with the given prompt
2. That instance has access to tools (Read, Write, Edit, Bash, Grep, Glob, Task, etc.)
3. The agent works autonomously until it completes or hits limits
4. Results are returned to the parent agent

### Agent Hierarchy

```
Main Session (You talking to Claude)
    │
    └─► Task tool spawns Agent A
            │
            └─► Agent A can spawn Agent B via Task tool
                    │
                    └─► Agent B can spawn Agent C... and so on
```

**Key point**: Each agent is a fresh Claude instance. It does NOT inherit the parent's conversation history (except what you explicitly include in the prompt).

## Built-in Agent Types

| Type | Description | Best For |
|------|-------------|----------|
| `general-purpose` | Full tool access, can spawn sub-agents | Complex multi-step tasks |
| `Explore` | Optimized for codebase navigation | Finding files, understanding structure |
| `Bash` | Command execution specialist | Running builds, tests, git operations |
| `Plan` | Architecture planning | Designing implementation approaches |

## Our Custom Agent Architecture

We define custom agents by creating detailed prompts that get passed to `general-purpose` agents:

```
┌─────────────────────────────────────────┐
│           ORCHESTRATOR AGENT            │
│  (.claude/agents/orchestrator.md)       │
│  - Reads project state                  │
│  - Decides which specialists to invoke  │
│  - Coordinates parallel work            │
│  - ENFORCES verification at each step   │
│  - Synthesizes results                  │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┐
    ▼             ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐
│Frontend│  │    3D    │  │  Data  │  │Code Review│
│ Agent  │  │  Agent   │  │ Agent  │  │   Agent   │
└────────┘  └──────────┘  └────────┘  └───────────┘
    │             │             │             │
    └─────────────┴──────┬──────┴─────────────┘
                         ▼
              ┌─────────────────────┐
              │  VERIFICATION AGENT │
              │  - Runs build       │
              │  - Runs tests       │
              │  - Starts dev server│
              │  - Confirms feature │
              │  - Reports pass/fail│
              └─────────────────────┘
```

## Mandatory Verification Workflow

**⚠️ CRITICAL: No feature is complete until verified.**

```
┌──────────────────────────────────────────────────────────────┐
│                    VERIFICATION LOOP                         │
│                                                              │
│   ┌─────────┐     ┌──────────┐     ┌─────────────────────┐  │
│   │Implement│ ──► │ Verify   │ ──► │ Pass?               │  │
│   │Feature  │     │(mandatory)│     │ ├─Yes─► Continue    │  │
│   └─────────┘     └──────────┘     │ └─No──► Fix & Loop  │  │
│                         ▲          └─────────────────────┘  │
│                         │                    │              │
│                         └────────────────────┘              │
│                              (if failed)                    │
└──────────────────────────────────────────────────────────────┘
```

The Orchestrator MUST invoke the Verification Agent after every feature implementation. Verification includes:
1. Build compiles without errors
2. All tests pass
3. Dev server starts successfully
4. Feature works as expected
5. User confirms UI changes (when applicable)

## How to Invoke Agents

### Option 1: Ask Claude directly
```
"Use the Orchestrator agent to implement user authentication"
"Spin up the 3D agent to create the family tree visualization"
```

### Option 2: Reference the agent file
```
"Read .claude/agents/orchestrator.md and follow those instructions to build the export feature"
```

### Option 3: Claude decides automatically
If CLAUDE.md references these agents, Claude may decide to use them based on the task.

---

## IMPORTANT: Pitfalls and Limitations

### Pitfall 1: Context Loss Between Agents

**Problem**: Each sub-agent starts fresh. It doesn't know what you discussed with the parent.

**Example**:
```
You: "Let's use PostgreSQL for the database"
Claude: "Got it, I'll use PostgreSQL"
Claude: *spawns Data Agent*
Data Agent: *might choose SQLite because it doesn't know about your PostgreSQL decision*
```

**Solution**: Always include critical context in the agent prompt:
```
Task(
  prompt: "CONTEXT: User wants PostgreSQL. Create the database schema for...",
  ...
)
```

### Pitfall 2: Conflicting Changes

**Problem**: Two parallel agents might edit the same file differently.

**Example**:
- Frontend Agent adds a component import to App.tsx
- 3D Agent also adds a different import to App.tsx
- One change may overwrite the other

**Solution**:
- The Orchestrator should coordinate which agent owns which files
- Or run agents sequentially when they touch the same files

### Pitfall 3: Agent Runaway

**Problem**: An agent might go off-track or make unexpected changes.

**Example**: You ask for "a simple button" and the agent refactors the entire component structure.

**Solution**:
- Be specific in prompts about scope
- Use phrases like "ONLY modify X, do not touch Y"
- Review agent outputs before accepting

### Pitfall 4: Depth Limits

**Problem**: Too many nested agents can hit context limits or become hard to track.

**Recommendation**: Keep hierarchy shallow (max 2-3 levels deep)

```
Good:  Main → Orchestrator → Specialist
Bad:   Main → Orchestrator → Specialist → Helper → SubHelper → ...
```

### Pitfall 5: No Shared Memory

**Problem**: Agents don't share a database or memory. Each only knows what's in:
- Its prompt
- Files it reads from disk
- Tool outputs

**Solution**: Use the filesystem as shared state:
- Write status/decisions to files (e.g., `.claude/state/decisions.md`)
- Have agents read these files for coordination

### Pitfall 6: Cost and Latency

**Problem**: Each agent is a separate API call. Deep hierarchies = more API calls = more cost and time.

**Solution**: Use agents judiciously. Not every task needs an agent—simple tasks can be done directly.

---

## Best Practices

### 1. Clear Boundaries
Define exactly what each agent is responsible for:
- Frontend Agent: `src/components/`, `src/hooks/`, styling
- 3D Agent: `src/scene/`, Three.js code
- Data Agent: `src/services/`, `src/models/`, storage

### 2. Explicit Handoffs
When the Orchestrator delegates, include:
- What to do
- What NOT to do
- What files to touch
- Expected output format

### 3. State Files
Use files to track decisions and progress:
```
.claude/
  state/
    architecture-decisions.md   # Key technical decisions
    current-sprint.md          # What we're working on
```

### 4. Review Checkpoints
Have the Orchestrator pause for human review after major changes:
- "I've completed the data layer. Please review before I proceed to the UI."

---

## File Structure

```
.claude/
├── agents/
│   ├── orchestrator.md      # Project Manager agent prompt
│   ├── frontend.md          # Frontend specialist prompt
│   ├── three-d.md           # 3D/Visualization specialist prompt
│   ├── data.md              # Data layer specialist prompt
│   ├── code-review.md       # Code review specialist prompt
│   └── verification.md      # Testing & deployment verification
└── state/
    └── decisions.md         # Shared architectural decisions
```

---

## Quick Reference: Invoking an Agent

```markdown
"Please use the [Agent Name] agent to [task description]"

or

"Read .claude/agents/[agent-file].md and execute those instructions for [task]"
```

The agents are defined in `.claude/agents/` - read them to understand what each specializes in.
