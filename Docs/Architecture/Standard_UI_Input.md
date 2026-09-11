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

## 8. Checklist нового UI

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
