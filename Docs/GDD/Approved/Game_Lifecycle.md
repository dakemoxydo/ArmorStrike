# Game Lifecycle — Режимы, пауза, death cam

**Статус:** Approved  
**Слой:** App / Game mode  
**Связано:** [[Player_Controls]], [[Health_And_Regen]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes (Draft)]]

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

> **P1:** `MatchModeId` + roster + respawn — см. [[Match_Framework]]. Default start = `deathmatch`.

## Старт матча: режим → карта

Поток UI (не отдельный `GameMode`):

```
Играть → ModeSelect → MapSelect → GameApi.startRound(mapId)
Реванш (results) → startRound(lastMap)   // тот же mode
Сменить режим → ModeSelect → MapSelect
```

- `ModeSelect` — DM / TDM / CP; пишет `setMatchMode`.
- `MapSelect` — оверлей; Cancel возвращает к ModeSelect.
- `startRound(mapId)` всегда делает `Arena.rebuild(mapId)` + `HudModel.rebuildMinimap`.
- Карты: `factory` | `village` | `city` — см. [[Maps]].
- `spawnMatchRoster` + `MatchRuntime.reset(mode)` — полный roster.
- Results: `GameOverScreen` + `resultsText` (P6).

## Флаги run

| Флаг | Смысл |
|------|--------|
| `paused` | combat step frozen; death anim может идти |
| `deathT` | ≥0 → death cam timer; −1 = не мёртв |

`intermission` (between-wave) **удалён** в P0.

## Auto-pause policy

`shouldAutoPauseOnInterrupt(mode, paused, deathT)`:

```
return mode === 'playing' && !paused && deathT < 0
```

Срабатывает на:

- `visibilitychange` (вкладка скрыта)
- `pointerlockchange` (потеря lock)

**Не** ставит паузу на death cam (lock сбрасывается специально).

## Death → Respawn (не game over)

```
applyPlayerDeathState:
  deathT = 0
  paused = false
  inputEnabled = false

// MatchStage / MatchRuntime after respawnDelay (4s):
  restore HP, invuln 2s, re-lock input, startEngine
```

## Match end → Game Over

`evaluateMatchEnd` (score threshold | time limit) → `requestMatchOver` →
`mode = over` + `gameOver` { kills, deaths, playerWon, winnerName, … }.

## Порядок тика (playing, !paused)

1. PlayerInput  
2. BotAi (team modes: nearest enemy focus)  
3. Weapons  
4. Tanks  
5. Tank FX / nameplates / ambient  
6. Physics  
7. Projectiles  
8. Minimap  
9. **Match** (respawn + win)  
10. Boost / engine audio

## Классы

| Класс | Файл |
|-------|------|
| `RunState` | `src/game/RunState.ts` |
| `BotRoster` | `src/game/BotRoster.ts` |
| `GameModeController` | `src/game/GameModeController.ts` |
| `Game` / `GameApi` | `src/game/Game.ts`, `GameApi.ts` |
| `GameSimulation` | `src/game/engine/GameSimulation.ts` |
| `GameLoop` | `src/game/GameLoop.ts` |
| `bootstrapGame` | `src/game/GameBootstrap.ts` |
| `deathLifecycle` | `src/game/deathLifecycle.ts` |
| `App` | `src/App.tsx` |
