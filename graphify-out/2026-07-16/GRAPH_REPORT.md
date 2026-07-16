# Graph Report - ArmorStrike  (2026-07-16)

## Corpus Check
- 90 files · ~36,054 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 635 nodes · 1569 edges · 32 communities (21 shown, 11 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 64 edges
2. `Game` - 36 edges
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
- `PauseMenuProps` --references--> `Game`  [EXTRACTED]
  src/components/PauseMenu.tsx → src/game/Game.ts
- `Shot` --references--> `WeaponType`  [EXTRACTED]
  src/game/engine/Projectile.ts → src/core/catalog.ts

## Import Cycles
- None detected.

## Communities (32 total, 11 thin omitted)

### Community 0 - "Game.ts"
Cohesion: 0.07
Nodes (46): BootError(), BootErrorProps, Garage(), FeedEntry, MainMenuProps, HullDef, HullId, HULLS (+38 more)

### Community 1 - "ArenaBuilder.ts"
Cohesion: 0.11
Nodes (38): AICtx, buildAtmosphere(), buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack() (+30 more)

### Community 2 - "AI.ts"
Cohesion: 0.06
Nodes (22): COLORS, PROJECTILE, CoreAnim, Effects, FlashLight, RingAnim, ScorchMark, SmokePuff (+14 more)

### Community 3 - "CameraRig.ts"
Cohesion: 0.06
Nodes (35): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+27 more)

### Community 4 - "GameSimulation.ts"
Cohesion: 0.18
Nodes (11): HULL_IDS, TURRET_IDS, buildBotStyle(), randomPersona(), BOOST, botsForWave(), botStatsForWave(), SCORE (+3 more)

### Community 5 - "devDependencies"
Cohesion: 0.08
Nodes (24): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+16 more)

### Community 6 - "Effects"
Cohesion: 0.13
Nodes (11): _bd, _bv, MinimapSystem, NameplateEntry, NameplateSystem, PhysicsSystem, TankFxSystem, tmpV (+3 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 8 - "Projectile.ts"
Cohesion: 0.07
Nodes (7): GarageProps, drawMinimap(), HUD(), HudProps, PauseMenuProps, Game, PlayerController

### Community 9 - "TankEntity"
Cohesion: 0.20
Nodes (9): FlameParticle, localDir, tmpColor, tmpDir, tmpMatrix, tmpMuzzle, tmpMuzzleQuat, tmpScaleVec (+1 more)

### Community 11 - "Tank.ts"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 13 - "CombatSystem"
Cohesion: 0.24
Nodes (7): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, CombatDeps, CombatSystem

### Community 15 - "CannonWeapon"
Cohesion: 0.22
Nodes (3): CannonWeapon, WeaponDeps, emptyMag()

### Community 16 - "Arena"
Cohesion: 0.14
Nodes (4): Arena, GameSimulation, RunState, WaveContext

### Community 17 - "HitContext"
Cohesion: 0.17
Nodes (16): AIController, aimTolerance(), AIPersona, AIState, DEFAULT_PERSONA, preferredRange(), steeringFromAngle(), clamp() (+8 more)

### Community 24 - "CameraRig.ts"
Cohesion: 0.10
Nodes (5): CameraRig, segmentHitT(), RenderWorld, GarageInput, GarageInputDeps

### Community 25 - "Game.ts"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, root

### Community 26 - "HudModel"
Cohesion: 0.25
Nodes (5): RailgunState, tmpDir, tmpMid, tmpMuzzle, WeaponContext

### Community 29 - "ArmorStrike"
Cohesion: 0.40
Nodes (4): Architecture (short), ArmorStrike, Controls, Quick start

## Knowledge Gaps
- **137 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `TankEntity` to `Game.ts`, `ArenaBuilder.ts`, `AI.ts`, `GameSimulation.ts`, `Effects`, `TankEntity`, `CombatSystem`, `CannonWeapon`, `Arena`, `HitContext`, `Weapon`, `FlamethrowerWeapon`, `RailgunWeapon`, `CameraRig.ts`, `HudModel`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `AudioFX` connect `AudioFX` to `Game.ts`, `AI.ts`, `GameSimulation.ts`, `Effects`, `CombatSystem`, `CannonWeapon`, `Arena`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Effects` connect `AI.ts` to `Game.ts`, `GameSimulation.ts`, `Effects`, `AudioFX`, `CombatSystem`, `CannonWeapon`, `Arena`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Game.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06764346764346764 - nodes in this community are weakly interconnected._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10625 - nodes in this community are weakly interconnected._
- **Should `AI.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06168831168831169 - nodes in this community are weakly interconnected._