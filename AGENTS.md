# ArmorStrike — Project Rules

Self-contained workflow. Works in any IDE/CLI that reads AGENTS.md.

## Session Start (Task / Implementation)

When starting a task or feature implementation session:
1. Check `Docs/GDD/Drafts/README.md` → mention active drafts.
2. Read `Docs/GDD/Approved/00_Index.md` → map of implemented mechanics + code sources of truth.
3. Check `BACKLOG.md` → mention open (unchecked) tasks.
*(For quick questions, explanations, or isolated lookups, this checklist can be skipped).*

## 1. Commands & Verification (npm)

### Verification Pipeline
- `npm run typecheck` — `tsc --noEmit` over **two** projects: `tsconfig.json` (browser `src/`, `types: ["vite/client"]` only) and `tsconfig.node.json` (`vite.config.ts` + `src/__tests__/` + `scripts/`, adds `@types/node`). Browser code must not import `process`/`Buffer`/`require`.
- `npm test` — `vitest run` (tests live in `src/__tests__/*.test.ts(x)`).
- `npm run lint` — `eslint src`. `no-explicit-any` is an **error** in shipped code, off under `src/__tests__/` (partial test doubles).
- `npm run docs:check` — docs consistency gate (`scripts/docs-check.ts`): links, `[[wiki-links]]`, cited paths, npm scripts.

**Verified** = `npm run typecheck` + `npm test` + `npm run lint` green. CI additionally gates `docs:check` and `build` (bundle-size + subfolder-deploy).

### Project Tooling
- `npm run census` — draw-call census (`scripts/draw-call-census.ts`).
- `npm run map-plan [mapId]` — map plan report: collider density, zones, spawn points (`scripts/map-plan.ts` → `screenshots/<mapId>-plan.html`).
- `npm run preview:models` — procedural hull/turret previews via headless CPU render (`scripts/hull-preview.ts` → `screenshots/hull-preview/*.png`).
- **Cloud & Agent Integrations:**
  - **Vercel:** авто-деплой веб-клиента при пуше в `main` (Vite SPA, папка `dist/`).
  - **Supabase:** PostgreSQL + Auth + RLS (`tukylkqpvzltzqrnfutc`, EU Frankfurt).
  - **Supabase MCP Server:** удалённый протокол инструментов MCP в `mcp_config.json`.
  - **Supabase Agent Skills:** локальные скиллы агента в `.agents/skills/` (`supabase`, `supabase-postgres-best-practices`).

### Environment & Server Guards
- **Dev-server host:** `vite.config.ts` pins `server.host = '127.0.0.1'`. Windows resolves `localhost` to IPv6 `::1` only (breaking browser loopback). Do not remove `127.0.0.1`.
- **Chokidar crash guard:** Never remove or narrow `server.watch.ignored` patterns in `vite.config.ts` (prevents fatal `EBUSY` crashes from atomic editor saves and scratch files in `screenshots/`).
- **npm install:** If installing packages, use system Node 24 / npm 11 (avoids npm 10.9.7 peer-set crash). Do not use `--legacy-peer-deps`.

## 2. Project Map

- `src/core/` — catalogs (hulls/turrets/weapons): `catalogData.ts`.
- `src/game/` — engine, systems, match logic; balance constants: `constants.ts`, `tuning.ts`, `match/matchConfig.ts`; simulation tick order: `engine/stages/`.
- `src/__tests__/` — unit tests.
- Full "sources of truth" table → `Docs/GDD/Approved/00_Index.md`.

## 3. GDD Lifecycle

### Phase A: Brainstorming
**WHEN** user brainstorms mechanics/features:
- Act as Lead Game Designer. Discuss, balance, iterate.
- **Auto-Draft:** create `Docs/GDD/Drafts/Mechanic_Name.md` with sections **Intent / Open questions / Acceptance**.
- Register it in Drafts/README.md under **"Active / trail"** ("Ideas backlog" if parked).
- NEVER reference Drafts from production code as source of truth.

### Phase A → B: Approval Signal
Implementation **only** on explicit approval:
- Recognized: "утверждаю", "implement", "пиши код", "/approve", "go ahead", "делай/сделай" (direct command for a discussed item)
- NOT approval: "sounds good", "interesting", "ok", "норм", "интересно", "звучит неплохо", "делай что хочешь" / "as you wish"
- If uncertain → ask: "Утверждаешь для реализации?"

### Phase B: Implementation
- Read the relevant docs in `Docs/GDD/Approved/` + `00_Index.md` first.
- Done only when **Verified** (§1).

### Phase C: Auto-Documentation
**WHEN** Phase B is **Verified**:
- Move draft → Approved: document exact state (math, classes, flows).
- Update `00_Index.md` navigation table.
- Delete draft file + remove its entry from Drafts/README.md (history in git).

## 4. Architecture (Auto-Extraction)

After a significant feature or cross-cutting subsystem is **Verified**: extract reusable patterns → document in `Docs/Architecture/` → notify. Do not create architecture docs for minor fixes, balance tweaks, or local refactors.
Naming: `Standard_*.md` for reusable patterns, `Core*.md` for foundations; reference
matrices may use a descriptive name (e.g. `Graphics_Presets_Matrix.md`).
NEVER invent content not in code.

## 5. Hotfix

- Bug fixes (mechanic or not) need no approval, but report what changed.
- Balance tweaks: **code first** → then sync the GDD doc.
- Update GDD if behavior changed.

## 6. Working Style

- GDD Approved contradicts code → fix code (unless user says GDD outdated).
- Small diffs. No invented APIs.
- Language: GDD/Architecture docs in **Russian**; identifiers, APIs, commit messages in **English**; user-facing UI strings in **Russian** (the game is localized). Code comments: Russian is the established convention in `src/` — keep new comments consistent with their file; do not mass-translate. Respond in the user's language.

## 7. Stack
 
- React 19 + Three.js + собственная 2D-физика (AABB-коллайдеры, `src/game/engine/physics.ts` — без внешнего физического движка), Vite, TypeScript, Tailwind CSS 4, Vitest, ESLint.
- Node `^20.19.0 || >=22.12.0`. Extras: lucide-react.
- Хостинг / Деплой: Vercel (production SPA).
- Облачный бэкенд: Supabase (PostgreSQL, Auth, RLS, Storage, Realtime, MCP-мост).
