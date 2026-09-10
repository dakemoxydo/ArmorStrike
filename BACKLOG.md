# ArmorStrike — Backlog

Prioritized task pool. Categories A–K:
- [A] Bugs & Stability · [B] Performance · [C] Core Gameplay · [D] Enemy AI
- [E] Rendering & Beauty · [F] Physics & Feel · [G] Audio · [H] UI / UX / HUD
- [I] Levels & Content · [J] Code Quality · [K] Accessibility & Polish

Cycle categories round-robin. Mark done with `[x]` + note. Re-bootstrap when open < 10.

## [A] BUGS & STABILITY
- [x] A1: Sweep `src/game` for remaining length-based caches of the F-1 class (cache keyed on array length instead of content/reference) and add a regression test for any found. — iter 6: CLEAN, no remaining sites; all candidates verified identity/content-guarded (see PROGRESS iter 6)
- [x] A2: Unit-test `KillStreakTracker` window expiry incl. negative time deltas (stale stamps from a previous match must never suppress new streaks). — iter 1 `622eca3` (+5 tests, predicate fix)
- [x] A3: Verify full match lifecycle resets (DM→TDM→CP across village/city/factory) leave no cross-mode state (score, streaks, capture zones, rosters) — lifecycle test. — iter 9 `1b750b3` (+3 tests, full reset-chain + ordering pinned)
- [x] A4: Audit teardown path (`Game.teardownContext`, App StrictMode guard) for dangling listeners/timers after unmount. — iter 12: CLEAN, full chain verified (see PROGRESS iter 12); one theoretical post-dispose API note

## [B] PERFORMANCE
- [x] B1: Draw-call census per map: count meshes vs instanced in RenderWorld scene graph; instance the worst repeated prop category; record before/after numbers. — iter 4 `38171ba` (census tool; baseline factory 327 / village 940 / city 753 est. DC)
- [x] B1b: Instance village fence rails (`villageMap.ts:426`, 108 identical boxes) into one InstancedMesh following the foliage pattern (`buildVillageFoliage`); re-run census — expect village ≈940→≈830 est. draw calls. — iter 5 `4c7ff44` (village 940→845 est. DC)
- [x] B2: Texture-factory memoization coverage: list factories not yet registered via markShared; register stragglers. — iter 7: FULL coverage confirmed (all textures/* via cachedTexture; direct CanvasTexture only in per-instance nameplate/CaptureMarkers)
- [x] B3: Confirm HudModel has zero per-frame setState; trace HUD subscription updates to render batches. — iter 6: VERIFIED clean (refs for continuous channels; thresholded force() only — see PROGRESS iter 6)
- [x] B4: Bundle census: identify largest contributors inside dist single-file bundle from build output; name top-3 trim candidates. — iter 10: three ≈55% src-gz / app ≈28% / react-dom ≈32%; verdict NO trim action justified (see PROGRESS iter 10)

## [C] CORE GAMEPLAY
- [x] C1: Verify capture-point contest/decay math against Docs/GDD/Approved/Capture_Point.md constants; reconcile mismatches. — 2026-09-09: VERIFIED clean, no code change (radius 20 / 8s / contest-freeze / neutral-first / +1s / 1000 / 12min+kills-tiebreak / anchors all match); 2 doc nits fixed (winConditions comment, empty-zone no-decay line in GDD)
- [ ] C2: Verify projectile splash falloff curve against Approved/Projectile_System.md; fix only documented divergence.
- [ ] C3: Regression test: tank-vs-obstacle penetration at max boost speed (Arena_Physics bounds).

## [D] ENEMY AI
- [x] D1: Table-test bot objective-duty distribution per mode (DM/TDM/CP) against Approved/AI_Bots.md. — 2026-09-10: golden tables pinned in `botDutyTable.test.ts` — DM {sniper 3 / assault 2 / standard 2}, duty 4/7 (флаг инертен — pinned поведенчески через BotAiStage); CP/TDM alpha 2/4 = 50%, bravo 3/5 = 60% — обе в band 40–60% (bravo на краю); elite закрыт gate'ом roleWave=1
- [x] D2: Verify difficulty spread in BotRoster (aim noise / reaction / aggression actually differs per tier); tune outliers. — 2026-09-10: разброс реален и запинен в `aiRoles.test.ts` (aggro 0.22 < U[0.35,0.75] < 0.95 без пересечений; aimError 0.05/0.10/0.115; react assault 0.1176 < sniper 0.168). Находка (не value-outlier): cooldown-пады ролей (sniper 1.35 / assault 1.15) ИНЕРТНЫ — у railgun/flamer `TURRET.shotCooldown=0`, каденция weapon-internal; реально медленнее игрока только класс пушки (×1.2 → 0.336 с). Комментарии в matchConfig/rosterSpawn исправлены, факт в GDD; баланс не менялся — открытый design-вопрос (см. PROGRESS iter 14) → **РЕШЕНО игроком 2026-09-10: пады реальные** (iter 15): railgun/flamer боты замедлены через `reloadSpeedMul = 1/firePadForRole` (рельса-бот reload 4.8→6.48 с, charge 1.1→1.485 с; огнемёт-бот батарея 22→19.1/с, расход не тронут); пушечные боты без изменений (0.336 с); `BOT_NORMAL.shotCooldownScale` удалён, единый источник пада — `firePadForRole` в aiRoles
- [x] D3: Review aiCover distances vs weapon range classes (railgun long-range covers vs flamer brawling). — 2026-09-10: когерентно, per-class тюнинг не нужен: поиск класс-нейтрален (радиус 42 ≤ sight 46, stand-off 3.4, scoring сам-относительный), класс-уместность возникает через preferredRange (flamer прячет у боя, sniper — далеко). Контракт запинен в `aiCover.test.ts` (brawler/sniper геометрия, LOS-break, ближнее-выигрывает); мёртвый wave-era экспорт `AI_LOW_HP_FRAC` удалён (жил только в собственном тесте, противоречил живым порогам ролей); контракт+rationale добавлены в GDD AI_Bots.md

## [E] RENDERING & BEAUTY
- [x] E1: Atmosphere-preset gap check across all maps; give any bare map a fitting preset. — iter 13 `0b6feed`: all maps covered; found+fixed GDD exposure drift (1.14→1.0) with absolute test pins
- [ ] E2: Nameplate fade/scale clamp at long distance — readability pass with screenshot evidence.
- [ ] E3: Particle budget parity (smoke/flame/explosion caps) across low/med/high quality tiers.

## [F] PHYSICS & FEEL
- [ ] F1: Cannon recoil / camera-shake scaling by weapon class in CameraRig — verify call sites, add railgun/flamer differentiation only if GDD supports it.
- [ ] F2: Boost feel audit: FOV kick + exhaust feedback present and tuned.

## [G] AUDIO
- [ ] G1: Verify spatialization hooks for enemy fire (relative-position panning) exist and are wired for cannon/railgun/flamer.
- [x] G2: Mute state persists across match restarts; engine voice survives fast menu transitions (post-H-5 regression test). — 2026-09-09: mute persisted via `as2_muted` (AudioFX load/save + App init) + `muteStorage.test.ts` (3); engine-survival already closed by H-5 code, no new test (WebAudio mocks — tech debt)

## [H] UI / UX / HUD
- [ ] H1: Minimap correctness after sweep bake (commit b768fa0): layering, blip colors, sweep visuals — screenshot evidence.
- [ ] H2: Garage loadout edge cases: rapid switching, invalid combo guards — component tests.
- [x] H3: Pause menu focus trap + Esc/Resume key handling. — 2026-09-09: verified present (`useFocusTrap` in PauseMenu/GameOverScreen/MapSelect/ModeSelect, Esc via App global + auto-pause on lock loss); no code change
- [x] H4: GameOverScreen shows complete stat line (K/D/score/best streak) for all three modes. — 2026-09-09: added `playerBestStreak` (CombatSystem → MatchResult → gameOver event → 5th StatCard) + Scoring.md line

## [I] LEVELS & CONTENT
- [ ] I1: Spawn fairness metrics per map (min distance spawn→nearest enemy lane); rebalance worst spawn weights.
- [ ] I2: Obstacle density/variety comparison village vs city; log metrics, patch only clear gaps.
- [ ] I3: CP anchor symmetry: capture-point distances from both team spawns roughly equal per map.

## [J] CODE QUALITY
- [x] J1: Unit-test `applyQuality` bloom dispose/recreate path with lightweight THREE stubs (audit H-4 remainder). — iter 2 `fe14685` (+6 tests)
- [x] J2: Unit-test ArenaEffects smoke eviction under cap pressure (audit H-4 remainder). — iter 3 `a215ae7` (+4 tests; guard is defensive-only at current tuning)
- [x] J3: Dead-export scan after the two perf passes; remove unreferenced symbols. — iter 8 `0d66c54` (4 removals, −67 lines; assetUrl/applyMaterialToModel kept as documented dormant API)
- [x] J4: Document texture-memoization + zoneViewCache patterns into Docs/Architecture/ (from commits 6ad7740/257c23c). — iter 7: `Docs/Architecture/Standard_Resources.md` + Core.md index

## [K] ACCESSIBILITY & POLISH
- [x] K1: Document graphics preset matrix (low/med/high: pixel ratio, shadows, bloom, particles) and fill parity gaps. — iter 11 `90f0cd9`: `Docs/Architecture/Graphics_Presets_Matrix.md`; no code gaps — non-scaling dims documented as deliberate
- [ ] K2: Team-color palette colorblind-safety check (HUD + minimap blips).
- [ ] K3: Decide desktop-only vs touch controls (2026-09-09 audit: zero touch handling in src — `PlayerController` is WASD+mouse only). Either add touch controls or record «desktop-only» in GDD + README.

---
### Bootstrap notes (2026-08-24, iter #1)
Seeded from baseline gate run and repo inventory (227 TS files under src/). Baseline: typecheck ✓,
lint ✓, 196/196 tests (43 files), dist/index.html = 1,097,013 B (gzip ≈ 301.6 kB).
