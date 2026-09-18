# Weapon: Cannon «Смоки»

**Статус:** Approved  
**Тип:** Projectile + splash  
**Связано:** [[Projectile_System]], [[Damage_System]], [[Weapon_Railgun]]

## Фэнтези

Скорострельная крупнокалиберная автопушка с фугасным поражением площади. Основное «классическое» оружие.

## Тюнинг (`WEAPON_TUNING.cannon`)

| Параметр | Значение | Описание |
|----------|----------|----------|
| `damage` | 25 | прямой урон снаряда |
| `speed` | 54 | скорость полёта снаряда (единый источник: behavior + lead ИИ) |
| `shotCooldown` | 0.38 с | КД между выстрелами (`fireTimer`) |
| `magazine` | 6 | ёмкость |
| `reloadTime` | 2.2 с | полная перезарядка |
| `range` | 75 | max range снаряда |
| `knockback` | 2.8 | recoil владельца (игрок) |
| `botKnockback` | 2.0 | self-recoil у ботов (слабее, чтобы не «стоять на куске»; J12) |
| `splashRadius` | 5.0 | радиус splash |
| `splashDmg` | 12 | базовый splash @ центр |
| `fireShakePlayer` | 0.16 | сотрясение камеры игрока при собственном выстреле (F1) |
| `fireShakeBot` | 0.04 | сотрясение камеры игрока при выстреле бота поблизости (F1) |
| `fireShakeBotRange` | 30 | радиус дистанции от бота до игрока для передачи сотрясения |
| `fireFovPunch` | 1.2° | мгновенный упругий скачок FOV при выстреле автопушки |

`turretSpeed`: 8.0 (`TURRETS.cannon`).

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
2. `owner.onFired(recoil)` — recoil шасси + `fireTimer = shotCooldown`.
3. `projectiles.fire(owner, muzzle, dir, damage, 'cannon', range)`.
4. VFX muzzle, shake `fireShakePlayer` (0.16) + `fireFovPunch` (1.2°). Для ботов — shake `fireShakeBot` (0.04) при дистанции ≤ 30 м.
5. Пространственный 3D-звук `audio.shoot('cannon', pos)`: саб-басовый kick 65→24 Гц, механический щелчок, затухание по дистанции и стерео-панорамирование.
6. При `ammo === 0` — `startFullReload()`.

## Урон на попадании

- **Прямой:** `ProjectileManager` → `onTankHit(target, s.damage, owner)` → `DamageSystem.applyDamage`.
- **Splash:** `splashDmg = round(damage * (16/32))`, falloff линейный (см. [[Damage_System]]).
- `ProjectileBehavior.cannon.onHitTank` вызывает `applyHit` с **0** damage (только knockback/VFX), чтобы не двойнить HP.

## Скорость снаряда

`WEAPON_TUNING.cannon.speed = 54` — единственный источник истины: behavior
стаставит её в `init()`, упреждение ИИ (`aiAimFire`) читает то же значение.
Глобальный `PROJECTILE.speed` удалён (расходился: 58 против реальных 48/54).

## Классы

| Класс | Файл |
|-------|------|
| `CannonWeapon` | `src/game/weapons/CannonWeapon.ts` |
| `ProjectileManager` | `src/game/engine/Projectile.ts` |
| `BEHAVIORS.cannon` | `src/game/engine/ProjectileBehavior.ts` |
| `WEAPON_TUNING` | `src/core/catalogData.ts` |
