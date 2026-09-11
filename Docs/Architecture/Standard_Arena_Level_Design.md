# Standard Arena Level Design — Content Builders + Verification

**Статус:** Living doc (synced with code)  
**Слой:** World / Arena  
**GDD:** [[../GDD/Approved/Maps]], [[../GDD/Approved/Factory_Level_Design]], [[../GDD/Approved/City_Level_Design]], [[../GDD/Approved/Village_Level_Design]]

Правила для любого, кто добавляет/правит контент арены. Извлечено из `arena/factoryMap.ts`,
`arena/cityMap.ts`, `arena/villageMap.ts` после пересборки Factory (2026-09-11).

## 1. Точка входа и слои

```
buildArena(arena, effects, mapId, renderWorld?)      // ArenaBuilder.ts
  ├─ buildArenaShell(ctx, theme)                     // arena/shell.ts  (общая оболочка)
  ├─ buildFactoryContent(ctx)                        // arena/factoryMap.ts
  │  / buildVillageContent(ctx)                      // arena/villageMap.ts
  │  / buildCityContent(ctx)                         // arena/cityMap.ts
  └─ effects.setObelisk / setCraneTrolley / setDome / setDust   // → ArenaEffects
```

- **Оболочка** (стены, пол, пилоны, лампы, вывески, `ground map`) — только `shell.ts`. Не дублировать в map-билдере. Тема (`ArenaShellTheme`) задаёт `groundMap`, опц. `wallMap`, `signStyle` (`'tech'|'rural'`), цвета стен/пилонов/ламп/полосы и две вывески. Любое расширение темы — **опциональное поле с default**, сохраняющим вид остальных карт.
- **Map-билдер** — `buildXContent(ctx: ArenaBuildContext)`, **самодостаточный**: никаких legacy/helper-модулей на карту. Общий код выносится только если он действительно generic (пример: `arena/skyline.ts` — `buildSkyline`).
- **Никаких новых полей в `ArenaBuildContext` без необходимости** — набор полей зафиксирован (`context.ts`): `group, half, colliders, blocks, beaconMats, smokeEmitters, furnaceGlowMats, moltenMats, animNodes, box, addColliderBlock, setObelisk, setCraneTrolley, setDome, setDust`.

## 2. Авторинг коллайдеров (жёсткие правила)

### 2.1 `addColliderBlock` — AABB, не поворачивается вместе с мешем

```ts
ctx.addColliderBlock(x, z, w, d, h, destructible, buildMesh, hp?, kind?, blocksSight?)
```

- Коллайдер — **axis-aligned AABB** в world-XZ. `meshWrap.rotation` **никогда не ставится**, поэтому меш может быть повёрнут (yaw), а коллайдер — нет.
- **Следствие:** для повёрнутых зданий в `w`/`d` передавать **AABB-обёртку** повёрнутого footprint'а (padding по `|cos|·w + |sin|·d`), а не габарит по оси.
- `destructible: true` → блок регистрируется в `ctx.blocks` (damage flash / tilt в `Arena.addColliderBlock`). Должен совпадать с HP-смыслом.

### 2.2 Рампы — НЕ solid (M12)

- `kind: 'ramp'` **не твёрдый для корпуса танка** — фильтруется в `engine/solidColliderCache.ts`, `PhysicsSystem.ts`, `aiObstacle.ts`.
- Рампы — **декоративные клинья**, всегда `blocksShots: false, blocksSight: false`.
- **Никогда** не делать низкий `'block'` для плоской/заподлицо декорации (рельсы, разметка) — получится невидимая стена. Если у декорации не должно быть коллизии — **просто не пушить коллайдер** (пример: `railSiding` в `factoryMap.ts`).

### 2.3 Границы

- Всё содержимое — внутри `|x|,|z| ≤ 150`. Skyline и «задник» — **вне** playable box (проверяется тестом).

## 3. Тиры укрытий (доктрина проекта)

| Tier | Признак в коде | Destructible | blocksSight |
|------|----------------|--------------|-------------|
| Hard | `kind: 'wall'` / неразрушаемое ≥ ~2.5 h | No | Yes |
| Medium | низкий неразрушаемый `kind: 'block'` | No | Yes |
| Soft | destructible (`ctx.blocks`) | Yes | Yes |
| Non-LOS | `kind: 'ramp'`, лампы, трубы над головой | No | False |

## 4. Инварианты уровня (проверяются контракт-тестом)

Каждая карта обязана держать:

1. **Главные магистрали** свободны от hard cover; центральная полоса полностью открыта (комфортная стрельба).
2. **CP-анкеры** достижимы: вокруг якоря — чисто, внутри `CAPTURE.radius` нет hard cover.
3. **Spawn-точки и aprons** свободны (нет коллайдеров в радиусе ~10 м).
4. **Покрытие квадрантов**: hard и soft присутствуют во всех 4; outer band заполнен во всех направлениях.
5. **Всё внутри стен**; все рампы non-blocking.

## 5. Верификация

| Инструмент | Команда | Что даёт |
|------------|---------|----------|
| Контракт-тест | `npm test` (`src/__tests__/<map>Map.test.ts`) | Пины инвариантов §4 на реальных коллайдерах |
| План карты | `npm run map-plan [mapId] [out]` | Top-down SVG/HTML: тиры, зоны, спавны, плотность по квадрантам |
| Draw-call census | `npm run census` | est. draw calls per map, кандидаты на instancing |
| Атмосфера | `atmospherePresets.test.ts` | Пресет отличим per-map, exposure-пины |
| Гейт | `npm run typecheck` + `npm test` | **Verified** |

### 5.1 Headless-харнесс контракт-теста

`<map>Map.test.ts` собирает карту **без WebGL**: canvas-стаб (2d-контекст — no-op Proxy,
`createRadialGradient`/`createLinearGradient` → `{addColorStop}`) + локальный
`ArenaBuildContext`, повторяющий семантику `Arena.addColliderBlock` (включая `blocks`).
Затем ассертит геометрию через `colliderFromCenter` / `losClear`.

### 5.2 Ground texture

`<map>GroundTexture` в `textures/ground.ts` обязана быть **нарисована под layout билдера**
(крест, зоны, CP-кольца, подписи) и идти через `cachedGround('ground:<id>', …)` (LRU-1 —
кэшируется только большой ground-canvas).

### 5.3 Атмосфера

Per-map пресет в `atmospherePresets.ts` (`ATMOSPHERES: Record<MapId, AtmospherePreset>`),
применяется `RenderWorld.applyAtmosphere(mapId)`. Карты должны быть **визуально отличимы**;
новый map-id без своего пресета — регресс (см. [[../GDD/Approved/Village_Level_Design]] §Per-map atmosphere).

## 6. Известные грабли

- **`Edit` по уже изменённому региону молча не применяется** — после серии правок перечитывать целевые строки, а не доверять успешному ответу инструмента. (Правило появилось не на пустом месте: при пересборке Village два `Edit` подряд по одному региону `shell.ts` — импорт + тело — применились только частично, typecheck поймал.)
- **`npm run census` / `map-plan`** требуют `vite-node` как явный devDependency (с vitest 4 он больше не транзитивный). Ставится **системным npm 11** — managed npm 10.9.7 не резолвит peer-set vitest 4 (`TypeError ... edgesOut`); `lockfileVersion: 3` должен сохраниться, иначе ломается `npm ci` под npm 10.
- **Managed npm 10 / node 22** — для install'ов с новыми peer-set'ами переключаться на system node 24 / npm 11.
- **Draw-call бюджет — не бесконечный.** Village после добавления часовни/сада/пруда/скирд/гирлянд
  держится на ~800 draw calls именно за счёт instancing (деревья = 4 draw на 20 деревьев,
  бочки/камыши/цветы/гирлянды — по одному `InstancedMesh`). Новый контент добавлять
  инстансами; сверяться с `npm run census`.
- **DUSK выбивает светлое albedo.** Village-атмосфера = sun 2.0 / exposure 1.0; светлый
  пластырь (`#d8cbb2` и выше) уходит в чистый белый под ACES. Держать тона стен/крыш в
  среднем значении (`PLASTER_TONES`/`ROOF_TONES`).

## 7. Map-native textures (не заимствовать чужие ассеты)

Правило: **карта не тянет тематические текстуры другой карты.** Village исторически
использовал `crateTexture` (сено с hazard-шевронами), `barrelTexture` («FUEL-51») и
`hexTexture` (cyan-сетка неба) — это читалось как «завод на деревне» и было вычищено.

- Свои фабрики — в `src/game/textures/<map>.ts`, экспорт через `textures/index.ts`.
- Все фабрики идут через `cachedTexture(key, …)` (process-lifetime, `markShared`) и
  ключуются своим тоном; несколько тонов = несколько текстур.
- Общие (не тематические) текстуры остаются в `shared.ts`/`effects.ts` — их можно
  переиспользовать (`glowTexture`, `smokeTexture`, `scorchTexture`).
- Общая геометрия/приёмы (skyline-кольцо, рампа-клин, instanced-забор) — выносить
  только если они действительно generic (`arena/skyline.ts`).
