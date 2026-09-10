# Weapon: Railgun — Рельсотрон

**Статус:** Approved  
**Тип:** Hitscan + penetration  
**Связано:** [[Damage_System]], [[Tank_Aim]], [[Match_Framework]]

## Фэнтези

Снайперское hitscan-орудие: накопление заряда, мощный луч, сквозное пробитие нескольких целей, стены останавливают луч.

## Тюнинг (`WEAPON_TUNING.railgun`)

| Параметр | Значение | Описание |
|----------|----------|----------|
| `chargeTime` | 1.1 с | заряд до выстрела |
| `reloadTime` | 4.8 с | cooldown после выстрела |
| `damage` | 85 | базовый урон 1-й цели |
| `penetrationFactor` | 0.65 | × урон на каждую следующую цель |
| `range` | 120 | дальность луча |
| `knockback` | 18 | отдача / толчок целей |
| `magazine` | 1 | «один в стволе» (логически) |
| `beamDuration` | 0.32 с | жизнь визуального луча |
| `fireShakePlayer` | 0.48 | trauma камеры |
| `chargeFovTighten` | 2.8° | FOV при полном заряде |
| `fireFovPunch` | 5.5° | FOV punch на выстреле |

`turretSpeed`: 9.0.

## FSM

```
        setFire (level) + alive
IDLE ──────────────────────────► CHARGING
  ▲                                 │
  │                          chargeTimer ≥ chargeTime
  │                                 ▼
  │                          executeFiring() (synchronous)
  │                                 │
  └──────── COOLDOWN ◄──────────────┘
              reloadTimer → 0
```

- Старт заряда: **level-trigger** (`railgunShouldStartCharge`) — ИИ может держать fire и перезаряжать.
- `chargeTime` / `reloadTime` делятся на `ownerReloadMul` (бафф reload).
- Переход CHARGING→выстрел выполняется синхронно в том же кадре, когда заряд достиг порога
  (без отдельного transient-состояния FIRING), чтобы избежать 1-кадровой задержки между
  готовностью заряда и фактическим выстрелом.

### Смерть владельца

При переходе `alive → !alive` оружие получает `onOwnerDeath()`:
- state сбрасывается в IDLE; таймеры обнуляются;
- charge-audio останавливается (если этот экземпляр его запустил);
- луч мгновенно скрывается (`beamFx.hide()`), свет отцепляется;
- FOV tighten очищается для игрока.

Это предотвращает «призрачный» выстрел после респавна и зависание визуалов mid-fade.

## Логика пробития (`executeFiring`)

1. Raycast far = `range` по мешам танков + арене.
2. Сортировка попаданий по дистанции.
3. Для каждой цели-танка:

```
dmg   = round(currentDamage)
force = knockback * (currentDamage / baseDamage)
applyHit(...)
currentDamage *= 0.65
```

4. Стена / destructible block **останавливает** луч; блоку — `damageBlock` с текущим `currentDamage`.
5. `nearestShotBlockerDist` учитывает гео-блокеры.

Урон: `resolveWeaponDamage(params.damage, tuning.damage)` — боты матча: `BOT_NORMAL.damageScale`.

## Аммуниция (HUD)

`getAmmoState`: magazine 1; `isCharging` / reload progress из FSM.

## Классы

| Класс / символ | Файл |
|----------------|------|
| `RailgunWeapon` | `src/game/weapons/RailgunWeapon.ts` |
| `RailgunState` | там же |
| `railgunShouldStartCharge` | `src/game/weapons/railgunFireLogic.ts` |
| `RailgunBeamFx` | `src/game/weapons/RailgunBeamFx.ts` |
| `nearestShotBlockerDist` | `src/game/weapons/railgunBlockers.ts` |
| `applyRailgun*Fx` | `src/game/weapons/railgunChargeFx.ts` |
