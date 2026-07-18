# Graph Report - ArmorStrike  (2026-07-18)

## Corpus Check
- 180 files · ~51,066 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1097 nodes · 2619 edges · 79 communities (49 shown, 30 thin omitted)
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
- WeaponCatalog.ts
- 2026-07-17
- Step 1. ANALYST (2026-07-17)
- task_plan.md
- BootError.tsx
- CLAUDE.md
- vitest
- botStatsForWave
- globals

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 51 edges
2. `AudioFX` - 39 edges
3. `Effects` - 34 edges
4. `CameraRig` - 30 edges
5. `Arena` - 29 edges
6. `Game` - 28 edges
7. `GameApi` - 28 edges
8. `HullId` - 27 edges
9. `TurretId` - 27 edges
10. `TankLike` - 25 edges

## Surprising Connections (you probably didn't know these)
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `HudScoreboardProps` --references--> `ScoreRow`  [EXTRACTED]
  src/components/hud/HudScoreboard.tsx → src/game/types.ts
- `HudWeaponProps` --references--> `HudSnapshot`  [EXTRACTED]
  src/components/hud/HudWeapon.tsx → src/game/types.ts
- `resolveCannonDirectHit()` --calls--> `applyHit()`  [EXTRACTED]
  src/__tests__/ProjectileDamage.test.ts → src/game/engine/applyHit.ts
- `GameOverScreen()` --calls--> `useFocusTrap()`  [EXTRACTED]
  src/components/GameOverScreen.tsx → src/hooks/useFocusTrap.ts

## Import Cycles
- None detected.

## Communities (79 total, 30 thin omitted)

### Community 0 - "TankEntity"
Cohesion: 0.09
Nodes (22): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit(), HitEffect (+14 more)

### Community 1 - "ArenaBuilder.ts"
Cohesion: 0.09
Nodes (39): buildAtmosphere(), buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack(), buildRamps() (+31 more)

### Community 2 - "stages.ts"
Cohesion: 0.15
Nodes (8): AmbientStage, BotAiStage, EngineAudioStage, PlayerInputStage, ProjectileStage, SimSystem, TankAnimationSystemStage, WavesStage

### Community 3 - "CameraRig.ts"
Cohesion: 0.10
Nodes (12): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+4 more)

### Community 4 - "AudioFX"
Cohesion: 0.53
Nodes (5): TankStyle, buildTankMesh(), TankBuildContext, buildHull(), buildTurret()

### Community 5 - "ArmorStrike — Детальный разбор функционала проекта"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 6 - "catalog.ts"
Cohesion: 0.08
Nodes (31): AIBody, AIController, AICtx, aimTolerance(), AIPersona, AIState, AITarget, DEFAULT_PERSONA (+23 more)

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 10 - "index.ts"
Cohesion: 0.07
Nodes (29): C1. Death softlock — auto-pause freezes game-over — **FIXED**, C2. Cannon projectiles never reduce tank HP — **FIXED**, C3. Railgun bots fire once then soft-stop — **FIXED**, CRITICAL — all fixed, Final status, L1. `applyDamage(0)` presentation (standalone residual if knock-only helpers remain), L2. Flamethrower `reloading` when energy < 10, L3. Flame restart dead-zone energy (0, 5] (+21 more)

### Community 11 - "types.ts"
Cohesion: 0.15
Nodes (8): EMPTY_HUD, HudModel, RunState, GameMode, MinimapDynamic, MinimapStatic, ScoreRow, WaveContext

### Community 14 - "Game.ts"
Cohesion: 0.06
Nodes (32): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps, HudScoreboard(), HudScoreboardProps (+24 more)

### Community 15 - "Tank.ts"
Cohesion: 0.11
Nodes (11): NameplateEntry, disposeObject3D(), TankEntity, TankFxState, TankParams, TankVisual, tmpDir, tmpMuzzle (+3 more)

### Community 16 - "RailgunWeapon.ts"
Cohesion: 0.15
Nodes (3): Arena, RailgunWeapon, CombatPeer

### Community 17 - "graphicsQuality.ts"
Cohesion: 0.16
Nodes (9): getQualityPreset(), nextQuality(), ORDER, QUALITY_PRESETS, QualityLevel, QualityPreset, saveQuality(), QualityController (+1 more)

### Community 18 - "GameSimulation.ts"
Cohesion: 0.14
Nodes (8): GameSimulation, ScalarCell, GameContext, GameModeControllerDeps, GarageBindingDeps, WeaponFactoryDeps, PreviewController, GameEvent

### Community 19 - "particles.ts"
Cohesion: 0.22
Nodes (6): CoreAnim, FlashLight, ParticleSystem, RingAnim, ScorchMark, SparkSystem

### Community 21 - "devDependencies"
Cohesion: 0.12
Nodes (17): @eslint/js, eslint-plugin-react-refresh, devDependencies, @eslint/js, eslint-plugin-react-refresh, tailwindcss, @types/react-dom, @types/three (+9 more)

### Community 22 - "FlamethrowerWeapon.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 23 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 26 - "PlayerController"
Cohesion: 0.17
Nodes (13): WeaponType, COLORS, buildBotStyle(), buildPlayerStyle(), randomPersona(), BotSpawnDeps, SPAWN_POINTS, spawnBot() (+5 more)

### Community 27 - "Nameplate"
Cohesion: 0.14
Nodes (11): MainMenuProps, HULL_IDS, HULLS, TURRET_IDS, TURRETS, WEAPON_TUNING, HullDef, TurretDef (+3 more)

### Community 28 - "FlamethrowerWeapon"
Cohesion: 0.23
Nodes (6): fillMuzzleAndAim(), WeaponAmmoState, WeaponDeps, WeaponOwner, WeaponOwnerParams, WeaponOwnerVisual

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

### Community 34 - "GameOverScreen.tsx"
Cohesion: 0.14
Nodes (3): AudioFX, CombatDeps, CombatSystem

### Community 37 - "ScorchSystem"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 39 - "GameModeController"
Cohesion: 0.25
Nodes (13): applyGameOverInputState(), applyPlayerDeathState(), GameModeLike, shouldAutoPauseOnInterrupt(), bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus() (+5 more)

### Community 41 - "DamageSystem.test.ts"
Cohesion: 0.11
Nodes (14): GarageProps, HullCard(), HullCardProps, PauseMenuProps, TurretCard(), TurretCardProps, HullId, TurretId (+6 more)

### Community 43 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): Everyday commands, Graphify, Working style

### Community 45 - "eslint-plugin-react-refresh"
Cohesion: 0.23
Nodes (6): inFlameConeXZ(), tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, resolveWeaponDamage()

### Community 46 - "globals"
Cohesion: 0.18
Nodes (10): C1, C2+M2, C3, Cycle reports (summary), Cycles, Final verification, Inventory, M1–M12 (+2 more)

### Community 53 - "tuning.ts"
Cohesion: 0.15
Nodes (13): BOOST, botAiForWave(), botsForWave(), PROJECTILE, SCORE, TANK, TankAimSystem, TankCombatTimersSystem (+5 more)

### Community 56 - "RunState.test.ts"
Cohesion: 0.28
Nodes (3): TankAnimationSystem, GameLoop, GameLoopDeps

### Community 57 - "waves.test.ts"
Cohesion: 0.28
Nodes (5): RailgunFireState, railgunShouldStartCharge(), RailgunState, tmpDir, tmpMuzzle

### Community 58 - "physics.ts"
Cohesion: 0.13
Nodes (14): _aiBots, _aiCtx, _bd, buildSimulationStages(), _bv, _hitCtx, MinimapStage, NameplateSystemStage (+6 more)

### Community 59 - "SKILL.md"
Cohesion: 0.25
Nodes (7): Final report — functional bugfix, Fixed (critical), Fixed (medium), Key files, Remaining, Summary, Verification

### Community 60 - "Caveman Help"
Cohesion: 0.25
Nodes (5): rearPoint(), BoostStage, TankFxSystemStage, TankFxSystem, tmpV

### Community 61 - "SKILL.md"
Cohesion: 0.29
Nodes (6): Active cycle, Functional bugfix — ArmorStrike, Goal, Inventory, Rules, Status

### Community 63 - "SKILL.md"
Cohesion: 0.40
Nodes (3): WeaponSystemStage, _wctx, WeaponSystem

### Community 66 - "effects.ts"
Cohesion: 0.10
Nodes (5): GameOverScreen(), GameOverScreenProps, PauseMenu(), PlayerController, useFocusTrap()

### Community 68 - "PlayerFactory.ts"
Cohesion: 0.20
Nodes (5): BotEntry, disposeBots(), SimContext, Nameplate, WaveManager

### Community 83 - "2026-07-17"
Cohesion: 0.20
Nodes (9): Deferred, Done cycles, Done cycles, Plan status, Progress — Stepwise Refactor, Re-analysis, Session 2026-07-17 (session 1), Session 2026-07-17 (session 2 — goal loop) (+1 more)

### Community 86 - "Step 1. ANALYST (2026-07-17)"
Cohesion: 0.18
Nodes (10): Completed prior cycles (session 1), CRITICAL, Findings — Stepwise Refactor (final state), LOW / melочь (out of critical/medium clear scope), MEDIUM — deferred (behavior risk; needs user OK), MEDIUM — resolved this session, Prioritized problem list — final, Re-analysis snapshot (2026-07-17 session 2) (+2 more)

### Community 87 - "task_plan.md"
Cohesion: 0.29
Nodes (6): Deferred (not auto-fixed), Goal, Phases, Residual low (optional later), Status: **complete** (critical + medium structural cleared; P5 deferred with reason), Task Plan: Stepwise structural refactor

## Knowledge Gaps
- **235 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `name`, `private`, `version` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Effects` connect `Effects` to `TankEntity`, `GameOverScreen.tsx`, `CameraRig.ts`, `PlayerFactory.ts`, `PlayerController`, `GameModeController`, `types.ts`, `FlamethrowerWeapon`, `GameSimulation.ts`, `eslint`, `ParticleEffects`, `physics.ts`, `Caveman Help`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `ParticleEffects` connect `ParticleEffects` to `FlashSystem`, `RingSystem`, `SmokeSystem`, `Effects`, `WeaponCatalog.ts`, `particles.ts`, `eslint`, `Caveman Help`, `clamp`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `AudioFX` connect `GameOverScreen.tsx` to `TankEntity`, `PlayerController`, `PlayerFactory.ts`, `GameModeController`, `types.ts`, `graphicsQuality.ts`, `GameSimulation.ts`, `physics.ts`, `FlamethrowerWeapon`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `name` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TankEntity` be split into smaller, more focused modules?**
  _Cohesion score 0.08941176470588236 - nodes in this community are weakly interconnected._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09295967190704033 - nodes in this community are weakly interconnected._
- **Should `stages.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._