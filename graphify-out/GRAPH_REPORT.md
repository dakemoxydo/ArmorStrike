# Graph Report - ArmorStrike  (2026-08-24)

## Corpus Check
- 278 files · ~128,687 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1818 nodes · 4391 edges · 139 communities (85 shown, 54 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `707416ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GameSimulation
- CameraRig.ts
- RenderWorld
- Game
- Projectile.ts
- matchConfig.ts
- physics.ts
- rosterSpawn.ts
- Effects
- TankEntity
- shared.ts
- compilerOptions
- WEAPON_TUNING
- textures/index.ts
- ArmorStrike — Project Rules
- TankFactory.ts
- Classic Match Modes — DM / TDM / Capture Point
- devDependencies
- ArmorStrike — Autonomous Backlog
- Match Framework — Режимы, roster, respawn, win
- HUD.tsx
- AudioFX
- game/types.ts
- particles.ts
- Core Architecture — ArmorStrike
- factoryMap.ts
- EffectsPort
- Nameplate
- City Level Design — Grid + Districts + Overpass
- GameOverScreen.tsx
- Maps — Мульти-карты и выбор арены
- MatchRuntime.ts
- vite
- AudioPort
- AUTONOMOUS_PROMPT.md
- RespawnController.ts
- ParticleEffects
- FlamethrowerWeapon.ts
- captureLogic.ts
- SparkPool
- weapons/types.ts
- CannonWeapon
- KillStreakTracker.ts
- draw-call-census.ts
- dependencies
- cityMap.ts
- GameBootstrap.ts
- Standard Match — каркас матча
- ErrorBoundary
- scripts
- Wave System
- PlayerController
- TimeScale
- Tank Movement — Движение корпуса
- Village Level Design — Square + Barns + Paddocks
- Tank Aim — Наведение башни
- Standard Resources — ArmorStrike
- WorldStages.ts
- ArmorStrike — Audit (ошибки и недочёты)
- RailgunWeapon
- Damage System — Централизованный урон
- Core Patterns — ArmorStrike
- Standard: UI, HUD & Input
- Standard: Weapons, Projectiles & Damage
- catalog.ts
- WeaponDeps
- MuzzleSystem
- Standard: Tank Entity & Systems
- ScorchSystem
- Player Controls — Управление игроком
- 00_Index.md
- stages/index.ts
- FlameParticlePool.ts
- eslint-plugin-react-hooks
- Weapon
- eslint-plugin-react-refresh
- Garage Loadout — Сборка танка
- App.tsx
- CoreSystem
- BotAiStage.ts
- RingSystem
- SmokeSystem
- RailgunWeapon.ts
- ArmorStrike — Autonomous Progress Log
- GDD — Approved Mechanics (ArmorStrike)
- @types/react
- Capture Point — Захват точки
- Engage State (FSM)
- tailwindcss
- package.json
- @types/react-dom
- @types/three
- screenshot.sh
- typescript
- FlashSystem
- vite.config.ts
- aiObstacle Module (computeObstacleAvoidance)
- globals
- TeamId
- tuning.ts
- villageMap.ts
- MapId
- ArenaBuilder.ts
- AI Bots System
- Assault Role
- Combat System
- AI Bots — Поведение противников (Документ)
- GameApi
- Elite Role
- Damage System
- GameMode Type
- Wave System
- CI Workflow Configuration
- ArmorStrike — 3D Бронетанковый Штурм (HTML)
- MapSelect Overlay
- HudSnapshot
- Railgun Finite State Machine
- Auto-pause Policy Function
- Sniper Role
- GDD Drafts Directory
- simPorts.ts
- Standard Role
- WEAPON_TUNING Flamethrower Config
- @tailwindcss/vite
- CombatSystem
- TankAnimationSystem.ts
- Arena_Physics.md
- Tank.ts
- Approved Documentation Directory
- Loadout Data (localStorage)
- Graphics Quality Preset (localStorage)
- game/constants.ts
- Three.js
- TankVisual
- disposeObject3D
- hexTexture

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
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `ModeOption` --references--> `MatchModeId`  [EXTRACTED]
  src/components/ModeSelect.tsx → src/game/match/matchTypes.ts
- `ModeSelectProps` --references--> `MatchModeId`  [EXTRACTED]
  src/components/ModeSelect.tsx → src/game/match/matchTypes.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `HudWeaponProps` --references--> `HudSnapshot`  [EXTRACTED]
  src/components/hud/HudWeapon.tsx → src/game/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (139 total, 54 thin omitted)

### Community 0 - "GameSimulation"
Cohesion: 0.11
Nodes (8): GameSimulation, buildSimulationStages(), GameContext, GameLoop, GameLoopDeps, GameModeControllerDeps, GarageBindingDeps, GameEvent

### Community 1 - "CameraRig.ts"
Cohesion: 0.09
Nodes (18): AIM_SENS_X, AIM_SENS_Y, CameraLookState, DEFAULT_CAM_PITCH, PITCH_MAX, PITCH_MIN, CameraMode, GarageCameraMode (+10 more)

### Community 2 - "RenderWorld"
Cohesion: 0.08
Nodes (20): AtmospherePreset, ATMOSPHERES, DUSK, getAtmosphere(), NIGHT, getQualityPreset(), loadQuality(), nextQuality() (+12 more)

### Community 4 - "Projectile.ts"
Cohesion: 0.09
Nodes (21): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit(), HitEffect (+13 more)

### Community 5 - "matchConfig.ts"
Cohesion: 0.23
Nodes (9): BASE, configForMode(), DEFAULT_MATCH_MODE, MatchConfig, evaluateMatchEnd(), leadingPersonal(), teamLead(), WinEvalInput (+1 more)

### Community 6 - "physics.ts"
Cohesion: 0.07
Nodes (44): WeaponType, AIBody, AIController, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA (+36 more)

### Community 7 - "rosterSpawn.ts"
Cohesion: 0.19
Nodes (19): buildBotStyle(), aimErrorMulForRole(), personaForRole(), ROLE_LABEL, roleForBot(), roleLabel(), applyTeamRing(), botStyleColor() (+11 more)

### Community 8 - "Effects"
Cohesion: 0.05
Nodes (10): AmbientDust, CameraShake, Effects, CHAR_MAT, EMBER_GEO, HULL_GEO, TRACK_GEO, TURRET_GEO (+2 more)

### Community 9 - "TankEntity"
Cohesion: 0.07
Nodes (3): BotEntry, RosterSpawnResult, TankEntity

### Community 10 - "shared.ts"
Cohesion: 0.21
Nodes (10): markShared(), Shared, unmarkShared(), AssetManager, cloneWithOwnMaterials(), matsOf(), texturesOf(), cache (+2 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (27): DOM, DOM.Iterable, ES2020, node, src, vite/client, vite.config.ts, compilerOptions (+19 more)

### Community 12 - "WEAPON_TUNING"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 13 - "textures/index.ts"
Cohesion: 0.21
Nodes (21): buildScattered(), createStyleMaterials(), barrelTexture(), containerTexture(), crateTexture(), glowTexture(), scorchTexture(), smokeTexture() (+13 more)

### Community 14 - "ArmorStrike — Project Rules"
Cohesion: 0.15
Nodes (12): 1. GDD Lifecycle, 2. Architecture (Auto-Extraction), 3. Graphify, 4. Hotfix, 5. Working Style, 6. Stack, ArmorStrike — Project Rules, Phase A → B: Approval Signal (+4 more)

### Community 15 - "TankFactory.ts"
Cohesion: 0.16
Nodes (14): TankBuildContext, buildHull(), normalizeHullModel(), prepareTexturedModel(), HULL_CONFIG, HULL_TURRET_Y, MODEL_HULL_TARGET_LENGTH, MODELS_ENABLED (+6 more)

### Community 16 - "Classic Match Modes — DM / TDM / Capture Point"
Cohesion: 0.08
Nodes (25): 1. Intent, 2.1 Deathmatch (DM) — «Бой насмерть», 2.2 Team Deathmatch (TDM) — «Командный бой», 2.3 Capture Point (CP) — «Захват точки», 2. Режимы (предложение игрока + уточнения GD), 3.1 Новые понятия, 3.2 Что появляется у каждого танка, 3.3 Respawn (общий) (+17 more)

### Community 17 - "devDependencies"
Cohesion: 0.13
Nodes (15): eslint, @eslint/js, devDependencies, eslint, @eslint/js, @types/node, typescript-eslint, vite-plugin-singlefile (+7 more)

### Community 18 - "ArmorStrike — Autonomous Backlog"
Cohesion: 0.14
Nodes (13): [A] BUGS & STABILITY, ArmorStrike — Autonomous Backlog, [B] PERFORMANCE, Bootstrap notes (2026-08-24, iter #1), [C] CORE GAMEPLAY, [D] ENEMY AI, [E] RENDERING & BEAUTY, [F] PHYSICS & FEEL (+5 more)

### Community 19 - "Match Framework — Режимы, roster, respawn, win"
Cohesion: 0.17
Nodes (12): AI focus (P2), Capture (P4), Classes, Kill credit, Match Framework — Режимы, roster, respawn, win, Respawn, Results UI (P6), Spawn tables (+4 more)

### Community 20 - "HUD.tsx"
Cohesion: 0.06
Nodes (41): React 19, HUD(), HudCrosshair(), HudCrosshairProps, FeedEntry, HudFeed(), HudFeedProps, HudProps (+33 more)

### Community 22 - "game/types.ts"
Cohesion: 0.18
Nodes (13): bakeSweep(), cacheByCanvas, CanvasCache, drawMinimap(), getCache(), MAP_HALF, paintStatics(), staticLayerKey() (+5 more)

### Community 23 - "particles.ts"
Cohesion: 0.23
Nodes (6): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark, SmokePuff

### Community 24 - "Core Architecture — ArmorStrike"
Cohesion: 0.10
Nodes (20): 1. Entity + systems, 2. Weapon strategy, 3. Damage ports, 4. Ports for I/O, 5. Event bus, 6. Run state, 7. Match modes (not app modes), Bootstrap composition (+12 more)

### Community 25 - "factoryMap.ts"
Cohesion: 0.20
Nodes (15): buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFactoryContent(), buildFoundry(), buildGantryCrane(), buildPipeRack(), buildRamps() (+7 more)

### Community 28 - "City Level Design — Grid + Districts + Overpass"
Cohesion: 0.20
Nodes (10): City Level Design — Grid + Districts + Overpass, Code map, Cover hierarchy, Districts (flavor props, cover density balanced ±20%), Implemented layout (code), Overpass (EW spine south of center), Shared scale (arena 300), Street graph (world, arena half = 150) (+2 more)

### Community 29 - "GameOverScreen.tsx"
Cohesion: 0.31
Nodes (9): GameOverScreen(), GameOverScreenProps, MatchEndReason, formatKd(), formatMatchClock(), modeLabelRu(), resultsHeadline(), ResultsHeadlineInput (+1 more)

### Community 30 - "Maps — Мульти-карты и выбор арены"
Cohesion: 0.25
Nodes (8): Known gaps / balance notes, Map IDs, Maps — Мульти-карты и выбор арены, Выбор карты (UI), Классы / API, Пересборка, Размер арены (глобальный), Структура сборки

### Community 31 - "MatchRuntime.ts"
Cohesion: 0.19
Nodes (7): BotRoster, MatchRuntime, MatchRuntimeHooks, MatchResult, RespawnHooks, PersonalStanding, RunState

### Community 34 - "AUTONOMOUS_PROMPT.md"
Cohesion: 0.09
Nodes (21): ANTI-PATTERNS YOU MUST AVOID, BACKLOG BOOTSTRAP (run once at the very start), BASELINE (verify at iteration #1, record actual numbers in PROGRESS.md), CORE RULES (NON-NEGOTIABLE), EMERGENCY PROCEDURES, FIRST ACTION (only when PROGRESS.md does not exist yet), GDD GUARDRAILS (autonomy boundary — hard limit), PHASE 1 — ORIENT (≤2 min) (+13 more)

### Community 35 - "RespawnController.ts"
Cohesion: 0.25
Nodes (8): applyRespawnCombat(), canRespawn(), Respawnable, FFA_FALLBACK, RespawnController, restoreDeathVisuals(), respawnPoolFor(), pickRespawnPoint()

### Community 37 - "FlamethrowerWeapon.ts"
Cohesion: 0.23
Nodes (6): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, resolveWeaponDamage()

### Community 38 - "captureLogic.ts"
Cohesion: 0.11
Nodes (20): COLORS, CAPTURE_ANCHORS, CaptureAnchor, zonesForMap(), CaptureController, CAPTURE, CaptureOwner, CapturePointId (+12 more)

### Community 40 - "weapons/types.ts"
Cohesion: 0.21
Nodes (7): tmpDir, tmpMuzzle, ownerReloadMul(), buildAmmoState(), WeaponAmmoState, WeaponOwnerParams, WeaponOwnerVisual

### Community 41 - "CannonWeapon"
Cohesion: 0.20
Nodes (5): CannonWeapon, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 42 - "KillStreakTracker.ts"
Cohesion: 0.33
Nodes (3): KillStreakTracker, STREAK_LABELS, StreakLabel

### Community 43 - "draw-call-census.ts"
Cohesion: 0.40
Nodes (3): ctx2d, GeoStat, gradient

### Community 44 - "dependencies"
Cohesion: 0.22
Nodes (9): lucide-react, dependencies, lucide-react, react, react-dom, three, react, react-dom (+1 more)

### Community 45 - "cityMap.ts"
Cohesion: 0.26
Nodes (24): addCityRamp(), billboard(), buildCityBlocks(), buildCityContent(), buildCityDistricts(), buildCityOverpass(), buildCityPlaza(), buildCityRamps() (+16 more)

### Community 46 - "GameBootstrap.ts"
Cohesion: 0.23
Nodes (11): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+3 more)

### Community 47 - "Standard Match — каркас матча"
Cohesion: 0.17
Nodes (12): 10. CP objective AI (P5), 11. Results & balance (P6), 1. App GameMode ≠ MatchModeId, 2. Pure helpers + thin runtime, 3. Damage gates (central), 4. Kill credit path, 5. Lifecycle, 6. Roster (+4 more)

### Community 48 - "ErrorBoundary"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

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

### Community 56 - "Standard Resources — ArmorStrike"
Cohesion: 0.50
Nodes (4): 1. Textures: memoized factories + `markShared` ownership, 2. Zone views: anchor-keyed invalidation, 3. Draw-call census: измеряй перед тем как оптимизировать, Standard Resources — ArmorStrike

### Community 57 - "WorldStages.ts"
Cohesion: 0.09
Nodes (16): Arena, disposeArenaSubtree(), ProjectileManager, invalidateSolidColliderCache(), StageDeps, NameplateMap, _bd, _bv (+8 more)

### Community 58 - "ArmorStrike — Audit (ошибки и недочёты)"
Cohesion: 0.13
Nodes (14): 1. Базлайн верификации, 2. Ошибки, 3. Недочёты (гигиена), 4. Проверено — НЕ проблемы (чтобы не переисследовать), 5. Рекомендованный порядок работ, 6. Итог работ (2026-08-23) — исправлены все пункты (детали в таблице; H-3/H-4 — с оговорками), 7. Второй перф-проход (2026-08-23, вечер) — остаточные аллокации кадра, 8. Третий перф-проход (2026-08-23, ночь) — texture cache + HUD/миникарта (+6 more)

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

### Community 64 - "catalog.ts"
Cohesion: 0.17
Nodes (16): HullCardProps, MainMenuProps, TurretCardProps, HULL_IDS, TURRET_IDS, HullDef, HullId, TurretDef (+8 more)

### Community 65 - "WeaponDeps"
Cohesion: 0.17
Nodes (3): FlamethrowerWeapon, WeaponContext, WeaponDeps

### Community 67 - "Standard: Tank Entity & Systems"
Cohesion: 0.20
Nodes (10): 1. Entity = id + composition, 2. Flat port projections, 3.1 Hybrid mesh: процедурный код + GLB (система отключена), 3.2 Владение GPU-ресурсами (общие vs per-instance), 3. Factory (единый путь сборки), 4. Sim systems (ISP), 5. Damage entry на entity, 6. Lifecycle / dispose (+2 more)

### Community 69 - "Player Controls — Управление игроком"
Cohesion: 0.25
Nodes (8): Player Controls — Управление игроком, Pointer Lock, Заметки дизайна, Классы и файлы, Логика прицела, Назначение, Состояния, Схема управления

### Community 70 - "00_Index.md"
Cohesion: 0.17
Nodes (13): Health & Regen — Прочность и саморемонт, Team Deathmatch Game Design Document, Wave Buffs Feature, Wave System — Волны и спавн, Weapon Cannon «Смоки», Weapon Flamethrower Firebird, Railgun Weapon (Рельсотрон), Game Lifecycle (+5 more)

### Community 71 - "stages/index.ts"
Cohesion: 0.13
Nodes (18): PlayerInputStage, TankAnimationSystemStage, TankFxSystemStage, TankSystemStage, WeaponSystemStage, FrameContext, ScalarCell, SimSystem (+10 more)

### Community 72 - "FlameParticlePool.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 74 - "Weapon"
Cohesion: 0.20
Nodes (3): _wctx, WeaponHost, Weapon

### Community 76 - "Garage Loadout — Сборка танка"
Cohesion: 0.33
Nodes (6): Garage Loadout — Сборка танка, UI / persistence, Классы, Модель сборки, Параметры entity, Стили

### Community 77 - "App.tsx"
Cohesion: 0.13
Nodes (15): BootError(), BootErrorProps, Garage(), HullCard(), MainMenu(), ModeOption, MODES, ModeSelect() (+7 more)

### Community 79 - "BotAiStage.ts"
Cohesion: 0.25
Nodes (11): BotAiStage, deadStub(), syncZoneViews(), pickAiFocus(), isObjectiveDuty(), moveHintForZone(), ObjectiveZoneView, pickObjectiveZone() (+3 more)

### Community 82 - "RailgunWeapon.ts"
Cohesion: 0.15
Nodes (14): BARREL_REST_Y, fillMuzzleAndAim(), applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle, railgunShouldStartCharge() (+6 more)

### Community 83 - "ArmorStrike — Autonomous Progress Log"
Cohesion: 0.12
Nodes (16): ArmorStrike — Autonomous Progress Log, Baseline (recorded 2026-08-24, iter #1), Iteration 1 — 2026-08-24 · [A] BUGS & STABILITY, Iteration 2 — 2026-08-24 · [J] CODE QUALITY, Iteration 3 — 2026-08-24 · [J] CODE QUALITY, Iteration 4 — 2026-08-24 · [B] PERFORMANCE, Iteration 5 — 2026-08-24 · [B] PERFORMANCE, Iteration 6 — 2026-08-24 · [A]+[B] AUDITS (both clean) (+8 more)

### Community 84 - "GDD — Approved Mechanics (ArmorStrike)"
Cohesion: 0.40
Nodes (5): GDD — Approved Mechanics (ArmorStrike), Архитектура, Жанр и петля, Источники истины в коде, Навигация

### Community 86 - "Capture Point — Захват точки"
Cohesion: 0.29
Nodes (7): Acceptance (P4–P5), Capture Point — Захват точки, Classes, Objective AI (P5), Per-map anchors, Визуал / UI, Правила (as shipped)

### Community 87 - "Engage State (FSM)"
Cohesion: 0.50
Nodes (4): aiCover Module (findCoverPoint), aiTuning Module (preferredRange, aimTolerance, steering), Engage State (FSM), losClear Module (line of sight через colliders)

### Community 90 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 99 - "TeamId"
Cohesion: 0.20
Nodes (12): allyLineBlockers(), FocusCandidate, FocusSelf, isLineBlocker(), PickAiFocusOpts, PickAiFocusResult, TeamId, isAlly() (+4 more)

### Community 100 - "tuning.ts"
Cohesion: 0.26
Nodes (9): TankCombatTimersSystem, tmpV, BOOST_JET_HEIGHT, BOOST_JET_OFFSET, DUST_HEIGHT, DUST_SPREAD, HEAL_DELAY, HEAL_PER_SEC (+1 more)

### Community 101 - "villageMap.ts"
Cohesion: 0.22
Nodes (22): buildVillageBanners(), buildVillageBarns(), buildVillageContent(), buildVillageFences(), buildVillageFireflies(), buildVillageFoliage(), buildVillageHayPlatform(), buildVillageHouses() (+14 more)

### Community 102 - "MapId"
Cohesion: 0.17
Nodes (12): ICONS, MapSelect(), MapSelectProps, GameModeController, DEFAULT_MAP_ID, isMapId(), MAP_IDS, MapDef (+4 more)

### Community 103 - "ArenaBuilder.ts"
Cohesion: 0.14
Nodes (7): ArenaShellTheme, buildArenaShell(), buildArena(), makeContext(), ArenaEffects, SmokeSprite, ARENA

### Community 108 - "GameApi"
Cohesion: 0.27
Nodes (3): App(), GarageProps, GameApi

### Community 118 - "HudSnapshot"
Cohesion: 0.22
Nodes (5): TurretCard(), getWeaponMeta(), buildGameLoop(), HudUnit, HudSnapshot

### Community 123 - "simPorts.ts"
Cohesion: 0.22
Nodes (10): TankAimSystem, TankMotionSystem, TankPresentationSystem, LiveTank, AimBody, CombatTimerBody, MotionBody, PresentationBody (+2 more)

### Community 128 - "TankAnimationSystem.ts"
Cohesion: 0.38
Nodes (3): animateDeath(), tintBody(), AnimBody

### Community 129 - "Arena_Physics.md"
Cohesion: 0.18
Nodes (10): Arena Physics, Damage System, Arena & Physics — Арена и коллизии, Collider model, Destructible blocks, Resolve, Арена, Классы (+2 more)

### Community 130 - "Tank.ts"
Cohesion: 0.21
Nodes (9): BuffBaseSnapshot, createTankFxState(), TankBuffState, TankCombatState, TankMotionState, FxBody, TankFxState, TankParams (+1 more)

### Community 134 - "game/constants.ts"
Cohesion: 0.27
Nodes (7): BOOST, PROJECTILE, SCORE, TANK, BOT_NORMAL, applyPlayerKillScore(), KillScoreState

### Community 138 - "hexTexture"
Cohesion: 0.52
Nodes (4): buildAtmosphere(), buildCityAtmosphere(), buildVillageAtmosphere(), hexTexture()

## Knowledge Gaps
- **441 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+436 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `typescript` to `catalog.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `vite`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@types/react`, `tailwindcss`, `typescript`, `package.json`, `@types/react-dom`, `@types/three`, `@tailwindcss/vite`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `typescript` connect `typescript` to `devDependencies`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _441 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GameSimulation` be split into smaller, more focused modules?**
  _Cohesion score 0.11396011396011396 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09268707482993198 - nodes in this community are weakly interconnected._
- **Should `RenderWorld` be split into smaller, more focused modules?**
  _Cohesion score 0.0815686274509804 - nodes in this community are weakly interconnected._