# Wave System — УДАЛЁН (P0)

**Статус:** Removed  
**Слой:** —  
**Связано:** [[Game_Lifecycle]], [[Scoring]], [[Match_Framework]]

## Что было

Волновой PvE-loop: `WaveManager.begin` → spawn → clear → intermission buff → next wave.  
Смерть игрока = game over. Счёт: kills + `SCORE.waveBonus`.

## Что сделано в P0 (и дальше)

| Было | Стало |
|------|--------|
| `WaveManager` | `BotRoster` + `spawnMatchRoster` |
| `WavesStage` | удалён; `MatchStage` |
| `wavePreview` / intermission | удалены |
| `botsForWave` / `SCORE.waveBonus` | удалены |
| Старт = волна 1 | ModeSelect → MapSelect → match roster |

`SPAWN_POINTS` / `botSpawn` — FFA/team spawn tables через `match/spawnPoints.ts` + `rosterSpawn.ts`.

## Замена

Классические режимы **shipped (P0–P6):** [[Match_Framework]], [[Team_Deathmatch]], [[Capture_Point]] (design-trail удалён из Drafts, история в git).
