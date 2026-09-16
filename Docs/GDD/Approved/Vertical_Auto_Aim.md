# Vertical Auto-Aim — Вертикальная автонаводка и захват цели

**Статус:** Approved  
**Слой:** Simulation & Presentation  
**Связано:** [[Tank_Aim]], [[Target_Highlight_Aim]], [[Player_Controls]], [[Weapon_Cannon]], [[Weapon_Railgun]], [[Weapon_Gauss]], [[Weapon_Flamethrower]], [[Weapon_Isida]], [[Tank_Suspension_Dynamics]], [[Projectile_System]], [[AI_Bots]], [[UI_Polish]]

---

## 1. Назначение

Фирменная аркадная механика наведения в духе **Tanki Online**: у танка нет
ручного управления возвышением. Когда цель (враг) оказывается в секторе
автонаводки, башня не только доворачивается по азимуту (см. [[Tank_Aim]]), но и
**автоматически наклоняет ствол** (`barrelPitch`) к точке прицела цели, а снаряд
/ луч летят по полному 3D-вектору. Прицел HUD мгновенно подсвечивает захват.

Разновысокость в текущих аренах достигается разной высотой маски башни
(`HULL_TURRET_Y`: hunter 1.9, viking 1.5, mammoth 2.3, speedy 1.46, titan 2.36)
и перепадом `Y` между дулом и центром корпуса цели; при добавлении рельефа
механика масштабируется без изменений.

## 2. Сектор углов вертикального наведения (УВН) башни

Каждая запись `TurretDef` (`src/core/catalogTypes.ts`) несёт три параметра:

| Поле | Смысл |
|------|-------|
| `elevationAngle` | макс. угол задирания ствола вверх, рад |
| `depressionAngle` | макс. угол склонения вниз, рад (величина положительная) |
| `pitchSpeed` | угловая скорость довода ствола, рад/с |

Фактические значения (`src/core/catalogData.ts`, `TURRETS`):

| Башня | elevation | depression | pitchSpeed |
|-------|-----------|------------|------------|
| Рельсотрон (`railgun`) | +22° | −14° | 6.0 |
| Огнемёт (`flamethrower`) | +30° | −20° | 10.0 |
| Пушка (`cannon`) | +22° | −14° | 8.0 |
| Гаусс (`gauss`) | +18° | −12° | 5.0 |
| Изида (`isida`) | +32° | −22° | 9.5 |

Проектируются в `TankParams` (`src/game/tank/types.ts`, поля опциональны —
тестовые двойники без УВН держат горизонт) единственным конструктором танка
`createTankEntity` в `src/game/PlayerFactory.ts` (общий путь для игрока и ботов).

## 3. Состояние

`TankMotionState` (`src/game/tank/components.ts`):

| Поле | Смысл |
|------|-------|
| `barrelPitch` | текущий тангаж ствола, рад (`> 0` = вверх) |
| `pitchDy` | ΔY цели относительно дула (вход для atan2) |
| `pitchDistXZ` | XZ-дистанция дуло→цель (вход для atan2) |
| `pitchLocked` | цель захвачена в этом/прошлом кадре |

Порт симуляции `AimBody` (`src/game/tank/simPorts.ts`) требует
`barrelPitch/pitchLocked/pitchDy/pitchDistXZ` и читает УВН из
`params`; `AnimBody` несёт необязательный `barrelPitch` для отрисовки.
`TankEntity` (`src/game/Tank.ts`) удовлетворяет порты через геттеры/сеттеры и
предоставляет два входных метода:

```
setPitchAim(targetCenter):     // дуло → цель: dy и distXZ + pitchLocked = true
  muzzleWorld(tmp)
  pitchDistXZ = hypot(tx-tmp.x, tz-tmp.z)
  pitchDy     = ty - tmp.y
  pitchLocked = true
clearPitchAim():  pitchLocked = false
```

## 4. Расчёт и довод (TankAimSystem)

`TankAimSystem.updateOne` (`src/game/engine/systems/TankAimSystem.ts`) после
доворота башни по азимуту считает вертикаль:

```
pitchSpeed = params.pitchSpeed ?? 0
если pitchSpeed <= 0:  barrelPitch = 0; выход        // УВН не задан

elevation  = params.elevationAngle ?? 0
depression = params.depressionAngle ?? 0
targetPitch = pitchLocked
  ? clamp(atan2(pitchDy, pitchDistXZ), -depression, +elevation)
  : 0                                                // без цели — горизонт

step = pitchSpeed * dt
barrelPitch += clamp(targetPitch - barrelPitch, -step, +step)
```

Линейный шаг `pitchSpeed·dt` (не `dampTo`) даёт константную угловую скорость и
гарантированно доезжает до цели за `|Δ|/pitchSpeed` секунд, не перелетая её
(кламп по величине шага). Потеря цели (`pitchLocked = false`) так же плавно
возвращает ствол к `0`. `atan2(0, 0) = 0` — вырожденная геометрия безопасна.

## 5. Применение к модели (TankAnimationSystem)

`TankAnimationSystem.update` (`src/game/engine/systems/TankAnimationSystem.ts`):

```
visual.barrelGroup.rotation.x = -(barrelPitch ?? 0)
```

Знак «−»: в локальных осях модели ствол смотрит вдоль **+Z**, а положительный
поворот вокруг **+X** роняет дуло вниз (`ẑ → −ŷ`). Значит «вверх»
(`barrelPitch > 0`) = отрицательный `rotation.x`. Отдача по Z
(`barrelGroup.position.z`) и джиттер заряда рельсы (`.position.x/.y`)
остаются независимыми каналами; наклонDeath-«обвисание» корпуса (`.rotation.x`
при анимации смерти) не конфликтует — живой ствол всегда в живой ветке.

## 6. Вектор выстрела

`Tank.aimDir(out)` (`src/game/Tank.ts`) собирает единичный 3D-вектор:

```
cp  = cos(barrelPitch)
out = ( sin(aimYaw)·cp,  sin(barrelPitch),  cos(aimYaw)·cp )
```

Оружие берёт направление через `fillMuzzleAndAim` (`src/game/weapons/muzzle.ts`).
XZ-проекция вектора равна `(sin aimYaw, cos aimYaw)` в любой момент (домножается
на общий `cos pitch`), поэтому планиметрическая логика поражений
(`segmentHitsCircleT`, конусы огня, блокеры рельсы) не меняется — добавляется
только вертикальная составляющая. Отдача дула (`onFired`) намеренно использует
горизонт `(sin aimYaw, 0, cos aimYaw)`, а не 3D-вектор, чтобы не уводить танк
по вертикали (см. [[Tank_Suspension_Dynamics]]).

## 7. Источник захвата цели

Единый критерий «цель в секторе + прямая LOS» — уже реализованный
`AimHighlighter` с гистерезисом `holdSec` (см. [[Target_Highlight_Aim]]).

- **Игрок** — `TargetHighlightStage.update` (`src/game/engine/stages/TargetHighlightStage.ts`):
  после `hl.update(...)` при наличии цели ставит
  `player.setPitchAim(target.position + (0, TANK.aimCenterY, 0))`
  (`TANK.aimCenterY = 1.6` — мировая высота центра корпуса, та же, что точка
  поражения снаряда/луча), иначе `player.clearPitchAim()`.
- **Боты** — `BotAiStage` (`src/game/engine/stages/BotAiStage.ts`): `aiFocusForBot`
  возвращает `{ focus, canSee }` (проброшен `canSee` из `pickAiFocus`,
  `src/game/match/aiFocus.ts`); ствол наводится только при `canSee && focus.alive`,
  иначе `clearPitchAim()`.

Оба пишут вход (`pitchDy/pitchDistXZ/pitchLocked`) в `motion`, а фактический
интегратор — `TankAimSystem`. Боты считаются ДО `TankSystemStage` (тот же кадр),
для игрока стадия подсветки идёт ПОСЛЕ выстрела — довод ствола на один кадр
позади азимута; при аркадной скорости `pitchSpeed` задержка незаметна.

## 8. Индикация захвата в прицеле (HUD)

Флаг `isTargetLocked` (`HudSnapshot`, `src/game/types.ts`) — императивный,
ref-painted канал (зарегистрирован как `() => false` в `src/ui/hudRenderGate.ts`,
не вызывает React-рендер):

```
HudModel.getHud:            isTargetLocked = false              // сброс-дефолт
GameLoop.updateCrosshair:   hud.isTargetLocked = pl.pitchLocked // живые кадры боя
useGameHud.onHud:           crossRef.classList.toggle('is-locked',
                              playing && alive && !paused && isTargetLocked)
```

Стиль — `.crosshair.is-locked` в `src/styles/hud.css`: центр `.ch-dot`, засечки
`.ch-tick` и кольцо `.ch-ring` перекрашиваются с мятного `#2ee6c0` на боевой
красный `#ff2d3c` (цвет `TARGET_HIGHLIGHT`) с красным неоновым свечением на
токенах `--glow-r-*`; засечки плавно смыкаются к центру на `6px`
(`translateY/translateX` под `:not(.is-charging)`, чтобы не спорить с рампой
заряда рельсы). Переход `0.12s ease` по `transform/background/box-shadow`,
под `prefers-reduced-motion` — `transition: none`. Прицел монтируется только
в бою (`HUD`), поэтому захват не «висит» после смерти/паузы.

## 9. Сброс при респауне

`RespawnController.respawn` (`src/game/match/RespawnController.ts`) обнуляет
`barrelPitch = 0` и `pitchLocked = false` вместе с `turretYaw`, чтобы ствол не
оставался задратым после гибели.

## 10. Решённые вопросы (из черновика)

1. **Боты** — да, используют ту же автонаводку (раздел 7).
2. **Подвеска/стабилизация** — компенсации нет: ствол качается вместе с
   корпусом, автонаводка доворачивает тангаж относительно его текущего
   положения (в локальных осях башни).
3. **Анимация прицела** — и смена цвета, и смыкание засечек (раздел 8).
4. **Свободная камера по вертикали** — без изменений: `aimYaw` по-прежнему из
   `CameraLookState` (горизонт мыши), возвышение орудия полностью автоматическое.

## 11. Классы и файлы

| Роль | Файл |
|------|------|
| Параметры УВН башни | `src/core/catalogTypes.ts`, `src/core/catalogData.ts` |
| Проектция в `TankParams` | `src/game/PlayerFactory.ts`, `src/game/tank/types.ts` |
| Состояние `barrelPitch` | `src/game/tank/components.ts`, `src/game/tank/simPorts.ts` |
| Вход цели / сброс | `src/game/Tank.ts` (`setPitchAim`/`clearPitchAim`/`aimDir`) |
| Интегратор тангажа | `src/game/engine/systems/TankAimSystem.ts` |
| Наклон ствола в mesh | `src/game/engine/systems/TankAnimationSystem.ts` |
| Захват (игрок / боты) | `src/game/engine/stages/TargetHighlightStage.ts`, `src/game/engine/stages/BotAiStage.ts` |
| Флаг HUD | `src/game/HudModel.ts`, `src/game/GameLoop.ts`, `src/ui/hudRenderGate.ts`, `src/hooks/useGameHud.ts` |
| Стиль прицела | `src/components/hud/HudCrosshair.tsx`, `src/styles/hud.css` |

## 12. Тесты

- `src/__tests__/verticalAim.test.ts` — кламп по `elevationAngle`/`depressionAngle`
  (цель выше/ниже), плавный довод и возврат к горизонту, отсутствие УВН,
  3D-`aimDir` (азимут не зависит от тангажа, единичная длина) и сквозной путь
  `setPitchAim → TankAimSystem → aimDir`.
- `src/__tests__/verticalAimHud.test.tsx` — живой класс `.is-locked` на
  `.crosshair` (и его отсутствие на мёртвом/паузе), контракт `hud.css`
  (красный `#ff2d3c`, смыкание засечек, `prefers-reduced-motion`).

## 13. Инварианты

- Ноль аллокаций в горячем цикле: `TargetHighlightStage`/`BotAiStage`/`Tank`
  переиспользуют модульные `THREE.Vector3` (`_aimPoint`, `_pitchTmp`).
- Горизонтальная планиметрия поражений не затронута (XZ-проекция `aimDir`
  неизменна), луч `RailgunWeapon.castHitscan` — настоящий 3D-`Raycaster`
  (`THREE.Raycaster`), что с тангажом лишь точнее берёт корпус цели.
- Проверка: `npm run typecheck`, `npm test`, `npm run lint`, `npm run docs:check`.
