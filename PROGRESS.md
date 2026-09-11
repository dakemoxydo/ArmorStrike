# ArmorStrike — Progress Log

Loop log for the /loop-driven autonomous improvement agent. One entry per iteration.

> **2026-09-10 cleanup:** `graphify/` (code-graph tooling + `graphify-out/`), `AUTONOMOUS_PROMPT.md`,
> and `audit.md` were removed from the project — process overhead outweighed value at this codebase
> size. Historical entries below that mention them refer to files that no longer exist. Findings
> F-1…F-4 / H-1…H-5 from the removed audit were all fixed and are covered by regression tests.

## Baseline (recorded 2026-08-24, iter #1)

| Gate | Expected | Actual |
|---|---|---|
| `npm run typecheck` | clean | ✅ clean |
| `npm run lint` | clean | ✅ clean |
| `npm test` | 41 files, 183/183 | ✅ **43 files, 196/196** (~2.4 s) |
| `npm run build` | succeeds | ✅ `dist/index.html` = **1,097,013 B** (gzip ≈ 301.64 kB) |

Notes: test count grew vs the documented baseline (43 files / 196 tests) — audit-fix commits
added regression tests (zoneViewCache, aiFocus). No action needed; baseline recorded at actuals.
Audit findings F-1…F-4 and H-1…H-5 were all FIXED — treated as closed (audit.md removed 2026-09-10).

---

## Iteration 18 — 2026-09-11 · [H] HULLS — SPEEDY (НОВЫЙ ЛЁГКИЙ КОРПУС)

**Task (player request):** «Добавь такой корпус в игру. Это легковесный быстрый
корпус. Назови его Speedy. Сделай его таким же красивым и low poly как на фото»
(референс: низкий плоский корпус, зелёная палуба с большим кольцом башни,
тёмный борт с окнами вентиляции, световая полоса на носу).

**Scope:** не правка существующего корпуса, а четвёртая запись каталога —
`HullId` расширен до `'hunter' | 'viking' | 'mammoth' | 'speedy'`. Из этого
следует 4 × 3 = 12 loadout'ов вместо 9.

**Implementation:**
- **`catalogTypes.ts` / `catalogData.ts`:** `HullId` + `HULLS.speedy`
  (HP 70, speed 23.5, reverse 14.5, turn 4.4) — самый быстрый и самый хрупкий
  корпус; занимает пустую нишу «перехватчик», не отбирая роль у `viking`.
- **`tank/TankConfig.ts`:** `HULL_CONFIG.speedy = { type: 'code' }`,
  `HULL_TURRET_Y.speedy = 1.46` (верх кольца башни 1.51).
- **`tank/hull.ts` → `buildSpeedy`:** плоский «слэд» — палуба с приподнятыми
  бортовыми рейлингами, одно большое кольцо башни с болтовым рядом, длинный
  клин лобовой детали (`slope(0, 1.11, 1.805, 0.598)`) с навесной плитой,
  рядом болтов и световой полосой на носу, **тёмный борт-понтон** (слот
  `metal`) с 4 окнами вентиляции и двумя рейками, ступенчатая кормовая палуба
  с жалюзи/люком/барабаном, наклонные выхлопы с теплозащитой, 5 катков.
  Габариты 4,70 × 3,69 × 1,62 — самый низкий и самый узкий корпус в наборе;
  7001 вершина (бюджет 1000–20000).
- **Осознанное исключение из правила §2 «не отдавать крупную площадь под
  `metal`»:** борт-понтон — крупная *масса* без мелкой детали, и именно
  двухцветность (тёмный низ / камо-верх) даёт силуэт с референса. Проверено
  превью в обеих палитрах (player + bot). Зафиксировано в
  `Docs/Architecture/Standard_Hull_Models.md` §5.
- **`components/Garage.tsx`:** сетка корпусов `sm:grid-cols-3` → `grid-cols-2
  lg:grid-cols-4` (4 карточки в ряд, 2×2 на узких экранах).
  **`components/HullCard.tsx`:** шкала скорости `/20` → `/24`, иначе 23.5
  вылезала за 100 %.
- **`scripts/hull-preview.ts`:** `speedy` добавлен в список рендера.

**Tests (контракты обновлены, не ослаблены):**
- `hullGeometry.test.ts` → `keeps the hulls distinct: speedy lowest, mammoth
  widest and tallest`: лестница высот `speedy < viking < hunter < mammoth` и
  `speedy.x < hunter.x`.
- `botDutyTable.test.ts`: роли задаёт цикл турелей (3), корпуса — цикл каталога
  (4), пара повторяется с периодом 12. Золотая таблица переписана на 12 позиций;
  теперь свапы-предохранители в `makeBot` **реально срабатывают** (i=9
  sniper+viking→hunter, i=10 assault+mammoth→viking) — раньше при трёх корпусах
  они были инертны. Добавлен пин `expect(HULL_IDS).toEqual([...])`.
- `Garage.test.tsx` не потребовал правок (проверяет пары, а не количество карточек).

**Verification:** `npm run typecheck` clean; `npm run lint` clean;
`npm test` — **60 files, 345/345**. Превью:
`npx vite-node scripts/hull-preview.ts railgun player|bot` и `… cannon player`.
Живой кадр гаража снят через headless Edge + CDP (меню → гараж → карточка
Speedy → драг/колесо): корпус читается в игре, паспорт показывает 70 HP / 23.5.

**Docs:** `Tank_Movement.md` (строка таблицы корпусов), `Garage_Loadout.md`
(4 × 3 = 12), `Standard_Hull_Models.md` (бюджет, габариты, дизайн, исключение
по `metal`, заодно исправлена устаревшая колонка draw calls: railgun 13, не 11).

---

## Iteration 17 — 2026-09-11 · [I] LEVELS — VILLAGE: РЕСБИЛД + СВОИ ТЕКСТУРЫ

**Task (player request):** «Проанализируй игровую карту Деревня. Улучши её. Сделай её
красивее и интереснее в геймплейном плане и более приятной для игры. Так же в карте
Деревня используются текстуры и ассеты из карты Завод, замени их на новые».

**Diagnosis (contract-тест вместо догадок):** первым делом написан
`src/__tests__/villageMap.test.ts` — до этого у деревни контракт-теста не было вовсе
(был только factory). Он сразу нашёл 7 нарушений:
- колодец `(0,0)` — hard cover **в центре креста**, в центре площади и **внутри CP-A**;
- hard wood-piles `(0,46)`/`(0,−48)` — поперёк N-S магистрали;
- деревья/рампы на оси спавна `(0,±110..116)`;
- **ряды домов стояли прямо в спавн-аппронах команд** (z ±84…96) — боты спавнились в домах;
- CP B/C стояли вплотную к домам (distTo < 9 м) → точки неоспоримы.

Плюс деревня тянула **заводские ассеты**: `crateTexture` (сено с hazard-шевронами и
болтами), `barrelTexture` (бочки «FUEL-51»), `hexTexture` (cyan-сетка неба), а периметр —
общий industrial `wallTexture`.

**Implementation:**
- **Новый модуль `src/game/textures/village.ts`** — 9 village-native фабрик: plaster,
  plank, thatch, shingle, hayBale, oakBarrel, fieldstone, duskGlow, villageWall. Все через
  `cachedTexture` (process-lifetime), ключ по тону. `villageMap.ts` больше не импортирует
  ни одной заводской текстуры.
- **Оболочка расширена опционально:** `ArenaShellTheme.wallMap` (периметр-фахверк) и
  `signStyle: 'tech'|'rural'` (painted-wood вывески). Factory/City не тронуты — defaults.
- **Новый контент:** часовня с колокольней (nave + buttresses + витражи + роза + качающийся
  колокол + флюгер) — самый высокий лендмарк; фруктовый сад (9 instanced деревьев);
  пруд с мостками, лодкой, камышами и лилиями; 6 скирд; гирлянды над площадью; 220 цветов;
  телега; указатель; каменная колода у колодца; skyline-хиллсы.
- **Геймплей-фиксы:** колодец перенесён на `(−16,30)` (у края площади, вне креста/CP-A);
  wood-piles → фланги `(±24,±46)`; «крылья» заборов вместо забора поперёк креста; дома
  пересажены на mid-ring r≈58–72 вне аппронов; деревья/рампы убраны с осей спавна;
  **якоря CP: A (0,4) · B (−100,20) · C (100,−20)** — каждый в ~20 м чистом поле.
- **Ground** перерисован под новый layout: CP-кольца, churchyard, пруд, сад, тропы к
  лендмаркам, поля вынесены из аппронов, лужи, подписи.
- **Draw-call:** деревья и бочки переведены на instancing — 20 деревьев = 4 draw вместо 80.

**Metrics:** tests 59 файлов/332 → **60/345** (+13, `villageMap.test.ts`); typecheck/lint
clean; census village **843 → 800** draw calls (34 instanced группы) при заметно большем
контенте; factory 538→536, city 751→750 (нулевой регресс). Визуально проверено
headless-скриншотами (top/square/chapel/pond/windmill) через временный preview-харнесс,
затем харнесс удалён.

**Next:** [I] пересмотреть баланс `PROJECTILE.range=85` / AI `sightRange=46` под 300-арену
(Known gap #1 в `Maps.md`) — деревня теперь самая «длинная» карта по дистанциям.

### Micro-reflection (iter 17)
- Moved forward? Yes — деревня стала самостоятельной по ассетам и перестала ломать спавны/CP.
- Time lost? Два `Edit` подряд по одному региону `shell.ts` применились частично (импорт
  пропал) — поймал typecheck. Уже занесено в «грабли» `Standard_Arena_Level_Design.md`.
- Highest-leverage next task: contract-тесты для City (единственная карта без своего теста).

---

## Iteration 16 — 2026-09-11 · [I] LEVELS — FACTORY: ПОЛНАЯ ПЕРЕСБОРКА НА 300×300

**Task (player request):** «Проанализируй игровую карту Завод. Улучши её. Сделай её
красивее и удобнее для стрельбы и более приятной для игры».

**Diagnosis:** Factory была последней картой, собранной из legacy-модулей (mid-July),
рассчитанных на ~±75 из 300 — на 300-арене оставался «остров» в центре с пустым outer
ring. Это был явный Known gap #1 в `Maps.md` («Factory reskin/scale is a separate task»),
а `constants.ts` даже фиксировал «factory — центр». Village/City уже прошли полную
пересборку на 300 — Factory оставалась недоделанной.

**Implementation:**
- **`factoryMap.ts` переписан с нуля** — self-contained builder (~1090 строк) в стиле
  `cityMap`/`villageMap`, 11 legacy-модулей удалены (`centralHall`, `containerYard`,
  `foundry`, `gantryCrane`, `pipeRack`, `ramps`, `scattered`, `silos`, `smokestacks`,
  `transformers`, `atmosphere`).
- **Документированный layout graph:** крест магистралей x/z ∈ [−13,13] (hard cover
  запрещён), плаза |x|,|z| < 30 свободна (hard запрещён внутри 34), ring road 34–46
  (только soft), outer corridor 96–140, spawn aprons держатся свободными.
- **4 district'а:** NW foundry (домна + вторая печь + ladle-house + литейный цех +
  рудный конвейер), NE container terminal (ряды/штабели контейнеров, силосы),
  SW assembly/pipe (2 цеха + pipe-rack), SE power/tank farm (4 цистерны + 2 градирни).
- **Центр:** портальный кран (4 ноги `(±36,±16)` `legH=13` + cap-beams + анимированный
  троллей) и holo beacon над CP-B; рельсы z=±16 проходят мимо CP-A (z 8) / CP-C (z −6).
- **Outer ring:** 4 диагональных storage-пада, угловые дымовые трубы, 8 edge-мачт,
  rail siding (flush, без коллайдера), mid-ring peek-укрытия.
- **Skyline вынесен за playable box:** 34 башни r ∈ [172,244] (было 26 × r 105–150 —
  «приземлялись» внутрь арены), газ-сфера `(−232,12,−196)`.
- **Отдельный атмосферный пресет `FACTORY`** (натриевая смога-ночь: bg `0x0d0b08`,
  exposure 0.95, тёплый sun/hemi/rim) — factory больше не алиасит city-NIGHT.
- **`factoryGroundTexture` перерисован** под новый layout, S 2048→3072, через
  `cachedGround('ground:factory', …)` (LRU-1).
- **Побочный фикс реального бага:** `ArenaEffects` хардкодил float обелиска `y = 12.6`,
  из-за чего City-монумент (поставлен на y=9.1) каждый кадр уезжал на +3.5 м. Теперь
  базовая высота захватывается в `setObelisk` и анимация идёт относительно неё.
- **Разблокирован `npm run census`** — `vite-node` больше не транзитивная зависимость
  vitest 4; добавлен devDependency через системный npm 11.19 (`lockfileVersion: 3`
  сохранён, `npm ci --dry-run` под managed npm 10 проходит).
- **Новый инструмент `scripts/map-plan.ts`** (`npm run map-plan`) — headless top-down
  план из реальных коллайдеров (SVG+HTML, тиры, зоны, спавны, плотность по квадрантам).
  3D-скриншот на этой машине невозможен (нет browser automation на Windows) — план
  даёт проверяемую геометрию вместо него.

**Metrics:**
- Census: factory **540** est. draw calls (mesh 534, points 2, instanced 4×69) —
  легче village 843 / city 754, при том что контент теперь на всей арене.
- Plan: **133** коллайдера — hard 58 · medium 4 · soft 39 · ramps 8 · perimeter 24;
  квадранты NW 14H/6S · NE 13H/12S · SW 16H/11S · SE 15H/10S (сбалансировано).
- Тесты: +1 файл `factoryMap.test.ts` (13) — контракт layout'а (крест/плаза/CP/spawns/
  покрытие квадрантов/раммы non-blocking); `skylineKit`/`atmospherePresets` пины
  обновлены. Итого **332/332** (59 файлов).

**Gates:** typecheck clean, lint clean, **332/332** tests (59 files), build ✓
`dist/index.html` = 1,141.02 kB (gzip 314.81 kB).

**Docs:** новый [[Factory_Level_Design]]; `00_Index.md` + `Maps.md` обновлены (Known gap
#1 «Factory empty ring» закрыт); `mapCatalog` blurb; `constants.ts` комментарий.

**Next:** [I1] spawn fairness metrics per map (план-данные уже есть — использовать
`npm run map-plan`), либо [E2] nameplate readability.

### Micro-reflection (iter 16)
- Moved forward? Yes — последняя недоделанная карта доведена до стандарта village/city;
  заодно найден и закрыт живой баг City (float обелиска) и разблокирован census-инструмент.
- Time lost? Несколько Edit'ов молча не применились (повторное использование `old_string`
  по уже изменённому региону) — ловились чтением диапазона; вывод: после серии правок
  перечитывать целевые строки, а не доверять успешному ответу.
- Highest-leverage next task: I1 (spawn fairness) — теперь есть готовый инструмент плана.

---

## Iteration 15 — 2026-09-10 · [D] ENEMY AI — КАДЕНЦИЯ БОТОВ: ПАДЫ РЕАЛЬНЫЕ (решение игрока по iter-14 question)

**Task:** D2 design-question resolved by player: «Пады реальные» — railgun/flamer
боты должны стрелять медленнее игрока, как задокументировано интентом.

**Implementation (zero weapon-code changes — существующий шов wave-баффов):**
- `aiRoles.firePadForRole` — единый источник пада (standard 1.2 / assault 1.15 /
  sniper 1.35); `BOT_NORMAL.shotCooldownScale` удалён (последний потребитель переехал).
- `rosterSpawn.makeBot`: standard → `shotCooldownScale = firePad` (межвыстрел пушки,
  поведение НЕ изменилось — было 1.2); sniper/assault → `bot.reloadSpeedMul = 1/firePad`
  (новое: реальный пад через `ownerReloadMul`, который уже протащен во все 3 оружия —
  charge+reload рельсы, восстановление батареи огнемёта, полная перезарядка пушки).
  Расход батареи огнемёта не пада; стандарт-боты mul не получают — их полная
  перезарядка магазина как у игрока.
- Shipped-числа: рельса-бот reload **4.8→6.48 с**, charge **1.1→1.485 с**;
  огнемёт-бот батарея **22→19.13/с**; пушечный бот 0.336 с (без изменений).
- Тесты: `reloadMul.test.ts` (+4 — шов: fallback/значение/бот-числа), `aiRoles.test.ts`
  (пады firePadForRole + shipped-числа; старый тест инертности пада заменён).
  GDD AI_Bots.md: параграф каденции переписан под новое состояние.

**Процесс-урок:** edit matchConfig оборвался внутри объекта (`old_string` кончился
на середине литерала → дублированный хвост) — пойман typecheck-гейтом до коммита,
исправлен сразу. Закрывать `old_string` на границе конструкции.

**Gates:** typecheck/lint clean, **250/250** tests (51 files, +5), build ✓
`dist/index.html` = 1,111,700 B (gzip 305.01 kB; +50 B vs iter 14 — новая проводка).

**Next:** [E2] nameplate readability (round-robin).

### Micro-reflection (iter 15)
- Moved forward? Yes — дизайн-долг D2 закрыт решением игрока; изменение минимально благодаря существующему шову `reloadSpeedMul` (наследие wave-баффов), правок оружия ноль.
- Time lost? Один сломанный edit (пойман гейтом до коммита) — минута.
- Highest-leverage next task: E2 nameplate readability.

---

## Iteration 14 — 2026-09-10 · [D] ENEMY AI — D1–D3 AUDIT (spread verified; doc drift fixed, dead export removed)

**Task:** BACKLOG D1–D3 — bot AI audit against `Docs/GDD/Approved/AI_Bots.md`.

**Method:** full code-read of `rosterSpawn` / `aiRoles` / `aiObjective` / `aiFocus` / `BotAiStage` / `AIController` / `aiCover` / `matchConfig`, GDD cross-check, then golden-table tests pinning the verified state.

**D1 (duty distribution) — matches GDD, now pinned:** `botDutyTable.test.ts`
- DM (7 ботов): {sniper 3 / assault 2 / standard 2}; duty-флаг 4/7 — инертен вне CP
  (пин поведенчески: BotAiStage с duty-ботом в DM получает moveHint=null, в CP — центр зоны).
- TDM/CP: alpha 2/4 = 50%, bravo 3/5 = 60% — обе внутри GDD band 40–60% (bravo на краю).
- Elite не спавнится: gate `roleWave=1` запинен (рост roleWave ≥3 открыл бы elite на индексе 0).
- Корпус когерентен роли при текущем порядке каталога: sniper→hunter, assault→viking,
  standard→mammoth (свапы в makeBot — защита от смены порядка, сейчас инертны).

**D2 (difficulty spread) — реален; находка: инертные cooldown-пады:**
- Разброс запинен точной таблицей GDD: aggro sniper 0.22 < standard U[0.35,0.75] < assault 0.95
  (без пересечений), aimError × 0.5/1.15/0.65/1.0, cover HP 0.5/0.4/0.35/0.35, persona
  aggro/lead по GDD; эффективный aimError 0.05/0.10/0.115 сохраняет порядок ролей.
- **Находка (intent-vs-reality, БЕЗ изменения баланса):** role cooldown pads
  (sniper ×1.35, assault ×1.15 в rosterSpawn) инертны — у railgun/flamer
  `TURRET.shotCooldown = 0`, каденция weapon-internal (charge/reload / energy).
  Реально медленнее игрока только cannon-класс (standard, ×1.2 → 0.336 с vs 0.28).
  Комментарий matchConfig «Role-independent cooldown pad» был неверен дважды
  (пады role-зависимы И действуют только на пушку) — исправлен; факт в GDD.
  **Открытый design-вопрос игроку:** нужны ли пад каденции railgun/flamer ботам?
- Standard react U[0.13, 0.43] перекрывает sniper 0.168 на 12% диапазона — by-design
  random persona, задокументировано в тесте.

**D3 (cover vs weapon classes) — когерентно, класс-уместность эмерджентна:**
- Поиск класс-нейтрален (default радиус 42 ≤ sight 46, stand-off 3.4, scoring
  сам-относительный `80 − distSelf − travel·0.35 + losBlocked·45`) — класс-уместность
  возникает сама через preferredRange: flamer (~8) прячет у боя, railgun-снайпер (~46)
  далеко. Per-class тюнинг не нужен.
- **Мёртвый экспорт удалён:** `AI_LOW_HP_FRAC` (wave-era, жил только в собственном
  тесте — ts-prune слепой к «тест-прокормленным» символам) противоречил живым
  порогам `coverHpFracForRole` (0.5/0.4/0.35). Убран вместе с тестом константы.
- 4 новых контрактных теста: радиус поиска vs sight, brawler-геометрия (LOS порван,
  точка у боя), sniper-геометрия (укрытие далеко), ближнее-выигрывает scoring.

**Fixes:** aiCover.ts (−экспорт, +док-комментарий контракта), matchConfig.ts + rosterSpawn.ts
(комментарии), AI_Bots.md (cooldown-pad факт + cover контракт/rationale), тесты +17
(aiCover 4→7, aiRoles 6→13, botDutyTable +7).

**Gates:** typecheck/lint clean, **245/245** tests (50 files), build ✓
`dist/index.html` = 1,111,650 B (gzip 304.96 kB) — правки аудита это комментарии/тесты,
дельта бандла ≈ 0 (рост vs iter-13 baseline 1,097 kB — из уже shipped коммитов
8edf36b/de14375).

**Next:** [E2] nameplate readability (round-robin), + решение игрока по design-вопросу
cadence-pad'ов railgun/flamer ботов.

### Micro-reflection (iter 14)
- Moved forward? Yes — таблица-тест поймала intent-vs-reality разрыв (инертные пады), который прошёл бы мимо чистой проверки значений разброса.
- Time lost? Нет.
- Highest-leverage next task: E2 nameplate readability — следующий пункт round-robin.

---

## Iteration 13 — 2026-08-24 · [E] RENDERING — E1 ATMOSPHERE AUDIT + GDD DRIFT FIX

**Task:** BACKLOG E1 — atmosphere-preset gap check across maps.

**Audit result:** every catalog map has a fitting preset — factory/city share the legacy
cold-night NIGHT (intentional zero-regression per GDD), village uses golden-hour DUSK.
Coverage is test-enforced (`atmospherePresets.test.ts` iterates MAP_IDS). No bare maps.

**Real finding — doc/code drift:** approved GDD `Village_Level_Design.md:19` documented
DUSK exposure **1.14**, code had **1.0**. Git archaeology: presets commit `a751231`
(Jul 19) introduced 1.14 matching the GDD; the global tone-mapping retune `14478e1`
(Jul 24) lowered NIGHT 1.08→0.92 and DUSK 1.14→1.0 and synced other GDD files but missed
this line. Code was intentional; the doc line was stale residue (AGENTS.md rule: user
says GDD wins over code EXCEPT when GDD is outdated — here history proved the doc stale).

**Fixes:**
- GDD line updated to exposure 1.0.
- New test pins absolute exposures (factory/city 0.92, village 1.0) so future drift in
  either direction fails loudly instead of hiding behind relative-only assertions
  (`v.exposure > f.exposure` passed throughout the drift window).
- E1 closed: no missing presets; drift reconciled.

**Gates:** typecheck/lint clean, 215/215 tests (+1), build ✓ bundle unchanged at
1,097,159 B. Commits: `0b6feed`, graph `ff9e44a`.

**Next:** [C1] capture contest/decay math vs Capture_Point.md (remaining half), then [D1]
bot duty distribution table-test.

### Micro-reflection (iter 13)
- Moved forward? Yes — caught real GDD drift the relative assertions were blind to; audit class (doc-vs-code) now proven valuable.
- Time lost? No.
- Highest-leverage next task: C1 remainder — same audit method on capture math.

---

## Iteration 12 — 2026-08-24 · [A] STABILITY — A4 TEARDOWN AUDIT (clean, one hardening note)

**Task:** BACKLOG A4 — audit teardown path (`Game.teardownContext` / StrictMode unmount guard).

**Verified chain (all code-read):**
- App boot guard (`App.tsx:48–105`): `cancelled` flag + `instance.dispose()` if unmount
  wins the race against `Game.create`; cleanup disposes `g`.
- Double-boot guard: `Game.boot()` checks `this.disposed` after async bootstrap and
  tears down the fresh ctx instead of adopting it; `Game.create` throws
  'disposed during bootstrap' — no zombie loop.
- `teardownContext` order is sound: gameLoop.stop → window/document listeners removed →
  garageInput/input detach → audio engine ramp-down → clearTanks → projectiles/effects/
  arena dispose → preview dispose (async-safe via buildSeq bump; in-flight rebuild drops
  its result) → renderWorld.dispose (incl. composer). Asset cache deliberately survives
  (process-level, documented inline).
- PlayerController.detach removes every attach-time listener incl. dom-scoped ones.

**Findings:**
1. **No leak:** all listeners/timers accounted for. `hudSink.current` closure is per-ctx;
   a stale sink from a torn-down ctx can only fire while its own GameLoop lives, and
   stop() precedes everything else.
2. **Theoretical only (NOT fixed):** post-dispose calls to public API
   (`setMode`/`startRound`/`getHud`) would throw via requireSim/requireModes rather than
   no-op — React never does this today (state cleared with the instance), so adding
   guards now would be speculative surface. Noted for API consumers outside App.tsx.
3. `PreviewController.dispose` bumps buildSeq before clearing — in-flight rebuild cannot
   resurrect meshes post-teardown (verified rebuild()'s seq check).

Verdict: teardown path CLEAN. Gates: 214/214 tests. No code change; A4 closed as audited-clean.
Commits follow (docs log + graph sync).

**Next:** [E1] atmosphere preset gap check across maps, then [C1] capture math vs GDD (remainder).

### Micro-reflection (iter 12)
- Moved forward? Yes — last unverified lifecycle path confirmed sound with evidence.
- Time lost? No.
- Highest-leverage next task: E1 — cheap content-polish check with screenshot-verifiable output.

---

## Iteration 11 — 2026-08-24 · [K] ACCESSIBILITY & POLISH — K1 PRESET MATRIX

**Task:** BACKLOG K1 — document graphics preset matrix and fill parity gaps.

**Evidence gathered first (all code-verified):**
- Presets (`graphicsQuality.ts`): pixelRatioMax 1/1.5/2 · shadowMapSize 512/1024/2048 ·
  `shadows: true` on ALL tiers (only resolution scales) · bloom only on high.
- Application: `RenderWorld.applyQuality` — bloom dispose-on-downgrade / fresh-composer-
  on-return (covered by iter 2 tests); shadow map dispose when size changes.
- Frame-path gate: `ArenaEffects.update` skips decorative beacon/furnace/molten animations
  on low; quality read from in-memory RenderWorld getter, never localStorage per frame.
- Non-scaling dimensions documented explicitly: particle pools are fixed budgets
  (smoke ≤44, sparks 800, flame 160, wrecks ≤6); MSAA fixed at renderer creation
  (`antialias: preset !== 'low'`, no runtime change).
- Switching: PauseMenu cycles low→medium→high; persisted in localStorage `as2_quality`.

**Parity gaps found:** none requiring code change — the matrix is coherent; the "gaps"
(unchanged particle budgets, always-on shadows) are deliberate design choices, now
documented as such rather than left implicit.

**Output:** `Docs/Architecture/Graphics_Presets_Matrix.md` + Core.md index row.
Gates: 214/214 tests. Commits: `90f0cd9`, graph `e4db1a3`. K1 closed.

**Next:** [A4] teardown-path audit (Game.teardownContext / StrictMode guard), then [E1]
atmosphere preset gap check.

### Micro-reflection (iter 11)
- Moved forward? Yes — implicit design decisions became explicit documentation.
- Time lost? No.
- Highest-leverage next task: A4 teardown audit — last unverified lifecycle path.

---

## Iteration 10 — 2026-08-24 · [B] PERFORMANCE — BUNDLE CENSUS (B4)

**Task:** BACKLOG B4 — identify largest contributors inside the dist single-file bundle.

**Method:** vite-bundle-visualizer's stats.html carries an EMPTY tree when
vite-plugin-singlefile inlines everything (no per-module data) — fell back to a
sourcemap census: `npm run build -- --sourcemap`, then per-source gzipped size
from `sourcesContent` in dist/*.js.map, aggregated by package. Map artifact
deleted afterwards; final `npm run build` restored clean dist.

**Findings (approx per-source gzip of 1.10 MB / 301.7 KB gz bundle):**

| Package | own-gz share | Verdict |
|---|---|---|
| three | ≈418 KB src-gz | unavoidable core; tree-shaken addons only |
| app src | ≈212 KB src-gz | villageMap/cityMap data-heavy but acceptable |
| react-dom | ≈96 KB src-gz | required by React UI |
| lucide-react | ≈16 KB src-gz | already tree-shaken (only used icons) |
| react + scheduler | ≈8 KB | required |

**Top-3 trim candidates + verdict:**
1. three (~55% incl. addons): no safe win without dropping features — SKIP.
2. App source (~28%): map-data files dominate; splitting would hurt cohesion for ~KBs — SKIP.
3. lucide-react (~5%): verify named-icon imports remain the pattern; already minimal — MONITOR.
Conclusion: current 301.7 KB gz single-file is near its practical floor for this stack;
no action justified at present risk/benefit.

**Gates:** typecheck/lint/tests untouched (no code change); build ✓ 1,097,159 B unchanged.
Tooling kept: `$LOCALAPPDATA/Temp/sourcemap-census.mjs` is throwaway; the METHOD is
documented here. B4 closed as "investigated, no trim action justified".

**Next:** [K1] graphics preset matrix doc, then [A4] teardown audit.

### Micro-reflection (iter 10)
- Moved forward? Yes — negative result with numbers prevents future speculative bundling work.
- Time lost? Two dead ends (empty visualizer tree; heredoc escaping). Probe artifact formats before parsing them.
- Highest-leverage next task: K1 preset matrix (small doc closing an audit gap).

---

## Iteration 9 — 2026-08-24 · [A]+[C] LIFECYCLE TEST + REGEN AUDIT

**Tasks:** BACKLOG A3 (match-lifecycle reset sequence test) + partial C1 (regen math vs GDD).

**C1 (partial):** `TankCombatTimersSystem.updateOne` regen matches
`Docs/GDD/Approved/Health_And_Regen.md` exactly — HEAL_DELAY=10, HEAL_PER_SEC=3.5,
threshold+clamp identical to the GDD pseudocode; SMOKE_HEALTH_FRAC=0.32 also per GDD.
Full C1 (capture contest/decay) remains open.

**A3:** new `src/__tests__/gameModeLifecycle.test.ts` (3 tests) pins the full
`executeStartRound` reset chain: clearTanks → projectiles.clear → arena.rebuild(mapId) →
onArenaRebuilt → run.resetRun (score/kills zeroed) → deathT=-1 → prevReloading=false →
combat.resetStreaks → match.reset(mode, mapId), plus ORDERING (rebuild before resets,
resets before roster) and repeat-start re-running every reset. Uses real async
startSeq/startChain queue; spawnMatchRoster module-mocked. Harness notes: sim stub needs
audio.startEngine/click and the bots holder (`sim.bots.bots`) — read the full consumer
before stubbing.

**Result:** 211→214 tests (+3). Gates: typecheck/lint clean, build ✓ bundle unchanged at
1,097,159 B. Commits: `1b750b3`, graph `57c5bb7`. A3 closed.

**Next:** [B4] bundle census (top-3 trim candidates from build output), then [K1] preset matrix doc.

### Micro-reflection (iter 9)
- Moved forward? Yes — controller-level regression guard for the highest-severity bug class.
- Time lost? Two harness gaps in one stub; enumerate every dep method before first run.
- Highest-leverage next task: B4 bundle census — quantified trim candidates.

---

## Iteration 8 — 2026-08-24 · [J] CODE QUALITY

**Task:** BACKLOG J3 — dead-export scan after the perf passes.

**Method:** `npx -y ts-prune -p tsconfig.json` (ephemeral, no package.json dep). Filtered
`(used in module)` type-only re-export noise and barrel false positives, then verified each
remaining candidate with repo-wide reference searches INCLUDING tests and Docs.

**Removed (4):** `groundTexture()` legacy base ground (~40 lines canvas code; maps use
per-map variants) · `BuffableTank` interface + orphaned `BuffBaseSnapshot` import ·
`TankMatchStats` interface · `invalidateSolidColliderCache` re-export in PhysicsSystem
(Arena imports the leaf; GDD Maps.md documents only the leaf path).

**Kept deliberately:** `assetUrl`/`applyMaterialToModel` — documented dormant GLTF pipeline
(`MODELS_ENABLED=false`, comments explicitly say "kept for re-enabling"); all textures
barrel exports verified live.

**Fallout handling:** two TS6133 unused-import errors after deletion (expected), fixed in
same iteration. Gates: typecheck/lint clean, 211/211 tests, bundle unchanged at 1,097,159 B
(tree-shaking had already excluded dead code — hygiene win, not bundle win).
Commits: `0d66c54` (−67 lines net), graph `5f10300`.

**Next:** [A3] match-lifecycle reset test (cross-mode state), then [B4] bundle census.

### Micro-reflection (iter 8)
- Moved forward? Yes — source surface shrank; every removal individually justified.
- Time lost? One patch misfired (old_string matched wrong block in matchTypes.ts) — caught and repaired immediately; keep patches tightly scoped.
- Highest-leverage next task: A3 lifecycle test guards the F-4/A2 class from regressing.

---

## Iteration 7 — 2026-08-24 · [B2]+[J4] RESOURCES AUDIT + ARCHITECTURE DOC

**Tasks:** BACKLOG B2 (texture memoization coverage) + J4 (architecture docs for
texture-memoization + zoneViewCache patterns). B1c (city instancing) deferred — see note.

**B1c deferral rationale:** city's 607 remaining boxes split into (a) destructible props
(jersey/cars/planters/kiosks) where per-instance materials are FUNCTIONAL — damage-flash
collects each block's own materials via traverse, merging would break flash/tilt; and
(b) unique-sized buildings where only geometry-baking (BufferGeometryUtils.mergeGeometries)
would pay off — a multi-file visual rewrite while screenshot verification is degraded
(vision_analyze 401) is not a safe autonomous trade. Revisit when visual verification works.

**B2 — full coverage confirmed.** All factories under `src/game/textures/*`
(crates/effects/ground/signs/walls/tank) route through `cachedTexture`; keys include all
draw params; ground uses documented LRU-1 eviction (`ground:last` ↔ `ground:<map>:<size>`).
Only direct `new THREE.CanvasTexture` sites are per-instance lifecycles with explicit
dispose: nameplate.ts, match/CaptureMarkers.ts — correctly NOT memoized. Registry already
tested by `textureCache.test.ts`. No stragglers.

**J4 — new doc:** `Docs/Architecture/Standard_Resources.md` — cachedTexture/markShared
ownership rules (5 rules incl. LRU-1 policy + the "no direct CanvasTexture in shared
factories" boundary), zoneViewCache anchor-scalar invalidation contract (F-1 lesson),
census-first instancing workflow with measured numbers. Indexed in Core.md standards table.
Content limited to code-verifiable facts. Gates: 211/211 tests.
**Next:** [J3] dead-export scan after perf passes, or [A3] match-lifecycle reset test.

### Micro-reflection (iter 7)
- Moved forward? Yes — audit closed with evidence + patterns documented for future sessions.
- Time lost? No; B1c deferral was deliberate scope protection, not drift.
- Highest-leverage next task: J3 dead-export scan (cheap, quantifiable).

---

## Iteration 6 — 2026-08-24 · [A]+[B] AUDITS (both clean)

**Tasks:** BACKLOG A1 (F-1-class cache sweep) + B3 (HudModel render-pressure check).

**A1 — no remaining F-1-class caches.** Swept `.length !==/===`, `_last*`, `cached*`,
`_cache` across `src/game`. Every suspicious site verified sound:
- `zoneViewCache.syncZoneViews` — length check ANDed with per-anchor scalar compare.
- `CaptureController.update` — pool seeded by ARRAY IDENTITY (`_pool !== zones`),
  reset()/dispose() assign fresh arrays; steady-state in-place mutation is documented
  intended semantics (zones IS the pool).
- Remaining matches are plain empty-array guards (aiObjective, spawnPoints, winConditions,
  audio chargeOscs). No action needed.

**B3 — HudModel has zero per-frame setState.** Verified chain GameLoop.onHud (60/s,
mutated singleton snapshot) → useGameHud.onHud: continuous channels (health/ghost bars,
boost, reload conic-gradient, flame fill, minimap canvas) are direct ref/DOM writes;
React re-render fires only through `force()` guarded by ~20 discrete comparisons
(thresholded time/team scores via Math.floor, capture-strip key, ammo gate) plus
event-driven states (feed/vignette/hitmark/streak). No action needed.

Negative results recorded deliberately (historical audit convention) to prevent re-investigation.

**Next:** [B1c] city box instancing (607 plain boxes; census-attributed hotspots at
cityMap.ts:218/175/178), then [J4] architecture docs.

### Micro-reflection (iter 6)
- Moved forward? Modestly — two items verified-closed with evidence; no code risk taken without a finding.
- Time lost? No.
- Highest-leverage next task: B1c city instancing — biggest remaining quantified perf target.

---

## Iteration 5 — 2026-08-24 · [B] PERFORMANCE

**Task:** BACKLOG B1b — instance village fence posts (follow-up from census).

**Diagnosis + plan (written before editing):**
- `buildVillageFences` (`villageMap.ts:415`): each of 14 segments spawns `max(4, len/3)`
  individual post Meshes (identical geometry + shared postMat) → 108 draw calls.
- Lifecycle verified first: per-segment destructibles → InstancedMesh must be **per segment**
  with its own BoxGeometry (destroying one fence disposes only its own geometry, never a
  sibling's); `damageBlock` flash/tilt traverses materials (InstancedMesh extends Mesh);
  `disposeObject3D` handles InstancedMesh explicitly.

**Change:** posts → one InstancedMesh per segment (setMatrixAt via dummy Object3D,
castShadow/receiveShadow preserved), following the existing foliage pattern.
**Metrics (census):** village est. draw calls **940 → 845**; plain boxes 733 → 625;
instanced 13 × 528. Gates: typecheck/lint clean, 211/211 tests, bundle 1,097,013 →
1,097,159 B (+146 B). Visual: boot capture `screenshots/iter-5-fence-instancing.png`
(689 KB — non-blank render OK; vision_analyze unavailable this session: aux-model key 401).
Commits: `4c7ff44`, helper `cd6ee46`, graph `92a9477`.

**Ops notes:** headless Edge lingers after --screenshot (hangs the chained shell) — added
`scripts/kill-headless-edge.ps1` (targets ONLY --headless processes); killing the bash
wrapper orphans vite's node child on the strict port — verify CommandLine ownership, then
Stop-Process. Port freed cleanly.

**Next:** [B1c] same instancing treatment for city block boxes (607 plain boxes left),
or [A1] length-based cache sweep for remaining F-1-class bugs.

### Micro-reflection (iter 5)
- Moved forward? Yes — first measurable perf delta landed (−95 est. DC on heaviest map).
- Time lost? Screenshot teardown ate several minutes; the new cleanup script prevents recurrence.
- Highest-leverage next task: extend instancing to city boxes — census tool makes every step verifiable.

---

## Iteration 4 — 2026-08-24 · [B] PERFORMANCE

**Task:** BACKLOG B1 — draw-call census per map.

**Diagnosis + plan (written before editing):**
- Arena props are built by `arena/*.ts` content builders via `ctx.box`/`addColliderBlock`
  wrappers; village already uses one InstancedMesh for foliage (420 instances), everything
  else is per-object meshes → draw calls scale with prop count.
- No browser APIs under `src/game/arena/` → headless census possible without WebGL.
- Plan: standalone `scripts/draw-call-census.ts` (npx tsx, zero deps) — build each map with
  real THREE + Proxy-based 2d-context stub, count Mesh/Points/Sprite/InstancedMesh, list
  repeated plain geometries, attribute plain boxes to builder functions via V8 stack sniffing.

**Results (est. draw calls, deterministic — builders have no Math.random):**

| Map | est. DC | plain boxes | top attribution |
|---|---|---|---|
| factory | 327 | 170 | shell 20, scattered 10, pipeRack 6 |
| village | **940** | **733** | fences 108 (`villageMap.ts:426`), house/barn frames ~280 (lines 122–199) |
| city | 753 | 607 | `cityMap.ts:218/175/178` (~64), plaza blocks |

Village ≈3× heavier than factory. Instancing candidates: fence rails (108 identical boxes,
single material family — ideal first target), house wall boxes, city block boxes.
Tooling lessons: wrap `Arena.prototype.box` BEFORE construction; skip Arena/ArenaBuilder
plumbing frames in stack attribution. Gates: typecheck/lint clean, 211/211 tests,
bundle unchanged at 1,097,019 B. Commits: `38171ba`, graph `2440cb0`.

**Next:** [B1 follow-up] instance village fence rails into one InstancedMesh (measurable:
expect −100+ draw calls on village), then re-run census for before/after.

### Micro-reflection (iter 4)
- Moved forward? Yes — first quantified perf baseline; the tool is reusable for every future map change.
- Time lost? Two iterations on stack-frame attribution (wrapper frame caught, plumbing frames); probe raw stacks early next time.
- Highest-leverage next task: fence-rail instancing — concrete, measurable, low-risk win on the heaviest map.

---

## Iteration 3 — 2026-08-24 · [J] CODE QUALITY

**Task:** BACKLOG J2 — unit-test ArenaEffects smoke eviction under cap pressure (last H-4 remainder).

**Diagnosis + plan (written before editing):**
- `spawnStackSmoke` (ArenaEffects.ts:67–91): reuse dead slot → else create; past 44 slots
  evict oldest (scene removal + material dispose; shared smoke map must survive).
- Tuning fact discovered: spawn cadence 0.13 s × max life 4.8 s ⇒ peak concurrency ≈37 < 44,
  so the eviction guard is defensive-only — unreachable via `update()` under current tuning.
- Plan: reachable paths through public `update()`/`resetForRebuild` with real THREE +
  canvas stub (smokeSystem.test.ts pattern); eviction driven directly via the private
  spawner (`fx['spawnStackSmoke'].call`) with SpriteMaterial.dispose spied and
  cachedTexture('smoke').dispose asserted never called. No prod-code change.

**Result:** `src/__tests__/arenaEffectsSmoke.test.ts` — 4 tests green: throttle cadence,
reuse-before-grow identity, >44 cap + oldest-evicted/material-disposed/map-alive,
reset detach/clear/respawn. Harness lesson: node vitest has NO `document` — seed the
stub from `{}` when absent (existing suite pre-seeds; new suite handles both).

**Metrics:** tests 207→211 (+4); typecheck/lint clean; bundle unchanged at 1,097,019 B.
Commits: `a215ae7` (test), graph `650525b`. **Audit H-4 coverage debt now fully closed**
(zoneViewCache, aiFocus, bloom lifecycle, smoke pool).

**Next:** [B1] draw-call census per map (first measurable perf task), or [A1] length-based
cache sweep for remaining F-1-class bugs.

### Micro-reflection (iter 3)
- Moved forward? Yes — H-4 closed entirely; eviction semantics are now pinned against tuning drift.
- Time lost? Minor: assumed jsdom-like document exists in node vitest; check environment globals before stubbing.
- Highest-leverage next task: B1 draw-call census — first task where the win is a number, not just safety.

---

## Iteration 2 — 2026-08-24 · [J] CODE QUALITY

**Task:** BACKLOG J1 — unit-test `RenderWorld.applyQuality` bloom lifecycle (audit H-4 remainder, guards the F-3 fix).

**Diagnosis + plan (written before editing):**
- The F-3 fix (dispose-on-downgrade / fresh-composer-on-return) had zero coverage; a
  regression would silently restore stale-DPI bloom or leak render targets.
- Constructor needs WebGL+PMREM → not unit-instantiable. Seam: `Object.create(RenderWorld.prototype)`
  + `Reflect.set` for private fields (`renderer`, `sun`, composer slots), `vi.mock` on the
  three postprocessing addons (recording fakes), real `graphicsQuality` presets. No prod-code change.
- Six scenarios: downgrade teardown, shadow-map resize/dispose, canvas-sized rebuild,
  full high→low→high cycle (exactly one replacement rig), repeated-high idempotence, DPR clamp ladder.

**Result:** `src/__tests__/renderWorldQuality.test.ts` — 6 tests, all green first run after
harness fixes (composer fake needed addPass; window stub owns dpr). No prod code touched.

**Metrics:** tests 201→207 (+6); typecheck/lint clean; bundle unchanged at 1,097,019 B.
Commits: `fe14685` (test), graph `e2a3ebf`.

**Next:** [J2] ArenaEffects smoke eviction under cap pressure (last H-4 remainder), or [B1]
draw-call census if J2's internals prove WebGL-bound.

### Micro-reflection (iter 2)
- Moved forward? Yes — the most regression-prone perf path now has a contract test.
- Time lost? Mock shape was incomplete (addPass) and dpr plumbing doubled up; read call sites fully before writing fakes.
- Highest-leverage next task: J2 smoke eviction, finishing the H-4 audit debt entirely.

---

## Iteration 1 — 2026-08-24 · [A] BUGS & STABILITY

**Diagnosis + plan (written before editing):**
- `KillStreakTracker.registerKill` filtered only on `currentTime - t < STREAK_WINDOW`
  (KillStreakTracker.ts:31) → negative deltas passed, so stamps from before a
  `matchTime` reset never expired.
- Production round-start is guarded by F-4's `resetStreaks()` (GameModeController.ts:120),
  but the tracker itself was still incorrect standalone; any time-reset path without the
  explicit reset inherited stale streaks (suppressed/spiked labels).
- Plan: TDD — new `src/__tests__/KillStreakTracker.test.ts` (window expiry, boundary,
  negative-delta guard, reset semantics) → RED → fix predicate → GREEN → full gates.

**Change:** filter now requires `currentTime >= t` too (KillStreakTracker.ts).
RED evidence: first new-round kill at t=1 paired with 5 stale future stamps →
spurious `{count:6, UNSTOPPABLE}`; after fix → null, then honest fresh streaks.

**Metrics:** tests 196→201 (+5); typecheck/lint clean; bundle 1,097,013 → 1,097,019 B (+6 B).
No visual change → screenshot phase N/A. Commits: `622eca3`, graph `2a7cddc`.

**Next:** [J] CODE QUALITY — J1/J2 (unit-test `applyQuality` bloom path / ArenaEffects smoke
eviction with THREE stubs), closing audit H-4 remainder; then B1 draw-call census.

### Micro-reflection (iter 1)
- Moved forward? Yes — real correctness hole closed with regression coverage.
- Time lost? One RED run failed on my own window arithmetic (strict `<4s`); re-check math before asserting.
- Highest-leverage next task: J1 (applyQuality bloom restore has zero coverage and a history of regressions).

