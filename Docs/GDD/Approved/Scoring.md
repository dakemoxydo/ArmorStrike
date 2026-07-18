# Scoring — Очки и убийства

**Статус:** Approved  
**Слой:** Run meta  
**Связано:** [[Wave_System]], [[Damage_System]]

## Константы (`SCORE`)

| Источник | Формула | Когда |
|----------|---------|-------|
| Kill | `+100` | игрок уничтожил бота |
| Wave clear bonus | `150 + wave * 50` | старт **следующей** волны (за очищенную `wave-1`) |

```ts
// constants.ts
SCORE.kill = 100
SCORE.waveBonus = (wave) => 150 + wave * 50
```

## Kill path

`CombatSystem.onTankDestroyed` (бот, `owner.isPlayer`):

```
next = applyPlayerKillScore({ kills, score }, byPlayer=true)
run.kills = next.kills
run.score = next.score
emit({ type: 'kill', victim, byPlayer })
```

`applyPlayerKillScore` — pure (`scoring.ts`); no-op если не игрок.

## RunState fields

| Поле | Сброс |
|------|-------|
| `score` | `resetRun()` |
| `kills` | `resetRun()` |
| `matchTime` | `resetRun()` + тик в playing |

Loadout (hull/turret) **не** сбрасывается между матчами (`localStorage as2_loadout`).

## HUD

- Scoreboard (Tab hold): kills, score, wave.
- Game over screen: итог run.

## Классы

| Символ | Файл |
|--------|------|
| `SCORE` | `src/game/constants.ts` |
| `applyPlayerKillScore` | `src/game/scoring.ts` |
| `CombatSystem` | `src/game/CombatSystem.ts` |
| `RunState` | `src/game/RunState.ts` |
| `HudScoreboard` | `src/components/hud/HudScoreboard.tsx` |
