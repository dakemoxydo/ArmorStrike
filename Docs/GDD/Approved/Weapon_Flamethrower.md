# Weapon: Flamethrower «Firebird»

**Статус:** Approved  
**Тип:** Continuous cone DPS (overlap)  
**Связано:** [[Damage_System]], [[Tank_Aim]]

## Фэнтези

Ближний непрерывный конус пламени: тиковый урон по геометрии, энергия вместо магазина.

## Тюнинг (`WEAPON_TUNING.flamethrower`)

| Параметр | Значение | Описание |
|----------|----------|----------|
| `damagePerTick` | 12 | урон за тик |
| `tickRate` | 0.1 с | период overlap-check |
| `range` | 22 | дальность конуса |
| `coneAngle` | π/4 (~45°) | полный угол; half = π/8 |
| `energyMax` | 100 | ёмкость «магазина» HUD |
| `consumptionRate` | 28 /с | расход при стрельбе |
| `rechargeRate` | 22 /с | восстановление вне огня |
| `knockback` | 1.2 | лёгкий отброс цели |
| `particleCount` | 160 | пул частиц |
| `spawnRate` | 40 /с | спавн пламени |

`turretSpeed`: 11.5 (самая быстрая башня).

## Состояния

```
isFiring = false
     │
setFire(true) && energy > 5 && alive ──► isFiring = true, flame loop SFX
     │
setFire(false) or energy ≤ 0 ─────────► isFiring = false
```

### Энергия

```
if isFiring:
  energy -= consumptionRate * dt
  if energy ≤ 0: stop fire
else:
  energy = min(energyMax, energy + rechargeRate * reloadSpeedMul * dt)
```

Бафф **reload** ускоряет recharge (`reloadSpeedMul`).

## Геометрия поражения

`inFlameConeXZ` (`flameCone.ts`) — **плоскость XZ** (не 3D-угол), чтобы elevated muzzle не резал point-blank:

```
dist = hypot(target - muzzle)
if dist > range: miss
angle = acos(dot(dir, toTarget))
hit if angle ≤ halfCone
```

Каждый `tickRate` по всем живым чужим танкам в конусе:

```
dmg = resolveWeaponDamage(params.damage, damagePerTick)
applyHit(target, dmg, knockDir, knockback, ...)
```

DPS номинал: `12 / 0.1 = 120 HP/s` (без учёта движения/промахов).

## Визуал

`FlameParticlePool` — InstancedMesh частицы, градиент цвета, muzzle light
из общего слота `LightRig` (канал `flame`, ёмкость 1). Слот разделяемый:
арбитраж в пуле — пишет только владелец-стрелок; idle-огнемёт никогда не
гасит чужой свет (см. Standard Frame Stability §1).

Flame loop SFX — один общий голос на все огнемёты, ref-count в `AudioFX`:
гаснет только когда стрелять перестал последний.

## Классы

| Класс | Файл |
|-------|------|
| `FlamethrowerWeapon` | `src/game/weapons/FlamethrowerWeapon.ts` |
| `FlameParticlePool` | `src/game/weapons/FlameParticlePool.ts` |
| `inFlameConeXZ` | `src/game/weapons/flameCone.ts` |
