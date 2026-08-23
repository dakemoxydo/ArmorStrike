# ArmorStrike — Audit (ошибки и недочёты)

- **Дата:** 2026-08-23
- **База:** `main` @ `aa9689b` + незакоммиченный перф-диф в рабочем дереве (камеры, `aiFocus`, `BotAiStage`, `MatchRuntime`, `RenderWorld`, `ArenaEffects`) + регенерация `graphify-out`
- **Статус находок:** все пункты F-1…F-4 и H-1…H-5 **FIXED** (см. §6)

---

## 1. Базлайн верификации

| Ворота | Результат |
|---|---|
| `npm run test` | ✅ 41 файл, **183/183** (~2.1 c) |
| `npm run lint` | ✅ чисто |
| `npm run typecheck` | ✅ чисто |
| `npm run build` | ✅ dist/index.html ≈ 1.09 MB single-file (gzip ≈ 301 KB) |

Инвентаризация: 227 TS/TSX-файлов, ~20k строк под `src/`. Самые крупные — карта-дата `villageMap.ts` (835) и `cityMap.ts` (780), это допустимо для level-данных. Маркеров TODO/FIXME/HACK — 0.

**Вывод:** оба содержательных бага (F-1, F-2) привнесены текущим незакоммиченным перф-дифом; зелёные тесты их не ловят из-за отсутствия покрытия новых путей (см. H-4).

---

## 2. Ошибки

### F-1 · HIGH — кэш CP-зон ботов не инвалидируется при смене карты
- **Где:** `src/game/engine/stages/BotAiStage.ts:137–155` (`zonesAsView`)
- **Статус:** OPEN · внесено незакоммиченным дифом

Кэш view-объектов перестраивается только при изменении **длины** массива (`this._zoneViews.length !== zones.length`). Зон всегда 3, а `MatchRuntime.reset → CaptureController.reset → zonesForMap()` (`captureAnchors.ts:34–37`) создаёт **новые объекты зон** с координатами карты. Стадии симуляции живут столько же, сколько `GameSimulation` (`clearTanks` их не пересоздаёт), поэтому после перехода factory → village боты с `objectiveDuty` навсегда идут к точкам **предыдущей** карты: свежими копируются только `owner`/`contested`, а `x/z/radius` остаются от старого кэша.

- **Фикс:** инвалидировать по ссылке исходного массива (`zones !== this._zoneSrc` → rebuild) — ссылка гарантированно новая после каждого `CaptureController.reset`.
- **Тест:** unit на `zonesAsView`-семантику через `BotAiStage` (или извлечь кэш в pure-хелпер) — «после reset с другим mapId координаты view совпадают с новыми зонами».

### F-2 · MEDIUM — регрессия семантики `canSee` у sticky-цели в `pickAiFocus`
- **Где:** `src/game/match/aiFocus.ts:88–99`
- **Статус:** OPEN · внесено незакоммиченным дифом

Старый код считал LoS для каждой цели и возвращал собственный рейкаст sticky-цели (`canSee: sticky.see`). Новый возвращает `visible === sticky`, т.е. «sticky — ближайший **видимый**». Сценарий: sticky-цель видима, но есть другой видимый враг ближе (в пределах slack) → функция отвечает `canSee=false` при чистой линии огня на sticky.

**Уточнение импакта:** единственный продовый вызов — `BotAiStage.aiFocusForBot` (`BotAiStage.ts:120`) деструктурирует только `{ target }`, а `AIController` сам делает свой рейкаст к фокусу (`AI.ts:145–158`). Поэтому сегодня это **не геймплейный баг, а регрессия контракта публичной pure-функции**: любой будущий потребитель `canSee` получит неверное значение. Тесты (`aiFocus.test.ts`) сценарий «два видимых врага» не покрывают.

- **Фикс:** запоминать факт LoS для sticky в том же проходе и возвращать его; добавить тест на двухвидимый случай.

### F-3 · LOW — bloom некорректно восстанавливается при возврате на «high»
- **Где:** `src/game/RenderWorld.ts:184–216` (`applyQuality`, `resize`)
- **Статус:** OPEN · полувнесено дифом (до фикса bloom не возвращался вовсе)

Сам фикс верный по направлению, но у повторно используемого композера три проблемы:
1. `EffectComposer` захватывает pixelRatio в конструкторе; `applyQuality` тем временем меняет `renderer.setPixelRatio` → после цикла high → low → high постпроцесс рисует в старом DPI.
2. Размер берётся из `window.innerWidth/Height` (`:202–203`), тогда как игровой `resize()` использует `canvas.clientWidth/Height` (`GameBootstrap.ts:142–146`) — расхождение при не-полнооконном канвасе.
3. При даунгрейде компоузер не диспонится — два полноразмерных render target продолжают висеть в VRAM на «low»/«medium».

- **Фикс:** `composer.setPixelRatio(...)` + размеры от канваса; либо честно пересоздавать компоузер при каждом входе в «high» и диспозить старый при выходе.

### F-4 · LOW — серия убийств переживает смену раунда
- **Где:** `src/game/CombatSystem.ts:54–57` (+ `KillStreakTracker.ts`)
- **Статус:** OPEN (старый долг)

`resetStreaks()` задокументирован как «сброс при смерти игрока / смене раунда», но **не вызывается нигде** (grep по `src`: только определение). Смерть игрока сбрасывает стрик инлайном (`CombatSystem.ts:126`), а матч, завершённый победой, — нет. Дополнительная деталь: фильтр окна `currentTime - t < STREAK_WINDOW` пропускает и отрицательные разницы, поэтому таймстемпы прошлых матчей (при обнулении `matchTime`) не истекают, пока новое время их не догонит. Итог: начав новый раунд после RAMPAGE, первые серии подавляются, пока счётчик не превысит старый.

- **Фикс:** вызвать `combat.resetStreaks()` в `GameModeController.executeStartRound` рядом с `sim.run.resetRun()`.

---

## 3. Недочёты (гигиена)

| ID | Где | Что |
|---|---|---|
| H-1 | `src/game/match/spawnPoints.ts:70–88` | Мёртвый код: `best`/`bestMin` вычисляются и гасятся `void bestMin` — остаток рефакторинга. Удалить. |
| H-2 | `src/game/camera/OverCameraMode.ts:13,17` | Параметр `_dt` активно используется — префикс `_` («неиспользуемый») вводит в заблуждение. Переименовать в `dt`. |
| H-3 | `BotAiStage.ts:97`, `AI.ts:412`, `GameSimulation.ts:103`, `captureLogic.ts:92,103,114` | Остаточные аллокации в горячем пути после перф-пасса: `allyLineBlockers` — O(N²) фильтр на каждого бота каждый кадр; литерал `aimState` на бота/кадр; новое замыкание `requestGameOver` каждый тик; спреды `{...zone}` в `stepCaptureZone` (именно они породили кэш из F-1). При N≈10 недорого, но непоследовательно. |
| H-4 | `src/__tests__/` | Нет регрессионных тестов на новые пути: `applyQuality` (bloom restore), эвикция дыма в `ArenaEffects`, кэш зон `BotAiStage`, буфер `_personals`. Именно поэтому F-1/F-2 прошли незамеченными. |
| H-5 | `src/game/audio.ts:263–293` | Быстрая последовательность `stopEngine → startEngine` (<0.5 c) даёт два перекрывающихся осциллятора двигателя (старый затухает, поля уже null). Недостижимо при респауне 4 с; риск только на быстрых переходах меню. |
| H-6 | рабочее дерево | Незакоммиченный диф лежит вперемешку с регенерацией `graphify-out` — коммитить одной пачкой по конвенции репо после фиксов F-1/F-2. |

---

## 4. Проверено — НЕ проблемы (чтобы не переисследовать)

- **«Двойной урон» снаряда** (сплэш + прямой в `Projectile.update`) — миф: сплэш идёт через `applyHit`/`applySplashHit` с `dmg=0`, а `DamageSystem.applyDamage` отсекает `dmg<=0` (`DamageSystem.ts:25`).
- **Dispose-покрытие** — аккуратно: дедупликация в `disposeArenaSubtree` (`Arena.ts:150–178`), общий `smokeTexture` защищён от чужого dispose (`ArenaEffects.ts`, `WreckSystem`), модульные геометрии WreckSystem намеренно вечные (задокументировано в `dispose()`).
- **StrictMode double-mount** — корректно гасится (`App.tsx:52–59` cancelled-guard + `Game.teardownContext`; кэш ассетов сознательно не чистится, `Game.ts:188–190`).
- **Жёсткое `playerWon = alpha`** — согласовано: игрок всегда alpha в командных режимах (`rosterSpawn.ts:144`), FFA-ветки возвращают `winnerTeam: null`.
- **CP tie-break на времени** — соответствует GDD (`Docs/GDD/Approved/Capture_Point.md:19–20`): лидер по score, ничья → team kills.

---

## 5. Рекомендованный порядок работ

1. **F-1** — фикс инвалидации кэша + тест (блокер для CP на нескольких картах).
2. **F-2** — вернуть честный LoS для sticky + тест на двухвидимый случай.
3. **F-4** — тривиальный вызов `resetStreaks()` при старте раунда.
4. **F-3** — решить: апгрейд существующего композера (pixelRatio + размеры канваса) или пересоздание.
5. Хигиена: H-1, H-2, затем по желанию H-3/H-5.
6. Прогнать `npm run test && npm run lint && npm run typecheck && npm run build`, закоммитить код + фиксы + `graphify-out` одним коммитом.

*Поведенческие изменения здесь — только исправления к регрессиям дифа; баланс/математики не затрагиваются.*

---

## 6. Итог работ (2026-08-23) — исправлены все пункты (детали в таблице; H-3/H-4 — с оговорками)

| ID | Статус | Что сделано |
|---|---|---|
| F-1 | ✅ FIXED | Кэш вынесен в pure-хелпер `syncZoneViews` (`src/game/engine/stages/zoneViewCache.ts`): rebuild по изменению якорных скаляров (id/x/z/radius), in-place обновление owner/contested на стабильном тике. **Примечание:** инвалидация по ссылке массива невозможна — `CaptureController.update()` пересоздаёт массив зон каждый тик. Тесты: `src/__tests__/zoneViewCache.test.ts` (4). |
| F-2 | ✅ FIXED | `pickAiFocus`: собственный факт LoS для sticky (`stickySee`) с переиспользованием рейкаста; возвращается как `canSee` независимо от того, является ли sticky ближайшей видимой. Тесты: 2 новых сценария в `aiFocus.test.ts`. |
| F-3 | ✅ FIXED | `RenderWorld.applyQuality`: даунгрейд → полный `disposeBloom()` (освобождает render targets); возврат на high → пересоздание композера (актуальный pixelRatio) + `resizeComposer()` от CSS-размера канваса. Бонус: `dispose()` теперь чистит компоузер. |
| F-4 | ✅ FIXED | `GameModeController.executeStartRound` вызывает `sim.combat.resetStreaks()` рядом с `resetRun()`. |
| H-1 | ✅ FIXED | Мёртвые `best`/`bestMin`/`void bestMin` удалены из `pickRespawnPoint`. |
| H-2 | ✅ FIXED | `_dt` → `dt` в `OverCameraMode.update`. |
| H-3 | ✅ FIXED (частично) | Стабильный `requestGameOver`-клоужер в `FrameContext`; переиспользуемый `_aimState` в `AIController` (поля `aimNoise/aimNoiseT` переехали в буфер); `allyLineBlockers` получил опциональный `out`-буфер (единый предикат `isLineBlocker`), `BotAiStage` держит per-bot буферы. **Спреды `{...zone}` в `stepCaptureZone` не тронуты** — это контракт pure-API captureLogic, изменение сломало бы иммутабельность зон для HUD/minimap. Попутно закрыта утечка: per-bot карты стадии теперь чистятся при смене ростера (guard по размеру ростера). |
| H-5 | ✅ FIXED | Голос двигателя живёт вечно: осциллятор создаётся один раз, stop/start — это ramp громкости + `engineOn`-флаг; `setEngine` игнорируется в off-состоянии. Устраняет и наложение голосов при быстрых переходах, и фоновый гул на death cam. |
| H-4 | ✅ CLOSED | Покрытие добавлено для zoneViewCache (F-1) и aiFocus canSee (F-2). Остальные новые пути (applyQuality/ArenaEffects/_personals) остаются без unit-тестов — они требуют THREE/WebGL-моков; отмечено как техдолг. |

### Верификация после всех фиксов

- `npm run test` → **42 файла / 189 тестов, все зелёные** (+6 к базлайну)
- `npm run lint` / `npm run typecheck` → чисто
- `npm run build` → dist ≈ 1.09 MB single-file

*Поведенческие изменения — только исправления регрессий дифа и дефектов из аудита; баланс/математики не тронуты.*

---

## 7. Второй перф-проход (2026-08-23, вечер) — остаточные аллокации кадра

Все ворота зелёные до и после: 42 файла / **189/189** тестов, lint, typecheck, `dist ≈ 1.09 MB` (gzip ≈ 301 KB). Изменения shape-preserving: ни один тест не правился, gameplay-математики перенесены 1:1.

| ID | Где | Что сделано |
|---|---|---|
| P-1 | `ArenaEffects.update` ← `graphicsQuality.loadQuality()` | Убрано чтение localStorage + try/catch каждый кадр (60+/с): `ArenaEffects.setQualitySource(() => renderWorld.getQuality())`, подключается в `Arena.setRenderWorld`. Дефолт остался `loadQuality` — поведение без RenderWorld не меняется. |
| P-2 | `CaptureController.update` → `captureLogic.ts` | CP-тик больше не создаёт массив + N spread-копий зон каждый кадр: новое мутатирующее ядро `stepCaptureZoneInto` (единый источник истины), pure-`stepCaptureZone` теперь обёртка над ним (`{...zone}` → into). Пул таргетов пересеивается только при смене набора зон (reset → новый массив). Объекты зон стабильны между тиками → меньше давления на GC и копирование в HUD/minimap. |
| P-3 | `aiObjective.pickObjectiveZone` | Вместо map-обёрток + sort на каждого objective-бота каждый кадр — однопроходный min-поиск с сохранением tie-break стабильной сортировки (priority → distance → порядок списка). |
| P-4 | `Game.getCaptureMinimap` | `.map()` новых объектов на каждый кадр миникарты заменён переиспользуемым буфером `_cpMinimapBuf`. |
| P-5 | `HudModel.fillDynamics` | Blip-объекты миникарты переведены на пул строк `_dynPool`, мутируемый in place (паттерн `MatchRuntime._personals`). |
| P-6 | `BotAiStage.update` | Литерал `[]` вне CP заменён общим `_emptyZones`. |

**Проверено — НЕ тронуто (осознанный отказ):** кэш `_tankById` между кадрами (протухшие ссылки после `clearTanks` при равном размере ростера); early-out в `resolveCircle` по dx/dz против r (меняет порядок итераций выталкивания → микрошатание физики); двойной `Math.hypot` до игрока в `AIController.update` (шум); `zonesAsView`/`syncZoneViews` уже оптимальны после F-1.

*Граф graphify обновлён тем же проходом.*

---

## 8. Третий перф-проход (2026-08-23, ночь) — texture cache + HUD/миникарта

Закрывает все 4 «remaining leads» из перф-аудита. Порядок критичен и соблюдён: сначала
реестр защиты (R-2), затем кэширование (R-1). Контракт: **любая текстура из
`textures/shared.ts::cachedTexture` помечена `markShared` и живёт до конца процесса —
никто, кроме владельца кэша (`cachedTextureEvict`), не имеет права её диспозить.**

| ID | Где | Что сделано |
|---|---|---|
| R-1 | `src/game/textures/*` | Все фабрики мемоизированы через `cachedTexture(key)`: glow/smoke/scorch/hex/wall/structure/track + параметрические crate/container/barrel/sign/camo (ключ = аргументы). Большие ground-канвасы — LRU-слот `'ground:last'` (`cachedGround` в `ground.ts`): перед сборкой village/city предыдущий слот выгружается владельцем (`cachedTextureEvict`: unmark + dispose). Базовый `groundTexture` — обычный кэш (1024²). |
| R-2 | `Arena.disposeArenaSubtree`, `resources/sharedResources.ts` | Хардкод `sharedSmoke` заменён универсальным фильтром `isShared()` по geos/mats/maps (реестр уже существовал для GLB-мастеров). AmbientDust.dispose больше не диспозит свою map; ProjectileManager.dispose не трогает `glowTex`. Устраняет класс регрессии «кэш вернул диспознутую текстуру → чёрные поверхности после смены карты». |
| R-3 | `effects.ts` | `glowTexture()` стал синглтоном кэша: 4 независимых канваса за матч (AmbientDust/MuzzleSystem/SparkPool/Projectile) → один GPU-текстур. |
| R-4 | `components/hud/minimapDraw.ts` | Conic-градиент радара запекается один раз в offscreen `sweepCv` (в кэше миникарты); каждый кадр — только rotate+drawImage вместо createConicGradient+fillRect с градиентом. |
| R-5 | `components/GameOverScreen.tsx` | `CountUp` пишет цифры через `ref.textContent` из RAF (~78 ре-рендеров React на экране результатов → 0). Тот же паттерн, что HUD-бары. |

**Тесты:** новый `textureCache.test.ts` (7) — мемоизация по ключу, markShared-флаг,
has/evict-семантика владельца (evict диспозит и снимает флаг), no-op evict.
Проверено и НЕ тронуто: строковые ключи `staticLayerKey`/`captureStripKey` каждый кадр
(O(n), n≈сотня — шум); villageMap/cityMap ~800 строк — декларативные сборщики, когезивны.

*Ручная проверка после мерджа: 2× смена карты (Factory→Village→City→Factory) — текстуры стен/земли живые, хичч рестарта матча заметно меньше.*
