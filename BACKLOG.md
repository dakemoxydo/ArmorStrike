# ArmorStrike — Autonomous Backlog

Prioritized pool for the autonomous loop. Categories A–K (see AUTONOMOUS_PROMPT.md §PHASE 2).
Cycle categories round-robin. Mark done with `[x]` + iteration note. Re-bootstrap when open < 10.

## [A] BUGS & STABILITY
- [ ] A1: Sweep `src/game` for remaining length-based caches of the F-1 class (cache keyed on array length instead of content/reference) and add a regression test for any found.
- [ ] A2: Unit-test `KillStreakTracker` window expiry incl. negative time deltas (stale stamps from a previous match must never suppress new streaks).
- [ ] A3: Verify full match lifecycle resets (DM→TDM→CP across village/city/factory) leave no cross-mode state (score, streaks, capture zones, rosters) — lifecycle test.
- [ ] A4: Audit teardown path (`Game.teardownContext`, App StrictMode guard) for dangling listeners/timers after unmount.

## [B] PERFORMANCE
- [ ] B1: Draw-call census per map: count meshes vs instanced in RenderWorld scene graph; instance the worst repeated prop category; record before/after numbers.
- [ ] B2: Texture-factory memoization coverage: list factories not yet registered via markShared; register stragglers.
- [ ] B3: Confirm HudModel has zero per-frame setState; trace HUD subscription updates to render batches.
- [ ] B4: Bundle census: identify largest contributors inside dist single-file bundle from build output; name top-3 trim candidates.

## [C] CORE GAMEPLAY
- [ ] C1: Verify capture-point contest/decay math against Docs/GDD/Approved/Capture_Point.md constants; reconcile mismatches.
- [ ] C2: Verify projectile splash falloff curve against Approved/Projectile_System.md; fix only documented divergence.
- [ ] C3: Regression test: tank-vs-obstacle penetration at max boost speed (Arena_Physics bounds).

## [D] ENEMY AI
- [ ] D1: Table-test bot objective-duty distribution per mode (DM/TDM/CP) against Approved/AI_Bots.md.
- [ ] D2: Verify difficulty spread in BotRoster (aim noise / reaction / aggression actually differs per tier); tune outliers.
- [ ] D3: Review aiCover distances vs weapon range classes (railgun long-range covers vs flamer brawling).

## [E] RENDERING & BEAUTY
- [ ] E1: Atmosphere-preset gap check across all maps; give any bare map a fitting preset.
- [ ] E2: Nameplate fade/scale clamp at long distance — readability pass with screenshot evidence.
- [ ] E3: Particle budget parity (smoke/flame/explosion caps) across low/med/high quality tiers.

## [F] PHYSICS & FEEL
- [ ] F1: Cannon recoil / camera-shake scaling by weapon class in CameraRig — verify call sites, add railgun/flamer differentiation only if GDD supports it.
- [ ] F2: Boost feel audit: FOV kick + exhaust feedback present and tuned.

## [G] AUDIO
- [ ] G1: Verify spatialization hooks for enemy fire (relative-position panning) exist and are wired for cannon/railgun/flamer.
- [ ] G2: Mute state persists across match restarts; engine voice survives fast menu transitions (post-H-5 regression test).

## [H] UI / UX / HUD
- [ ] H1: Minimap correctness after sweep bake (commit b768fa0): layering, blip colors, sweep visuals — screenshot evidence.
- [ ] H2: Garage loadout edge cases: rapid switching, invalid combo guards — component tests.
- [ ] H3: Pause menu focus trap + Esc/Resume key handling.
- [ ] H4: GameOverScreen shows complete stat line (K/D/score/best streak) for all three modes.

## [I] LEVELS & CONTENT
- [ ] I1: Spawn fairness metrics per map (min distance spawn→nearest enemy lane); rebalance worst spawn weights.
- [ ] I2: Obstacle density/variety comparison village vs city; log metrics, patch only clear gaps.
- [ ] I3: CP anchor symmetry: capture-point distances from both team spawns roughly equal per map.

## [J] CODE QUALITY
- [ ] J1: Unit-test `applyQuality` bloom dispose/recreate path with lightweight THREE stubs (audit H-4 remainder).
- [ ] J2: Unit-test ArenaEffects smoke eviction under cap pressure (audit H-4 remainder).
- [ ] J3: Dead-export scan after the two perf passes; remove unreferenced symbols.
- [ ] J4: Document texture-memoization + zoneViewCache patterns into Docs/Architecture/ (from commits 6ad7740/257c23c).

## [K] ACCESSIBILITY & POLISH
- [ ] K1: Document graphics preset matrix (low/med/high: pixel ratio, shadows, bloom, particles) and fill parity gaps.
- [ ] K2: Team-color palette colorblind-safety check (HUD + minimap blips).

---
### Bootstrap notes (2026-08-24, iter #1)
Seeded from audit.md (all F/H findings verified FIXED — do not reopen without repro),
baseline gate run, and repo inventory (227 TS files under src/). Baseline: typecheck ✓,
lint ✓, 196/196 tests (43 files), dist/index.html = 1,097,013 B (gzip ≈ 301.6 kB).
