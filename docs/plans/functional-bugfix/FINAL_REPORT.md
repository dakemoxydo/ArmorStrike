# Final report — functional bugfix

## Summary
All **critical** and **medium** functional bugs from the inventory were fixed at root cause with unit tests and temporary debug logs on affected paths.

## Fixed (critical)
1. **C1 Death softlock** — intentional lock release no longer freezes death cam / game-over.
2. **C2 Cannon no HP damage** — projectile hits apply damage through `applyDamage`.
3. **C3 Railgun bot one-shot** — charge restarts while fire held after cooldown.

## Fixed (medium)
M1 scoring, M2 double FX, M3 pause lock, M4 game-over input, M5 death-cam waves, M6 damage scale, M7 flame cone, M8 flame on death, M9 railgun blockers, M10 physics, M11 AI aim, M12 ramps.

## Remaining
Low-severity items only (L1–L9 in findings.md). Not required for goal pass.

## Verification
| Check | Result |
|-------|--------|
| `npm test` | 90/90 pass |
| `npm run typecheck` | exit 0 |
| Production build | ok |
| Playwright load smoke | canvas 1280×720, 0 uncaught errors |
| Regression repeat | critical + M6 suite ×2 pass |
| Inventory AC1 | every C/M bug has severity + concrete repro steps |
| TEMP DEBUG AC3 | `[BUGFIX-C*]` / `[BUGFIX-M*]` on each fixed path |
| M6 test | `resolveWeaponDamage` with scaled params (not source grep) |

## Key files
- `src/game/deathLifecycle.ts`, `GameBootstrap.ts`, `GameSimulation.ts`
- `src/core/DamageSystem.ts`, `src/game/engine/stages.ts`
- `src/game/weapons/RailgunWeapon.ts`, `railgunFireLogic.ts`, `railgunBlockers.ts`
- `src/game/weapons/FlamethrowerWeapon.ts`, `flameCone.ts`
- `src/game/CombatSystem.ts`, `scoring.ts`
- `src/game/engine/tankSeparation.ts`, `PhysicsSystem.ts`
- `src/game/AI.ts`, `GameModeController.ts`
- Tests under `src/__tests__/*` for each fix
