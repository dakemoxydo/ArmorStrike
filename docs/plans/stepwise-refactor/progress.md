# Progress — Stepwise Refactor

## Session 2026-07-17 (session 1)

### Done cycles
1. **P1** Flatten SimContext + ScalarCell deathT
2. **P2** GameApi facade
3. **P3a** TankLike hit path
4. **P3b** WeaponOwner
5. **P7** Dead projectile BEHAVIORS
6. **P12/P13/P6** Catalog splash, barrel rest, botAiForWave
7. **P4/P15** TankSystem SRP; HUD SNAP_INIT
8. **P11/P14/P8** botSpawn, fillMuzzleAndAim, requestGameOver

## Session 2026-07-17 (session 2 — goal loop)

### Re-analysis
- Graphify hubs: TankEntity 66, AudioFX 38, Effects 36, CameraRig 30
- Living list: P9, P10, P3r actionable medium; P5 deferred behavior

### Done cycles
9. **P9** RailgunBeamFx extract — PASS (typecheck + tests + reviewer)
10. **P10** CameraLookState — PASS (typecheck + tests + reviewer)
11. **P3r** CombatPeer + AIBody/AITarget + createWeapon(WeaponOwner) — PASS

### Deferred
- **P5** Dual combat balance — documented; no code without product OK

### Verification
- typecheck clean throughout
- 45 tests green
- graphify update after structural changes

### Plan status
Critical empty. Medium structural empty. Only deferred medium is P5 (behavior risk). Ready to close / archive.
