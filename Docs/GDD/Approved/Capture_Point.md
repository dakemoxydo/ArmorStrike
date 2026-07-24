# Capture Point — Захват точки

**Статус:** Approved (P4–P5)  
**Слой:** Match / Gameplay  
**Связано:** [[Match_Framework]], [[Team_Deathmatch]], [[AI_Bots]], [[Maps]], [[Game_Lifecycle]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes]]

## Правила (as shipped)

| Параметр | Значение | Код |
|----------|----------|-----|
| Формат | 5 vs 5 (как TDM) | `spawnMatchRoster` + `isTeamMode` |
| Точки | **A, B, C** — изначально **нейтральные** | `zonesForMap` |
| Радиус | **20** wu | `CAPTURE.radius` |
| Захват | **8 с** exclusive control | `CAPTURE.captureSec` |
| Contest | обе команды в зоне → progress **freeze** | `resolveActor` |
| Ownership | **neutral-first**: capture → neutral → enemy | `stepCaptureZone` |
| Score | **+1 / s** за каждую owned point | `scoreDeltaFromZones` |
| Win | teamScore ≥ **1000** | `evaluateMatchEnd` |
| Time | 12 мин → leader by score (tie → team kills) | `winConditions` |
| Kills | personal / team K/D only; **not** win metric | `MatchRuntime.onTankKilled` |
| Friendly fire | off | `DamageSystem` |
| Objective AI | **~50%** bots on zones (P5) | `aiObjective` + `BotAiStage` |

## Per-map anchors

| Map | A | B | C |
|-----|---|---|---|
| factory | (−88, 8) west | (0, 0) center | (92, −6) east |
| village | (0, 4) plaza | (−85, 25) west | (88, −18) east |
| city | (0, 0) plaza | (0, 78) north | (12, −86) south |

Источник: `src/game/match/captureAnchors.ts`.

## Визуал / UI

| Surface | Behaviour |
|---------|-----------|
| World | ring disk + letter billboard; color by owner / contest / capture progress |
| HUD | `ALPHA score — BRAVO score` + A/B/C chips + personal K/D |
| Minimap | letter circles A/B/C with owner color |
| ModeSelect | CP enabled |

## Objective AI (P5)

| Rule | Implementation |
|------|----------------|
| ~50% bots on objectives | `isObjectiveDuty(index)` → `BotEntry.objectiveDuty` |
| Zone pick order | contested → neutral → enemy → own |
| Sticky zone | `_objSticky` + slack in `pickObjectiveZone` |
| Pathing | `AICtx.moveHint` → zone center |
| Fight interrupt | `shouldFightNearObjective` clears moveHint (close / on-point threat) |
| Rest of bots | normal multi-target hunt (no moveHint) |

## Classes

| Symbol | File |
|--------|------|
| `stepCaptureZone` / `CAPTURE` | `src/game/match/captureLogic.ts` |
| `zonesForMap` | `src/game/match/captureAnchors.ts` |
| `CaptureMarkers` | `src/game/match/CaptureMarkers.ts` |
| `MatchRuntime.updateCapture` | `src/game/match/CaptureController.ts` (delegated) |
| `pickObjectiveZone` / `isObjectiveDuty` | `src/game/match/aiObjective.ts` |
| `BotAiStage` (CP branch) | `src/game/engine/stages/BotAiStage.ts` |
| `getCaptureMinimap` | `src/game/Game.ts` / `GameApi` |

## Acceptance (P4–P5)

- [x] ModeSelect: CP selectable
- [x] 3 neutral zones per map; exclusive 8s → ownership
- [x] Contest freezes; neutralize before flip
- [x] +1/s per owned point; 1000 → end
- [x] World markers + minimap + HUD chips
- [x] Objective AI (~50% path to A/B/C; fight when threatened)
