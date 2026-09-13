# Standard: UI, HUD & Input

**Статус:** engineering standard  
**Код:** `GameApi`, `components/*`, `hooks/useGameHud`, `PlayerController`, `GarageInput`, `camera/*`  
**GDD:** [Player Controls](../GDD/Approved/Player_Controls.md), [Garage Loadout](../GDD/Approved/Garage_Loadout.md), [Game Lifecycle](../GDD/Approved/Game_Lifecycle.md)  
**Связано:** [Core](Core.md) · [Core Patterns](Core_Patterns.md) · [Standard Tank](Standard_Tank.md)

## 1. React ↛ Simulation

React-компоненты и хуки видят **только** `GameApi` (+ shared types / catalog meta).

```ts
interface GameApi {
  // commands
  setMode, startRound, setMatchMode, togglePause, ...
  setGarageSelection, toggleMute, cycleQuality, ...
  // subscriptions
  addListener / removeListener  // GameEvent
  setHudCallback               // HudSnapshot push
  // polls
  getHud, getMinimapStatic, fillMinimapDynamics, getCaptureMinimap
  dispose
}
```

Запрещено из UI:
- импорт `GameSimulation`, stages, systems, `TankEntity` internals
- прямой доступ к `scene` / Three objects (кроме canvas mount, который делает bootstrap)
- мутация `RunState` в обход API

Concrete `Game` **implements** `GameApi`; UI типизируется интерфейсом.

## 2. Two channels: events + HUD snapshot

| Канал | Когда | Примеры |
|-------|-------|---------|
| `GameEvent` | дискретные импульсы | hit, kill, shotFired, gameOver (scores, time, winner) |
| `HudSnapshot` | непрерывное состояние | HP, ammo, boost, score, matchMode, winTarget, timeLimitSec, `enemiesAlive`, `alive`/`respawnInSec`, teamKills/Score, capturePoints |

`useGameHud(game, active)`:
- подписка на events → vignette, feed, hitmark
- HUD callback / rAF path → refs для high-frequency bars (health, boost, flame fill, minimap canvas)
- `ammoForcesHudRender` / `isLowHealth` — pure helpers в `ui/hudPresentation.ts`

Правило perf: **не** `setState` каждый кадр для полосок; DOM refs + minimap canvas.

### Снапшот — один мутируемый объект. `memo` на нём не работает

`GameLoop` мутирует **один и тот же** объект `HudSnapshot` каждый кадр, `useGameHud`
копирует его в `snap.current` через `Object.assign`, а `HUD` читает `snap.current`.
Ссылка стабильна by design — иначе не было бы нулевых аллокаций на кадр.

Из этого следует правило для детей HUD:

> `memo`-компонент **нельзя** кормить объектом снапшота (или любым его срезом).
> Shallow-compare видит ту же ссылку и навсегда пропускает ре-рендер.

Реальный баг этого класса: `<MemoWeapon st={snap.current} />` заморозил панель оружия —
патроны и статус перезарядки не менялись после маунта (пинится
`src/__tests__/hudLiveUpdates.test.tsx`).

| Что передавать | Пример |
|---|---|
| примитивы полей | `ammo={st.ammo} reloading={st.reloading}` |
| стабильные refs | `healthRef`, `mapRef` |
| новые объекты/массивы из состояния | `hitmark`, `feed`, `scoreboard` (пересоздаются → memo перерисовывает) |

Тосты боя (`dmgArc`, `hitmark`, `frag`, `streak`, `vignette`) — **временные**: их снимает
таймер в `useGameHud` (`TOAST_MS`). Без таймера элементы не размонтировались бы никогда, и
под `prefers-reduced-motion` (где CSS-анимация выключена) висели бы на экране постоянно.

### Гейт ре-рендера — `ui/hudRenderGate.ts`

`hudNeedsRender(prev, next)` решает, нужен ли React-рендер после кадра. Логика **инвертирована**:
по умолчанию сравниваются **все** поля `HudSnapshot` через `Object.is`, а исключения — только
семантические категории:

| Категория | Поля | Правило |
|---|---|---|
| ref-painted | `health`, `boost`, `reloadProgress` | рисуются в DOM императивно, рендер не нужен никогда |
| continuous | `ammo` (огнемёт) | дискретные патроны рельсы/пушки форсят, энергия — нет |
| quantized | `timeSec`, `teamScoreAlpha/Bravo`, `respawnInSec` | сравнение по отображаемому значению (целые секунды) |
| by content | `scoreboard`, `capturePoints` | массивы пересоздаются каждый кадр; сравнение по содержимому (HP — шагом 1%, прогресс точки — 10%) |

Квантованность обязана совпадать с отрисовкой: полоса прогресса точки рисуется
`Math.floor(progress * 10) * 10`% — ровно те же 10%, что и в `captureStripKey`.

**Добавление поля в `HudSnapshot` не требует правки гейта** — оно попадает в сравнение
автоматически. Обратная ситуация (рукописный список полей) была источником багов: `maxHealth`
не сравнивался вовсе, а содержимое `scoreboard` — только по факту показа, поэтому открытое
табло не обновлялось.

## 3. Component layout

```
components/
  HUD.tsx + hud/*     # combat overlay (crosshair, vitals, radar, feed, weapon, scoreboard)
  MainMenu, Garage, ModeSelect, MapSelect, PauseMenu, GameOverScreen
  HullCard, TurretCard
hooks/
  useGameHud, useFocusTrap
ui/
  GarageInput, hudPresentation, hudRenderGate, keyboardTarget
styles/               # CSS by surface (hud, garage, overlays, …)
```

Flow: **ModeSelect → MapSelect → startRound**; results rematch skips ModeSelect.

Presentation CSS classes могут приходить из catalog (`weaponAccentClass`) — это data, не logic.

## 4. Player input (combat)

`PlayerController`:
- attach/detach DOM + window listeners
- pointer lock на canvas; `CameraLookState` = look yaw
- `update(tank: ControllableTank): wantsFire`
  - WASD / arrows → throttle/steer
  - Shift → boosting
  - look.yaw → aimYaw
  - R → `weapon.requestReload`
  - LMB / Space → fire flag

Stage wiring (`PlayerInputStage`):
- alive → `input.update(player)` → `weapon.setFire`
- dead → `setFire(false)` (no audio/state leak)
- over / menus → `input.enabled = false` + `releaseLock()` (кликабельный React UI)

## 5. Garage input (отдельный класс)

`GarageInput` — drag/zoom preview; **не** смешивать с `PlayerController`.  
Зависит от `CameraRig.garageDrag` / wheel; gated `isInteractive()`.

## 6. Camera modes (strategy)

```ts
interface CameraMode {
  update(dt, params, rig: CameraRig): void;
}
```

Режимы: menu / garage / playing / over — отдельные классы в `game/camera/`.  
Follow target: порт `CameraFollowable` (position, yaw, speed, boost…), не полный tank API.

## 7. Focus & a11y helpers

- `useFocusTrap` — модалки/меню
- `keyboardTarget` — куда слать hotkeys, когда pointer lock off

Новые overlay-экраны обязаны: trap focus, Esc/pause contract через `GameApi`, не raw key handlers внутри sim.

**Announce-контракт (пинится `uiUxPresentation.test.ts` M16):**

| Поверхность | Роль | Почему |
| ----------- | ---- | ------ |
| `BootError`, `ErrorBoundary` | `role="alert"` | экран заменяет всё приложение — иначе AT-пользователь не узнает, почему игра исчезла |
| `roundError` (App) | `role="alert"` | видимая ошибка старта раунда |
| `roundLoading` (App) | `role="status"` + `aria-live="polite"` | не срочно, не перебивает |
| vitals-порог (HUD) | `aria-live="polite"` через `liveRef` | «Броня критична», «Перезарядка», «Магазин пуст», «Уничтожен» |
| радар (HUD) | `<canvas role="img">` + `aria-label` | подписи «РАДАР»/«ЦЕЛИ» остаются читаемыми |
| оверлей смерти (HUD) | `aria-hidden` | текст дублируется в `liveRef`; иначе отсчёт респауна читался бы каждую секунду |
| игровой `<canvas>` | `role="img"` + `aria-label` + fallback-текст | у `<canvas>` нет неявной ARIA-роли — без неё AT пропускает графику |

Декоративные иконки (`lucide-react`) всегда `aria-hidden`.

`role="img"` вешается на **сам канвас**, а не на панель: контейнер с `role="img"` делает всех
потомков презентационными и скринридер терял бы подписи и список целей радара.

## 8. Дизайн-система: панельный хром

Все поверхности — бой, меню, гараж, табло — рисуются **одним классом `.hud-panel`**
(`src/styles/hud.css`) плюс токенами из `src/styles/variables.css`. Отдельного
«менюшного» стиля нет: расхождение между экранами лечится токеном, а не новым правилом.

| Слой | Чем рисуется | Зачем |
|------|--------------|-------|
| Фон | `background-image`: градиент плиты + `repeating-linear-gradient` 45° | «металл», а не плоская заливка |
| Контур | `border` (внешний) + `> .panel-inset` (hairline, inset 4px) | двойная рамка читается как стекло в оправе |
| Угловые скобки | `.hud-panel::before` — 8 градиентных полос (4 «Г»-уголка) | узнаваемая тактическая рамка |
| Верхний рейл | `.hud-panel::after` — линейный градиент 1px по центру верха | «источник света» на кромке |
| Срез угла | `clip-path` через `--panel-cut` | общая геометрия с `.btn-game` |

**Инварианты:**

- **Ноль нового DOM.** Скобки, рейл и штриховка — псевдоэлементы и слои
  `background-image`. В панель добавляется не больше одного `<span class="panel-inset">`,
  и то только там, где нужна внутренняя рамка.
- **Ни одного нового `backdrop-filter`.** Размытие фона дорого; `.hud-panel` — единственное
  место, где оно есть, и добавлять размытые слои в разметку нельзя.
- **Скобки не срезаются углом.** Срез — линия `x + y = --panel-cut` (12px), скобки стоят с
  отступом 9px: `9 + 9 = 18 > 12`, поэтому уголок целиком внутри `clip-path`. При смене
  `--panel-cut` отступ пересчитывается (нужно `inset * 2 > cut`).
- **Цвет — только токен.** Командные цвета (`--team-alpha`/`--team-bravo`), треки полос
  (`--bar-track`), линии панели (`--panel-line*`) заданы в `variables.css`; хардкод
  `#6eb8ff` в компоненте — регресс.

### Шкала токенов

Числа в UI не задаются на месте — они берутся из пяти семейств `variables.css`.
Проверка — тесты `UI polish invariants` в `src/__tests__/uiUxPresentation.test.ts`:
они падают на хардкод, а не на ревью.

| Семейство | Токены | Правило |
|-----------|--------|---------|
| Разрядка | `--track-tight` `.08em`, `--track-base` `.12em`, `--track-wide` `.2em`, `--track-hero` `.3em` | `letter-spacing` в стилях — только `var(--track-*)`. В разметке — только `tracking-wide/wider/widest/hero` (Tailwind-шкала переопределена через `@theme` в `index.css`) |
| Размер | `--fs-caption` 10px, `--fs-label` 11px, `--fs-body` 12px, `--fs-title` 14px | ниже 10px текста нет |
| Срез | `--panel-cut` 12px, `--control-cut` 8px, `--bar-cut` 6px, `--chip-cut` 3px, `--radius-circle` 50% | ни один `clip-path` не задаёт радиус числом; `border-radius` в UI — только `var(--radius-circle)` |
| Свечение | `--glow-r-xs` 6px, `--glow-r-sm` 12px, `--glow-r-md` 22px, `--glow-r-lg` 44px | радиус размытия в `0 0 <n>px rgba(…)` — только токен; цвет и альфа остаются у элемента, оттенок — через `--glow-rgb` |
| Скрим | `--scrim-hud` `.55`+`blur(3px)`, `--scrim-menu` `.94`, `--scrim-pause` `.94`+`blur(6px)`, `--scrim-over` `.85` | оверлеи используют классы `.scrim-*`; допустимы ровно два радиуса размытия — 3px и 6px |

Утилиты геометрии для разметки — `base.css`: `.cut-control`, `.cut-chip`, `.as-circle`.
Tailwind-класс `rounded*` в UI не используется: язык игры — срез, а не радиус.

**Инвариант приоритета классов.** Правила в `styles/*.css` безслойные, а Tailwind-утилиты
живут в `@layer utilities`. Поэтому утилита **не перебивает** одноимённое свойство из
`.hud-panel`/`.hud-label`/`.btn-game`: `bg-[#…]` стирал градиент панели, `text-cyan-300/80`
не красил метку, а `border-cyan-400/70` не подсвечивал выбранную карточку режима.
Состояния панелей и карточек описываются классами в `styles/*.css`, а не утилитами.

**Инвариант входной анимации.** `.btn-primary` задаёт `animation: gradient-drift`
шорткатом, а `anim-up`/`anim-left`/`anim-pop` задают тем же свойством вход. На одном
элементе побеждает `buttons.css` (импортируется позже) — вход теряется вместе с
`forwards`, и элемент остаётся с `opacity: 0`. **Вход анимирует обёртка**, а не сам
элемент с классом кнопки. Закреплено тестом.

**Матрица состояний.** Одна таблица на все интерактивные роли (см. §3.5 плана
`Docs/GDD/Drafts/UI_Polish.md`): `hover` + `active` + `focus-visible` обязательны
у кнопки, карточки и таба; `selected` — у карточки и таба; `disabled` — у кнопки и
карточки. Отключённое состояние задаётся атрибутом `disabled` (`:disabled`) для
кнопок и карточек; класс `.is-disabled` (base.css) — для не-кнопочных ролей.
Кольцо фокуса объявлено **одним** правилом в `base.css` и в ролях не дублируется.

### Полосы состояния

Полосы (`hp`, `boost`, `flame`, `sb-hp`, `g-bar`) делят один язык: срезанный угол,
трек с внутренней тенью, заливка с `inset 0 1px 0` сверху и свечением. Непрерывные
полосы по-прежнему красятся **через ref** (`useGameHud`) — см. §2; CSS задаёт только форму.

Сглаживание квантованного значения — тоже CSS: `.death-bar i` меняет ширину раз в секунду
(`respawnInSec` в гейте), а `transition: width 1s linear` превращает ступеньки в
непрерывную шкалу. Шаг перехода обязан совпадать с шагом квантования гейта.

### Ключевые метки и подсказки

- `.hud-label` получает ведущий ромб (`::before`); `.hud-label.is-plain` — вариант без
  маркера для служебных подписей («БОЙ», «ЧИСТО»).
- `.key-chip` (`base.css`) — физическая клавиша (тёмная площадка + светлая нижняя грань).
  **Один примитив на меню и бой**: легенда управления в меню и подсказка в бою больше
  не расходятся. В бою `.key-chip` стоит на `<b>` внутри `.hint-panel`.

### Очередь тостов

Центрированные боевые тосты (`.frag-popup`, `.streak-banner`) живут в одной полосе
`.toast-lane` и встают в её поток. Собственных `top: %` у них нет: два независимых
процента давали наложение при серии. Кейфреймы поэтому не содержат компенсирующего
`translateX(-50%)` — центрирует полоса.

### Экраны подготовки и паузы

- Оба шага подготовки (`ModeSelect`, `MapSelect`) делят один каркас: `.prep-step`
  (номер шага справа), `.prep-hint` (подсказка в футере), `.picked-flag` (маркер
  выбора в правом верхнем углу карточки). «Назад» — всегда первым в шапке.
- Пауза группируется в секции `.pause-section` — волосяной разделитель между
  смысловыми группами (сводка, действия, настройки, выход).
- Гараж: шапка — только навигация (сетка `1fr auto 1fr` центрирует табы), CTA
  прижат к низу колонки паспорта (`mt-auto`) — в конце движения выбора.

### Размер радара

`--radar-size` объявлен в `hud.css` на `.radar-panel` и обязан совпадать с `MAP_SIZE`
(`minimapDraw.ts`) — это стережёт тест. CSS-размер канваса задаёт таблица стилей, а не
инлайновый `cv.style.width`: инлайн перебил бы брейкпоинт. Один брейкпоинт уменьшения:
`(max-width: 1100px), (max-height: 800px)` → 120 px.

## 9. Checklist нового UI

- [ ] Зависимость только от `GameApi` / types
- [ ] Команда пользователя → method API; реакция мира → event или snapshot
- [ ] Hot path без React re-render thrash
- [ ] `memo`-ребёнок получает примитивы / refs / свежие объекты, **не** `snap.current`
- [ ] Новое поле `HudSnapshot` покрыто гейтом автоматически; для непрерывного канала — добавить категорию в `ui/hudRenderGate.ts`
- [ ] Квантованность гейта совпадает с шагом отрисовки (см. `captureStripKey` ↔ полоса точки)
- [ ] Тост/оверлей с CSS-анимацией снимается таймером (иначе под `prefers-reduced-motion` он вечный)
- [ ] Input combat vs garage разделены
- [ ] Camera — `CameraMode`, не if-ladder в компоненте
- [ ] Экран, заменяющий приложение (ошибка/загрузка) — объявлен (`role="alert"` / `role="status"`), иконки `aria-hidden`
- [ ] Панель — `.hud-panel`, цвета — токены; новый DOM/`backdrop-filter` ради декора не добавлен
- [ ] Числа из шкалы: `letter-spacing` — `var(--track-*)`, срез — `var(--*-cut)`, радиус размытия — `var(--glow-r-*)`, оверлей — `.scrim-*` (см. §8 «Шкала токенов»)
- [ ] Состояние элемента задано классом в `styles/*.css`, а не Tailwind-утилитой: утилиты в слое и проигрывают безслойному `.hud-panel`
- [ ] `hover` + `active` + `focus-visible` есть у каждой интерактивной роли; `disabled` — через атрибут
- [ ] Входная анимация — на обёртке, не на элементе с `.btn-primary` (шорткат `animation` её затирает)
- [ ] Текст мельче 14 px — контраст ≥ 4.5:1 (прозрачность `text-white/N` не ниже `N = 60`)
- [ ] Клавиши — `.key-chip`, тосты — `.toast-lane`, секции паузы — `.pause-section`; своих `top: %` и дублей правил не заводить
- [ ] Классы, на которые ссылаются тесты (`.ammo-pip`, `.weapon-status`, `.hp-fill.danger`, `.death-overlay`, …), сохранены — см. `src/__tests__/uiUxPresentation.test.ts`, `hudLiveUpdates.test.tsx`
