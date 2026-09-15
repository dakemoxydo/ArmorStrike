# ArmorStrike — Backlog

Пул задач: открытые + по одной строке на каждую закрытую. Длинные отчёты здесь
не хранятся — детали закрытых итераций в git-истории и `Docs/`. Категории A–K:
- [A] Bugs & Stability · [B] Performance · [C] Core Gameplay · [D] Enemy AI
- [E] Rendering & Beauty · [F] Physics & Feel · [G] Audio · [H] UI / UX / HUD
- [I] Levels & Content · [J] Code Quality · [K] Accessibility & Polish

Новая задача — буква + номер; закрытая остаётся одной строкой «[x] что — итог/ссылка».

## [A] BUGS & STABILITY
- [x] A1: Sweep length-based caches (F-1 class) — CLEAN, все кандидаты с content/identity-guard.
- [x] A2: Unit-test `KillStreakTracker` window expiry incl. negative deltas — +5 tests.
- [x] A3: Match lifecycle reset test (DM→TDM→CP, no cross-mode state) — `gameModeLifecycle.test.ts` (+3).
- [x] A4: Audit `Game.teardownContext` / StrictMode unmount guard — CLEAN, chain verified.
- [x] A5: Hotfix — хардкод float-высоты обелиска в `ArenaEffects` (City-монумент уезжал на +3.5 м); база захватывается в `setObelisk`.

## [B] PERFORMANCE
- [x] B1: Draw-call census per map — инструмент `npm run census`; baseline factory 327 / village 940 / city 753 est. DC.
- [x] B1b: Instance village fence rails — village 940→845 est. DC.
- [x] B2: Texture-factory memoization coverage — FULL (весь `src/game/textures` через cachedTexture).
- [x] B3: HudModel per-frame setState check — VERIFIED clean (refs + thresholded force only).
- [x] B4: Bundle census — three ≈55% src-gz / react-dom ≈32% / app ≈28%; verdict: trim не нужен.
- [x] B5: Фризы на выстрелах/смертях — LightRig (постоянный бюджет 7 источников), `RenderWorld.warmUp()`, пул wreck'ов без аллокаций, hit-stop по `byPlayer`, HUD reflow fix. Док — `Docs/Architecture/Standard_Frame_Stability.md` + GDD `Kill_Feedback`.

## [C] CORE GAMEPLAY
- [x] C1: Capture-point contest/decay math vs Approved/Capture_Point.md — VERIFIED clean, 2 doc nits fixed.
- [ ] C2: Verify projectile splash falloff curve against Approved/Projectile_System.md; fix only documented divergence.
- [ ] C3: Regression test: tank-vs-obstacle penetration at max boost speed (Arena_Physics bounds).

## [D] ENEMY AI
- [x] D1: Bot objective-duty tables per mode — `botDutyTable.test.ts`; CP/TDM push 50–60% в band 40–60%.
- [x] D2: Difficulty spread verify — реален, запинен в `aiRoles.test.ts`; бот-пады rail/flamer через `firePadForRole` (решение игрока).
- [x] D3: aiCover distances vs weapon range classes — когерентно, контракт в `aiCover.test.ts`; мёртвый `AI_LOW_HP_FRAC` удалён.

## [E] RENDERING & BEAUTY
- [x] E1: Atmosphere-preset gap check — все карты покрыты; GDD exposure drift fixed (1.14→1.0) с тест-пинами.
- [ ] E2: Nameplate fade/scale clamp at long distance — readability pass with screenshot evidence.
- [ ] E3: Particle budget parity (smoke/flame/explosion caps) across low/med/high quality tiers.

## [F] PHYSICS & FEEL
- [ ] F1: Cannon recoil / camera-shake scaling by weapon class in CameraRig — verify call sites, add railgun/flamer differentiation only if GDD supports it.
- [ ] F2: Boost feel audit: FOV kick + exhaust feedback present and tuned.

## [G] AUDIO
- [ ] G1: Verify spatialization hooks for enemy fire (relative-position panning) exist and are wired for cannon/railgun/flamer.
- [x] G2: Mute persistence across restarts — `as2_muted` + `muteStorage.test.ts`; engine-survival закрыт кодом H-5.

## [H] UI / UX / HUD
- [ ] H1: Minimap correctness after sweep bake (commit b768fa0): layering, blip colors, sweep visuals — screenshot evidence.
- [x] H2: Garage loadout edge cases — DOM-стек поднят (jsdom + RTL); `Garage.test.tsx` (10) + `useFocusTrap.test.tsx` (7).
- [x] H3: Pause menu focus trap + Esc/Resume — verified present, no change needed.
- [x] H4: GameOverScreen complete stat line — добавлен `playerBestStreak` (5-я StatCard), Scoring.md синхронизирован.

## [I] LEVELS & CONTENT
- [x] I0: Factory rebuild на всю арену 300×300 — 133 коллайдера, 4 района + кран над CP-B, `factoryMap.test.ts` (13);док — [[Factory_Level_Design]].
- [ ] I1: Spawn fairness metrics per map (min distance spawn→nearest enemy lane); rebalance worst spawn weights. — инструмент готов: `npm run map-plan [mapId]` печатает плотность/зоны/spawn-точки из реальных коллайдеров
- [ ] I2: Obstacle density/variety comparison village vs city; log metrics, patch only clear gaps. — factory-данные уже сняты (`npm run map-plan factory`): 133 коллайдера, NW 14H/6S · NE 13H/12S · SW 16H/11S · SE 15H/10S
- [ ] I3: CP anchor symmetry: capture-point distances from both team spawns roughly equal per map.

## [J] CODE QUALITY
- [x] J1: Unit-test `applyQuality` bloom dispose/recreate — +6 tests.
- [x] J2: Unit-test ArenaEffects smoke eviction — +4 tests (guard defensive-only at current tuning).
- [x] J3: Dead-export scan — 4 removals (−67 lines); assetUrl/applyMaterialToModel kept as documented dormant API.
- [x] J4: Document texture-memoization + zoneViewCache → `Docs/Architecture/Standard_Resources.md`.
- [x] J5: Dirty-check HUD заменён на `src/ui/hudRenderGate.ts` (+16 tests, 2 реальных бага закрыто); контракт — Standard_UI_Input §2.
- [x] J6: «Спящий» GLB-пайплайн — ОСТАВЛЕН намеренно (tree-shaking: цена 0 байт в прод-бандле); шов запинен в `tankConfig.test.ts` (6).
- [x] J7: `npm audit` 10 → 0: vite 7.3.6, vitest 4.1.11 (держит Node 20), esbuild override 0.28.2; lock v3, `npm ci` под npm 10 ОК.

## [K] ACCESSIBILITY & POLISH
- [x] K1: Document graphics preset matrix → `Docs/Architecture/Graphics_Presets_Matrix.md`; no code gaps.
- [x] K4: a11y boot/error surfaces — `role="alert"`, canvas `role="img"` + `aria-label`; пин M16 в `uiUxPresentation.test.ts`, контракт — Standard_UI_Input §7.
- [ ] K2: Team-color palette colorblind-safety check (HUD + minimap blips).
- [ ] K3: Decide desktop-only vs touch controls (2026-09-09 audit: zero touch handling in src — `PlayerController` is WASD+mouse only). Either add touch controls or record «desktop-only» in GDD + README.
