# ArmorStrike — Project Rules

Self-contained workflow. Works in any IDE/CLI that reads AGENTS.md.

## Session Start

1. Check `Docs/GDD/Drafts/README.md` → mention active drafts.
2. If `graphify-out/manifest.json` >7 days old → `graphify update . --force` silently.

## 1. GDD Lifecycle

### Phase A: Brainstorming
**WHEN** user brainstorms mechanics/features:
- Act as Lead Game Designer. Discuss, balance, iterate.
- **Auto-Draft:** document in `Docs/GDD/Drafts/`. Update Drafts/README.md table.

### Phase A → B: Approval Signal
Implementation **only** on explicit approval:
- Recognized: "утверждаю", "implement", "делай", "пиши код", "/approve", "go ahead"
- NOT approval: "sounds good", "interesting", "ok"
- If uncertain → ask: "Утверждаешь для реализации?"

### Phase B: Implementation
- Read `Docs/GDD/Approved/` first. Small diffs.

### Phase C: Auto-Documentation
- Move draft → Approved. Document exact state (math, classes, flows).
- Update `00_Index.md`.

## 2. Architecture (Auto-Extraction)
After feature/refactor verified: extract patterns → write `Docs/Architecture/` → notify.
NEVER invent content not in code.

## 3. Graphify
After code/docs changes: `graphify update . --force`
After docs changes: `graphify extract . --backend ollama --model qwen2.5-coder:7b`
Ollama unavailable → AST-only + warn once.
`--force` only after refactors that delete files.
Orientation: `graphify query|path|explain` before grep.

## 4. Hotfix
Non-mechanic fix → fix + verify + update GDD if behavior changed + `graphify update . --force`.

## 5. Working Style
- GDD Approved contradicts code → fix code (unless user says GDD outdated).
- Small diffs. Run tests. No invented APIs.

## 6. Stack
- React 19 + Three.js (web 3D game), Vite, TypeScript, Tailwind CSS, Vitest, ESLint.

