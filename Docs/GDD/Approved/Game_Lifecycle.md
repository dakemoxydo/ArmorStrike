# Game Lifecycle — Режимы, пауза, death cam

**Статус:** Approved  
**Слой:** App / Game mode  
**Связано:** [[Player_Controls]], [[Health_And_Regen]], [[Match_Framework]]

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
Быстрая игра → pickQuickMatch (случайный mode + map) → startRound
Реванш (results) → startRound(lastMap)   // тот же mode
Сменить режим → ModeSelect → MapSelect
```

- `ModeSelect` — DM / TDM / CP; пишет `setMatchMode`.
- **Быстрая игра** (кнопка в MainMenu): `pickQuickMatch`
  (`src/game/quickMatch.ts`) — равномерно случайные режим из
  `MATCH_MODE_IDS` (`match/matchConfig.ts`) и карта из `MAP_IDS`
  (`maps/mapCatalog.ts`); выбранное пишется и в контроллер (`setMatchMode`),
  и в `lastMatchMode` / `lastMapId` App — реванш повторяет тот же матч.
- `MapSelect` — оверлей; Cancel возвращает к ModeSelect.
- `startRound(mapId)` всегда делает `Arena.rebuild(mapId)` + `HudModel.rebuildMinimap`.
- Карты: `factory` | `village` | `city` — см. [[Maps]].
- `spawnMatchRoster` + `MatchRuntime.reset(mode)` — полный roster.
- Results: `GameOverScreen` + `resultsText` (P6).

### Асинхронный старт

`startRound` возвращает `Promise` (ростер строится асинхронно через
`TankFactory.build`) и **сериализован**:

- Параллельные вызовы становятся в очередь, применяется только последний —
  промежуточные сбрасывают свой ростер, чтобы не удвоить танки.
- Выход в `menu` / `garage` инвалидирует старт «в полёте» **в любом режиме** —
  иначе догрузка выкинула бы игрока в бой из гаража. seq-проверка повторяется
  после **каждого** `await` (ростер и `renderWorld.warmUp()`): выход в меню
  прямо во время компиляции шейдеров тоже отменяет применение `playing`.
- UI держит оверлей «ЗАГРУЗКА» на время ожидания (`App.runStartRound`).
- Перед `mode = 'playing'` — `renderWorld.warmUp()`: компиляция шейдеров всех материалов
  сцены, пока виден оверлей (см. [[../../Architecture/Standard_Frame_Stability|Standard Frame Stability]] §2).

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

**HUD death cam:** пока `alive = false`, `HUD` рисует оверлей «УНИЧТОЖЕН» с обратным отсчётом
`respawnInSec` (= `respawnDelaySec − deathT`, квантован по секундам в `hudRenderGate`), прицел
скрыт. Текст дублируется в live-region (`useGameHud`), сам оверлей — `aria-hidden`.

## Match end → Game Over

`evaluateMatchEnd` (score threshold | time limit) → `requestMatchOver` →
`mode = over` + `gameOver` { kills, deaths, playerWon, winnerName, … }.

## Порядок тика (playing, !paused)

1. PlayerInput (WASD/mouse → tank; wantsFire фиксируется)
2. BotAi (team modes: nearest enemy focus; решает wantsFire)
3. **Tanks** (motion → timers → aim → presentation sync башни)
4. WeaponFire (триггеры `setFire` — после синка башни, дуло текущего кадра)
5. Weapons (weapon.update: charge FSM, flame particles)
6. TankAnimation
7. Tank FX
8. Ambient
9. Nameplates
10. Physics
11. Projectiles
12. Minimap
13. **Match** (invuln, respawn, capture, win)
14. Boost (нитро-выхлоп игрока)
15. Engine audio

Полный реестр — `buildSimulationStages` (`src/game/engine/stages/index.ts`).

## Классы

| Класс | Файл |
|-------|------|
| `RunState` | `src/game/RunState.ts` |
| `BotRoster` | `src/game/BotRoster.ts` |
| `GameModeController` | `src/game/GameModeController.ts` |
| `Game` / `GameApi` | `src/game/Game.ts`, `GameApi.ts` |
| `GameSimulation` | `src/game/engine/GameSimulation.ts` |
| `stages/` (pipeline) | `src/game/engine/stages/` (per-stage files) |
| `GameLoop` | `src/game/GameLoop.ts` |
| `bootstrapGame` | `src/game/GameBootstrap.ts` |
| `deathLifecycle` | `src/game/deathLifecycle.ts` |
| `App` | `src/App.tsx` |
