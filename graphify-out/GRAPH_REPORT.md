# Graph Report - .  (2026-07-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1416 nodes · 3398 edges · 101 communities (65 shown, 36 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `99460462`
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
- Village Level Design — Square + Barns + Paddocks
- Nameplate
- WEAPON_TUNING
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
- Player Controls — Управление игроком
- Weapon: Cannon «Смоки»
- Weapon: Flamethrower «Firebird»
- GameLoop
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
- Wave Buffs — Баффы между волнами
- MuzzleSystem
- ScorchSystem
- Engage State (FSM)
- opencode.json
- RailgunWeapon.ts
- graphify.js
- Wave System — Волны и спавн
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
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

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 56 edges
2. `AudioPort` - 38 edges
3. `EffectsPort` - 38 edges
4. `GameApi` - 32 edges
5. `TurretId` - 31 edges
6. `HullId` - 30 edges
7. `CameraRig` - 30 edges
8. `Game` - 30 edges
9. `Collider` - 29 edges
10. `ArenaBuildContext` - 26 edges

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

## Communities (101 total, 36 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.06
Nodes (82): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+74 more)

### Community 1 - "physics.ts"
Cohesion: 0.06
Nodes (47): AIBody, AIController, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA, AimFireState (+39 more)

### Community 2 - "Projectile.ts"
Cohesion: 0.09
Nodes (22): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit(), HitEffect (+14 more)

### Community 3 - "HUD.tsx"
Cohesion: 0.09
Nodes (24): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudScoreboard(), HudScoreboardProps, HudVitals() (+16 more)

### Community 4 - "Game"
Cohesion: 0.14
Nodes (3): HudWeaponProps, Game, HudSnapshot

### Community 5 - "botSpawn.ts"
Cohesion: 0.25
Nodes (10): COLORS, buildBotStyle(), roleForBot(), roleLabel(), BotSpawnDeps, pickSpawnIndex(), SPAWN_POINTS, spawnBot() (+2 more)

### Community 6 - "CameraRig.ts"
Cohesion: 0.10
Nodes (13): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+5 more)

### Community 7 - "GameSimulation.ts"
Cohesion: 0.11
Nodes (9): Arena, CombatDeps, CombatSystem, buildSimulationStages(), DeathTimerStage, ScalarCell, SimContext, HudModel (+1 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 10 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, @eslint/js, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js, eslint-plugin-react-refresh (+17 more)

### Community 11 - "GameApi"
Cohesion: 0.11
Nodes (15): GarageProps, HullCard(), HullCardProps, TurretCard(), TurretCardProps, WaveIntermissionProps, HullId, TurretId (+7 more)

### Community 12 - "Game.ts"
Cohesion: 0.19
Nodes (11): buildPlayerStyle(), GameSimulation, GameContext, GameLoopDeps, GameModeControllerDeps, GarageBinding, GarageBindingDeps, WeaponFactoryDeps (+3 more)

### Community 14 - "simPorts.ts"
Cohesion: 0.19
Nodes (14): TankAimSystem, TankCombatTimersSystem, tmpV, TankMotionSystem, TankPresentationSystem, LiveTank, AimBody, AnimBody (+6 more)

### Community 15 - "GameBootstrap.ts"
Cohesion: 0.07
Nodes (25): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+17 more)

### Community 16 - "CannonWeapon"
Cohesion: 0.20
Nodes (5): CannonWeapon, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 17 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Deterministic wave preview, Bootstrap composition (+12 more)

### Community 18 - "Effects"
Cohesion: 0.07
Nodes (3): AmbientDust, CameraShake, Effects

### Community 19 - "PlayerFactory.ts"
Cohesion: 0.18
Nodes (10): tmpDir, tmpMuzzle, fillMuzzleAndAim(), tmpDir, tmpMuzzle, WeaponAmmoState, WeaponDeps, WeaponOwner (+2 more)

### Community 20 - "Core Patterns — ArmorStrike"
Cohesion: 0.22
Nodes (9): 1. Layering (жёсткое правило), 2. Bootstrap composition, 3. Simulation pipeline (ordered stages), 4. Port pattern (I/O isolation), 5. Event bus → React, 6. Run state & persistence, 7. Testing expectations, 8. Non-goals (текущий билд) (+1 more)

### Community 21 - "clamp"
Cohesion: 0.21
Nodes (7): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark, SmokePuff, clamp()

### Community 23 - "Tank.ts"
Cohesion: 0.24
Nodes (7): BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState, TankFxState, PARAMS

### Community 24 - "types.ts"
Cohesion: 0.12
Nodes (16): App(), BootErrorProps, GameOverScreen(), GameOverScreenProps, PauseMenu(), PauseMenuProps, BUFF_ICON, IntermissionPayload (+8 more)

### Community 25 - "Standard: UI, HUD & Input"
Cohesion: 0.22
Nodes (9): 1. React ↛ Simulation, 2. Two channels: events + HUD snapshot, 3. Component layout, 4. Player input (combat), 5. Garage input (отдельный класс), 6. Camera modes (strategy), 7. Focus & a11y helpers, 8. Checklist нового UI (+1 more)

### Community 26 - "catalog.ts"
Cohesion: 0.19
Nodes (11): MainMenuProps, HULL_IDS, HULLS, TURRET_IDS, TURRETS, HullDef, TurretDef, WeaponType (+3 more)

### Community 27 - "stages.ts"
Cohesion: 0.07
Nodes (30): rearPoint(), AmbientStage, _bd, BoostFxCtx, BoostStage, BotAiCtx, BotAiStage, _bv (+22 more)

### Community 28 - "ArmorStrike Project"
Cohesion: 0.12
Nodes (16): Architecture Standards (Docs/Architecture/), ArmorStrike Project, Loadout Data (localStorage), Graphics Quality Preset (localStorage), Docs Directory, Graphify Extraction Command, tailwindcss, typescript (+8 more)

### Community 29 - "Standard: Weapons, Projectiles & Damage"
Cohesion: 0.22
Nodes (9): 1. Weapon strategy (единый интерфейс), 2. Owner & context ports, 3. Fire pipeline (кадр), 4. Projectiles, 5. Shared hit helpers, 6. DamageSystem split, 7. Catalog boundary, 8. Checklist нового оружия (+1 more)

### Community 30 - "EffectsPort"
Cohesion: 0.10
Nodes (3): EffectsPort, applyRailgunChargingFx(), applyRailgunCooldownChargeFx()

### Community 31 - "RailgunWeapon"
Cohesion: 0.16
Nodes (4): applyRailgunIdleChargeFx(), RailgunWeapon, ownerReloadMul(), CombatPeer

### Community 32 - "buildMesh.ts"
Cohesion: 0.53
Nodes (5): TankStyle, buildTankMesh(), TankBuildContext, buildHull(), buildTurret()

### Community 34 - "Standard: Tank Entity & Systems"
Cohesion: 0.25
Nodes (8): 1. Entity = id + composition, 2. Flat port projections, 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose, 7. Checklist нового tank-related кода, Standard: Tank Entity & Systems

### Community 35 - "Weapon"
Cohesion: 0.11
Nodes (5): _wctx, WeaponHost, FlamethrowerWeapon, Weapon, WeaponContext

### Community 36 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 38 - "Village Level Design — Square + Barns + Paddocks"
Cohesion: 0.25
Nodes (8): Code map, Cover hierarchy, Implemented layout (code), Layout graph (world, arena half = 150), Shared scale (arena 300), Success criteria, Village Level Design — Square + Barns + Paddocks, Vision

### Community 39 - "Nameplate"
Cohesion: 0.18
Nodes (5): BotEntry, disposeBots(), Nameplate, WaveContext, WaveManager

### Community 40 - "WEAPON_TUNING"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 41 - "package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, lint, preview, test (+3 more)

### Community 42 - "FlamethrowerWeapon.ts"
Cohesion: 0.11
Nodes (12): inFlameConeXZ(), FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec, tmpDir (+4 more)

### Community 43 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 44 - "minimapDraw.ts"
Cohesion: 0.13
Nodes (10): HudRadarProps, cacheByCanvas, CanvasCache, drawMinimap(), getCache(), paintStatics(), staticLayerKey(), HudUnit (+2 more)

### Community 45 - "Damage System — Централизованный урон"
Cohesion: 0.20
Nodes (10): applyDamage, applyHit / applySplashHit, applyKnockback, CombatSystem hooks, Damage System — Централизованный урон, damageBlock, Splash falloff (пушка), Классы (+2 more)

### Community 48 - "waveBuffs.ts"
Cohesion: 0.60
Nodes (3): BuffableTank, applyWaveBuff(), clearWaveBuff()

### Community 49 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

### Community 50 - "ErrorBoundary"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 51 - "MapId"
Cohesion: 0.20
Nodes (9): ICONS, MapSelect(), MapSelectProps, isMapId(), MAP_IDS, MapDef, MapId, MAPS (+1 more)

### Community 52 - "constants.ts"
Cohesion: 0.24
Nodes (9): BOOST, botAiForWave(), botsForWave(), SCORE, TANK, applyPlayerKillScore(), KillScoreState, previewWaveComposition() (+1 more)

### Community 54 - "Projectile System — Пул снарядов"
Cohesion: 0.40
Nodes (5): Arena Physics, Damage System, Projectile System — Пул снарядов, PROJECTILE Constants (speed=58, range=85, radius=0.18), Weapon Cannon

### Community 55 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 56 - "Weapon: Cannon «Смоки»"
Cohesion: 0.25
Nodes (8): Weapon: Cannon «Смоки», Выстрел, Классы, Скорость снаряда, Состояния магазина, Тюнинг (`WEAPON_TUNING.cannon`), Урон на попадании, Фэнтези

### Community 57 - "Weapon: Flamethrower «Firebird»"
Cohesion: 0.25
Nodes (8): Weapon: Flamethrower «Firebird», Визуал, Геометрия поражения, Классы, Состояния, Тюнинг (`WEAPON_TUNING.flamethrower`), Фэнтези, Энергия

### Community 58 - "GameLoop"
Cohesion: 0.25
Nodes (3): TankAnimationSystemStage, TankAnimationSystem, GameLoop

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
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 69 - "Health & Regen System"
Cohesion: 0.67
Nodes (3): Health & Regen System, Game Lifecycle, Tank Movement System

### Community 71 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 72 - "Wave Buffs — Баффы между волнами"
Cohesion: 0.40
Nodes (5): Wave Buffs — Баффы между волнами, Классы, Когда, Опции (`WAVE_BUFF_OPTIONS`), Применение (`applyWaveBuff`)

### Community 75 - "Engage State (FSM)"
Cohesion: 0.50
Nodes (4): aiCover Module (findCoverPoint), aiTuning Module (preferredRange, aimTolerance, steering), Engage State (FSM), losClear Module (line of sight через colliders)

### Community 76 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 77 - "RailgunWeapon.ts"
Cohesion: 0.19
Nodes (8): RailgunFireState, railgunShouldStartCharge(), BEAM_SPARK_COLOR, RailgunState, tmpDir, tmpMuzzle, tmpSpark, resolveWeaponDamage()

## Knowledge Gaps
- **322 isolated node(s):** `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js`, `name`, `private` (+317 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `TankEntity` to `index.ts`, `Projectile.ts`, `Weapon`, `botSpawn.ts`, `GameSimulation.ts`, `Nameplate`, `GameApi`, `Game.ts`, `simPorts.ts`, `CannonWeapon`, `PlayerFactory.ts`, `disposeObject3D`, `Tank.ts`, `catalog.ts`, `stages.ts`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `typescript` connect `ArmorStrike Project` to `catalog.ts`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`, `eslint-plugin-react-hooks`, `ArmorStrike Project`, `vitest`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js` to the rest of the system?**
  _322 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062375049980008 - nodes in this community are weakly interconnected._
- **Should `physics.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05802469135802469 - nodes in this community are weakly interconnected._
- **Should `Projectile.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08784313725490196 - nodes in this community are weakly interconnected._