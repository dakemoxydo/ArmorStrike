# GDD — Стилизованный Low-Poly / Cel-Shaded / Комикс арт-дирекшен

**Статус:** Approved  
**Код:** `src/game/shaders/celShading.ts`, `src/game/tank/comicInkOutline.ts`, `src/game/tank/TankFactory.ts`, `src/game/atmospherePresets.ts`, `src/game/textures/tank.ts`, `src/game/textures/ground.ts`, `src/game/RenderWorld.ts`, `src/game/nameplate.ts`, `src/styles/hud.css`, `src/game/arena/cityMap.ts`, `src/game/effects/WreckSystem.ts`, `src/game/menuStage.ts`

---

## Назначение

Переход визуального стиля ArmorStrike из тёмного PBR-реализма в выразительный, высококонтрастный **стилизованный Cel-Shaded / Комикс арт-дирекшен** (в духе *Borderlands*, *SYNTHETIK*, *Team Fortress 2*).

Стилизация решает три ключевые проблемы:
1. **Процедурная геометрия:** угловатость процедурных лоу-поли моделей танков (`partKit.ts`) становится художественным стилем, а не техническим недостатком.
2. **Читаемость сцены:** замена ночной и натриевой мглы на сочный дневной свет с контрастными тенями делает технику мгновенно различимой на арене.
3. **Отсутствие шума:** замена мелкого Perlin-шума и грязи на чёткие графичные панели брони, швы и заклёпки устраняет алиасинг и мерцание при отдалении камеры.

---

## Ключевые компоненты

### 1. Ступенчатый шейдинг освещения (Cel-Shading)
- **Файл:** `src/game/shaders/celShading.ts` (`applyCelShading`)
- **Механизм:** GLSL-инжекция в `<lights_physical_fragment>` стандартного PBR-материала `MeshStandardMaterial` через `onBeforeCompile`.
- **Математика:**
  - Рассеянный свет: `length(reflectedLight.directDiffuse)` квантуется на 4 уровня с микро-рампами сглаживания порогов (`smoothstep(0.25, 0.75, fract)`), защитным порогом теней `0.32` и балансным блендом `mix(raw, stepped, 0.68)`, сохраняющим мягкую форму и объем без алиасинга.
  - Блики: `reflectedLight.directSpecular` обрабатывается сглаженным порогом `smoothstep(0.10, 0.22, sLum)` для сочного графичного блика без пиксельного мерцания.
- **Производительность:** 0 дополнительных проходов рендера, 0 пост-процессинг оверхеда, сохраняется полная совместимость с Three.js r185.

### 2. Чернильный контур силуэта (Comic Ink Outline)
- **Файл:** `src/game/tank/comicInkOutline.ts` (`attachComicInkOutline`)
- **Механизм:** Inverted-hull shell (`THREE.BackSide`) на геометриях корпуса, башни и ствола.
- **Математика:** Выталкивание вершин вдоль нормали в вершинном шейдере:
  $$\text{push} = \text{width} \cdot \text{mix}\left(1.0, \frac{\text{dist}}{\text{refDist}}, \text{distMix}\right)$$
  Ширина контура: `0.012` м (аккуратный тонкий hairline-контур), `refDist = 45.0`, `distMix = 0.38`.
  Обеспечивает стабильную видимость контура: не исчезает на дистанции и не утолщается вблизи.

### 3. Графичные текстуры техники
- **Файл:** `src/game/textures/tank.ts` (`camoTexture`, `trackTexture`)
- **Броня:** Крупные геометрические камуфляжные блоки без грязевого шума, разделительные чернильные швы толщиной 3px (`#10141a`), светлые фаски плит и графичные заклёпки с бликами.
- **Гусеницы:** Высококонтрастные стальные траки с шевронами грунтозацепов и акцентными торцевыми соединителями без мусора.

### 4. Атмосфера и освещение арен (Comic Daylights)
- **Файл:** `src/game/atmospherePresets.ts`
- **Город (`city`):** *Comic Metropolis Noon* — лазурное чистое небо, солнечная экспозиция `1.15`, чистый белый прямой свет `sunIntensity: 2.5`, контрастные тени, зелёные бульвары и чистая белая разметка.
- **Завод (`factory`):** *Comic Industrial Daylight* — чистый контрастный дневной свет без желтизны, экспозиция `1.15`, белый свет `sunIntensity: 2.5`, глубокие графичные тени, стальной бетон, дикорастущая зелень.
- **Деревня (`village`):** *Comic Pastoral Daylight* — свежий солнечный день, сочное природное освещение, экспозиция `1.18`, насыщенный изумрудный газон, полевые цветы и светлая брусчатка.

### 5. Комиксный фидбек урона и уведомлений
- **Файл:** `src/styles/hud.css` (`.dmg-float`, `.frag-popup`, `.streak-banner`, `.incoming-lock-box`)
- Жирный гротеск с чернильной 8-сторонней обводкой `text-shadow`, наклон `skewX(-7deg)`, подпрыгивающая анимация всплеска.
- Цветовая кодировка урона: белый — стандартный, огненно-желтый — крит, ярко-красный — добивание, сочный салатовый — хил, циан — крит лечения.
- Фраги и серии убийств: крупный наклонный шрифт с чернильным контуром 8-направлений, яркие акценты `#38ef7d` / `#ffcc00` и динамичный всплеск.
- Тревога автозахвата: комиксный бабл с чернильной рамкой 2.5px `#0b0e14` и тревожным смещением тени.

### 6. Toon / Comics интерфейс и панели
- **Файлы:** `src/styles/variables.css`, `src/styles/buttons.css`, `src/styles/hud.css`, `src/styles/overlays.css`, `src/styles/garage.css`
- **Панели (`.hud-panel`):** Чернильный контур `--panel-line: #0b0e14`, плотная подложка комиксной бумаги, жёсткая 3D-тень с чернильным дропом `0 5px 0 #0b0e14` взамен размытого неонового свечения.
- **Экшен-кнопки (`.btn-game`, `.btn-primary`, `.btn-ghost`, `.btn-danger`):** Чернильная оправа `inset 0 0 0 2px #0b0e14`, тактильное нажатие `translateY(2px)` с плоской фаской `0 1px 0 #0b0e14`, яркие комиксные градиенты (электрик-циан / изумруд / алый).
- **Заголовки и оверлеи:** Объёмный 3D-экструд с чернильной тенью в стиле комиксов, полутоновый растр Ben-Day dots взамен CRT-полос.
- **Индикаторы HUD:** Чёткие чернильные рамки полос HP и нитро, двойная чернильная кайма прицела для максимальной контрастности на ярком солнце.

### 7. Cel-Shaded окружение арены
- **Файлы:** `src/game/ArenaBuilder.ts`, `src/game/Arena.ts`, `src/game/shaders/celShading.ts` (`applyCelShadingToObject`, `isCelShaded`), `src/game/match/CaptureMarkers.ts`
- Все здания, стены, контейнеры, трубы и постройки арены получают `applyCelShading`, объединяя технику и мир в единый 4-уровневый комиксный конвейер (`CEL_STEPS = 4.0`). Точечное покрытие (`Arena.box` / `Arena.addColliderBlock`) + страховочный проход `applyCelShadingToObject(arena.group)` в `buildArena` ловят и прямые `new THREE.Mesh` без коллайдера (трубы, фермы крана, опоры эстакады, скайлайн, растительность). Пин — `src/__tests__/arenaCelShading.test.ts` (все 3 карты, включая rebuild).
- Мировые маркеры точек захвата A/B/C оформлены в виде круглых комиксных бейджей с чернильным контуром толщиной 8px `#0b0e14`, шрифтом `'Russo One'` и объёмной чернильной подложкой.

### 8. Свет без киношного IBL
- **Файл:** `src/game/RenderWorld.ts`
- `LinearToneMapping` + `scene.environment = null`. ACES + RoomEnvironment PMREM заливали cel-ступени.
- Bloom выключен на всех пресетах (размывает ink-outline).

### 9. Земля без перлина
- **Файл:** `src/game/textures/ground.ts`
- Завод: закатный бетон `#b89a72`, янтарные швы и CP. Деревня: зелёные плашки полей + грунтовые дороги. Город: дневной асфальт `#7a8490` и плиты с чернильным швом. Вызовов `noise()` нет.

### 10. Идентичность игрока
- **Файлы:** `src/core/constants.ts` (`COLORS.player = 0xf59e0b`), `src/core/TankCatalog.ts`
- FFA-камуфляж оливково-янтарный (`#6b7a32` / `#d4c070`), не мята. UI-хром (модалки, гараж, миникарта «я») — янтарь `--accent`. Цвет рельсы/Изиды (`#2ee6c0`) остаётся оружейным, не акцентным.

### 11. Трассер Смоки
- **Файлы:** `src/game/engine/Projectile.ts`, `src/game/engine/ProjectileBehavior.ts`
- Пуловый аддитивный конус-ribbon за болтом. `trailPuff` на снаряде не вызывается (`trailInterval = Infinity`).

### 12. Неймплейты
- **Файлы:** `src/game/nameplate.ts`, `src/game/engine/systems/NameplateSystem.ts`
- Срез угла, `Russo One`, 8-dir чернила, HP как HUD. Fade/scale от дистанции до локального игрока: непрозрачны до 48 м, исчезают к 110 м (E2).

### 13. Чернильный контур крупных зданий
- **Файлы:** `src/game/arena/buildingInk.ts` (`shouldOutlineBuilding`, `attachBuildingInkOutline`), `src/game/Arena.ts` (`addColliderBlock`)
- Тот же inverted-hull приём, что у танков, но свой shared-материал `buildingInk` шириной `0.10` м (танковый hairline `0.012` м с дистанции не читается) с той же дистанционной компенсацией (`refDist 45.0`, `distMix 0.38`). Ноль render-проходов, активен на всех тирах качества.
- Селектор: только несущие wall-блоки выше порога (`h ≥ 4` м и `max(w,d) ≥ 8` м или `h ≥ 8` м — цеха, офисы, дома, амбары, часовня, цистерны, трубы, ноги крана). Рампы, контейнеры (`block`), мелочь, InstancedMesh-декор и скайлайн — мимо.
- До `≤2` шеллов на корпус (крупнейшие массы: тело + крыша), отсев субмешей по AABB (`min ≥ 1.5` м, `max ≥ 5` м — двери/окна/полосы мимо). Шеллы — дети исходных мешей: удаляются вместе с блоком, shared-ресурсы переживают dispose.
- Бюджет: census factory 545→601 (+10.3%) / village 790→860 (+8.9%) / city 484→532 (+9.9%) — все в лимите +15% (Visual_Coherence_Pass п.10).

### 14. Небо графичными пятнами (мир / свет)
- **Файл:** `src/game/RenderWorld.ts` (fragment-шейдер sky-меша)
- Три плоские полосы по высоте (`step`-ветвление zenith/mid/horizon), пятна облаков через жёсткий `step(0.38, field)` с нижней границей по высоте, плоский диск солнца `step(0.998)` с чернильным кольцом. Без smoothstep-градиентов, pow-свечений и атмосферного рассеяния — небо говорит на языке печатной краски, как и остальной мир.

### 15. Дневной комикс-мегаполис (мир)
- **Файлы:** `src/game/arena/cityMap.ts`, `src/game/textures/signs.ts` (`posterTexture`)
- OQ2: город днём. Вывески — нарисованные плакаты (`MeshBasicMaterial` + `posterTexture`: бумага, цвет-панель, Ben-Day, ink-бордюр), не emissive-неон. `glass()` без emissive — графичная сетка окон; скайлайн — пастельные дневные тона `[0xd8ecff, 0xffe6b0, 0xbfe0f5]`. `NEON` — «плоская палитра краски» (cyan/magenta/lime как краска под солнцем), не источник света: столб/капитель плазы normal-blending, under-strip эстакады — чернильная тень `0x1a2230`, ramp/crate/dome — без emissive/additive, dust — дневной `0xdfe8f0`. Пин — `cityMap.test.ts` («no emissive glow or additive mesh blending»).

### 16. Остов = тот же корпус (FX)
- **Файл:** `src/game/effects/WreckSystem.ts` (`hullSilhouette`, `turretSilhouette`, `WreckSystem.spawn`)
- Слитый силуэт слотов `hullGeometry(hullId)` + сбитая башня `turretGeometry(turretId)` (в покойном положении ствола) в графитном cel-материале `0x35353d` (`applyCelShading`), 2–3 ember-плашки `CircleGeometry` и столб дыма — язык танков, не «другой движок» с примитивным боксом. Процесс-кэш силуэтов помечен `markShared` (teardown пропускает), слоты преаллоцированы — ноль аллокаций геометрии в бою (см. шапку файла про releaseProgram). Проброс `hullId`/`turretId` через `EffectsPort.spawnWreck` → `CombatSystem`. Пины — `wreckSilhouette.test.ts`.

### 17. Подиум меню/гаража, не пустота (мир / первый кадр)
- **Файлы:** `src/game/menuStage.ts`, `src/game/textures/stage.ts`, `src/game/PreviewController.ts`, `src/game/GameModeController.ts`, `src/game/RenderWorld.ts` (`setFogEnabled`)
- `MenuStage`: бумажный пол r=26 + подиум (верх ровно на `PREVIEW_POS`, Ben-Day cap + янтарное кольцо + чернильный рим) + цикл-стена BackSide — камера (menu r=16, garage ≤18) всегда внутри бумаги. В режимах menu/garage `GameModeController.setMode` скрывает `arena.group` и выключает туман (`setFogEnabled(false)` — near/far за пределом сцены, объект Fog остаётся); видимостью сцены гейтит `PreviewController.setVisible` (тот же гейт, что у танка). Старт раунда возвращает арену (`group.visible = true` перед rebuild), туман — `applyAtmosphere` пресета. Boot-синк — в `GameBootstrap`. Пины — `menuStage.test.ts`, `gameModeLifecycle.test.ts`, `renderWorldQuality.test.ts`.

---

## Тесты и инварианты

- `src/__tests__/comicStyle.test.ts` — верификация `applyCelShading`, чернильного контура танков, текстур, применения cel-shading к геометрии уровней, дизайн-токенов чернильного UI, янтаря игрока, земли без `noise()`, LinearToneMapping без IBL/bloom.
- `src/__tests__/arenaCelShading.test.ts` — пин покрытия: каждый `MeshStandardMaterial` `arena.group` на factory/city/village (включая rebuild) имеет флаг `isCelShaded`.
- `src/__tests__/buildingInk.test.ts` — пин outline зданий: селектор `shouldOutlineBuilding`, отсев мелочи/InstancedMesh/Basic, лимит шеллов, идемпотентность, контур на всех 3 картах в бюджете (включая rebuild).
- `src/__tests__/cityMap.test.ts` — геометрические контракты city + пин дневного комикса: ни одного emissive/additive-материала в контенте (п.15).
- `src/__tests__/wreckSilhouette.test.ts` — силуэт остова: merge по всем hullId/turretId, процесс-кэш + markShared, spawn свапает слот на геометрию погибшего (п.16).
- `src/__tests__/menuStage.test.ts` — состав сцены подиума, геометрия под `PREVIEW_POS`, цикл-стена внутри орбит камеры, memoization stage-текстур (п.17).
- `src/__tests__/gameModeLifecycle.test.ts` — stage gating: арена и туман скрыты в menu/garage, возвращены к бою; арена видима к rebuild раунда.
- `src/__tests__/renderWorldQuality.test.ts` — `setFogEnabled`: fog выключается out-of-range near/far и восстанавливается из пресета текущей карты.
- `src/__tests__/nameplate.test.ts` — срез/Russo One, fade 48–110 м от наблюдателя.
- `src/__tests__/atmospherePresets.test.ts` — пины экспозиции и параметров комиксных атмосфер.
- `src/__tests__/uiUxPresentation.test.ts` — соблюдение дизайн-токенов свечений, срезов, шрифтовой разрядки и контрастности.
- `src/__tests__/lowFixesBatch.test.ts` — инвариант перерисовки канваса букв точек захвата (B10).
