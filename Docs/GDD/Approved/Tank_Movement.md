# Tank Movement — Движение корпуса

**Статус:** Approved  
**Слой:** Simulation  
**Связано:** [[Player_Controls]], [[Arena_Physics]], [[Match_Framework]]

## Назначение

2D-движение танка на плоскости XZ: газ, руль, нитро, knockback-инерция. Общее для игрока и ботов.

## Параметры корпуса (каталог)

Источник: `HULLS` в `src/core/catalogData.ts`.

| ID | Имя | maxHealth | speed | reverseSpeed | turnSpeed | Роль |
|----|-----|-----------|-------|--------------|-----------|------|
| `hunter` | Хантер | 180 | 12.5 | 8.0 | 2.4 | Средний универсал |
| `viking` | Викинг | 150 | 15.0 | 9.5 | 3.0 | Штурм / скорость |
| `mammoth` | Мамонт | 250 | 11.5 | 7.5 | 2.2 | Тяжёлая броня |
| `speedy` | Speedy | 120 | 18.0 | 11.0 | 3.6 | Перехватчик / макс. скорость |
| `titan` | Титан | 300 | 10.2 | 6.5 | 1.9 | Флагман брони / макс. прочность |

Скорости из корпуса; run-scoped speed buffs удалены (см. [[Wave_Buffs]] removed).

## Формулы (TankMotionSystem)

### Нитро (BOOST)

Константы: `src/game/constants.ts` → `BOOST`.

| Константа | Значение | Смысл |
|-----------|----------|--------|
| `multiplier` | 1.5 | × max forward speed |
| `drainPerSec` | 0.35 | расход энергии/с (~2.85 с полного запаса) |
| `rechargePerSec` | 0.28 | восстановление/с |
| `minActivate` | 0.1 | мин. энергия для старта |

**Условие активации:**

```
wantBoost = boosting && boostEnergy > minActivate && throttle > 0.15
```

**Энергия:**

```
boostEnergy = clamp(boostEnergy + (wantBoost ? -drain : +recharge) * dt, 0, 1)
```

`drain` = `BOOST.drainPerSec`, `recharge` = `BOOST.rechargePerSec` — расход/восстановление идут по базовым константам без множителей.

### Скорость

```
maxFwd      = speed * (wantBoost ? 1.5 : 1)
targetSpeed = throttle >= 0 ? throttle * maxFwd : throttle * reverseSpeed
speed       = damp(speed, targetSpeed, λ, dt)
```

| Режим | λ (`SPEED_DAMP`) |
|-------|------------------|
| Обычный | 2.8 |
| Нитро | 4.2 |

### Поворот

```
agility = 0.55 + 0.45 * min(|speed| / speed_max, 1)
yaw    += steer * turnSpeed * agility * dt
```

На ходу корпус крутится охотнее, чем стоя.

### Позиция и knockback

```
position.x += (sin(yaw) * speed + knockback.x) * dt
position.z += (cos(yaw) * speed + knockback.z) * dt
knockback  *= exp(-KNOCKBACK_DECAY * dt)   // KNOCKBACK_DECAY = 5.5
vel        = Δposition / dt                // для lead ИИ
```

### Анимация гусениц (дифференциальное вращение)

Визуальная перемотка непрерывных лент гусениц рассчитывается в `TankAnimationSystem` с учётом линейной и угловой скоростей:

```
turnDelta = steer * turnSpeed * trackHalfWidth   // trackHalfWidth ≈ 1.45 м
v_left    = speed + turnDelta
v_right   = speed - turnDelta

// SCROLL_FACTOR = 1 / nominalLinkLen (0.22 м) ≈ 4.545 м⁻¹ для физической перемотки 1:1 без проскальзывания.
// 1 тайл текстуры = 1 трак с шевронами грунтозацепов в каноничном стиле Tanki Online.
trackLeftTex.offset.y  += v_left * dt * (1 / 0.22)
trackRightTex.offset.y += v_right * dt * (1 / 0.22)
```

- **Прямой ход (вперёд/назад):** обе гусеницы синхронно перематываются со скоростью танка.
- **Разворот на месте (нейтраль, speed = 0, steer ≠ 0):** гусеницы вращаются в противоположные стороны.
- **Поворот в движении:** внешняя гусеница перематывается быстрее, внутренняя — медленнее или в противоход.

## Коллизии

После motion: `PhysicsSystem` выталкивает круг радиуса `TANK.radius = 1.8` из AABB-стен/блоков и разводит танки (`tankSeparation`).

## Классы

| Класс / символ | Файл |
|----------------|------|
| `TankMotionSystem` | `src/game/engine/systems/TankMotionSystem.ts` |
| `TankSystem` | `src/game/engine/systems/TankSystem.ts` |
| `TankEntity` | `src/game/Tank.ts` |
| `MotionBody` (порт) | `src/game/tank/simPorts.ts` |
| `BOOST`, `TANK` | `src/game/constants.ts` |
| `SPEED_DAMP`, `KNOCKBACK_DECAY` | `src/game/tuning.ts` |
| `PhysicsSystem` | `src/game/engine/systems/PhysicsSystem.ts` |

## State diagram (boost)

```
[boostEnergy]
     │
     ├─ wantBoost ──► drain, speed×1.5, boostActive=true
     └─ else ───────► recharge, normal speed
```
