# City Level Design — Grid + Districts + Overpass

**Статус:** Approved  
**Слой:** World / Arena  
**Связано:** [[Maps]], [[Arena_Physics]], [[AI_Bots]]

## Vision

Ночной кибер-город: **читаемый крест авеню**, 4 квартала с district-акцентами, плаза в центре, **короткая эстакада** как вертикальный landmark. Геймплей — tank arena: open fire lanes + flank alleys + soft cover, который ломается.

## Street graph (world, arena half ≈ 75)

| Element | Clear zone | Role |
|---------|------------|------|
| N–S Main | x ∈ [−7, 7] | Primary fire lane |
| E–W Main | z ∈ [−7, 7] | Primary fire lane |
| N–S Secondary | x ∈ [24, 32] approx | Secondary lane |
| E–W Secondary | z ∈ [24, 32] approx | Secondary lane |
| Outer ring | \|x\| or \|z\| ≈ 52–60 | Spawn-adjacent corridor |
| Alleys | 6–8 m gaps in L/U blocks | Flanks, AI retreat |

**Rule:** no solid office/shop may intersect main avenues.

## Districts (flavor props, balance still grid)

| Quadrant | Theme | Soft cover accent |
|----------|-------|-------------------|
| NW | Construction | Jersey barriers, scaffolding frames, crates |
| NE | Parking / Mall | Cars, low lot walls, ticket booth |
| SW | Neon Market | Kiosks, dumpsters, magenta signs |
| SE | Residential | Planters, bus stop, lower apartments |
| Center | Civic Plaza | Monument + planter/bench ring |

## Cover hierarchy

| Tier | Examples | Destructible | blocksSight |
|------|----------|--------------|-------------|
| Hard | Office wings, shops, overpass pillars | No | Yes |
| Medium | Jersey rows, kiosks, metro mouth | Optional / yes | Yes |
| Soft | Cars, vans, planters, delivery crates | Yes | Yes |
| Non-LOS | Billboards (thin), lamps, ramps | No | False / ramp |

## Overpass (short segment)

- East–west deck roughly along z ≈ −36 to −40, spanning mid secondary road (not blocking main cross).
- Solid **pillars** only (hard cover under).
- **Deck** visual + high enough that tanks pass under; colliders for pillars only (or deck with blocksSight false if needed).
- Approach **ramps** at ends (`kind: ramp`, `blocksShots: false`).

## Implemented layout (code)

**Builder:** `buildCityContent` in `src/game/arena/cityMap.ts`

| Zone | Contents |
|------|----------|
| Plaza | Monument + fountain basin, 12 planters, 4 hard jersey approaches |
| Blocks | 16 offices (4 per quadrant, L/grid) + 8 street shops; avenues clear |
| NE | Parking cars, lot jersey walls, ticket kiosk |
| NW | Jersey rows, crates, scaffold frame |
| SW | Market kiosks, dumpsters, mid billboards |
| SE | Planters, bus stops, residential cars |
| Overpass | EW at z≈−40: 4 pillars (solid), visual deck + neon rails, 4 approach ramps |
| Ramps | City-local only (no shared factory `buildRamps`) |
| Ground | `cityGroundTexture` — main cross x/z=0, secondary ±28, plaza, NE stalls, overpass shadow |

## Code map

| Piece | File |
|-------|------|
| Content builder | `src/game/arena/cityMap.ts` |
| Ground paint | `cityGroundTexture` in `src/game/textures/ground.ts` |
| Shell theme | `buildArena` city case in `ArenaBuilder.ts` |
| Catalog blurb | `src/game/maps/mapCatalog.ts` |

## Success criteria

- Main avenues readable in 10s from overhead camera / minimap silhouette.
- Soft cover ~2× denser mid-ring than pre-redesign; linear jersey/planter rows.
- Distinct neon-night look; district accents without unbalancing one camp zone.
- Spawns and plaza exits free; no dead-end courtyards.
