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
| `tracerDelay` | 0.025 с | задержка луча/импакт-FX после hitscan (ощущение «полёта») |
| `pierceColors` | `[0x8fffe8, 0x6fe8ff, 0x4ecfe0]` | цвет impact по номеру пробития (яркий → тусклый) |
| `fireShakePlayer` | 0.48 | trauma камеры |
| `chargeFovTighten` | 2.8° | FOV при полном заряде |
| `fireFovPunch` | 5.5° | FOV punch на выстреле |

`turretSpeed`: 9.0.

## FSM

```
        setFire (level) + alive + fireTimer ≤ 0
IDLE ──────────────────────────► CHARGING
  ▲                                 │
  │                    release (player) → cancel → IDLE
  │                                 │
  │                          chargeTimer ≥ chargeTime
  │                                 ▼
  │                          executeFiring() (synchronous)
  │                                 │
  └───────── COOLDOWN ◄─────────────┘
              reloadTimer → 0
```

- Старт заряда: **level-trigger** (`railgunShouldStartCharge`) — ИИ может держать fire и перезаряжать.
  Гейт `fireTimer ≤ 0` уважает базовый контракт `Tank.canFire`.
- **Отмена заряда (M18):** игрок, отпустив fire во время CHARGING, сбрасывает заряд в IDLE
  (`railgunShouldCancelCharge`): стоп charge-audio, очистка FOV tighten, barrel kick → 0.
  Боты не отменяют — их `wantsFire` мигает покадрово (aim noise в `aiAimFire`), отмена
  срывала бы 1.1-с заряд почти каждую попытку.
- `chargeTime` / `reloadTime` делятся на `ownerReloadMul` (бафф reload).
- Переход CHARGING→выстрел выполняется синхронно в том же кадре, когда заряд достиг порога
  (отдельный transient-state FIRING удалён из типа `RailgunState`: был недостижим,
  а его safety-ветка делала «призрачный» выстрел с пустыми списками целей).

### Смерть владельца

При переходе `alive → !alive` оружие получает `onOwnerDeath()`:
- state сбрасывается в IDLE; таймеры обнуляются;
- charge-audio останавливается (если этот экземпляр его запустил);
- луч мгновенно скрывается (`beamFx.hide()`), свет отцепляется;
- FOV tighten очищается для игрока;
- `barrelGroup.position` жёстко сбрасывается в rest и `setBarrelKick(0)` —
  `restoreDeathVisuals` при респауне сбрасывает только rotation, без этого танк
  умирал со смещённым зарядным jitter-стволом и жил с ним до респауна.

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

4. Стена / destructible block **останавливает** луч (M18: `beamFx.setLength(wall.dist)` укорачивает mesh-слои; раньше двигался только impact-light и луч визуально проходил сквозь стену). Блоку — `damageBlock` с текущим `currentDamage`, но только если `round(currentDamage) > 0` (после N пробитий остаток может округлиться в 0 — FX показывается, урон нет).
5. `nearestShotBlockerDist` учитывает гео-блокеры; порог высоты вынесен в константу `SHOT_BLOCKER_HEIGHT_EPS = 0.3`.

Урон: `resolveWeaponDamage(params.damage, tuning.damage)` — боты матча: `BOT_NORMAL.damageScale`.

## Shot feel (M19)

1. **Pitch ramp заряда:** во время CHARGING оружие каждый кадр вызывает
   `audio.setChargeRailgunPitch(progress)` — базовые слои charge-гула поднимаются
   по progress² до +35% частоты на полном заряде (резкий подъём в конце).
2. **Tracer delay:** урон/knockback/пинги пробития разрешаются мгновенно,
   но луч + impact-FX + ионный трейл собираются в `PendingShotVisual` и
   воспроизводятся через `tracerDelay` (0.025 с) после выстрела:
   muzzle-flash → борт-хлопок → луч. Смерть/`dispose` в окне задержки
   отменяют pending-визуалы (призрачного луча от мёртвого танка нет).
   Луч сразу рисуется финальной длины (`show(dist)`) — стены останавливают его.
3. **Penetration feedback:** каждому пробитию — свой цвет impact из
   `pierceColors` (1-й ярче, 3-й+ тусклее) + нисходящий пинг
   `audio.railgunPierce(index)` (1800 → 900 → 500 Гц, тише с каждым пробитием).
   Wall-терминус остаётся оранжевым (`0xffa040`) + debris.

## Аммуниция (HUD)

`getAmmoState`: magazine 1; `isCharging` / reload progress из FSM.

## Классы

| Класс / символ | Файл |
|----------------|------|
| `RailgunWeapon` | `src/game/weapons/RailgunWeapon.ts` |
| `RailgunState` | там же (`IDLE`/`CHARGING`/`COOLDOWN`) |
| `railgunShouldStartCharge` / `railgunShouldCancelCharge` | `src/game/weapons/railgunFireLogic.ts` |
| `RailgunBeamFx` (+`setLength`, ref-count shared geo) | `src/game/weapons/RailgunBeamFx.ts` |
| `nearestShotBlockerDist` / `SHOT_BLOCKER_HEIGHT_EPS` | `src/game/weapons/railgunBlockers.ts` |
| `applyRailgun*Fx` | `src/game/weapons/railgunChargeFx.ts` |
