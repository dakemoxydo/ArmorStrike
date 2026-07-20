# Wave System — УДАЛЁН (P0)

**Статус:** Removed  
**Слой:** —  
**Связано:** [[Game_Lifecycle]], [[Scoring]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes (Draft)]]

## Что было

Волновой PvE-loop: `WaveManager.begin` → spawn → clear → intermission buff → next wave.  
Смерть игрока = game over. Счёт: kills + `SCORE.waveBonus`.

## Что сделано в P0

| Было | Стало |
|------|--------|
| `WaveManager` | `BotRoster` (пустой список ботов, без lifecycle) |
| `WavesStage` | удалён из `stages.ts` |
| `wavePreview` / intermission events | удалены |
| `botsForWave` / `SCORE.waveBonus` | удалены |
| Старт раунда спавнит волну 1 | `startRound` только игрок + `bots.reset()` |

Утилита `spawnBot` / `SPAWN_POINTS` в `botSpawn.ts` **сохранена** для P1 (match roster).

## Дальше

Классические режимы (DM / TDM / CP) — [[../Drafts/Classic_Match_Modes|Draft]].  
P1: match framework, roster, teams, respawn, win conditions.
