# Graph Report - ArmorStrike  (2026-08-23)

## Corpus Check
- 264 files · ~93,778 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1709 nodes · 4189 edges · 125 communities (77 shown, 48 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4a40a1c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- textures/index.ts
- CameraRig.ts
- RenderWorld
- HudSnapshot
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
- disposeObject3D
- Match Framework — Режимы, roster, respawn, win
- Weapon
- AudioFX
- App.tsx
- weapons/types.ts
- Core Architecture — ArmorStrike
- game/constants.ts
- EffectsPort
- RailgunWeapon
- City Level Design — Grid + Districts + Overpass
- AI.ts
- Maps — Мульти-карты и выбор арены
- WorldStages.ts
- vite
- AudioPort
- TankFactory.ts
- Game
- ParticleEffects
- core/types.ts
- captureLogic.ts
- HUD.tsx
- RespawnController.ts
- GameBootstrap.ts
- stages/index.ts
- CombatSystem
- dependencies
- Capture Point — Захват точки
- Standard_Weapon.md
- Standard Match — каркас матча
- TankSystem.ts
- scripts
- Wave System
- TimeScale
- physics.ts
- Tank Movement — Движение корпуса
- Village Level Design — Square + Barns + Paddocks
- Tank Aim — Наведение башни
- KillStreakTracker.ts
- aiFocus.ts
- BotAiStage.ts
- 00_Index.md
- Damage System — Централизованный урон
- Core Patterns — ArmorStrike
- Standard: UI, HUD & Input
- Standard: Weapons, Projectiles & Damage
- ErrorBoundary
- winConditions.ts
- AIController
- Standard: Tank Entity & Systems
- RailgunWeapon.ts
- Player Controls — Управление игроком
- TeamId
- Nameplate
- TankAnimationSystem.ts
- tuning.ts
- MatchRuntime.ts
- eslint-plugin-react-refresh
- Garage Loadout — Сборка танка
- MatchRuntime
- CoreSystem
- FlashSystem
- RingSystem
- SmokeSystem
- aiRoles.ts
- Standard_Tank.md
- GDD — Approved Mechanics (ArmorStrike)
- Arena & Physics — Арена и коллизии
- globals
- Engage State (FSM)
- tailwindcss
- package.json
- @types/react-dom
- @types/three
- FlameParticlePool.ts
- typescript
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
- eslint-plugin-react-hooks
- GameApi
- Game.ts
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
- @types/react
- Approved Documentation Directory
- Loadout Data (localStorage)
- Graphics Quality Preset (localStorage)
- Three.js

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 66 edges
2. `EffectsPort` - 45 edges
3. `AudioPort` - 43 edges
4. `Game` - 39 edges
5. `Arena` - 33 edges
6. `GameApi` - 32 edges
7. `Collider` - 32 edges
8. `CameraRig` - 30 edges
9. `PlayerController` - 29 edges
10. `TurretId` - 28 edges

## Surprising Connections (you probably didn't know these)
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `HudWeaponProps` --references--> `HudSnapshot`  [EXTRACTED]
  src/components/hud/HudWeapon.tsx → src/game/types.ts
- `PickAiFocusOpts` --references--> `Collider`  [EXTRACTED]
  src/game/match/aiFocus.ts → src/game/engine/physics.ts
- `FocusCandidate` --references--> `TeamId`  [EXTRACTED]
  src/game/match/aiFocus.ts → src/game/match/matchTypes.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (125 total, 48 thin omitted)

### Community 0 - "textures/index.ts"
Cohesion: 0.05
Nodes (94): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+86 more)

### Community 1 - "CameraRig.ts"
Cohesion: 0.08
Nodes (21): AIM_SENS_X, AIM_SENS_Y, CameraLookState, DEFAULT_CAM_PITCH, PITCH_MAX, PITCH_MIN, CameraMode, GarageCameraMode (+13 more)

### Community 2 - "RenderWorld"
Cohesion: 0.17
Nodes (10): getQualityPreset(), nextQuality(), ORDER, QUALITY_PRESETS, QualityLevel, QualityPreset, saveQuality(), QualityController (+2 more)

### Community 4 - "Projectile.ts"
Cohesion: 0.12
Nodes (17): WeaponType, TankLike, applySplashHit(), HitEffect, despawn(), doSplash(), expPos, HitContext (+9 more)

### Community 5 - "rosterSpawn.ts"
Cohesion: 0.25
Nodes (15): buildBotStyle(), buildPlayerStyle(), applyTeamRing(), botStyleColor(), makeBot(), placeTank(), spawnMatchRoster(), ALPHA_SPAWN_POINTS (+7 more)

### Community 6 - "PhysicsSystem.ts"
Cohesion: 0.27
Nodes (8): resolveCircle(), solidColliders(), _pa, _pb, resolveWalls(), separateTankPair(), TankXZ, PhysicsBody

### Community 7 - "FlamethrowerWeapon.ts"
Cohesion: 0.13
Nodes (8): inFlameConeXZ(), FlamethrowerWeapon, tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, WeaponContext, resolveWeaponDamage()

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
Cohesion: 0.08
Nodes (11): CoreAnim, FlashLight, MuzzleSystem, ParticleSystem, RingAnim, ScorchMark, ScorchSystem, SmokePuff (+3 more)

### Community 14 - "ArmorStrike — Project Rules"
Cohesion: 0.15
Nodes (12): 1. GDD Lifecycle, 2. Architecture (Auto-Extraction), 3. Graphify, 4. Hotfix, 5. Working Style, 6. Stack, ArmorStrike — Project Rules, Phase A → B: Approval Signal (+4 more)

### Community 15 - "Tank.ts"
Cohesion: 0.20
Nodes (13): BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState, AnimBody, BuffableTank, CombatTimerBody (+5 more)

### Community 16 - "Classic Match Modes — DM / TDM / Capture Point"
Cohesion: 0.08
Nodes (25): 1. Intent, 2.1 Deathmatch (DM) — «Бой насмерть», 2.2 Team Deathmatch (TDM) — «Командный бой», 2.3 Capture Point (CP) — «Захват точки», 2. Режимы (предложение игрока + уточнения GD), 3.1 Новые понятия, 3.2 Что появляется у каждого танка, 3.3 Respawn (общий) (+17 more)

### Community 17 - "devDependencies"
Cohesion: 0.13
Nodes (15): eslint, @eslint/js, devDependencies, eslint, @eslint/js, @types/node, typescript-eslint, vite-plugin-singlefile (+7 more)

### Community 18 - "disposeObject3D"
Cohesion: 0.19
Nodes (9): disposeObject3D(), isShared(), markShared(), Shared, unmarkShared(), AssetManager, cloneWithOwnMaterials(), matsOf() (+1 more)

### Community 19 - "Match Framework — Режимы, roster, respawn, win"
Cohesion: 0.17
Nodes (12): AI focus (P2), Capture (P4), Classes, Kill credit, Match Framework — Режимы, roster, respawn, win, Respawn, Results UI (P6), Spawn tables (+4 more)

### Community 20 - "Weapon"
Cohesion: 0.20
Nodes (3): _wctx, WeaponHost, Weapon

### Community 22 - "App.tsx"
Cohesion: 0.09
Nodes (29): BootError(), BootErrorProps, Garage(), MainMenu(), ICONS, MapSelect(), MapSelectProps, ModeOption (+21 more)

### Community 23 - "weapons/types.ts"
Cohesion: 0.10
Nodes (14): TankBuildInput, CannonWeapon, tmpDir, tmpMuzzle, ownerReloadMul(), buildAmmoState(), WeaponAmmoState, WeaponDeps (+6 more)

### Community 24 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Match modes (not app modes), Bootstrap composition (+12 more)

### Community 25 - "game/constants.ts"
Cohesion: 0.27
Nodes (7): BOOST, PROJECTILE, SCORE, TANK, BOT_NORMAL, applyPlayerKillScore(), KillScoreState

### Community 26 - "EffectsPort"
Cohesion: 0.08
Nodes (3): rearPoint(), AmbientStage, EffectsPort

### Community 28 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

### Community 29 - "AI.ts"
Cohesion: 0.23
Nodes (14): AIBody, AICtx, AIPersona, AIState, DEFAULT_PERSONA, AimFireState, updateTurretAndFire(), aimTolerance() (+6 more)

### Community 30 - "Maps — Мульти-карты и выбор арены"
Cohesion: 0.25
Nodes (8): Known gaps / balance notes, Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Размер арены (глобальный), Структура сборки

### Community 31 - "WorldStages.ts"
Cohesion: 0.14
Nodes (8): COLORS, Arena, _bd, _bv, MinimapStage, PhysicsSystemStage, MinimapSystem, PhysicsSystem

### Community 34 - "TankFactory.ts"
Cohesion: 0.13
Nodes (18): TankStyle, buildTankMesh(), TankBuildContext, buildHull(), normalizeHullModel(), prepareTexturedModel(), HULL_CONFIG, HULL_TURRET_Y (+10 more)

### Community 37 - "core/types.ts"
Cohesion: 0.21
Nodes (6): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, applyHit(), resolveCannonDirectHit()

### Community 38 - "captureLogic.ts"
Cohesion: 0.14
Nodes (18): CAPTURE_ANCHORS, CaptureAnchor, zonesForMap(), CaptureController, CAPTURE, CaptureOwner, CapturePointId, CaptureZoneState (+10 more)

### Community 39 - "HUD.tsx"
Cohesion: 0.06
Nodes (37): React 19, HUD(), HudCrosshair(), HudCrosshairProps, FeedEntry, HudFeed(), HudFeedProps, HudProps (+29 more)

### Community 40 - "RespawnController.ts"
Cohesion: 0.24
Nodes (9): applyRespawnCombat(), canRespawn(), Respawnable, FFA_FALLBACK, RespawnController, RespawnHooks, restoreDeathVisuals(), respawnPoolFor() (+1 more)

### Community 41 - "GameBootstrap.ts"
Cohesion: 0.25
Nodes (13): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+5 more)

### Community 42 - "stages/index.ts"
Cohesion: 0.15
Nodes (17): PlayerInputStage, TankAnimationSystemStage, TankFxSystemStage, TankSystemStage, WeaponSystemStage, FrameContext, NameplateMap, ScalarCell (+9 more)

### Community 43 - "CombatSystem"
Cohesion: 0.21
Nodes (4): CombatDeps, CombatSystem, StageDeps, ProjectileStage

### Community 44 - "dependencies"
Cohesion: 0.22
Nodes (9): lucide-react, dependencies, lucide-react, react, react-dom, three, react, react-dom (+1 more)

### Community 45 - "Capture Point — Захват точки"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

### Community 46 - "Standard_Weapon.md"
Cohesion: 0.23
Nodes (11): Arena Physics, Damage System, Projectile System — Пул снарядов, Weapon Cannon «Смоки», Weapon Flamethrower Firebird, Railgun Weapon (Рельсотрон), Match Framework, PROJECTILE Constants (speed=58, range=85, radius=0.18) (+3 more)

### Community 47 - "Standard Match — каркас матча"
Cohesion: 0.17
Nodes (12): 10. CP objective AI (P5), 11. Results & balance (P6), 1. App GameMode ≠ MatchModeId, 2. Pure helpers + thin runtime, 3. Damage gates (central), 4. Kill credit path, 5. Lifecycle, 6. Roster (+4 more)

### Community 48 - "TankSystem.ts"
Cohesion: 0.19
Nodes (9): TankAimSystem, TankMotionSystem, TankPresentationSystem, LiveTank, AimBody, MotionBody, PresentationBody, KNOCKBACK_DECAY (+1 more)

### Community 49 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 52 - "physics.ts"
Cohesion: 0.21
Nodes (11): AI_LOW_HP_FRAC, findCoverPoint(), AvoidState, computeObstacleAvoidance(), dirFree(), _circleOut, ColliderKind, ColliderOpts (+3 more)

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

### Community 57 - "aiFocus.ts"
Cohesion: 0.18
Nodes (11): allyLineBlockers(), FocusCandidate, FocusSelf, pickAiFocus(), PickAiFocusOpts, PickAiFocusResult, isAlly(), isEnemy() (+3 more)

### Community 58 - "BotAiStage.ts"
Cohesion: 0.27
Nodes (10): AITarget, BotAiStage, deadStub(), isObjectiveDuty(), moveHintForZone(), ObjectiveZoneView, pickObjectiveZone(), shouldFightNearObjective() (+2 more)

### Community 59 - "00_Index.md"
Cohesion: 0.34
Nodes (3): Team Deathmatch Game Design Document, Wave Buffs Feature, Wave System — Волны и спавн

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
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 65 - "winConditions.ts"
Cohesion: 0.23
Nodes (8): configForMode(), MatchConfig, evaluateMatchEnd(), leadingPersonal(), PersonalStanding, teamLead(), WinEvalInput, makeHudModel()

### Community 67 - "Standard: Tank Entity & Systems"
Cohesion: 0.20
Nodes (10): 1. Entity = id + composition, 2. Flat port projections, 3.1 Hybrid mesh: процедурный код + GLB (система отключена), 3.2 Владение GPU-ресурсами (общие vs per-instance), 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose (+2 more)

### Community 68 - "RailgunWeapon.ts"
Cohesion: 0.15
Nodes (13): fillMuzzleAndAim(), applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle, railgunShouldStartCharge(), BEAM_SPARK_COLOR (+5 more)

### Community 69 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 70 - "TeamId"
Cohesion: 0.31
Nodes (10): GameOverScreen(), GameOverScreenProps, MatchEndReason, TeamId, formatKd(), formatMatchClock(), modeLabelRu(), resultsHeadline() (+2 more)

### Community 71 - "Nameplate"
Cohesion: 0.25
Nodes (3): NameplateEntry, NameplateSubject, Nameplate

### Community 72 - "TankAnimationSystem.ts"
Cohesion: 0.33
Nodes (3): animateDeath(), tintBody(), BARREL_REST_Z

### Community 73 - "tuning.ts"
Cohesion: 0.26
Nodes (9): TankCombatTimersSystem, tmpV, BOOST_JET_HEIGHT, BOOST_JET_OFFSET, DUST_HEIGHT, DUST_SPREAD, HEAL_DELAY, HEAL_PER_SEC (+1 more)

### Community 74 - "MatchRuntime.ts"
Cohesion: 0.14
Nodes (12): BotRoster, buildSimulationStages(), HudModel, BASE, DEFAULT_MATCH_MODE, MatchRuntimeHooks, MatchResult, TankMatchStats (+4 more)

### Community 76 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 82 - "aiRoles.ts"
Cohesion: 0.36
Nodes (7): aimErrorMulForRole(), AIRole, coverHpFracForRole(), personaForRole(), ROLE_LABEL, roleForBot(), roleLabel()

### Community 83 - "Standard_Tank.md"
Cohesion: 0.43
Nodes (3): Health & Regen — Прочность и саморемонт, Game Lifecycle, Tank Movement

### Community 84 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 85 - "Arena & Physics — Арена и коллизии"
Cohesion: 0.33
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

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
Cohesion: 0.08
Nodes (17): App(), GarageProps, cacheByCanvas, CanvasCache, drawMinimap(), getCache(), MAP_HALF, MAP_SIZE (+9 more)

### Community 102 - "Game.ts"
Cohesion: 0.12
Nodes (10): GameSimulation, GameContext, GameLoop, GameLoopDeps, GameModeControllerDeps, GarageBinding, GarageBindingDeps, WeaponFactoryDeps (+2 more)

### Community 117 - "catalog.ts"
Cohesion: 0.19
Nodes (15): HullCard(), HullCardProps, MainMenuProps, TurretCard(), TurretCardProps, HULL_IDS, HULLS, TURRET_IDS (+7 more)

## Knowledge Gaps
- **386 isolated node(s):** `1. Entity = id + composition`, `2. Flat port projections`, `3. Factory (единый путь сборки)`, `3.1 Hybrid mesh: процедурный код + GLB (система отключена)`, `3.2 Владение GPU-ресурсами (общие vs per-instance)` (+381 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `@types/react`, `vite`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `tailwindcss`, `typescript`, `package.json`, `@types/react-dom`, `@types/three`, `@tailwindcss/vite`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `typescript` connect `typescript` to `catalog.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `typescript` connect `typescript` to `devDependencies`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `1. Entity = id + composition`, `2. Flat port projections`, `3. Factory (единый путь сборки)` to the rest of the system?**
  _386 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `textures/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05426848619485877 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07946127946127945 - nodes in this community are weakly interconnected._
- **Should `Projectile.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12477718360071301 - nodes in this community are weakly interconnected._