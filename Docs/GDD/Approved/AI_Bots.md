# AI Bots — Поведение противников

**Статус:** Approved  
**Слой:** AI  
**Связано:** [[Match_Framework]], [[Tank_Movement]], [[Tank_Aim]]

## Роли (`AIRole`)

| Role | Условие | Persona (aggro / lead) | aimError × | cover HP |
|------|---------|------------------------|------------|----------|
| `elite` | wave≥3, index 0 (match: `BOT_NORMAL.roleWave=1` → **не** спавнится) | 0.88 / 1.05 | 0.65 | 0.50 |
| `sniper` | turret=railgun | 0.22 / 1.15 | 0.5 | 0.40 |
| `assault` | turret=flamethrower | 0.95 / 0.65 | 1.15 | 0.35 |
| `standard` | cannon | random-ish | 1.0 | 0.35 |

Match combat scales: `BOT_NORMAL` in `matchConfig.ts` (fixed Normal difficulty).  
Cooldown pad — `firePadForRole` (`aiRoles.ts`): standard **1.2** / assault **1.15** / sniper **1.35**, применяется в `rosterSpawn.makeBot`. У пушки — на межвыстрел (0.38 → 0.456 с; полная перезарядка магазина не пада). У railgun/flamer/gauss/isida `TURRET.shotCooldown = 0` (каденция weapon-internal) — их пад идёт через `reloadSpeedMul = 1/firePad`: рельса-бот заряд 1.0 → **1.35 с**, перезарядка 3.2 → **4.32 с**; огнемёт-бот батарея 22 → **~19.1/с** (расход не меняется). Все классы ботов стреляют медленнее игрока.  
`roleForBot` / `personaForRole` / `aimErrorMulForRole` / `coverHpFracForRole` / `firePadForRole` — `aiRoles.ts`.

## Roster: корпус и башня бота

`spawnMatchRoster` → `makeBot` (`match/rosterSpawn.ts`) выдаёт корпус и башню
циклами каталога 5×5: `hull = HULL_IDS[i % 5]`
(`hunter, viking, mammoth, speedy, titan`), `turret = BOT_TURRETS[i % 5]`
(`railgun, flamethrower, cannon, gauss, isida`).

Все 5 башен (включая `gauss` со снайперским автолоком и `isida` с вампиризмом)
и все 5 корпусов (включая сверхтяжёлый флагман `titan`) полноценно участвуют в боях
ботов во всех режимах без искусственных ограничений. Роли выводятся из башни:
`railgun` / `gauss` → `sniper`, `flamethrower` / `isida` → `assault`, `cannon` → `standard`.
Контракт составов запинен в `botDutyTable.test.ts`.

## Target selection (P2 multi-target)

`pickAiFocus` (`src/game/match/aiFocus.ts`) + `BotAiStage`:

| Mode     | Focus                                                       |
| -------- | ----------------------------------------------------------- |
| DM (FFA) | nearest / sticky **hostile** (any other tank via `isEnemy`) |
| TDM / CP | nearest / sticky enemy team                                 |

- Prefer **visible** (LoS + sightRange) hostiles, else hunt nearest.
- **Sticky** target with slack (~14 u) to reduce thrash. D4: slack работает
  только пока sticky видим; невидимый sticky уступает видимому врагу
  (иначе `aiAimFire` глушит ответный огонь), при полном отсутствии видимых
  охота на прежнего sticky продолжается.
- Shot line block: **allies only** (`allyLineBlockers`) — in FFA peers do not block fire.

## CP objective duty (P5)

|           |                                                                                  |
| --------- | -------------------------------------------------------------------------------- |
| Flag      | `BotEntry.objectiveDuty` from `isObjectiveDuty(index)` (~50%)                    |
| Zone pick | `pickObjectiveZone` — contested → neutral → enemy → own                          |
| Drive     | `AICtx.moveHint` = zone center; `AIController` overrides path unless close fight |
| Fight     | clear moveHint when `shouldFightNearObjective` (range / enemy on point)          |
| Hunters   | remaining bots: normal focus only                                                |

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
| `aiCover` | `findCoverPoint` (радиус 42, stand-off 3.4, только blocksSight, без ramp) |
| `aiObstacle` | `computeObstacleAvoidance` |
| `aiTuning` | preferredRange, aimTolerance, steering |
| `losClear` | line of sight через colliders |

**Cover и классы оружия (D3):** поиск укрытия класс-нейтрален (scoring сам-относительный: `80 − distSelf − travel·0.35 + losBlocked·45`); класс-уместность возникает сама, потому что бот дерётся на preferred range класса — flamer (~8) прячет у боя, railgun-снайпер (~46) прячет далеко. Порог HP ухода — по роли (`coverHpFracForRole`).

## Fire

`wantsFire` → `BotAiStage` (решает) → `WeaponFireStage` → `tank.weapon.setFire(wantsFire)`
(применение после синка башни — см. [[Game_Lifecycle]] «Порядок тика»).

Lead пушки — по реальной скорости снаряда `WEAPON_TUNING.cannon.speed` (54),
как и полёт самого снаряда: один источник истины в каталоге. Базовое зрение ботов — `BOT_NORMAL.sightRange = 65` м (увеличено для работы на широких проспектах арены 300×300).

Оружие бота то же, что у игрока (`createWeapon`).

## Классы

| Класс / fn | Файл |
|------------|------|
| `AIController` | `src/game/AI.ts` |
| `pickAiFocus`, `allyLineBlockers` | `src/game/match/aiFocus.ts` |
| `pickObjectiveZone`, `isObjectiveDuty` | `src/game/match/aiObjective.ts` |
| `BotAiStage` | `src/game/engine/stages/BotAiStage.ts` |
| `roleForBot` | `src/game/aiRoles.ts` |
| `spawnMatchRoster`, `makeBot` | `src/game/match/rosterSpawn.ts` |
| `updateTurretAndFire` | `src/game/aiAimFire.ts` |
