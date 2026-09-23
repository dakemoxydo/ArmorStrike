# Factory Level Design — Foundry Complex «ЗАВОД-51»

**Статус:** Approved  
**Слой:** World / Arena  
**Связано:** [[Maps]], [[Arena_Physics]], [[City_Level_Design]], [[Village_Level_Design]], [[AI_Bots]]

## Vision

Промышленный **литейный комплекс** на арене **300×300** (half = 150): натриевая смога-ночь (per-map atmosphere `FACTORY`), сталь + бетон + ржавчина + аварийный амбер. Геймплей — tank arena: **читаемый крест магистралей**, 4 производственных квартала-district, **портальный кран** как вертикальный landmark над центром, плаза под краном. Не rural (в отличие от village) и не neon downtown (в отличие от city) — тяжёлый индустриальный характер.

Accent: аварийный амбер `#ffb02e` (holo-маяк над CP-B того же янтаря `#f59e0b`).

**Историческая справка:** до 2026-09-11 карта была собрана из legacy-модулей, рассчитанных на ~±75 из 300 — на 300-арене оставался «остров» в центре с пустым outer ring (это был Known gap #1 в [[Maps]]). Контент полностью пересобран на всю арену, модули удалены (см. §«Code map»).

## Layout graph (world, arena half = 150)

| Element | Clear zone | Role |
|---------|------------|------|
| N–S main lane | x ∈ [−13, 13] | Primary fire lane (hard cover forbidden) |
| E–W main lane | z ∈ [−13, 13] | Primary fire lane (hard cover forbidden) |
| Centre plaza | \|x\|, \|z\| < 30 clear; hard cover forbidden внутри \|x\|, \|z\| < 34 | Под краном; CP-B в центре |
| Ring road | \|x\|, \|z\| ∈ [34, 46] | Secondary circulation (только soft cover) |
| Outer corridor | \|x\| или \|z\| ≈ 96–140 | Spawn-adjacent кольцо, storage-пады по диагоналям |
| Spawn aprons | \|x\| ≤ 78 при z ∈ [±84, ±130]; углы ±128; edge-точки | Держать свободными |
| Districts | NW foundry · NE container terminal · SW assembly/pipe · SE power/tank farm | Кварталы укрытий |
| Centre | Gantry crane portal + holo beacon | CP-B живёт под ним |

**Rule:** ни одно hard-сооружение не пересекает главные магистрали (x∈[−13,13] или z∈[−13,13]); центральная 12-метровая полоса обеих магистралей полностью открыта.

## Districts (flavor props, cover density balanced)

| Quadrant | Theme | Содержимое |
|----------|-------|------------|
| NW | Foundry | Домна (`blastFurnace`), вторая печь, ladle-house, литейный цех, рудный конвейер, slag heap |
| NE | Container terminal | Ряды контейнеров (часть разрушаемых), контейнерные штабели, силосы, crate/barrel кластеры |
| SW | Assembly / pipe | 2 сборочных цеха (gable + flat), pipe-rack, трансформаторы, scrap pile |
| SE | Power / tank farm | 4 цистерны, 2 градирни, трансформаторы, scrap pile |
| Center | Crane portal | 4 ноги-опоры, cap-beams, троллей, holo beacon над CP-B |
| Outer | Storage ring | 4 диагональных storage-пада, угловые дымовые трубы, 8 edge-мачт, rail siding |

## Cover hierarchy

| Tier | Examples | Destructible | blocksSight |
|------|----------|--------------|-------------|
| Hard | Цеха/ангары (`hall`), домна, цистерны, контейнеры-штабели, ноги крана, дымовые трубы, pipe-rack опоры | No | Yes (`kind: wall`) |
| Medium | Плаза-углы 8×8×3.6 (`kind: block`), трансформаторы | No | Yes |
| Soft | Crate stacks, barrel clusters, разрушаемые контейнеры, scrap piles | Yes (HP ~70–90) | Yes |
| Non-LOS | Edge lamp masts, декоративные рампы, трубы над головой | No | False |

## Implemented layout (code)

**Builder:** `buildFactoryContent` in `src/game/arena/factoryMap.ts` (self-contained, без legacy-модулей)

| Zone | Contents |
|------|----------|
| Foundry (NW) | `blastFurnace(-62, 62)` с анимированными искрами и additive glow-сферами «жара» (B7: контента без источников света — Standard Frame Stability §1.6); вторая печь `(-44, 66)`; `ladleHouse(-62, 44)`; литейный цех `hall(-96, 40, 30×18, h 9.5)` gable; рудный `conveyor(-94, −68, len 52, h 6.4)` с инстанс-постами и анимированной рудой; slag heap |
| Container terminal (NE) | `containerRow(52, 36, ×3, step 14)` + разрушаемый `containerRow(68, 43, ×3)`; `containerStack(86, 40)`, `(86, 68)`; `siloCluster(106, 44)`; crate stacks + barrel clusters |
| Assembly (SW) | `hall(-96, −52, 34×18, h 9)` gable; `hall(-52, −70, 26×16, h 8.5)` flat; `pipeRack(−120, −40 → −38)`; 2 трансформатора; crate/barrel/scrap |
| Power (SE) | 4× `storageTank` в сетке `(92…108, −52…−68)`; `coolingTower(56, −58)`, `(74, −70)`; 2 трансформатора; scrap + crate + barrel |
| Centre | Портальный кран: 4 ноги `(±36, ±16)` `legH = 13` (hard), cap-beams, троллей (анимированный `craneTrolley`), holo beacon y = 15.8; рельсы z = ±16 проходят мимо CP-A (z 8) и CP-C (z −6) |
| Outer ring | Диагональные пады `(−108,108)` containers, `(108,108)` pipes, `(−108,−108)` scrap, `(108,−108)` tanks; угловые `smokestack(±144, ±144)`; 8 edge `lampMast`; `railSiding(84, 142, −112)` (flush; коллайдер — проходимый `ramp` с `blocksShots/blocksSight:false`, не solid для корпуса; пин `factoryMap.test.ts`) |
| Mid-ring | Плаза-углы `(±52, ±52)` 8×8×3.6 medium `block`; crate stacks `(±50, ±24)`/`(±24, ±50)` — peek-линии вне магистралей и ring road |
| Ramps | 8 декоративных wedges (`kind: ramp`, `blocksShots/Sight: false`) на подходах к district'ам, вне креста/ring road/spawn aprons |
| Skyline | 34 неоновых башни r ∈ [172, 244] (визуал, вне playable box); 7 дымовых труб; газ-сфера `(−232, 12, −196)` |
| Atmosphere | Per-map `FACTORY` preset (натриевая смога-ночь) + amber dome h 78, 540 пылевых точек |
| Ground | `factoryGroundTexture` S=3072 — крест магистралей, ring road, плаза + CP-кольца A/B/C, foundry molten-зона, container bays, tank pads, rail siding, outer pads, hazard-полосы, подписи |

## Metrics (verified 2026-09-11)

| Metric | Value |
|--------|-------|
| Коллайдеры | **133** — hard 58 · medium 4 · soft 39 · ramps 8 · perimeter 24 |
| Плотность по квадрантам | NW 14H/6S · NE 13H/12S · SW 16H/11S · SE 15H/10S (сбалансировано) |
| Draw calls (census) | **540** est. (mesh 534, points 2, instanced 4 × 69) — легче village 843 / city 754 |
| Ground canvas | S = 3072, LRU-1 через `cachedGround('ground:factory', …)` |

## Per-map atmosphere (RenderWorld)

Factory рендерится в режиме **Comic Industrial Sunset** — насыщенный янтарно-медный закат с глубокими графичными тенями литейных цехов под стилизованным солнцем (см. [[Stylized_Art_Direction]]).

- **Пресет:** `COMIC_FACTORY` в `src/game/atmospherePresets.ts` (`ATMOSPHERES = { factory: COMIC_FACTORY, city: COMIC_CITY, village: COMIC_VILLAGE }`).
- **Ключевые поля:** background `0x323c4a`, fog `0x445263` (near 140 / far 520), exposure **1.15**, hemi sky `0xa8c8e8` / ground `0x242a32` (int 0.65), sun `0xffffff` (int 2.5) `[135, 150, 55]`, rim `0x78b0f0` (int 0.60), чистый дневной sky-uniforms без паразитной желтизны.
- **Отличие от city:** более плотная атмосферная дымка завода `f.fogNear < c.fogNear` (140 < 160) и прохладная индустриальная полусфера. Запинено в `atmospherePresets.test.ts`.
- **Применение:** `RenderWorld.applyAtmosphere(mapId)` из `buildArena(arena, effects, mapId, renderWorld)`.

## Animated nodes (ArenaEffects)

- **Вентиляторы крыш** цехов — `animNodes` (`rotor.rotation.y += dt * speed`).
- **Конвейер** — анимированные InstancedMesh-куски руды; посты — один InstancedMesh.
- **Домна** — растущие искры + пульсация `furnaceGlowMats`; tapping-glows.
- **Расплав** — `moltenMats` (opacity pulse) в foundry-зоне и у плазы.
- **Троллей крана** — `craneTrolley.position.x = sin(elapsed * 0.14) * 13`.
- **Beacon'ы** — `beaconMats` (blink) на ногах крана и edge-мачтах.
- **Дым** — `smokeEmitters` (общий пул `ArenaEffects`, ≤44 спрайта; low: ≤22, cadence ×2, 50% skip — см. Graphics_Presets_Matrix).

## Shared scale (arena 300)

См. [[Maps]] / [[City_Level_Design]]: `ARENA.size=300`, spawns ±128, player `(0,0,−120)`, minimap half 156, fog/camera scaled in `RenderWorld`.

## Code map

| Piece | File |
|-------|------|
| Content builder | `src/game/arena/factoryMap.ts` (`buildFactoryContent`) |
| Ground paint | `factoryGroundTexture` in `src/game/textures/ground.ts` |
| Skyline kit (shared) | `src/game/arena/skyline.ts` (`buildSkyline`) |
| Atmosphere presets | `src/game/atmospherePresets.ts` (`FACTORY`) |
| Animated nodes / effects | `ArenaEffects.animNodes` + `ArenaBuildContext.animNodes` |
| Shell theme | `buildArena` factory case in `ArenaBuilder.ts` |
| Catalog blurb | `src/game/maps/mapCatalog.ts` |
| Layout contract test | `src/__tests__/factoryMap.test.ts` (13) |
| Plan renderer (tool) | `scripts/map-plan.ts` (`npm run map-plan`) |

## Success criteria

- Крест магистралей читается за 10 с с высоты / по силуэту миникарты.
- Центральная 12-метровая полоса обеих магистралей полностью открыта — комфортная стрельба.
- Плаза свободна (CP-B), CP-анкеры A/B/C достижимы, spawn-точки и aprons свободны.
- Hard cover распределён по всем 4 квадрантам; outer band (r > 95) заполнен во всех направлениях.
- Soft cover создаёт peek-линии по mid-ring, не блокируя circulation.
- Все рампы non-blocking; ничего не выходит за стены арены.
- Индустриальная идентичность отличима от village/city с первого взгляда (**натриевая смога-ночь vs закат vs холодный неон**).
- Ground paint показывает крест, ring road, плазу с CP-кольцами, foundry molten-зону, container bays, tank pads.
- City/Village визуалы не тронуты (regression = 0).
