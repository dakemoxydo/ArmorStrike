# ArmorStrike — Project Rules

This project uses Obsidian for Game Design Documents (GDD) under the `Docs/` directory. 
These rules override or extend the global `AGENTS.md`.

## 1. GDD & Obsidian Workflow (The Core Loop)

**MUST** strictly follow this lifecycle for game mechanics, features, and ideas:

### Phase A: Brainstorming
**WHEN** the user brainstorms new ideas, features, or mechanics:
- Act as a Lead Game Designer. Discuss, balance, and iterate in the chat.
- **Auto-Draft:** If an idea is taking shape, automatically document it in `Docs/GDD/Drafts/`. Do not wait for the user to ask.

### Phase B: Implementation
**WHEN** the user approves a mechanic for implementation:
- Write the code (keep diffs small, follow existing architecture).
- Read the relevant `Docs/GDD/Approved/` files first to ensure compliance with established rules.

### Phase C: Auto-Documentation (The Sync Hook)
**WHEN** code for a new or modified mechanic is successfully written and verified:
- **MUST Auto-Promote:** Move the relevant file from `Docs/GDD/Drafts/` to `Docs/GDD/Approved/` (or create a new one there).
- **MUST Document Logic:** Update the `.md` file to reflect the *exact* implemented state. Include the underlying math, state machines, logic proofs, and explicit references to the created classes/scripts (e.g., "Handled by `TankController`"). Do not dump raw code; document the architecture.

## 2. Graphify Integration (Overrides Global)

Because this project relies heavily on semantic GDD files in Obsidian, the standard AST-only `graphify update` is insufficient after feature work.

**MUST** order of ops for the "Close" step after code AND documentation changes:
1. Ensure all `Docs/GDD/Approved/` files are up to date.
2. **ALWAYS** run the local semantic extraction to link the new Obsidian docs with the codebase:
   `graphify extract . --backend ollama --model ornith:9b`
3. Never ask for permission to run this extraction; it is mandatory for the Knowledge Graph.

## 3. Working Style Extensions

- Never invent new game mechanics during routine refactoring.
- If a system behavior contradicts `Docs/GDD/Approved/`, treat the documentation as the single source of truth and fix the code (or ask the user if the GDD should change).