# Projectile System — Пул снарядов

**Статус:** Approved  
**Слой:** Simulation  
**Связано:** [[Weapon_Cannon]], [[Damage_System]], [[Arena_Physics]]

## Область применения

Пул снарядов используется **только пушкой**.  
Рельса = hitscan, огнемёт = cone overlap — без `ProjectileManager.fire`.

## Константы (`PROJECTILE`)

| Поле | Значение | Примечание |
|------|----------|------------|
| `speed` | 58 | legacy global; cannon behavior ставит **48** |
| `range` | 85 | fallback |
| `radius` | 0.18 | hit-test радиус |

## Shot lifecycle

```
fire() → active Shot
  │
  ├─ substeps flight (≤ 0.6 u step)
  ├─ wall collider (blocksShots) → splash + optional damageBlock → despawn
  ├─ tank segment∩circle → onHitTank + direct damage + splash → despawn
  └─ traveled ≥ maxRange → onExpire + splash → despawn
```

## Behavior pattern

```ts
interface ProjectileBehavior {
  init, onFlight, onCollideWall, onHitTank, onExpire, trailEffect, trailInterval
}
```

`BEHAVIORS.cannon` — единственный зарегистрированный behavior.

## Классы

| Класс | Файл |
|-------|------|
| `ProjectileManager` | `src/game/engine/Projectile.ts` |
| `Shot` | там же |
| `ProjectileBehavior` / `BEHAVIORS` | `src/game/engine/ProjectileBehavior.ts` |
| `WeaponSystem` | `src/game/engine/systems/WeaponSystem.ts` (update weapons, не flight) |
