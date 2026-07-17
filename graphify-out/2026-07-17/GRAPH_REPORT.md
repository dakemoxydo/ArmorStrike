# Graph Report - ArmorStrike  (2026-07-17)

## Corpus Check
- 217 files · ~67,800 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1417 nodes · 2978 edges · 98 communities (66 shown, 32 thin omitted)
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
- HudScoreboard.tsx
- DeathTimerStage
- __init__.py
- CLAUDE.md
- __init__.py
- vitest
- __init__.py
- botStatsForWave

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 66 edges
2. `AudioFX` - 38 edges
3. `Effects` - 36 edges
4. `CameraRig` - 30 edges
5. `Arena` - 29 edges
6. `Game` - 28 edges
7. `GameApi` - 28 edges
8. `HullId` - 27 edges
9. `TurretId` - 27 edges
10. `GameEvent` - 25 edges

## Surprising Connections (you probably didn't know these)
- `HudProps` --references--> `GameApi`  [EXTRACTED]
  src/components/HUD.tsx → src/game/GameApi.ts
- `GarageProps` --references--> `GameApi`  [EXTRACTED]
  src/components/Garage.tsx → src/game/GameApi.ts
- `HullCardProps` --references--> `HullDef`  [EXTRACTED]
  src/components/HullCard.tsx → src/core/catalogTypes.ts
- `PauseMenuProps` --references--> `GameApi`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/GameApi.ts
- `TurretCardProps` --references--> `TurretDef`  [EXTRACTED]
  src/components/TurretCard.tsx → src/core/catalogTypes.ts

## Import Cycles
- None detected.

## Communities (98 total, 32 thin omitted)

### Community 0 - "TankEntity"
Cohesion: 0.11
Nodes (17): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, applyHit(), applySplashHit(), HitEffect (+9 more)

### Community 1 - "ArenaBuilder.ts"
Cohesion: 0.09
Nodes (39): AICtx, buildAtmosphere(), buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack() (+31 more)

### Community 2 - "stages.ts"
Cohesion: 0.13
Nodes (13): _bd, buildSimulationStages(), _bv, NameplateSystemStage, PhysicsSystemStage, TankAnimationSystemStage, TankSystemStage, WeaponSystemStage (+5 more)

### Community 3 - "CameraRig.ts"
Cohesion: 0.12
Nodes (12): CameraMode, GarageCameraMode, MenuCameraMode, OverCameraMode, PlayingCameraMode, CameraRig, CameraUpdateParams, PREVIEW_POS (+4 more)

### Community 5 - "ArmorStrike — Детальный разбор функционала проекта"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 6 - "catalog.ts"
Cohesion: 0.25
Nodes (8): MainMenuProps, HULL_IDS, HULLS, TURRET_IDS, TURRETS, WEAPON_TUNING, HullDef, TurretDef

### Community 7 - "TankVisual"
Cohesion: 0.21
Nodes (4): GarageBindingDeps, PreviewController, disposeObject3D(), TankVisual

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 10 - "index.ts"
Cohesion: 0.07
Nodes (49): benchmark_pair(), count_tokens(), main(), print_table(), Path, main(), print_usage(), backup_dir_for() (+41 more)

### Community 11 - "types.ts"
Cohesion: 0.09
Nodes (8): Arena, CombatDeps, CombatSystem, SimContext, HudModel, PlayerController, RunState, MinimapStatic

### Community 12 - "CannonWeapon"
Cohesion: 0.22
Nodes (5): CannonWeapon, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 13 - "Game"
Cohesion: 0.12
Nodes (3): Game, GameModeController, GameMode

### Community 14 - "Game.ts"
Cohesion: 0.12
Nodes (10): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudProps, HudRadarProps, HudVitalsProps, drawMinimap() (+2 more)

### Community 17 - "graphicsQuality.ts"
Cohesion: 0.09
Nodes (10): AudioFX, getQualityPreset(), loadQuality(), nextQuality(), ORDER, QUALITY_PRESETS, QualityLevel, QualityPreset (+2 more)

### Community 18 - "GameSimulation.ts"
Cohesion: 0.13
Nodes (9): GameSimulation, ScalarCell, GameContext, GameLoop, GameLoopDeps, GameModeControllerDeps, WeaponFactoryDeps, RenderWorld (+1 more)

### Community 19 - "particles.ts"
Cohesion: 0.17
Nodes (7): CoreAnim, FlashLight, MuzzleSystem, ParticleSystem, RingAnim, ScorchMark, SmokePuff

### Community 20 - "GameBootstrap.ts"
Cohesion: 0.29
Nodes (9): bootstrapGame(), buildCoreSubsystems(), buildDerivedSystems(), buildEventBus(), buildGameLoop(), buildGarageInput(), buildRenderWorld(), registerWindowHandlers() (+1 more)

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
Cohesion: 0.11
Nodes (18): WeaponType, COLORS, buildBotStyle(), randomPersona(), BotEntry, BotSpawnDeps, disposeBots(), SPAWN_POINTS (+10 more)

### Community 28 - "FlamethrowerWeapon"
Cohesion: 0.08
Nodes (19): tmpDir, tmpMuzzle, FlamethrowerWeapon, tmpDir, tmpMuzzle, tmpMuzzleQuat, tmpTargetVec, fillMuzzleAndAim() (+11 more)

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

### Community 39 - "GameModeController"
Cohesion: 0.07
Nodes (49): benchmark_pair(), count_tokens(), main(), print_table(), Path, main(), print_usage(), backup_dir_for() (+41 more)

### Community 41 - "DamageSystem.test.ts"
Cohesion: 0.11
Nodes (14): BootError(), BootErrorProps, GarageProps, HudWeaponProps, HullCard(), HullCardProps, PauseMenuProps, HullId (+6 more)

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
Cohesion: 0.20
Nodes (14): aimTolerance(), AIPersona, AIState, DEFAULT_PERSONA, preferredRange(), steeringFromAngle(), clamp(), ColliderKind (+6 more)

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
Cohesion: 0.15
Nodes (6): CameraShake, rearPoint(), BoostStage, TankFxSystemStage, TankFxSystem, tmpV

### Community 67 - "SimSystem"
Cohesion: 0.19
Nodes (7): AmbientStage, BotAiStage, EngineAudioStage, PlayerInputStage, ProjectileStage, SimSystem, WavesStage

### Community 68 - "PlayerFactory.ts"
Cohesion: 0.35
Nodes (8): buildPlayerStyle(), TankStyle, buildPlayerTank(), createTankEntity(), buildTankMesh(), TankBuildContext, buildHull(), buildTurret()

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

### Community 81 - "WeaponCatalog.ts"
Cohesion: 0.28
Nodes (6): TurretCard(), TurretCardProps, getWeaponMeta(), WeaponId, WeaponMeta, WEAPONS

### Community 82 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 83 - "2026-07-17"
Cohesion: 0.29
Nodes (6): 2026-07-17, Cycle 1 complete — P1 SimContext flatten, Cycle 2 complete — P2 GameApi facade, Cycle 3 complete — P3a TankLike hit path, Cycle 4 complete — P3b WeaponOwner, Session start

### Community 84 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 85 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 86 - "Step 1. ANALYST (2026-07-17)"
Cohesion: 0.33
Nodes (5): Already good (do not re-flag), Cycle log, Findings — Stepwise Refactor, Problem list (active), Step 1. ANALYST (2026-07-17)

### Community 87 - "task_plan.md"
Cohesion: 0.33
Nodes (5): Constraints, Current cycle, Goal, Phases, Problem list

## Knowledge Gaps
- **381 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+376 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Effects` connect `Effects` to `TankEntity`, `effects.ts`, `CameraRig.ts`, `stages.ts`, `PlayerFactory.ts`, `types.ts`, `GameSimulation.ts`, `GameBootstrap.ts`, `AmbientDust`, `ParticleEffects`, `Nameplate`, `FlamethrowerWeapon`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `TankEntity` connect `tuning.ts` to `TankEntity`, `AIController`, `ArenaBuilder.ts`, `CameraRig.ts`, `stages.ts`, `effects.ts`, `PlayerFactory.ts`, `TankVisual`, `DamageSystem.test.ts`, `types.ts`, `CannonWeapon`, `Tank.ts`, `RailgunWeapon.ts`, `WeaponCatalog.ts`, `GameSimulation.ts`, `physics.ts`, `Nameplate`, `FlamethrowerWeapon`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `ParticleEffects` connect `ParticleEffects` to `effects.ts`, `FlashSystem`, `RingSystem`, `ScorchSystem`, `SmokeSystem`, `Effects`, `particles.ts`, `SparkPool`, `clamp`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _381 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TankEntity` be split into smaller, more focused modules?**
  _Cohesion score 0.10631229235880399 - nodes in this community are weakly interconnected._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09403508771929825 - nodes in this community are weakly interconnected._
- **Should `stages.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._