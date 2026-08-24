# Graph Report - ArmorStrike  (2026-08-24)

## Corpus Check
- 273 files · ~101,834 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1785 nodes · 4360 edges · 123 communities (73 shown, 50 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd54f99e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- textures/index.ts
- CameraRig.ts
- RenderWorld
- catalog.ts
- Projectile.ts
- HUD.tsx
- physics.ts
- disposeObject3D
- Effects
- TankEntity
- GameApi
- compilerOptions
- WEAPON_TUNING
- core/types.ts
- ArmorStrike — Project Rules
- Tank.ts
- Classic Match Modes — DM / TDM / Capture Point
- devDependencies
- ArmorStrike — Autonomous Backlog
- Match Framework — Режимы, roster, respawn, win
- FlamethrowerWeapon.ts
- AudioFX
- PreviewController
- particles.ts
- Core Architecture — ArmorStrike
- 00_Index.md
- EffectsPort
- rosterSpawn.ts
- City Level Design — Grid + Districts + Overpass
- SparkPool
- Maps — Мульти-карты и выбор арены
- Arena
- vite
- AudioPort
- AUTONOMOUS_PROMPT.md
- Game
- ParticleEffects
- Standard_Weapon.md
- captureLogic.ts
- BotAiStage.ts
- GameBootstrap.ts
- WeaponDeps
- stages/index.ts
- Standard_Tank.md
- dependencies
- Capture Point — Захват точки
- RailgunWeapon
- Standard Match — каркас матча
- simPorts.ts
- scripts
- Wave System
- game/constants.ts
- TimeScale
- Tank Movement — Движение корпуса
- Village Level Design — Square + Barns + Paddocks
- Tank Aim — Наведение башни
- game/types.ts
- App.tsx
- ArmorStrike — Audit (ошибки и недочёты)
- RespawnController.ts
- Damage System — Централизованный урон
- Core Patterns — ArmorStrike
- Standard: UI, HUD & Input
- Standard: Weapons, Projectiles & Damage
- ErrorBoundary
- GameOverScreen.tsx
- Arena & Physics — Арена и коллизии
- Standard: Tank Entity & Systems
- RailgunWeapon.ts
- Player Controls — Управление игроком
- MuzzleSystem
- ScorchSystem
- TankAnimationSystem.ts
- tuning.ts
- PlayerController
- eslint-plugin-react-refresh
- Garage Loadout — Сборка танка
- MatchRuntime.ts
- CoreSystem
- KillStreakTracker.ts
- RingSystem
- clamp
- PlayerFactory.ts
- ArmorStrike — Autonomous Progress Log
- GDD — Approved Mechanics (ArmorStrike)
- @types/react
- globals
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
- eslint-plugin-react-hooks
- AI Bots System
- Assault Role
- Combat System
- AI Bots — Поведение противников (Документ)
- Elite Role
- Damage System
- GameMode Type
- Wave System
- CI Workflow Configuration
- ArmorStrike — 3D Бронетанковый Штурм (HTML)
- MapSelect Overlay
- TankFactory.ts
- Railgun Finite State Machine
- Auto-pause Policy Function
- Sniper Role
- GDD Drafts Directory
- Standard Role
- WEAPON_TUNING Flamethrower Config
- @tailwindcss/vite
- Approved Documentation Directory
- Loadout Data (localStorage)
- Graphics Quality Preset (localStorage)
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
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `ModeOption` --references--> `MatchModeId`  [EXTRACTED]
  src/components/ModeSelect.tsx → src/game/match/matchTypes.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `HudScoreboardProps` --references--> `ScoreRow`  [EXTRACTED]
  src/components/hud/HudScoreboard.tsx → src/game/types.ts
- `HudWeaponProps` --references--> `HudSnapshot`  [EXTRACTED]
  src/components/hud/HudWeapon.tsx → src/game/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (123 total, 50 thin omitted)

### Community 0 - "textures/index.ts"
Cohesion: 0.06
Nodes (97): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+89 more)

### Community 1 - "CameraRig.ts"
Cohesion: 0.09
Nodes (19): AIM_SENS_X, AIM_SENS_Y, CameraLookState, DEFAULT_CAM_PITCH, PITCH_MAX, PITCH_MIN, CameraMode, GarageCameraMode (+11 more)

### Community 2 - "RenderWorld"
Cohesion: 0.08
Nodes (17): ArenaEffects, AtmospherePreset, ATMOSPHERES, DUSK, getAtmosphere(), NIGHT, getQualityPreset(), loadQuality() (+9 more)

### Community 3 - "catalog.ts"
Cohesion: 0.13
Nodes (20): Garage(), HullCard(), HullCardProps, MainMenuProps, TurretCard(), TurretCardProps, HULL_IDS, HULLS (+12 more)

### Community 4 - "Projectile.ts"
Cohesion: 0.12
Nodes (14): TankLike, PROJECTILE, despawn(), doSplash(), expPos, HitContext, hitPosA, hitPosB (+6 more)

### Community 5 - "HUD.tsx"
Cohesion: 0.05
Nodes (45): React 19, HUD(), HudCrosshair(), HudCrosshairProps, FeedEntry, HudFeed(), HudFeedProps, HudProps (+37 more)

### Community 6 - "physics.ts"
Cohesion: 0.05
Nodes (52): WeaponType, AIBody, AIController, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA (+44 more)

### Community 7 - "disposeObject3D"
Cohesion: 0.19
Nodes (7): disposeObject3D(), isShared(), Shared, AssetManager, cloneWithOwnMaterials(), matsOf(), texturesOf()

### Community 8 - "Effects"
Cohesion: 0.05
Nodes (10): AmbientDust, CameraShake, Effects, CHAR_MAT, EMBER_GEO, HULL_GEO, TRACK_GEO, TURRET_GEO (+2 more)

### Community 9 - "TankEntity"
Cohesion: 0.07
Nodes (3): BotEntry, RosterSpawnResult, TankEntity

### Community 10 - "GameApi"
Cohesion: 0.22
Nodes (3): App(), GarageProps, GameApi

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, ES2020, node, src, vite/client, vite.config.ts, compilerOptions (+19 more)

### Community 12 - "WEAPON_TUNING"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 13 - "core/types.ts"
Cohesion: 0.20
Nodes (8): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, applyHit(), applySplashHit(), HitEffect, resolveCannonDirectHit()

### Community 14 - "ArmorStrike — Project Rules"
Cohesion: 0.15
Nodes (12): 1. GDD Lifecycle, 2. Architecture (Auto-Extraction), 3. Graphify, 4. Hotfix, 5. Working Style, 6. Stack, ArmorStrike — Project Rules, Phase A → B: Approval Signal (+4 more)

### Community 15 - "Tank.ts"
Cohesion: 0.20
Nodes (10): BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState, BuffableTank, TankFxState, TankParams (+2 more)

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

### Community 20 - "FlamethrowerWeapon.ts"
Cohesion: 0.08
Nodes (14): inFlameConeXZ(), FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec, FlamethrowerWeapon (+6 more)

### Community 23 - "particles.ts"
Cohesion: 0.26
Nodes (5): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark

### Community 24 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Match modes (not app modes), Bootstrap composition (+12 more)

### Community 25 - "00_Index.md"
Cohesion: 0.34
Nodes (3): Team Deathmatch Game Design Document, Wave Buffs Feature, Wave System — Волны и спавн

### Community 27 - "rosterSpawn.ts"
Cohesion: 0.15
Nodes (17): buildBotStyle(), buildPlayerStyle(), applyTeamRing(), botStyleColor(), makeBot(), placeTank(), spawnMatchRoster(), ALPHA_SPAWN_POINTS (+9 more)

### Community 28 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

### Community 30 - "Maps — Мульти-карты и выбор арены"
Cohesion: 0.25
Nodes (8): Known gaps / balance notes, Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Размер арены (глобальный), Структура сборки

### Community 31 - "Arena"
Cohesion: 0.15
Nodes (5): COLORS, Arena, CombatDeps, CombatSystem, buildDerivedSystems()

### Community 34 - "AUTONOMOUS_PROMPT.md"
Cohesion: 0.09
Nodes (21): ANTI-PATTERNS YOU MUST AVOID, BACKLOG BOOTSTRAP (run once at the very start), BASELINE (verify at iteration #1, record actual numbers in PROGRESS.md), CORE RULES (NON-NEGOTIABLE), EMERGENCY PROCEDURES, FIRST ACTION (only when PROGRESS.md does not exist yet), GDD GUARDRAILS (autonomy boundary — hard limit), PHASE 1 — ORIENT (≤2 min) (+13 more)

### Community 35 - "Game"
Cohesion: 0.11
Nodes (5): ModeSelectProps, Game, GameModeController, MatchModeId, HudSnapshot

### Community 37 - "Standard_Weapon.md"
Cohesion: 0.23
Nodes (11): Arena Physics, Damage System, Projectile System — Пул снарядов, Weapon Cannon «Смоки», Weapon Flamethrower Firebird, Railgun Weapon (Рельсотрон), Match Framework, PROJECTILE Constants (speed=58, range=85, radius=0.18) (+3 more)

### Community 38 - "captureLogic.ts"
Cohesion: 0.12
Nodes (20): syncZoneViews(), CAPTURE_ANCHORS, CaptureAnchor, zonesForMap(), CaptureController, CAPTURE, CaptureOwner, CapturePointId (+12 more)

### Community 39 - "BotAiStage.ts"
Cohesion: 0.15
Nodes (20): BotAiStage, deadStub(), allyLineBlockers(), FocusCandidate, FocusSelf, isLineBlocker(), pickAiFocus(), PickAiFocusResult (+12 more)

### Community 40 - "GameBootstrap.ts"
Cohesion: 0.08
Nodes (22): BotRoster, applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), GameSimulation, ProjectileManager, buildSimulationStages() (+14 more)

### Community 41 - "WeaponDeps"
Cohesion: 0.16
Nodes (6): CannonWeapon, WeaponDeps, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 42 - "stages/index.ts"
Cohesion: 0.08
Nodes (29): rearPoint(), PlayerInputStage, TankAnimationSystemStage, TankFxSystemStage, TankSystemStage, WeaponSystemStage, FrameContext, NameplateMap (+21 more)

### Community 43 - "Standard_Tank.md"
Cohesion: 0.43
Nodes (3): Health & Regen — Прочность и саморемонт, Game Lifecycle, Tank Movement

### Community 44 - "dependencies"
Cohesion: 0.22
Nodes (9): lucide-react, dependencies, lucide-react, react, react-dom, three, react, react-dom (+1 more)

### Community 45 - "Capture Point — Захват точки"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

### Community 47 - "Standard Match — каркас матча"
Cohesion: 0.17
Nodes (12): 10. CP objective AI (P5), 11. Results & balance (P6), 1. App GameMode ≠ MatchModeId, 2. Pure helpers + thin runtime, 3. Damage gates (central), 4. Kill credit path, 5. Lifecycle, 6. Roster (+4 more)

### Community 48 - "simPorts.ts"
Cohesion: 0.20
Nodes (11): BOOST, TankAimSystem, TankMotionSystem, TankPresentationSystem, LiveTank, AimBody, CombatTimerBody, MotionBody (+3 more)

### Community 49 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 51 - "game/constants.ts"
Cohesion: 0.43
Nodes (4): SCORE, TANK, applyPlayerKillScore(), KillScoreState

### Community 53 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 54 - "Village Level Design — Square + Barns + Paddocks"
Cohesion: 0.18
Nodes (11): Animated nodes (ArenaEffects), Code map, Cover hierarchy, Implemented layout (code), Layout graph (world, arena half = 150), Per-map atmosphere (RenderWorld), Shared scale (arena 300), Success criteria (+3 more)

### Community 55 - "Tank Aim — Наведение башни"
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 56 - "game/types.ts"
Cohesion: 0.17
Nodes (10): buildGameLoop(), GameLoopDeps, HudModel, RunState, HudUnit, CaptureHudPoint, MinimapDynamic, MinimapRelation (+2 more)

### Community 57 - "App.tsx"
Cohesion: 0.13
Nodes (20): BootError(), BootErrorProps, MainMenu(), ICONS, MapSelect(), MapSelectProps, ModeOption, MODES (+12 more)

### Community 58 - "ArmorStrike — Audit (ошибки и недочёты)"
Cohesion: 0.13
Nodes (14): 1. Базлайн верификации, 2. Ошибки, 3. Недочёты (гигиена), 4. Проверено — НЕ проблемы (чтобы не переисследовать), 5. Рекомендованный порядок работ, 6. Итог работ (2026-08-23) — исправлены все пункты (детали в таблице; H-3/H-4 — с оговорками), 7. Второй перф-проход (2026-08-23, вечер) — остаточные аллокации кадра, 8. Третий перф-проход (2026-08-23, ночь) — texture cache + HUD/миникарта (+6 more)

### Community 59 - "RespawnController.ts"
Cohesion: 0.24
Nodes (9): applyRespawnCombat(), canRespawn(), Respawnable, FFA_FALLBACK, RespawnController, RespawnHooks, restoreDeathVisuals(), respawnPoolFor() (+1 more)

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

### Community 64 - "ErrorBoundary"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 65 - "GameOverScreen.tsx"
Cohesion: 0.31
Nodes (9): GameOverScreen(), GameOverScreenProps, MatchEndReason, formatKd(), formatMatchClock(), modeLabelRu(), resultsHeadline(), ResultsHeadlineInput (+1 more)

### Community 66 - "Arena & Physics — Арена и коллизии"
Cohesion: 0.33
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

### Community 67 - "Standard: Tank Entity & Systems"
Cohesion: 0.20
Nodes (10): 1. Entity = id + composition, 2. Flat port projections, 3.1 Hybrid mesh: процедурный код + GLB (система отключена), 3.2 Владение GPU-ресурсами (общие vs per-instance), 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose (+2 more)

### Community 68 - "RailgunWeapon.ts"
Cohesion: 0.15
Nodes (14): BARREL_REST_Y, fillMuzzleAndAim(), applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle, railgunShouldStartCharge() (+6 more)

### Community 69 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 72 - "TankAnimationSystem.ts"
Cohesion: 0.32
Nodes (4): animateDeath(), tintBody(), AnimBody, BARREL_REST_Z

### Community 73 - "tuning.ts"
Cohesion: 0.23
Nodes (10): TankCombatTimersSystem, tmpV, FxBody, BOOST_JET_HEIGHT, BOOST_JET_OFFSET, DUST_HEIGHT, DUST_SPREAD, HEAL_DELAY (+2 more)

### Community 76 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 77 - "MatchRuntime.ts"
Cohesion: 0.14
Nodes (13): BASE, BOT_NORMAL, configForMode(), MatchRuntime, MatchRuntimeHooks, MatchConfig, MatchResult, evaluateMatchEnd() (+5 more)

### Community 79 - "KillStreakTracker.ts"
Cohesion: 0.33
Nodes (3): KillStreakTracker, STREAK_LABELS, StreakLabel

### Community 81 - "clamp"
Cohesion: 0.24
Nodes (3): SmokePuff, SmokeSystem, clamp()

### Community 82 - "PlayerFactory.ts"
Cohesion: 0.11
Nodes (10): _wctx, WeaponHost, tmpDir, tmpMuzzle, ownerReloadMul(), buildAmmoState(), Weapon, WeaponAmmoState (+2 more)

### Community 84 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 87 - "Engage State (FSM)"
Cohesion: 0.50
Nodes (4): aiCover Module (findCoverPoint), aiTuning Module (preferredRange, aimTolerance, steering), Engage State (FSM), losClear Module (line of sight через colliders)

### Community 90 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 117 - "TankFactory.ts"
Cohesion: 0.14
Nodes (17): TankStyle, TankBuildInput, TankBuildContext, buildHull(), normalizeHullModel(), prepareTexturedModel(), HULL_CONFIG, HULL_TURRET_Y (+9 more)

## Knowledge Gaps
- **427 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+422 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `typescript` to `catalog.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `vite`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@types/react`, `globals`, `tailwindcss`, `typescript`, `package.json`, `@types/react-dom`, `@types/three`, `@tailwindcss/vite`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `typescript` connect `typescript` to `devDependencies`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _427 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `textures/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05771144278606965 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09142857142857143 - nodes in this community are weakly interconnected._
- **Should `RenderWorld` be split into smaller, more focused modules?**
  _Cohesion score 0.08418367346938775 - nodes in this community are weakly interconnected._