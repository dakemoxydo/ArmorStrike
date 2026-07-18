# Village Level Design — Square + Barns + Paddocks

**Статус:** Approved  
**Слой:** World / Arena  
**Связано:** [[Maps]], [[Arena_Physics]], [[City_Level_Design]], [[AI_Bots]]

## Vision

Просторный **сельский посёлок** на арене **300×300** (half = 150): тёплый dusk, wood + plaster + hay. Центральная **рыночная площадь с колодцем**, intentional hard-cover graph (дома/амбары), soft paddock-мазы из заборов, raised hay platform. Не industrial (в отличие от factory) и не neon downtown (в отличие от city).

Accent: gold `#c8a24a`.

## Layout graph (world, arena half = 150)

| Element | Zone | Role |
|---------|------|------|
| Square core | \|x\|, \|z\| < 28 | Well landmark + market stalls + soft barrels |
| Fire lanes | N–S x∈[−10,10], E–W z∈[−10,10] | Clear cross through square |
| Barn clusters | NW (~−96, +84), SE (~96, −84) + mid barns | Hard anchors / flank landmarks |
| House graph | mid-ring \|x\|,\|z\|≈76–90 (~14 houses) | Hard cover, yaw toward centre |
| Paddocks | L-fences + approach + diagonal lines | Soft peek mazes, open ends (no dead-ends) |
| Hay platform | NE (~64, 64) | Raised medium cover + 2 approach ramps |
| Trees | scattered outer/mid | Trunk-only collision; canopy non-LOS |

## Cover hierarchy

| Tier | Examples | Destructible | blocksSight |
|------|----------|--------------|-------------|
| Hard | Houses, barns | No | Yes (`kind: wall`) |
| Medium | Solid wood blocks, hay platform base | No / high HP | Yes |
| Soft | Fences, hay bales, barrels, market stalls | Yes (HP ~45–70) | Yes |
| Non-LOS | Tree canopy, warm lanterns | No | False / canopy non-LOS |

## Implemented layout (code)

**Builder:** `buildVillageContent` in `src/game/arena/villageMap.ts`

| Zone | Contents |
|------|----------|
| Square | Well (stone + posts + gold lantern), 4 market stalls, barrels |
| Houses | 14 houses mid-ring: timber corners, warm windows, doors; yaw to centre |
| Barns | NW pair, SE pair, 2 mid-barns; plank detail + prism roofs |
| Fences | L-paddocks near barns, central approaches, diagonal soft lines |
| Trees | Trunk colliders only (`blocksSight: false` for canopy intent) |
| Soft scatter | Hay-lines + barrel clusters along lanes |
| Hay platform | NE deck ~14×14×2.6, hay bales on top, 2 local approach ramps |
| Ramps | Village-local only (not shared factory `buildRamps`) |
| Skyline | Rolling hills + low farmhouses with warm windows (outside walls) |
| Atmosphere | Warm gold dome, ~520 dust particles |
| Ground | `villageGroundTexture` S=3072 — dirt cross, barn paths, square cobble-ring, tilled fields + furrows, wheel ruts |

## Shared scale (arena 300)

См. [[Maps]] / [[City_Level_Design]]: `ARENA.size=300`, spawns ±128, player `(0,0,−120)`, minimap half 156, fog/camera scaled in `RenderWorld`.

## Code map

| Piece | File |
|-------|------|
| Content builder | `src/game/arena/villageMap.ts` |
| Ground paint | `villageGroundTexture` in `src/game/textures/ground.ts` |
| Shell theme | `buildArena` village case in `ArenaBuilder.ts` |
| Catalog blurb | `src/game/maps/mapCatalog.ts` |

## Success criteria

- Market square + well readable as central landmark in 10s.
- Fire lanes through centre clear; ≥2 flank routes between major clusters.
- Houses/barns form intentional hard-cover graph (not pure random scatter).
- Fences/hay/barrels create soft peek lines with open paddock ends.
- Warm rural identity distinct from factory/city at a glance.
- Ground paint shows dirt cross, square, barn paths, fields.
