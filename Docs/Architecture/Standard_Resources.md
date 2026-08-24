# Standard Resources — ArmorStrike

**Статус:** engineering standard (synced with code)
**Связано:** [Core](Core.md) · [Core Patterns](Core_Patterns.md)
**Не путать с:** [Docs/GDD](../GDD/Approved/00_Index.md) (баланс и дизайн-механика)

## 1. Textures: memoized factories + `markShared` ownership

**Где:** `src/game/textures/shared.ts`, `src/game/resources/sharedResources.ts`,
`src/game/resources/disposeObject3D.ts`

Все канвас-текстуры создаются только через фабрики с мемоизацией:

```ts
const t = cachedTexture(`key:${parts}`, () => buildCanvasTexture());
```

Правила (зафиксированы тестом `textureCache.test.ts`):

1. **Один ключ — один инстанс.** Фабрика вызывается один раз за процесс;
   повторный вызов возвращает ту же `THREE.CanvasTexture`.
2. **`markShared` обязателен.** `cachedTexture` помечает текстуру общей —
   поштучный teardown (`disposeObject3D`, `disposeArenaSubtree`,
   `material.map?.dispose()`) обязан её пропустить (`isShared`). Владелец
   записи — кэш, живёт до конца процесса.
3. **Ключи включают все параметры отрисовки** (`crate:${accent}:${dark}:${light}`,
   `ground:factory:${arenaSize}`) — разные параметры = разные текстуры.
4. **Выгрузка — только политикой кэша.** `cachedTextureEvict(key)` снимает
   markShared и диспозит GPU-текстуру; единственный легитимный потребитель —
   LRU-1 политика ground-текстур в `textures/ground.ts`
   (`ground:last` ↔ `ground:<map>:<size>`, чтобы не держать три 1024²+ канваса).
5. **Прямой `new THREE.CanvasTexture`** допустим только для пер-instance
   ресурсов с собственным lifecycle и явным `dispose()`:
   nameplate (`nameplate.ts`) и capture markers (`match/CaptureMarkers.ts`).
   В общих фабриках (`textures/*.ts`) прямых созданий быть не должно.

Диагностика: `cachedTextureCount()` — размер реестра (тест на утечки кэша).

## 2. Zone views: anchor-keyed invalidation

**Где:** `src/game/engine/stages/zoneViewCache.ts`, потребитель
`engine/stages/BotAiStage.ts` (`zonesAsView`), тесты `zoneViewCache.test.ts`.

CP-зоны пересоздаются каждый тик (`CaptureController.update()` мутирует пул),
а ботам нужны стабильные view-объекты. Контракт `syncZoneViews(cache, zones)`:

- **Rebuild** только когда кэш пуст, изменилась длина или любой якорный скаляр
  (`id`/`x`/`z`/`radius`) не совпал — инвалидаця по содержимому, НЕ по длине
  и НЕ по ссылке массива (массив пересоздаётся каждый тик — урок audit F-1).
- **In-place обновление** `owner`/`contested` на стабильных view каждый тик —
  боты никогда не видят протухшие координаты после смены карты.

Новый кэш производных данных арены следует этому шаблону: сравнение якорных
скаляров + мутация стабильных объектов, никакого кэша «по длине массива».

## 3. Draw-call census: измеряй перед тем как оптимизировать

**Инструмент:** `scripts/draw-call-census.ts` (запуск: `npx tsx scripts/draw-call-census.ts`,
вне tsconfig/eslint — см. `scripts/screenshot.sh` прецедент).

Строит каждую карту реальным THREE без WebGL (Proxy-заглушка 2d-контекста),
считает Mesh/Points/Sprite/InstancedMesh, выводит повторяющиеся геометрии
(кандидаты на instancing) и атрибуцию боксов по функциям-строителям (V8 stack).

Правило работы над картами: любое изменение пропсов сопровождается
before/after числами из census (пример: village 940 → 845 после
инстансинга столбов заборов, iter 5). Instancing-паттерн в коде:
`buildVillageFoliage` / fence-посты `arena/villageMap.ts` — один
`InstancedMesh` на сегмент со своей геометрией (разрушение сегмента
диспозит только свою геометрию).

---
*Паттерны извлечены из коммитов 6ad7740 (memoize texture factories) и
257c23c (audit fixes F-1..H-5); обновляется автоматически после рефакторингов.*
