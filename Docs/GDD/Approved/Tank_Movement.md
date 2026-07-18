# Tank Movement — Движение корпуса

**Статус:** Approved  
**Слой:** Simulation  
**Связано:** [[Player_Controls]], [[Arena_Physics]], [[Wave_Buffs]]

## Назначение

2D-движение танка на плоскости XZ: газ, руль, нитро, knockback-инерция. Общее для игрока и ботов.

## Параметры корпуса (каталог)

Источник: `HULLS` в `src/core/catalogData.ts`.

| ID | Имя | maxHealth | speed | reverseSpeed | turnSpeed | Роль |
|----|-----|-----------|-------|--------------|-----------|------|
| `hunter` | Хантер | 100 | 15.5 | 9.5 | 2.9 | Средний универсал |
| `viking` | Викинг | 80 | 19.5 | 12.0 | 3.6 | Штурм / скорость |
| `mammoth` | Мамонт | 160 | 11.0 | 7.0 | 2.1 | Тяжёлая броня |

Бафф волны `speed` умножает `speed`, `reverseSpeed` и `turnSpeed` (см. [[Wave_Buffs]]).

## Формулы (TankMotionSystem)

### Нитро (BOOST)

Константы: `src/game/constants.ts` → `BOOST`.

| Константа | Значение | Смысл |
|-----------|----------|--------|
| `multiplier` | 1.5 | × max forward speed |
| `drainPerSec` | 0.5 | расход энергии/с (~2 с полного запаса) |
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

`boostDrainMul` / `boostRechargeMul` на танке — множители (сейчас сбрасываются с баффами).

### Скорость

```
maxFwd      = speed * (wantBoost ? 1.5 : 1)
targetSpeed = throttle >= 0 ? throttle * maxFwd : throttle * reverseSpeed
speed       = damp(speed, targetSpeed, λ, dt)
```

| Режим | λ (`SPEED_DAMP`) |
|-------|------------------|
| Обычный | 4.5 |
| Нитро | 6.0 |

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
