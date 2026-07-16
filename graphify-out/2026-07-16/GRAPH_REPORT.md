# Graph Report - .  (2026-07-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 539 nodes · 1431 edges · 20 communities (16 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6adc68cc`
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
- FlamethrowerWeapon.ts
- Weapon
- RailgunWeapon.ts
- vite.config.ts

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 63 edges
2. `Game` - 36 edges
3. `Effects` - 34 edges
4. `AudioFX` - 33 edges
5. `Arena` - 26 edges
6. `PlayerController` - 22 edges
7. `ArenaBuildContext` - 22 edges
8. `buildArena()` - 21 edges
9. `HullId` - 19 edges
10. `TurretId` - 19 edges

## Surprising Connections (you probably didn't know these)
- `GarageProps` --references--> `Game`  [EXTRACTED]
  src/components/Garage.tsx → src/game/Game.ts
- `Garage()` --calls--> `getWeaponMeta()`  [EXTRACTED]
  src/components/Garage.tsx → src/core/WeaponCatalog.ts
- `HudProps` --references--> `Game`  [EXTRACTED]
  src/components/HUD.tsx → src/game/Game.ts
- `PauseMenuProps` --references--> `Game`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/Game.ts
- `useWeaponMeta()` --calls--> `getWeaponMeta()`  [EXTRACTED]
  src/ui/hooks.ts → src/core/WeaponCatalog.ts

## Import Cycles
- 2-file cycle: `src/game/Tank.ts -> src/game/tank/buildMesh.ts -> src/game/Tank.ts`
- 3-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/atmosphere.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/centralHall.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/containerYard.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/foundry.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/gantryCrane.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/pipeRack.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/ramps.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/scattered.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/silos.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/skyline.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/smokestacks.ts -> src/game/arena/context.ts -> src/game/Arena.ts`
- 4-file cycle: `src/game/Arena.ts -> src/game/ArenaBuilder.ts -> src/game/arena/transformers.ts -> src/game/arena/context.ts -> src/game/Arena.ts`

## Communities (20 total, 4 thin omitted)

### Community 0 - "Game.ts"
Cohesion: 0.07
Nodes (33): App(), UIMode, Garage(), GarageProps, drawMinimap(), FeedEntry, HUD(), HudProps (+25 more)

### Community 1 - "ArenaBuilder.ts"
Cohesion: 0.11
Nodes (39): buildAtmosphere(), BlockInfo, buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack() (+31 more)

### Community 2 - "AI.ts"
Cohesion: 0.07
Nodes (27): buildBotStyle(), AIController, AICtx, aimTolerance(), AIPersona, AIState, DEFAULT_PERSONA, preferredRange() (+19 more)

### Community 3 - "CameraRig.ts"
Cohesion: 0.06
Nodes (12): CameraRig, CameraUpdateParams, PREVIEW_POS, segmentHitT(), GameLoop, GameLoopDeps, PreviewController, RenderWorld (+4 more)

### Community 4 - "GameSimulation.ts"
Cohesion: 0.06
Nodes (14): Arena, _bd, _bv, GameSimulation, resolveCircle(), MinimapSystem, NameplateEntry, NameplateSystem (+6 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (43): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+35 more)

### Community 6 - "Effects"
Cohesion: 0.11
Nodes (8): CoreAnim, Effects, FlashLight, RingAnim, ScorchMark, SmokePuff, SparkPool, glowTexture()

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 8 - "Projectile.ts"
Cohesion: 0.14
Nodes (13): COLORS, pointInCollider(), despawn(), doSplash(), HitContext, ProjectileManager, Shot, tmp (+5 more)

### Community 11 - "Tank.ts"
Cohesion: 0.26
Nodes (9): HullDef, TurretDef, buildPlayerStyle(), DamageSystem, buildPlayerTank(), createTankEntity(), WeaponFactoryDeps, TankParams (+1 more)

### Community 12 - "WeaponDeps"
Cohesion: 0.25
Nodes (5): WEAPON_TUNING, CannonWeapon, tmpDir, tmpMuzzle, WeaponDeps

### Community 13 - "CombatSystem"
Cohesion: 0.28
Nodes (6): createDamageSystem(), ArenaLike, DamageSystemHooks, TankLike, CombatDeps, CombatSystem

### Community 14 - "buildMesh.ts"
Cohesion: 0.44
Nodes (6): TankStyle, TankBuildInput, buildTankMesh(), TankBuildContext, buildHull(), buildTurret()

### Community 15 - "FlamethrowerWeapon.ts"
Cohesion: 0.20
Nodes (9): FlameParticle, localDir, tmpColor, tmpDir, tmpMatrix, tmpMuzzle, tmpMuzzleQuat, tmpScaleVec (+1 more)

### Community 17 - "RailgunWeapon.ts"
Cohesion: 0.13
Nodes (6): RailgunState, RailgunWeapon, tmpDir, tmpMid, tmpMuzzle, WeaponContext

## Knowledge Gaps
- **90 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `TankEntity` to `Game.ts`, `AI.ts`, `CameraRig.ts`, `GameSimulation.ts`, `Projectile.ts`, `Tank.ts`, `WeaponDeps`, `CombatSystem`, `FlamethrowerWeapon.ts`, `Weapon`, `RailgunWeapon.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `AudioFX` connect `AudioFX` to `Game.ts`, `AI.ts`, `GameSimulation.ts`, `Tank.ts`, `WeaponDeps`, `CombatSystem`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `Effects` connect `Effects` to `Game.ts`, `AI.ts`, `CameraRig.ts`, `GameSimulation.ts`, `Projectile.ts`, `Tank.ts`, `WeaponDeps`, `CombatSystem`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Game.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06728395061728396 - nodes in this community are weakly interconnected._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10536130536130536 - nodes in this community are weakly interconnected._
- **Should `AI.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0663265306122449 - nodes in this community are weakly interconnected._