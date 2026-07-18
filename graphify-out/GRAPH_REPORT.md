# Graph Report - .  (2026-07-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1354 nodes · 3322 edges · 91 communities (65 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b24906b9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ArenaBuilder.ts
- simPorts.ts
- CameraRig.ts
- PlayerFactory.ts
- Projectile.ts
- EffectsPort
- stages.ts
- ArmorStrike — Детальный разбор функционала проекта
- compilerOptions
- GameEvent
- physics.ts
- GameApi
- AudioFX
- particles.ts
- devDependencies
- AI.ts
- HudModel.ts
- AudioPort
- Game
- WeaponDeps
- HUD.tsx
- useGameHud.ts
- GameBootstrap.ts
- SparkPool
- types.ts
- RailgunWeapon
- ParticleEffects
- WaveBuffId
- RailgunBeamFx
- ArmorStrike Project
- dependencies
- types.ts
- wavePreview.ts
- PlayerController
- FlamethrowerWeapon.ts
- minimapDraw.ts
- AIController
- Nameplate
- PhysicsSystem.ts
- railgunChargeFx.ts
- RailgunWeapon.ts
- useFocusTrap
- ErrorBoundary
- GameLoop
- SmokeSystem
- scripts
- QualityController
- PlayerController.ts
- CoreSystem
- RingSystem
- package.json
- aiObstacle.ts
- opencode.json
- HudFeed.tsx
- MainMenu.tsx
- Working Style Guidelines
- graphify.js
- vite.config.ts
- CLAUDE.md
- @eslint/js
- globals
- @types/react
- @types/react-dom
- cn.ts
- eslint.config.js
- CI Workflow Configuration
- ArmorStrike — 3D Бронетанковый Штурм (HTML)
- botStatsForWave
- ProjectileManager
- FlameParticlePool.ts
- Damage System — Централизованный урон
- GameLoop.ts
- graphify.js
- Wave System — Волны и спавн
- Weapon: Cannon «Смоки»
- Weapon: Flamethrower «Firebird»
- AI Bots — Поведение противников
- Game Lifecycle — Режимы, пауза, death cam
- aiObstacle.ts
- Weapon: Railgun — Рельсотрон
- CI Workflow Configuration
- ArmorStrike — 3D Бронетанковый Штурм (HTML)
- Scoring — Очки и убийства
- Tank Aim — Наведение башни
- RingSystem
- GDD — Approved Mechanics (ArmorStrike)
- Wave Buffs — Баффы между волнами
- @types/react-dom

## God Nodes (most connected - your core abstractions)
1. `AudioPort` - 38 edges
2. `EffectsPort` - 38 edges
3. `TankEntity` - 35 edges
4. `Arena` - 32 edges
5. `GameApi` - 32 edges
6. `TurretId` - 31 edges
7. `HullId` - 30 edges
8. `CameraRig` - 30 edges
9. `Game` - 30 edges
10. `ArenaBuildContext` - 26 edges

## Surprising Connections (you probably didn't know these)
- `ArmorStrike Project` --uses_style_framework--> `tailwindcss`  [EXTRACTED]
  README.md → package.json
- `ArmorStrike Project` --uses_build_tool--> `vite`  [EXTRACTED]
  README.md → package.json
- `ArmorStrike Project` --uses_language--> `typescript`  [EXTRACTED]
  README.md → package.json
- `GarageProps` --references--> `GameApi`  [EXTRACTED]
  src/components/Garage.tsx → src/game/GameApi.ts
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts

## Import Cycles
- 4-file cycle: `src/game/Arena.ts -> src/game/engine/systems/PhysicsSystem.ts -> src/game/tank/simPorts.ts -> src/game/weapons/types.ts -> src/game/Arena.ts`
- 5-file cycle: `src/game/Arena.ts -> src/game/engine/systems/PhysicsSystem.ts -> src/game/tank/simPorts.ts -> src/game/weapons/types.ts -> src/game/engine/Projectile.ts -> src/game/Arena.ts`

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (91 total, 26 thin omitted)

### Community 0 - "ArenaBuilder.ts"
Cohesion: 0.06
Nodes (81): buildAtmosphere(), buildCentralHall(), addCityRamp(), billboard(), buildCityAtmosphere(), buildCityBlocks(), buildCityContent(), buildCityDistricts() (+73 more)

### Community 1 - "simPorts.ts"
Cohesion: 0.09
Nodes (24): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+16 more)

### Community 2 - "CameraRig.ts"
Cohesion: 0.12
Nodes (12): ICONS, MapSelect(), MapSelectProps, GameModeController, GameModeControllerDeps, isMapId(), MAP_IDS, MapDef (+4 more)

### Community 3 - "PlayerFactory.ts"
Cohesion: 0.09
Nodes (22): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit(), HitEffect (+14 more)

### Community 4 - "Projectile.ts"
Cohesion: 0.20
Nodes (16): WeaponType, AIBody, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA, AimFireState (+8 more)

### Community 5 - "EffectsPort"
Cohesion: 0.06
Nodes (34): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps, HudScoreboard(), HudScoreboardProps (+26 more)

### Community 6 - "stages.ts"
Cohesion: 0.11
Nodes (15): GarageProps, TurretCard(), TurretCardProps, HullId, TurretId, getWeaponMeta(), GarageBinding, GarageBindingDeps (+7 more)

### Community 7 - "ArmorStrike — Детальный разбор функционала проекта"
Cohesion: 0.04
Nodes (4): AmbientDust, CameraShake, Effects, EffectsPort

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (14): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+6 more)

### Community 9 - "GameEvent"
Cohesion: 0.16
Nodes (10): COLORS, buildBotStyle(), buildPlayerStyle(), BotSpawnDeps, pickSpawnIndex(), SPAWN_POINTS, buildPlayerTank(), createTankEntity() (+2 more)

### Community 10 - "physics.ts"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 11 - "GameApi"
Cohesion: 0.06
Nodes (12): HULLS, Arena, BotEntry, disposeBots(), CombatDeps, CombatSystem, SimContext, AudioPort (+4 more)

### Community 12 - "AudioFX"
Cohesion: 0.11
Nodes (14): CannonWeapon, tmpDir, tmpMuzzle, fillMuzzleAndAim(), ownerReloadMul(), WeaponAmmoState, WeaponDeps, WeaponOwner (+6 more)

### Community 13 - "particles.ts"
Cohesion: 0.24
Nodes (13): aimErrorMulForRole(), coverHpFracForRole(), personaForRole(), ROLE_LABEL, roleForBot(), roleLabel(), spawnBot(), botsForWave() (+5 more)

### Community 14 - "devDependencies"
Cohesion: 0.23
Nodes (9): HullCard(), HullCardProps, MainMenuProps, HULL_IDS, TURRET_IDS, TURRETS, WEAPON_TUNING, HullDef (+1 more)

### Community 15 - "AI.ts"
Cohesion: 0.13
Nodes (14): rearPoint(), _bd, BoostFxCtx, BoostStage, BotAiCtx, buildSimulationStages(), _bv, EngineAudioCtx (+6 more)

### Community 16 - "HudModel.ts"
Cohesion: 0.15
Nodes (12): applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle, RailgunFireState, railgunShouldStartCharge(), BEAM_SPARK_COLOR (+4 more)

### Community 17 - "AudioPort"
Cohesion: 0.09
Nodes (26): TankStyle, BOOST, TankAimSystem, TankCombatTimersSystem, tmpV, TankMotionSystem, TankPresentationSystem, LiveTank (+18 more)

### Community 18 - "Game"
Cohesion: 0.17
Nodes (7): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, buildAmmoState(), resolveWeaponDamage()

### Community 19 - "WeaponDeps"
Cohesion: 0.12
Nodes (4): GameSimulation, ScalarCell, Game, GameEvent

### Community 21 - "useGameHud.ts"
Cohesion: 0.10
Nodes (21): eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @tailwindcss/vite (+13 more)

### Community 22 - "GameBootstrap.ts"
Cohesion: 0.10
Nodes (19): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Deterministic wave preview, Bootstrap composition (+11 more)

### Community 23 - "SparkPool"
Cohesion: 0.18
Nodes (4): _wctx, WeaponHost, FlamethrowerWeapon, WeaponContext

### Community 25 - "types.ts"
Cohesion: 0.33
Nodes (6): botAiForWave(), PROJECTILE, SCORE, TANK, applyPlayerKillScore(), KillScoreState

### Community 26 - "RailgunWeapon"
Cohesion: 0.19
Nodes (7): AmbientStage, BotAiStage, EngineAudioStage, PlayerInputStage, ProjectileStage, SimSystem, WavesStage

### Community 27 - "ParticleEffects"
Cohesion: 0.23
Nodes (6): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark, SmokePuff

### Community 28 - "WaveBuffId"
Cohesion: 0.22
Nodes (5): makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 30 - "ArmorStrike Project"
Cohesion: 0.15
Nodes (13): ArmorStrike Project, Loadout Data (localStorage), Graphics Quality Preset (localStorage), tailwindcss, typescript, vite, React 19, Pause Component (+5 more)

### Community 31 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 33 - "wavePreview.ts"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 35 - "FlamethrowerWeapon.ts"
Cohesion: 0.24
Nodes (9): resolveCircle(), _pa, _pb, resolveWalls(), _solid, solidColliders(), separateTankPair(), TankXZ (+1 more)

### Community 36 - "minimapDraw.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 37 - "AIController"
Cohesion: 0.20
Nodes (10): applyDamage, applyHit / applySplashHit, applyKnockback, CombatSystem hooks, Damage System — Централизованный урон, damageBlock, Splash falloff (пушка), Классы (+2 more)

### Community 39 - "PhysicsSystem.ts"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 41 - "RailgunWeapon.ts"
Cohesion: 0.21
Nodes (10): findCoverPoint(), _circleOut, Collider, ColliderKind, ColliderOpts, losClear(), segmentHitsCollider(), segmentHitT() (+2 more)

### Community 42 - "useFocusTrap"
Cohesion: 0.25
Nodes (8): Auto-pause policy, Death → Game Over, Game Lifecycle — Режимы, пауза, death cam, GameMode, Классы, Порядок тика (playing, !paused), Старт матча и выбор карты, Флаги run

### Community 43 - "ErrorBoundary"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 44 - "GameLoop"
Cohesion: 0.25
Nodes (8): Score за волну, Wave System — Волны и спавн, Классы, Количество ботов, Скейлинг бота (`spawnBot`), Состав (детерминированный preview), Точки спавна, Цикл

### Community 45 - "SmokeSystem"
Cohesion: 0.25
Nodes (8): Weapon: Cannon «Смоки», Выстрел, Классы, Скорость снаряда, Состояния магазина, Тюнинг (`WEAPON_TUNING.cannon`), Урон на попадании, Фэнтези

### Community 46 - "scripts"
Cohesion: 0.25
Nodes (8): Weapon: Flamethrower «Firebird», Визуал, Геометрия поражения, Классы, Состояния, Тюнинг (`WEAPON_TUNING.flamethrower`), Фэнтези, Энергия

### Community 47 - "QualityController"
Cohesion: 0.25
Nodes (3): TankAnimationSystemStage, TankAnimationSystem, GameLoop

### Community 48 - "PlayerController.ts"
Cohesion: 0.29
Nodes (7): AI Bots — Поведение противников, Fire, FSM, Preferred range, Классы, Подсистемы, Роли (`AIRole`)

### Community 49 - "CoreSystem"
Cohesion: 0.29
Nodes (7): Health & Regen — Прочность и саморемонт, Визуальные пороги, Классы, Модель HP, Получение урона, Саморемонт, Смерть игрока

### Community 50 - "RingSystem"
Cohesion: 0.29
Nodes (7): FSM, Weapon: Railgun — Рельсотрон, Аммуниция (HUD), Классы, Логика пробития (`executeFiring`), Тюнинг (`WEAPON_TUNING.railgun`), Фэнтези

### Community 51 - "package.json"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 54 - "HudFeed.tsx"
Cohesion: 0.25
Nodes (4): HudModel, HudUnit, MinimapStatic, ScoreRow

### Community 55 - "MainMenu.tsx"
Cohesion: 0.33
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

### Community 56 - "Working Style Guidelines"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 57 - "graphify.js"
Cohesion: 0.33
Nodes (6): Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Структура сборки

### Community 58 - "vite.config.ts"
Cohesion: 0.33
Nodes (6): Behavior pattern, Projectile System — Пул снарядов, Shot lifecycle, Классы, Константы (`PROJECTILE`), Область применения

### Community 59 - "CLAUDE.md"
Cohesion: 0.33
Nodes (6): HUD, Kill path, RunState fields, Scoring — Очки и убийства, Классы, Константы (`SCORE`)

### Community 60 - "@eslint/js"
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 65 - "eslint.config.js"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 66 - "CI Workflow Configuration"
Cohesion: 0.40
Nodes (5): Wave Buffs — Баффы между волнами, Классы, Когда, Опции (`WAVE_BUFF_OPTIONS`), Применение (`applyWaveBuff`)

### Community 67 - "ArmorStrike — 3D Бронетанковый Штурм (HTML)"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 70 - "FlameParticlePool.ts"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 72 - "GameLoop.ts"
Cohesion: 0.67
Nodes (3): Graphify Skill System, Project Knowledge Graph, Working Style Guidelines

### Community 74 - "Wave System — Волны и спавн"
Cohesion: 0.10
Nodes (16): App(), BootErrorProps, GameOverScreen(), GameOverScreenProps, PauseMenu(), PauseMenuProps, BUFF_ICON, IntermissionPayload (+8 more)

### Community 76 - "Weapon: Flamethrower «Firebird»"
Cohesion: 0.22
Nodes (9): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, balance still grid), Implemented layout (code), Overpass (short segment), Street graph (world, arena half ≈ 75), Success criteria (+1 more)

### Community 77 - "AI Bots — Поведение противников"
Cohesion: 0.27
Nodes (3): DeathTimerStage, WeaponSystemStage, WeaponSystem

### Community 79 - "aiObstacle.ts"
Cohesion: 0.70
Nodes (4): AvoidState, computeObstacleAvoidance(), dirFree(), pointInCollider()

### Community 80 - "Weapon: Railgun — Рельсотрон"
Cohesion: 0.40
Nodes (3): NameplateSystemStage, NameplateEntry, NameplateSystem

## Knowledge Gaps
- **295 isolated node(s):** `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js`, `name`, `private` (+290 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `ArmorStrike Project` to `devDependencies`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `useGameHud.ts` to `ArmorStrike — 3D Бронетанковый Штурм (HTML)`, `RingSystem`, `GDD — Approved Mechanics (ArmorStrike)`, `Wave Buffs — Баффы между волнами`, `@types/react-dom`, `ArmorStrike Project`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `typescript` connect `ArmorStrike Project` to `useGameHud.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js` to the rest of the system?**
  _295 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06038709677419355 - nodes in this community are weakly interconnected._
- **Should `simPorts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09485815602836879 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._