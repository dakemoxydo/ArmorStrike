# Graph Report - ArmorStrike  (2026-08-24)

## Corpus Check
- 280 files · ~130,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1834 nodes · 4410 edges · 136 communities (79 shown, 57 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ceb1369e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GameBootstrap.ts
- CameraRig.ts
- MapId
- Game
- Projectile.ts
- TankFactory.ts
- GameOverScreen.tsx
- QualityLevel
- Effects
- TankEntity
- RailgunWeapon
- compilerOptions
- WEAPON_TUNING
- textures/index.ts
- ArmorStrike — Project Rules
- RenderWorld
- Classic Match Modes — DM / TDM / Capture Point
- devDependencies
- ArmorStrike — Autonomous Backlog
- Match Framework — Режимы, roster, respawn, win
- HUD.tsx
- AudioFX
- minimapDraw.ts
- particles.ts
- Core Architecture — ArmorStrike
- MatchRuntime.ts
- EffectsPort
- aiObjective.ts
- City Level Design — Grid + Districts + Overpass
- useGameHud.ts
- Maps — Мульти-карты и выбор арены
- rosterSpawn.ts
- vite
- AudioPort
- AUTONOMOUS_PROMPT.md
- Standard_Weapon.md
- ParticleEffects
- FlamethrowerWeapon.ts
- captureLogic.ts
- GameSimulation
- HudScoreboard.tsx
- WeaponDeps
- KillStreakTracker.ts
- draw-call-census.ts
- dependencies
- WreckSystem
- components.ts
- Standard Match — каркас матча
- ErrorBoundary
- scripts
- Wave System
- PlayerController
- spawnPoints.ts
- Tank Movement — Движение корпуса
- Village Level Design — Square + Barns + Paddocks
- Tank Aim — Наведение башни
- Core.md
- stages/index.ts
- ArmorStrike — Audit (ошибки и недочёты)
- WreckSystem.ts
- Damage System — Централизованный урон
- Core Patterns — ArmorStrike
- Standard: UI, HUD & Input
- Standard: Weapons, Projectiles & Damage
- TimeScale
- Weapon
- catalog.ts
- Standard: Tank Entity & Systems
- SparkPool
- Player Controls — Управление игроком
- 00_Index.md
- rearPoint
- physics.ts
- GameModeController
- renderWorldQuality.test.ts
- eslint-plugin-react-refresh
- Garage Loadout — Сборка танка
- Garage.tsx
- game/effects.ts
- App.tsx
- Nameplate
- SmokeSystem
- RailgunWeapon.ts
- ArmorStrike — Autonomous Progress Log
- GDD — Approved Mechanics (ArmorStrike)
- @types/react
- AmbientDust
- Engage State (FSM)
- tailwindcss
- package.json
- @types/react-dom
- @types/three
- screenshot.sh
- typescript
- FlashSystem
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
- globals
- game/types.ts
- Capture Point — Захват точки
- eslint-plugin-react-hooks
- CoreSystem
- Graphics Presets Matrix — ArmorStrike
- AI Bots System
- Assault Role
- Combat System
- AI Bots — Поведение противников (Документ)
- RingSystem
- Elite Role
- Damage System
- GameMode Type
- Wave System
- CI Workflow Configuration
- ArmorStrike — 3D Бронетанковый Штурм (HTML)
- MapSelect Overlay
- ModeSelect.tsx
- Railgun Finite State Machine
- Auto-pause Policy Function
- Sniper Role
- GDD Drafts Directory
- simPorts.ts
- Standard Role
- WEAPON_TUNING Flamethrower Config
- @tailwindcss/vite
- Arena
- MuzzleSystem
- Arena & Physics — Арена и коллизии
- ScorchSystem
- Approved Documentation Directory
- Loadout Data (localStorage)
- Graphics Quality Preset (localStorage)
- HudWeapon.tsx
- Three.js

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 66 edges
2. `EffectsPort` - 46 edges
3. `AudioPort` - 44 edges
4. `Game` - 40 edges
5. `Collider` - 34 edges
6. `TurretId` - 33 edges
7. `Arena` - 33 edges
8. `HullId` - 32 edges
9. `GameApi` - 32 edges
10. `CameraRig` - 30 edges

## Surprising Connections (you probably didn't know these)
- `GarageProps` --references--> `GameApi`  [EXTRACTED]
  src/components/Garage.tsx → src/game/GameApi.ts
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `ModeOption` --references--> `MatchModeId`  [EXTRACTED]
  src/components/ModeSelect.tsx → src/game/match/matchTypes.ts
- `ModeSelectProps` --references--> `MatchModeId`  [EXTRACTED]
  src/components/ModeSelect.tsx → src/game/match/matchTypes.ts
- `HudScoreboardProps` --references--> `ScoreRow`  [EXTRACTED]
  src/components/hud/HudScoreboard.tsx → src/game/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (136 total, 57 thin omitted)

### Community 0 - "GameBootstrap.ts"
Cohesion: 0.17
Nodes (13): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+5 more)

### Community 1 - "CameraRig.ts"
Cohesion: 0.09
Nodes (18): AIM_SENS_X, AIM_SENS_Y, CameraLookState, DEFAULT_CAM_PITCH, PITCH_MAX, PITCH_MIN, CameraMode, GarageCameraMode (+10 more)

### Community 2 - "MapId"
Cohesion: 0.15
Nodes (17): ICONS, MapSelect(), MapSelectProps, AtmospherePreset, ATMOSPHERES, DUSK, getAtmosphere(), NIGHT (+9 more)

### Community 4 - "Projectile.ts"
Cohesion: 0.09
Nodes (21): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit(), HitEffect (+13 more)

### Community 5 - "TankFactory.ts"
Cohesion: 0.08
Nodes (26): TankStyle, disposeObject3D(), isShared(), markShared(), Shared, unmarkShared(), AssetManager, cloneWithOwnMaterials() (+18 more)

### Community 6 - "GameOverScreen.tsx"
Cohesion: 0.47
Nodes (5): GameOverScreen(), formatKd(), formatMatchClock(), modeLabelRu(), resultsHeadline()

### Community 7 - "QualityLevel"
Cohesion: 0.21
Nodes (8): getQualityPreset(), loadQuality(), nextQuality(), ORDER, QUALITY_PRESETS, QualityLevel, saveQuality(), QualityController

### Community 9 - "TankEntity"
Cohesion: 0.07
Nodes (3): BotEntry, RosterSpawnResult, TankEntity

### Community 10 - "RailgunWeapon"
Cohesion: 0.16
Nodes (4): applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), RailgunWeapon, CombatPeer

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, ES2020, node, src, vite/client, vite.config.ts, compilerOptions (+19 more)

### Community 12 - "WEAPON_TUNING"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 13 - "textures/index.ts"
Cohesion: 0.05
Nodes (94): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+86 more)

### Community 14 - "ArmorStrike — Project Rules"
Cohesion: 0.15
Nodes (12): 1. GDD Lifecycle, 2. Architecture (Auto-Extraction), 3. Graphify, 4. Hotfix, 5. Working Style, 6. Stack, ArmorStrike — Project Rules, Phase A → B: Approval Signal (+4 more)

### Community 16 - "Classic Match Modes — DM / TDM / Capture Point"
Cohesion: 0.08
Nodes (25): 1. Intent, 2.1 Deathmatch (DM) — «Бой насмерть», 2.2 Team Deathmatch (TDM) — «Командный бой», 2.3 Capture Point (CP) — «Захват точки», 2. Режимы (предложение игрока + уточнения GD), 3.1 Новые понятия, 3.2 Что появляется у каждого танка, 3.3 Respawn (общий) (+17 more)

### Community 17 - "devDependencies"
Cohesion: 0.13
Nodes (15): eslint, @eslint/js, devDependencies, eslint, @eslint/js, @types/node, typescript-eslint, vite-plugin-singlefile (+7 more)

### Community 18 - "ArmorStrike — Autonomous Backlog"
Cohesion: 0.14
Nodes (13): [A] BUGS & STABILITY, ArmorStrike — Autonomous Backlog, [B] PERFORMANCE, Bootstrap notes (2026-08-24, iter #1), [C] CORE GAMEPLAY, [D] ENEMY AI, [E] RENDERING & BEAUTY, [F] PHYSICS & FEEL (+5 more)

### Community 19 - "Match Framework — Режимы, roster, respawn, win"
Cohesion: 0.17
Nodes (12): AI focus (P2), Capture (P4), Classes, Kill credit, Match Framework — Режимы, roster, respawn, win, Respawn, Results UI (P6), Spawn tables (+4 more)

### Community 20 - "HUD.tsx"
Cohesion: 0.12
Nodes (15): HUD(), HudCrosshair(), HudCrosshairProps, FeedEntry, HudFeed(), HudFeedProps, HudProps, HudVitals() (+7 more)

### Community 22 - "minimapDraw.ts"
Cohesion: 0.20
Nodes (10): HudRadar(), HudRadarProps, bakeSweep(), cacheByCanvas, CanvasCache, getCache(), MAP_HALF, MAP_SIZE (+2 more)

### Community 23 - "particles.ts"
Cohesion: 0.23
Nodes (6): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark, SmokePuff

### Community 24 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Match modes (not app modes), Bootstrap composition (+12 more)

### Community 25 - "MatchRuntime.ts"
Cohesion: 0.08
Nodes (33): GameOverScreenProps, BotRoster, BASE, BOT_NORMAL, configForMode(), DEFAULT_MATCH_MODE, MatchRuntime, MatchRuntimeHooks (+25 more)

### Community 27 - "aiObjective.ts"
Cohesion: 0.42
Nodes (6): isObjectiveDuty(), moveHintForZone(), pickObjectiveZone(), shouldFightNearObjective(), zonePriority(), zones

### Community 28 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

### Community 29 - "useGameHud.ts"
Cohesion: 0.24
Nodes (7): drawMinimap(), captureStripKey(), createSnapInit(), useGameHud(), root, ammoForcesHudRender(), isLowHealth()

### Community 30 - "Maps — Мульти-карты и выбор арены"
Cohesion: 0.25
Nodes (8): Known gaps / balance notes, Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Размер арены (глобальный), Структура сборки

### Community 31 - "rosterSpawn.ts"
Cohesion: 0.39
Nodes (10): buildBotStyle(), buildPlayerStyle(), applyTeamRing(), botStyleColor(), makeBot(), placeTank(), spawnMatchRoster(), isTeamMode() (+2 more)

### Community 34 - "AUTONOMOUS_PROMPT.md"
Cohesion: 0.09
Nodes (21): ANTI-PATTERNS YOU MUST AVOID, BACKLOG BOOTSTRAP (run once at the very start), BASELINE (verify at iteration #1, record actual numbers in PROGRESS.md), CORE RULES (NON-NEGOTIABLE), EMERGENCY PROCEDURES, FIRST ACTION (only when PROGRESS.md does not exist yet), GDD GUARDRAILS (autonomy boundary — hard limit), PHASE 1 — ORIENT (≤2 min) (+13 more)

### Community 35 - "Standard_Weapon.md"
Cohesion: 0.23
Nodes (11): Arena Physics, Damage System, Projectile System — Пул снарядов, Weapon Cannon «Смоки», Weapon Flamethrower Firebird, Railgun Weapon (Рельсотрон), Match Framework, PROJECTILE Constants (speed=58, range=85, radius=0.18) (+3 more)

### Community 37 - "FlamethrowerWeapon.ts"
Cohesion: 0.11
Nodes (12): inFlameConeXZ(), FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec, tmpDir (+4 more)

### Community 38 - "captureLogic.ts"
Cohesion: 0.11
Nodes (21): COLORS, syncZoneViews(), CAPTURE_ANCHORS, CaptureAnchor, zonesForMap(), CaptureController, CAPTURE, CaptureOwner (+13 more)

### Community 40 - "HudScoreboard.tsx"
Cohesion: 0.39
Nodes (7): byTeam(), FlatTable(), HudScoreboard(), HudScoreboardProps, isTeamBoard(), TeamTable(), scoreboardHpClass()

### Community 41 - "WeaponDeps"
Cohesion: 0.16
Nodes (6): CannonWeapon, WeaponDeps, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 42 - "KillStreakTracker.ts"
Cohesion: 0.33
Nodes (3): KillStreakTracker, STREAK_LABELS, StreakLabel

### Community 43 - "draw-call-census.ts"
Cohesion: 0.40
Nodes (3): ctx2d, GeoStat, gradient

### Community 44 - "dependencies"
Cohesion: 0.22
Nodes (9): lucide-react, dependencies, lucide-react, react, react-dom, three, react, react-dom (+1 more)

### Community 46 - "components.ts"
Cohesion: 0.25
Nodes (5): BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState

### Community 47 - "Standard Match — каркас матча"
Cohesion: 0.17
Nodes (12): 10. CP objective AI (P5), 11. Results & balance (P6), 1. App GameMode ≠ MatchModeId, 2. Pure helpers + thin runtime, 3. Damage gates (central), 4. Kill credit path, 5. Lifecycle, 6. Roster (+4 more)

### Community 48 - "ErrorBoundary"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 49 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 52 - "spawnPoints.ts"
Cohesion: 0.36
Nodes (6): ALPHA_SPAWN_POINTS, BRAVO_SPAWN_POINTS, FFA_SPAWN_POINTS, MIN_BOT_SPAWN_DIST, pickPointIndex(), PLAYER_START

### Community 53 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 54 - "Village Level Design — Square + Barns + Paddocks"
Cohesion: 0.18
Nodes (11): Animated nodes (ArenaEffects), Code map, Cover hierarchy, Implemented layout (code), Layout graph (world, arena half = 150), Per-map atmosphere (RenderWorld), Shared scale (arena 300), Success criteria (+3 more)

### Community 55 - "Tank Aim — Наведение башни"
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 56 - "Core.md"
Cohesion: 0.22
Nodes (7): 1. Textures: memoized factories + `markShared` ownership, 2. Zone views: anchor-keyed invalidation, 3. Draw-call census: измеряй перед тем как оптимизировать, Standard Resources — ArmorStrike, Health & Regen — Прочность и саморемонт, Game Lifecycle, Tank Movement

### Community 57 - "stages/index.ts"
Cohesion: 0.09
Nodes (28): BotAiStage, PlayerInputStage, TankAnimationSystemStage, TankFxSystemStage, TankSystemStage, WeaponSystemStage, FrameContext, NameplateMap (+20 more)

### Community 58 - "ArmorStrike — Audit (ошибки и недочёты)"
Cohesion: 0.13
Nodes (14): 1. Базлайн верификации, 2. Ошибки, 3. Недочёты (гигиена), 4. Проверено — НЕ проблемы (чтобы не переисследовать), 5. Рекомендованный порядок работ, 6. Итог работ (2026-08-23) — исправлены все пункты (детали в таблице; H-3/H-4 — с оговорками), 7. Второй перф-проход (2026-08-23, вечер) — остаточные аллокации кадра, 8. Третий перф-проход (2026-08-23, ночь) — texture cache + HUD/миникарта (+6 more)

### Community 59 - "WreckSystem.ts"
Cohesion: 0.29
Nodes (6): CHAR_MAT, EMBER_GEO, HULL_GEO, TRACK_GEO, TURRET_GEO, Wreck

### Community 60 - "Damage System — Централизованный урон"
Cohesion: 0.20
Nodes (10): applyDamage, applyHit / applySplashHit, applyKnockback, CombatSystem hooks, Damage System — Централизованный урон, damageBlock, Splash falloff (пушка), Классы (+2 more)

### Community 61 - "Core Patterns — ArmorStrike"
Cohesion: 0.22
Nodes (9): 1. Layering (жёсткое правило), 2. Bootstrap composition, 3. Simulation pipeline (ordered stages), 4. Port pattern (I/O isolation), 5. Event bus → React, 6. Run state & persistence, 7. Testing expectations, 8. Non-goals (текущий билд) (+1 more)

### Community 62 - "Standard: UI, HUD & Input"
Cohesion: 0.22
Nodes (9): 1. React ↛ Simulation, 2. Two channels: events + HUD snapshot, 3. Component layout, 4. Player input (combat), 5. Garage input (отдельный класс), 6. Camera modes (strategy), 7. Focus & a11y helpers, 8. Checklist нового UI (+1 more)

### Community 63 - "Standard: Weapons, Projectiles & Damage"
Cohesion: 0.22
Nodes (9): 1. Weapon strategy (единый интерфейс), 2. Owner & context ports, 3. Fire pipeline (кадр), 4. Projectiles, 5. Shared hit helpers, 6. DamageSystem split, 7. Catalog boundary, 8. Checklist нового оружия (+1 more)

### Community 65 - "Weapon"
Cohesion: 0.11
Nodes (5): _wctx, WeaponHost, FlamethrowerWeapon, Weapon, WeaponContext

### Community 66 - "catalog.ts"
Cohesion: 0.15
Nodes (13): HULL_IDS, HULLS, TURRET_IDS, TURRETS, HullId, TurretId, GarageBinding, GarageBindingDeps (+5 more)

### Community 67 - "Standard: Tank Entity & Systems"
Cohesion: 0.20
Nodes (10): 1. Entity = id + composition, 2. Flat port projections, 3.1 Hybrid mesh: процедурный код + GLB (система отключена), 3.2 Владение GPU-ресурсами (общие vs per-instance), 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose (+2 more)

### Community 69 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 70 - "00_Index.md"
Cohesion: 0.34
Nodes (3): Team Deathmatch Game Design Document, Wave Buffs Feature, Wave System — Волны и спавн

### Community 72 - "physics.ts"
Cohesion: 0.05
Nodes (59): WeaponType, AIBody, AIController, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA (+51 more)

### Community 74 - "renderWorldQuality.test.ts"
Cohesion: 0.33
Nodes (4): FakeComposer, h, makeDeps(), makeWorld()

### Community 76 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 77 - "Garage.tsx"
Cohesion: 0.12
Nodes (17): React 19, Garage(), GarageProps, HullCard(), HullCardProps, MainMenu(), MainMenuProps, Pause Component (+9 more)

### Community 79 - "App.tsx"
Cohesion: 0.14
Nodes (7): App(), BootError(), BootErrorProps, PauseMenu(), PauseMenuProps, GameApi, isInteractiveKeyboardTarget()

### Community 80 - "Nameplate"
Cohesion: 0.25
Nodes (3): NameplateEntry, NameplateSubject, Nameplate

### Community 82 - "RailgunWeapon.ts"
Cohesion: 0.11
Nodes (19): BARREL_REST_Y, tmpDir, tmpMuzzle, fillMuzzleAndAim(), applyRailgunChargingFx(), tmpDir, tmpMuzzle, railgunShouldStartCharge() (+11 more)

### Community 83 - "ArmorStrike — Autonomous Progress Log"
Cohesion: 0.08
Nodes (24): ArmorStrike — Autonomous Progress Log, Baseline (recorded 2026-08-24, iter #1), Iteration 10 — 2026-08-24 · [B] PERFORMANCE — BUNDLE CENSUS (B4), Iteration 11 — 2026-08-24 · [K] ACCESSIBILITY & POLISH — K1 PRESET MATRIX, Iteration 1 — 2026-08-24 · [A] BUGS & STABILITY, Iteration 2 — 2026-08-24 · [J] CODE QUALITY, Iteration 3 — 2026-08-24 · [J] CODE QUALITY, Iteration 4 — 2026-08-24 · [B] PERFORMANCE (+16 more)

### Community 84 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 87 - "Engage State (FSM)"
Cohesion: 0.50
Nodes (4): aiCover Module (findCoverPoint), aiTuning Module (preferredRange, aimTolerance, steering), Engage State (FSM), losClear Module (line of sight через colliders)

### Community 90 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 99 - "game/types.ts"
Cohesion: 0.17
Nodes (14): GameContext, GameLoopDeps, GameModeControllerDeps, HudModel, MatchModeId, HudUnit, CaptureHudPoint, GameEvent (+6 more)

### Community 100 - "Capture Point — Захват точки"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

### Community 103 - "Graphics Presets Matrix — ArmorStrike"
Cohesion: 0.40
Nodes (5): Graphics Presets Matrix — ArmorStrike, Известные ограничения, Матрица пресетов (по коду), Паритет: что НЕ масштабируется по пресету, Поведение переключения

### Community 118 - "ModeSelect.tsx"
Cohesion: 0.50
Nodes (4): ModeOption, MODES, ModeSelect(), ModeSelectProps

### Community 123 - "simPorts.ts"
Cohesion: 0.07
Nodes (35): BOOST, PROJECTILE, SCORE, TANK, TankAimSystem, animateDeath(), tintBody(), TankCombatTimersSystem (+27 more)

### Community 127 - "Arena"
Cohesion: 0.14
Nodes (5): Arena, CombatDeps, CombatSystem, ProjectileManager, StageDeps

### Community 129 - "Arena & Physics — Арена и коллизии"
Cohesion: 0.33
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

### Community 134 - "HudWeapon.tsx"
Cohesion: 0.67
Nodes (3): HudWeapon(), HudWeaponProps, weaponStatusKind

## Knowledge Gaps
- **449 isolated node(s):** `[A] BUGS & STABILITY`, `[B] PERFORMANCE`, `[C] CORE GAMEPLAY`, `[D] ENEMY AI`, `[E] RENDERING & BEAUTY` (+444 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `TankEntity` to `Weapon`, `catalog.ts`, `Projectile.ts`, `TankFactory.ts`, `captureLogic.ts`, `GameSimulation`, `physics.ts`, `WeaponDeps`, `rosterSpawn.ts`, `components.ts`, `RailgunWeapon.ts`, `MatchRuntime.ts`, `simPorts.ts`, `Arena`, `stages/index.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `EffectsPort` connect `EffectsPort` to `GameBootstrap.ts`, `CameraRig.ts`, `catalog.ts`, `Projectile.ts`, `GameSimulation`, `Effects`, `rearPoint`, `RailgunWeapon`, `WeaponDeps`, `game/effects.ts`, `RailgunWeapon.ts`, `MatchRuntime.ts`, `simPorts.ts`, `stages/index.ts`, `Arena`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `typescript` connect `typescript` to `catalog.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `[A] BUGS & STABILITY`, `[B] PERFORMANCE`, `[C] CORE GAMEPLAY` to the rest of the system?**
  _449 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08979591836734693 - nodes in this community are weakly interconnected._
- **Should `MapId` be split into smaller, more focused modules?**
  _Cohesion score 0.14666666666666667 - nodes in this community are weakly interconnected._
- **Should `Projectile.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09397163120567376 - nodes in this community are weakly interconnected._