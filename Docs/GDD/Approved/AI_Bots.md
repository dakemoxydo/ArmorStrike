# AI Bots — Поведение противников

**Статус:** Approved  
**Слой:** AI  
**Связано:** [[Match_Framework]], [[Tank_Movement]], [[Tank_Aim]]

## Роли (`AIRole`)

| Role | Условие | Persona (aggro / lead) | aimError × | cover HP |
|------|---------|------------------------|------------|----------|
| `elite` | match-эра: не спавнится (`BOT_NORMAL.roleWave=1`) | 0.88 / 1.05 | 0.65 | 0.50 |
| `sniper` | turret=railgun/gauss | 0.22 / 1.15 | 0.5 | 0.40 |
| `assault` | turret=flamethrower/isida | 0.95 / 0.65 | 1.15 | 0.35 |
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
| Fight     | clear moveHint when `shouldFightNearObjective` (enemy on point / within band)   |
| Hunters   | remaining bots: normal focus only                                                |

**Боевая полоса у точки — от дальности оружия бота, а не от дальности обзора:**
`objectiveFightRange(bot.turretId, BOT_NORMAL.sightRange)` =
`min(TURRETS[turretId].range, sightRange) × 1.05` (`src/game/aiRoles.ts`,
звонок из `BotAiStage`). Это ровно та же формула, что гейтит ближний бой внутри
`AIController` (`dist <= fireRange × 1.05`), поэтому снятие moveHint и решение
«есть ли бой» не расходятся. При обзоре 65:

| Оружие бота | `range` | Полоса |
|-------------|---------|--------|
| flamethrower | 22 | **23.1 м** |
| isida | 20 | **21 м** |
| cannon | 75 | 68.25 м (ограничено обзором) |
| gauss | 110 | 68.25 м (ограничено обзором) |
| railgun | `Infinity` | 68.25 м (ограничено обзором) |

Раньше полоса была `BOT_NORMAL.sightRange × 0.85` = 55.25 м **для всех**: огнемёт
(22 м) и изида (20 м) бросали захват из-за ЛЮБОГО врага в 55 м, а потом шли
таранить точку. Пин: `src/__tests__/aiEngageFixes.test.ts`.

See [[Capture_Point]].

## FSM

```
patrol ──(sight + LoS on focus)──► engage
engage ──(lose sight timeout)──► patrol
```

В engage: преследование focus / hold preferred range, strafe, cover seek при low HP, aim+fire.

## Preferred range

`preferredRange(weaponType, aggro)` (`aiTuning.ts`) + коррекция роли
(`AIController.prefRange`):

| Role | Коррекция |
|------|-----------|
| sniper | base + 10 |
| assault | min(base, 8) |
| elite | base + 3 |

`base` по оружию: flamethrower **7**, isida 13, railgun/gauss `34 + aggro·10`,
cannon/прочее `20 + aggro·8`. Для assault (огнемёт 7, изида 13 → 8) это и есть
боевая дистанция, вокруг которой бот держится.

## Полосы боя (engage)

`pref` сравнивается с дистанцией до фокуса и переводится в целевую точку
(`AIController.computeTargetPoint`):

| Role | approachBand | retreatBand | strafeW | газ: подход / откат / удержание |
|------|--------------|-------------|---------|----------------------------------|
| sniper | 12 | 4 | 4 | 0.75 / 0.85 / 0.35 |
| assault | **6** | **4** | 10 | 1.0 / **0.9** / 0.6 |
| standard | 8 | 5 | 10 | 1.0 / 0.7 / 0.6 |
| elite (не спавнится в match-эре) | 8 | 5 | 8 | 1.0 / 0.7 / 0.6 |

- `dist > pref + approachBand` → сближение (газ 1.0, sniper 0.75) с боковым
  сносом 6 м (sniper 3).
- `dist < pref − retreatBand` → откат от фокуса на 10 м (sniper 14), газ 0.7
  (assault **0.9** — от огнемёта на 0.7 уходишь слишком медленно и снова
  попадаешь в струю).
- иначе — удержание полосы боковым сносом `strafeW`, газ 0.6 (sniper 0.35).
- **Assault больше не таранит позицию игрока.** Ранний `return` в точку фокуса
  с газом 1.0 удалён: он вырождал штурм в «нос в позицию» — газ залипал на 1.0,
  дистанция не держалась, и бот не отходил от врага, которого не доставал.
  Собственные узкие полосы 6/4 дают бой на боевой дистанции flamer (7) / isida (8).
- Выше полос только укрытие: при HP < `coverHpFracForRole` цель — точка укрытия
  (газ 1.0) независимо от дистанции.

## Обход по waypoint (`waypointDetourOpen`)

В engage, если LOS к фокусу порван, но линия к patrol-точке свободна, бот едет
к **waypoint** (газ 1.0), а не в позицию фокуса. Это единственный путь, при
котором re-pick точки из антизастревания реально меняет направление
engaged-бота (иначе цель затиралась позицией невидимого фокуса).

## Антизастревание и выход из трапа

`AIController.checkAntiStuck` (порог) + шаг 8b (сам выход):

- Порог: `|throttle| > 0.3` и `speed < 1` → `stuckT += dt` (накопление идёт и
  во время обхода; раньше ветки были взаимоисключающими → угловые ловушки);
  спад `stuckT −= dt·2`.
- При `stuckT > 1.1`: новая patrol-точка (`pickWaypoint`), `stuckT = 0` и
  **выход из трапа** — `escapeT = ESCAPE_T` (**0.9 с**) и
  `avoidT = max(avoidT, ESCAPE_T)`, т.е. `avoidT` **поднимается**, а не
  обнуляется, и выбранное направление обхода (`avoidDir`) **удерживается** всё
  время выхода. Раньше здесь стояло `avoidT = 0`: обход заново пробивал оба ±60°,
  оба упирались в тот же блок, руление возвращалось на него же — livelock в
  плотных кластерах.
- Пока `escapeT > 0`, шаг 8b применяется **последним** (обход и idle не затирают
  задний ход): `steer = avoidDir`, `throttle = ESCAPE_THROTTLE` (**−0.8**) —
  в `TankMotionSystem` отрицательный газ = задний ход
  (`throttle · reverseSpeed`). До этого газ нигде не был отрицательным, поэтому
  застрявший бот физически не мог откатиться от блока.

Пин: `src/__tests__/aiEngageFixes.test.ts`.

## Подсистемы

| Модуль | Ответственность |
|--------|-----------------|
| `AIController` | state machine, patrol waypoints, stuck |
| `aiAimFire` | башня, lead, fire gate, aim noise |
| `aiCover` | `findCoverPoint` (`COVER_SEARCH_DIST` 42, `COVER_STANDOFF` 3.4, только blocksSight, без ramp) |
| `aiObstacle` | `computeObstacleAvoidance` |
| `aiTuning` | preferredRange, aimTolerance, steering |
| `losClear` | line of sight через colliders |

**Cover и классы оружия (D3):** поиск укрытия класс-нейтрален — 42 / 3.4 это
константы класса `aiCover` (`COVER_SEARCH_DIST` / `COVER_STANDOFF`), а не опции
поиска: единственный вызывающий (`AIController`) их никогда не передавал, и
дифференциация по ролям была недостижима. Класс-уместность возникает сама,
потому что бот дерётся на preferred range своего оружия — flamer (~7) прячет у
боя, railgun-снайпер (~46) прячет далеко; scoring сам-относительный
(`80 − distSelf − travel·0.35 + losBlocked·45`). Порог HP ухода — по роли
(`coverHpFracForRole`).

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
| `roleForBot`, `objectiveFightRange` | `src/game/aiRoles.ts` |
| `spawnMatchRoster`, `makeBot` | `src/game/match/rosterSpawn.ts` |
| `updateTurretAndFire` | `src/game/aiAimFire.ts` |
