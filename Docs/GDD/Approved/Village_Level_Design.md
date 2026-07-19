# Village Level Design — Square + Barns + Paddocks

**Статус:** Approved  
**Слой:** World / Arena  
**Связано:** [[Maps]], [[Arena_Physics]], [[City_Level_Design]], [[AI_Bots]]

## Vision

Просторный **сельский посёлок** на арене **300×300** (half = 150): тёплый **golden-hour dusk** (per-map atmosphere), wood + plaster + hay. Центральная **рыночная площадь с колодцем** (кран «журавль»), intentional hard-cover graph (фахверковые дома/амбары), soft paddock-мазы из заборов, raised hay platform, **анимированный ветряк**, пшеничные поля. Не industrial (в отличие от factory) и не neon downtown (в отличие от city).

Accent: gold `#c8a24a`.

## Per-map atmosphere (RenderWorld)

Village рендерится в **тёплом закатном свете**, а City/Factory — в прежней холодной ночи (нулевой регресс). Пресеты атмосферы выбираются по `MapId` и применяются при каждой сборке арены.

- **Пресеты:** `src/game/atmospherePresets.ts` (`getAtmosphere`, `ATMOSPHERES`). `factory`/`city` = `NIGHT`, `village` = `DUSK`.
- **Поля пресета:** background, fog (color/near/far), exposure, hemi (sky/ground/intensity), sun (color/intensity/position), rim (color/intensity), sky uniforms (zenith/horizon/cloud/sunDir/sunDisc/sunGlow).
- **Village DUSK:** sun `[185,78,118]` (ниже → длинные тени), fog `#6b4a34`, rim `#ff9a4d`, exposure `1.14`, sky horizon `#f58c4d`-подобный тёплый.
- **Применение:** `RenderWorld.applyAtmosphere(mapId)` вызывается из `buildArena(arena, effects, mapId, renderWorld)`; `Arena.setRenderWorld(renderWorld)` пробрасывает ссылку из `GameBootstrap`. Правило C3 — без циклических импортов.

## Visual detail pass (geometry, non-gameplay)

Геймплейный скелет (коллайдеры, позиции, fire-lanes, HP) **неизменен**. Визуальный слой:

- **Shadow pass:** `castShadow/receiveShadow` у fence-рельсов, тентов ларьков, кромки колодца, стволов/крон деревьев, дверей.
- **Дома:** каменный цоколь, фахверк (horizontal ledgers + vertical studs), крыша со свесом и высоким коньком, **дымовая труба** (`smokeEmitters`), дверная рама + козырёк, оконные рамы + ставни + подоконники.
- **Амбары:** каменный цоколь, **gambrel-крыша** (`gambrelRoof`), ворота с рамой и **X-обвязкой**.
- **Колодец:** кран «журавль» (стрела + рычаг + верёвка + ведро) поверх прежнего навеса и gold-фонаря.

## Animated nodes (ArenaEffects)

Generic-механизм «живых» узлов: `ArenaEffects.animNodes: AnimNodeFn[]` (callback `(dt, elapsed)`), проброшен в `ArenaBuildContext.animNodes` и вызывается в `ArenaEffects.update`. Очищается в `resetForRebuild`.

- **Ветряк** (NE outer, ~`118,108`): башня + cap + ротор с 4 лопастями; вращение через `animNodes`. Hard cover (`wall`).
- **Рыночные флаги** (4 на площади): вершинная анимация ткани + покачивание по ветру. Не-LOS (визуал, без коллайдера).
- **Светлячки / пыльца** (~90 точек): аддитивные points, блуждание + пульс в лучах заката. Не-LOS.
- **Дым из труб** домов через существующий `smokeEmitters` (стековый пул `ArenaEffects`).

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
| Square | Well (stone + posts + gold lantern + кран «журавль»), 4 market stalls, barrels, 4 флага, cobble paving |
| Houses | 14 houses mid-ring: цоколь, фахверк, свес-крыша, дымовые трубы (+smoke), ставни/подоконники; yaw to centre |
| Barns | NW pair, SE pair, 2 mid-barns; цоколь, plank detail, gambrel-крыши, ворота с X-обвязкой |
| Fences | L-paddocks near barns, central approaches, diagonal soft lines (castShadow) |
| Trees | Trunk colliders only; кроны/стволы отбрасывают тени |
| Soft scatter | Hay-lines + barrel clusters along lanes |
| Hay platform | NE deck ~14×14×2.6, hay bales on top, 2 local approach ramps |
| Ramps | Village-local only (not shared factory `buildRamps`) |
| Windmill | Анимированный ветряк NE outer (~118,108), ротор через `animNodes` |
| Foliage | Instanced трава/пшеница (~420 пучков, non-LOS, вне fire-lanes) |
| Skyline | Rolling hills + low farmhouses with warm windows (outside walls) |
| Atmosphere | Per-map DUSK preset (sky/fog/sun/rim) + gold dome, ~520 dust, ~90 светлячков |
| Ground | `villageGroundTexture` S=3072 — dirt cross, barn paths, cobble-площадь, wheat fields + tilled furrows, wheel ruts |

## Shared scale (arena 300)

См. [[Maps]] / [[City_Level_Design]]: `ARENA.size=300`, spawns ±128, player `(0,0,−120)`, minimap half 156, fog/camera scaled in `RenderWorld`.

## Code map

| Piece | File |
|-------|------|
| Content builder | `src/game/arena/villageMap.ts` |
| Ground paint | `villageGroundTexture` in `src/game/textures/ground.ts` |
| Atmosphere presets | `src/game/atmospherePresets.ts` |
| Atmosphere apply | `RenderWorld.applyAtmosphere` + `buildArena(..., renderWorld)` |
| Animated nodes | `ArenaEffects.animNodes` + `ArenaBuildContext.animNodes` |
| Shell theme | `buildArena` village case in `ArenaBuilder.ts` |
| Catalog blurb | `src/game/maps/mapCatalog.ts` |

## Success criteria

- Market square + well readable as central landmark in 10s.
- Fire lanes through centre clear; ≥2 flank routes between major clusters.
- Houses/barns form intentional hard-cover graph (not pure random scatter).
- Fences/hay/barrels create soft peek lines with open paddock ends.
- Warm rural identity distinct from factory/city at a glance (**golden-hour dusk vs cold night**).
- Ground paint shows dirt cross, cobble square, barn paths, wheat/tilled fields.
- Windmill silhouette readable on the horizon; smoke rises from chimneys.
- City/Factory visuals unchanged (atmosphere regression = 0).
