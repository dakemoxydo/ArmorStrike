# Graph Report - ArmorStrike  (2026-08-23)

## Corpus Check
- 267 files · ~97,277 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1733 nodes · 4270 edges · 124 communities (79 shown, 45 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `34ca105f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- textures/index.ts
- CameraRig.ts
- GameBootstrap.ts
- HUD.tsx
- Projectile.ts
- GameSimulation
- AI.ts
- physics.ts
- Effects
- TankEntity
- GameApi
- compilerOptions
- WEAPON_TUNING
- particles.ts
- ArmorStrike — Project Rules
- Tank.ts
- Classic Match Modes — DM / TDM / Capture Point
- devDependencies
- BotAiStage.ts
- Match Framework — Режимы, roster, respawn, win
- FlamethrowerWeapon.ts
- AudioFX
- game/types.ts
- CannonWeapon
- Core Architecture — ArmorStrike
- game/constants.ts
- EffectsPort
- RailgunWeapon
- City Level Design — Grid + Districts + Overpass
- Collider
- Maps — Мульти-карты и выбор арены
- ProjectileManager
- vite
- AudioPort
- TankFactory.ts
- Game
- ParticleEffects
- Standard_Weapon.md
- captureLogic.ts
- rosterSpawn.ts
- stages/index.ts
- FlamethrowerWeapon
- WorldStages.ts
- aiFocus.ts
- dependencies
- Capture Point — Захват точки
- SimSystem
- Standard Match — каркас матча
- simPorts.ts
- scripts
- Wave System
- RespawnController.ts
- 00_Index.md
- Tank Movement — Движение корпуса
- Village Level Design — Square + Barns + Paddocks
- Tank Aim — Наведение башни
- Arena.ts
- TeamId
- ArmorStrike — Audit (ошибки и недочёты)
- PhysicsSystem.ts
- Damage System — Централизованный урон
- Core Patterns — ArmorStrike
- Standard: UI, HUD & Input
- Standard: Weapons, Projectiles & Damage
- ErrorBoundary
- Standard_Tank.md
- Arena & Physics — Арена и коллизии
- Standard: Tank Entity & Systems
- RailgunWeapon.ts
- Player Controls — Управление игроком
- aiObstacle.ts
- Nameplate
- TankAnimationSystem.ts
- tuning.ts
- PlayerController
- eslint-plugin-react-refresh
- Garage Loadout — Сборка танка
- MatchRuntime.ts
- CoreSystem
- KillStreakTracker.ts
- RingSystem
- SmokeSystem
- PlayerFactory.ts
- Weapon
- GDD — Approved Mechanics (ArmorStrike)
- @types/react
- globals
- Engage State (FSM)
- tailwindcss
- package.json
- @types/react-dom
- @types/three
- FlameParticlePool.ts
- typescript
- FlashSystem
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
- eslint-plugin-react-hooks
- HudModel
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
- `GarageProps` --references--> `GameApi`  [EXTRACTED]
  src/components/Garage.tsx → src/game/GameApi.ts
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `HudWeaponProps` --references--> `HudSnapshot`  [EXTRACTED]
  src/components/hud/HudWeapon.tsx → src/game/types.ts
- `PickAiFocusOpts` --references--> `Collider`  [EXTRACTED]
  src/game/match/aiFocus.ts → src/game/engine/physics.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (124 total, 45 thin omitted)

### Community 0 - "textures/index.ts"
Cohesion: 0.06
Nodes (90): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+82 more)

### Community 1 - "CameraRig.ts"
Cohesion: 0.09
Nodes (18): AIM_SENS_X, AIM_SENS_Y, CameraLookState, DEFAULT_CAM_PITCH, PITCH_MAX, PITCH_MIN, CameraMode, GarageCameraMode (+10 more)

### Community 2 - "GameBootstrap.ts"
Cohesion: 0.06
Nodes (30): ArenaEffects, AtmospherePreset, ATMOSPHERES, DUSK, getAtmosphere(), NIGHT, applyGameOverInputState(), applyPlayerDeathState() (+22 more)

### Community 3 - "HUD.tsx"
Cohesion: 0.07
Nodes (35): React 19, HUD(), HudCrosshair(), HudCrosshairProps, FeedEntry, HudFeed(), HudFeedProps, HudProps (+27 more)

### Community 4 - "Projectile.ts"
Cohesion: 0.09
Nodes (21): WeaponType, createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit() (+13 more)

### Community 5 - "GameSimulation"
Cohesion: 0.18
Nodes (3): TimeScale, GameSimulation, GameLoopDeps

### Community 6 - "AI.ts"
Cohesion: 0.15
Nodes (14): AIController, AIPersona, AIState, DEFAULT_PERSONA, AimFireState, aimErrorMulForRole(), AIRole, coverHpFracForRole() (+6 more)

### Community 7 - "physics.ts"
Cohesion: 0.22
Nodes (13): updateTurretAndFire(), AI_LOW_HP_FRAC, findCoverPoint(), aimTolerance(), _circleOut, clamp(), ColliderKind, ColliderOpts (+5 more)

### Community 8 - "Effects"
Cohesion: 0.05
Nodes (10): AmbientDust, CameraShake, Effects, CHAR_MAT, EMBER_GEO, HULL_GEO, TRACK_GEO, TURRET_GEO (+2 more)

### Community 9 - "TankEntity"
Cohesion: 0.07
Nodes (3): BotEntry, RosterSpawnResult, TankEntity

### Community 10 - "GameApi"
Cohesion: 0.22
Nodes (3): App(), GameApi, isInteractiveKeyboardTarget()

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, ES2020, node, src, vite/client, vite.config.ts, compilerOptions (+19 more)

### Community 12 - "WEAPON_TUNING"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 13 - "particles.ts"
Cohesion: 0.10
Nodes (9): CoreAnim, FlashLight, MuzzleSystem, ParticleSystem, RingAnim, ScorchMark, SmokePuff, SparkPool (+1 more)

### Community 14 - "ArmorStrike — Project Rules"
Cohesion: 0.15
Nodes (12): 1. GDD Lifecycle, 2. Architecture (Auto-Extraction), 3. Graphify, 4. Hotfix, 5. Working Style, 6. Stack, ArmorStrike — Project Rules, Phase A → B: Approval Signal (+4 more)

### Community 15 - "Tank.ts"
Cohesion: 0.18
Nodes (9): BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState, BuffableTank, TankFxState, TankVisual (+1 more)

### Community 16 - "Classic Match Modes — DM / TDM / Capture Point"
Cohesion: 0.08
Nodes (25): 1. Intent, 2.1 Deathmatch (DM) — «Бой насмерть», 2.2 Team Deathmatch (TDM) — «Командный бой», 2.3 Capture Point (CP) — «Захват точки», 2. Режимы (предложение игрока + уточнения GD), 3.1 Новые понятия, 3.2 Что появляется у каждого танка, 3.3 Respawn (общий) (+17 more)

### Community 17 - "devDependencies"
Cohesion: 0.13
Nodes (15): eslint, @eslint/js, devDependencies, eslint, @eslint/js, @types/node, typescript-eslint, vite-plugin-singlefile (+7 more)

### Community 18 - "BotAiStage.ts"
Cohesion: 0.22
Nodes (10): AITarget, BotAiStage, deadStub(), syncZoneViews(), moveHintForZone(), ObjectiveZoneView, pickObjectiveZone(), shouldFightNearObjective() (+2 more)

### Community 19 - "Match Framework — Режимы, roster, respawn, win"
Cohesion: 0.17
Nodes (12): AI focus (P2), Capture (P4), Classes, Kill credit, Match Framework — Режимы, roster, respawn, win, Respawn, Results UI (P6), Spawn tables (+4 more)

### Community 20 - "FlamethrowerWeapon.ts"
Cohesion: 0.22
Nodes (6): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, resolveWeaponDamage()

### Community 22 - "game/types.ts"
Cohesion: 0.10
Nodes (27): BootError(), BootErrorProps, ICONS, MapSelect(), MapSelectProps, ModeOption, MODES, ModeSelect() (+19 more)

### Community 23 - "CannonWeapon"
Cohesion: 0.20
Nodes (5): CannonWeapon, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 24 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Match modes (not app modes), Bootstrap composition (+12 more)

### Community 25 - "game/constants.ts"
Cohesion: 0.36
Nodes (5): PROJECTILE, SCORE, TANK, applyPlayerKillScore(), KillScoreState

### Community 26 - "EffectsPort"
Cohesion: 0.08
Nodes (4): rearPoint(), AmbientStage, BoostStage, EffectsPort

### Community 27 - "RailgunWeapon"
Cohesion: 0.20
Nodes (3): railgunShouldStartCharge(), RailgunWeapon, ownerReloadMul()

### Community 28 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

### Community 29 - "Collider"
Cohesion: 0.20
Nodes (7): Collider, segmentHitT(), _wctx, WeaponHost, nearestShotBlockerDist(), ShotBlockerHit, CombatPeer

### Community 30 - "Maps — Мульти-карты и выбор арены"
Cohesion: 0.25
Nodes (8): Known gaps / balance notes, Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Размер арены (глобальный), Структура сборки

### Community 31 - "ProjectileManager"
Cohesion: 0.18
Nodes (6): CombatDeps, CombatSystem, despawn(), ProjectileManager, StageDeps, ProjectileStage

### Community 34 - "TankFactory.ts"
Cohesion: 0.08
Nodes (26): TankStyle, disposeObject3D(), isShared(), markShared(), Shared, unmarkShared(), AssetManager, cloneWithOwnMaterials() (+18 more)

### Community 37 - "Standard_Weapon.md"
Cohesion: 0.23
Nodes (11): Arena Physics, Damage System, Projectile System — Пул снарядов, Weapon Cannon «Смоки», Weapon Flamethrower Firebird, Railgun Weapon (Рельсотрон), Match Framework, PROJECTILE Constants (speed=58, range=85, radius=0.18) (+3 more)

### Community 38 - "captureLogic.ts"
Cohesion: 0.12
Nodes (20): COLORS, CAPTURE_ANCHORS, CaptureAnchor, zonesForMap(), CaptureController, CAPTURE, CaptureOwner, CapturePointId (+12 more)

### Community 39 - "rosterSpawn.ts"
Cohesion: 0.25
Nodes (15): buildBotStyle(), isObjectiveDuty(), applyTeamRing(), botStyleColor(), makeBot(), placeTank(), spawnMatchRoster(), ALPHA_SPAWN_POINTS (+7 more)

### Community 40 - "stages/index.ts"
Cohesion: 0.20
Nodes (7): buildSimulationStages(), PlayerInputStage, FrameContext, NameplateMap, ScalarCell, MatchStage, ControllableTank

### Community 41 - "FlamethrowerWeapon"
Cohesion: 0.14
Nodes (5): AICtx, FlamethrowerWeapon, buildAmmoState(), WeaponContext, srcRoot

### Community 42 - "WorldStages.ts"
Cohesion: 0.14
Nodes (10): _bd, _bv, MinimapStage, NameplateSystemStage, PhysicsSystemStage, MinimapSystem, NameplateEntry, NameplateSubject (+2 more)

### Community 43 - "aiFocus.ts"
Cohesion: 0.19
Nodes (12): allyLineBlockers(), FocusCandidate, FocusSelf, isLineBlocker(), pickAiFocus(), PickAiFocusOpts, PickAiFocusResult, isAlly() (+4 more)

### Community 44 - "dependencies"
Cohesion: 0.22
Nodes (9): lucide-react, dependencies, lucide-react, react, react-dom, three, react, react-dom (+1 more)

### Community 45 - "Capture Point — Захват точки"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

### Community 46 - "SimSystem"
Cohesion: 0.21
Nodes (9): TankAnimationSystemStage, TankFxSystemStage, TankSystemStage, WeaponSystemStage, SimSystem, TankAnimationSystem, TankFxSystem, TankSystem (+1 more)

### Community 47 - "Standard Match — каркас матча"
Cohesion: 0.17
Nodes (12): 10. CP objective AI (P5), 11. Results & balance (P6), 1. App GameMode ≠ MatchModeId, 2. Pure helpers + thin runtime, 3. Damage gates (central), 4. Kill credit path, 5. Lifecycle, 6. Roster (+4 more)

### Community 48 - "simPorts.ts"
Cohesion: 0.23
Nodes (12): TankAimSystem, TankCombatTimersSystem, TankPresentationSystem, LiveTank, AimBody, CombatTimerBody, FxBody, MotionBody (+4 more)

### Community 49 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 51 - "RespawnController.ts"
Cohesion: 0.24
Nodes (9): applyRespawnCombat(), canRespawn(), Respawnable, FFA_FALLBACK, RespawnController, RespawnHooks, restoreDeathVisuals(), respawnPoolFor() (+1 more)

### Community 52 - "00_Index.md"
Cohesion: 0.34
Nodes (3): Team Deathmatch Game Design Document, Wave Buffs Feature, Wave System — Волны и спавн

### Community 53 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 54 - "Village Level Design — Square + Barns + Paddocks"
Cohesion: 0.18
Nodes (11): Animated nodes (ArenaEffects), Code map, Cover hierarchy, Implemented layout (code), Layout graph (world, arena half = 150), Per-map atmosphere (RenderWorld), Shared scale (arena 300), Success criteria (+3 more)

### Community 55 - "Tank Aim — Наведение башни"
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 56 - "Arena.ts"
Cohesion: 0.26
Nodes (3): Arena, disposeArenaSubtree(), invalidateSolidColliderCache()

### Community 57 - "TeamId"
Cohesion: 0.27
Nodes (11): GameOverScreen(), GameOverScreenProps, MatchEndReason, TankMatchStats, TeamId, formatKd(), formatMatchClock(), modeLabelRu() (+3 more)

### Community 58 - "ArmorStrike — Audit (ошибки и недочёты)"
Cohesion: 0.14
Nodes (13): 1. Базлайн верификации, 2. Ошибки, 3. Недочёты (гигиена), 4. Проверено — НЕ проблемы (чтобы не переисследовать), 5. Рекомендованный порядок работ, 6. Итог работ (2026-08-23) — исправлены все пункты (детали в таблице; H-3/H-4 — с оговорками), 7. Второй перф-проход (2026-08-23, вечер) — остаточные аллокации кадра, ArmorStrike — Audit (ошибки и недочёты) (+5 more)

### Community 59 - "PhysicsSystem.ts"
Cohesion: 0.24
Nodes (8): _solid, solidColliders(), _pa, _pb, resolveWalls(), separateTankPair(), TankXZ, PhysicsBody

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

### Community 65 - "Standard_Tank.md"
Cohesion: 0.43
Nodes (3): Health & Regen — Прочность и саморемонт, Game Lifecycle, Tank Movement

### Community 66 - "Arena & Physics — Арена и коллизии"
Cohesion: 0.33
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

### Community 67 - "Standard: Tank Entity & Systems"
Cohesion: 0.20
Nodes (10): 1. Entity = id + composition, 2. Flat port projections, 3.1 Hybrid mesh: процедурный код + GLB (система отключена), 3.2 Владение GPU-ресурсами (общие vs per-instance), 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose (+2 more)

### Community 68 - "RailgunWeapon.ts"
Cohesion: 0.19
Nodes (11): BARREL_REST_Y, applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle, BEAM_SPARK_COLOR, RailgunState (+3 more)

### Community 69 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 70 - "aiObstacle.ts"
Cohesion: 0.53
Nodes (5): AIBody, AvoidState, computeObstacleAvoidance(), dirFree(), pointInCollider()

### Community 72 - "TankAnimationSystem.ts"
Cohesion: 0.32
Nodes (4): animateDeath(), tintBody(), AnimBody, BARREL_REST_Z

### Community 73 - "tuning.ts"
Cohesion: 0.18
Nodes (10): BOOST, tmpV, TankMotionSystem, BOOST_JET_HEIGHT, BOOST_JET_OFFSET, DUST_HEIGHT, DUST_SPREAD, KNOCKBACK_DECAY (+2 more)

### Community 76 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 77 - "MatchRuntime.ts"
Cohesion: 0.11
Nodes (16): BotRoster, BASE, BOT_NORMAL, configForMode(), DEFAULT_MATCH_MODE, MatchRuntime, MatchRuntimeHooks, MatchConfig (+8 more)

### Community 79 - "KillStreakTracker.ts"
Cohesion: 0.33
Nodes (3): KillStreakTracker, STREAK_LABELS, StreakLabel

### Community 82 - "PlayerFactory.ts"
Cohesion: 0.21
Nodes (8): tmpDir, tmpMuzzle, fillMuzzleAndAim(), WeaponAmmoState, WeaponDeps, WeaponOwner, WeaponOwnerParams, WeaponOwnerVisual

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

### Community 100 - "HudModel"
Cohesion: 0.11
Nodes (15): HudRadar(), HudRadarProps, cacheByCanvas, CanvasCache, drawMinimap(), getCache(), MAP_HALF, MAP_SIZE (+7 more)

### Community 117 - "catalog.ts"
Cohesion: 0.10
Nodes (26): Garage(), GarageProps, HullCard(), HullCardProps, MainMenu(), MainMenuProps, TurretCard(), TurretCardProps (+18 more)

## Knowledge Gaps
- **392 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+387 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `typescript` to `catalog.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `vite`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@types/react`, `globals`, `tailwindcss`, `typescript`, `package.json`, `@types/react-dom`, `@types/three`, `@tailwindcss/vite`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `typescript` connect `typescript` to `devDependencies`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _392 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `textures/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05862403100775194 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08979591836734693 - nodes in this community are weakly interconnected._
- **Should `GameBootstrap.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05924978687127025 - nodes in this community are weakly interconnected._