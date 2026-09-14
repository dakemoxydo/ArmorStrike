# Target Highlight on Aim — подсветка врага в прицеле

**Статус:** Approved (P7)  
**Слой:** Presentation (симуляционная стадия, без влияния на бой)  
**Связано:** [[Tank_Aim]], [[Player_Controls]], [[AI_Bots]], [[Team_Deathmatch]]

## Назначение

Когда вражеский танк попадает в узкий конус направления прицела игрока
(плюс дальность оружия и прямая видимость), загорается **красная обводка** по
внешнему силуэту модели целиком (без внутренних контуров деталей): тёмный
контр-кант + чёткая красная линия + мягкое аддитивное свечение-ореол снаружи,
слегка «дышащее»; толщины почти постоянны на экране (дистанционная поправка).
Чистый инфо-фидбек: урон, аим и ИИ не меняются.

## Условие подсветки

Для каждого танка `t` из ростера:

```
t.alive && isEnemy(player, t)                       // TDM/CP: союзники не светятся
dist = |t.pos - player.pos|  (XZ)
dist ≤ player.params.range                          // дальность оружия (75/120/22 м)
dot(aimDir, normalize(t.pos - player.pos)) ≥ cos(halfCone)   // XZ
losClear(player.pos, t.pos, arena.colliders)        // без «рентгена» сквозь стены
```

- `aimDir = (sin(aimYaw), 0, cos(aimYaw))` — то же направление, что у `TankEntity.aimDir` (см. [[Tank_Aim]]).
- Полуугол конуса (`aimConeRadFor`):
  - пушка / рельса: `TARGET_HIGHLIGHT.coneRad` ≈ **4°**;
  - огнемёт: `WEAPON_TUNING.flamethrower.coneAngle * 0.5` = **22.5°** (подсветка
    честно следует боевому конусу оружия).
- Из нескольких целей выбирается **одна** — с наибольшим `dot` (ближайшая к центру
  прицела). Отсечение по LOS не «сжигает» остальных кандидатов.

## Гистерезис (anti-flicker)

`AimHighlighter` держит цель ещё `TARGET_HIGHLIGHT.holdSec = 0.15 с` после выхода
из конуса — обводка не мигает на границе. Удержание **рвётся мгновенно**, если:

- цель умерла (`!alive`);
- пропала прямая видимость (зашла за стену);
- игрок умер / ростер очищен (`onRosterCleared`).

## Визуал

Только на вражеском танке; прицел игрока не меняется. Эволюция по фидбеку:
P7 — «не у прицела» (красное glow-кольцо вокруг танка), P8 — «не кольцо под
танком» (fresnel-glow по материалу), P9 — «обводка модели» → inverted hull,
P10 — «сделай красивее» → двухслойный outline (core + additive halo + дыхание),
P11 — «обводка только по силуэту, а не каждой детали, и толще» → shell-слои
режутся stencil-маской (см. таблицу), толщины подняты до 0.09 / 0.28 м;
P12 — «ещё толще» → 0.14 / 0.42 м;
P13 — «красивее»: **C** экранные толщины (dist-mix сдвиг shell'ов) + **E** тёмный
контр-кант rim третьим shell-слоем под core.

| Элемент | Реализация |
|---------|------------|
| Силуэтная маска | невидимый mask-меш на каждую деталь (та же геометрия, `MeshBasicMaterial`: `colorWrite:false`, `depthWrite:false`, `DoubleSide`, stencil `Always → Replace` бита 1, `renderOrder:-12` — раньше всей opaque-очереди). Union экранных проекций всех деталей = силуэт машины; стыки деталей под маску попадают и обводкой не покрываются |
| Слой rim (контр-кант, E) | тёмный shell между силуэтом и красной линией: `MeshBasicMaterial` `0x0b0a10`, `BackSide`, opaque (`renderOrder:-6` — после маски, до core), сдвиг `coreWidth + rimWidth`. Core (ближе по depth) перекрывает его изнутри ⇒ снаружи линии видно тёмное кольцо `rimWidth` — обводка держит контраст на снегу/небе; halo (дальше всех) под rim режется depth-тестом, свечение начинается от наружного края канта |
| Слой core | чёткая линия силуэта: shell-меш (та же геометрия, `MeshBasicMaterial` `0xff2d3c`, `BackSide`, `toneMapped:false`, обычный blend) с вершинным сдвигом `transformed += normalize(normal) * (uOutlineWidth * mix(1, dist/uWidthRefDist, uWidthDistMix))`, где `dist = length(viewPos)` невытолкнутой вершины; stencil-тест `Equal 0` (`stencilWriteMask:0` — только тест, без записи) ⇒ рисуется вне маски |
| Слой halo | шире core, `AdditiveBlending`, `depthWrite:false`; тот же stencil-тест `Equal 0` и та же экранная поправка; во фрагменте яркость затухает от линии наружу: `outgoingLight *= pow(clamp(abs(dot(N,V))*haloFall,0,1), haloExp) * uHaloIntensity` (N/V — view-space нормаль и направление на камеру shell-вершины). Мягкое красное свечение вдоль внешнего контура |
| Толщины | `TARGET_HIGHLIGHT.coreWidth = 0.14 м`, `haloWidth = 0.42 м`, `rimWidth = 0.05 м` (полоска канта снаружи линии); `rimColor = 0x0b0a10`; форма спада `haloFall = 2.6`, `haloExp = 1.6` |
| Экранная поправка (C) | `widthRefDist = 60 м` (дистанция номинальных толщин), `widthDistMix = 0.6` (0 — чистые метры, 1 — постоянная толщина на экране); uniform'ы `uWidthRefDist`/`uWidthDistMix` общие на rim/core/halo ⇒ полоски остаются пропорциональными на любой дистанции |
| Дыхание | интенсивность halo `pulse.base ± amp` (`0.85 ± 0.25`), ω=`speed` (3.2 рад/с) — стадия пишет одно число в общий uniform кадра, когда цель видна |
| Меш-coverage | «железо» = только меши с `MeshStandardMaterial` (корпус/башня/ствол/гусеницы): они и обводятся, и пишут маску; командное кольцо и лампы — MeshBasic, не трогаются |
| Синхронизация | mask/rim/core/halo-меши — дети исходных мешей с identity-трансформом: поворот башни и наклон ствола наследуются бесплатно, отдельных апдейтов нет |
| Occlusion | обычный depth-test у обоих слоёв: сквозь стены обводка не видна (согласно LOS-правилу); маска глубины не пишет |
| Stencil-буфер | контекст `WebGLRenderer({stencil:true})` + `stencilBuffer:true` на обоих RT композера (`RenderWorld.ts`); автоочистка (`autoClearStencil` / `RenderPass`) гасит маску каждый кадр |
| Деталь r185 | в `meshbasic_vert` `objectNormal` объявлен условно (`#ifdef USE_ENVMAP/USE_SKINNING`) — сдвиг берёт атрибут `normal` из вершинного префикса WebGLProgram; `material.stencilWrite` в three включает весь stencil-конвейер (и тест, и запись), поэтому shell'ам запись обнулена через `stencilWriteMask:0` |

## Канал состояния

Стадия презентационная: пишет только в `visible` shell-мешей цели (mask+rim+core+halo)
и в один общий uniform интенсивности halo,
**не** имеет выхода в HUD. `HudSnapshot.targetHot`, краснеющий прицел (P7) и
glow-кольцо под танком (P8) убраны по фидбеку.

## Порядок тика

Стадия **11** из 16 (`buildSimulationStages`): после `PhysicsSystemStage`
(позиции финальны после коллизий), перед `ProjectileStage`. Вне боя (`!combatLive`)
симуляция не тикает — обводка остаётся на последнем состоянии; при смерти игрока
стадия гасит её и сбрасывает удержание.

## Бюджет

- Выбор — один проход O(N) по ростеру (N ≤ 11), без аллокаций на кадр.
- `losClear` (slab-тест по AABB с broad-phase) только для кандидатов, уже
  прошедших конус и dot-соревнование — обычно 0–2 за кадр.
- Пост-эффектов / OutlinePass нет. Пока цель не подсвечена — 0 затрат.
  При подсветке одного врага: +4·N draw calls (N ≈ число мешей корпуса,
  mask+rim+core+halo; маска — без цвета и глубины, только растеризация) и 3 общие
  шейдерные программы shell-слоёв (по одной на rim/core/halo, все танки) + ванильная
  MeshBasic-программа маски. Shell-меши строятся один раз на танк и
  переиспользуются (`group.userData.aimOutline`), геометрия общая с оригиналом,
  все четыре материала `markShared` (disposeObject3D пропускает). «Дыхание» — одна
  запись в uniform на кадр.

## Классы и файлы

| Класс / символ | Файл | Роль |
|----------------|------|------|
| `TARGET_HIGHLIGHT` | `src/game/tuning.ts` | конус 4°, hold 0.15 с, цвета, толщины core/halo/rim, экранный dist-mix, форма спада, pulse |
| `aimConeRadFor`, `selectAimedEnemy`, `AimHighlighter` | `src/game/targetHighlight.ts` | чистая логика (без Three.js) |
| `TargetHighlightStage` | `src/game/engine/stages/TargetHighlightStage.ts` | стадия: выбор/удержание цели, вкл/выкл обводки, дыхание |
| `setTankOutline`, `setOutlineIntensity`, `AIM_OUTLINE_KEY` | `src/game/tank/modelOutline.ts` | stencil-маска силуэта + shell-меши rim/core/halo (трёхслойный inverted hull с dist-mix) |
| `RenderWorld` (renderer/composer) | `src/game/RenderWorld.ts` | stencil-буфер кадра для маски: контекст `stencil:true` + RT композера |

## Тесты

`src/__tests__/targetHighlight.test.ts` (20): конус/дальность/LOS/командность,
выбор ближайшей к центру, «стена не сжигает кандидатов», огнемёт vs узкий конус,
гистерезис и его мгновенный разрыв (смерть/стена), стадии-интеграция (четвёрки
mask+rim+core+halo только на Standard-мешах, BackSide/blend/depthWrite, родитель —
меш корпуса; stencil-контракт силуэта: маска Always→Replace бита 1, порядок
mask < rim < core, все три shell-слоя Equal 0 без записи; стабы шейдеров: толщины
слоёв (rim = core + rimWidth), экранный сдвиг с общими uWidthRefDist/uWidthDistMix,
fresnel-затухание, uniform интенсивности;
пульс в коридоре pulse; переключение цели, смерть игрока, сброс удержания после
респауна, onRosterCleared).
`src/__tests__/renderWorldQuality.test.ts`: моки композера несут `renderTarget1/2`
и проверяют `stencilBuffer:true` после пересборки bloom-рига.
