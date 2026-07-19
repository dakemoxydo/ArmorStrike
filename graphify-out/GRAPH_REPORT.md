# Graph Report - ArmorStrike  (2026-07-19)

## Corpus Check
- 229 files · ~74,288 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1438 nodes · 3458 edges · 101 communities (63 shown, 38 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `81e722fa`
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
- WEAPON_TUNING
- package.json
- FlamethrowerWeapon.ts
- Tank Movement — Движение корпуса
- minimapDraw.ts
- Damage System — Централизованный урон
- GameSimulation.ts
- SparkPool
- waveBuffs.ts
- City Level Design — Grid + Districts + Overpass
- ErrorBoundary
- MapId
- constants.ts
- disposeObject3D
- Projectile System — Пул снарядов
- Weapon: Cannon «Смоки»
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
- FlameParticlePool.ts
- GDD — Approved Mechanics (ArmorStrike)
- MuzzleSystem
- ScorchSystem
- Engage State (FSM)
- opencode.json
- RailgunWeapon.ts
- graphify.js
- Wave System — Волны и спавн
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
- railgunFireLogic.ts
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

## Communities (101 total, 38 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.18
Nodes (16): buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFactoryContent(), buildFoundry(), buildGantryCrane(), buildPipeRack(), buildRamps() (+8 more)

### Community 1 - "physics.ts"
Cohesion: 0.06
Nodes (45): AIBody, AIController, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA, AimFireState (+37 more)

### Community 2 - "Projectile.ts"
Cohesion: 0.07
Nodes (28): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, CombatDeps, botAiForWave(), PROJECTILE (+20 more)

### Community 3 - "HUD.tsx"
Cohesion: 0.06
Nodes (32): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps, HudScoreboard(), HudScoreboardProps (+24 more)

### Community 4 - "Game"
Cohesion: 0.08
Nodes (12): Game, GameLoopDeps, GameModeController, GarageBinding, HudModel, HudUnit, GameMode, HudSnapshot (+4 more)

### Community 5 - "botSpawn.ts"
Cohesion: 0.27
Nodes (16): barrelTexture(), containerTexture(), crateTexture(), glowTexture(), scorchTexture(), cityGroundTexture(), factoryGroundTexture(), groundTexture() (+8 more)

### Community 6 - "CameraRig.ts"
Cohesion: 0.10
Nodes (13): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+5 more)

### Community 7 - "GameSimulation.ts"
Cohesion: 0.10
Nodes (20): Arena, disposeArenaSubtree(), ArenaShellTheme, buildArenaShell(), buildArena(), makeContext(), ArenaEffects, SmokeSprite (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 10 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, @eslint/js, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js, eslint-plugin-react-refresh (+17 more)

### Community 11 - "GameApi"
Cohesion: 0.21
Nodes (22): buildVillageBanners(), buildVillageBarns(), buildVillageContent(), buildVillageFences(), buildVillageFireflies(), buildVillageFoliage(), buildVillageHayPlatform(), buildVillageHouses() (+14 more)

### Community 12 - "Game.ts"
Cohesion: 0.13
Nodes (11): buildPlayerStyle(), GameSimulation, ScalarCell, GameContext, GameModeControllerDeps, GarageBindingDeps, isMapId(), buildPlayerTank() (+3 more)

### Community 14 - "simPorts.ts"
Cohesion: 0.15
Nodes (16): BOOST, TankAimSystem, TankCombatTimersSystem, tmpV, TankMotionSystem, TankPresentationSystem, LiveTank, AnimBody (+8 more)

### Community 15 - "GameBootstrap.ts"
Cohesion: 0.05
Nodes (20): GameOverScreen(), GameOverScreenProps, ICONS, MapSelect(), MapSelectProps, PauseMenu(), PauseMenuProps, getQualityPreset() (+12 more)

### Community 16 - "CannonWeapon"
Cohesion: 0.16
Nodes (6): CannonWeapon, WeaponDeps, emptyMag(), makeTank(), makeVisual(), PARAMS

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
Cohesion: 0.22
Nodes (5): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark

### Community 22 - "AudioPort"
Cohesion: 0.53
Nodes (5): TankStyle, buildTankMesh(), TankBuildContext, buildHull(), buildTurret()

### Community 23 - "Tank.ts"
Cohesion: 0.21
Nodes (6): disposeObject3D(), BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState

### Community 24 - "types.ts"
Cohesion: 0.31
Nodes (4): AimBody, TankParams, TankVisual, PARAMS

### Community 25 - "Standard: UI, HUD & Input"
Cohesion: 0.22
Nodes (9): 1. React ↛ Simulation, 2. Two channels: events + HUD snapshot, 3. Component layout, 4. Player input (combat), 5. Garage input (отдельный класс), 6. Camera modes (strategy), 7. Focus & a11y helpers, 8. Checklist нового UI (+1 more)

### Community 26 - "catalog.ts"
Cohesion: 0.12
Nodes (18): GarageProps, HullCard(), HullCardProps, MainMenuProps, TurretCard(), TurretCardProps, HULLS, TURRETS (+10 more)

### Community 27 - "stages.ts"
Cohesion: 0.05
Nodes (35): rearPoint(), AmbientStage, _bd, BoostFxCtx, BoostStage, BotAiCtx, BotAiStage, buildSimulationStages() (+27 more)

### Community 28 - "ArmorStrike Project"
Cohesion: 0.12
Nodes (16): Architecture Standards (Docs/Architecture/), ArmorStrike Project, Loadout Data (localStorage), Graphics Quality Preset (localStorage), Docs Directory, Graphify Extraction Command, tailwindcss, typescript (+8 more)

### Community 29 - "Standard: Weapons, Projectiles & Damage"
Cohesion: 0.22
Nodes (9): 1. Weapon strategy (единый интерфейс), 2. Owner & context ports, 3. Fire pipeline (кадр), 4. Projectiles, 5. Shared hit helpers, 6. DamageSystem split, 7. Catalog boundary, 8. Checklist нового оружия (+1 more)

### Community 30 - "EffectsPort"
Cohesion: 0.16
Nodes (12): fillMuzzleAndAim(), applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle, BEAM_SPARK_COLOR, RailgunState (+4 more)

### Community 32 - "buildMesh.ts"
Cohesion: 0.26
Nodes (24): addCityRamp(), billboard(), buildCityBlocks(), buildCityContent(), buildCityDistricts(), buildCityOverpass(), buildCityPlaza(), buildCityRamps() (+16 more)

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
Cohesion: 0.11
Nodes (25): HULL_IDS, TURRET_IDS, WeaponType, buildBotStyle(), roleForBot(), roleLabel(), BotEntry, BotSpawnDeps (+17 more)

### Community 40 - "WEAPON_TUNING"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 41 - "package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, lint, preview, test (+3 more)

### Community 42 - "FlamethrowerWeapon.ts"
Cohesion: 0.12
Nodes (8): inFlameConeXZ(), FlamethrowerWeapon, tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, WeaponContext, resolveWeaponDamage()

### Community 43 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 44 - "minimapDraw.ts"
Cohesion: 0.25
Nodes (8): Weapon: Flamethrower «Firebird», Визуал, Геометрия поражения, Классы, Состояния, Тюнинг (`WEAPON_TUNING.flamethrower`), Фэнтези, Энергия

### Community 45 - "Damage System — Централизованный урон"
Cohesion: 0.20
Nodes (10): applyDamage, applyHit / applySplashHit, applyKnockback, CombatSystem hooks, Damage System — Централизованный урон, damageBlock, Splash falloff (пушка), Классы (+2 more)

### Community 46 - "GameSimulation.ts"
Cohesion: 0.52
Nodes (4): buildAtmosphere(), buildCityAtmosphere(), buildVillageAtmosphere(), hexTexture()

### Community 48 - "waveBuffs.ts"
Cohesion: 0.09
Nodes (18): CombatSystem, applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), ProjectileManager, SimContext, bootstrapGame() (+10 more)

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
Cohesion: 0.60
Nodes (3): BuffableTank, applyWaveBuff(), clearWaveBuff()

### Community 53 - "disposeObject3D"
Cohesion: 0.40
Nodes (5): Wave Buffs — Баффы между волнами, Классы, Когда, Опции (`WAVE_BUFF_OPTIONS`), Применение (`applyWaveBuff`)

### Community 54 - "Projectile System — Пул снарядов"
Cohesion: 0.40
Nodes (5): Arena Physics, Damage System, Projectile System — Пул снарядов, PROJECTILE Constants (speed=58, range=85, radius=0.18), Weapon Cannon

### Community 56 - "Weapon: Cannon «Смоки»"
Cohesion: 0.25
Nodes (8): App(), BUFF_ICON, IntermissionPayload, WaveIntermission(), WaveIntermissionProps, WEAPON_ICON, RoleTally, isInteractiveKeyboardTarget()

### Community 60 - "Docs/GDD/Approved/ Directory"
Cohesion: 0.40
Nodes (6): Docs/GDD/Approved/ Directory, Auto-Documentation Phase (Phase C), Brainstorming Phase (Phase A), Docs/GDD/Drafts/ Directory, Implementation Phase (Phase B), Obsidian Game Design Documents

### Community 61 - "Arena_Physics.md"
Cohesion: 0.33
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

### Community 62 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 63 - "Maps — Мульти-карты и выбор арены"
Cohesion: 0.25
Nodes (8): Known gaps / balance notes, Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Размер арены (глобальный), Структура сборки

### Community 69 - "Health & Regen System"
Cohesion: 0.67
Nodes (3): Health & Regen System, Game Lifecycle, Tank Movement System

### Community 70 - "FlameParticlePool.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 71 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 75 - "Engage State (FSM)"
Cohesion: 0.50
Nodes (4): aiCover Module (findCoverPoint), aiTuning Module (preferredRange, aimTolerance, steering), Engage State (FSM), losClear Module (line of sight через colliders)

### Community 76 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 77 - "RailgunWeapon.ts"
Cohesion: 0.21
Nodes (7): tmpDir, tmpMuzzle, ownerReloadMul(), buildAmmoState(), WeaponAmmoState, WeaponOwnerParams, WeaponOwnerVisual

## Knowledge Gaps
- **329 isolated node(s):** `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js`, `name`, `private` (+324 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `ArmorStrike Project` to `catalog.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `TankEntity` connect `TankEntity` to `Tank Aim — Наведение башни`, `Projectile.ts`, `Nameplate`, `GameApi`, `Game.ts`, `simPorts.ts`, `waveBuffs.ts`, `CannonWeapon`, `Tank.ts`, `types.ts`, `catalog.ts`, `stages.ts`, `EffectsPort`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`, `eslint-plugin-react-hooks`, `ArmorStrike Project`, `vitest`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js` to the rest of the system?**
  _329 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `physics.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06293706293706294 - nodes in this community are weakly interconnected._
- **Should `Projectile.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06874669487043893 - nodes in this community are weakly interconnected._
- **Should `HUD.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0596078431372549 - nodes in this community are weakly interconnected._