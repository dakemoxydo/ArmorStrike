# Scoring — Очки и убийства

**Статус:** Approved  
**Слой:** Run meta  
**Связано:** [[Damage_System]], [[Game_Lifecycle]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes (Draft)]]

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

## HUD

- Scoreboard (Tab hold): units, hp.
- Game over: score + kills (без «волны»).

## P1+

Win conditions (30 kills DM / 100 team / 1000 CP) заменят cosmetic score как sole end condition; personal kills остаются.

## Классы

| Символ | Файл |
|--------|------|
| `SCORE` | `src/game/constants.ts` |
| `applyPlayerKillScore` | `src/game/scoring.ts` |
| `CombatSystem` | `src/game/CombatSystem.ts` |
| `RunState` | `src/game/RunState.ts` |
| `HudScoreboard` | `src/components/hud/HudScoreboard.tsx` |
