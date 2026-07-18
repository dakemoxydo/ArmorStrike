# Arena & Physics — Арена и коллизии

**Статус:** Approved  
**Слой:** World / Physics  
**Связано:** [[Tank_Movement]], [[Projectile_System]], [[AI_Bots]]

## Арена

| Параметр | Значение |
|----------|----------|
| Размер | 150 × 150 (`ARENA.size`) |
| half | size/2 = 75 |
| Стены | height 7.5, thickness 3.5 |
| Тема | мульти-карта (`factory` / `village` / `city`) — см. [[Maps]] |

Модульные билдеры: `src/game/arena/*` (shell, factoryMap, villageMap, cityMap + factory modules: centralHall, containerYard, foundry, gantryCrane, silos, pipeRack, ramps, scattered, smokestacks, skyline, atmosphere…).

Сборка: `buildArena(arena, effects, mapId)` → `Arena`. Пересборка: `Arena.rebuild(mapId)` при каждом старте матча.

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
| ramp | проезд, может не блокировать shots |

## Resolve

- `resolveCircle` — выталкивание танка (r=1.8) из AABB (2 итерации).
- `tankSeparation` — разведение танков друг от друга.
- `losClear` / segment tests — ИИ и снаряды.
- `pointInCollider` — flight projectile vs walls.

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
| `PhysicsSystem` | `src/game/engine/systems/PhysicsSystem.ts` |
