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
| `range` | 85 | fallback (реальный range задаёт behavior из `WEAPON_TUNING`) |
| `radius` | 0.18 | hit-test радиус |
| `directKnockback` / `splashKnockback` | 4.0 / 2.5 | knockback пушки (`WEAPON_TUNING.cannon`; см. [[Weapon_Cannon]]) |
| `SHOT_HEIGHT_EPS` | 0.3 | единый высотный гейт снаряда и рельсы (`src/game/engine/physics.ts`) |

> `speed` здесь больше **нет**: скорость полёта живёт в
> `WEAPON_TUNING.<weapon>.speed` (`catalogData`) и применяется behavior'ом в
> `init()`. Легаси-глобал `speed: 58` расходился с реальной скоростью снаряда
> пушки (48) и протекал в математику упреждения ИИ.

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
| `HitContext` | colliders + tanks + effects + damage (без concrete `Arena`) |
| `ProjectileBehavior` / `BEHAVIORS` | `src/game/engine/ProjectileBehavior.ts` |
| `WeaponSystem` | `src/game/engine/systems/WeaponSystem.ts` (update weapons, не flight) |
