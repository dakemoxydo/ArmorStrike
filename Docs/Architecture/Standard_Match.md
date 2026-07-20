# Standard Match — каркас матча

**Статус:** Living doc  
**Связано:** [Core Patterns](Core_Patterns.md), GDD [[../GDD/Approved/Match_Framework|Match_Framework]]

Правила ниже **обязательны** для кода режимов (DM / TDM / CP) и respawn/win.

## 1. App GameMode ≠ MatchModeId

| Слой | Тип | Значения |
|------|-----|----------|
| UI / app shell | `GameMode` | `menu` \| `garage` \| `playing` \| `over` |
| Match rules | `MatchModeId` | `deathmatch` \| `team_deathmatch` \| `capture_point` |

- `GameMode` — какой экран/петля (меню, симуляция, results).
- `MatchModeId` — **как** считается победа, roster и teams внутри `playing`.
- **Не** смешивать: не добавлять `deathmatch` в `GameMode`.

## 2. Pure helpers + thin runtime

| Pure (unit-test first) | Runtime (sim) |
|------------------------|---------------|
| `isEnemy` / `isAlly` (`match/teams.ts`) | `MatchRuntime` |
| `evaluateMatchEnd` (`match/winConditions.ts`) | `MatchStage` |
| `canRespawn` / `applyRespawnCombat` | `spawnMatchRoster` |
| `pickAiFocus` (hostile target) | `BotAiStage` wiring |

Новые win/respawn/team правила — **сначала pure function + тест**, потом вызов из runtime.

## 3. Damage gates (central)

Friendly fire и spawn invuln — **только** в `core/DamageSystem.applyDamage`:

- same non-null `teamId` → no damage (FF off in team modes);
- `invulnT > 0` → no damage;
- `source.id === target.id` → no damage.

Weapons **не** дублируют team checks.

## 4. Kill credit path

```
DamageSystem → CombatSystem.onTankDestroyed → MatchRuntime.onTankKilled
```

- Personal `kills`/`deaths` на `TankEntity`.
- Team pools в `MatchRuntime.teamKills` / `teamScore`.
- Cosmetic `run.score` — через `applyPlayerKillScore` только для player frags.
- **Не** писать win logic в `CombatSystem`.

## 5. Lifecycle

| Event | Action |
|-------|--------|
| Tank death | FX + kill credit + **respawn timer** (not game over) |
| Match win / time | `requestMatchOver` → `mode=over` + rich `gameOver` event |
| Player death | death cam / unlock only; `MatchRuntime` respawns |

`DeathTimerStage` → game over **запрещён** (удалён); конец матча только через match eval.

## 6. Roster

- Spawn only via `spawnMatchRoster(config, ctx)` after `clearTanks`.
- Default mode: `deathmatch` (`DEFAULT_MATCH_MODE`).
- Bot difficulty: `BOT_NORMAL` (no wave ramp).

## 7. AI hostility

- Focus target = **hostile** by `isEnemy` (FFA: all others; teams: opposite).
- Line-of-fire “friendly block” uses **allies only**, never FFA peers.
- Multi-target / retarget logic lives in pure `pickAiFocus` (+ optional stickiness).

## 8. UI mode flow (P3)

```
ModeSelect → MapSelect → startRound(mapId)
```

- `GameModeController.matchMode` set via `setMatchMode` before start.
- Team HUD: team kill strip for non-DM; Tab scoreboard splits by `teamId`.
- Minimap blips carry `relation: self | ally | enemy` (not only `isPlayer`).
- Visual team tint: `COLORS.teamAlpha` / `teamBravo` on rings + bot styles.

## 9. Capture Point (P4)

- Pure zone step first: `stepCaptureZone` / `scoreDeltaFromZones` (`captureLogic.ts`) + unit tests.
- Runtime only: presence → step → accumulate `MatchRuntime.teamScore` → markers sync.
- Ownership model: **neutral-first** (capture → neutral → enemy); contest freezes bar.
- Anchors per `MapId` in `captureAnchors.ts` (not hardcoded in stage).
- Presentation: `CaptureMarkers` (world) + `getCaptureMinimap` + HUD `capturePoints` chips.
- **Do not** put win logic in markers or weapons.

## 10. CP objective AI (P5)

- Pure zone pick: `pickObjectiveZone` / `isObjectiveDuty` (`aiObjective.ts`) + unit tests.
- Duty flag on `BotEntry.objectiveDuty` at roster spawn (~50%).
- Path via `AICtx.moveHint` (zone center); aim/fire still use hostile focus.
- Clear moveHint when `shouldFightNearObjective` (close threat or enemy on point).
- **Do not** hardcode zone coordinates in `AIController` — only consume hints from stage.

## 11. Results & balance (P6)

- Rich `gameOver` payload: personal + `teamKills` + `teamScore` + `matchTimeSec`.
- Copy helpers pure: `resultsText.ts` (headline, clock, K/D).
- Rematch = `startRound(lastMapId)` without ModeSelect; change mode reopens flow.
- Tunables live in `matchConfig.ts` only (win thresholds / time limit).
