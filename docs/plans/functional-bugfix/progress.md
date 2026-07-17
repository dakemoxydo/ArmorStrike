# Progress

## Inventory
- 2026-07-17: Parallel explore agents + graphify + code review → findings.md

## Cycles
| Cycle | Bug | Status |
|-------|-----|--------|
| 1 | C1 Death softlock | fixed |
| 2 | C2+M2 Cannon damage + double FX | fixed |
| 3 | C3 Railgun bot re-fire | fixed |
| 4 | M1 kills/score | fixed |
| 5 | M3–M12 remaining medium | fixed |

## Final verification
- `npm test`: 88 passed
- `npm run typecheck`: exit 0
- Build: ok
- Playwright smoke: canvas 1280×720, 0 page errors (`{SCRATCH}/launch/smoke.json`)

## Cycle reports (summary)
### C1
- Fixed: death no longer auto-pauses on lock release; death timer advances; GO disables input.
- Next was C2.

### C2+M2
- Fixed: onTankHit → applyDamage; dmg≤0 skips hooks.
- Next was C3.

### C3
- Fixed: railgun level-trigger in IDLE (AI hold-fire re-arms).
- Next was M1+.

### M1–M12
- Scoring, pause lock, waves gate, damageScale, flame cone XZ, death setFire false, railgun collider blockers, physics separation, AI aim noise, ramps non-solid for hull.

## Remaining
- Low-severity only (L1–L9 inventory). Critical+medium closed.
