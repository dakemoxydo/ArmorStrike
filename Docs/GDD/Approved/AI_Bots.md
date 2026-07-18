# AI Bots — Поведение противников

**Статус:** Approved  
**Слой:** AI  
**Связано:** [[Wave_System]], [[Tank_Movement]], [[Tank_Aim]]

## Роли (`AIRole`)

| Role | Условие | Persona (aggro / lead) | aimError × | cover HP |
|------|---------|------------------------|------------|----------|
| `elite` | wave≥3, index 0 | 0.88 / 1.05 | 0.65 | 0.50 |
| `sniper` | turret=railgun | 0.22 / 1.15 | 0.5 | 0.40 |
| `assault` | turret=flamethrower | 0.95 / 0.65 | 1.15 | 0.35 |
| `standard` | cannon | random-ish | 1.0 | 0.35 |

`roleForBot` / `personaForRole` / `aimErrorMulForRole` / `coverHpFracForRole` — `aiRoles.ts`.

## FSM

```
patrol ──(sight + LoS)──► engage
engage ──(lose sight timeout)──► patrol
```

В engage: преследование / hold preferred range, strafe, cover seek при low HP, aim+fire.

## Preferred range

`preferredRange(weaponType, aggro)` + роль:

| Role | Коррекция |
|------|-----------|
| sniper | base + 10 |
| assault | min(base, 8) |
| elite | base + 3 |

## Подсистемы

| Модуль | Ответственность |
|--------|-----------------|
| `AIController` | state machine, patrol waypoints, stuck |
| `aiAimFire` | башня, lead, fire gate, aim noise |
| `aiCover` | `findCoverPoint` |
| `aiObstacle` | `computeObstacleAvoidance` |
| `aiTuning` | preferredRange, aimTolerance, steering |
| `losClear` | line of sight через colliders |

## Fire

`wantsFire` → `BotAiStage` → `tank.weapon.setFire(wantsFire)`.

Оружие бота то же, что у игрока (`createWeapon`).

## Классы

| Класс | Файл |
|-------|------|
| `AIController` | `src/game/AI.ts` |
| `AIPersona`, `AICtx` | `src/game/AI.ts` |
| `roleForBot` | `src/game/aiRoles.ts` |
| `updateTurretAndFire` | `src/game/aiAimFire.ts` |
