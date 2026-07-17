# Graph Report - ArmorStrike  (2026-07-17)

## Corpus Check
- 222 files · ~68,770 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1441 nodes · 3007 edges · 96 communities (66 shown, 30 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86c169f9`
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
- __init__.py
- CLAUDE.md
- __init__.py
- vitest
- __init__.py
- botStatsForWave

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 51 edges
2. `AudioFX` - 38 edges
3. `Effects` - 34 edges
4. `CameraRig` - 30 edges
5. `Game` - 28 edges
6. `GameApi` - 28 edges
7. `HullId` - 27 edges
8. `TurretId` - 27 edges
9. `Arena` - 27 edges
10. `GameEvent` - 25 edges

## Surprising Connections (you probably didn't know these)
- `GarageProps` --references--> `GameApi`  [EXTRACTED]
  src/components/Garage.tsx → src/game/GameApi.ts
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `HudScoreboardProps` --references--> `ScoreRow`  [EXTRACTED]
  src/components/hud/HudScoreboard.tsx → src/game/types.ts
- `HudWeaponProps` --references--> `HudSnapshot`  [EXTRACTED]
  src/components/hud/HudWeapon.tsx → src/game/types.ts

## Import Cycles
- None detected.

## Communities (96 total, 30 thin omitted)

### Community 0 - "TankEntity"
Cohesion: 0.23
Nodes (5): HitContext, Shot, BEHAVIORS, cannon, ProjectileBehavior

### Community 1 - "ArenaBuilder.ts"
Cohesion: 0.10
Nodes (38): buildAtmosphere(), buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack(), buildRamps() (+30 more)

### Community 2 - "stages.ts"
Cohesion: 0.13
Nodes (13): _bd, buildSimulationStages(), _bv, MinimapStage, NameplateSystemStage, PhysicsSystemStage, TankSystemStage, WeaponSystemStage (+5 more)

### Community 3 - "CameraRig.ts"
Cohesion: 0.10
Nodes (13): CameraLookState, CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams (+5 more)

### Community 5 - "ArmorStrike — Детальный разбор функционала проекта"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 6 - "catalog.ts"
Cohesion: 0.22
Nodes (11): AIBody, AICtx, aimTolerance(), AIPersona, AIState, AITarget, DEFAULT_PERSONA, preferredRange() (+3 more)

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
Cohesion: 0.11
Nodes (19): HudScoreboardProps, Arena, CombatDeps, CombatSystem, SimContext, bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems() (+11 more)

### Community 12 - "CannonWeapon"
Cohesion: 0.18
Nodes (6): CannonWeapon, WeaponDeps, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 13 - "Game"
Cohesion: 0.10
Nodes (3): HudWeaponProps, Game, HudSnapshot

### Community 14 - "Game.ts"
Cohesion: 0.08
Nodes (13): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps, HudVitalsProps, drawMinimap() (+5 more)

### Community 15 - "Tank.ts"
Cohesion: 0.17
Nodes (5): tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, Weapon

### Community 17 - "graphicsQuality.ts"
Cohesion: 0.21
Nodes (10): getQualityPreset(), loadQuality(), nextQuality(), ORDER, QUALITY_PRESETS, QualityLevel, QualityPreset, saveQuality() (+2 more)

### Community 18 - "GameSimulation.ts"
Cohesion: 0.14
Nodes (13): GameSimulation, ScalarCell, GameContext, GameLoopDeps, GameModeController, GameModeControllerDeps, GarageBindingDeps, buildPlayerTank() (+5 more)

### Community 19 - "particles.ts"
Cohesion: 0.16
Nodes (7): CoreAnim, FlashLight, MuzzleSystem, ParticleSystem, RingAnim, ScorchMark, SmokePuff

### Community 21 - "devDependencies"
Cohesion: 0.12
Nodes (17): @eslint/js, globals, devDependencies, @eslint/js, globals, tailwindcss, @types/react-dom, @types/three (+9 more)

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
Cohesion: 0.20
Nodes (7): BotEntry, disposeBots(), botAiForWave(), botsForWave(), SCORE, TANK, WaveManager

### Community 28 - "FlamethrowerWeapon"
Cohesion: 0.16
Nodes (11): tmpDir, tmpMuzzle, fillMuzzleAndAim(), RailgunState, tmpDir, tmpMuzzle, buildAmmoState(), WeaponAmmoState (+3 more)

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
Cohesion: 0.36
Nodes (4): createDamageSystem(), ArenaLike, DamageSystemHooks, TankLike

### Community 39 - "GameModeController"
Cohesion: 0.07
Nodes (49): benchmark_pair(), count_tokens(), main(), print_table(), Path, main(), print_usage(), backup_dir_for() (+41 more)

### Community 41 - "DamageSystem.test.ts"
Cohesion: 0.05
Nodes (41): BootError(), BootErrorProps, GameOverScreenProps, GarageProps, HullCard(), HullCardProps, MainMenuProps, TurretCard() (+33 more)

### Community 43 - "AGENTS.md"
Cohesion: 0.50
Nodes (3): Everyday commands, Graphify, Working style

### Community 52 - "eslint"
Cohesion: 0.09
Nodes (20): Before / After, Benchmarks, How It Work, <img src="../../docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman (285 tokens), Install, 📄 Original (706 tokens), Part of Caveman, Security (+12 more)

### Community 53 - "tuning.ts"
Cohesion: 0.14
Nodes (9): BOOST, TankAimSystem, TankCombatTimersSystem, TankMotionSystem, TankPresentationSystem, TankEntity, TankFxState, TankParams (+1 more)

### Community 56 - "RunState.test.ts"
Cohesion: 0.09
Nodes (20): Before / After, Benchmarks, How It Work, <img src="../../docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman (285 tokens), Install, 📄 Original (706 tokens), Part of Caveman, Security (+12 more)

### Community 57 - "waves.test.ts"
Cohesion: 0.09
Nodes (20): Before / After, Benchmarks, How It Work, <img src="../../docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman (285 tokens), Install, 📄 Original (706 tokens), Part of Caveman, Security (+12 more)

### Community 58 - "physics.ts"
Cohesion: 0.33
Nodes (8): clamp(), ColliderKind, ColliderOpts, losClear(), resolveCircle(), segmentHitsCircle(), segmentHitsCollider(), wrapAngle()

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

### Community 66 - "effects.ts"
Cohesion: 0.25
Nodes (5): rearPoint(), BoostStage, TankFxSystemStage, TankFxSystem, tmpV

### Community 67 - "SimSystem"
Cohesion: 0.15
Nodes (8): AmbientStage, BotAiStage, DeathTimerStage, EngineAudioStage, PlayerInputStage, ProjectileStage, SimSystem, WavesStage

### Community 68 - "PlayerFactory.ts"
Cohesion: 0.23
Nodes (9): WeaponType, DamageSystem, applyHit(), applySplashHit(), HitEffect, despawn(), doSplash(), ProjectileManager (+1 more)

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
Cohesion: 0.29
Nodes (6): Done cycles, Plan status, Progress — Stepwise Refactor, Remaining for next session, Session 2026-07-17, Verification

### Community 84 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 85 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 86 - "Step 1. ANALYST (2026-07-17)"
Cohesion: 0.18
Nodes (10): Completed prior cycles, CRITICAL, Findings — Stepwise Refactor, God nodes (graph degree), LOW / melочь (out of critical/medium clear scope), MEDIUM — actionable this session, MEDIUM — deferred (behavior risk), Prioritized problem list (living) (+2 more)

### Community 87 - "task_plan.md"
Cohesion: 0.33
Nodes (5): Deferred next cycles, Goal, Phases, Status: **mostly complete** (critical cleared; medium structural done; 4 deferred), Task Plan: Stepwise structural refactor

## Knowledge Gaps
- **385 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+380 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `tuning.ts` to `stages.ts`, `CameraRig.ts`, `effects.ts`, `ScorchSystem`, `PlayerFactory.ts`, `GameOverScreen.tsx`, `DamageSystem.test.ts`, `types.ts`, `CannonWeapon`, `Game`, `Game.ts`, `Tank.ts`, `WeaponCatalog.ts`, `GameSimulation.ts`, `GameBootstrap.ts`, `physics.ts`, `Nameplate`, `FlamethrowerWeapon`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `ParticleEffects` connect `ParticleEffects` to `FlashSystem`, `RingSystem`, `SmokeSystem`, `Effects`, `particles.ts`, `SparkPool`, `clamp`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Effects` connect `Effects` to `TankEntity`, `stages.ts`, `CameraRig.ts`, `PlayerFactory.ts`, `effects.ts`, `types.ts`, `CannonWeapon`, `GameSimulation.ts`, `ParticleEffects`, `FlamethrowerWeapon`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _385 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09621621621621622 - nodes in this community are weakly interconnected._
- **Should `stages.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._