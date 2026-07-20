# Scoring — Очки и убийства

**Статус:** Approved  
**Слой:** Run meta  
**Связано:** [[Damage_System]], [[Game_Lifecycle]], [[Match_Framework]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes]]

## Константы (`SCORE`)

| Источник | Формула | Когда |
|----------|---------|-------|
| Kill | `+100` | игрок уничтожил бота |

```ts
// constants.ts
SCORE.kill = 100
```

`SCORE.waveBonus` **удалён** (P0 — нет волн).

## Kill path (P1)

`CombatSystem` → `MatchRuntime.onTankKilled`:

```
target.deaths++
if isEnemy(owner, target):
  owner.kills++
  teamKills[owner.team]++  // if teamed
  if owner.isPlayer: applyPlayerKillScore → run.score / run.kills
emit({ type: 'kill', victim, byPlayer })
```

Personal kills on **all** tanks; win uses personal (DM) or team pool (TDM).

## RunState fields

| Поле | Сброс |
|------|-------|
| `score` | `resetRun()` |
| `kills` | `resetRun()` |
| `matchTime` | `resetRun()` + тик в playing |

Loadout (hull/turret) **не** сбрасывается между матчами (`localStorage as2_loadout`).

## Win vs cosmetic (P6)

| Mode | Win metric | Cosmetic |
|------|------------|----------|
| DM | personal kills ≥ **30** | `run.score` (+100 / player kill) |
| TDM | team kills ≥ **75** | same |
| CP | team score ≥ **1000** | kills still track K/D |

`run.score` **не** win condition — только XP/results. Personal kills на всех танках.

## HUD / Results

- Scoreboard (Tab): K/D, team columns in TDM/CP.
- Game over: XP · kills · deaths · K/D · team strip · rematch (`resultsText`, `GameOverScreen`).

## Классы

| Символ | Файл |
|--------|------|
| `SCORE` | `src/game/constants.ts` |
| `applyPlayerKillScore` | `src/game/scoring.ts` |
| `CombatSystem` | `src/game/CombatSystem.ts` |
| `MatchRuntime.onTankKilled` | `src/game/match/MatchRuntime.ts` |
| `RunState` | `src/game/RunState.ts` |
| `HudScoreboard` | `src/components/hud/HudScoreboard.tsx` |
| `resultsText` | `src/game/match/resultsText.ts` |
