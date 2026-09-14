# Target Highlight on Aim — подсветка врага в прицеле

**Статус:** Approved (P7)  
**Слой:** Presentation (симуляционная стадия, без влияния на бой)  
**Связано:** [[Tank_Aim]], [[Player_Controls]], [[AI_Bots]], [[Team_Deathmatch]]

## Назначение

Когда вражеский танк попадает в узкий конус направления прицела игрока
(плюс дальность оружия и прямая видимость), по силуэту его модели загорается
**красная обводка**: тонкая чёткая линия + мягкое аддитивное свечение-ореол
снаружи, слегка «дышащее». Чистый инфо-фидбек: урон, аим и ИИ не меняются.

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
P10 — «сделай красивее» → двухслойный outline (core + additive halo + дыхание).

| Элемент | Реализация |
|---------|------------|
| Слой core | тонкая сплошная линия силуэта: shell-меш (та же геометрия, `MeshBasicMaterial` `0xff2d3c`, `BackSide`, `toneMapped:false`, обычный blend) с вершинным сдвигом `transformed += normalize(normal) * coreWidth` |
| Слой halo | шире core, `AdditiveBlending`, `depthWrite:false`; во фрагменте яркость затухает от линии наружу: `outgoingLight *= pow(clamp(abs(dot(N,V))*haloFall,0,1), haloExp) * uHaloIntensity` (N/V — view-space нормаль и направление на камеру shell-вершины). Мягкое красное свечение, маскирующее стыки на углах коробок |
| Толщины | `TARGET_HIGHLIGHT.coreWidth = 0.05 м`, `haloWidth = 0.17 м`; форма спада `haloFall = 2.6`, `haloExp = 1.6` |
| Дыхание | интенсивность halo `pulse.base ± amp` (`0.85 ± 0.25`), ω=`speed` (3.2 рад/с) — стадия пишет одно число в общий uniform кадра, когда цель видна |
| Меш-coverage | обводятся только меши с `MeshStandardMaterial` (корпус/башня/ствол/гусеницы); командное кольцо и лампы — MeshBasic, не трогаются |
| Синхронизация | shell-меши — дети исходных мешей с identity-трансформом: поворот башни и наклон ствола наследуются бесплатно, отдельных апдейтов нет |
| Occlusion | обычный depth-test у обоих слоёв: сквозь стены обводка не видна (согласно LOS-правилу) |
| Деталь r185 | в `meshbasic_vert` `objectNormal` объявлен условно (`#ifdef USE_ENVMAP/USE_SKINNING`) — сдвиг берёт атрибут `normal` из вершинного префикса WebGLProgram |

## Канал состояния

Стадия презентационная: пишет только в `visible` shell-мешей цели и в один
общий uniform интенсивности halo,
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
  При подсветке одного врага: +2·N draw calls (N ≈ число мешей корпуса,
  core+halo) и 2 общие шейдерные программы (по одной на слой, все танки);
  shell-меши строятся один раз на танк и переиспользуются
  (`group.userData.aimOutline`), геометрия общая с оригиналом, оба материала
  `markShared` (disposeObject3D пропускает). «Дыхание» — одна запись в
  uniform на кадр.

## Классы и файлы

| Класс / символ | Файл | Роль |
|----------------|------|------|
| `TARGET_HIGHLIGHT` | `src/game/tuning.ts` | конус 4°, hold 0.15 с, цвет, толщины core/halo, форма спада, pulse |
| `aimConeRadFor`, `selectAimedEnemy`, `AimHighlighter` | `src/game/targetHighlight.ts` | чистая логика (без Three.js) |
| `TargetHighlightStage` | `src/game/engine/stages/TargetHighlightStage.ts` | стадия: выбор/удержание цели, вкл/выкл обводки, дыхание |
| `setTankOutline`, `setOutlineIntensity`, `AIM_OUTLINE_KEY` | `src/game/tank/modelOutline.ts` | двухслойные inverted-hull shell-меши модели |

## Тесты

`src/__tests__/targetHighlight.test.ts` (17): конус/дальность/LOS/командность,
выбор ближайшей к центру, «стена не сжигает кандидатов», огнемёт vs узкий конус,
гистерезис и его мгновенный разрыв (смерть/стена), стадии-интеграция (core+halo
только на Standard-мешах, BackSide/Additive/depthWrite, родитель — меш корпуса;
стабы шейдеров обоих слоёв: толщина, fresnel-затухание, uniform интенсивности;
пульс в коридоре pulse; переключение цели, смерть игрока, сброс удержания после
респауна, onRosterCleared).
