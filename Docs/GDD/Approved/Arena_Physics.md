# Arena & Physics — Арена и коллизии

**Статус:** Approved  
**Слой:** World / Physics  
**Связано:** [[Tank_Movement]], [[Projectile_System]], [[AI_Bots]]

## Арена

| Параметр | Значение |
|----------|----------|
| Размер | **300 × 300** (`ARENA.size`) |
| half | size/2 = **150** |
| Стены | height 7.5, thickness 3.5 |
| Тема | мульти-карта (`factory` / `village` / `city`) — см. [[Maps]] |

Все три карты заполняют всю арену ([[Factory_Level_Design]], [[City_Level_Design]], [[Village_Level_Design]]).

Модульные билдеры: `src/game/arena/*` — `shell.ts` (каркас), `factoryMap.ts` / `villageMap.ts` / `cityMap.ts` (карты целиком), `skyline.ts` (кит колец), `types.ts` / `context.ts` (контракты). J14: former per-district factory-модули (centralHall, containerYard, foundry, gantryCrane, silos, pipeRack, ramps, scattered, smokestacks, atmosphere) слиты в `factoryMap.ts` при перестройке I0 — отдельных файлов больше нет.

Скайлайн-кит: `skyline.ts` экспортирует общий механизм декоративного кольца вокруг арены — `ringSlots(count, angleJitter, rMin, rMax)` (полярная раскладка с джиттером) и `buildTowerRing(ctx, spec)` (кольцо боксов + опциональные светящиеся окна-билборды + хук `onTower` для дымовых труб / крыш). Каждая карта задаёт свой `spec` (диапазоны размеров, материалы, extras); factory-билдер `buildSkyline` живёт там же, city/village вызывают кит из своих `*Map.ts`.

Сборка: `buildArena(arena, effects, mapId, renderWorld?)` → `Arena`. Пересборка: `Arena.rebuild(mapId)` при каждом старте матча.

## Collider model

`src/game/engine/physics.ts`:

```ts
interface Collider {
  minX, maxX, minZ, maxZ, height
  blocksShots, blocksSight, destructible, active
  kind: 'wall' | 'block' | 'ramp'
}
```

| Kind | Обычно |
|------|--------|
| wall | периметр, capital structures |
| block | ящики / разрушаемые |
| ramp | проезд; единственный kind, который корпус **не** считает solid (`solidColliderCache`); всегда `blocksShots/blocksSight:false` (M12) |

**Повёрнутый контент (I7):** меш `rotation.y = yaw` + axis-aligned коллайдер ⇒
габарит коллайдера = охват повёрнутого прямоугольника, общий хелпер
`aabbForYaw(w, d, yaw, pad)` (`physics.ts`). Применяется во всех билдерах:
village house/barn, city car/dumpster/billboard. Юнит-пин — `physics.test.ts`.

## Resolve

- `resolveCircle` — выталкивание танка (r=1.8) из AABB (2 итерации).
- `tankSeparation` — разведение танков друг от друга.
- `losClear` / segment tests — ИИ и снаряды.
- `pointInCollider` — flight projectile vs walls.

### Стеновое трение (F4)

Касание стены (impact > 0.01 м) гасит скорость по **экспоненте за секунду**,
а не фиксированным множителем на тик — поведение идентично на любом FPS:

```
speed *= exp(−WALL_FRICTION_K · dt),  WALL_FRICTION_K = 9.05
// ≡ ×0.86 за кадр при 60 fps (историческое значение сохранено)
```

Трение применяется только первым проходом `PhysicsSystem.resolveCollisions`;
второй re-resolve (M10, после разведения танков) — чистая позиционная
коррекция, скорость не режет (раньше — двойное применение за тик).

## Destructible blocks

`Arena.addColliderBlock(..., destructible: true)` → `BlockInfo` (HP, meshes).

`damageBlock(id, dmg)`:

```
HP -= dmg
if HP ≤ 0: deactivate collider, remove meshes → 'destroyed'
else → 'hit' (+ flash material)
```

Hook: `CombatSystem.onBlockDestroyed` → explosion/debris.

## Классы

| Класс | Файл |
|-------|------|
| `Arena` | `src/game/Arena.ts` |
| `buildArena` | `src/game/ArenaBuilder.ts` |
| `ArenaBuildContext` | `src/game/arena/context.ts` |
| `Collider`, `resolveCircle` | `src/game/engine/physics.ts` |
| `solidColliderCache` (invalidate + solid filter) | `src/game/engine/solidColliderCache.ts` |
| `PhysicsSystem` | `src/game/engine/systems/PhysicsSystem.ts` |
