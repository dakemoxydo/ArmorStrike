# Graph Report - ArmorStrike  (2026-07-24)

## Corpus Check
- 260 files · ~91,375 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1671 nodes · 4122 edges · 127 communities (76 shown, 51 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14478e1f`
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
- HudScoreboard.tsx
- FlamethrowerWeapon.ts
- Tank Movement — Движение корпуса
- Village Level Design — Square + Barns + Paddocks
- Key patterns
- 3. Общий match framework (фундамент до режимов)
- HudModel
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
- Capture_Point.md
- eslint
- Capture Point — Захват точки
- buildAmmoState
- Docs/GDD/Approved/ Directory
- eslint-plugin-react-refresh
- Garage Loadout — Сборка танка
- PhysicsSystem.ts
- CoreSystem
- FlashSystem
- RingSystem
- SmokeSystem
- Weapon
- FlameParticlePool.ts
- GDD — Approved Mechanics (ArmorStrike)
- TankParams
- HudSnapshot
- Engage State (FSM)
- game/constants.ts
- HudScoreboard.tsx
- package.json
- Health & Regen — Прочность и саморемонт
- hexTexture
- TimeScale
- globals
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
- eslint-plugin-react-hooks
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
- GDD Drafts Directory
- Standard Role
- WEAPON_TUNING Flamethrower Config
- @tailwindcss/vite
- @types/node
- @types/react
- typescript-eslint
- Approved Documentation Directory
- Loadout Data (localStorage)
- Graphics Quality Preset (localStorage)
- Three.js

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 67 edges
2. `EffectsPort` - 45 edges
3. `AudioPort` - 44 edges
4. `Game` - 39 edges
5. `TurretId` - 34 edges
6. `Collider` - 34 edges
7. `HullId` - 33 edges
8. `Arena` - 32 edges
9. `GameApi` - 32 edges
10. `CameraRig` - 30 edges

## Surprising Connections (you probably didn't know these)
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `MapSelectProps` --references--> `MapId`  [EXTRACTED]
  src/components/MapSelect.tsx → src/game/maps/mapCatalog.ts
- `PickAiFocusOpts` --references--> `Collider`  [EXTRACTED]
  src/game/match/aiFocus.ts → src/game/engine/physics.ts
- `resolveCannonDirectHit()` --calls--> `applyHit()`  [EXTRACTED]
  src/__tests__/ProjectileDamage.test.ts → src/game/engine/applyHit.ts
- `makeHudModel()` --calls--> `configForMode()`  [EXTRACTED]
  src/__tests__/hudModelPerf.test.ts → src/game/match/matchConfig.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (127 total, 51 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.19
Nodes (20): buildScattered(), SmokePuff, createStyleMaterials(), barrelTexture(), containerTexture(), crateTexture(), glowTexture(), scorchTexture() (+12 more)

### Community 1 - "CameraRig.ts"
Cohesion: 0.10
Nodes (14): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+6 more)

### Community 2 - "stages.ts"
Cohesion: 0.25
Nodes (3): NameplateEntry, NameplateSubject, Nameplate

### Community 3 - "types.ts"
Cohesion: 0.13
Nodes (14): App(), BootErrorProps, cacheByCanvas, CanvasCache, drawMinimap(), getCache(), paintStatics(), staticLayerKey() (+6 more)

### Community 4 - "physics.ts"
Cohesion: 0.13
Nodes (29): COLORS, buildBotStyle(), buildPlayerStyle(), aimErrorMulForRole(), personaForRole(), ROLE_LABEL, roleForBot(), roleLabel() (+21 more)

### Community 5 - "RenderWorld"
Cohesion: 0.19
Nodes (12): ICONS, MapSelect(), MapSelectProps, AtmospherePreset, ATMOSPHERES, DUSK, getAtmosphere(), NIGHT (+4 more)

### Community 6 - "catalog.ts"
Cohesion: 0.14
Nodes (16): HullCard(), HullCardProps, MainMenuProps, TurretCard(), TurretCardProps, HULL_IDS, HULLS, TURRET_IDS (+8 more)

### Community 7 - "Projectile.ts"
Cohesion: 0.09
Nodes (21): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit(), HitEffect (+13 more)

### Community 8 - "Effects"
Cohesion: 0.06
Nodes (10): AmbientDust, CameraShake, Effects, CHAR_MAT, EMBER_GEO, HULL_GEO, TRACK_GEO, TURRET_GEO (+2 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 12 - "MatchModeId"
Cohesion: 0.10
Nodes (11): GarageProps, ModeOption, MODES, ModeSelect(), ModeSelectProps, PauseMenu(), PauseMenuProps, GameApi (+3 more)

### Community 13 - "particles.ts"
Cohesion: 0.24
Nodes (5): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark

### Community 14 - "GameSimulation.ts"
Cohesion: 0.15
Nodes (12): 1. GDD Lifecycle, 2. Architecture (Auto-Extraction), 3. Graphify, 4. Hotfix, 5. Working Style, 6. Stack, ArmorStrike — Project Rules, Phase A → B: Approval Signal (+4 more)

### Community 15 - "simPorts.ts"
Cohesion: 0.20
Nodes (9): BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState, BuffableTank, TankFxState, TankStyle (+1 more)

### Community 16 - "Classic Match Modes — DM / TDM / Capture Point"
Cohesion: 0.08
Nodes (25): 1. Intent, 2.1 Deathmatch (DM) — «Бой насмерть», 2.2 Team Deathmatch (TDM) — «Командный бой», 2.3 Capture Point (CP) — «Захват точки», 2. Режимы (предложение игрока + уточнения GD), 3.1 Новые понятия, 3.2 Что появляется у каждого танка, 3.3 Respawn (общий) (+17 more)

### Community 17 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, @eslint/js, devDependencies, eslint, @eslint/js, tailwindcss, @types/react-dom, @types/three (+9 more)

### Community 18 - "effects.ts"
Cohesion: 0.12
Nodes (16): disposeArenaSubtree(), buildArena(), makeContext(), getQualityPreset(), loadQuality(), nextQuality(), ORDER, QUALITY_PRESETS (+8 more)

### Community 19 - "GameBootstrap.ts"
Cohesion: 0.17
Nodes (12): AI focus (P2), Capture (P4), Classes, Kill credit, Match Framework — Режимы, roster, respawn, win, Respawn, Results UI (P6), Spawn tables (+4 more)

### Community 22 - "MatchRuntime.ts"
Cohesion: 0.05
Nodes (50): GameOverScreen(), GameOverScreenProps, BotAiStage, deadStub(), allyLineBlockers(), FocusCandidate, FocusSelf, pickAiFocus() (+42 more)

### Community 23 - "CannonWeapon"
Cohesion: 0.16
Nodes (6): CannonWeapon, WeaponDeps, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 24 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Match modes (not app modes), Bootstrap composition (+12 more)

### Community 25 - "HudModel.ts"
Cohesion: 0.20
Nodes (7): railgunShouldStartCharge(), BEAM_SPARK_COLOR, RailgunState, tmpDir, tmpMuzzle, tmpSpark, buildAmmoState()

### Community 27 - "Collider"
Cohesion: 0.13
Nodes (5): applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), RailgunWeapon, CombatPeer

### Community 28 - "mapCatalog.ts"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

### Community 29 - "MuzzleSystem"
Cohesion: 0.10
Nodes (26): WeaponType, AIBody, AIController, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA (+18 more)

### Community 30 - "ScorchSystem"
Cohesion: 0.25
Nodes (8): Known gaps / balance notes, Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Размер арены (глобальный), Структура сборки

### Community 31 - "PlayerFactory.ts"
Cohesion: 0.12
Nodes (17): buildCentralHall(), ArenaBuildContext, ArenaShellTheme, buildArenaShell(), BlockInfo, AnimNodeFn, ArenaEffects, SmokeSprite (+9 more)

### Community 34 - "TurretId"
Cohesion: 0.15
Nodes (14): TankStyle, AssetManager, TankBuildContext, buildHull(), applyMaterialToModel(), normalizeHullModel(), HULL_CONFIG, HULL_TURRET_Y (+6 more)

### Community 38 - "captureLogic.ts"
Cohesion: 0.14
Nodes (18): CAPTURE_ANCHORS, CaptureAnchor, zonesForMap(), CaptureController, CAPTURE, CaptureOwner, CapturePointId, CaptureZoneState (+10 more)

### Community 39 - "TeamId"
Cohesion: 0.07
Nodes (24): React 19, HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps, HudVitalsProps (+16 more)

### Community 40 - "PhysicsSystem.ts"
Cohesion: 0.21
Nodes (3): Arena, MinimapSystem, HudModel

### Community 41 - "TankVisual"
Cohesion: 0.29
Nodes (11): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+3 more)

### Community 42 - "BuffBaseSnapshot"
Cohesion: 0.11
Nodes (25): rearPoint(), PlayerInputStage, TankAnimationSystemStage, TankFxSystemStage, TankSystemStage, WeaponSystemStage, FrameContext, NameplateMap (+17 more)

### Community 44 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 45 - "RailgunWeapon.ts"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

### Community 46 - "Projectile System — Пул снарядов"
Cohesion: 0.17
Nodes (12): Arena Physics, Damage System, Projectile System — Пул снарядов, Wave Buffs Feature, Weapon Cannon «Смоки», Weapon Flamethrower Firebird, Railgun Weapon (Рельсотрон), Match Framework (+4 more)

### Community 47 - "Standard Match — каркас матча"
Cohesion: 0.17
Nodes (12): 10. CP objective AI (P5), 11. Results & balance (P6), 1. App GameMode ≠ MatchModeId, 2. Pure helpers + thin runtime, 3. Damage gates (central), 4. Kill credit path, 5. Lifecycle, 6. Roster (+4 more)

### Community 48 - "Match Framework — Режимы, roster, respawn, win"
Cohesion: 0.33
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

### Community 49 - "package.json"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 51 - "HudScoreboard.tsx"
Cohesion: 0.26
Nodes (24): addCityRamp(), billboard(), buildCityBlocks(), buildCityContent(), buildCityDistricts(), buildCityOverpass(), buildCityPlaza(), buildCityRamps() (+16 more)

### Community 52 - "FlamethrowerWeapon.ts"
Cohesion: 0.22
Nodes (6): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, resolveWeaponDamage()

### Community 53 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 54 - "Village Level Design — Square + Barns + Paddocks"
Cohesion: 0.18
Nodes (11): Animated nodes (ArenaEffects), Code map, Cover hierarchy, Implemented layout (code), Layout graph (world, arena half = 150), Per-map atmosphere (RenderWorld), Shared scale (arena 300), Success criteria (+3 more)

### Community 55 - "Key patterns"
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 56 - "3. Общий match framework (фундамент до режимов)"
Cohesion: 0.16
Nodes (5): CombatDeps, CombatSystem, KillStreakTracker, STREAK_LABELS, StreakLabel

### Community 57 - "HudModel"
Cohesion: 0.12
Nodes (12): GameSimulation, ProjectileManager, buildSimulationStages(), StageDeps, TankAnimationSystem, GameContext, GameLoop, GameLoopDeps (+4 more)

### Community 59 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.21
Nodes (22): buildVillageBanners(), buildVillageBarns(), buildVillageContent(), buildVillageFences(), buildVillageFireflies(), buildVillageFoliage(), buildVillageHayPlatform(), buildVillageHouses() (+14 more)

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
Cohesion: 0.16
Nodes (7): HullId, TurretId, GarageBinding, RosterSpawnCtx, TankBuildInput, PreviewController, disposeObject3D()

### Community 66 - "WEAPON_TUNING"
Cohesion: 0.22
Nodes (5): makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 67 - "Standard: Tank Entity & Systems"
Cohesion: 0.25
Nodes (8): 1. Entity = id + composition, 2. Flat port projections, 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose, 7. Checklist нового tank-related кода, Standard: Tank Entity & Systems

### Community 69 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 70 - "Capture_Point.md"
Cohesion: 0.27
Nodes (11): buildContainerYard(), buildFactoryContent(), buildFoundry(), buildGantryCrane(), buildPipeRack(), buildRamps(), buildSilos(), buildSkyline() (+3 more)

### Community 71 - "eslint"
Cohesion: 0.21
Nodes (10): tmpDir, tmpMuzzle, fillMuzzleAndAim(), tmpDir, tmpMuzzle, ownerReloadMul(), WeaponAmmoState, WeaponOwner (+2 more)

### Community 73 - "buildAmmoState"
Cohesion: 0.28
Nodes (9): TankAimSystem, TankCombatTimersSystem, TankPresentationSystem, LiveTank, AimBody, AnimBody, CombatTimerBody, PresentationBody (+1 more)

### Community 74 - "Docs/GDD/Approved/ Directory"
Cohesion: 0.19
Nodes (5): BotRoster, MatchRuntime, MatchRuntimeHooks, MatchResult, RunState

### Community 76 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 77 - "PhysicsSystem.ts"
Cohesion: 0.22
Nodes (10): resolveCircle(), invalidateSolidColliderCache(), _solid, solidColliders(), _pa, _pb, resolveWalls(), separateTankPair() (+2 more)

### Community 82 - "Weapon"
Cohesion: 0.20
Nodes (3): _wctx, WeaponHost, Weapon

### Community 83 - "FlameParticlePool.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 84 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 85 - "TankParams"
Cohesion: 0.22
Nodes (7): BOOST, tmpV, TankMotionSystem, FxBody, MotionBody, TankParams, SPEED_DAMP

### Community 86 - "HudSnapshot"
Cohesion: 0.24
Nodes (4): HudWeaponProps, buildGameLoop(), HudUnit, HudSnapshot

### Community 87 - "Engage State (FSM)"
Cohesion: 0.50
Nodes (4): aiCover Module (findCoverPoint), aiTuning Module (preferredRange, aimTolerance, steering), Engage State (FSM), losClear Module (line of sight через colliders)

### Community 88 - "game/constants.ts"
Cohesion: 0.33
Nodes (6): botAiForWave(), PROJECTILE, SCORE, TANK, applyPlayerKillScore(), KillScoreState

### Community 89 - "HudScoreboard.tsx"
Cohesion: 0.36
Nodes (8): byTeam(), FlatTable(), HudScoreboard(), HudScoreboardProps, isTeamBoard(), TeamTable(), ScoreRow, scoreboardHpClass()

### Community 90 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 91 - "Health & Regen — Прочность и саморемонт"
Cohesion: 0.67
Nodes (3): Health & Regen — Прочность и саморемонт, Game Lifecycle, Tank Movement

### Community 92 - "hexTexture"
Cohesion: 0.52
Nodes (4): buildAtmosphere(), buildCityAtmosphere(), buildVillageAtmosphere(), hexTexture()

## Knowledge Gaps
- **384 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+379 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `TankEntity` to `constants.ts`, `physics.ts`, `captureLogic.ts`, `Projectile.ts`, `eslint`, `buildAmmoState`, `Docs/GDD/Approved/ Directory`, `BuffBaseSnapshot`, `simPorts.ts`, `Weapon`, `TankParams`, `MatchRuntime.ts`, `CannonWeapon`, `3. Общий match framework (фундамент до режимов)`, `HudModel`, `City Level Design — Grid + Districts + Overpass`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `typescript` connect `devDependencies` to `catalog.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _384 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09758454106280193 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1310344827586207 - nodes in this community are weakly interconnected._
- **Should `physics.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13360323886639677 - nodes in this community are weakly interconnected._
- **Should `catalog.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._