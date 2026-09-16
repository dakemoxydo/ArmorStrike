# Tank Aim — Наведение башни

**Статус:** Approved  
**Слой:** Simulation  
**Связано:** [[Player_Controls]], [[Weapon_Cannon]], [[Weapon_Railgun]], [[Weapon_Flamethrower]], [[AI_Bots]], [[Vertical_Auto_Aim]]

## Назначение

Плавный поворот башни (`turretYaw`) к целевому азимуту `aimYaw` относительно корпуса `yaw`.

## Входы

| Источник | Кто задаёт `aimYaw` |
|----------|---------------------|
| Игрок | `PlayerController` ← мышь (`CameraLookState`) |
| Бот | `AIController` / `updateTurretAndFire` (`aiAimFire.ts`) |

## Формула (TankAimSystem)

```
rel     = wrapAngle(aimYaw - yaw)        // цель башни относительно корпуса
diff    = wrapAngle(rel - turretYaw)     // сколько ещё довернуть
maxStep = turretSpeed * dt
turretYaw += clamp(diff, -maxStep, +maxStep)
```

`turretSpeed` берётся из `TURRETS[id].turretSpeed` (каталог башни, `src/core/catalogData.ts`):

| Башня | turretSpeed |
|-------|-------------|
| Рельсотрон | 7.5 |
| Огнемёт | 8.5 |
| Пушка | 8.0 |
| Гаусс | 6.5 |
| Изида | 7.5 |

Параллельно `TankAimSystem` в том же проходе доводит вертикальный тангаж ствола
`barrelPitch` к захваченной цели в пределах сектора УВН башни — это отдельная
механика, описанная в [[Vertical_Auto_Aim]].

## Направление выстрела

Оружие берёт:

- `muzzleWorld(out)` — точка дула в мире;
- `aimDir(out)` — полный **3D-вектор** вылета снаряда/луча из азимута `aimYaw`
  (взгляд/камера) и тангажа ствола `barrelPitch`:

```
cp  = cos(barrelPitch)
out = ( sin(aimYaw)·cp,  sin(barrelPitch),  cos(aimYaw)·cp )   // единичный
```

При `barrelPitch = 0` выстрел строго горизонтален — `(sin aimYaw, 0, cos aimYaw)`
(прежнее поведение). Тангаж `barrelPitch` появляется только когда цель захвачена
вертикальной автонаводкой в пределах сектора УВН башни; математика, потоки и
визуал — в [[Vertical_Auto_Aim]].

(см. `fillMuzzleAndAim` в `src/game/weapons/muzzle.ts`, `Tank.aimDir` в `src/game/Tank.ts`).

## Классы

| Класс | Файл |
|-------|------|
| `TankAimSystem` | `src/game/engine/systems/TankAimSystem.ts` |
| `AimBody` | `src/game/tank/simPorts.ts` |
| `wrapAngle`, `clamp` | `src/game/engine/physics.ts` |
