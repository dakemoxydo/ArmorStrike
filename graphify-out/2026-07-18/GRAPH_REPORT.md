# Graph Report - .  (2026-07-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1146 nodes · 2537 edges · 70 communities (47 shown, 23 thin omitted)
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
- CI Workflow Configuration
- ArmorStrike — 3D Бронетанковый Штурм (HTML)
- botStatsForWave
- ProjectileManager

## God Nodes (most connected - your core abstractions)
1. `AudioPort` - 38 edges
2. `EffectsPort` - 38 edges
3. `TankEntity` - 33 edges
4. `CameraRig` - 29 edges
5. `GameApi` - 29 edges
6. `Game` - 28 edges
7. `AudioFX` - 25 edges
8. `GameEvent` - 25 edges
9. `TankLike` - 24 edges
10. `Effects` - 24 edges

## Surprising Connections (you probably didn't know these)
- `ArmorStrike Project` --uses_style_framework--> `tailwindcss`  [EXTRACTED]
  README.md → package.json
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `HUD()` --calls--> `useGameHud()`  [EXTRACTED]
  src/components/HUD.tsx → src/hooks/useGameHud.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `WaveIntermissionProps` --references--> `GameApi`  [EXTRACTED]
  src/components/WaveIntermission.tsx → src/game/GameApi.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ArmorStrike Frontend Technology Stack** — react_19, typescript, three_js, vite [EXTRACTED 1.00]
- **Game Architecture Layer Separation** — src_core_catalog, src_game_game_ts, src_components_hud, src_components_garage, src_components_pause [EXTRACTED 0.90]

## Communities (70 total, 23 thin omitted)

### Community 0 - "ArenaBuilder.ts"
Cohesion: 0.07
Nodes (41): Arena, buildAtmosphere(), buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack() (+33 more)

### Community 1 - "simPorts.ts"
Cohesion: 0.05
Nodes (42): personaForRole(), roleForBot(), roleLabel(), BotEntry, BotSpawnDeps, disposeBots(), pickSpawnIndex(), SPAWN_POINTS (+34 more)

### Community 2 - "CameraRig.ts"
Cohesion: 0.06
Nodes (24): CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams, PREVIEW_POS (+16 more)

### Community 3 - "PlayerFactory.ts"
Cohesion: 0.06
Nodes (30): HULL_IDS, HULLS, TURRET_IDS, TURRETS, WEAPON_TUNING, HullDef, HullId, TurretDef (+22 more)

### Community 4 - "Projectile.ts"
Cohesion: 0.08
Nodes (24): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, CombatDeps, CombatSystem, PROJECTILE (+16 more)

### Community 5 - "EffectsPort"
Cohesion: 0.05
Nodes (3): CameraShake, Effects, EffectsPort

### Community 6 - "stages.ts"
Cohesion: 0.08
Nodes (26): rearPoint(), AmbientStage, _bd, BoostFxCtx, BoostStage, BotAiCtx, BotAiStage, _bv (+18 more)

### Community 7 - "ArmorStrike — Детальный разбор функционала проекта"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 9 - "GameEvent"
Cohesion: 0.19
Nodes (9): GameSimulation, ScalarCell, GameContext, GameModeControllerDeps, GarageBindingDeps, buildPlayerTank(), createWeapon(), WeaponFactoryDeps (+1 more)

### Community 10 - "physics.ts"
Cohesion: 0.17
Nodes (14): AimFireState, updateTurretAndFire(), findCoverPoint(), CoreAnim, RingAnim, _circleOut, clamp(), ColliderKind (+6 more)

### Community 11 - "GameApi"
Cohesion: 0.10
Nodes (6): GarageProps, HullCard(), HullCardProps, TurretCard(), TurretCardProps, GameApi

### Community 13 - "particles.ts"
Cohesion: 0.11
Nodes (5): FlashLight, FlashSystem, MuzzleSystem, ScorchMark, ScorchSystem

### Community 14 - "devDependencies"
Cohesion: 0.10
Nodes (21): eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @tailwindcss/vite (+13 more)

### Community 15 - "AI.ts"
Cohesion: 0.19
Nodes (13): AIBody, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA, aimErrorMulForRole(), coverHpFracForRole() (+5 more)

### Community 16 - "HudModel.ts"
Cohesion: 0.17
Nodes (5): GameLoopDeps, HudModel, RunState, HudUnit, MinimapStatic

### Community 19 - "WeaponDeps"
Cohesion: 0.18
Nodes (6): CannonWeapon, WeaponDeps, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 20 - "HUD.tsx"
Cohesion: 0.12
Nodes (12): HUD(), HudCrosshairProps, HudProps, HudRadarProps, HudVitals(), HudVitalsProps, MemoCrosshair, MemoFeed (+4 more)

### Community 21 - "useGameHud.ts"
Cohesion: 0.20
Nodes (12): HudScoreboard(), HudScoreboardProps, HudWeapon(), HudWeaponProps, ScoreRow, SNAP_INIT, useGameHud(), root (+4 more)

### Community 22 - "GameBootstrap.ts"
Cohesion: 0.22
Nodes (13): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), buildSimulationStages(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems() (+5 more)

### Community 23 - "SparkPool"
Cohesion: 0.17
Nodes (3): ParticleSystem, SparkPool, SparkSystem

### Community 24 - "FlamethrowerWeapon"
Cohesion: 0.16
Nodes (4): _wctx, WeaponHost, FlamethrowerWeapon, WeaponContext

### Community 25 - "types.ts"
Cohesion: 0.20
Nodes (8): tmpDir, tmpMuzzle, fillMuzzleAndAim(), buildAmmoState(), WeaponAmmoState, WeaponOwner, WeaponOwnerParams, WeaponOwnerVisual

### Community 26 - "RailgunWeapon"
Cohesion: 0.18
Nodes (3): RailgunWeapon, ownerReloadMul(), CombatPeer

### Community 28 - "WaveBuffId"
Cohesion: 0.18
Nodes (6): GameModeController, BuffableTank, applyWaveBuff(), BuffBaseSnapshot, clearWaveBuff(), WaveBuffId

### Community 29 - "RailgunBeamFx"
Cohesion: 0.21
Nodes (5): makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 30 - "ArmorStrike Project"
Cohesion: 0.15
Nodes (13): ArmorStrike Project, Loadout Data (localStorage), Graphics Quality Preset (localStorage), tailwindcss, typescript, vite, React 19, Pause Component (+5 more)

### Community 31 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 32 - "types.ts"
Cohesion: 0.32
Nodes (6): App(), BootErrorProps, GameMode, HudSnapshot, MinimapDynamic, isInteractiveKeyboardTarget()

### Community 33 - "wavePreview.ts"
Cohesion: 0.24
Nodes (11): BUFF_ICON, IntermissionPayload, WaveIntermission(), WaveIntermissionProps, WEAPON_ICON, AIRole, RoleTally, WAVE_BUFF_OPTIONS (+3 more)

### Community 35 - "FlamethrowerWeapon.ts"
Cohesion: 0.23
Nodes (6): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, resolveWeaponDamage()

### Community 36 - "minimapDraw.ts"
Cohesion: 0.25
Nodes (6): cacheByCanvas, CanvasCache, drawMinimap(), getCache(), paintStatics(), staticLayerKey()

### Community 38 - "Nameplate"
Cohesion: 0.25
Nodes (3): NameplateEntry, NameplateSystem, Nameplate

### Community 39 - "PhysicsSystem.ts"
Cohesion: 0.25
Nodes (8): _pa, _pb, resolveWalls(), _solid, solidColliders(), separateTankPair(), TankXZ, PhysicsBody

### Community 40 - "railgunChargeFx.ts"
Cohesion: 0.25
Nodes (5): applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle

### Community 41 - "RailgunWeapon.ts"
Cohesion: 0.22
Nodes (7): RailgunFireState, railgunShouldStartCharge(), BEAM_SPARK_COLOR, RailgunState, tmpDir, tmpMuzzle, tmpSpark

### Community 42 - "useFocusTrap"
Cohesion: 0.29
Nodes (5): GameOverScreen(), GameOverScreenProps, PauseMenu(), PauseMenuProps, useFocusTrap()

### Community 43 - "ErrorBoundary"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 44 - "GameLoop"
Cohesion: 0.25
Nodes (3): TankAnimationSystemStage, TankAnimationSystem, GameLoop

### Community 46 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 51 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 52 - "aiObstacle.ts"
Cohesion: 0.70
Nodes (4): AvoidState, computeObstacleAvoidance(), dirFree(), pointInCollider()

### Community 53 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 56 - "Working Style Guidelines"
Cohesion: 0.67
Nodes (3): Graphify Skill System, Project Knowledge Graph, Working Style Guidelines

### Community 69 - "ProjectileManager"
Cohesion: 0.25
Nodes (3): ProjectileManager, DeathTimerStage, SimContext

## Knowledge Gaps
- **195 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+190 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TypeScript` connect `ArmorStrike Project` to `PlayerFactory.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `EffectsPort` connect `EffectsPort` to `simPorts.ts`, `CameraRig.ts`, `PlayerFactory.ts`, `Projectile.ts`, `ProjectileManager`, `stages.ts`, `railgunChargeFx.ts`, `GameEvent`, `WeaponDeps`, `GameBootstrap.ts`, `types.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`, `ArmorStrike Project`, `@eslint/js`, `globals`, `@types/react`, `@types/react-dom`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _195 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07404437316225608 - nodes in this community are weakly interconnected._
- **Should `simPorts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05450372920252438 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06400409626216078 - nodes in this community are weakly interconnected._