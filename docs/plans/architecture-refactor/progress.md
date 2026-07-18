# Progress — Architecture refactor

## 2026-07-18

- Graphify orientation (`GRAPH_REPORT`, god nodes, explain/query).
- Size ranking + source review of hubs.
- Wrote prioritized problem list (`findings.md`).
- Phase 1 marked complete; no code changes.

## 2026-07-18 session 2 — implement (behavior preserved)

### Done
- **P2.3** Removed all TEMP `console.debug` [BUGFIX-*] (12 sites).
- **P1.1** `AudioPort` + consumers typed through port.
- **P1.2** `EffectsPort` + consumers typed through port.
- **P0.1** `tank/simPorts.ts` + sim systems use Motion/Physics/Aim/Fx/Anim/… ports.
- **P0.2** SimContext stage Pick-slices (type-level ISP); services as ports.
- **P0.3** AI split: `aiTuning`, `aiObstacle`, `aiAimFire` (same numbers/logic).
- **P2.1** `railgunChargeFx` extract charge presentation.
- **P3.1** HudModel uses `HudUnit` port.
- Removed deprecated `baseDamage`.
- CombatSystem: removed empty `if (byPlayer) {}`.

### Verify
- `npm run typecheck` OK
- `npm test` — **123/123** pass
- `graphify update . --force`

### Residual (optional later)
- Further AI engage-move extract
- physics.ts module split
- catalog barrel docs
