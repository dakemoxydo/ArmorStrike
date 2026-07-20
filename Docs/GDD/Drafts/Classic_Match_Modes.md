# Classic Match Modes — DM / TDM / Capture Point

**Статус:** Draft complete (P0–P6 shipped; keep as history / design trail)  
**Слой:** Match / Gameplay loop  
**Связано:** [[Game_Lifecycle]], [[Scoring]], [[AI_Bots]], [[Maps]], [[Match_Framework]], [[Team_Deathmatch]], [[Capture_Point]], [[Wave_System]] (removed P0)

### Locked decisions (player)

- DM roster: **8** total (1 player + 7 bots)
- Win thresholds: DM **30** / TDM **75** (P6 balance; was 100) / CP **1000**
- Time limit: **yes** (все режимы; exact minutes at implement — default 12)
- Friendly fire TDM/CP: **off**
- CP capture: **neutral-first**
- Waves: **full remove** (P0 done)
- Bot may win DM: **yes**
- Bot difficulty: **Normal only**

> **Shipped.** Исторический design trail; source of truth — `Docs/GDD/Approved/*` + `src/game/match/*`.

---

## 1. Intent

Заменить **волновой PvE** (player vs escalating bots → death = game over) на **классические матчевые режимы** в духе multiplayer-шутеров, где:

- всегда есть **локальный игрок + ИИ-боты** (онлайн-игроков пока нет);
- есть **respawn** (смерть ≠ конец матча);
- победа — **гонка до порога очков / убийств**, а не «продержался как можно дольше»;
- UI-поток: выбор **режима** → карта → loadout → матч.

### Что уходит

| Система | Почему |
|---------|--------|
| `WaveManager` + intermission | Нет волн между «раундами» |
| `Wave_Buffs` / `WaveIntermission` | Meta progression завязана на волны |
| `SCORE.waveBonus` | Нет wave clear |
| Смерть игрока → `mode = 'over'` | Заменяется respawn + match end по win condition |
| Скоринг «только kills игрока» | Нужны kills всех, team score, CP score |

---

## 2. Режимы (предложение игрока + уточнения GD)

### 2.1 Deathmatch (DM) — «Бой насмерть»

| Параметр | Значение | Комментарий |
|----------|----------|-------------|
| Формат | Free-for-all | Каждый сам за себя |
| Состав | **1 игрок + 7 ботов** (всего **8**) | Рекомендация GD; арена 300×300 + танки; 16 будет тесно |
| Win | Первый набрал **30 убийств** | Личный счётчик kills |
| Friendly fire | N/A (все враги) | Боты стреляют во всех, кроме себя |
| Respawn | Да | см. §4 |
| Вторичный end | Опционально: time limit 10–12 мин → побеждает лидер | Защита от вечного матча если никто не дотягивает |

**Правила киллов**

- Kill credit: `lastDamageDealer` (уже есть путь через `CombatSystem`).
- Самоубийство / environmental (если появится): **без** +kill; у жертвы +1 death.
- Teamkill: N/A.

**HUD**

- Лидерборд: kills / deaths (K/D), подсветка игрока.
- Цель: `YOUR 12 / 30` + top-3 live.

---

### 2.2 Team Deathmatch (TDM) — «Командный бой»

| Параметр | Значение | Комментарий |
|----------|----------|-------------|
| Формат | 2 команды **5 vs 5** | Игрок всегда в **Team Alpha** + 4 ally-бота; **Team Bravo** = 5 enemy-ботов |
| Win | Сумма kills команды достигает **75** (P6; design was 100) | Не личные, а team pool |
| Friendly fire | **Выкл** | Снаряды/огнь/рейл не наносят урон allies (критично для flame cone / splash) |
| Respawn | Да | Team-side spawn points |
| Вторичный end | Опционально time limit → team с большим score | |

**Правила**

- Kill +1 к **team score** убийцы + +1 personal kills.
- Death +1 personal deaths (для scoreboard, не win).
- Боты **не** целятся в allies; target selection фильтрует `teamId`.

**HUD**

- `ALPHA 47 — 52 BRAVO` + личный K/D.
- Tab: две колонки команд.

---

### 2.3 Capture Point (CP) — «Захват точки»

| Параметр | Значение | Комментарий |
|----------|----------|-------------|
| Формат | 2 команды **5 vs 5** | Как TDM |
| Точки | **A, B, C** | Изначально **нейтральные** |
| Захват | Контроль танка(ов) **одной** команды в зоне N секунд → ownership | см. ниже |
| Очки | Каждая **своя** точка: **+1 score/sec** команде-владельцу | 3 точки = макс **3/sec** |
| Win | Первая команда с **1000** очков | Чистый domination ≈ 1000/3 ≈ **5.5 мин**; реалистично **8–15 мин** при оспаривании |
| Убийства | Учитываются в personal/team K/D, **не** win condition | Поощряют скилл, но не решают матч |
| Friendly fire | **Выкл** | Как TDM |

#### Предлагаемые числа захвата (к утверждению)

| Параметр | Предложение | Почему |
|----------|-------------|--------|
| Радиус зоны | **18–22** world units | Танк + 1–2 союзника помещаются; не вся арена |
| Время захвата (чистый контроль) | **8 с** | Быстро меняет ownership, не «кэмп 30 сек» |
| Contest | Обе команды в зоне → **прогресс паузится** | Классика; не сбрасывать сразу |
| Смена владельца | Противник должен **сначала** нейтрализовать (тот же 8 с) **или** один шкалой 0→1 с flip | Вариант A: capture → neutral → enemy. Вариант B: continuous tug-of-war. **Рекомендация: A (neutral first)** — читаемее на HUD |
| Tick score | **1.0 / sec** на owned point, накапливать `dt` | Не 1 раз в fixed frame |
| Частичный прогресс | Сохранять progress при уходе (decay **0.5×** speed) | Опционально; v1 можно без decay |

#### Размещение точек (дизайн-уровень)

На каждой карте 3 якорных точки — **не** hardcode (0,0) для всех:

| Карта | A | B | C (черновая идея) |
|-------|---|---|-------------------|
| factory | Западный цех / контейнеры | Центр / hall | Восточный край / silos |
| village | Площадь / колодец | Запад paddock | Восток hay / амбары |
| city | Плаза | North avenue cross | South / overpass district |

Точные координаты — отдельный pass level design + GDD `*_Level_Design`.  
Визуал: диск/маркер на земле + letter billboard + цвет team ownership (нейтраль серый, Alpha синий, Bravo красный).  
Minimap: иконки A/B/C с цветом.

#### AI для CP (обязательное отличие от TDM)

Без role/objective AI боты будут FFA-драться в углу, а точки стоять пустые.

Минимальный v1:

- **% ботов на objective** ~40–60% (роль `objective` / weight);
- Цель: ближайшая **спорная / вражеская / нейтральная** точка с весом;
- Остальные — hunt enemies / defend owned point.

---

## 3. Общий match framework (фундамент до режимов)

Сейчас `GameMode = menu | garage | playing | over` — это **экран приложения**, не тип матча.

### 3.1 Новые понятия

```ts
// Концепт (не код)
type MatchModeId = 'deathmatch' | 'team_deathmatch' | 'capture_point'

type TeamId = 'alpha' | 'bravo' // DM: team отсутствует / null

interface MatchConfig {
  mode: MatchModeId
  mapId: MapId
  // roster derived from mode
  winKills?: number        // DM 30
  winTeamKills?: number    // TDM 75
  winTeamScore?: number    // CP 1000
  timeLimitSec?: number    // optional soft end
}
```

### 3.2 Что появляется у каждого танка

| Поле | DM | TDM/CP |
|------|----|--------|
| `isPlayer` | 1 true | 1 true |
| `teamId` | null / none | alpha \| bravo |
| `kills` / `deaths` | personal | personal |
| `alive` + respawn timer | yes | yes |

### 3.3 Respawn (общий)

| Параметр | Предложение |
|----------|-------------|
| Delay | **4 с** death cam / countdown |
| Spawn invuln | **2 с** (нельзя убить / не может стрелять? — **только damage immunity**, стрелять можно) |
| Player death | **не** `mode = over` |
| Bot death | dispose mesh/corpse policy как сейчас, re-spawn after delay |
| Spawn pick | furthest from enemies / team base; DM: fair points; TDM/CP: team spawns |

**Конец матча**

```
win condition met OR (optional) timeLimit
  → freeze combat briefly
  → mode = 'over' (или 'results')
  → Results screen: winner, scores, personal stats
```

### 3.4 Спавны

Текущие `SPAWN_POINTS` (7 edge) + player `(0,−120)` — **wave-era**.

Нужно:

| Режим | Спавны |
|-------|--------|
| DM | 8+ FFA points, max dist from living threats |
| TDM/CP | 2 базы (Alpha / Bravo), 3–5 points each, opposite sides of map |

Per-map spawn tables (как capture anchors) — в map catalog / level design.

### 3.5 Scoring rewrite

| Режим | Win metric | Personal |
|-------|------------|----------|
| DM | max personal kills ≥ 30 | kills, deaths, score cosmetic |
| TDM | teamKills ≥ 100 | kills, deaths |
| CP | teamScore ≥ 1000 | kills, deaths, captures (optional) |

Старый `SCORE.kill = +100` score points — можно оставить как **cosmetic XP** на results, но **не** win condition.

### 3.6 AI changes

| Сейчас | Нужно |
|--------|-------|
| Боты vs player only (wave PvE) | Target = any valid enemy |
| Roles от wave index | Roles от loadout + match mode |
| `aimError` scale by wave | Фиксированный skill tier **или** 2–3 difficulty presets |
| Нет teams | `isEnemy(a,b)` helper |
| Нет objectives | CP: objective weights |

### 3.7 UI flow (предложение)

```
MainMenu
  → ModeSelect (DM / TDM / CP)   // NEW
  → MapSelect
  → (Garage loadout если ещё не выбран)
  → startMatch(config)
playing → Results / GameOver
  → Реванш (тот же mode+map) | Сменить режим | Меню
```

Pause: без wave intermission.

---

## 4. Баланс и ощущение длины матча

| Режим | Целевая длина | При win numbers как в §2 |
|-------|---------------|---------------------------|
| DM 30 | 8–12 мин | При ~0.5–1 kill/min на лидера — ок; если слишком долго → 20 kills |
| TDM 75 | 8–12 мин | P6: fallback **75** shipped (was 100) |
| CP 1000 @ 1/s/point | 8–15 мин | При 2 points average hold: 1000/2 = 500 s ≈ 8.3 min — **хорошо** |

**Риск CP:** если обе команды AFK у баз → score 0 forever → **обязателен time limit** (напр. 12 мин → побеждает больший teamScore; ничья → sudden death / first next point score).

**Риск DM:** боты убивают друг друга → случайный бот может выиграть. Это **нормально** для offline DM и создаёт давление «не отставать». Альтернатива hard: только player может win — **не рекомендую** (ломает ощущение честного FFA).

---

## 5. Карты и режимы

| Карта | DM | TDM | CP |
|-------|----|-----|-----|
| factory | ✅ (edge empty ring — FFA ок) | ✅ нужны team bases | ⚠ точки ближе к center content |
| village | ✅ | ✅ opposite village edges | ✅ plaza + 2 flanks |
| city | ✅ | ✅ avenue ends | ✅ plaza + 2 districts |

Все 3 режима на всех картах v1 — **да**, если spawns/points per map заданы.

---

## 6. Фазы реализации (когда дойдём до кода)

Порядок важен — не начинать с CP.

| Phase | Scope | Зависимости |
|-------|-------|-------------|
| **P0** ✅ | Удалить wave loop, buffs, intermission, wave score | DONE — `BotRoster`, no WavesStage |
| **P1** ✅ | Match framework: `MatchModeId`, roster, teams, respawn, match end | DONE — `MatchRuntime`, default DM |
| **P2** ✅ | Deathmatch multi-target FFA AI | DONE — `pickAiFocus` + sticky |
| **P3** ✅ | Team Deathmatch + friendly fire off + team HUD + ModeSelect | DONE — `ModeSelect`, team HUD, TDM playable |
| **P4** ✅ | Capture zones + scoring tick + minimap markers | DONE — `captureLogic`, markers, HUD chips |
| **P5** ✅ | CP objective AI | DONE — `aiObjective` + `moveHint` |
| **P6** ✅ | Results screen polish, balance pass | DONE — results UI, rematch, TDM 75 |

Тесты: unit на win conditions, capture progress, `isEnemy`, respawn timers; e2e-ish simulation ticks.

---

## 7. Open questions — resolved

Все «да» / recommendations accepted. Difficulty = **Normal**. See locked decisions above.

---

## 8. Acceptance

- [x] В меню нельзя запустить «волну»; доступны DM / TDM / CP.
- [x] Смерть игрока → respawn, матч продолжается.
- [x] DM: при 30 kills любого участника — end + winner.
- [x] TDM: team kills 100 → end; allies не дамажатся.
- [x] CP: A/B/C нейтральны; capture → +1/s; 1000 → end.
- [x] На minimap/HUD видны scores и ownership точек.
- [x] WaveManager / WaveIntermission / wave buffs не участвуют в match loop.
- [x] GDD Approved: [[Match_Framework]], [[Team_Deathmatch]], [[Capture_Point]].
- [x] CP objective AI (P5).
- [x] Results polish + rematch + balance (P6).

---

## 9. Design rationale (кратко)

Идея режимов **сильная и каноничная** для танкового arena-шутера. Главный сдвиг не в числах 30/100/1000, а в **инфраструктуре матча**: teams, respawn, multi-target AI, win conditions, UI выбора режима. CP — самый дорогой (level anchors + zone sim + objective AI); DM/TDM дают 80% нового фан-лупа дешевле.

Рекомендация GD: **утвердить intent + open questions → P0–P2 сначала (убрать волны + DM)**, затем TDM, затем CP.
