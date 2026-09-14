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
| `beamFrontSpeed` | 2400 юнитов/с | скорость бегущего фронта луча (M20); урон при этом мгновенный |
| `chargeBalls.electricStart` | 0.05 | радиус электрического шара в начале заряда (M21) |
| `chargeBalls.airStart` | 0.9 | радиус белого «воздушного» шара в начале заряда (M21) |
| `chargeBalls.contactRadius` | 0.3 | радиус соприкосновения при p=1 = кадр выстрела (M21); заодно стартовый stub луча = 2× |
| `chargeBalls.airPopRadius` | 0.75 | до чего расширяется воздух в pop-релизе (M21) |
| `chargeBalls.releaseDuration` | 0.09 с | длительность pop-релиза после выстрела (M21) |
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
  │                    release (player) → NO-OP (M20)
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
- **Неотменяемый выстрел (M20; заменил cancel-on-release M18):** игрок, отпустив fire во время
  CHARGING, НЕ сбрасывает заряд — `railgunShouldCancelCharge` удалён, отпущенный триггер это no-op.
  Начатый заряд всегда доходит до выстрела. Это убирает наказание за «отпустил раньше 1.1 с» и
  делает спуск «просто кликом». Единственный выход из CHARGING до выстрела — смерть владельца
  (`onOwnerDeath`). Боты и раньше не отменяли (их `wantsFire` мигает покадрово).
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
2b. **Бегущий фронт луча (M20):** вместо мгновенной вспышки всей длины `show()`
   рисует короткий stub у дула, а `BeamSweep` ведёт фронт к термину со скоростью
   `beamFrontSpeed` (2400 юнитов/с). Каждое событие (penetration-импакт, ионная
   puff’а, wall-терминус) срабатывает, когда фронт **проходит** его `d` от дула:
   выстрел визуально «прошивает» линию. Ближний бой (d заходит за 1 кадр) —
   импакт почти мгновенный; дальний снайп — видимый пробег. `PendingShotVisual`
   хранит `d` для каждого pierce (`hit.distance`) и wall (`wall.dist`).
   Смерть/`dispose` обнуляют активный `beamSweep` (его события не стреляют за
   мёртвый танк).
3. **Penetration feedback:** каждому пробитию — свой цвет impact из
   `pierceColors` (1-й ярче, 3-й+ тусклее) + нисходящий пинг
   `audio.railgunPierce(index)` (1800 → 900 → 500 Гц, тише с каждым пробитием).
   Wall-терминус остаётся оранжевым (`0xffa040`) + debris.

## Contact charge balls (M21)

Перед выстрелом на дуле «сходятся» два шара — читаемый индикатор накопления
заряда, синхронный с glow/FOV/pull (все едут от одного `progress`):

- **Электрический шар** (аддитивный, цвет 0x8fffe8) нарастает `electricStart →
  contactRadius` по **p²** — «накапливается», выпукло; на полном заряде «кипит»
  (пульс масштаба ±8%).
- **Белый «воздушный» шар** (обычный блендинг, под glow) схлопывается
  `airStart → contactRadius` вогнуто — `1−(1−p)²`: сначала быстро, к концу
  замедляется; opacity растёт по мере сжатия, но остаётся полупрозрачной
  (`0.08 → 0.30`), а электрический стартует с opacity 0.55 (растёт до 1.0) —
  иначе аддитивный cyan не пробивается сквозь белый шар и заряд «невидим».
- **Соприкосновение = кадр выстрела.** При p=1 оба радиуса равны
  `contactRadius`. Это совпадает с синхронным firing FSM, отдельно связывать
  ничего не нужно (неотменённый заряд M20 всегда доходит до p=1). В кадр fire
  `confirmFire()` проигрывает короткий pop (0.09 с): электрический втягивается
  в ноль со вспышкой, воздух «хлопает» до `airPopRadius` и гаснет.
- Луч вырастает из точки контакта: стартовый `BEAM_SWEEP_START_LEN` =
  `2·contactRadius` (M21), дальше его ведёт `BeamSweep` (M20).
- Позиция живая — оба шара каждый кадр берут `fillMuzzleAndAim`, поэтому сидят
  на дуле и трясутся вместе с barrel-jitter бесплатно. Показываются и игроку,
  и ботам (заодно PvP-индикатор: видно, что вражеская рельса почти зарядила).
- Единственный досрочный выход — `hide()` при смерти/`dispose` (разрядной
  анимации нет, т.к. выстрел неотменим). Геометрия сферы — module-level
  ref-count (как цилиндры `RailgunBeamFx`).

Радиусы — чистая функция `chargeBallRadii(progress, cfg)` (unit-test без Three);
presentation-класс `RailgunChargeBalls` владеет только mesh'ами/материалами.

**Толщина луча (M21):** трёхслойный beam стал примерно вдвое тоньше
(effective core/body/glow ≈ 0.08/0.20/0.40 против прежних 0.13/0.33/0.65) —
`CORE_RADIUS/BODY_RADIUS/GLOW_RADIUS` в `RailgunBeamFx`. Punch-множители
сохранены, контраст «выстрел→settle» читается сильнее на тонкой линии.

## Аммуниция (HUD)

`getAmmoState`: magazine 1; `isCharging` / reload progress из FSM.

## Классы

| Класс / символ | Файл |
|----------------|------|
| `RailgunWeapon` | `src/game/weapons/RailgunWeapon.ts` |
| `RailgunState` | там же (`IDLE`/`CHARGING`/`COOLDOWN`) |
| `railgunShouldStartCharge` | `src/game/weapons/railgunFireLogic.ts` (cancel удалён в M20) |
| `chargeBallRadii` / `ChargeBallConfig` (радиусы шаров, pure) | `src/game/weapons/railgunFireLogic.ts` |
| `RailgunChargeBalls` (M21 contact balls, shared sphere geo) | `src/game/weapons/railgunChargeBalls.ts` |
| `BeamSweep` / `BeamSweepEvent` (бегущий фронт, pure) | `src/game/weapons/railgunBeamSweep.ts` |
| `RailgunBeamFx` (+`setLength`, ref-count shared geo) | `src/game/weapons/RailgunBeamFx.ts` |
| `nearestShotBlockerDist` / `SHOT_BLOCKER_HEIGHT_EPS` | `src/game/weapons/railgunBlockers.ts` |
| `applyRailgun*Fx` | `src/game/weapons/railgunChargeFx.ts` |
