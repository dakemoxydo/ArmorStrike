# Tank Aim — Наведение башни

**Статус:** Approved  
**Слой:** Simulation  
**Связано:** [[Player_Controls]], [[Weapon_Cannon]], [[Weapon_Railgun]], [[Weapon_Flamethrower]], [[AI_Bots]]

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

`turretSpeed` берётся из `TURRETS[id].turretSpeed` (каталог башни):

| Башня | turretSpeed |
|-------|-------------|
| Рельсотрон | 9.0 |
| Огнемёт | 11.5 |
| Пушка | 10.5 |

## Направление выстрела

Оружие берёт:

- `muzzleWorld(out)` — точка дула
- `aimDir(out)` — направление ствола в мире

(см. `fillMuzzleAndAim` в `src/game/weapons/muzzle.ts`).

## Классы

| Класс | Файл |
|-------|------|
| `TankAimSystem` | `src/game/engine/systems/TankAimSystem.ts` |
| `AimBody` | `src/game/tank/simPorts.ts` |
| `wrapAngle`, `clamp` | `src/game/engine/physics.ts` |
