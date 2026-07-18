# Graph Report - ArmorStrike  (2026-07-18)

## Corpus Check
- 213 files · ~60,541 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1309 nodes · 3074 edges · 94 communities (65 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b171da54`
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
- FlamethrowerWeapon
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
- ArmorStrike — 3D Бронетанковый Штурм (HTML)
- botStatsForWave
- ProjectileManager
- FlameParticlePool.ts
- Damage System — Централизованный урон
- GameLoop.ts
- Player Controls — Управление игроком
- Wave System — Волны и спавн
- Weapon: Cannon «Смоки»
- Weapon: Flamethrower «Firebird»
- AI Bots — Поведение противников
- Game Lifecycle — Режимы, пауза, death cam
- Health & Regen — Прочность и саморемонт
- Weapon: Railgun — Рельсотрон
- waveBuffs.ts
- Arena & Physics — Арена и коллизии
- Garage Loadout — Сборка танка
- Projectile System — Пул снарядов
- Scoring — Очки и убийства
- Tank Aim — Наведение башни
- RingSystem
- GDD — Approved Mechanics (ArmorStrike)
- Wave Buffs — Баффы между волнами
- GameModeController
- railgunFireLogic.ts
- GDD Drafts
- globals

## God Nodes (most connected - your core abstractions)
1. `AudioPort` - 38 edges
2. `EffectsPort` - 38 edges
3. `TankEntity` - 35 edges
4. `TurretId` - 31 edges
5. `GameApi` - 31 edges
6. `HullId` - 30 edges
7. `CameraRig` - 30 edges
8. `Arena` - 29 edges
9. `Game` - 29 edges
10. `WeaponType` - 25 edges

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
- None detected.

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (94 total, 29 thin omitted)

### Community 0 - "ArenaBuilder.ts"
Cohesion: 0.09
Nodes (36): buildAtmosphere(), buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack(), buildRamps() (+28 more)

### Community 1 - "simPorts.ts"
Cohesion: 0.18
Nodes (12): HullId, TurretId, buildPlayerStyle(), TankStyle, buildPlayerTank(), TankBuildInput, disposeObject3D(), buildTankMesh() (+4 more)

### Community 2 - "CameraRig.ts"
Cohesion: 0.16
Nodes (16): TankAimSystem, TankCombatTimersSystem, tmpV, TankMotionSystem, TankPresentationSystem, LiveTank, AimBody, AnimBody (+8 more)

### Community 3 - "PlayerFactory.ts"
Cohesion: 0.10
Nodes (14): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+6 more)

### Community 4 - "Projectile.ts"
Cohesion: 0.16
Nodes (12): fillMuzzleAndAim(), applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle, BEAM_SPARK_COLOR, RailgunState (+4 more)

### Community 5 - "EffectsPort"
Cohesion: 0.08
Nodes (16): rearPoint(), AmbientStage, BoostStage, BotAiStage, DeathTimerStage, EngineAudioStage, NameplateSystemStage, PhysicsSystemStage (+8 more)

### Community 6 - "stages.ts"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 7 - "ArmorStrike — Детальный разбор функционала проекта"
Cohesion: 0.23
Nodes (6): GameContext, GameModeControllerDeps, GarageBindingDeps, WeaponFactoryDeps, PreviewController, GameEvent

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 9 - "GameEvent"
Cohesion: 0.09
Nodes (22): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, PROJECTILE, applyHit(), applySplashHit() (+14 more)

### Community 10 - "physics.ts"
Cohesion: 0.19
Nodes (3): HudModel, RunState, HudUnit

### Community 12 - "AudioFX"
Cohesion: 0.11
Nodes (16): COLORS, Arena, _bd, BoostFxCtx, BotAiCtx, _bv, EngineAudioCtx, MinimapStage (+8 more)

### Community 14 - "devDependencies"
Cohesion: 0.10
Nodes (21): eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @tailwindcss/vite (+13 more)

### Community 15 - "AI.ts"
Cohesion: 0.07
Nodes (41): AIBody, AIController, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA, AimFireState (+33 more)

### Community 16 - "HudModel.ts"
Cohesion: 0.21
Nodes (14): HULL_IDS, TURRET_IDS, buildBotStyle(), aimErrorMulForRole(), coverHpFracForRole(), personaForRole(), ROLE_LABEL, roleForBot() (+6 more)

### Community 17 - "AudioPort"
Cohesion: 0.33
Nodes (6): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), buildDerivedSystems(), createWeapon()

### Community 18 - "Game"
Cohesion: 0.07
Nodes (3): AmbientDust, CameraShake, Effects

### Community 19 - "WeaponDeps"
Cohesion: 0.12
Nodes (3): Game, GarageBinding, HudSnapshot

### Community 20 - "HUD.tsx"
Cohesion: 0.12
Nodes (5): BotEntry, disposeBots(), NameplateEntry, Nameplate, TankEntity

### Community 21 - "useGameHud.ts"
Cohesion: 0.33
Nodes (6): BOOST, botAiForWave(), SCORE, TANK, applyPlayerKillScore(), KillScoreState

### Community 23 - "SparkPool"
Cohesion: 0.13
Nodes (14): bootstrapGame(), buildEventBus(), buildRenderWorld(), registerWindowHandlers(), getQualityPreset(), loadQuality(), nextQuality(), ORDER (+6 more)

### Community 24 - "FlamethrowerWeapon"
Cohesion: 0.16
Nodes (12): GameOverScreen(), GameOverScreenProps, PauseMenu(), PauseMenuProps, BUFF_ICON, IntermissionPayload, WaveIntermission(), WaveIntermissionProps (+4 more)

### Community 25 - "types.ts"
Cohesion: 0.18
Nodes (4): BotSpawnDeps, ControllableTank, WeaponHost, Weapon

### Community 26 - "RailgunWeapon"
Cohesion: 0.07
Nodes (25): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps, HudScoreboard(), HudScoreboardProps (+17 more)

### Community 30 - "ArmorStrike Project"
Cohesion: 0.19
Nodes (6): CannonWeapon, WeaponDeps, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 33 - "wavePreview.ts"
Cohesion: 0.10
Nodes (19): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Deterministic wave preview, Bootstrap composition (+11 more)

### Community 34 - "PlayerController"
Cohesion: 0.15
Nodes (12): cacheByCanvas, CanvasCache, drawMinimap(), getCache(), paintStatics(), staticLayerKey(), GameApi, GameMode (+4 more)

### Community 37 - "AIController"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 38 - "Nameplate"
Cohesion: 0.15
Nodes (13): ArmorStrike Project, Loadout Data (localStorage), Graphics Quality Preset (localStorage), tailwindcss, typescript, vite, React 19, Pause Component (+5 more)

### Community 39 - "PhysicsSystem.ts"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 41 - "RailgunWeapon.ts"
Cohesion: 0.23
Nodes (6): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, resolveWeaponDamage()

### Community 42 - "useFocusTrap"
Cohesion: 0.16
Nodes (11): App(), BootErrorProps, GarageProps, HullCard(), HullCardProps, MainMenuProps, HULLS, TURRETS (+3 more)

### Community 43 - "ErrorBoundary"
Cohesion: 0.23
Nodes (6): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark, SmokePuff

### Community 44 - "GameLoop"
Cohesion: 0.19
Nodes (6): GameSimulation, ProjectileManager, buildSimulationStages(), ScalarCell, SimContext, WaveManager

### Community 45 - "SmokeSystem"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 46 - "scripts"
Cohesion: 0.24
Nodes (7): TurretCard(), TurretCardProps, getWeaponMeta(), WeaponId, WeaponMeta, WEAPONS, buildGameLoop()

### Community 49 - "CoreSystem"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 51 - "package.json"
Cohesion: 0.36
Nodes (8): WeaponType, botsForWave(), WaveContext, previewWaveComposition(), tallyRoles(), tallyWeapons(), WAVE_BUFF_OPTIONS, WaveBuffOption

### Community 53 - "opencode.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 54 - "HudFeed.tsx"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 55 - "MainMenu.tsx"
Cohesion: 0.21
Nodes (7): tmpDir, tmpMuzzle, ownerReloadMul(), buildAmmoState(), WeaponAmmoState, WeaponOwnerParams, WeaponOwnerVisual

### Community 56 - "Working Style Guidelines"
Cohesion: 0.67
Nodes (3): Graphify Skill System, Project Knowledge Graph, Working Style Guidelines

### Community 64 - "cn.ts"
Cohesion: 0.18
Nodes (11): State diagram (boost), Tank Movement — Движение корпуса, Классы, Коллизии, Назначение, Нитро (BOOST), Параметры корпуса (каталог), Поворот (+3 more)

### Community 70 - "FlameParticlePool.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 71 - "Damage System — Централизованный урон"
Cohesion: 0.20
Nodes (10): applyDamage, applyHit / applySplashHit, applyKnockback, CombatSystem hooks, Damage System — Централизованный урон, damageBlock, Splash falloff (пушка), Классы (+2 more)

### Community 72 - "GameLoop.ts"
Cohesion: 0.22
Nodes (4): TankAnimationSystemStage, TankAnimationSystem, GameLoop, GameLoopDeps

### Community 73 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 74 - "Wave System — Волны и спавн"
Cohesion: 0.25
Nodes (8): Score за волну, Wave System — Волны и спавн, Классы, Количество ботов, Скейлинг бота (`spawnBot`), Состав (детерминированный preview), Точки спавна, Цикл

### Community 75 - "Weapon: Cannon «Смоки»"
Cohesion: 0.25
Nodes (8): Weapon: Cannon «Смоки», Выстрел, Классы, Скорость снаряда, Состояния магазина, Тюнинг (`WEAPON_TUNING.cannon`), Урон на попадании, Фэнтези

### Community 76 - "Weapon: Flamethrower «Firebird»"
Cohesion: 0.25
Nodes (8): Weapon: Flamethrower «Firebird», Визуал, Геометрия поражения, Классы, Состояния, Тюнинг (`WEAPON_TUNING.flamethrower`), Фэнтези, Энергия

### Community 77 - "AI Bots — Поведение противников"
Cohesion: 0.29
Nodes (7): AI Bots — Поведение противников, Fire, FSM, Preferred range, Классы, Подсистемы, Роли (`AIRole`)

### Community 78 - "Game Lifecycle — Режимы, пауза, death cam"
Cohesion: 0.29
Nodes (7): Auto-pause policy, Death → Game Over, Game Lifecycle — Режимы, пауза, death cam, GameMode, Классы, Порядок тика (playing, !paused), Флаги run

### Community 79 - "Health & Regen — Прочность и саморемонт"
Cohesion: 0.29
Nodes (7): Health & Regen — Прочность и саморемонт, Визуальные пороги, Классы, Модель HP, Получение урона, Саморемонт, Смерть игрока

### Community 80 - "Weapon: Railgun — Рельсотрон"
Cohesion: 0.29
Nodes (7): FSM, Weapon: Railgun — Рельсотрон, Аммуниция (HUD), Классы, Логика пробития (`executeFiring`), Тюнинг (`WEAPON_TUNING.railgun`), Фэнтези

### Community 81 - "waveBuffs.ts"
Cohesion: 0.48
Nodes (4): BuffableTank, applyWaveBuff(), BuffBaseSnapshot, clearWaveBuff()

### Community 82 - "Arena & Physics — Арена и коллизии"
Cohesion: 0.33
Nodes (6): Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы

### Community 83 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 84 - "Projectile System — Пул снарядов"
Cohesion: 0.33
Nodes (6): Behavior pattern, Projectile System — Пул снарядов, Shot lifecycle, Классы, Константы (`PROJECTILE`), Область применения

### Community 85 - "Scoring — Очки и убийства"
Cohesion: 0.33
Nodes (6): HUD, Kill path, RunState fields, Scoring — Очки и убийства, Классы, Константы (`SCORE`)

### Community 86 - "Tank Aim — Наведение башни"
Cohesion: 0.33
Nodes (6): Tank Aim — Наведение башни, Входы, Классы, Назначение, Направление выстрела, Формула (TankAimSystem)

### Community 88 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 89 - "Wave Buffs — Баффы между волнами"
Cohesion: 0.40
Nodes (5): Wave Buffs — Баффы между волнами, Классы, Когда, Опции (`WAVE_BUFF_OPTIONS`), Применение (`applyWaveBuff`)

## Knowledge Gaps
- **307 isolated node(s):** `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js`, `name`, `private` (+302 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `Nameplate` to `useFocusTrap`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `Nameplate`, `opencode.json`, `@eslint/js`, `globals`, `@types/react`, `@types/react-dom`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `typescript` connect `Nameplate` to `devDependencies`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `useMarkdownLinks`, `$schema`, `.opencode/plugins/graphify.js` to the rest of the system?**
  _307 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09366901147723065 - nodes in this community are weakly interconnected._
- **Should `PlayerFactory.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09758454106280193 - nodes in this community are weakly interconnected._
- **Should `EffectsPort` be split into smaller, more focused modules?**
  _Cohesion score 0.07881773399014778 - nodes in this community are weakly interconnected._