# Game Lifecycle — Режимы, пауза, death cam

**Статус:** Approved  
**Слой:** App / Game mode  
**Связано:** [[Player_Controls]], [[Wave_System]], [[Health_And_Regen]]

## GameMode

```ts
type GameMode = 'menu' | 'garage' | 'playing' | 'over'
```

Хранится в `RunState.mode`.

| Mode | Что происходит |
|------|----------------|
| `menu` | MainMenu, preview tank, ambient cam |
| `garage` | выбор loadout, 3D preview, `GarageInput` |
| `playing` | симуляция, HUD, pointer lock |
| `over` | GameOverScreen, score summary |

## Флаги run

| Флаг | Смысл |
|------|--------|
| `paused` | combat step frozen; death anim может идти |
| `intermission` | между волнами; combat frozen, UI buff pick |
| `deathT` | ≥0 → death cam timer; −1 = не мёртв |

## Auto-pause policy

`shouldAutoPauseOnInterrupt(mode, paused, deathT, intermission)`:

```
return mode === 'playing' && !paused && deathT < 0 && !intermission
```

Срабатывает на:

- `visibilitychange` (вкладка скрыта)
- `pointerlockchange` (потеря lock)

**Не** ставит паузу на death cam / intermission (lock сбрасывается специально).

## Death → Game Over

```
applyPlayerDeathState:
  deathT = 0
  paused = false
  inputEnabled = false

// ~2s later in sim
mode = 'over'
emit gameOver
applyGameOverInputState
```

## Порядок тика (playing, !paused)

`stages.ts` / `GameSimulation.step` (концептуально):

1. PlayerInput  
2. BotAi  
3. Weapons  
4. Tanks (motion, aim, timers)  
5. Tank FX / nameplates / ambient  
6. Physics resolve  
7. Projectiles  
8. Waves (intermission gate)  
9. Death timer / game over  
10. Engine audio / boost jet / minimap  

## Классы

| Класс | Файл |
|-------|------|
| `RunState` | `src/game/RunState.ts` |
| `GameModeController` | `src/game/GameModeController.ts` |
| `Game` / `GameApi` | `src/game/Game.ts`, `GameApi.ts` |
| `GameSimulation` | `src/game/engine/GameSimulation.ts` |
| `GameLoop` | `src/game/GameLoop.ts` |
| `bootstrapGame` | `src/game/GameBootstrap.ts` |
| `deathLifecycle` | `src/game/deathLifecycle.ts` |
| `App` | `src/App.tsx` |
