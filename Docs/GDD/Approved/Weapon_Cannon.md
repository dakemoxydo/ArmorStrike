# Weapon: Cannon «Смоки»

**Статус:** Approved  
**Тип:** Projectile + splash  
**Связано:** [[Projectile_System]], [[Damage_System]], [[Weapon_Railgun]]

## Фэнтези

Скорострельная крупнокалиберная автопушка с фугасным поражением площади. Основное «классическое» оружие.

## Тюнинг (`WEAPON_TUNING.cannon`)

| Параметр | Значение | Описание |
|----------|----------|----------|
| `damage` | 32 | прямой урон снаряда |
| `shotCooldown` | 0.28 с | КД между выстрелами (`fireTimer`) |
| `magazine` | 10 | ёмкость |
| `reloadTime` | 1.8 с | полная перезарядка |
| `range` | 75 | max range снаряда |
| `knockback` | 5.5 | recoil владельца (игрок) |
| `splashRadius` | 5.0 | радиус splash |
| `splashDmg` | 16 | базовый splash @ центр (½ damage) |

`turretSpeed`: 10.5 (`TURRETS.cannon`).

## Состояния магазина

```
ammo = magazine
     │
setFire(true) ──canFire──► fire() ──ammo--
     │                        │
     │                   ammo==0 ──► fullReloading
     │                        │
     └── requestReload (R) ───┘
```

**canFire:** `alive && fireTimer <= 0 && ammo > 0 && !fullReloading`

**Эффективный reload:** `fullReloadTime / reloadSpeedMul` (бафф «перезарядка»).

## Выстрел

1. `fillMuzzleAndAim` → позиция/направление.
2. `owner.onFired(recoil)` — recoil + `fireTimer = shotCooldown`.
3. `projectiles.fire(owner, muzzle, dir, damage, 'cannon', range)`.
4. VFX muzzle, shake 0.08, audio `shoot('cannon')`.
5. При `ammo === 0` — `startFullReload()`.

## Урон на попадании

- **Прямой:** `ProjectileManager` → `onTankHit(target, s.damage, owner)` → `DamageSystem.applyDamage`.
- **Splash:** `splashDmg = round(damage * (16/32))`, falloff линейный (см. [[Damage_System]]).
- `ProjectileBehavior.cannon.onHitTank` вызывает `applyHit` с **0** damage (только knockback/VFX), чтобы не двойнить HP.

## Скорость снаряда

В behavior: `s.speed = 48` (не глобальный `PROJECTILE.speed`).

## Классы

| Класс | Файл |
|-------|------|
| `CannonWeapon` | `src/game/weapons/CannonWeapon.ts` |
| `ProjectileManager` | `src/game/engine/Projectile.ts` |
| `BEHAVIORS.cannon` | `src/game/engine/ProjectileBehavior.ts` |
| `WEAPON_TUNING` | `src/core/catalogData.ts` |
