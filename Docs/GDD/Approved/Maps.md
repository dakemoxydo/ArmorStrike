# Maps — Мульти-карты и выбор арены

**Статус:** Approved  
**Слой:** World / UI  
**Связано:** [[Arena_Physics]], [[Game_Lifecycle]], [[Factory_Level_Design]], [[City_Level_Design]], [[Village_Level_Design]]

## Map IDs

| Id | Имя | Описание |
|----|-----|----------|
| `factory` | Завод | Литейный комплекс ЗАВОД-51: домна, цеха, контейнерный терминал, портальный кран, цистерны — [[Factory_Level_Design]] |
| `village` | Деревня | Рыночная площадь + колодец, часовня с колокольней, дома/амбары, фруктовый сад, пруд, ветряк и поля — [[Village_Level_Design]] |
| `city` | Город | Grid-авеню, 4 districts, плаза, overpass, неон — [[City_Level_Design]] |

Каталог: `src/game/maps/mapCatalog.ts` (`MapId`, `MAPS`, `MAP_IDS`, `DEFAULT_MAP_ID`).

Blurbs (UI):

| Id | blurb (ru) |
|----|------------|
| factory | Литейный комплекс: цеха, контейнеры, краны и разрушаемые укрытия. |
| village | Сельский посёлок на закате: рыночная площадь с колодцем, часовня с колокольней, фахверковые дома и амбары, ветряк, пруды, сад и дым из труб. |
| city | Огромный ночной downtown: широкий крест авеню, 4 квартала-district, плаза, эстакада и плотный неон. |

## Размер арены (глобальный)

| Параметр | Значение | Файл |
|----------|----------|------|
| `ARENA.size` | **300** | `src/game/constants.ts` |
| half | 150 | `Arena.half` |
| Shell ground / walls | 300×300 | `buildArenaShell` |
| Minimap half | `MAP_HALF = 156` | `src/components/hud/minimapDraw.ts` |
| Bot spawns | corners ±128 + edge points | `src/game/match/spawnPoints.ts` (`FFA_SPAWN_POINTS`) |
| Player start (DM) | `(0, 0, −120)` | `src/game/match/rosterSpawn.ts` |
| Render | fog 130..440, camera far 900, shadow ±170 | `src/game/RenderWorld.ts` |

City и Village **заполняют всю 300**. Factory-контент (modules) исторически заточен под ~±75 — на 300-арене остаётся «остров» в центре с пустым outer ring (см. Known gaps).

## Структура сборки

Общая оболочка (стены, пилоны, лампы, вывески, ground map):

- `buildArenaShell` — `src/game/arena/shell.ts`

Тематический контент:

| Карта | Билдер |
|-------|--------|
| factory | `buildFactoryContent` (`arena/factoryMap.ts`) — see [[Factory_Level_Design]] |
| village | `buildVillageContent` (`arena/villageMap.ts`) — see [[Village_Level_Design]] |
| city | `buildCityContent` (`arena/cityMap.ts`) — see [[City_Level_Design]] |

Точка входа: `buildArena(arena, effects, mapId, renderWorld?)` → `ArenaBuilder.ts`.

## Пересборка

`Arena.rebuild(mapId)`:

1. `ArenaEffects.resetForRebuild()` (smoke pool без dispose shared smoke texture)
2. Dispose геометрии/материалов/текстур (deduped)
3. Очистка `colliders` / `blocks`
4. `invalidateSolidColliderCache()` (`src/game/engine/solidColliderCache.ts` — leaf, no Arena↔Physics cycle)
5. `buildArena(...)`

При старте матча всегда rebuild (свежие разрушаемые объекты).

`HudModel.rebuildMinimap(arena)` обновляет статику миникарты.

## Выбор карты (UI)

При любом «Играть / Рестарт» (меню, гараж, пауза, game over):

1. Открывается `MapSelect` (`src/components/MapSelect.tsx`)
2. Игрок выбирает карту (клик / ← →)
3. `GameApi.startRound(mapId)` → `GameModeController.startRound`

Enter в главном меню открывает выбор карты (не сразу старт).

## Known gaps / balance notes

1. **Combat range vs map size** — `PROJECTILE.range=85`, AI `sightRange=46` not retuned; long repositioning on City/Village/Factory is expected.
2. **Factory first-contact** — bots spawn at ±128 and drive inward to the district ring.

> **Resolved 2026-09-11:** «Factory empty ring» (был #1) — контент пересобран на всю арену 300, legacy-модули удалены. См. [[Factory_Level_Design]].

## Классы / API

| Символ | Файл |
|--------|------|
| `MapId`, `MAPS` | `src/game/maps/mapCatalog.ts` |
| `buildArena` | `src/game/ArenaBuilder.ts` |
| `Arena.rebuild` | `src/game/Arena.ts` |
| `startRound(mapId?)` | `GameApi` / `GameModeController` |
| `MapSelect` | `src/components/MapSelect.tsx` |
| `FFA_SPAWN_POINTS` / `ALPHA_SPAWN_POINTS` / `BRAVO_SPAWN_POINTS` | `src/game/match/spawnPoints.ts` |
| `MAP_HALF` | `src/components/hud/minimapDraw.ts` |
