# Graph Report - ArmorStrike  (2026-07-16)

## Corpus Check
- 101 files · ~37,147 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 673 nodes · 1658 edges · 41 communities (26 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc7283a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Game.ts
- ArenaBuilder.ts
- AI.ts
- CameraRig.ts
- GameSimulation.ts
- devDependencies
- Effects
- compilerOptions
- Projectile.ts
- TankEntity
- AudioFX
- Tank.ts
- WeaponDeps
- CombatSystem
- buildMesh.ts
- CannonWeapon
- Arena
- HitContext
- vite.config.ts
- Weapon
- FlamethrowerWeapon
- TankEntity
- RailgunWeapon
- CameraRig.ts
- Game.ts
- HudModel
- PlayerController
- TankAnimationSystem.ts
- ArmorStrike
- GameOverScreen.tsx
- catalog.ts
- PlayerFactory.ts
- types.ts
- PlayerController
- CannonWeapon.test.ts
- TankCatalog.ts
- ProjectileBehavior.ts
- Arena
- HudVitals.tsx

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 65 edges
2. `Game` - 40 edges
3. `Effects` - 34 edges
4. `AudioFX` - 33 edges
5. `Arena` - 26 edges
6. `ArmorStrike — Детальный разбор функционала проекта` - 23 edges
7. `PlayerController` - 22 edges
8. `ArenaBuildContext` - 22 edges
9. `buildArena()` - 21 edges
10. `compilerOptions` - 19 edges

## Surprising Connections (you probably didn't know these)
- `GarageProps` --references--> `Game`  [EXTRACTED]
  src/components/Garage.tsx → src/game/Game.ts
- `Garage()` --calls--> `getWeaponMeta()`  [EXTRACTED]
  src/components/Garage.tsx → src/core/WeaponCatalog.ts
- `HudProps` --references--> `Game`  [EXTRACTED]
  src/components/HUD.tsx → src/game/Game.ts
- `HUD()` --calls--> `drawMinimap()`  [EXTRACTED]
  src/components/HUD.tsx → src/components/hud/minimapDraw.ts
- `PauseMenuProps` --references--> `Game`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/Game.ts

## Import Cycles
- None detected.

## Communities (41 total, 15 thin omitted)

### Community 0 - "Game.ts"
Cohesion: 0.18
Nodes (8): CameraUpdateParams, PREVIEW_POS, GameLoopDeps, PreviewController, disposeObject3D(), TankParams, TankVisual, GameMode

### Community 1 - "ArenaBuilder.ts"
Cohesion: 0.11
Nodes (37): buildAtmosphere(), buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack(), buildRamps() (+29 more)

### Community 2 - "AI.ts"
Cohesion: 0.07
Nodes (19): DamageSystem, CoreAnim, Effects, FlashLight, RingAnim, ScorchMark, SmokePuff, SparkPool (+11 more)

### Community 3 - "CameraRig.ts"
Cohesion: 0.06
Nodes (35): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+27 more)

### Community 4 - "GameSimulation.ts"
Cohesion: 0.21
Nodes (12): HULL_IDS, TURRET_IDS, WeaponType, buildBotStyle(), BOOST, botsForWave(), botStatsForWave(), SCORE (+4 more)

### Community 5 - "devDependencies"
Cohesion: 0.08
Nodes (24): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+16 more)

### Community 6 - "Effects"
Cohesion: 0.14
Nodes (10): _bd, _bv, MinimapSystem, NameplateEntry, NameplateSystem, PhysicsSystem, TankFxSystem, tmpV (+2 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 8 - "Projectile.ts"
Cohesion: 0.05
Nodes (17): GarageProps, HudProps, PauseMenu(), PauseMenuProps, CameraRig, Game, getQualityPreset(), loadQuality() (+9 more)

### Community 9 - "TankEntity"
Cohesion: 0.20
Nodes (9): FlameParticle, localDir, tmpColor, tmpDir, tmpMatrix, tmpMuzzle, tmpMuzzleQuat, tmpScaleVec (+1 more)

### Community 11 - "Tank.ts"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 13 - "CombatSystem"
Cohesion: 0.24
Nodes (6): createDamageSystem(), ArenaLike, DamageSystemHooks, TankLike, CombatDeps, CombatSystem

### Community 16 - "Arena"
Cohesion: 0.19
Nodes (3): GameSimulation, RunState, WaveManager

### Community 17 - "HitContext"
Cohesion: 0.12
Nodes (22): AIController, AICtx, aimTolerance(), AIPersona, AIState, DEFAULT_PERSONA, preferredRange(), randomPersona() (+14 more)

### Community 24 - "CameraRig.ts"
Cohesion: 0.13
Nodes (9): HUD(), HudCrosshairProps, FeedEntry, HudFeedProps, HudRadarProps, drawMinimap(), HudModel, MinimapDynamic (+1 more)

### Community 25 - "Game.ts"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 26 - "HudModel"
Cohesion: 0.25
Nodes (5): RailgunState, tmpDir, tmpMid, tmpMuzzle, WeaponContext

### Community 29 - "ArmorStrike"
Cohesion: 0.40
Nodes (4): Architecture (short), ArmorStrike, Controls, Quick start

### Community 32 - "catalog.ts"
Cohesion: 0.20
Nodes (9): BootError(), BootErrorProps, Garage(), HULLS, TURRETS, getWeaponMeta(), WeaponId, WeaponMeta (+1 more)

### Community 33 - "PlayerFactory.ts"
Cohesion: 0.28
Nodes (9): buildPlayerStyle(), TankStyle, buildPlayerTank(), createTankEntity(), createWeapon(), buildTankMesh(), TankBuildContext, buildHull() (+1 more)

### Community 34 - "types.ts"
Cohesion: 0.26
Nodes (7): HudScoreboardProps, HudWeaponProps, HullId, TurretId, TankBuildInput, HudSnapshot, ScoreRow

### Community 36 - "CannonWeapon.test.ts"
Cohesion: 0.24
Nodes (7): WEAPON_TUNING, tmpDir, tmpMuzzle, emptyMag(), makeTank(), makeVisual(), PARAMS

### Community 37 - "TankCatalog.ts"
Cohesion: 0.43
Nodes (3): MainMenuProps, HullDef, TurretDef

### Community 38 - "ProjectileBehavior.ts"
Cohesion: 0.40
Nodes (4): COLORS, cannon, flamethrower, railgun

## Knowledge Gaps
- **140 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+135 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `TankEntity` to `Game.ts`, `AI.ts`, `GameSimulation.ts`, `Effects`, `Projectile.ts`, `TankEntity`, `CombatSystem`, `CannonWeapon`, `Arena`, `HitContext`, `Weapon`, `FlamethrowerWeapon`, `RailgunWeapon`, `CameraRig.ts`, `HudModel`, `catalog.ts`, `PlayerFactory.ts`, `types.ts`, `CannonWeapon.test.ts`, `ProjectileBehavior.ts`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `AudioFX` connect `AudioFX` to `Game.ts`, `catalog.ts`, `PlayerFactory.ts`, `AI.ts`, `GameSimulation.ts`, `Effects`, `CombatSystem`, `CannonWeapon`, `Arena`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `Game` connect `Projectile.ts` to `catalog.ts`, `Game.ts`, `types.ts`, `PlayerFactory.ts`, `AI.ts`, `GameSimulation.ts`, `Arena`, `CameraRig.ts`, `TankAnimationSystem.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10912698412698413 - nodes in this community are weakly interconnected._
- **Should `AI.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06568832983927324 - nodes in this community are weakly interconnected._
- **Should `CameraRig.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._