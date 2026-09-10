# ArmorStrike — Project Rules

Self-contained workflow. Works in any IDE/CLI that reads AGENTS.md.

## Session Start

1. Check `Docs/GDD/Drafts/README.md` → mention active drafts.
2. Read `Docs/GDD/Approved/00_Index.md` → map of implemented mechanics + code sources of truth.

## 1. Commands & Verification (npm)

- `npm run dev` — Vite dev server.
- `npm run typecheck` — `tsc --noEmit` over **two** projects: `tsconfig.json` (browser `src/`, `types: ["vite/client"]` only) and `tsconfig.node.json` (`vite.config.ts` + `src/__tests__/`, adds `@types/node`). Node types are scoped on purpose: browser code must not compile `process`/`Buffer`/`require`.
- `npm test` — `vitest run` (tests live in `src/__tests__/*.test.ts`).
- `npm run lint` — `eslint src`. `no-explicit-any` is an **error** in shipped code, off under `src/__tests__/` (partial test doubles).
- `npm run census` — draw-call census (`scripts/draw-call-census.ts`).
- `npm run build` — typecheck + Vite production build.

**Verified** = `npm run typecheck` + `npm test` green.

> **Install gotcha:** the bundled npm 10.9.7 (managed Node 22) cannot resolve some peer sets — it throws `TypeError: Cannot read properties of null (reading 'edgesOut')` in arborist's `#loadPeerSet` (hit while adding vitest 4). Installing with the system Node 24 / npm 11.19 works and produces a `lockfileVersion: 3` lock that plain `npm ci` under npm 10 consumes fine. Do not reach for `--legacy-peer-deps`/`.npmrc` — switch npm instead.

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
- Read the relevant docs in `Docs/GDD/Approved/` + `00_Index.md` first. Small diffs.
- Done only when **Verified** (§1).

### Phase C: Auto-Documentation
**WHEN** Phase B is **Verified**:
- Move draft → Approved: document exact state (math, classes, flows).
- Update `00_Index.md` navigation table.
- Delete draft file + remove its entry from Drafts/README.md (history in git).

## 4. Architecture (Auto-Extraction)

After feature/refactor is **Verified**: extract patterns → write `Docs/Architecture/` → notify.
Naming: `Standard_*.md` for reusable patterns, `Core*.md` for foundations.
NEVER invent content not in code.

## 5. Hotfix

- Bug fixes (mechanic or not) need no approval, but report what changed.
- Balance tweaks: **code first** → then sync the GDD doc.
- Update GDD if behavior changed.

## 6. Working Style

- GDD Approved contradicts code → fix code (unless user says GDD outdated).
- Small diffs. No invented APIs.
- Language: GDD/Architecture docs in **Russian**; code, comments, commits in **English**; respond in the user's language.

## 7. Stack

- React 19 + Three.js + собственная 2D-физика (AABB-коллайдеры, `src/game/engine/physics.ts` — без внешнего физического движка), Vite, TypeScript, Tailwind CSS 4, Vitest, ESLint.
- Node `^20.19.0 || >=22.12.0`. Extras: lucide-react.
