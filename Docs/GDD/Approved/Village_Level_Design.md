# Village Level Design — Square + Chapel + Barns + Paddocks

**Статус:** Approved  
**Слой:** World / Arena  
**Связано:** [[Maps]], [[Arena_Physics]], [[City_Level_Design]], [[Factory_Level_Design]], [[AI_Bots]]

## Vision

Просторный **сельский посёлок** на арене **300×300** (half = 150): тёплый **golden-hour dusk** (per-map atmosphere), wood + plaster + thatch. Центральная **рыночная площадь с колодцем** (кран «журавль») на перекрёстке, intentional hard-cover graph (фахверковые дома/амбары), soft paddock-мазы из заборов, raised hay platform, **анимированный ветряк**, **часовня с колокольней**, пруд с мостками, фруктовый сад, пшеничные поля. Не industrial (в отличие от factory) и не neon downtown (в отличие от city).

Accent: gold `#c8a24a`.

## Per-map atmosphere (RenderWorld)

Village рендерится в **тёплом закатном свете**, а City/Factory — в прежней холодной/натриевой ночи (нулевой регресс). Пресеты атмосферы выбираются по `MapId` и применяются при каждой сборке арены.

- **Пресеты:** `src/game/atmospherePresets.ts` (`getAtmosphere`, `ATMOSPHERES`). `factory` = `FACTORY`, `city` = `NIGHT`, `village` = `DUSK`.
- **Поля пресета:** background, fog (color/near/far), exposure, hemi (sky/ground/intensity), sun (color/intensity/position), rim (color/intensity), sky uniforms (zenith/horizon/cloud/sunDir/sunDisc/sunGlow).
- **Village DUSK:** sun `[185,78,118]` (ниже → длинные тени), fog `#6b4a34`, rim `#ff9a4d`, exposure `1.0`, sky horizon `#f58c4d`-подобный тёплый.
- **Применение:** `RenderWorld.applyAtmosphere(mapId)` вызывается из `buildArena(arena, effects, mapId, renderWorld)`; `Arena.setRenderWorld(renderWorld)` пробрасывает ссылку из `GameBootstrap`. Правило C3 — без циклических импортов.

> **Тонкость альбедо:** DUSK даёт sun 2.0 при exposure 1.0 — светлые albedo выбиваются в белый под ACES. Пластырь/крыши деревни держим в среднем тоне (`PLASTER_TONES`/`ROOF_TONES` в `villageMap.ts`).

## Textures (village-native)

Деревня **не использует ассеты завода**. Собственный модуль `src/game/textures/village.ts`:

| Фабрика | Применение |
|---------|-----------|
| `plasterTexture(tone)` | стены домов / часовни / ветряка (известь + трещины) |
| `plankTexture(tone, vertical)` | амбары, заборы, телега, мостки, столбы |
| `thatchTexture(tone)` | крыши амбаров, скирды, навес колодца |
| `shingleTexture(tone)` | крыши домов, шпили |
| `hayBaleTexture()` | тюки сена, платформа, воз |
| `oakBarrelTexture()` | дубовые бочки с железными обручами |
| `fieldstoneTexture(tone)` | колодец, цоколи, часовня, ветряк |
| `duskGlowTexture()` | купол атмосферы (вместо cyan-`hexTexture`) |
| `villageWallTexture()` | периметр арены (фахверк + тёплое окно) |

**Оболочка:** `ArenaShellTheme` получил опциональные `wallMap` и `signStyle` (`'tech' | 'rural'`). Village передаёт `wallMap: villageWallTexture()` и `signStyle: 'rural'` (painted-wood вывески вместо неоновых). Factory/City не затронуты (defaults).

Ранее деревня тянула `crateTexture` (сено с промышленными шевронами и болтами), `barrelTexture` (бочки с надписью «FUEL-51») и `hexTexture` (cyan-сетка неба) — всё заменено.

## Animated nodes (ArenaEffects)

Generic-механизм «живых» узлов: `ArenaEffects.animNodes: AnimNodeFn[]` (callback `(dt, elapsed)`), проброшен в `ArenaBuildContext.animNodes` и вызывается в `ArenaEffects.update`. Очищается в `resetForRebuild`.

- **Ветряк** (NE outer, `118,108`): башня + cap + ротор с 4 лопастями; вращение через `animNodes`. Hard cover (`wall`).
- **Колокольня часовни** (SW outer, `-104,-100`): язык колокола качается, флюгер вращается по ветру. Hard cover (`wall`).
- **Гирлянды над площадью**: 4 столба + провисающие лампочки; лёгкое мерцание цвета. Не-LOS.
- **Пруд** (NW inner, `-48,48`): анимация прозрачности воды (рябь).
- **Рыночные флаги** (4 на площади): вершинная анимация ткани + покачивание по ветру. Не-LOS.
- **Светлячки / пыльца** (~90 точек): аддитивные points, блуждание + пульс. Не-LOS.
- **Дым из труб** домов через `smokeEmitters` (стековый пул `ArenaEffects`).

## Layout graph (world, arena half = 150)

| Element | Zone | Role |
|---------|------|------|
| Square core | \|x\|,\|z\| < 30 | Cobble plaza, CP-A, stalls, trough, wagon, signpost, string lights |
| Fire lanes | N–S x∈[−10,10], E–W z∈[−10,10] | **Полностью пустой** крест (ни одного коллайдера) |
| Well | (−16, 30) | Landmark у северного края площади; hard cover **вне** креста и CP-A |
| Chapel | SW outer (−104, −100) | Nave + bell tower, самый высокий лендмарк, hard anchor |
| Barns | NW (−98,82)/(−120,108) · SE (98,−82)/(118,−106) + 2 mid | Hard anchors / flank landmarks |
| House graph | mid-ring r≈58–72 (~14 домов) | Hard cover, yaw toward centre |
| Paddocks | L-fences у амбаров + «крылья» у устьев магистралей | Soft peek mazes, open ends (no dead-ends) |
| Orchard | SW inner (−50, −52) | 9 instanced fruit trees (trunk-only collision) |
| Pond | NW inner (−48, 48) | Water (non-LOS) + jetty + rowboat + reeds + lily pads |
| Hay platform | NE (64, 64) | Raised medium cover + 2 approach ramps |
| Haystacks | fields (6) | Soft conical cover |
| Windmill | NE outer (118, 108) | Animated landmark |
| Trees | scattered outer/mid (20) | Trunk-only collision; canopy non-LOS |
| Spawn aprons | x∈[−78,78], \|z\|∈[84,130] | **Пусто** — здесь спавнятся команды |

## Capture points (per-map anchors)

`src/game/match/captureAnchors.ts`:

| Id | Anchor | Зона |
|----|--------|------|
| A | (0, 4) | центр площади, открытый плац |
| B | (−100, 20) | западный луг (вне кольца домов) |
| C | (100, −20) | восточный луг |

Каждый якорь стоит в **радиусе ~20 м чистого поля** (только soft cover) — иначе точка
неоспорима. Инвариант запинен в `villageMap.test.ts`.

## Cover hierarchy

| Tier | Examples | Destructible | blocksSight |
|------|----------|--------------|-------------|
| Hard | Houses, barns, chapel, well | No | Yes (`kind: wall`) |
| Medium | Wood piles, hay platform base | No | Yes |
| Soft | Fences, hay bales, haystacks, barrels, stalls, wagon, jetty, rowboat, trough, signpost | Yes (HP ~25–75) | Yes |
| Non-LOS | Tree canopy, orchard canopy, water, reeds, flowers, string lights, ramps | No | False |

## Implemented layout (code)

**Builder:** `buildVillageContent` in `src/game/arena/villageMap.ts`

| Zone | Contents |
|------|----------|
| Square | Well (stone + posts + gold lantern + кран «журавль», thatch-навес), stone trough, 3 market stalls, hay wagon, signpost, 4 string-light spans, 4 флага, cobble paving |
| Chapel | Nave (buttresses, stained-glass, arched door, rose window, gable cross) + bell tower (louvres, spire, swinging bell, weathervane) |
| Houses | 14 timber-framed: plaster walls, цоколь, фахверк, shingle-крыша, дымовая труба (+smoke), ставни/подоконники; 2 уменьшенных cottages |
| Barns | NW pair, SE pair, 2 mid-barns; plank-стены, gambrel-thatch-крыши, ворота с X-обвязкой |
| Fences | L-paddocks у амбаров + 8 «крыльев» у устьев магистралей (никогда не поперёк креста) |
| Orchard | 9 instanced фруктовых деревьев (розовая крона) + 2 ящика под яблоки |
| Pond | Вода + глинистый берег + мостки + лодка + 96 instanced камышей + 12 лилий |
| Trees | 20 деревьев: 1 instanced trunks + 3 instanced canopy-buckets (было 80 мешей → 4 draw) |
| Soft scatter | 12 hay-lines + 8 barrel-кластеров (instanced) + 4 wood-piles |
| Haystacks | 6 конических скирд с шестом (soft, HP 55) |
| Hay platform | NE deck ~14×14×2.6, hay bales on top, 2 local approach ramps |
| Ramps | Village-local, декоративные клинья: платформа (52,64)/(64,52) + фланги (±110,±60) |
| Windmill | Анимированный ветряк NE outer (118,108), ротор через `animNodes` |
| Flowers | 220 instanced цветов (2 draw) в inner ring, вне магистралей/площади/aprons |
| Foliage | Instanced трава/пшеница (~420 пучков, non-LOS) |
| Skyline | Rolling hills + low farmhouses with warm windows (outside walls) |
| Atmosphere | Per-map DUSK preset + warm dusk-glow dome, ~520 dust, ~90 светлячков |
| Ground | `villageGroundTexture` S=3072 — dirt cross, тропы к лендмаркам, cobble-площадь, CP-кольца, churchyard, пруд, сад, wheat/tilled fields, лужи, подписи |

## Shared scale (arena 300)

См. [[Maps]] / [[City_Level_Design]]: `ARENA.size=300`, spawns ±128, player `(0,0,−120)`, minimap half 156, fog/camera scaled in `RenderWorld`.

## Code map

| Piece | File |
|-------|------|
| Content builder | `src/game/arena/villageMap.ts` |
| Village textures | `src/game/textures/village.ts` (+ `textures/index.ts`) |
| Ground paint | `villageGroundTexture` in `src/game/textures/ground.ts` |
| Atmosphere presets | `src/game/atmospherePresets.ts` |
| Atmosphere apply | `RenderWorld.applyAtmosphere` + `buildArena(..., renderWorld)` |
| Animated nodes | `ArenaEffects.animNodes` + `ArenaBuildContext.animNodes` |
| Capture anchors | `src/game/match/captureAnchors.ts` |
| Shell theme | `buildArena` village case in `ArenaBuilder.ts` (`wallMap`, `signStyle`) |
| Contract test | `src/__tests__/villageMap.test.ts` |
| Catalog blurb | `src/game/maps/mapCatalog.ts` |

## Verification

- `villageMap.test.ts` — 13 пинов: крест без hard cover, центральная полоса без коллайдеров,
  CP-якоря чисты (9 м / 20 м), спавны и aprons пусты, покрытие квадрантов, outer band,
  «внутри стен», рампы non-blocking, живые узлы + дым.
- `npm run map-plan village` — top-down план по реальным коллайдерам.
- `npm run census` — village ≈ 800 draw calls (34 instanced группы).

## Success criteria

- Market square + well readable as central landmark in 10s.
- Fire lanes through centre clear of **every** collider; ≥2 flank routes between clusters.
- Houses/barns/chapel form an intentional hard-cover graph (not pure random scatter).
- Fences/hay/barrels create soft peek lines with open paddock ends.
- Every capture anchor contestable: no hard cover within `CAPTURE.radius`.
- Team spawn aprons (x∈[−78,78], |z|∈[84,130]) free of geometry.
- Warm rural identity distinct from factory/city at a glance (**golden-hour dusk vs cold/sodium night**), **no factory textures on the map**.
- Ground paint shows dirt cross, cobble square, CP rings, churchyard, pond, orchard, wheat/tilled fields.
- Chapel spire + windmill readable on the horizon; smoke rises from chimneys.
- City/Factory visuals unchanged (atmosphere regression = 0; shell theme defaults untouched).
