# Core Architecture — ArmorStrike

**Статус:** Living doc (synced with code)  
**GDD mechanics:** [[../GDD/Approved/00_Index|Approved Index]]

## Overview

**ArmorStrike** — одиночный 3D tank survival (волны) на WebGL.

**Stack:** React 19 · TypeScript · Three.js · Vite · Tailwind 4 · Vitest.

## Layering

```
┌─────────────────────────────────────────────┐
│  React UI  (components/, hooks/)            │  HUD, Garage, Menus
├─────────────────────────────────────────────┤
│  Game facade  (Game, GameApi, GameLoop)     │  modes, RAF, events
├─────────────────────────────────────────────┤
│  Simulation   (GameSimulation, stages)      │  combat tick pipeline
├─────────────────────────────────────────────┤
│  Domain core  (src/core/)                   │  catalog, DamageSystem
└─────────────────────────────────────────────┘
```

### Hard rule: `core/` ↛ `game/`

| Package | Contents | Imports |
|---------|----------|---------|
| `src/core/` | `catalog*`, `DamageSystem`, `TankCatalog`, pure types | **no** `game/` |
| `src/game/` | simulation, weapons, AI, arena, render | may import `core/` |
| `src/components/` | React views | `GameApi`, types, HUD |

## Bootstrap composition

`bootstrapGame` (`GameBootstrap.ts`) wires:

1. `RenderWorld` (renderer, scene, camera, lights)
2. `Arena`, `Effects`, `AudioFX`, `ProjectileManager`
3. `PlayerController`, `RunState`
4. `CombatSystem` → owns `createDamageSystem`
5. `WaveManager`, `HudModel`, weapon factory deps
6. `GameSimulation` + `GameLoop` stages
7. Window handlers (resize, visibility auto-pause)

## Simulation pipeline

Ordered stages (`engine/stages.ts`):

| # | Stage | Purpose |
|---|-------|---------|
| 1 | `PlayerInputStage` | WASD/mouse → tank + fire |
| 2 | `BotAiStage` | AI → fire |
| 3 | `WeaponSystemStage` | weapon.update |
| 4 | `TankSystemStage` | motion, aim, heal, reload timers |
| 5 | FX / nameplates / ambient | presentation-side sim |
| 6 | `PhysicsSystem` | walls + tank separation |
| 7 | Projectiles | flight & hits |
| 8 | Waves | intermission when cleared |
| 9 | Death / game-over timer | player lifecycle |

`dt` clamp ~0.05s in game loop.

## Key patterns

### 1. Entity + systems

- **Entity:** `TankEntity` (shared player/bot).
- **Systems:** pure `updateOne` objects (`TankMotionSystem`, `TankAimSystem`, …) operating on narrow **ports** (`simPorts.ts`: `MotionBody`, `AimBody`, `CombatTimerBody`).

### 2. Weapon strategy

```ts
interface Weapon {
  setFire(active: boolean)
  update(dt, ctx)
  updateReload(dt)
  requestReload()
  getAmmoState()
  dispose()
}
```

Implementations: `RailgunWeapon`, `FlamethrowerWeapon`, `CannonWeapon`.  
Factory: `createWeapon` in `PlayerFactory.ts` (single path for player & bots).

### 3. Damage ports

- Domain: `DamageSystem` + `TankLike` + hooks.
- Glue: `CombatSystem` implements scoring/VFX via hooks.
- Shared hit helper: `applyHit` / `applySplashHit`.

### 4. Ports for I/O

| Port | Role |
|------|------|
| `EffectsPort` | shake, explosions, muzzle, trails |
| `AudioPort` | procedural WebAudio |

Weapons/combat depend on ports, not concrete `Effects`/`AudioFX` (testable).

### 5. Event bus

`GameEvent` union → React:

`playerHit` · `enemyHit` · `kill` · `wave` · `intermission` · `shotFired` · `gameOver` · `pauseChanged` · `garageChanged`

### 6. Run state

`RunState`: mode, pause, intermission, score, kills, loadout.  
Persistence: `localStorage` keys `as2_loadout`, `as2_quality`.

### 7. Deterministic wave preview

`previewWaveComposition` mirrors `spawnBot` hull/turret/role so intermission UI matches actual spawn.

## Directory map

```
src/
  core/           # domain data & damage contract
  game/
    engine/       # GameSimulation, projectiles, physics, systems
    weapons/      # three weapon classes
    arena/        # modular factory pieces
    camera/       # mode-based camera
    effects/      # particle subsystems
    ports/        # AudioPort, EffectsPort
    tank/         # mesh build + sim ports
  components/     # React UI
  hooks/
```

## God nodes (knowledge graph)

Most connected abstractions (from Graphify):

1. `AudioPort` / `EffectsPort`
2. `TankEntity`
3. `CameraRig` / `GameApi` / `Game`
4. `GameEvent` / `Combat` path

Use `graphify query|path|explain` before structural refactors.

## Testing strategy

- Pure logic unit tests: scoring, flame cone, railgun fire FSM, wave buffs, death lifecycle, physics.
- Vitest in `src/__tests__/`.
- Commands: `npm test`, `npm run typecheck`, `npm run lint`.

## Non-goals (current build)

- Multiplayer / netcode  
- Separate armor DR formula (HP-only “armor”)  
- Inventory / currency meta beyond wave buffs  
- Projectile pool for railgun/flame  

## Related GDD

Полный список механик: [[../GDD/Approved/00_Index]].
