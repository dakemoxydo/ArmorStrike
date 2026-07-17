# Graph Report - ArmorStrike  (2026-07-17)

## Corpus Check
- 155 files · ~42,987 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1445 nodes · 2674 edges · 100 communities (67 shown, 33 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a2081ef0`
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
- SimSystem
- PlayerFactory.ts
- Caveman Compress
- SKILL.md
- Caveman Compress
- SKILL.md
- Caveman Compress
- SKILL.md
- caveman-commit
- caveman-review
- caveman-commit
- caveman-review
- caveman-commit
- caveman-review
- WeaponCatalog.ts
- caveman-stats
- 2026-07-17
- caveman-stats
- caveman-stats
- Step 1. ANALYST (2026-07-17)
- task_plan.md
- AmbientDust
- BootError.tsx
- HudCrosshair.tsx
- __init__.py
- CLAUDE.md
- __init__.py
- vitest
- __init__.py
- botStatsForWave
- HudVitals.tsx
- globals

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 48 edges
2. `CameraRig` - 28 edges
3. `GameApi` - 28 edges
4. `HullId` - 27 edges
5. `TurretId` - 27 edges
6. `AudioFX` - 26 edges
7. `Game` - 25 edges
8. `TankLike` - 23 edges
9. `ParticleEffects` - 23 edges
10. `ArmorStrike — Детальный разбор функционала проекта` - 23 edges

## Surprising Connections (you probably didn't know these)
- `GarageProps` --references--> `GameApi`  [EXTRACTED]
  src/components/Garage.tsx → src/game/GameApi.ts
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `AIBody` --references--> `WeaponType`  [EXTRACTED]
  src/game/AI.ts → src/core/catalogTypes.ts
- `BotSpawnDeps` --references--> `WeaponType`  [EXTRACTED]
  src/game/botSpawn.ts → src/core/catalogTypes.ts

## Import Cycles
- None detected.

## Communities (100 total, 33 thin omitted)

### Community 0 - "TankEntity"
Cohesion: 0.15
Nodes (12): DamageSystem, applyHit(), applySplashHit(), HitEffect, despawn(), doSplash(), HitContext, Shot (+4 more)

### Community 1 - "ArenaBuilder.ts"
Cohesion: 0.09
Nodes (40): Arena, buildAtmosphere(), buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack() (+32 more)

### Community 2 - "stages.ts"
Cohesion: 0.10
Nodes (17): AmbientStage, _bd, BoostStage, BotAiStage, _bv, EngineAudioStage, MinimapStage, NameplateSystemStage (+9 more)

### Community 3 - "CameraRig.ts"
Cohesion: 0.09
Nodes (11): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+3 more)

### Community 4 - "AudioFX"
Cohesion: 0.16
Nodes (7): COLORS, buildPlayerStyle(), GarageBindingDeps, PreviewController, disposeObject3D(), TankVisual, GameEvent

### Community 5 - "ArmorStrike — Детальный разбор функционала проекта"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 6 - "catalog.ts"
Cohesion: 0.13
Nodes (12): AIBody, AIController, AICtx, aimTolerance(), AIPersona, AIState, AITarget, DEFAULT_PERSONA (+4 more)

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 9 - "Effects"
Cohesion: 0.09
Nodes (3): AmbientDust, CameraShake, Effects

### Community 10 - "index.ts"
Cohesion: 0.07
Nodes (49): benchmark_pair(), count_tokens(), main(), print_table(), Path, main(), print_usage(), backup_dir_for() (+41 more)

### Community 11 - "types.ts"
Cohesion: 0.14
Nodes (10): HudScoreboardProps, HudWeaponProps, getWeaponMeta(), HudModel, RunState, GameMode, HudSnapshot, MinimapDynamic (+2 more)

### Community 12 - "CannonWeapon"
Cohesion: 0.22
Nodes (5): CannonWeapon, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 14 - "Game.ts"
Cohesion: 0.10
Nodes (9): GarageProps, HUD(), HudProps, HudRadarProps, drawMinimap(), PauseMenuProps, GameApi, SNAP_INIT (+1 more)

### Community 15 - "Tank.ts"
Cohesion: 0.22
Nodes (5): tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, buildAmmoState()

### Community 17 - "graphicsQuality.ts"
Cohesion: 0.10
Nodes (11): AudioFX, getQualityPreset(), loadQuality(), nextQuality(), ORDER, QUALITY_PRESETS, QualityLevel, QualityPreset (+3 more)

### Community 18 - "GameSimulation.ts"
Cohesion: 0.18
Nodes (14): bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus(), buildGameLoop(), buildGarageInput(), buildRenderWorld(), GameContext (+6 more)

### Community 19 - "particles.ts"
Cohesion: 0.17
Nodes (7): CoreAnim, FlashLight, MuzzleSystem, ParticleSystem, RingAnim, ScorchMark, SmokePuff

### Community 21 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, @eslint/js, devDependencies, eslint, @eslint/js, tailwindcss, @types/react-dom, @types/three (+9 more)

### Community 22 - "FlamethrowerWeapon.ts"
Cohesion: 0.20
Nodes (6): FlameParticle, FlameParticlePool, localDir, tmpColor, tmpMatrix, tmpScaleVec

### Community 23 - "dependencies"
Cohesion: 0.15
Nodes (13): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+5 more)

### Community 26 - "PlayerController"
Cohesion: 0.07
Nodes (49): benchmark_pair(), count_tokens(), main(), print_table(), Path, main(), print_usage(), backup_dir_for() (+41 more)

### Community 27 - "Nameplate"
Cohesion: 0.25
Nodes (7): HULL_IDS, HULLS, TURRET_IDS, TURRETS, WEAPON_TUNING, tmpLook, tmpMid

### Community 28 - "FlamethrowerWeapon"
Cohesion: 0.19
Nodes (11): tmpDir, tmpMuzzle, fillMuzzleAndAim(), RailgunState, tmpDir, tmpMuzzle, WeaponAmmoState, WeaponDeps (+3 more)

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
Cohesion: 0.23
Nodes (6): createDamageSystem(), ArenaLike, DamageSystemHooks, TankLike, CombatDeps, CombatSystem

### Community 37 - "ScorchSystem"
Cohesion: 0.40
Nodes (6): TankStyle, TankBuildInput, buildTankMesh(), TankBuildContext, buildHull(), buildTurret()

### Community 39 - "GameModeController"
Cohesion: 0.07
Nodes (49): benchmark_pair(), count_tokens(), main(), print_table(), Path, main(), print_usage(), backup_dir_for() (+41 more)

### Community 41 - "DamageSystem.test.ts"
Cohesion: 0.17
Nodes (10): HullCard(), HullCardProps, MainMenuProps, TurretCard(), TurretCardProps, HullDef, HullId, TurretDef (+2 more)

### Community 43 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): Everyday commands, Graphify, Working style

### Community 46 - "globals"
Cohesion: 0.22
Nodes (4): TankAnimationSystemStage, TankAnimationSystem, GameLoop, GameLoopDeps

### Community 52 - "eslint"
Cohesion: 0.09
Nodes (20): Before / After, Benchmarks, How It Work, <img src="../../docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman (285 tokens), Install, 📄 Original (706 tokens), Part of Caveman, Security (+12 more)

### Community 53 - "tuning.ts"
Cohesion: 0.05
Nodes (28): randomPersona(), BotEntry, BotSpawnDeps, disposeBots(), SPAWN_POINTS, spawnBot(), BOOST, botAiForWave() (+20 more)

### Community 56 - "RunState.test.ts"
Cohesion: 0.09
Nodes (20): Before / After, Benchmarks, How It Work, <img src="../../docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman (285 tokens), Install, 📄 Original (706 tokens), Part of Caveman, Security (+12 more)

### Community 57 - "waves.test.ts"
Cohesion: 0.09
Nodes (20): Before / After, Benchmarks, How It Work, <img src="../../docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman (285 tokens), Install, 📄 Original (706 tokens), Part of Caveman, Security (+12 more)

### Community 58 - "physics.ts"
Cohesion: 0.24
Nodes (10): clamp(), ColliderKind, ColliderOpts, losClear(), pointInCollider(), resolveCircle(), segmentHitsCircle(), segmentHitsCollider() (+2 more)

### Community 59 - "SKILL.md"
Cohesion: 0.14
Nodes (12): cavecrew, Example chaining, How to invoke, Model overrides, See also, What it does, Auto-clarity (inherited), Chaining patterns (+4 more)

### Community 60 - "Caveman Help"
Cohesion: 0.14
Nodes (12): caveman-help, Example output, How to invoke, See also, What it does, Caveman Help, Configure Default Mode, Deactivate (+4 more)

### Community 61 - "SKILL.md"
Cohesion: 0.14
Nodes (12): cavecrew, Example chaining, How to invoke, Model overrides, See also, What it does, Auto-clarity (inherited), Chaining patterns (+4 more)

### Community 62 - "Caveman Help"
Cohesion: 0.14
Nodes (12): caveman-help, Example output, How to invoke, See also, What it does, Caveman Help, Configure Default Mode, Deactivate (+4 more)

### Community 63 - "SKILL.md"
Cohesion: 0.14
Nodes (12): cavecrew, Example chaining, How to invoke, Model overrides, See also, What it does, Auto-clarity (inherited), Chaining patterns (+4 more)

### Community 64 - "Caveman Help"
Cohesion: 0.14
Nodes (12): caveman-help, Example output, How to invoke, See also, What it does, Caveman Help, Configure Default Mode, Deactivate (+4 more)

### Community 67 - "SimSystem"
Cohesion: 0.17
Nodes (6): GameSimulation, ProjectileManager, buildSimulationStages(), DeathTimerStage, ScalarCell, SimContext

### Community 68 - "PlayerFactory.ts"
Cohesion: 0.25
Nodes (6): WeaponType, WeaponId, WeaponMeta, WEAPONS, TankFxState, TankParams

### Community 69 - "Caveman Compress"
Cohesion: 0.17
Nodes (11): Boundaries, Caveman Compress, Compress, Compression Rules, Pattern, Preserve EXACTLY (never modify), Preserve Structure, Process (+3 more)

### Community 70 - "SKILL.md"
Cohesion: 0.17
Nodes (10): caveman, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Intensity (+2 more)

### Community 71 - "Caveman Compress"
Cohesion: 0.17
Nodes (11): Boundaries, Caveman Compress, Compress, Compression Rules, Pattern, Preserve EXACTLY (never modify), Preserve Structure, Process (+3 more)

### Community 72 - "SKILL.md"
Cohesion: 0.17
Nodes (10): caveman, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Intensity (+2 more)

### Community 73 - "Caveman Compress"
Cohesion: 0.17
Nodes (11): Boundaries, Caveman Compress, Compress, Compression Rules, Pattern, Preserve EXACTLY (never modify), Preserve Structure, Process (+3 more)

### Community 74 - "SKILL.md"
Cohesion: 0.17
Nodes (10): caveman, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Intensity (+2 more)

### Community 75 - "caveman-commit"
Cohesion: 0.18
Nodes (9): caveman-commit, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 76 - "caveman-review"
Cohesion: 0.18
Nodes (9): caveman-review, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 77 - "caveman-commit"
Cohesion: 0.18
Nodes (9): caveman-commit, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 78 - "caveman-review"
Cohesion: 0.18
Nodes (9): caveman-review, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 79 - "caveman-commit"
Cohesion: 0.18
Nodes (9): caveman-commit, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 80 - "caveman-review"
Cohesion: 0.18
Nodes (9): caveman-review, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 82 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 83 - "2026-07-17"
Cohesion: 0.20
Nodes (9): Deferred, Done cycles, Done cycles, Plan status, Progress — Stepwise Refactor, Re-analysis, Session 2026-07-17 (session 1), Session 2026-07-17 (session 2 — goal loop) (+1 more)

### Community 84 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 85 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 86 - "Step 1. ANALYST (2026-07-17)"
Cohesion: 0.18
Nodes (10): Completed prior cycles (session 1), CRITICAL, Findings — Stepwise Refactor (final state), LOW / melочь (out of critical/medium clear scope), MEDIUM — deferred (behavior risk; needs user OK), MEDIUM — resolved this session, Prioritized problem list — final, Re-analysis snapshot (2026-07-17 session 2) (+2 more)

### Community 87 - "task_plan.md"
Cohesion: 0.29
Nodes (6): Deferred (not auto-fixed), Goal, Phases, Residual low (optional later), Status: **complete** (critical + medium structural cleared; P5 deferred with reason), Task Plan: Stepwise structural refactor

## Knowledge Gaps
- **396 isolated node(s):** `Working style`, `Everyday commands`, `graphify`, `CRITICAL`, `MEDIUM — resolved this session` (+391 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `tuning.ts` to `stages.ts`, `SimSystem`, `CameraRig.ts`, `GameOverScreen.tsx`, `DamageSystem.test.ts`, `types.ts`, `CannonWeapon`, `globals`, `GameBootstrap.ts`, `physics.ts`, `FlamethrowerWeapon`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `AudioFX` connect `graphicsQuality.ts` to `GameOverScreen.tsx`, `types.ts`, `AudioFX`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `PlayerController` connect `GameBootstrap.ts` to `stages.ts`, `SimSystem`, `CameraRig.ts`, `types.ts`, `GameSimulation.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `Working style`, `Everyday commands`, `graphify` to the rest of the system?**
  _396 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08611111111111111 - nodes in this community are weakly interconnected._
- **Should `stages.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09879032258064516 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09413067552602436 - nodes in this community are weakly interconnected._