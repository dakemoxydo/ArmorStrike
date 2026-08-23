# Graph Report - ArmorStrike  (2026-08-23)

## Corpus Check
- 264 files · ~93,664 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1717 nodes · 4234 edges · 122 communities (69 shown, 53 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `576d74e8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- textures/index.ts
- CameraRig.ts
- graphicsQuality.ts
- HudModel.ts
- Projectile.ts
- rosterSpawn.ts
- PhysicsSystem.ts
- FlamethrowerWeapon.ts
- Effects
- TankEntity
- PlayerController
- compilerOptions
- WEAPON_TUNING
- particles.ts
- ArmorStrike — Project Rules
- Tank.ts
- Classic Match Modes — DM / TDM / Capture Point
- devDependencies
- RenderWorld
- Match Framework — Режимы, roster, respawn, win
- Weapon
- AudioFX
- mapCatalog.ts
- CannonWeapon
- Core Architecture — ArmorStrike
- game/constants.ts
- EffectsPort
- RailgunWeapon
- City Level Design — Grid + Districts + Overpass
- physics.ts
- Maps — Мульти-карты и выбор арены
- WorldStages.ts
- vite
- AudioPort
- TankFactory.ts
- Game
- ParticleEffects
- weapons/types.ts
- captureLogic.ts
- HUD.tsx
- RespawnController.ts
- GameBootstrap.ts
- stages/index.ts
- CombatSystem
- dependencies
- Capture Point — Захват точки
- 00_Index.md
- Standard Match — каркас матча
- TankSystem.ts
- scripts
- Wave System
- TimeScale
- FlamethrowerWeapon
- Tank Movement — Движение корпуса
- Village Level Design — Square + Barns + Paddocks
- Tank Aim — Наведение башни
- KillStreakTracker.ts
- Projectile System — Пул снарядов
- SparkPool
- Arena
- Damage System — Централизованный урон
- Core Patterns — ArmorStrike
- Standard: UI, HUD & Input
- Standard: Weapons, Projectiles & Damage
- ErrorBoundary
- eslint
- Standard: Tank Entity & Systems
- RailgunWeapon.ts
- Player Controls — Управление игроком
- GameOverScreen.tsx
- simPorts.ts
- tuning.ts
- MatchRuntime.ts
- eslint-plugin-react-refresh
- Garage Loadout — Сборка танка
- MuzzleSystem
- CoreSystem
- FlashSystem
- RingSystem
- SmokeSystem
- MapId
- ScorchSystem
- GDD — Approved Mechanics (ArmorStrike)
- PreviewController
- Engage State (FSM)
- package.json
- FlameParticlePool.ts
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
- eslint-plugin-react-hooks
- GameApi
- vitest
- GameSimulation.ts
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
- catalog.ts
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
1. `TankEntity` - 66 edges
2. `EffectsPort` - 46 edges
3. `AudioPort` - 44 edges
4. `Game` - 39 edges
5. `Collider` - 34 edges
6. `TurretId` - 33 edges
7. `Arena` - 33 edges
8. `HullId` - 32 edges
9. `GameApi` - 32 edges
10. `CameraRig` - 30 edges

## Surprising Connections (you probably didn't know these)
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `HudScoreboardProps` --references--> `ScoreRow`  [EXTRACTED]
  src/components/hud/HudScoreboard.tsx → src/game/types.ts
- `HudWeaponProps` --references--> `HudSnapshot`  [EXTRACTED]
  src/components/hud/HudWeapon.tsx → src/game/types.ts
- `PickAiFocusOpts` --references--> `Collider`  [EXTRACTED]
  src/game/match/aiFocus.ts → src/game/engine/physics.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (122 total, 53 thin omitted)

### Community 0 - "textures/index.ts"
Cohesion: 0.06
Nodes (94): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+86 more)

### Community 1 - "CameraRig.ts"
Cohesion: 0.09
Nodes (18): AIM_SENS_X, AIM_SENS_Y, CameraLookState, DEFAULT_CAM_PITCH, PITCH_MAX, PITCH_MIN, CameraMode, GarageCameraMode (+10 more)

### Community 2 - "graphicsQuality.ts"
Cohesion: 0.20
Nodes (8): getQualityPreset(), loadQuality(), nextQuality(), ORDER, QUALITY_PRESETS, QualityLevel, saveQuality(), QualityController

### Community 3 - "HudModel.ts"
Cohesion: 0.22
Nodes (9): HudModel, TeamId, isAlly(), TeamTagged, HudUnit, CaptureHudPoint, HudSnapshot, MinimapStatic (+1 more)

### Community 4 - "Projectile.ts"
Cohesion: 0.09
Nodes (23): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, PROJECTILE, applyHit(), applySplashHit() (+15 more)

### Community 5 - "rosterSpawn.ts"
Cohesion: 0.10
Nodes (29): COLORS, buildBotStyle(), buildPlayerStyle(), aimErrorMulForRole(), personaForRole(), ROLE_LABEL, roleForBot(), roleLabel() (+21 more)

### Community 6 - "PhysicsSystem.ts"
Cohesion: 0.18
Nodes (10): disposeArenaSubtree(), invalidateSolidColliderCache(), _solid, solidColliders(), _pa, _pb, resolveWalls(), separateTankPair() (+2 more)

### Community 7 - "FlamethrowerWeapon.ts"
Cohesion: 0.17
Nodes (7): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, buildAmmoState(), resolveWeaponDamage()

### Community 8 - "Effects"
Cohesion: 0.05
Nodes (10): AmbientDust, CameraShake, Effects, CHAR_MAT, EMBER_GEO, HULL_GEO, TRACK_GEO, TURRET_GEO (+2 more)

### Community 9 - "TankEntity"
Cohesion: 0.07
Nodes (3): BotEntry, RosterSpawnResult, TankEntity

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, ES2020, node, src, vite/client, vite.config.ts, compilerOptions (+19 more)

### Community 12 - "WEAPON_TUNING"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 13 - "particles.ts"
Cohesion: 0.24
Nodes (5): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark

### Community 14 - "ArmorStrike — Project Rules"
Cohesion: 0.15
Nodes (12): 1. GDD Lifecycle, 2. Architecture (Auto-Extraction), 3. Graphify, 4. Hotfix, 5. Working Style, 6. Stack, ArmorStrike — Project Rules, Phase A → B: Approval Signal (+4 more)

### Community 15 - "Tank.ts"
Cohesion: 0.20
Nodes (9): buildTankMesh(), createTankFxState(), TankBuffState, TankCombatState, TankMotionState, MotionBody, TankParams, TankVisual (+1 more)

### Community 16 - "Classic Match Modes — DM / TDM / Capture Point"
Cohesion: 0.08
Nodes (25): 1. Intent, 2.1 Deathmatch (DM) — «Бой насмерть», 2.2 Team Deathmatch (TDM) — «Командный бой», 2.3 Capture Point (CP) — «Захват точки», 2. Режимы (предложение игрока + уточнения GD), 3.1 Новые понятия, 3.2 Что появляется у каждого танка, 3.3 Respawn (общий) (+17 more)

### Community 17 - "devDependencies"
Cohesion: 0.12
Nodes (17): @eslint/js, globals, devDependencies, @eslint/js, globals, tailwindcss, @types/react-dom, @types/three (+9 more)

### Community 19 - "Match Framework — Режимы, roster, respawn, win"
Cohesion: 0.17
Nodes (12): AI focus (P2), Capture (P4), Classes, Kill credit, Match Framework — Режимы, roster, respawn, win, Respawn, Results UI (P6), Spawn tables (+4 more)

### Community 20 - "Weapon"
Cohesion: 0.20
Nodes (3): _wctx, WeaponHost, Weapon

### Community 22 - "mapCatalog.ts"
Cohesion: 0.19
Nodes (13): ICONS, MapSelect(), AtmospherePreset, ATMOSPHERES, DUSK, getAtmosphere(), NIGHT, DEFAULT_MAP_ID (+5 more)

### Community 23 - "CannonWeapon"
Cohesion: 0.20
Nodes (5): CannonWeapon, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 24 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Match modes (not app modes), Bootstrap composition (+12 more)

### Community 25 - "game/constants.ts"
Cohesion: 0.36
Nodes (5): SCORE, TANK, BOT_NORMAL, applyPlayerKillScore(), KillScoreState

### Community 28 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

### Community 29 - "physics.ts"
Cohesion: 0.05
Nodes (50): WeaponType, AIBody, AIController, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA (+42 more)

### Community 30 - "Maps — Мульти-карты и выбор арены"
Cohesion: 0.13
Nodes (14): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы, Known gaps / balance notes, Map IDs (+6 more)

### Community 31 - "WorldStages.ts"
Cohesion: 0.14
Nodes (9): rearPoint(), _bd, BoostStage, _bv, NameplateSystemStage, PhysicsSystemStage, MinimapSystem, NameplateSystem (+1 more)

### Community 34 - "TankFactory.ts"
Cohesion: 0.08
Nodes (25): TankStyle, disposeObject3D(), isShared(), markShared(), Shared, unmarkShared(), AssetManager, cloneWithOwnMaterials() (+17 more)

### Community 37 - "weapons/types.ts"
Cohesion: 0.20
Nodes (9): tmpDir, tmpMuzzle, fillMuzzleAndAim(), ownerReloadMul(), WeaponAmmoState, WeaponDeps, WeaponOwner, WeaponOwnerParams (+1 more)

### Community 38 - "captureLogic.ts"
Cohesion: 0.14
Nodes (18): CAPTURE_ANCHORS, CaptureAnchor, zonesForMap(), CaptureController, CAPTURE, CaptureOwner, CapturePointId, CaptureZoneState (+10 more)

### Community 39 - "HUD.tsx"
Cohesion: 0.06
Nodes (37): React 19, HUD(), HudCrosshair(), HudCrosshairProps, FeedEntry, HudFeed(), HudFeedProps, HudProps (+29 more)

### Community 40 - "RespawnController.ts"
Cohesion: 0.14
Nodes (10): applyRespawnCombat(), canRespawn(), Respawnable, FFA_FALLBACK, RespawnController, RespawnHooks, restoreDeathVisuals(), respawnPoolFor() (+2 more)

### Community 41 - "GameBootstrap.ts"
Cohesion: 0.14
Nodes (13): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+5 more)

### Community 42 - "stages/index.ts"
Cohesion: 0.13
Nodes (17): StageDeps, PlayerInputStage, TankAnimationSystemStage, TankFxSystemStage, TankSystemStage, WeaponSystemStage, FrameContext, NameplateMap (+9 more)

### Community 44 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 45 - "Capture Point — Захват точки"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

### Community 46 - "00_Index.md"
Cohesion: 0.18
Nodes (13): Health & Regen — Прочность и саморемонт, Team Deathmatch Game Design Document, Wave Buffs Feature, Wave System — Волны и спавн, Weapon Cannon «Смоки», Weapon Flamethrower Firebird, Railgun Weapon (Рельсотрон), Game Lifecycle (+5 more)

### Community 47 - "Standard Match — каркас матча"
Cohesion: 0.17
Nodes (12): 10. CP objective AI (P5), 11. Results & balance (P6), 1. App GameMode ≠ MatchModeId, 2. Pure helpers + thin runtime, 3. Damage gates (central), 4. Kill credit path, 5. Lifecycle, 6. Roster (+4 more)

### Community 48 - "TankSystem.ts"
Cohesion: 0.39
Nodes (5): TankAimSystem, TankPresentationSystem, LiveTank, AimBody, PresentationBody

### Community 49 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 53 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 54 - "Village Level Design — Square + Barns + Paddocks"
Cohesion: 0.18
Nodes (11): Animated nodes (ArenaEffects), Code map, Cover hierarchy, Implemented layout (code), Layout graph (world, arena half = 150), Per-map atmosphere (RenderWorld), Shared scale (arena 300), Success criteria (+3 more)

### Community 55 - "Tank Aim — Наведение башни"
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 56 - "KillStreakTracker.ts"
Cohesion: 0.33
Nodes (3): KillStreakTracker, STREAK_LABELS, StreakLabel

### Community 57 - "Projectile System — Пул снарядов"
Cohesion: 0.50
Nodes (4): Arena Physics, Damage System, Projectile System — Пул снарядов, PROJECTILE Constants (speed=58, range=85, radius=0.18)

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

### Community 67 - "Standard: Tank Entity & Systems"
Cohesion: 0.20
Nodes (10): 1. Entity = id + composition, 2. Flat port projections, 3.1 Hybrid mesh: процедурный код + GLB (система отключена), 3.2 Владение GPU-ресурсами (общие vs per-instance), 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose (+2 more)

### Community 68 - "RailgunWeapon.ts"
Cohesion: 0.14
Nodes (12): BARREL_REST_Y, applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle, railgunShouldStartCharge(), BEAM_SPARK_COLOR (+4 more)

### Community 69 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 70 - "GameOverScreen.tsx"
Cohesion: 0.22
Nodes (12): GameOverScreen(), GameOverScreenProps, PauseMenu(), PauseMenuProps, MatchEndReason, formatKd(), formatMatchClock(), modeLabelRu() (+4 more)

### Community 72 - "simPorts.ts"
Cohesion: 0.19
Nodes (9): animateDeath(), tintBody(), BuffBaseSnapshot, AnimBody, BuffableTank, CombatTimerBody, ControllableTank, FxBody (+1 more)

### Community 73 - "tuning.ts"
Cohesion: 0.18
Nodes (13): BOOST, TankCombatTimersSystem, tmpV, TankMotionSystem, BOOST_JET_HEIGHT, BOOST_JET_OFFSET, DUST_HEIGHT, DUST_SPREAD (+5 more)

### Community 74 - "MatchRuntime.ts"
Cohesion: 0.12
Nodes (20): ModeOption, MODES, ModeSelect(), ModeSelectProps, BotRoster, BASE, configForMode(), DEFAULT_MATCH_MODE (+12 more)

### Community 76 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 82 - "MapId"
Cohesion: 0.22
Nodes (4): MapSelectProps, GameModeController, MapId, MatchResetOpts

### Community 84 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 87 - "Engage State (FSM)"
Cohesion: 0.50
Nodes (4): aiCover Module (findCoverPoint), aiTuning Module (preferredRange, aimTolerance, steering), Engage State (FSM), losClear Module (line of sight через colliders)

### Community 90 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 93 - "FlameParticlePool.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 100 - "GameApi"
Cohesion: 0.10
Nodes (14): App(), GarageProps, cacheByCanvas, CanvasCache, drawMinimap(), getCache(), MAP_HALF, paintStatics() (+6 more)

### Community 102 - "GameSimulation.ts"
Cohesion: 0.15
Nodes (10): GameSimulation, buildSimulationStages(), GameContext, GameLoopDeps, GameModeControllerDeps, GarageBinding, GarageBindingDeps, GameEvent (+2 more)

### Community 117 - "catalog.ts"
Cohesion: 0.13
Nodes (20): BootError(), BootErrorProps, Garage(), HullCard(), HullCardProps, MainMenu(), MainMenuProps, TurretCard() (+12 more)

## Knowledge Gaps
- **386 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+381 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `devDependencies` to `catalog.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `@types/react`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `vite`, `vitest`, `eslint-plugin-react-refresh`, `package.json`, `@tailwindcss/vite`, `@types/node`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _386 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `textures/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055066552168312584 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09268707482993198 - nodes in this community are weakly interconnected._
- **Should `Projectile.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08521870286576169 - nodes in this community are weakly interconnected._
- **Should `rosterSpawn.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09595959595959595 - nodes in this community are weakly interconnected._