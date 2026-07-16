# Graph Report - ArmorStrike  (2026-07-16)

## Corpus Check
- 77 files · ~33,928 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 578 nodes · 1467 edges · 17 communities (12 shown, 5 thin omitted)
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
- vite.config.ts

## God Nodes (most connected - your core abstractions)
1. `TankEntity` - 63 edges
2. `Game` - 36 edges
3. `Effects` - 34 edges
4. `AudioFX` - 33 edges
5. `Arena` - 26 edges
6. `ArmorStrike — Детальный разбор функционала проекта` - 23 edges
7. `PlayerController` - 22 edges
8. `ArenaBuildContext` - 22 edges
9. `buildArena()` - 21 edges
10. `HullId` - 19 edges

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

## Communities (17 total, 5 thin omitted)

### Community 0 - "Game.ts"
Cohesion: 0.06
Nodes (42): UIMode, Garage(), FeedEntry, HullId, HULLS, TurretId, TURRETS, WeaponType (+34 more)

### Community 1 - "ArenaBuilder.ts"
Cohesion: 0.11
Nodes (38): buildAtmosphere(), BlockInfo, buildCentralHall(), buildContainerYard(), ArenaBuildContext, buildFoundry(), buildGantryCrane(), buildPipeRack() (+30 more)

### Community 2 - "AI.ts"
Cohesion: 0.06
Nodes (37): AIController, AICtx, aimTolerance(), AIPersona, AIState, DEFAULT_PERSONA, preferredRange(), randomPersona() (+29 more)

### Community 4 - "GameSimulation.ts"
Cohesion: 0.07
Nodes (22): HULL_IDS, HullDef, TURRET_IDS, TurretDef, COLORS, buildBotStyle(), _bd, _bv (+14 more)

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
Cohesion: 0.06
Nodes (9): App(), GarageProps, drawMinimap(), HUD(), HudProps, PauseMenuProps, Game, GameLoop (+1 more)

### Community 9 - "TankEntity"
Cohesion: 0.05
Nodes (23): WEAPON_TUNING, TankEntity, CannonWeapon, tmpDir, tmpMuzzle, FlameParticle, FlamethrowerWeapon, localDir (+15 more)

### Community 11 - "Tank.ts"
Cohesion: 0.06
Nodes (33): 10. Снаряды — `ProjectileManager`, 11. ИИ противников — `AIController`, 12. Менеджер волн — `WaveManager`, 13. Физика и геометрия — `physics.ts`, 14. Эффекты — `Effects`, 15. Камера — `CameraRig`, 16. Звук — процедурный `AudioFX`, 17. HUD и UI (React) (+25 more)

### Community 13 - "CombatSystem"
Cohesion: 0.17
Nodes (9): createDamageSystem(), ArenaLike, DamageSystem, DamageSystemHooks, TankLike, Arena, CombatDeps, CombatSystem (+1 more)

## Knowledge Gaps
- **121 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TankEntity` connect `TankEntity` to `Game.ts`, `AI.ts`, `GameSimulation.ts`, `CombatSystem`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `AudioFX` connect `AudioFX` to `Game.ts`, `AI.ts`, `GameSimulation.ts`, `TankEntity`, `CombatSystem`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Effects` connect `Effects` to `Game.ts`, `AI.ts`, `GameSimulation.ts`, `TankEntity`, `CombatSystem`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Game.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05933094887439512 - nodes in this community are weakly interconnected._
- **Should `ArenaBuilder.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1076388888888889 - nodes in this community are weakly interconnected._
- **Should `AI.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059562841530054644 - nodes in this community are weakly interconnected._