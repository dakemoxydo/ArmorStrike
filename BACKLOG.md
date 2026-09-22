# ArmorStrike — Backlog

Пул задач: открытые + по одной строке на каждую закрытую. Длинные отчёты здесь
не хранятся — детали закрытых итераций в git-истории и `Docs/`. Категории A–L:
- [A] Bugs & Stability · [B] Performance · [C] Core Gameplay · [D] Enemy AI
- [E] Rendering & Beauty · [F] Physics & Feel · [G] Audio · [H] UI / UX / HUD
- [I] Levels & Content · [J] Code Quality · [K] Accessibility & Polish
- [L] Infrastructure, Backend & Cloud

Новая задача — буква + номер; закрытая остаётся одной строкой «[x] что — итог/ссылка».

> **2026-09-15 — батч доменного аудита** (5 областей: движок+физика / оружие / матч+ИИ /
> рендер+ресурсы / UI+ввод; все гейты зелёные, находки — за пределами инструментов).
> Маркеры severities: **HIGH** / **MED** / **low**. Ключевые находки перепроверены по исходнику.

## [A] BUGS & STABILITY
- [x] A1: Sweep length-based caches (F-1 class) — CLEAN, все кандидаты с content/identity-guard.
- [x] A2: Unit-test `KillStreakTracker` window expiry incl. negative deltas — +5 tests.
- [x] A3: Match lifecycle reset test (DM→TDM→CP, no cross-mode state) — `gameModeLifecycle.test.ts` (+3).
- [x] A4: Audit `Game.teardownContext` / StrictMode unmount guard — CLEAN, chain verified.
- [x] A5: Hotfix — хардкод float-высоты обелиска в `ArenaEffects` (City-монумент уезжал на +3.5 м); база захватывается в `setObelisk`.
- [x] A6: Loadout никогда не восстанавливался (`RunState.load()` не вызывался в проде) — фикс 2026-09-15: конструктор `RunState` вызывает `load()` (до первого preview-rebuild в bootstrap); пины `RunState.test.ts` (+2). F5 держит Мамонт/Гаусс.
- [x] A7: Конец матча не отпускал спуск/FX — фикс 2026-09-15: GameLoop ловит переход playing→≠playing: `setFire(false)` по всем танкам + weapon.update в 'over'-ветке (фейды лучей/muzzle досинтегривают); source-пин `criticalAuditFixes.test.ts` (A7 describe).
- [x] A8: prototype-chain в валидации loadout — `hasOwnProperty.call(HULLS/TURRETS, id)` + typeof-гейт; пин «toString/constructor» в `RunState.test.ts`.
- [x] A9: Устранение 11 геймплейных багов и недочётов — защита от софтлока авто-паузы при респауне (`onLockError`), центрирование башни по C (`centerRequested`), подавление гонки Esc в Firefox (`lastAutoPauseTime`), отсечка кольца/щита/обводки в hitscan Рельсы, 3D-проверка препятствий (УВН) для Рельсы/Гаусса/прицела (`nearestShotBlockerDist`), снятие блокировки спуска Гаусса при срыве захвата, чувствительность и инверсия мыши в PauseMenu, моментальное удаление фантомных танков и детекция отключения хоста в мультиплеере, баннер Desktop Only.

## [B] PERFORMANCE
- [x] B1: Draw-call census per map — инструмент `npm run census`; baseline factory 327 / village 940 / city 753 est. DC.
- [x] B1b: Instance village fence rails — village 940→845 est. DC.
- [x] B2: Texture-factory memoization coverage — FULL (весь `src/game/textures` через cachedTexture).
- [x] B3: HudModel per-frame setState check — VERIFIED clean (refs + thresholded force only).
- [x] B4: Bundle census — three ≈55% src-gz / react-dom ≈32% / app ≈28%; verdict: trim не нужен.
- [x] B5: Фризы на выстрелах/смертях — LightRig (постоянный бюджет 7 источников), `RenderWorld.warmUp()`, пул wreck'ов без аллокаций, hit-stop по `byPlayer`, HUD reflow fix. Док — `Docs/Architecture/Standard_Frame_Stability.md` + GDD `Kill_Feedback`.
- [x] B6: LRU-1 выгрузка ground-текстур — фикс 2026-09-15: модуль хранит последний реальный ключ (`ground:<map>:<size>`) и evictит его; пин `textureCache.test.ts` (source-scan). 3×3072² канваса больше не копятся.
- [x] B7: Инвариант светового бюджета восстановлен — фикс 2026-09-15: 2 статических PointLight печей → additive glow-сферы в пуле `moltenMats` (мерцание, ноль влияния на numPointLights); пин «ноль lights в контенте» в `factoryMap.test.ts` (B7); правило §1.6 + док-строка Foundry синхронизированы.
- [x] B8: City инстансинг декора и зданий — фонари (36 шт.), светофоры (4 шт.), опоры эстакады (4 шт.) и окна/рёбра офисов переведены на InstancedMesh (753 → 447 draw calls, −40% DC, 24 InstancedMesh / 332 инстанса); пины в `cityMap.test.ts`.
- [x] B9 (low): Общие геометрии частиц sphere/ring/circle — фикс 2026-09-15: `ParticleEffects` хранит `sharedGeos` и диспозит их в `dispose()` (системы снимают только свои материалы); source-пин `lowFixesBatch.test.ts`.
- [x] B10 (low): `CaptureMarkers.sync` — фикс 2026-09-15: canvas буквы перерисовывается только при смене цвета (`lastLetterCol`), как обещал комментарий; прогресс тикирует ring/fill; source-пин `lowFixesBatch.test.ts`.

## [C] CORE GAMEPLAY
- [x] C1: Capture-point contest/decay math vs Approved/Capture_Point.md — VERIFIED clean, 2 doc nits fixed.
- [x] C2: Projectile splash falloff — проверено аудитом 2026-09-15: линейный `1 − dist/splashRadius` (`src/game/engine/Projectile.ts:54-55`) = Damage_System.md:71; двойного применения HP на мульти-хит-кадрах нет; Projectile_System.md кривую не задаёт. Расхождений нет.
- [x] C3: Regression test: tank-vs-obstacle penetration at max boost speed — `lowFixesBatch.test.ts` (C3, 3 кейса): таран 24 м/с (16×BOOST 1.5) в опору 0.7 м при dt=1/20, 1/30, 1/60 — танк не проходит насквозь, финал x ≤ −radius.
- [x] C4: Двойной снайпер-пад гаусса — фикс 2026-09-15: `lockTimer += dt` (мультипликатор только в `lockDuration()`, конвенция рельсы); эффективный лок = lockTime/mul; пин `GaussWeapon.test.ts` (+1).
- [x] C5: Снаряд выбирал жертву по порядку массива — фикс 2026-09-15: `segmentHitsCircleT` (первый вход, физика) + выбор минимального t в Projectile; пины `physics.test.ts` (+1).
- [x] C6: Огнемёт толкал/дымил союзников — team-фильтр у источника (конвенция рельсы :352-355); пин `criticalAuditFixes.test.ts` (C6 describe).
- [x] C7: Win-условия со смещением порядка — фикс 2026-09-15: лидер по максимуму (килы/очки), равный максимум/одновременное пересечение порога → draw во всех 3 режимах; `leadingPersonal` помечает `tied`; пины `matchWinConditions.test.ts` (+4); правило в Match_Framework.md.
- [x] C8: Вампиризм Изиды — фикс 2026-09-15: тик наносит/возвращает `min(dmg, HP цели)` — избыток добивающего тика не лечит (код теперь соответствует Weapon_Isida.md «фактического»); пин `IsidaWeapon.test.ts` (C8).
- [x] C9: Метки стрика при сужении окна — фикс 2026-09-15: `lastStreakCount` декрементится при укорочении окна (метки перевыставляются); правило задокументировано в Kill_Feedback.md (секция «Серии убийств»); пины `KillStreakTracker.test.ts` (re-award +1).
- [x] C10: Ребаланс TTK, физики танков и Out-of-Combat ремонт — HP корпусов поднято на +35...45% (120/150/180/250/320), пиковый урон сглажен (гаусс 60, рельса 55, смоки 20), скорости снижены на ~20%, `SPEED_DAMP` 2.8/4.2 (ощущение веса машины), добавлен автоматический ремонт вне боя (задержка 6.0 с, 14 HP/с); пины в `gameplayBalanceRoster.test.ts` и `combatClarityAndRepair.test.ts`.
- [x] C11: Комплексный ребаланс: Рельса, двухрежимный Гаусс, Смоки, Изида и тяжёлые корпуса — Рельса (урон 75, КД 2.6 с), Смоки (магазин 6, КД 2.2 с), Гаусс (аркадный выстрел 30 урона / КД 1.05 с + снайперский залп 70 урона / КД 2.2 с), Изида (дальность 20 м, 42 HP/с, вампиризм 45%), тяжёлые корпуса (Титан 9.5 м/с, Мамонт 11.0 м/с), нитро (расход 0.35/с, ~2.85 с); пины в `GaussWeapon.test.ts`, `gameplayBalanceRoster.test.ts`, `isidaTargeting.test.ts`, `aiRoles.test.ts`.
- [x] C12: Системный ребаланс геймплея — бафф Смоки (урон 25, скорость 54 м/с, сплэш 12), разведение Рельсы (85 урон) и Гаусса (65 снайп-урон, лок 1.3 с), фикс огнемёта сквозь стены (losClear) + 52 DPS, баланс Изиды (хил 32 HP/с, вампиризм 35%), процентный внебоевой ремонт (задержка 5.0 с, 8 HP/с + 4% maxHealth/с), динамика тяжёлых корпусов (Мамонт 11.5 м/с / 2.2 рад/с, Титан 300 HP / 10.2 м/с / 1.9 рад/с), пейсинг матчей (TDM 50 фрагов, DM 25 фрагов, зрение ботов 65 м).
- [x] C13: Вертикальная автонаводка + захват цели в прицеле (Tanki Online-style) — УВН башен (`elevationAngle`/`depressionAngle`/`pitchSpeed` в `TurretDef`/`TURRETS`), тангаж ствола `barrelPitch` (целевой `atan2(dy,distXZ)` с клампом по сектору, плавный довод `pitchSpeed·dt`, возврат к горизонту без цели), полный 3D-`aimDir` (снаряды/лучи поражают на разной высоте, XZ-планиметрия не затронута), автонаклон у игрока и ботов из того же `AimHighlighter`-захвата (holdSec), HUD-прицел `.is-locked` (мятный→красный `#ff2d3c` + смыкание засечек); пины `verticalAim.test.ts` (+15), `verticalAimHud.test.tsx` (+4), GDD [[Vertical_Auto_Aim]].

## [D] ENEMY AI
- [x] D1: Bot objective-duty tables per mode — `botDutyTable.test.ts`; CP/TDM push 50–60% в band 40–60%.
- [x] D2: Difficulty spread verify — реален, запинен в `aiRoles.test.ts`; бот-пады rail/flamer через `firePadForRole` (решение игрока).
- [x] D3: aiCover distances vs weapon range classes — когерентно, контракт в `aiCover.test.ts`; мёртвый `AI_LOW_HP_FRAC` удалён.
- [x] D4: Невидимый sticky-фокус глушил ответный огонь — фикс 2026-09-15: sticky-slack только при `stickySee` (при отсутствии видимых — охота продолжается); пины переписаны на «видимый предпочтительнее» в `aiFocus.test.ts` (+1 blind-hunt кейс); правило в AI_Bots.md.
- [x] D5: `findCoverPoint` не проверял валидность точки — фикс 2026-09-15: overlap-фильтр (точка не в чужой/собственный solid с запасом 1.4, `pointInCollider`) + clamp к `arenaHalf` (пробрасывается `ctx.bounds` из AI.ts); пилот-ноль вместо детерминированного wall-push; пины `aiCover.test.ts` (D5, +2).
- [x] D6: Roster swap guard — фикс 2026-09-15: сравнивается и длина, и id первого бота (`_firstBotId`), same-size rematch теперь ловится; комментарий соответствует; source-пин `lowFixesBatch.test.ts`.

## [E] RENDERING & BEAUTY
- [x] E1: Atmosphere-preset gap check — все карты покрыты; GDD exposure drift fixed (1.14→1.0) с тест-пинами.
- [x] E2: Nameplate fade/scale clamp at long distance — `Nameplate.setRange` 48→110 м от локального игрока, срез+Russo One; пины `nameplate.test.ts`.
- [ ] E3: Particle budget parity across quality tiers — аудит 2026-09-15: кап фактически равный (пулы константны, прогон low/med/high = 33/32/34 спрайтов дыма), но Graphics_Presets_Matrix.md:23-26 объявляет это «осознанным выбором», а строка :19 «smoke ≤44» учитывает только аренный пул (боевой SmokeSystem 42 не упомянут). Сначала арбитраж доков, потом код.
- [x] E4: Нано-дуга Изиды — фикс 2026-09-15: `mesh.position` = midpoint(from,to) конвенцией рельсы; пин `NanoBeamFx.test.ts` (новая, +2).
- [x] E5: «Светящиеся окна» скайлайна были невидимы (pane внутри бокса) — фикс 2026-09-15: вынос панели на пересечение луча «центр башни→арена» с AABB грани (`src/game/arena/skyline.ts`) +5 см запаса; эффект работает на всех 3 картах.
- [x] E6: Аккумуляторы TankFxSystem — фикс 2026-09-15: smoke/dust `-= порог` вместо `= 0` (частота не плавает с FPS, конвенция flame); пины `lowFixesBatch.test.ts` (E6, 3).
- [x] E7: City-декор — фикс 2026-09-15: светофор имеет только активную зелёную линзу (красная/жёлтая — тёмные стёкла); city получила живой декор (вращающееся кольцо плазмы над обелиском + 2 smoke-эмиссии площади); роторы (мельницы/вентиляторы/кольцо) гейтятся `quality !== 'low'` — на low не крутятся.
- [x] E8: Следы гусениц и дорожная пыль шасси — система следов гусениц (`TrackMarkPool`, 500 `InstancedMesh`, процедурная текстура протектора, дифференциальная кинематика колеи, затухание альфы) и динамический шлейф пыли (`DriveDustPool`, 120 `InstancedMesh`, billboarding в вершинном шейдере, 2-гусеничный выброс, заносы, нитро-буст) с постоянным бюджетом +2 Draw Calls на всю арену; пины `trackMarks.test.ts`, `driveDust.test.ts`, `tankFxSystemTracks.test.ts`, GDD [[Tank_Tracks_And_Dust]].
- [x] E9: Стилизованный Low-Poly / Cel-Shaded / Комикс арт-дирекшен — ступенчатое квантование освещения (3 градации, lights_physical_fragment), чернильная обводка силуэтов (Inverted-Hull BackSide с нормальным выталкиванием и компенсацией дистанции), очищенные текстуры брони и гусениц, дневные высококонтрастные атмосферы карт, комиксные всплывающие числа урона; пины в `comicStyle.test.ts`, `atmospherePresets.test.ts`, GDD [[Stylized_Art_Direction]], арх-док [[Standard_Cel_Shaded_Rendering]].
- [x] E10: Чернильный outline крупных зданий на всех картах (Visual_Coherence_Pass п.10, OQ4=да) — inverted-hull шеллы (shared-материал 0.10 м, та же дистанционная компенсация), только несущие wall-корпуса выше порога (max(w,d)≥8 или h≥8 при h≥4), ≤2 шелла на корпус (масса+крыша), мелочь/скайлайн мимо; census factory 545→601 / village 790→860 / city 484→532 (все <+15% DC); пины `buildingInk.test.ts` (+13), GDD [[Stylized_Art_Direction]] §13.

## [F] PHYSICS & FEEL
- [x] F1: Дифференцированная отдача орудий и сотрясение камеры (trauma + FOV punch) — Смоки (fireShakePlayer 0.16, botNear 0.04 в радиусе 30 м, fireFovPunch 1.2°), Огнемёт (микро-вибрация струи fireShakePlayer 0.008), Изида (микро-отдача тиков 0.014); пины `CannonWeapon.test.ts` (+3).
- [x] F2: Ощущения нитро-буста — динамическое расширение FOV (+4° при наборе предельной скорости), тактильная вибрация ракетного ускорителя в `BoostStage` (`addShake 0.012`), форсированный тон и громкость в `setEngine`.
- [x] F3: Камера уворачивалась от уничтоженных/non-LOS объектов — фикс 2026-09-15: `avoidObstacles` теперь скипает `!active || !blocksSight || kind==='ramp'` (`src/game/CameraRig.ts:193`); конвенция физики/LOS/снарядов; пины destroyed/non-LOS в `criticalAuditFixes.test.ts` (+2).
- [x] F4: Стеновое трение — фикс 2026-09-15: `exp(−K·dt)`, K=9.05 (≡×0.86 при 60fps), dt из PhysicsStage; двойное применение убрано (friction только первым проходом); пин FPS-инварианта `criticalAuditFixes.test.ts`; секция «Стеновое трение» в Arena_Physics.md (плюс свежее описание ramp).
- [x] F5: Спавн снаряда внутри опоры — фикс 2026-09-15: проверка стены = `pointInCollider(текущая) || segmentHitsCollider(до→после)` — сегментный свип ловит и рождение внутри тонкого коллайдера (призрачный проход устранён); source-пин `lowFixesBatch.test.ts`.
- [x] F6: Динамика подвески и отдача шасси (пакет «Тяжесть и физика») — пружинно-демпферная модель подвески (pitch/roll), клевок при торможении, задирание носа при разгоне, крен в виражах, отдача корпуса при выстреле с разложением по turretYaw и сотрясение (flinch) от knockback; пины `tankSuspension.test.ts` (+13), GDD [[Tank_Suspension_Dynamics]].

## [G] AUDIO
- [x] G1: Пространственный 3D-звук (WebAudio / StereoPannerNode) для всех 5 типов оружия: расчёт относительного положения и азимута взгляда камеры, квадратичный спад громкости (8–90 м), отсечка звуков свыше 90 м, акустическая тень сзади (lowpass 3800 Гц), уникальный синтез нано-луча «Изиды» и саб-басовый kick «Смоки»; пины `audioSpatial.test.ts` (+7).
- [x] G2: Mute persistence across restarts — `as2_muted` + `muteStorage.test.ts`; engine-survival закрыт кодом H-5.
- [x] G3 (low): Щелчок «перезарядки магазина» — фикс 2026-09-15: единый предикат `isBeamTurretId` (hudPresentation) гейтит audio.reload() в PlayerInputStage, как для HUD-текста; пины `lowFixesBatch.test.ts` (G3, 5).

## [H] UI / UX / HUD
- [ ] H1: Minimap correctness after sweep bake (commit b768fa0): layering, blip colors, sweep visuals — screenshot evidence.
- [x] H2: Garage loadout edge cases — DOM-стек поднят (jsdom + RTL); `Garage.test.tsx` (10) + `useFocusTrap.test.tsx` (7).
- [x] H3: Pause menu focus trap + Esc/Resume — verified present, no change needed.
- [x] H4: GameOverScreen complete stat line — добавлен `playerBestStreak` (5-я StatCard), Scoring.md синхронизирован.
- [x] H5: Гонка флага загрузки — фикс 2026-09-15: монотонный `startToken`, stale-вызов не гасит «ЗАГРУЗКА» и не пишет roundError; пин `uiWiringPins.test.ts` (H5).
- [x] H6: Единый источник mute — фикс 2026-09-15: kill-feed идёт через App `onToggleMute` (владельца `muted` для PauseMenu); + `storage`-слушатель `as2_muted`; пины `uiWiringPins.test.ts` (H6). Остальные 3 LS-ключа кросс-вкладочно не синхронизируются (осознанно вне скоупа).
- [x] H7: Enter-hijack — фикс 2026-09-15: глобальный Enter в ModeSelect/MapSelect гейтится `isInteractiveKeyboardTarget` (как в App); `useFocusTrap` поддерживает `[data-autofocus]`, им помечены первичные CTA («ДАЛЕЕ», «В БОЙ») — ловушка больше не стартует с «НАЗАД»; пины `useFocusTrap.test.tsx` (+1) и `uiUxPresentation.test.ts`.
- [x] H8: Отказ pointer lock — фикс 2026-09-15: `PlayerController` слушает `pointerlockerror` → `onLockLost` → авто-пауза (`shouldAutoPauseOnInterrupt`): при отказе захвата бой не продолжается вслепую, игрок возвращается в меню паузы с подсказкой.
- [x] H9: RU/EN-микс — фикс 2026-09-15: ModeSelect («Каждый сам за себя…», «5 на 5, без огня по своим», метрики «30 фрагов / 75 фрагов / 1000 очков / +1 очко/с»), city-blurb («мегаполис… квартала-района»), PauseMenu («низкое/среднее/высокое») — русские. nameEn-подпись на карточках карт — осознанный двуязычный стиль (решение): кириллица первична, латиница — декор-подпись; запинено в `uiUxPresentation.test.ts`.
- [x] H10: Инлайновый letterSpacing — фикс 2026-09-15: PauseMenu переведён на `tracking-wider` классы; глобальный source-пин «нет inline letterSpacing в компонентах» в `uiUxPresentation.test.ts`.
- [x] H11: Читаемость входящего огня и индикация захвата Гаусса — дуга урона в HUD переориентирована по взгляду камеры игрока (`aimYaw`), исключая искажения при заносах корпуса; добавлен двухтональный WebAudio зуммер и HUD-баннер тревоги («ТРЕВОГА: ЗАХВАТ ЦЕЛИ») при автозахвате игрока вражеским снайпером; пины в `combatClarityAndRepair.test.ts`.
- [x] H12: Toon / Comics стилистика UI и HUD — чернильная обводка панелей и кнопок (`inset 0 0 0 2px #0b0e14`), 3D press-эффект со скосом тени, плашки комиксной бумаги, 3D экструдированные заголовки title-glitch, всплывающие фраги/стрики с чернильной обводкой и динамическим скосом, стилизованные значки захвата точек A/B/C; пины в `comicStyle.test.ts`, `uiUxPresentation.test.ts`.
- [x] H13: Минималистичный Toon / Comics UI редизайн (anti-neon): отказ от диффузного цианового неона в пользу теплой янтарно-золотой гаммы (#f59e0b), тактильных кнопок с чернильной обводкой, четкого прицела со штрихом, улучшенных шкал HP/буста/патронов и чистой плашечной верстки экранов меню и HUD.
- [x] H14: Настройки мыши (чувствительность 0.2x–3.0x и инверсия оси Y) в PauseMenu + баннер Desktop Only на тач-устройствах.
- [x] H15: Главное меню: от лендинга к «Игровому Лобби» (Game Lobby Framing) — полноэкранная 3D сцена (full-bleed viewport) без затемняющей шторки, центрирование камеры на машине (`MenuCameraMode.ts`), удаление маркетинговых текстов и карточек WASD, мощный тактический логотип ARMOR STRIKE, доминирующая массивная кнопка [В БОЙ!] с янтарно-оранжевым градиентом и пульсирующим шевроном, строгий вертикальный командный стек (В БОЙ, ГАРАЖ, СПИСОК СЕРВЕРОВ, ЗАДАЧИ, НАСТРОЙКИ), живой угол статуса (HUD Header: армейский жетон с ником, званием, балансом CR и пингом) и модальное окно настроек прямо из лобби (`SettingsModal`).
- [x] H16: Комплексная унификация UI и HUD под Toon / Comics стиль: мультиплеерные модальные окна (ServerBrowser, CreateServer, PasswordPrompt) переведены на `.scrim-over`, `.cut-control`/`.cut-chip` с чернильной обводкой 2px `#0b0e14` и 3D-тенями; устранение неонового блюра на миникарте, замена системного шрифта CP на `Russo One` с чернильным контуром баз и танков; замена цианового цвета заголовков табло; устранение остаточного мятного цвета в `.key-chip` и `.garage-hint-label`; стилизация окна настроек и баннеров приложения.


## [I] LEVELS & CONTENT
- [x] I0: Factory rebuild на всю арену 300×300 — 133 коллайдера, 4 района + кран над CP-B, `factoryMap.test.ts` (13);док — [[Factory_Level_Design]].
- [ ] I1: Spawn fairness metrics per map (min distance spawn→nearest enemy lane); rebalance worst spawn weights. — инструмент готов: `npm run map-plan [mapId]` печатает плотность/зоны/spawn-точки из реальных коллайдеров. — аудит подтвердил худшую карту: city (→ I4).
- [ ] I2: Obstacle density/variety comparison village vs city; log metrics, patch only clear gaps. — factory-данные уже сняты (`npm run map-plan factory`): 133 коллайдера, NW 14H/6S · NE 13H/12S · SW 16H/11S · SE 15H/10S
- [ ] I3: CP anchor symmetry: capture-point distances from both team spawns roughly equal per map. — нарушено на city (→ I5).
- [x] I4: City-спавны внутри геометрии — фикс 2026-09-15: `cityMap.test.ts` (новая, 10 пинов: спавны ≥10 м, клиренс CP, LOS/полосы авеню, no-spawn-in-CP-disk, AABB билбордов) + разведение геометрии (билборды с осей, опоры эстакады 64→56, плантеры/crate/mid-ring jersey увезены с осей и дисков).
- [x] I5: City CP против собственного инварианта — фикс 2026-09-15: монумент → проходимый плац-подиум ('ramp') + голо-колонна без коллайдера (CP-A открыт, captures works); CP-C (12,−86)→(0,−78) зеркало B; busStop уведён из диска; пины в `cityMap.test.ts`.
- [x] I6: Factory railSiding — невидимая стена 58×5.4 м — фикс 2026-09-15: kind 'ramp' (единственный не-solid для физики корпуса; конвенция M12) + пин проходима в `factoryMap.test.ts` (+1); Factory_Level_Design.md:61 синхронизирован.
- [x] I7: Повёрнутые объекты без AABB-обёртки — фикс 2026-09-15: общий хелпер `aabbForYaw(w,d,yaw,pad)` в physics.ts; применён в village house/barn (коллайдеры 6 домов + 2 амбаров совпали с мешами), city car/billboard переведены на него, dumpster исправлен; контракты village/city зелёные, юнит-пины `physics.test.ts`; конвенция в Arena_Physics.md.

## [J] CODE QUALITY
- [x] J1: Unit-test `applyQuality` bloom dispose/recreate — +6 tests.
- [x] J2: Unit-test ArenaEffects smoke eviction — +4 tests (guard defensive-only at current tuning).
- [x] J3: Dead-export scan — 4 removals (−67 lines); assetUrl/applyMaterialToModel kept as documented dormant API.
- [x] J4: Document texture-memoization + zoneViewCache → `Docs/Architecture/Standard_Resources.md`.
- [x] J5: Dirty-check HUD заменён на `src/ui/hudRenderGate.ts` (+16 tests, 2 реальных бага закрыто); контракт — Standard_UI_Input §2.
- [x] J6: «Спящий» GLB-пайплайн — ОСТАВЛЕН намеренно (tree-shaking: цена 0 байт в прод-бандле); шов запинен в `tankConfig.test.ts` (6).
- [x] J7: `npm audit` 10 → 0: vite 7.3.6, vitest 4.1.11 (держит Node 20), esbuild override 0.28.2; lock v3, `npm ci` под npm 10 ОК.
- [x] J8: Match-рантайм без тестов — фикс 2026-09-15: `matchRuntime.test.ts` (18 пинов): матрица reset (CP-монтирование/L-4-сохранение зон без opts/уход в DM), onTankKilled (кредит/союзник/null-owner/ended-guard), RespawnController (claimed-дедуп на 2 трупах, player-only requestLock/unpause/deathT=-1, до-delay), CaptureController (пулинг идентичности массива, captureSec-шаг, контест-заморозка, скоринг), сквозной draw-C7 через update. По ходу зафиксировано фактическое поведение: byPlayer в kill-ивенте = «владелец урона», а не кредит (пин-комментарий).
- [x] J9: Мёртвый код — фикс 2026-09-15: удалены `requestGameOverLegacy` (+ `requestGameOver` из FrameContext), `FFA_FALLBACK` (статически мёртв — pool всегда непустой). `maxPush`-кламп оставлен как документированная оборона (не «вакуумный» тест, а страховка от будущих больших radius); ветки gauss/isida `aiRoles` оставлены (тотальная карта TurretId, J10 планирует gauss-ботов). Мёртвые моки `requestGameOver` убраны из `botDutyTable.test.ts`/`targetHighlight.test.ts`.
- [x] J10 (low): Гаусс-полировка + боты — фикс 2026-09-15: shake-гейт `playerNear` (45 м), скрытие луча при смерти (`beamFx.hide()` в `onOwnerDeath`), интеграция гаусс- и изида-ботов в 5×5 ростер (`BOT_TURRETS` + `HULL_IDS`); калибровка `aiTuning` (preferredRange 34+10a, aimTol 0.065 под lock cone 0.075); юнит-тесты `gameplayBalanceRoster.test.ts`.
- [x] J11: Аллокации против fillAmmoState-паттерна — ammoSink в `PlayerInputStage`, переиспользование `tmpGaussCone` в `GaussWeapon`, устранение origins-массива в `NanoBeamFx.step`, `tmpDir` в `GaussBeamFx.fire`, пул `_hitTanksSet`/`_piercePool`/`_shotVisual` у рельсы.
- [x] J12: Числа не по месту — фикс 2026-09-15: `WEAPON_TUNING.cannon.botKnockback: 4.0` (хардкод `: 4` убран, строка добавлена в Weapon_Cannon.md); railgun — единый `RAY_RANGE_FALLBACK = 1000` вместо разнобоя 1000/10000/1000.
- [x] J13: Tooling-гигиена — фикс 2026-09-15: start.bat уважает `--no-open` и в ветке «уже запущен», проверка Node учитывает минор (20.19+/22.12+, через `process.versions.node`); комментарий `.gitignore` переведён на `Docs/Architecture/Standard_Resources.md`; пины `lowFixesBatch.test.ts`. Хотфикс того же дня: первая версия гейта крешала cmd (неэкранированная скобка в echo внутри if-блока — парсинг падает даже при невыбранной ветке) — убрано, добавлен инвариант-пин «нет скобок в echo/rem строках».
- [x] J14: Синк доков — сделано 2026-09-15: Arena_Physics.md:18 (файлы арены — актуальный список, legacy-модули слиты в factoryMap), Damage_System.md:40 (дубликат beam-гейтов назван защитным; :55 — масштаб взрыва фикс. 1.4 = FX-тюнинг), Tank_Aim.md (таблица 5 башен + aimDir = горизонталь от aimYaw без pitch), Health_And_Regen.md:52 (hit-flash — `TankAnimationSystem`), Core.md:120 (+GaussWeapon/IsidaWeapon), Standard_Resources.md §1.4 (LRU-1 работает после B6, канвасы 3072²), Maps.md (пруд ед.ч., city-blurb, per-map atmosphere, factory-остров снят), Weapon_Gauss.md:46 (0.2 → 4.4), Weapon_Cannon.md (+botKnockback), Weapon_Isida.md:59 (+G3-гейт), City_Level_Design.md:41 (билборды держат снаряды); §4.1-йерси закрыта I4/I5-пилами. docs:check: 647 ссылок ОК.
- [x] J15: Устаревшие комментарии — фикс 2026-09-15: `zoneViewCache` (steady-state пул, не «новый массив каждый тик»), `useFocusTrap` («primary CTA» — теперь честно, через data-autofocus из H7), шапка `cityMap` (иерархия cover: билборды blocksShots:true), `Garage` («5 корпусов, 5 башен» + добавлена ветка gauss в weapon-tips); комментарий constant-light-budget в `GameModeController` сверен с B7 — верен.
- [x] J16: App.tsx монолит — сделано 2026-09-22: 685→~300 строк; владение состоянием разнесено по хукам (`useUiModals` редьюсер модалок, `useRoundState`+`useRoundFlow` round-flow с H5-токенами, `useGameBootstrap` boot/auth/finalStats/`economyVersion`, `useAppSettings` mute H6/crosshair/damageNumbers, `useAppHotkeys`, `useResume`, `useGameDerivedStats`, `useHudSnapshot`); удалены мёртвые дубли (`useAppHelpers`, `useAutohideError`, `useStarterPackClaim*`, `useResumeGame`, `useTouchOnly`); пины `uiWiringPins.test.ts` переведены на файлы хуков.
- [x] J18: Слоистость только руками — сделано 2026-09-22: `eslint-plugin-boundaries@7` + `eslint-import-resolver-typescript` в `eslint.config.js` (`boundaries/dependencies`, 6 политик: production↛test, core↛game/engine/components/hooks/ui, game↛components/hooks, components/hooks↛engine, components↛`game/Game.ts`); негативные пробы 7/7, `npm run lint` — автогейт Core_Patterns §1.
- [x] J19: Source-scan вместо поведения — сделано 2026-09-22: `appFlow.test.tsx` (+14: H5-гонки SP/MP через renderHook, M13b auto-hide 4s, H6 mute+storage, hotkeys, flow-диспатчи), H7-пины data-autofocus переведены на рендер PauseMenu/GameOverScreen (`useFocusTrap.test.tsx`), ch-picker PauseMenu — behavioral (`crosshairSettings.test.tsx`); 857 тестов.

## [K] ACCESSIBILITY & POLISH
- [x] K1: Document graphics preset matrix → `Docs/Architecture/Graphics_Presets_Matrix.md`; no code gaps.
- [x] K4: a11y boot/error surfaces — `role="alert"`, canvas `role="img"` + `aria-label`; пин M16 в `uiUxPresentation.test.ts`, контракт — Standard_UI_Input §7.
- [ ] K2: Team-color palette colorblind-safety check (HUD + minimap blips). — аудит: регрессии нет (blue/red + недискретные признаки: буквы A/B/C, размер своего блипа), пункт остаётся открытым до verdict.
- [x] K3: Решение Desktop Only — зафиксировано архитектурное решение (клавиатура + мышь с Pointer Lock API, без тач-управления) в README.md и `Docs/GDD/Approved/Player_Controls.md`.
- [x] K5: aria-hidden — фикс 2026-09-15: все декоративные иконки (GameOverScreen Wrench, MainMenu Play/Shuffle, MapSelect Play, HudFeed VolumeX/Volume2) скрыты; aria-label-див скорборда получил `role="img"`; контракт §7 расширен пинами в `uiUxPresentation.test.ts` (глобальный инвариант «bicon ⇒ aria-hidden» + точечные).
- [x] K6: CountUp — фикс 2026-09-15: `prefers-reduced-motion: reduce` → сразу финальное число (как миникарта/CSS); source-пин в `uiUxPresentation.test.ts`.

## [L] INFRASTRUCTURE, BACKEND & CLOUD
- [x] L1: Деплой на Vercel (CI/CD ветки main, Vite SPA) + подключение Supabase (Postgres, Auth, RLS, project tukylkqpvzltzqrnfutc) + локальные Agent Skills и MCP-мост Antigravity.
- [x] L2: Облачные профили игроков (Supabase Auth, таблица `profiles`, синхронизация прогресса с `RunState`, вход по username/email, мгновенная регистрация без писем, сброс пароля, гостевой режим) — `Cloud_Profiles_And_Auth.md`.
- [x] L3: Глобальная таблица лидеров — сделано 2026-09-22: таблица `leaderboard` (RLS SELECT-only, PK user_id, индекс score desc) + SECURITY DEFINER RPC `submit_leaderboard_entry` (клампы, username из profiles, upsert only-if-better, `matches_played`++) и `leaderboard_my_rank`; `LeaderboardService` (guest/error без throw), авто-отправка на `gameOver` в `useGameBootstrap` (моно-токен), статус на `GameOverScreen`, `LeaderboardModal` из MainMenu/GameOver; пины `leaderboardService.test.ts`, `LeaderboardModal.test.tsx`, `uiWiringPins.test.ts` (L3); GDD [[Leaderboard]].
- [x] L4: Сетевой реалтайм мультиплеер (Supabase Realtime Broadcast + Presence, RPC комнат/паролей/быстрой игры, NetworkSession host-authority match + shooter-authority combat, боты хоста `bot:N`, drop-in yield, NetworkSyncStage, интерполяция RemotePlayerManager, ServerBrowserModal, CreateServerModal) — [[Docs/GDD/Approved/Multiplayer_Lobby_And_Rooms|Multiplayer_Lobby_And_Rooms]], [[Docs/Architecture/Standard_Multiplayer|Standard_Multiplayer]].

