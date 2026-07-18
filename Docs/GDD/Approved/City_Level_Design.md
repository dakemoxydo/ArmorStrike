# City Level Design — Grid + Districts + Overpass

**Статус:** Approved  
**Слой:** World / Arena  
**Связано:** [[Maps]], [[Arena_Physics]], [[AI_Bots]], [[Village_Level_Design]]

## Vision

Ночной кибер-город на арене **300×300** (half = 150): **читаемый крест авеню**, 4 квартала с district-акцентами, civic-плаза в центре, **эстакада** как вертикальный landmark. Геймплей — tank arena: open fire lanes + flank alleys + soft cover, который ломается.

## Street graph (world, arena half = 150)

| Element | Clear zone | Role |
|---------|------------|------|
| N–S Main | x ∈ [−14, 14] | Primary fire lane |
| E–W Main | z ∈ [−14, 14] | Primary fire lane |
| Secondary | \|x\|≈56, \|z\|≈56 | Secondary lanes, low channels |
| Outer ring | \|x\| or \|z\| ≈ 104–120 | Spawn-adjacent corridor |
| Plaza core | \|x\|, \|z\| < 24 | Monument + soft planter ring |
| Alleys | gaps between L-block offices | Flanks, AI retreat |

**Rule:** no solid office/shop may intersect main avenues (x∈[−14,14] or z∈[−14,14]).

## Districts (flavor props, cover density balanced ±20%)

| Quadrant | Theme | Soft / medium accent |
|----------|-------|----------------------|
| NW | Construction | Jersey grids, scaffold frame, crate stacks |
| NE | Parking / Mall | Dense car rows, lot jersey walls, ticket kiosk |
| SW | Neon Market | Kiosks, dumpsters, magenta billboards |
| SE | Residential | Planters, bus stops, residential cars |
| Center | Civic Plaza | Monument + fountain, planter ring, hard jersey approaches |

## Cover hierarchy

| Tier | Examples | Destructible | blocksSight |
|------|----------|--------------|-------------|
| Hard | Offices, shops, overpass pillars, dock containers | No | Yes |
| Medium | Jersey rows, kiosks | Optional / yes | Yes |
| Soft | Cars, vans, planters, delivery crates | Yes | Yes |
| Non-LOS | Billboards (thin), lamps, ramps | No | False / ramp |

## Overpass (EW spine south of center)

- Deck along **z ≈ −80**, length ~148 m (visual).
- Solid **pillars only** at x ∈ {−64, −24, 24, 64} (hard cover under).
- **Deck** visual + high enough tanks pass under; no shot-block slab.
- Neon rails + under-glow strip.
- Approach **ramps** at ends (`kind: ramp`, `blocksShots: false`).

## Implemented layout (code)

**Builder:** `buildCityContent` in `src/game/arena/cityMap.ts`

| Zone | Contents |
|------|----------|
| Plaza | Monument + fountain (scaled), 12 planters, 4 hard jersey approaches |
| Blocks | 16 offices (4 per quadrant) + 8 street shops; avenues clear |
| NE | Parking cars, lot walls, ticket kiosk |
| NW | Jersey rows, crates, scaffold frame |
| SW | Market kiosks, dumpsters, billboards |
| SE | Planters, bus stops, residential cars |
| Overpass | EW at z≈−80: 4 pillars (solid), visual deck + neon, 4 approach ramps |
| Mid-ring | Linear jersey along secondary; flank ramps (city-local) |
| Outer | Dock-container hard anchors; edge lamps / traffic lights |
| Ramps | City-local only (no shared factory `buildRamps`) |
| Skyline | Dense neon towers r≈172–244 (visual, outside playable box) |
| Atmosphere | Dome height ~80, ~560 dust particles |
| Ground | `cityGroundTexture` S=3072 — main cross, secondary, plaza, crosswalks, parking stalls, overpass shadow |

## Shared scale (arena 300)

Глобально: `ARENA.size = 300` (`src/game/constants.ts`).

| System | Value |
|--------|--------|
| Bot spawns | `SPAWN_POINTS` corners ±128 + edges (~132–135) |
| Player start | `(0, 0, −120)` — `PlayerFactory` |
| Minimap half | `MAP_HALF = 156` — `minimapDraw.ts` |
| Fog / camera | fog 130..440, camera far 900, shadow frustum ±170 — `RenderWorld` |

**Note:** projectile `range=85` and AI `sightRange=46` unchanged — long travel on 300-map is expected; balance pass is a separate task.

## Code map

| Piece | File |
|-------|------|
| Content builder | `src/game/arena/cityMap.ts` |
| Ground paint | `cityGroundTexture` in `src/game/textures/ground.ts` |
| Shell theme | `buildArena` city case in `ArenaBuilder.ts` |
| Catalog blurb | `src/game/maps/mapCatalog.ts` |

## Success criteria

- Main avenues readable in 10s from overhead / minimap silhouette.
- Soft cover denser mid-ring; linear jersey/planter rows.
- Distinct neon-night look; district accents without unbalancing one camp zone.
- Spawns and plaza exits free; no dead-end courtyards.
