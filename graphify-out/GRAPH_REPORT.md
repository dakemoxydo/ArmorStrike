# Graph Report - ArmorStrike  (2026-07-18)

## Corpus Check
- 202 files · ~59,571 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1270 nodes · 2993 edges · 80 communities (55 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb65bdd2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TankEntity
- ArenaBuilder.ts
- stages.ts
- CameraRig.ts
- AudioFX
- ArmorStrike — Детальный разбор функционала проекта
- catalog.ts
- TankVisual
- compilerOptions
- Effects
- index.ts
- types.ts
- CannonWeapon
- Game
- Game.ts
- Tank.ts
- RailgunWeapon.ts
- graphicsQuality.ts
- GameSimulation.ts
- particles.ts
- GameBootstrap.ts
- devDependencies
- FlamethrowerWeapon.ts
- dependencies
- ParticleEffects
- SparkPool
- PlayerController
- Nameplate
- FlamethrowerWeapon
- ErrorBoundary
- clamp
- scripts
- package.json
- ArmorStrike
- GameOverScreen.tsx
- FlashSystem
- RingSystem
- ScorchSystem
- SmokeSystem
- GameModeController
- graphify.js
- DamageSystem.test.ts
- vite.config.ts
- AGENTS.md
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh
- globals
- @tailwindcss/vite
- @types/node
- @types/react
- typescript-eslint
- vite
- eslint
- tuning.ts
- RunState.test.ts
- waves.test.ts
- physics.ts
- SKILL.md
- Caveman Help
- SKILL.md
- Caveman Help
- SKILL.md
- Caveman Help
- AIController
- effects.ts
- eslint
- PlayerFactory.ts
- railgunBlockers.ts
- eslint-plugin-react-refresh
- 2026-07-17
- Step 1. ANALYST (2026-07-17)
- task_plan.md
- BootError.tsx
- CLAUDE.md
- vitest
- botStatsForWave
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
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `WaveIntermissionProps` --references--> `GameApi`  [EXTRACTED]
  src/components/WaveIntermission.tsx → src/game/GameApi.ts
- `HudScoreboardProps` --references--> `ScoreRow`  [EXTRACTED]
  src/components/hud/HudScoreboard.tsx → src/game/types.ts
- `HudWeaponProps` --references--> `HudSnapshot`  [EXTRACTED]
  src/components/hud/HudWeapon.tsx → src/game/types.ts

## Import Cycles
- None detected.

## Communities (80 total, 25 thin omitted)

### Community 0 - "TankEntity"
Cohesion: 0.09
Nodes (21): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit(), HitEffect (+13 more)

### Community 1 - "ArenaBuilder.ts"
Cohesion: 0.10
Nodes (37): buildAtmosphere(), buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack(), buildRamps() (+29 more)

### Community 2 - "stages.ts"
Cohesion: 0.06
Nodes (29): rearPoint(), AmbientStage, _bd, BoostFxCtx, BoostStage, BotAiCtx, BotAiStage, buildSimulationStages() (+21 more)

### Community 3 - "CameraRig.ts"
Cohesion: 0.10
Nodes (15): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+7 more)

### Community 4 - "AudioFX"
Cohesion: 0.07
Nodes (27): Architecture Analysis — ArmorStrike (2026-07-18), Current shape (strengths), Explicitly NOT top problems anymore, Method, P0.1 — `TankEntity` residual fan-in (god data type), P0.2 — `SimContext` service-locator bag, P0.3 — `AIController` multi-responsibility blob, P0 — Architectural hubs (do first if continuing structural work) (+19 more)

### Community 5 - "ArmorStrike — Детальный разбор функционала проекта"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 6 - "catalog.ts"
Cohesion: 0.08
Nodes (30): PhysicsSystemStage, _pa, _pb, PhysicsSystem, resolveWalls(), _solid, solidColliders(), TankAimSystem (+22 more)

### Community 7 - "TankVisual"
Cohesion: 0.18
Nodes (3): FlamethrowerWeapon, buildAmmoState(), WeaponContext

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 9 - "Effects"
Cohesion: 0.05
Nodes (4): AmbientDust, CameraShake, Effects, EffectsPort

### Community 10 - "index.ts"
Cohesion: 0.07
Nodes (29): C1. Death softlock — auto-pause freezes game-over — **FIXED**, C2. Cannon projectiles never reduce tank HP — **FIXED**, C3. Railgun bots fire once then soft-stop — **FIXED**, CRITICAL — all fixed, Final status, L1. `applyDamage(0)` presentation (standalone residual if knock-only helpers remain), L2. Flamethrower `reloading` when energy < 10, L3. Flame restart dead-zone energy (0, 5] (+21 more)

### Community 11 - "types.ts"
Cohesion: 0.19
Nodes (7): buildDerivedSystems(), buildGameLoop(), HudModel, createWeapon(), RunState, HudUnit, ScoreRow

### Community 12 - "CannonWeapon"
Cohesion: 0.20
Nodes (5): CannonWeapon, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 14 - "Game.ts"
Cohesion: 0.14
Nodes (15): HUD(), FeedEntry, HudFeedProps, HudScoreboard(), HudScoreboardProps, HudWeapon(), HudWeaponProps, WEAPONS (+7 more)

### Community 15 - "Tank.ts"
Cohesion: 0.21
Nodes (13): AimFireState, updateTurretAndFire(), findCoverPoint(), aimTolerance(), _circleOut, clamp(), ColliderKind, ColliderOpts (+5 more)

### Community 17 - "graphicsQuality.ts"
Cohesion: 0.17
Nodes (14): bootstrapGame(), buildEventBus(), buildRenderWorld(), registerWindowHandlers(), getQualityPreset(), loadQuality(), nextQuality(), ORDER (+6 more)

### Community 18 - "GameSimulation.ts"
Cohesion: 0.23
Nodes (8): GameSimulation, ScalarCell, GameContext, GameLoopDeps, GameModeControllerDeps, GarageBindingDeps, WeaponFactoryDeps, GameEvent

### Community 19 - "particles.ts"
Cohesion: 0.08
Nodes (11): CoreAnim, FlashLight, MuzzleSystem, ParticleSystem, RingAnim, ScorchMark, ScorchSystem, SmokePuff (+3 more)

### Community 20 - "GameBootstrap.ts"
Cohesion: 0.20
Nodes (3): _wctx, WeaponHost, Weapon

### Community 21 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, @eslint/js, devDependencies, eslint, @eslint/js, tailwindcss, @types/react-dom, @types/three (+9 more)

### Community 22 - "FlamethrowerWeapon.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 23 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 25 - "SparkPool"
Cohesion: 0.18
Nodes (13): AIBody, AICtx, AIPersona, AIState, AITarget, DEFAULT_PERSONA, aimErrorMulForRole(), coverHpFracForRole() (+5 more)

### Community 27 - "Nameplate"
Cohesion: 0.20
Nodes (6): WEAPON_TUNING, makeBeamMesh(), RailgunBeamFx, tmpEnd, tmpLook, tmpMid

### Community 28 - "FlamethrowerWeapon"
Cohesion: 0.20
Nodes (9): tmpDir, tmpMuzzle, fillMuzzleAndAim(), ownerReloadMul(), WeaponAmmoState, WeaponDeps, WeaponOwner, WeaponOwnerParams (+1 more)

### Community 29 - "ErrorBoundary"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 31 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 32 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 33 - "ArmorStrike"
Cohesion: 0.40
Nodes (4): Architecture (short), ArmorStrike, Controls, Quick start

### Community 37 - "ScorchSystem"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 39 - "GameModeController"
Cohesion: 0.53
Nodes (4): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt()

### Community 41 - "DamageSystem.test.ts"
Cohesion: 0.06
Nodes (49): HullCard(), HullCardProps, MainMenuProps, TurretCard(), TurretCardProps, HULL_IDS, HULLS, TURRET_IDS (+41 more)

### Community 43 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): Everyday commands, Graphify, Working style

### Community 45 - "eslint-plugin-react-refresh"
Cohesion: 0.23
Nodes (6): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, resolveWeaponDamage()

### Community 46 - "globals"
Cohesion: 0.18
Nodes (10): C1, C2+M2, C3, Cycle reports (summary), Cycles, Final verification, Inventory, M1–M12 (+2 more)

### Community 52 - "eslint"
Cohesion: 0.17
Nodes (8): cacheByCanvas, CanvasCache, drawMinimap(), getCache(), paintStatics(), staticLayerKey(), MinimapDynamic, MinimapStatic

### Community 56 - "RunState.test.ts"
Cohesion: 0.25
Nodes (3): TankAnimationSystemStage, TankAnimationSystem, GameLoop

### Community 57 - "waves.test.ts"
Cohesion: 0.14
Nodes (12): applyRailgunChargingFx(), applyRailgunCooldownChargeFx(), applyRailgunIdleChargeFx(), tmpDir, tmpMuzzle, RailgunFireState, railgunShouldStartCharge(), BEAM_SPARK_COLOR (+4 more)

### Community 58 - "physics.ts"
Cohesion: 0.12
Nodes (11): HudCrosshairProps, HudProps, HudRadarProps, HudVitals(), HudVitalsProps, MemoCrosshair, MemoFeed, MemoRadar (+3 more)

### Community 59 - "SKILL.md"
Cohesion: 0.25
Nodes (7): Final report — functional bugfix, Fixed (critical), Fixed (medium), Key files, Remaining, Summary, Verification

### Community 61 - "SKILL.md"
Cohesion: 0.29
Nodes (6): Active cycle, Functional bugfix — ArmorStrike, Goal, Inventory, Rules, Status

### Community 62 - "Caveman Help"
Cohesion: 0.27
Nodes (5): Arena, CombatDeps, CombatSystem, ProjectileManager, SimContext

### Community 64 - "Caveman Help"
Cohesion: 0.29
Nodes (6): 2026-07-18, 2026-07-18 session 2 — implement (behavior preserved), Done, Progress — Architecture refactor, Residual (optional later), Verify

### Community 65 - "AIController"
Cohesion: 0.29
Nodes (6): Goal, Phase 1 deliverable, Phases, Rules, Status: **implementation complete** (behavior-preserving structural pass), Task Plan: Architectural refactor

### Community 66 - "effects.ts"
Cohesion: 0.14
Nodes (3): buildCoreSubsystems(), PlayerController, ControllableTank

### Community 67 - "eslint"
Cohesion: 0.70
Nodes (4): AvoidState, computeObstacleAvoidance(), dirFree(), pointInCollider()

### Community 68 - "PlayerFactory.ts"
Cohesion: 0.11
Nodes (8): BotEntry, disposeBots(), pickSpawnIndex(), Nameplate, TankEntity, WaveContext, WaveManager, tallyWeapons()

### Community 69 - "railgunBlockers.ts"
Cohesion: 0.60
Nodes (3): segmentHitT(), nearestShotBlockerDist(), ShotBlockerHit

### Community 83 - "2026-07-17"
Cohesion: 0.20
Nodes (9): Deferred, Done cycles, Done cycles, Plan status, Progress — Stepwise Refactor, Re-analysis, Session 2026-07-17 (session 1), Session 2026-07-17 (session 2 — goal loop) (+1 more)

### Community 86 - "Step 1. ANALYST (2026-07-17)"
Cohesion: 0.18
Nodes (10): Completed prior cycles (session 1), CRITICAL, Findings — Stepwise Refactor (final state), LOW / melочь (out of critical/medium clear scope), MEDIUM — deferred (behavior risk; needs user OK), MEDIUM — resolved this session, Prioritized problem list — final, Re-analysis snapshot (2026-07-17 session 2) (+2 more)

### Community 87 - "task_plan.md"
Cohesion: 0.29
Nodes (6): Deferred (not auto-fixed), Goal, Phases, Residual low (optional later), Status: **complete** (critical + medium structural cleared; P5 deferred with reason), Task Plan: Stepwise structural refactor

### Community 89 - "BootError.tsx"
Cohesion: 0.12
Nodes (16): App(), BootErrorProps, GameOverScreen(), GameOverScreenProps, PauseMenu(), PauseMenuProps, BUFF_ICON, IntermissionPayload (+8 more)

## Knowledge Gaps
- **278 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `name`, `private`, `version` (+273 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Effects` connect `Effects` to `ParticleEffects`, `types.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `AudioPort` connect `tuning.ts` to `stages.ts`, `GameOverScreen.tsx`, `PlayerFactory.ts`, `DamageSystem.test.ts`, `types.ts`, `graphicsQuality.ts`, `GameSimulation.ts`, `FlamethrowerWeapon`, `Caveman Help`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `EffectsPort` connect `Effects` to `TankEntity`, `stages.ts`, `CameraRig.ts`, `catalog.ts`, `DamageSystem.test.ts`, `types.ts`, `GameSimulation.ts`, `waves.test.ts`, `FlamethrowerWeapon`, `Caveman Help`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `name` to the rest of the system?**
  _278 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TankEntity` be split into smaller, more focused modules?**
  _Cohesion score 0.09098639455782313 - nodes in this community are weakly interconnected._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09549549549549549 - nodes in this community are weakly interconnected._
- **Should `stages.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06471631205673758 - nodes in this community are weakly interconnected._