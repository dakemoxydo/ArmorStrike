# Graph Report - ArmorStrike  (2026-07-20)

## Corpus Check
- 251 files · ~87,319 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1594 nodes · 3820 edges · 109 communities (68 shown, 41 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76545502`
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
- Garage Loadout — Сборка танка
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

## Communities (109 total, 41 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.05
Nodes (94): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+86 more)

### Community 1 - "CameraRig.ts"
Cohesion: 0.10
Nodes (13): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+5 more)

### Community 2 - "stages.ts"
Cohesion: 0.06
Nodes (39): rearPoint(), aiFocusForBot(), _aiSticky, AmbientStage, _bd, BoostFxCtx, BoostStage, BotAiCtx (+31 more)

### Community 3 - "types.ts"
Cohesion: 0.11
Nodes (13): GarageProps, cacheByCanvas, CanvasCache, drawMinimap(), getCache(), paintStatics(), staticLayerKey(), GameApi (+5 more)

### Community 4 - "physics.ts"
Cohesion: 0.05
Nodes (57): WeaponType, buildBotStyle(), buildPlayerStyle(), AIBody, AIController, AICtx, AIPersona, AIState (+49 more)

### Community 5 - "RenderWorld"
Cohesion: 0.10
Nodes (16): AtmospherePreset, ATMOSPHERES, DUSK, getAtmosphere(), NIGHT, getQualityPreset(), loadQuality(), nextQuality() (+8 more)

### Community 6 - "catalog.ts"
Cohesion: 0.14
Nodes (17): HullCard(), HullCardProps, MainMenuProps, TurretCard(), TurretCardProps, HULL_IDS, HULLS, TURRET_IDS (+9 more)

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
Cohesion: 0.09
Nodes (21): App(), BootErrorProps, ICONS, MapSelect(), MapSelectProps, ModeOption, MODES, ModeSelect() (+13 more)

### Community 13 - "particles.ts"
Cohesion: 0.22
Nodes (6): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark, SmokePuff

### Community 14 - "GameSimulation.ts"
Cohesion: 0.15
Nodes (12): GameSimulation, ProjectileManager, ScalarCell, SimContext, TankAnimationSystem, GameContext, GameLoop, GameLoopDeps (+4 more)

### Community 15 - "simPorts.ts"
Cohesion: 0.16
Nodes (15): TankAimSystem, TankCombatTimersSystem, tmpV, TankMotionSystem, TankPresentationSystem, LiveTank, AimBody, AnimBody (+7 more)

### Community 16 - "Classic Match Modes — DM / TDM / Capture Point"
Cohesion: 0.20
Nodes (10): 1. Intent, 4. Баланс и ощущение длины матча, 5. Карты и режимы, 6. Фазы реализации (когда дойдём до кода), 7. Open questions — resolved, 8. Acceptance, 9. Design rationale (кратко), Classic Match Modes — DM / TDM / Capture Point (+2 more)

### Community 17 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, @eslint/js, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js, eslint-plugin-react-refresh (+17 more)

### Community 19 - "GameBootstrap.ts"
Cohesion: 0.16
Nodes (14): COLORS, applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), buildSimulationStages(), bootstrapGame(), buildCoreSubsystems() (+6 more)

### Community 22 - "MatchRuntime.ts"
Cohesion: 0.12
Nodes (20): BASE, BOT_NORMAL, configForMode(), FFA_fallback(), MatchRuntime, MatchRuntimeHooks, restoreDeathVisuals(), MatchConfig (+12 more)

### Community 23 - "CannonWeapon"
Cohesion: 0.20
Nodes (5): CannonWeapon, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 24 - "Core Architecture — ArmorStrike"
Cohesion: 0.17
Nodes (12): Bootstrap composition, Core Architecture — ArmorStrike, Directory map, Engineering standards (детальные правила), God nodes (knowledge graph), Hard rule: `core/` ↛ `game/`, Layering, Non-goals (current build) (+4 more)

### Community 25 - "HudModel.ts"
Cohesion: 0.16
Nodes (15): GameOverScreenProps, allyLineBlockers(), FocusCandidate, FocusSelf, pickAiFocus(), PickAiFocusResult, ObjectiveZoneView, MatchEndReason (+7 more)

### Community 26 - "EffectsPort"
Cohesion: 0.09
Nodes (4): EffectsPort, applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx()

### Community 27 - "Collider"
Cohesion: 0.17
Nodes (5): Collider, PickAiFocusOpts, RailgunWeapon, ownerReloadMul(), CombatPeer

### Community 28 - "mapCatalog.ts"
Cohesion: 0.15
Nodes (6): Arena, BotRoster, captureHudPoints(), HudModel, RunState, HudUnit

### Community 31 - "PlayerFactory.ts"
Cohesion: 0.18
Nodes (10): tmpDir, tmpMuzzle, fillMuzzleAndAim(), tmpDir, tmpMuzzle, WeaponAmmoState, WeaponDeps, WeaponOwner (+2 more)

### Community 32 - "ArmorStrike Project"
Cohesion: 0.12
Nodes (16): Architecture Standards (Docs/Architecture/), ArmorStrike Project, Loadout Data (localStorage), Graphics Quality Preset (localStorage), Docs Directory, Graphify Extraction Command, tailwindcss, typescript (+8 more)

### Community 34 - "TurretId"
Cohesion: 0.53
Nodes (5): TankStyle, buildTankMesh(), TankBuildContext, buildHull(), buildTurret()

### Community 35 - "Game"
Cohesion: 0.13
Nodes (3): HudWeaponProps, Game, HudSnapshot

### Community 37 - "Weapon"
Cohesion: 0.11
Nodes (5): _wctx, WeaponHost, FlamethrowerWeapon, Weapon, WeaponContext

### Community 38 - "captureLogic.ts"
Cohesion: 0.14
Nodes (17): CAPTURE_ANCHORS, CaptureAnchor, zonesForMap(), CAPTURE, CaptureOwner, CapturePointId, CaptureZoneState, countPresenceInZone() (+9 more)

### Community 39 - "TeamId"
Cohesion: 0.07
Nodes (25): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps, HudVitals(), HudVitalsProps (+17 more)

### Community 40 - "PhysicsSystem.ts"
Cohesion: 0.21
Nodes (9): solidColliders(), PhysicsSystemStage, _pa, _pb, PhysicsSystem, resolveWalls(), separateTankPair(), TankXZ (+1 more)

### Community 42 - "BuffBaseSnapshot"
Cohesion: 0.47
Nodes (5): GameOverScreen(), formatKd(), formatMatchClock(), modeLabelRu(), resultsHeadline()

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

### Community 51 - "HudScoreboard.tsx"
Cohesion: 0.36
Nodes (8): byTeam(), FlatTable(), HudScoreboard(), HudScoreboardProps, isTeamBoard(), TeamTable(), ScoreRow, scoreboardHpClass()

### Community 52 - "FlamethrowerWeapon.ts"
Cohesion: 0.17
Nodes (7): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, buildAmmoState(), resolveWeaponDamage()

### Community 53 - "Tank Movement — Движение корпуса"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 54 - "Village Level Design — Square + Barns + Paddocks"
Cohesion: 0.06
Nodes (35): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы, City Level Design — Grid + Districts + Overpass, Code map (+27 more)

### Community 55 - "Key patterns"
Cohesion: 0.25
Nodes (8): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Match modes (not app modes), Key patterns

### Community 56 - "3. Общий match framework (фундамент до режимов)"
Cohesion: 0.25
Nodes (8): 3.1 Новые понятия, 3.2 Что появляется у каждого танка, 3.3 Respawn (общий), 3.4 Спавны, 3.5 Scoring rewrite, 3.6 AI changes, 3.7 UI flow (предложение), 3. Общий match framework (фундамент до режимов)

### Community 57 - "Tank.ts"
Cohesion: 0.22
Nodes (8): BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState, BuffableTank, TankFxState, PARAMS

### Community 59 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.29
Nodes (7): 2.1 Deathmatch (DM) — «Бой насмерть», 2.2 Team Deathmatch (TDM) — «Командный бой», 2.3 Capture Point (CP) — «Захват точки», 2. Режимы (предложение игрока + уточнения GD), AI для CP (обязательное отличие от TDM), Предлагаемые числа захвата (к утверждению), Размещение точек (дизайн-уровень)

### Community 60 - "Damage System — Централизованный урон"
Cohesion: 0.18
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
Cohesion: 0.29
Nodes (7): BOOST, botAiForWave(), PROJECTILE, SCORE, TANK, applyPlayerKillScore(), KillScoreState

### Community 66 - "WEAPON_TUNING"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 67 - "Standard: Tank Entity & Systems"
Cohesion: 0.25
Nodes (8): 1. Entity = id + composition, 2. Flat port projections, 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose, 7. Checklist нового tank-related кода, Standard: Tank Entity & Systems

### Community 69 - "Player Controls — Управление игроком"
Cohesion: 0.12
Nodes (14): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления (+6 more)

### Community 72 - "Capture Point — Захват точки"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

### Community 74 - "Docs/GDD/Approved/ Directory"
Cohesion: 0.40
Nodes (6): Docs/GDD/Approved/ Directory, Auto-Documentation Phase (Phase C), Brainstorming Phase (Phase A), Docs/GDD/Drafts/ Directory, Implementation Phase (Phase B), Obsidian Game Design Documents

### Community 76 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

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
- **376 isolated node(s):** `Engineering standards (детальные правила)`, `Overview`, `Hard rule: `core/` ↛ `game/``, `Bootstrap composition`, `Simulation pipeline` (+371 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `ArmorStrike Project` to `catalog.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `typescript` connect `ArmorStrike Project` to `devDependencies`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `ArmorStrike Project`, `package.json`, `eslint-plugin-react-hooks`, `vitest`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `Engineering standards (детальные правила)`, `Overview`, `Hard rule: `core/` ↛ `game/`` to the rest of the system?**
  _376 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051842972729997 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10465116279069768 - nodes in this community are weakly interconnected._
- **Should `stages.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05727644652250146 - nodes in this community are weakly interconnected._