# Maps — Мульти-карты и выбор арены

**Статус:** Approved  
**Слой:** World / UI  
**Связано:** [[Arena_Physics]], [[Game_Lifecycle]]

## Map IDs

| Id | Имя | Описание |
|----|-----|----------|
| `factory` | Завод | Базовая карта (ЗАВОД-51) |
| `village` | Деревня | Дома, амбары, заборы, колодец |
| `city` | Город | Grid-авеню, 4 districts, плаза, short overpass, неон |

Каталог: `src/game/maps/mapCatalog.ts` (`MapId`, `MAPS`, `MAP_IDS`, `DEFAULT_MAP_ID`).

## Структура сборки

Общая оболочка (размер 150×150, стены, пилоны, лампы, вывески):

- `buildArenaShell` — `src/game/arena/shell.ts`

Тематический контент:

| Карта | Билдер |
|-------|--------|
| factory | `buildFactoryContent` (`arena/factoryMap.ts`) + legacy modules |
| village | `buildVillageContent` (`arena/villageMap.ts`) |
| city | `buildCityContent` (`arena/cityMap.ts`) — grid, districts, overpass; see [[City_Level_Design]] |

Точка входа: `buildArena(arena, effects, mapId)` → `ArenaBuilder.ts`.

## Пересборка

`Arena.rebuild(mapId)`:

1. `ArenaEffects.resetForRebuild()` (smoke pool без dispose shared smoke texture)
2. Dispose геометрии/материалов/текстур (deduped)
3. Очистка `colliders` / `blocks`
4. `invalidateSolidColliderCache()`
5. `buildArena(...)`

При старте матча всегда rebuild (свежие разрушаемые объекты).

`HudModel.rebuildMinimap(arena)` обновляет статику миникарты.

## Выбор карты (UI)

При любом «Играть / Рестарт» (меню, гараж, пауза, game over):

1. Открывается `MapSelect` (`src/components/MapSelect.tsx`)
2. Игрок выбирает карту (клик / ← →)
3. `GameApi.startRound(mapId)` → `GameModeController.startRound`

Enter в главном меню открывает выбор карты (не сразу старт).

## Классы / API

| Символ | Файл |
|--------|------|
| `MapId`, `MAPS` | `src/game/maps/mapCatalog.ts` |
| `buildArena` | `src/game/ArenaBuilder.ts` |
| `Arena.rebuild` | `src/game/Arena.ts` |
| `startRound(mapId?)` | `GameApi` / `GameModeController` |
| `MapSelect` | `src/components/MapSelect.tsx` |
