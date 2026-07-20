# Match Framework — Режимы, roster, respawn, win

**Статус:** Approved (P1–P4)  
**Слой:** Match / Gameplay loop  
**Связано:** [[Game_Lifecycle]], [[Scoring]], [[AI_Bots]], [[Team_Deathmatch]], [[Capture_Point]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes]]

## Режимы

```ts
type MatchModeId = 'deathmatch' | 'team_deathmatch' | 'capture_point'
type TeamId = 'alpha' | 'bravo' | null  // null = FFA
```

| Mode | Roster | Win | UI |
|------|--------|-----|-----|
| `deathmatch` | 1 player + **7** bots, `teamId=null` | first **30** personal kills | ModeSelect ✅ |
| `team_deathmatch` | 5v5 (player Alpha + 4 allies, 5 Bravo) | team kills **75** (P6) | ModeSelect ✅ — см. [[Team_Deathmatch]] |
| `capture_point` | same as TDM | team score **1000** (+1/s per owned point) | ModeSelect ✅ — см. [[Capture_Point]] |

Time limit all modes: **12 min** → leader wins (`reason: 'time'`).

Bot difficulty: **Normal** (`BOT_NORMAL` in `matchConfig.ts`).

## Teams

`isEnemy(a, b)` / `isAlly` — `src/game/match/teams.ts`.

- FFA: any other tank is enemy.
- Team: damage blocked in `DamageSystem` when both `teamId` equal (FF off).

## Respawn

| Param | Value |
|-------|-------|
| Delay | **4 s** (`deathT` on tank) |
| Invuln | **2 s** (`invulnT`, blocks `applyDamage`) |
| Player death | **not** game over; death cam → respawn + lock |
| Spawn pick | `pickRespawnPoint` furthest from live threats |

Handled by `MatchRuntime` + `MatchStage` (replaces old DeathTimer→gameOver).

## Kill credit

`CombatSystem` → `MatchRuntime.onTankKilled`:

- `target.deaths++`
- if `isEnemy(owner, target)`: `owner.kills++`, team kill pool if teamed
- player owner: `applyPlayerKillScore` → `run.score` / `run.kills`

## Win

`evaluateMatchEnd` pure (`winConditions.ts`) → `requestMatchOver` → event `gameOver` with winner fields.

## Spawn tables

| Pool | Use |
|------|-----|
| `FFA_SPAWN_POINTS` | DM (legacy edge points) |
| `ALPHA_SPAWN_POINTS` | south / player side |
| `BRAVO_SPAWN_POINTS` | north |

`spawnMatchRoster` — `src/game/match/rosterSpawn.ts`.

## Classes

| Symbol | File |
|--------|------|
| `MatchRuntime` | `src/game/match/MatchRuntime.ts` |
| `spawnMatchRoster` | `src/game/match/rosterSpawn.ts` |
| `configForMode` | `src/game/match/matchConfig.ts` |
| `evaluateMatchEnd` | `src/game/match/winConditions.ts` |
| `isEnemy` | `src/game/match/teams.ts` |
| `MatchStage` | `src/game/engine/stages.ts` |
| `BotRoster` | `src/game/BotRoster.ts` |
| `GameModeController.startRound` | accepts optional `MatchModeId` |
| `ModeSelect` | `src/components/ModeSelect.tsx` |

## UI

- Flow: **ModeSelect → MapSelect → startRound**
- HUD DM: cosmetic score + `kills/winTarget`
- HUD TDM: `ALPHA n — m BRAVO` + personal K/D
- Scoreboard Tab: flat K/D (DM) or two team columns (TDM)
- Minimap: self / ally / enemy relation colors
- Game over: win/loss + winner name/team
- Rematch re-opens ModeSelect (mode sticky via `setMatchMode`)

## AI focus (P2)

Multi-target: `pickAiFocus` — FFA and team modes use `isEnemy`. Sticky target; allies-only shot blockers.

## Capture (P4)

Pure zone sim: `captureLogic.ts` → `MatchRuntime.updateCapture` → `teamScore`.  
Markers: `CaptureMarkers`. Anchors: `captureAnchors.ts`.  
Win already evaluated via `teamScore` in `evaluateMatchEnd`.

## Results UI (P6)

- `gameOver` event carries `matchTimeSec`, `teamKills`, `teamScore`.
- `GameOverScreen`: headline + duration + team strip + XP/K/D/D + K/D.
- Actions: **Реванш** (same mode+map) · **Режим/карта** · Гараж · Меню.
- Balance: `winTeamKills = 75` in `matchConfig.ts`.
