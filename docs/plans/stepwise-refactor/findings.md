# Findings — Stepwise Refactor (final state)

## Re-analysis snapshot (2026-07-17 session 2)

**Method:** Graphify explain/query + parallel explore agents + prior findings.

### Prioritized problem list — final

#### CRITICAL
*(empty)*

#### MEDIUM — resolved this session

| ID | Problem | Cycle | Result |
|----|---------|-------|--------|
| **P9** | RailgunWeapon combat FSM + Three beam/lights | 9 | PASS — `RailgunBeamFx` |
| **P10** | PlayerController owns camYaw/camPitch | 10 | PASS — `CameraLookState` |
| **P3r** | Residual TankEntity fan-in (AI, WeaponContext peers) | 11 | PASS — `AIBody`/`AITarget`, `CombatPeer` |

#### MEDIUM — deferred (behavior risk; needs user OK)

| ID | Problem | Why deferred |
|----|---------|--------------|
| **P5** | Dual combat balance: railgun/flame ignore scaled `params.damage` | Fixing changes bot railgun/flame damage outcomes vs catalog scale. **Preserve-behavior rule overrides auto-fix.** Ask product before coding. |

#### LOW / melочь (out of critical/medium clear scope)

| ID | Note |
|----|------|
| P14 partial | Flamethrower own muzzle path (quaternion — correct) |
| Cannon rest pose | Pre-existing anim snap vs BARREL_REST |
| Mass sim-system ports | Physics/Motion/Aim slices — high noise, low urgency |
| HudModel wide read | Optional HUD DTO later |
| Charge glow/jitter on railgun | Optional second visual extract after P9 |

### Completed prior cycles (session 1)

| ID | Result |
|----|--------|
| P1–P4, P6–P8, P11–P15 | PASS (see progress.md session 1) |

### Tests
- `npm run typecheck` clean
- `npm test` — **45/45** pass (was 34; +RailgunBeamFx, CameraLookState, p3r-ports)
- `graphify update .` after structural changes

### Success metrics for residual P3r
- `TankEntity` import gone from `AI.ts`, `weapons/types.ts`, `RailgunWeapon.ts`, `FlamethrowerWeapon.ts`
- Factories still construct concrete tank class
- Sim hubs may retain `TankEntity[]` (composition roots)
