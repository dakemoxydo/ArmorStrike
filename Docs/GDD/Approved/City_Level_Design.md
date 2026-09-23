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
| Plaza core | \|x\|, \|z\| < 24 | CP-A: проходимый подиум монумента + голо-фонтан, плантеры вне осей |
| Alleys | gaps between L-block offices | Flanks, AI retreat |

**Rule:** no solid office/shop may intersect main avenues (x∈[−14,14] or z∈[−14,14]).

## Districts (flavor props, cover density balanced ±20%)

| Quadrant | Theme | Soft / medium accent |
|----------|-------|----------------------|
| NW | Construction | Jersey grids, scaffold frame, crate stacks |
| NE | Parking / Mall | Dense car rows, lot jersey walls, ticket kiosk |
| SW | Neon Market | Kiosks, dumpsters, magenta billboards |
| SE | Residential | Planters, bus stops, residential cars |
| Center | Civic Plaza | CP-A подиум (drivable `ramp` 15×15×1.4) + голо-колонна/кольца без коллайдера, planter ring, jersey-подходы вне осей авеню |

## Cover hierarchy

| Tier | Examples | Destructible | blocksSight |
|------|----------|--------------|-------------|
| Hard | Offices, shops, overpass pillars, dock containers | No | Yes |
| Medium | Jersey rows, kiosks | Optional / yes | Yes |
| Soft | Cars, vans, planters, delivery crates | Yes | Yes |
| Non-LOS | Billboards (тонкие, `blocksSight:false`, но снаряды держат — `blocksShots:true` по дефолту), lamps (без коллайдера), ramps | No | False / ramp |

## Overpass (EW spine south of center)

- Deck along **z ≈ −80**, length ~148 m (visual).
- Solid **pillars only** at x ∈ {−56, −24, 24, 56} (hard cover under; внешняя
  пара сдвинута с ±64 — у спавнов (±70, −90) держим клиренс ≥10 м, I4).
- **Deck** visual + high enough tanks pass under; no shot-block slab.
- Neon rails + under-glow strip.
- Approach **ramps** at ends (`kind: ramp`, `blocksShots: false`); южные подъезды
  за офисным рядом (±84, −108), вне спавн-афронов.

## Capture points (батч-фикс I5)

- **A** (0, 0) — центр плазы на проходимом подиуме: основание `ramp`
  (танк въезжает = захватывает), колонна/капитель/кольцо — голография без
  коллайдера; hard-объектов в диске (r=20) нет.
- **B** (0, 78) / **C** (0, −78) — север/юг магистраль, зеркальны на 180°,
  путь от своей базы (0, ±120) = 42 м у обоих.
- Спавны вне дисков захвата (≥ CAPTURE.radius) и вне геометрии (≥10 м) —
  контракт пинит `cityMap.test.ts`.

## Implemented layout (code)

**Builder:** `buildCityContent` in `src/game/arena/cityMap.ts`

| Zone | Contents |
|------|----------|
| Plaza | CP-A: drivable monument-podium (`ramp` 15×15×1.4) + non-solid holo fountain (cap/ring — обелиск-анимация), 12 planters вне осей, 4 jersey-подхода |
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
| Bot spawns | `FFA_SPAWN_POINTS` corners ±128 + edges (~132–134, 180°-зеркала) — `match/spawnPoints.ts` |
| Player start | `(0, 0, −120)` — `match/rosterSpawn.ts` |
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

## Verification

- `cityMap.test.ts` — контракты авеню/спавнов/CP (I4/I5).
- `npm run map-plan city` — плотность (I2, 2026-09-23): 214 коллайдеров ·
  hard/квадрант NW 21 / NE 17 / SW 21 / SE 24 (разброс ±17% < заявленных ±20%) ·
  soft 19 / 28 / 25 / 16 (вариация = district-флейвор: парковка NE гуще, SE жилой
  гуще плантерами). «Clear gaps» нет, патчи не нужны.
