# Team Deathmatch — Командный бой

**Статус:** Approved (P3)  
**Слой:** Match / Gameplay  
**Связано:** [[Match_Framework]], [[AI_Bots]], [[Damage_System]], [[Game_Lifecycle]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes]]

## Правила (as shipped)

| Параметр | Значение | Код |
|----------|----------|-----|
| Формат | 5 vs 5 | `spawnMatchRoster` + `teamSize: 5` |
| Состав | Игрок **Alpha** + 4 ally-бота; **Bravo** = 5 enemy-ботов | `rosterSpawn.ts` |
| Win | Сумма team kills ≥ **75** (P6) | `evaluateMatchEnd` / `winTeamKills` |
| Time limit | **12 мин** → лидер по team kills | `timeLimitSec` |
| Friendly fire | **Выкл** | `DamageSystem.applyDamage` same `teamId` |
| Respawn | 4 с delay, 2 с invuln, team spawn pools | `MatchRuntime` + `ALPHA/BRAVO_SPAWN_POINTS` |
| Bot difficulty | Normal only | `BOT_NORMAL` |

## Kill credit

`CombatSystem` → `MatchRuntime.onTankKilled`:

- `target.deaths++`
- if `isEnemy(owner, target)`: personal `kills++`, `teamKills[owner.teamId]++`
- Ally / self kill: death only, no team frag

## AI

- Focus: `pickAiFocus` + `isEnemy` (allies never targeted)
- Shot blockers: `allyLineBlockers` only (never FFA peers)
- Names: `А-ROLE-N` / `Б-ROLE-N`; mesh ring tint Alpha blue / Bravo red

## UI

| Surface | Behaviour |
|---------|-----------|
| ModeSelect | DM + TDM enabled; CP disabled (P4) |
| Flow | ModeSelect → MapSelect → `startRound` |
| HUD | `ALPHA n — m BRAVO` + personal K/D + time + win target |
| Tab scoreboard | Two columns Alpha / Bravo |
| Minimap | self cyan, ally blue (`#3b9eff`), enemy red |
| GameOver | team winner + mode label «КОМАНДНЫЙ БОЙ» |

## Classes

| Symbol | File |
|--------|------|
| `ModeSelect` | `src/components/ModeSelect.tsx` |
| `spawnMatchRoster` | `src/game/match/rosterSpawn.ts` |
| `isEnemy` / `isTeamMode` | `src/game/match/teams.ts` |
| `evaluateMatchEnd` | `src/game/match/winConditions.ts` |
| `MatchRuntime` | `src/game/match/MatchRuntime.ts` |
| `HudModel` (team rows / minimap relation) | `src/game/HudModel.ts` |
| `HudScoreboard` | `src/components/hud/HudScoreboard.tsx` |
| `COLORS.teamAlpha` / `teamBravo` | `src/core/constants.ts` |

## Acceptance (P3)

- [x] ModeSelect: можно выбрать TDM и стартовать матч
- [x] 5v5 roster, player Alpha
- [x] Friendly fire off
- [x] Team kills 100 → end; time → leader
- [x] HUD ALPHA—BRAVO + personal K/D
- [x] Tab two columns
- [x] Minimap ally/enemy colors
