# ArmorStrike — Project Rules

Self-contained workflow. Works in any IDE/CLI that reads AGENTS.md.

## Session Start

1. Check `Docs/GDD/Drafts/README.md` → mention active drafts.
2. Read `Docs/GDD/Approved/00_Index.md` → map of implemented mechanics + code sources of truth.
3. Check `BACKLOG.md` → mention open (unchecked) tasks.

## 1. Commands & Verification (npm)

- `npm run dev` — Vite dev server.
- `npm run typecheck` — `tsc --noEmit` over **two** projects: `tsconfig.json` (browser `src/`, `types: ["vite/client"]` only) and `tsconfig.node.json` (`vite.config.ts` + `src/__tests__/` + `scripts/`, adds `@types/node`). Node types are scoped on purpose: browser code must not compile `process`/`Buffer`/`require`.
- `npm test` — `vitest run` (tests live in `src/__tests__/*.test.ts(x)`).
- `npm run lint` — `eslint src`. `no-explicit-any` is an **error** in shipped code, off under `src/__tests__/` (partial test doubles).
- `npm run census` — draw-call census (`scripts/draw-call-census.ts`).
- `npm run map-plan [mapId]` — map plan report: collider density, zones, spawn points from real colliders (`scripts/map-plan.ts` → `screenshots/<mapId>-plan.html`).
- `npm run docs:check` — docs consistency gate (`scripts/docs-check.ts`): .md links, `[[wiki-links]]`, code paths cited in backticks, `npm run` names vs package.json; runs in CI. Archive docs (`Docs/GDD/Archive/**`) may cite deleted files on purpose.
- `npm run preview` — `vite preview` (serve `dist/`).
- `npm run preview:models` — procedural hull/turret previews via headless CPU render (`scripts/hull-preview.ts` → `screenshots/hull-preview/*.png`).
- `npm run build` — typecheck + Vite production build.

**Verified** = `npm run typecheck` + `npm test` + `npm run lint` green. CI additionally gates `docs:check` and `build` (bundle-size + subfolder-deploy).

> **Install gotcha:** bundled npm 10.9.7 (managed Node 22) can crash in arborist's `#loadPeerSet` (`edgesOut` null) on some peer sets (hit when adding vitest 4). Install with system Node 24 / npm 11 — the `lockfileVersion: 3` lock still installs via `npm ci` under npm 10. Do not reach for `--legacy-peer-deps`/`.npmrc` — switch npm.

> **Dev-server gotcha:** `vite.config.ts` pins `server.host = '127.0.0.1'`. Vite's default is `localhost`, which on Windows resolves to `::1`, so the server binds IPv6-loopback **only** and `http://127.0.0.1:5178` is refused (browser shows "page not found"). Open `http://127.0.0.1:5178`, not `localhost:5178`. To expose the dev server on the LAN: `npm run dev -- --host`.

> **Dev-server crash gotcha:** chokidar cannot open a file/dir another process holds, and the resulting unhandled `EBUSY: resource busy or locked, watch '...'` **kills the whole dev server**. Two real sources in this repo: editors saving atomically (`.<file>.<pid>.<uuid>.tmpdir/` next to the file) and scratch tooling under `screenshots/` (chrome `--user-data-dir`, captured PNGs). `server.watch.ignored` in `vite.config.ts` covers both — keep those patterns when touching `server.watch`, and prefer a browser profile outside the project (`$env:TEMP`). Symptom if it regresses: the page keeps running a half-patched bundle and reloads hit a dead server, so FX "disappear" with no error in the game itself.

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

After feature/refactor is **Verified**: extract patterns → write `Docs/Architecture/` → notify.
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
