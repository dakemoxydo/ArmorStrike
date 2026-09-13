# Garage Viewport Safe Zone — кадрирование предпросмотра в свободной зоне

**Статус:** Approved (реализовано, Verified)
**Слой:** Meta / UI + камера
**Связано:** [[Garage_Loadout]], [[UI_Polish]], `Standard_UI_Safe_Zone` (Architecture)
**Дата:** 2026-09-12

## Проблема

Камера гаража целилась в центр танка (`garageTargetY = PREVIEW_POS.y + 0.8`),
поэтому предпросмотр стоял в геометрическом центре вьюпорта, а нижний док
(подпись + 5 карточек с описаниями и барами + паспорт) занимал ~45% высоты на
широких экранах — нижняя половина танка скрывалась за карточками.

## Решение — safe-zone framing

UI сообщает фактический след (CSS px по краям вьюпорта), камера центрирует танк
в оставшемся свободном прямоугольнике **проекционным сдвигом**:

```
camera.setViewOffset(fullW, fullH, dx, dy, fullW, fullH)
dx = (rightCover − leftCover) / 2     // паспорт справа → танк чуть левее
dy = (bottomCover − topCover) / 2     // док снизу → танк уезжает вверх
```

Ключевые свойства:

- **Пивот орбиты не двигается.** Orbit по-прежнему вокруг танка
  (`GarageCameraMode`), вращение мышью «крутит танк на месте». Взгляд-на-точку-
  ниже-центра не годится: танк бы гулял при вращении.
- **Источник истины — DOM.** `Garage.tsx` измеряет шапку, док и паспорт
  (`ResizeObserver` + `resize`), пушит инсет только при изменении (ключ-строка).
  Переживает смену раскладок: 5↔3 карточек, паспорт-док `lg+`, мобильный стек.
- **Гараж-онли.** Сдвиг ставится только в режиме `garage`; при выходе —
  `clearViewOffset()`; остальные режимы (menu/playing/over) не затронуты.
- Работает с bloom-путём: сдвиг запечён в проекционную матрицу.

## Поток данных

```
Garage.tsx (ResizeObserver)
  → GameApi.setGarageViewportInset(inset | null)   // CSS px {top,right,bottom,left}
  → CameraRig.setGarageInset()
  → CameraRig.update() → applyGarageViewOffset()   // per-frame, с guard'ом
```

- Инсеты: `top = header.bottom`, `bottom = vh − dock.top`,
  `right = vw − passport.left` **только** когда паспорт в ряд с доком
  (`pr.top <= dock.top + 2`), иначе `0` (в стеке паспорт внутри дока).
- Per-frame guard: пересборка проекции только если `|Δdx| ≥ 0.25` или `|Δdy| ≥ 0.25`
  px или сменился размер вьюпорта; при `|dx| < 0.5 && |dy| < 0.5` офсет снимается.
  Размер вьюпорта (`setViewportSize`) держит `onResize` в bootstrap.

## Peek-осмотр

Пока игрок вращает танк (drag), док скрывается и кадр освобождается:

- `GarageInput`: peek включается на первом заметном движении drag
  (накопленный путь `dragDist > 6` px — короткий клик не триггерит), выключается
  на `pointerup` и на `detach()` (размонтирование в середине drag не «застревает»).
- Два потребителя одного состояния: `cameraRig.garagePeek` (камера) и событие
  `{ type: 'garagePeek'; value: boolean }` → `Garage.tsx` ставит класс
  `garage-peek` на корень → CSS: `.garage-peek .garage-bottom { translateY(14%); opacity: 0 }`.
- Камера демпфирует покрытие дока/паспорта к нулю (`peekCover`, rate 7): танк
  плавно возвращается в центр кадра, инсет шапки не гаснет (шапка остаётся).
- `prefers-reduced-motion: reduce` → `transition: none` у `.garage-bottom`.

## Компактные карточки

- Описания убраны из карточек (`HullCard`/`TurretCard`): паспорт справа несёт
  факты, флейвор доступен в нативном тултипе (`title`).
- Бары остались — они дают сравнение «на глаз» по ряду, чего паспорт не умеет.
- Сетка `.garage-card` сохранена (`grid-template-rows: auto auto 1fr auto`);
  блок характеристик встаёт в `1fr`-ряд — выравнивание рядов U24 сохранено.
- Отступ карточек `p-4` → `p-3`; высота дока примерно вдвое ниже.

## Вертикальная компактность дока

Высоту дока задавала колонка паспорта (панель + CTA ≈ вдвое выше ряда карточек):
`.garage-bottom` растягивался по ней, под карточками оставался пустой тёмный
пояс, а на низких окнах свободной зоны не хватало самому танку. Компактация:

- Панель паспорта: `p-5` → `p-3`, отступы `space-y-3` → `space-y-2`,
  чипы `p-2` → `px-2 py-1.5`, CTA `py-3.5` → `py-3`.
- Эхо выбора — **одна строка** `КОРПУС · БАШНЯ → Хантер · Рельсотрон` (таксономию
  несут цвета: циан — корпус, янтарь — башня, как в чипе сборки меню).
- Остаток высоты разбирает колонка карточек: `.garage-cards-col { justify-between }`
  — чип управления прижат к нижнему краю дока, ряд карточек по центру.
- `@media (max-height: 560px)`: `.garage-hint-label` и `.garage-weapon-tip`
  уходят (`display: none`) — необязательные подписи, факт дублируется чипами.

## Классы и файлы

| Символ | Файл |
|--------|------|
| `GarageViewportInset` | `src/game/types.ts` |
| `GameApi.setGarageViewportInset` | `src/game/GameApi.ts` / `Game.ts` |
| `CameraRig.garageInset / garagePeek / setViewportSize / applyGarageViewOffset` | `src/game/CameraRig.ts` |
| `GarageInput` (peek-машина, `onPeekChange`) | `src/ui/GarageInput.ts` |
| проводка peek → rig + событие, `setViewportSize` в `onResize` | `src/game/GameBootstrap.ts` |
| измерение инсетов, класс `garage-peek` | `src/components/Garage.tsx` |
| peek-CSS + reduced-motion | `src/styles/garage.css` |

Тесты: `src/__tests__/garageSafeZone.test.ts` (математика `dx/dy`, сброс при
выходе из гаража, демпфирование peek, жизненный цикл peek в `GarageInput`,
инварианты источника) + `Garage.test.tsx` (стабы нового контракта GameApi).

## Acceptance

- Дефолтная камера (`dist 9.5`, `pitch 0.32`): танк целиком в свободной зоне и
  на широких, и на узких раскладках — покрытие дока компенсируется сдвигом.
- Вращение мышью: пивот на танке, субъективно «крутится на месте».
- Выход в бой/меню: `clearViewOffset()` снял сдвиг; FOV/aspect-тесты зелёные.
- Инсеты пересчитываются при смене таба/брейкпоинта/ресайзе без измерений DOM
  в игровом цикле (только `ResizeObserver` + guard по ключу).
- **Verified:** `npm run typecheck` + `npm test` (65 файлов / 405 тестов) +
  `npm run lint` зелёные.
