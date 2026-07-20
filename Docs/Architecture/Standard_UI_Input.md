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
| `HudSnapshot` | непрерывное состояние | HP, ammo, boost, score, matchMode, winTarget, teamKills/Score, capturePoints |

`useGameHud(game, active)`:
- подписка на events → vignette, feed, hitmark
- HUD callback / rAF path → refs для high-frequency bars (health, boost, flame fill, minimap canvas)
- `ammoForcesHudRender` / `isLowHealth` — pure helpers в `ui/hudPresentation.ts`

Правило perf: **не** `setState` каждый кадр для полосок; DOM refs + minimap canvas.

## 3. Component layout

```
components/
  HUD.tsx + hud/*     # combat overlay (crosshair, vitals, radar, feed, weapon, scoreboard)
  MainMenu, Garage, ModeSelect, MapSelect, PauseMenu, GameOverScreen
  HullCard, TurretCard
hooks/
  useGameHud, useFocusTrap
ui/
  GarageInput, hudPresentation, keyboardTarget
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

## 8. Checklist нового UI

- [ ] Зависимость только от `GameApi` / types
- [ ] Команда пользователя → method API; реакция мира → event или snapshot
- [ ] Hot path без React re-render thrash
- [ ] Input combat vs garage разделены
- [ ] Camera — `CameraMode`, не if-ladder в компоненте
