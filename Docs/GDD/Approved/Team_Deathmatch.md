# Team Deathmatch — Командный бой

**Статус:** Approved (P3)  
**Слой:** Match / Gameplay  
**Связано:** [[Match_Framework]], [[AI_Bots]], [[Damage_System]], [[Game_Lifecycle]]

## Правила (as shipped)

| Параметр | Значение | Код |
|----------|----------|-----|
| Формат | 5 vs 5 | `spawnMatchRoster` + `teamSize: 5` |
| Состав | Игрок **Alpha** + 4 ally-бота; **Bravo** = 5 enemy-ботов | `rosterSpawn.ts` |
| Win | Сумма team kills ≥ **50** (P6) | `evaluateMatchEnd` / `winTeamKills` |
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
| ModeSelect | DM / TDM / CP — все включены (CP shipped в P4–P5) |
| Flow | ModeSelect → MapSelect → `startRound` |
| HUD | `ALPHA n — m BRAVO` + personal K/D + elapsed/remaining time + win target |
| HUD radar | «ЦЕЛИ» = живые противники (`enemiesAlive`); союзники Alpha не считаются |
| Tab scoreboard | Two columns Alpha / Bravo |
| Minimap | self amber diamond (`#f59e0b`), ally cyan circle (`#38bdf8`), enemy red triangle (`#f87171`); CP-кольца — те же --team-токены |
| GameOver | team winner + mode label «КОМАНДНЫЙ БОЙ» |

### Colorblind safety (K2, verdict 2026-09-23)

**PASS** — цвет не единственный носитель команды:

- Не-цветовые признаки: теги неймплейтов `А-`/`Б-`, явные слова ALPHA/BRAVO
  (HUD, scoreboard, GameOver), формы блипов миникарты (self ромб / ally круг /
  enemy треугольник), буквы A/B/C на точках захвата.
- Палитра: blue `--team-alpha #38bdf8` / red `--team-bravo #f87171` + amber self —
  три различимых hue-группы; world-кольца — `COLORS.teamAlpha/teamBravo`.
- Пины: `minimapDraw.test.ts` (цвета + формы), `nameplate.test.ts` (А-/Б-).

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
- [x] Team kills **50** → end; time → leader
- [x] HUD ALPHA—BRAVO + personal K/D
- [x] Tab two columns
- [x] Minimap ally/enemy colors
