# Graph Report - ArmorStrike  (2026-07-20)

## Corpus Check
- 251 files · ~87,147 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1611 nodes · 3866 edges · 108 communities (73 shown, 35 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a751231d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- physics.ts
- Projectile.ts
- HUD.tsx
- Game
- botSpawn.ts
- CameraRig.ts
- GameSimulation.ts
- TankEntity
- compilerOptions
- devDependencies
- GameApi
- Game.ts
- AudioFX
- simPorts.ts
- GameBootstrap.ts
- CannonWeapon
- Core Architecture — ArmorStrike
- Effects
- PlayerFactory.ts
- Core Patterns — ArmorStrike
- clamp
- AudioPort
- Tank.ts
- types.ts
- Standard: UI, HUD & Input
- catalog.ts
- stages.ts
- ArmorStrike Project
- Standard: Weapons, Projectiles & Damage
- EffectsPort
- RailgunWeapon
- buildMesh.ts
- ParticleEffects
- Standard: Tank Entity & Systems
- Weapon
- dependencies
- 00_Index.md
- Village Level Design — Square + Barns + Paddocks
- Nameplate
- package.json
- FlamethrowerWeapon.ts
- Tank Movement — Движение корпуса
- minimapDraw.ts
- Damage System — Централизованный урон
- SparkPool
- waveBuffs.ts
- City Level Design — Grid + Districts + Overpass
- ErrorBoundary
- MapId
- constants.ts
- disposeObject3D
- Projectile System — Пул снарядов
- stages.ts
- Weapon: Cannon «Смоки»
- TankAnimationSystem
- GameModeController
- Docs/GDD/Approved/ Directory
- Arena_Physics.md
- Garage Loadout — Сборка танка
- Maps — Мульти-карты и выбор арены
- Tank Aim — Наведение башни
- CoreSystem
- FlashSystem
- RingSystem
- SmokeSystem
- Health & Regen System
- GDD — Approved Mechanics (ArmorStrike)
- GameApi
- Engage State (FSM)
- opencode.json
- MatchRuntime.ts
- graphify.js
- Wave System — Волны и спавн
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
- MatchModeId
- eslint-plugin-react-hooks
- app.json
- vitest
- Assault Role
- AI Bots — Поведение противников (Документ)
- Elite Role
- Damage System
- GameMode Type
- Wave System
- GDD Drafts README (Workflow Guide)
- CI Workflow Configuration
- ArmorStrike — 3D Бронетанковый Штурм (HTML)
- MapSelect Overlay
- Auto-pause Policy Function
- Sniper Role
- botStatsForWave
- Standard Role
- Tank Aim System
- Wave Buffs System
- SimSystem
- Nameplate
- PauseMenu.tsx
- Wave Buffs — УДАЛЕНЫ (P0)
- QualityLevel
- Team Deathmatch — Командный бой
- aiFocus.test.ts
- teams.ts
- TankAnimationSystem

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
- **System layer cross-references (Simulation layer)** — docs_gdd_approved_projectile_system, weapon_cannon, damage_system, arena_physics [EXTRACTED 0.85]
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (108 total, 35 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.05
Nodes (95): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+87 more)

### Community 1 - "physics.ts"
Cohesion: 0.21
Nodes (16): WeaponType, AIBody, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA, AimFireState (+8 more)

### Community 2 - "Projectile.ts"
Cohesion: 0.18
Nodes (10): tmpDir, tmpMuzzle, fillMuzzleAndAim(), tmpDir, tmpMuzzle, buildAmmoState(), WeaponAmmoState, WeaponOwner (+2 more)

### Community 3 - "HUD.tsx"
Cohesion: 0.07
Nodes (30): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps, byTeam(), FlatTable() (+22 more)

### Community 4 - "Game"
Cohesion: 0.31
Nodes (6): BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState, BuffableTank

### Community 5 - "botSpawn.ts"
Cohesion: 0.21
Nodes (11): findCoverPoint(), AvoidState, computeObstacleAvoidance(), dirFree(), _circleOut, ColliderKind, ColliderOpts, losClear() (+3 more)

### Community 6 - "CameraRig.ts"
Cohesion: 0.09
Nodes (17): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+9 more)

### Community 7 - "GameSimulation.ts"
Cohesion: 0.16
Nodes (6): CannonWeapon, WeaponDeps, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 8 - "TankEntity"
Cohesion: 0.07
Nodes (3): BotEntry, RosterSpawnResult, TankEntity

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 10 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, @eslint/js, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js, eslint-plugin-react-refresh (+17 more)

### Community 11 - "GameApi"
Cohesion: 0.14
Nodes (11): GarageProps, HullCard(), HullCardProps, TurretCard(), TurretCardProps, HullId, TurretId, getWeaponMeta() (+3 more)

### Community 14 - "simPorts.ts"
Cohesion: 0.19
Nodes (14): TankAimSystem, TankCombatTimersSystem, tmpV, TankMotionSystem, TankPresentationSystem, LiveTank, AimBody, AnimBody (+6 more)

### Community 15 - "GameBootstrap.ts"
Cohesion: 0.26
Nodes (11): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+3 more)

### Community 16 - "CannonWeapon"
Cohesion: 0.19
Nodes (9): GameSimulation, ScalarCell, SimContext, GameContext, GameLoop, GameLoopDeps, GarageBindingDeps, GameEvent (+1 more)

### Community 17 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Deterministic wave preview, Bootstrap composition (+12 more)

### Community 18 - "Effects"
Cohesion: 0.07
Nodes (3): AmbientDust, CameraShake, Effects

### Community 20 - "Core Patterns — ArmorStrike"
Cohesion: 0.22
Nodes (9): 1. Layering (жёсткое правило), 2. Bootstrap composition, 3. Simulation pipeline (ordered stages), 4. Port pattern (I/O isolation), 5. Event bus → React, 6. Run state & persistence, 7. Testing expectations, 8. Non-goals (текущий билд) (+1 more)

### Community 21 - "clamp"
Cohesion: 0.13
Nodes (8): CoreAnim, FlashLight, MuzzleSystem, ParticleSystem, RingAnim, ScorchMark, ScorchSystem, SmokePuff

### Community 22 - "AudioPort"
Cohesion: 0.07
Nodes (47): MainMenuProps, HULL_IDS, HULLS, TURRET_IDS, TURRETS, WEAPON_TUNING, HullDef, TurretDef (+39 more)

### Community 23 - "Tank.ts"
Cohesion: 0.29
Nodes (5): aiFocusForBot(), deadStub(), allyLineBlockers(), pickAiFocus(), emptyColliders

### Community 24 - "types.ts"
Cohesion: 0.21
Nodes (9): solidColliders(), PhysicsSystemStage, _pa, _pb, PhysicsSystem, resolveWalls(), separateTankPair(), TankXZ (+1 more)

### Community 25 - "Standard: UI, HUD & Input"
Cohesion: 0.22
Nodes (9): 1. React ↛ Simulation, 2. Two channels: events + HUD snapshot, 3. Component layout, 4. Player input (combat), 5. Garage input (отдельный класс), 6. Camera modes (strategy), 7. Focus & a11y helpers, 8. Checklist нового UI (+1 more)

### Community 27 - "stages.ts"
Cohesion: 0.43
Nodes (3): TankParams, TankVisual, PARAMS

### Community 28 - "ArmorStrike Project"
Cohesion: 0.12
Nodes (16): Architecture Standards (Docs/Architecture/), ArmorStrike Project, Loadout Data (localStorage), Graphics Quality Preset (localStorage), Docs Directory, Graphify Extraction Command, tailwindcss, typescript (+8 more)

### Community 29 - "Standard: Weapons, Projectiles & Damage"
Cohesion: 0.22
Nodes (9): 1. Weapon strategy (единый интерфейс), 2. Owner & context ports, 3. Fire pipeline (кадр), 4. Projectiles, 5. Shared hit helpers, 6. DamageSystem split, 7. Catalog boundary, 8. Checklist нового оружия (+1 more)

### Community 30 - "EffectsPort"
Cohesion: 0.08
Nodes (25): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, CombatDeps, CombatSystem, PROJECTILE (+17 more)

### Community 31 - "RailgunWeapon"
Cohesion: 0.14
Nodes (5): applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), RailgunWeapon, ownerReloadMul(), CombatPeer

### Community 32 - "buildMesh.ts"
Cohesion: 0.05
Nodes (29): ICONS, MapSelect(), MapSelectProps, PauseMenu(), PauseMenuProps, AtmospherePreset, ATMOSPHERES, DUSK (+21 more)

### Community 34 - "Standard: Tank Entity & Systems"
Cohesion: 0.25
Nodes (8): 1. Entity = id + composition, 2. Flat port projections, 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose, 7. Checklist нового tank-related кода, Standard: Tank Entity & Systems

### Community 35 - "Weapon"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 36 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 37 - "00_Index.md"
Cohesion: 0.25
Nodes (8): Weapon: Cannon «Смоки», Выстрел, Классы, Скорость снаряда, Состояния магазина, Тюнинг (`WEAPON_TUNING.cannon`), Урон на попадании, Фэнтези

### Community 38 - "Village Level Design — Square + Barns + Paddocks"
Cohesion: 0.18
Nodes (11): Animated nodes (ArenaEffects), Code map, Cover hierarchy, Implemented layout (code), Layout graph (world, arena half = 150), Per-map atmosphere (RenderWorld), Shared scale (arena 300), Success criteria (+3 more)

### Community 39 - "Nameplate"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 41 - "package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, lint, preview, test (+3 more)

### Community 43 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 44 - "minimapDraw.ts"
Cohesion: 0.25
Nodes (8): Weapon: Flamethrower «Firebird», Визуал, Геометрия поражения, Классы, Состояния, Тюнинг (`WEAPON_TUNING.flamethrower`), Фэнтези, Энергия

### Community 45 - "Damage System — Централизованный урон"
Cohesion: 0.20
Nodes (10): applyDamage, applyHit / applySplashHit, applyKnockback, CombatSystem hooks, Damage System — Централизованный урон, damageBlock, Splash falloff (пушка), Классы (+2 more)

### Community 48 - "waveBuffs.ts"
Cohesion: 0.09
Nodes (4): BotRoster, PlayerController, RunState, ControllableTank

### Community 49 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

### Community 50 - "ErrorBoundary"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 51 - "MapId"
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 52 - "constants.ts"
Cohesion: 0.08
Nodes (25): 1. Intent, 2.1 Deathmatch (DM) — «Бой насмерть», 2.2 Team Deathmatch (TDM) — «Командный бой», 2.3 Capture Point (CP) — «Захват точки», 2. Режимы (предложение игрока + уточнения GD), 3.1 Новые понятия, 3.2 Что появляется у каждого танка, 3.3 Respawn (общий) (+17 more)

### Community 53 - "disposeObject3D"
Cohesion: 0.24
Nodes (7): RailgunFireState, railgunShouldStartCharge(), BEAM_SPARK_COLOR, RailgunState, tmpDir, tmpMuzzle, tmpSpark

### Community 54 - "Projectile System — Пул снарядов"
Cohesion: 0.40
Nodes (5): Arena Physics, Damage System, Projectile System — Пул снарядов, PROJECTILE Constants (speed=58, range=85, radius=0.18), Weapon Cannon

### Community 55 - "stages.ts"
Cohesion: 0.09
Nodes (20): rearPoint(), _aiSticky, _bd, BoostFxCtx, BoostStage, BotAiCtx, buildSimulationStages(), _bv (+12 more)

### Community 56 - "Weapon: Cannon «Смоки»"
Cohesion: 0.17
Nodes (12): AI focus (P2), Capture (P4), Classes, Kill credit, Match Framework — Режимы, roster, respawn, win, Respawn, Results UI (P6), Spawn tables (+4 more)

### Community 57 - "TankAnimationSystem"
Cohesion: 0.33
Nodes (6): BOOST, botAiForWave(), SCORE, TANK, applyPlayerKillScore(), KillScoreState

### Community 59 - "GameModeController"
Cohesion: 0.17
Nodes (12): 10. CP objective AI (P5), 11. Results & balance (P6), 1. App GameMode ≠ MatchModeId, 2. Pure helpers + thin runtime, 3. Damage gates (central), 4. Kill credit path, 5. Lifecycle, 6. Roster (+4 more)

### Community 60 - "Docs/GDD/Approved/ Directory"
Cohesion: 0.40
Nodes (6): Docs/GDD/Approved/ Directory, Auto-Documentation Phase (Phase C), Brainstorming Phase (Phase A), Docs/GDD/Drafts/ Directory, Implementation Phase (Phase B), Obsidian Game Design Documents

### Community 61 - "Arena_Physics.md"
Cohesion: 0.27
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

### Community 62 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 63 - "Maps — Мульти-карты и выбор арены"
Cohesion: 0.25
Nodes (8): Known gaps / balance notes, Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Размер арены (глобальный), Структура сборки

### Community 64 - "Tank Aim — Наведение башни"
Cohesion: 0.18
Nodes (4): BotSpawnDeps, _wctx, WeaponHost, Weapon

### Community 69 - "Health & Regen System"
Cohesion: 0.67
Nodes (3): Health & Regen System, Game Lifecycle, Tank Movement System

### Community 71 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 74 - "GameApi"
Cohesion: 0.14
Nodes (12): cacheByCanvas, CanvasCache, drawMinimap(), getCache(), paintStatics(), staticLayerKey(), WeaponId, WeaponMeta (+4 more)

### Community 75 - "Engage State (FSM)"
Cohesion: 0.50
Nodes (4): aiCover Module (findCoverPoint), aiTuning Module (preferredRange, aimTolerance, steering), Engage State (FSM), losClear Module (line of sight через colliders)

### Community 76 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 77 - "MatchRuntime.ts"
Cohesion: 0.05
Nodes (54): GameOverScreen(), GameOverScreenProps, FocusCandidate, FocusSelf, PickAiFocusOpts, PickAiFocusResult, CAPTURE_ANCHORS, CaptureAnchor (+46 more)

### Community 82 - "MatchModeId"
Cohesion: 0.23
Nodes (6): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, resolveWeaponDamage()

### Community 107 - "SimSystem"
Cohesion: 0.21
Nodes (6): AmbientStage, EngineAudioStage, MatchStage, PlayerInputStage, ProjectileStage, SimSystem

### Community 108 - "Nameplate"
Cohesion: 0.19
Nodes (5): NameplateSystemStage, NameplateEntry, NameplateSubject, NameplateSystem, Nameplate

### Community 109 - "PauseMenu.tsx"
Cohesion: 0.07
Nodes (12): App(), BootErrorProps, ModeOption, MODES, ModeSelect(), ModeSelectProps, Game, GameModeController (+4 more)

### Community 110 - "Wave Buffs — УДАЛЕНЫ (P0)"
Cohesion: 0.50
Nodes (4): Wave Buffs — УДАЛЕНЫ (P0), Дальше, Что было, Что удалено

### Community 111 - "QualityLevel"
Cohesion: 0.15
Nodes (5): Arena, captureHudPoints(), HudModel, HudUnit, MinimapStatic

### Community 112 - "Team Deathmatch — Командный бой"
Cohesion: 0.29
Nodes (7): Acceptance (P3), AI, Classes, Kill credit, Team Deathmatch — Командный бой, UI, Правила (as shipped)

### Community 113 - "aiFocus.test.ts"
Cohesion: 0.27
Nodes (9): BotAiStage, zonesAsView(), isObjectiveDuty(), moveHintForZone(), ObjectiveZoneView, pickObjectiveZone(), shouldFightNearObjective(), zonePriority() (+1 more)

### Community 115 - "teams.ts"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

## Knowledge Gaps
- **391 isolated node(s):** `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js`, `name`, `private` (+386 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `TankEntity` to `Tank Aim — Наведение башни`, `index.ts`, `Projectile.ts`, `Game`, `GameSimulation.ts`, `GameApi`, `Game.ts`, `MatchRuntime.ts`, `simPorts.ts`, `CannonWeapon`, `AudioPort`, `stages.ts`, `stages.ts`, `EffectsPort`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `typescript` connect `ArmorStrike Project` to `AudioPort`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`, `eslint-plugin-react-hooks`, `ArmorStrike Project`, `vitest`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js` to the rest of the system?**
  _391 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05309017223910841 - nodes in this community are weakly interconnected._
- **Should `HUD.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06533776301218161 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08549019607843138 - nodes in this community are weakly interconnected._