# AI Bots — Поведение противников

**Статус:** Approved  
**Слой:** AI  
**Связано:** [[Match_Framework]], [[Tank_Movement]], [[Tank_Aim]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes]]

## Роли (`AIRole`)

| Role | Условие | Persona (aggro / lead) | aimError × | cover HP |
|------|---------|------------------------|------------|----------|
| `elite` | wave≥3, index 0 | 0.88 / 1.05 | 0.65 | 0.50 |
| `sniper` | turret=railgun | 0.22 / 1.15 | 0.5 | 0.40 |
| `assault` | turret=flamethrower | 0.95 / 0.65 | 1.15 | 0.35 |
| `standard` | cannon | random-ish | 1.0 | 0.35 |

`roleForBot` / `personaForRole` / `aimErrorMulForRole` / `coverHpFracForRole` — `aiRoles.ts`.

## Target selection (P2 multi-target)

`pickAiFocus` (`src/game/match/aiFocus.ts`) + `BotAiStage`:

| Mode | Focus |
|------|--------|
| DM (FFA) | nearest / sticky **hostile** (any other tank via `isEnemy`) |
| TDM / CP | nearest / sticky enemy team |

- Prefer **visible** (LoS + sightRange) hostiles, else hunt nearest.
- **Sticky** target with slack (~14 u) to reduce thrash.
- Shot line block: **allies only** (`allyLineBlockers`) — in FFA peers do not block fire.

## CP objective duty (P5)

| | |
|--|--|
| Flag | `BotEntry.objectiveDuty` from `isObjectiveDuty(index)` (~50%) |
| Zone pick | `pickObjectiveZone` — contested → neutral → enemy → own |
| Drive | `AICtx.moveHint` = zone center; `AIController` overrides path unless close fight |
| Fight | clear moveHint when `shouldFightNearObjective` (range / enemy on point) |
| Hunters | remaining bots: normal focus only |

See [[Capture_Point]].

## FSM

```
patrol ──(sight + LoS on focus)──► engage
engage ──(lose sight timeout)──► patrol
```

В engage: преследование focus / hold preferred range, strafe, cover seek при low HP, aim+fire.

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

| Класс / fn | Файл |
|------------|------|
| `AIController` | `src/game/AI.ts` |
| `pickAiFocus`, `allyLineBlockers` | `src/game/match/aiFocus.ts` |
| `pickObjectiveZone`, `isObjectiveDuty` | `src/game/match/aiObjective.ts` |
| `BotAiStage` | `src/game/engine/stages.ts` |
| `roleForBot` | `src/game/aiRoles.ts` |
| `updateTurretAndFire` | `src/game/aiAimFire.ts` |
