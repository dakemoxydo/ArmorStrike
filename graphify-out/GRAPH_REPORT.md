# Graph Report - .  (2026-07-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1594 nodes · 3837 edges · 107 communities (67 shown, 40 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d836b0a7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- CameraRig.ts
- stages.ts
- types.ts
- physics.ts
- RenderWorld
- catalog.ts
- Projectile.ts
- Effects
- TankEntity
- PlayerController
- compilerOptions
- MatchModeId
- particles.ts
- GameSimulation.ts
- simPorts.ts
- Classic Match Modes — DM / TDM / Capture Point
- devDependencies
- effects.ts
- GameBootstrap.ts
- AudioFX
- MatchRuntime.ts
- CannonWeapon
- Core Architecture — ArmorStrike
- HudModel.ts
- EffectsPort
- Collider
- mapCatalog.ts
- MuzzleSystem
- ScorchSystem
- PlayerFactory.ts
- ArmorStrike Project
- AudioPort
- TurretId
- Game
- ParticleEffects
- Weapon
- captureLogic.ts
- TeamId
- PhysicsSystem.ts
- TankVisual
- BuffBaseSnapshot
- Team Deathmatch Game Design Document
- dependencies
- RailgunWeapon.ts
- Projectile System — Пул снарядов
- Standard Match — каркас матча
- Match Framework — Режимы, roster, respawn, win
- package.json
- Wave System
- FlamethrowerWeapon.ts
- Tank Movement — Движение корпуса
- Village Level Design — Square + Barns + Paddocks
- Tank.ts
- SparkPool
- City Level Design — Grid + Districts + Overpass
- Damage System — Централизованный урон
- Core Patterns — ArmorStrike
- Standard: UI, HUD & Input
- Standard: Weapons, Projectiles & Damage
- ErrorBoundary
- constants.ts
- WEAPON_TUNING
- Standard: Tank Entity & Systems
- Maps — Мульти-карты и выбор арены
- Player Controls — Управление игроком
- Capture Point — Захват точки
- Docs/GDD/Approved/ Directory
- Arena & Physics — Арена и коллизии
- Garage Loadout — Сборка танка
- Tank Aim — Наведение башни
- CoreSystem
- FlashSystem
- RingSystem
- SmokeSystem
- FlameParticlePool.ts
- GDD — Approved Mechanics (ArmorStrike)
- Engage State (FSM)
- opencode.json
- Health & Regen — Прочность и саморемонт
- graphify.js
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
- eslint-plugin-react-hooks
- app.json
- vitest
- AI Bots System
- Assault Role
- Combat System
- AI Bots — Поведение противников (Документ)
- Wave System — Волны и спавн
- Elite Role
- Damage System
- GameMode Type
- Wave System
- CI Workflow Configuration
- ArmorStrike — 3D Бронетанковый Штурм (HTML)
- MapSelect Overlay
- Railgun Finite State Machine
- Auto-pause Policy Function
- Sniper Role
- botStatsForWave
- Standard Role
- WEAPON_TUNING Flamethrower Config

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 62 edges
2. `AudioPort` - 38 edges
3. `EffectsPort` - 38 edges
4. `Game` - 32 edges
5. `GameApi` - 32 edges
6. `Collider` - 32 edges
7. `TurretId` - 31 edges
8. `HullId` - 30 edges
9. `CameraRig` - 30 edges
10. `ArenaBuildContext` - 27 edges

## Surprising Connections (you probably didn't know these)
- `ArmorStrike Project` --uses_style_framework--> `tailwindcss`  [EXTRACTED]
  AGENTS.md → package.json
- `ArmorStrike Project` --uses_build_tool--> `vite`  [EXTRACTED]
  AGENTS.md → package.json
- `ArmorStrike Project` --uses_language--> `typescript`  [EXTRACTED]
  AGENTS.md → package.json
- `ArmorStrike Project` --stores_in--> `Loadout Data (localStorage)`  [EXTRACTED]
  AGENTS.md → README.md
- `ArmorStrike Project` --stores_in--> `Graphics Quality Preset (localStorage)`  [EXTRACTED]
  AGENTS.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **GDD Lifecycle Loop (Brainstorming → Implementation → Auto-Documentation)** — brainstorming_phase, implementation_phase, auto_documentation_phase [EXTRACTED 0.95]
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (107 total, 40 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.05
Nodes (94): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+86 more)

### Community 1 - "CameraRig.ts"
Cohesion: 0.10
Nodes (13): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+5 more)

### Community 2 - "stages.ts"
Cohesion: 0.05
Nodes (41): rearPoint(), aiFocusForBot(), _aiSticky, AmbientStage, _bd, BoostFxCtx, BoostStage, BotAiCtx (+33 more)

### Community 3 - "types.ts"
Cohesion: 0.13
Nodes (13): cacheByCanvas, CanvasCache, drawMinimap(), getCache(), paintStatics(), staticLayerKey(), GameApi, CaptureHudPoint (+5 more)

### Community 4 - "physics.ts"
Cohesion: 0.05
Nodes (57): WeaponType, buildBotStyle(), buildPlayerStyle(), AIBody, AIController, AICtx, AIPersona, AIState (+49 more)

### Community 5 - "RenderWorld"
Cohesion: 0.10
Nodes (16): AtmospherePreset, ATMOSPHERES, DUSK, getAtmosphere(), NIGHT, getQualityPreset(), loadQuality(), nextQuality() (+8 more)

### Community 6 - "catalog.ts"
Cohesion: 0.13
Nodes (16): GarageProps, HullCard(), HullCardProps, MainMenuProps, TurretCard(), TurretCardProps, HULL_IDS, HULLS (+8 more)

### Community 7 - "Projectile.ts"
Cohesion: 0.09
Nodes (21): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit(), HitEffect (+13 more)

### Community 9 - "TankEntity"
Cohesion: 0.07
Nodes (3): BotEntry, RosterSpawnResult, TankEntity

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 12 - "MatchModeId"
Cohesion: 0.10
Nodes (11): App(), BootErrorProps, ModeOption, MODES, ModeSelect(), ModeSelectProps, GameModeController, MapId (+3 more)

### Community 13 - "particles.ts"
Cohesion: 0.22
Nodes (6): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark, SmokePuff

### Community 14 - "GameSimulation.ts"
Cohesion: 0.16
Nodes (13): Arena, GameSimulation, ProjectileManager, buildSimulationStages(), ScalarCell, SimContext, GameContext, GameLoopDeps (+5 more)

### Community 15 - "simPorts.ts"
Cohesion: 0.18
Nodes (13): BOOST, TankAimSystem, TankCombatTimersSystem, tmpV, TankMotionSystem, TankPresentationSystem, LiveTank, AimBody (+5 more)

### Community 16 - "Classic Match Modes — DM / TDM / Capture Point"
Cohesion: 0.08
Nodes (25): 1. Intent, 2.1 Deathmatch (DM) — «Бой насмерть», 2.2 Team Deathmatch (TDM) — «Командный бой», 2.3 Capture Point (CP) — «Захват точки», 2. Режимы (предложение игрока + уточнения GD), 3.1 Новые понятия, 3.2 Что появляется у каждого танка, 3.3 Respawn (общий) (+17 more)

### Community 17 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, @eslint/js, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js, eslint-plugin-react-refresh (+17 more)

### Community 19 - "GameBootstrap.ts"
Cohesion: 0.16
Nodes (13): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+5 more)

### Community 22 - "MatchRuntime.ts"
Cohesion: 0.09
Nodes (22): BotRoster, BASE, BOT_NORMAL, configForMode(), FFA_fallback(), MatchRuntime, MatchRuntimeHooks, restoreDeathVisuals() (+14 more)

### Community 23 - "CannonWeapon"
Cohesion: 0.20
Nodes (5): CannonWeapon, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 24 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Match modes (not app modes), Bootstrap composition (+12 more)

### Community 25 - "HudModel.ts"
Cohesion: 0.20
Nodes (8): captureHudPoints(), allyLineBlockers(), pickAiFocus(), PickAiFocusResult, isAlly(), isEnemy(), HudUnit, emptyColliders

### Community 26 - "EffectsPort"
Cohesion: 0.09
Nodes (4): EffectsPort, applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx()

### Community 27 - "Collider"
Cohesion: 0.17
Nodes (5): Collider, PickAiFocusOpts, RailgunWeapon, ownerReloadMul(), CombatPeer

### Community 28 - "mapCatalog.ts"
Cohesion: 0.23
Nodes (10): ICONS, MapSelect(), MapSelectProps, PauseMenu(), PauseMenuProps, isMapId(), MAP_IDS, MapDef (+2 more)

### Community 31 - "PlayerFactory.ts"
Cohesion: 0.18
Nodes (10): tmpDir, tmpMuzzle, fillMuzzleAndAim(), tmpDir, tmpMuzzle, WeaponAmmoState, WeaponDeps, WeaponOwner (+2 more)

### Community 32 - "ArmorStrike Project"
Cohesion: 0.12
Nodes (16): Architecture Standards (Docs/Architecture/), ArmorStrike Project, Loadout Data (localStorage), Graphics Quality Preset (localStorage), Docs Directory, Graphify Extraction Command, tailwindcss, typescript (+8 more)

### Community 33 - "AudioPort"
Cohesion: 0.10
Nodes (4): COLORS, CombatDeps, CombatSystem, AudioPort

### Community 34 - "TurretId"
Cohesion: 0.22
Nodes (10): HullId, TurretId, TankStyle, GarageBinding, RosterSpawnCtx, TankBuildInput, buildTankMesh(), TankBuildContext (+2 more)

### Community 37 - "Weapon"
Cohesion: 0.11
Nodes (5): _wctx, WeaponHost, FlamethrowerWeapon, Weapon, WeaponContext

### Community 38 - "captureLogic.ts"
Cohesion: 0.14
Nodes (17): CAPTURE_ANCHORS, CaptureAnchor, zonesForMap(), CAPTURE, CaptureOwner, CapturePointId, CaptureZoneState, countPresenceInZone() (+9 more)

### Community 39 - "TeamId"
Cohesion: 0.05
Nodes (43): GameOverScreen(), GameOverScreenProps, HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps (+35 more)

### Community 40 - "PhysicsSystem.ts"
Cohesion: 0.21
Nodes (9): solidColliders(), PhysicsSystemStage, _pa, _pb, PhysicsSystem, resolveWalls(), separateTankPair(), TankXZ (+1 more)

### Community 41 - "TankVisual"
Cohesion: 0.19
Nodes (3): PreviewController, disposeObject3D(), TankVisual

### Community 44 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 45 - "RailgunWeapon.ts"
Cohesion: 0.18
Nodes (10): segmentHitT(), nearestShotBlockerDist(), ShotBlockerHit, RailgunFireState, railgunShouldStartCharge(), BEAM_SPARK_COLOR, RailgunState, tmpDir (+2 more)

### Community 46 - "Projectile System — Пул снарядов"
Cohesion: 0.12
Nodes (16): Approved Documentation Directory, Arena Physics, Damage System, Classic Match Modes, Projectile System — Пул снарядов, Wave Buffs Feature, Weapon Cannon «Смоки», Weapon Flamethrower Firebird (+8 more)

### Community 47 - "Standard Match — каркас матча"
Cohesion: 0.17
Nodes (12): 10. CP objective AI (P5), 11. Results & balance (P6), 1. App GameMode ≠ MatchModeId, 2. Pure helpers + thin runtime, 3. Damage gates (central), 4. Kill credit path, 5. Lifecycle, 6. Roster (+4 more)

### Community 48 - "Match Framework — Режимы, roster, respawn, win"
Cohesion: 0.17
Nodes (12): AI focus (P2), Capture (P4), Classes, Kill credit, Match Framework — Режимы, roster, respawn, win, Respawn, Results UI (P6), Spawn tables (+4 more)

### Community 49 - "package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, lint, preview, test (+3 more)

### Community 52 - "FlamethrowerWeapon.ts"
Cohesion: 0.17
Nodes (7): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, buildAmmoState(), resolveWeaponDamage()

### Community 53 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 54 - "Village Level Design — Square + Barns + Paddocks"
Cohesion: 0.18
Nodes (11): Animated nodes (ArenaEffects), Code map, Cover hierarchy, Implemented layout (code), Layout graph (world, arena half = 150), Per-map atmosphere (RenderWorld), Shared scale (arena 300), Success criteria (+3 more)

### Community 57 - "Tank.ts"
Cohesion: 0.26
Nodes (8): createTankFxState(), TankBuffState, TankCombatState, TankMotionState, FxBody, TankFxState, TankParams, PARAMS

### Community 59 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

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

### Community 65 - "constants.ts"
Cohesion: 0.33
Nodes (6): botAiForWave(), PROJECTILE, SCORE, TANK, applyPlayerKillScore(), KillScoreState

### Community 66 - "WEAPON_TUNING"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 67 - "Standard: Tank Entity & Systems"
Cohesion: 0.25
Nodes (8): 1. Entity = id + composition, 2. Flat port projections, 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose, 7. Checklist нового tank-related кода, Standard: Tank Entity & Systems

### Community 68 - "Maps — Мульти-карты и выбор арены"
Cohesion: 0.25
Nodes (8): Known gaps / balance notes, Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Размер арены (глобальный), Структура сборки

### Community 69 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 72 - "Capture Point — Захват точки"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

### Community 74 - "Docs/GDD/Approved/ Directory"
Cohesion: 0.40
Nodes (6): Docs/GDD/Approved/ Directory, Auto-Documentation Phase (Phase C), Brainstorming Phase (Phase A), Docs/GDD/Drafts/ Directory, Implementation Phase (Phase B), Obsidian Game Design Documents

### Community 75 - "Arena & Physics — Арена и коллизии"
Cohesion: 0.33
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

### Community 76 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 77 - "Tank Aim — Наведение башни"
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 83 - "FlameParticlePool.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 84 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 87 - "Engage State (FSM)"
Cohesion: 0.50
Nodes (4): aiCover Module (findCoverPoint), aiTuning Module (preferredRange, aimTolerance, steering), Engage State (FSM), losClear Module (line of sight через colliders)

### Community 88 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 91 - "Health & Regen — Прочность и саморемонт"
Cohesion: 0.67
Nodes (3): Health & Regen — Прочность и саморемонт, Game Lifecycle, Tank Movement

## Knowledge Gaps
- **376 isolated node(s):** `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js`, `name`, `private` (+371 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `TankEntity` to `index.ts`, `AudioPort`, `stages.ts`, `TurretId`, `physics.ts`, `Weapon`, `captureLogic.ts`, `Projectile.ts`, `TeamId`, `TankVisual`, `BuffBaseSnapshot`, `GameSimulation.ts`, `MatchRuntime.ts`, `CannonWeapon`, `Tank.ts`, `PlayerFactory.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `typescript` connect `ArmorStrike Project` to `catalog.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `ArmorStrike Project`, `package.json`, `eslint-plugin-react-hooks`, `vitest`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js` to the rest of the system?**
  _376 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051842972729997 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10465116279069768 - nodes in this community are weakly interconnected._
- **Should `stages.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05446853516657853 - nodes in this community are weakly interconnected._