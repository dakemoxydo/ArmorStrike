# ArmorStrike — Autonomous Progress Log

Loop log for the /loop-driven autonomous improvement agent. One entry per iteration.

## Baseline (recorded 2026-08-24, iter #1)

| Gate | Expected | Actual |
|---|---|---|
| `npm run typecheck` | clean | ✅ clean |
| `npm run lint` | clean | ✅ clean |
| `npm test` | 41 files, 183/183 | ✅ **43 files, 196/196** (~2.4 s) |
| `npm run build` | succeeds | ✅ `dist/index.html` = **1,097,013 B** (gzip ≈ 301.64 kB) |

Notes: test count grew vs the documented baseline (43 files / 196 tests) — audit-fix commits
added regression tests (zoneViewCache, aiFocus). No action needed; baseline recorded at actuals.
`audit.md` findings F-1…F-4 and H-1…H-5 are all FIXED per §6 — treated as closed.

---

## Iteration 3 — 2026-08-24 · [J] CODE QUALITY

**Task:** BACKLOG J2 — unit-test ArenaEffects smoke eviction under cap pressure (last H-4 remainder).

**Diagnosis + plan (written before editing):**
- `spawnStackSmoke` (ArenaEffects.ts:67–91): reuse dead slot → else create; past 44 slots
  evict oldest (scene removal + material dispose; shared smoke map must survive).
- Tuning fact discovered: spawn cadence 0.13 s × max life 4.8 s ⇒ peak concurrency ≈37 < 44,
  so the eviction guard is defensive-only — unreachable via `update()` under current tuning.
- Plan: reachable paths through public `update()`/`resetForRebuild` with real THREE +
  canvas stub (smokeSystem.test.ts pattern); eviction driven directly via the private
  spawner (`fx['spawnStackSmoke'].call`) with SpriteMaterial.dispose spied and
  cachedTexture('smoke').dispose asserted never called. No prod-code change.

**Result:** `src/__tests__/arenaEffectsSmoke.test.ts` — 4 tests green: throttle cadence,
reuse-before-grow identity, >44 cap + oldest-evicted/material-disposed/map-alive,
reset detach/clear/respawn. Harness lesson: node vitest has NO `document` — seed the
stub from `{}` when absent (existing suite pre-seeds; new suite handles both).

**Metrics:** tests 207→211 (+4); typecheck/lint clean; bundle unchanged at 1,097,019 B.
Commits: `a215ae7` (test), graph `650525b`. **Audit H-4 coverage debt now fully closed**
(zoneViewCache, aiFocus, bloom lifecycle, smoke pool).

**Next:** [B1] draw-call census per map (first measurable perf task), or [A1] length-based
cache sweep for remaining F-1-class bugs.

### Micro-reflection (iter 3)
- Moved forward? Yes — H-4 closed entirely; eviction semantics are now pinned against tuning drift.
- Time lost? Minor: assumed jsdom-like document exists in node vitest; check environment globals before stubbing.
- Highest-leverage next task: B1 draw-call census — first task where the win is a number, not just safety.

---

## Iteration 2 — 2026-08-24 · [J] CODE QUALITY

**Task:** BACKLOG J1 — unit-test `RenderWorld.applyQuality` bloom lifecycle (audit H-4 remainder, guards the F-3 fix).

**Diagnosis + plan (written before editing):**
- The F-3 fix (dispose-on-downgrade / fresh-composer-on-return) had zero coverage; a
  regression would silently restore stale-DPI bloom or leak render targets.
- Constructor needs WebGL+PMREM → not unit-instantiable. Seam: `Object.create(RenderWorld.prototype)`
  + `Reflect.set` for private fields (`renderer`, `sun`, composer slots), `vi.mock` on the
  three postprocessing addons (recording fakes), real `graphicsQuality` presets. No prod-code change.
- Six scenarios: downgrade teardown, shadow-map resize/dispose, canvas-sized rebuild,
  full high→low→high cycle (exactly one replacement rig), repeated-high idempotence, DPR clamp ladder.

**Result:** `src/__tests__/renderWorldQuality.test.ts` — 6 tests, all green first run after
harness fixes (composer fake needed addPass; window stub owns dpr). No prod code touched.

**Metrics:** tests 201→207 (+6); typecheck/lint clean; bundle unchanged at 1,097,019 B.
Commits: `fe14685` (test), graph `e2a3ebf`.

**Next:** [J2] ArenaEffects smoke eviction under cap pressure (last H-4 remainder), or [B1]
draw-call census if J2's internals prove WebGL-bound.

### Micro-reflection (iter 2)
- Moved forward? Yes — the most regression-prone perf path now has a contract test.
- Time lost? Mock shape was incomplete (addPass) and dpr plumbing doubled up; read call sites fully before writing fakes.
- Highest-leverage next task: J2 smoke eviction, finishing the H-4 audit debt entirely.

---

## Iteration 1 — 2026-08-24 · [A] BUGS & STABILITY

**Diagnosis + plan (written before editing):**
- `KillStreakTracker.registerKill` filtered only on `currentTime - t < STREAK_WINDOW`
  (KillStreakTracker.ts:31) → negative deltas passed, so stamps from before a
  `matchTime` reset never expired.
- Production round-start is guarded by F-4's `resetStreaks()` (GameModeController.ts:120),
  but the tracker itself was still incorrect standalone; any time-reset path without the
  explicit reset inherited stale streaks (suppressed/spiked labels).
- Plan: TDD — new `src/__tests__/KillStreakTracker.test.ts` (window expiry, boundary,
  negative-delta guard, reset semantics) → RED → fix predicate → GREEN → full gates.

**Change:** filter now requires `currentTime >= t` too (KillStreakTracker.ts).
RED evidence: first new-round kill at t=1 paired with 5 stale future stamps →
spurious `{count:6, UNSTOPPABLE}`; after fix → null, then honest fresh streaks.

**Metrics:** tests 196→201 (+5); typecheck/lint clean; bundle 1,097,013 → 1,097,019 B (+6 B).
No visual change → screenshot phase N/A. Commits: `622eca3`, graph `2a7cddc`.

**Next:** [J] CODE QUALITY — J1/J2 (unit-test `applyQuality` bloom path / ArenaEffects smoke
eviction with THREE stubs), closing audit H-4 remainder; then B1 draw-call census.

### Micro-reflection (iter 1)
- Moved forward? Yes — real correctness hole closed with regression coverage.
- Time lost? One RED run failed on my own window arithmetic (strict `<4s`); re-check math before asserting.
- Highest-leverage next task: J1 (applyQuality bloom restore has zero coverage and a history of regressions).

