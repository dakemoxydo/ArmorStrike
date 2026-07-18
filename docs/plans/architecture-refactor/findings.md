# Architecture Analysis — ArmorStrike (2026-07-18)

## Method

- Graphify: `GRAPH_REPORT.md`, god nodes, `explain` / `query` / `path`
- File size ranking (non-test `.ts`/`.tsx`)
- Source review: `Game`, `GameSimulation`, `stages`, `Tank`, `AI`, `AudioFX`, `Effects`, weapons, `HudModel`, `GameBootstrap`, `CombatSystem`
- Context: prior **stepwise-refactor** completed P1–P4, P6–P15, P3r; P5 deferred (behavior)

## Current shape (strengths)

| Layer | Role | Health |
|-------|------|--------|
| `Game` (~97 LOC) | Thin facade over bootstrap + modes + quality + garage | Good — no longer god object |
| `GameSimulation` + `stages` | Ordered sim pipeline (`SimSystem`) | Good pattern; context still fat |
| `core/` | Catalog, `DamageSystem`, `TankLike` — no `game/` imports | Good boundary |
| Weapons | Shared `Weapon` / `WeaponOwner` / `CombatPeer` | Good; concrete deps remain |
| Arena | Modular builders under `arena/*` | Good |
| Effects | Facade over particles / shake / dust | Internal split good; external hub remains |
| Import cycles | None detected | Good |

**God nodes (degree):** `TankEntity` 51 · `AudioFX` 39 · `Effects` 34 · `CameraRig` 30 · `Arena` 29 · `Game`/`GameApi` 28 · `HullId`/`TurretId` 27 · `TankLike` 25.  
Composition roots with high fan-out: `GameBootstrap` ~49 edges (expected for DI root).

---

## Prioritized problem list

Priority = **impact × (coupling / change risk)** for future features & testability.  
Not “lines of code only.” Prior stepwise-refactor already cleared many CRITICAL/MEDIUM items.

### P0 — Architectural hubs (do first if continuing structural work)

#### P0.1 — `TankEntity` residual fan-in (god data type)

| | |
|--|--|
| **Category** | God object / high coupling / missing abstractions |
| **Evidence** | Degree 51; imported by sim systems, `WaveManager`, `HudModel`, `CameraRig`/`PlayingCameraMode`, `PlayerController`, `waveBuffs`, `WeaponSystem`, physics, etc. AI/weapons already ported (`AIBody`, `AITarget`, `CombatPeer`, `WeaponOwner`). |
| **Why it hurts** | Any field/API change on the tank ripples across sim, camera, HUD, waves. Systems cannot be unit-tested without full entity + mesh. Blocks alternate entity types / mocks. |
| **SRP** | Class itself is thinner (data + damage + muzzle helpers), but **type** still acts as universal currency. |
| **Suggested direction** | Port slices for sim systems: `MotionBody`, `Aimable`, `FxSource`, `ScoreboardUnit`, `CameraFollowable` — keep `TankEntity` only at composition roots (`GameSimulation`, factories). |

#### P0.2 — `SimContext` service-locator bag

| | |
|--|--|
| **Category** | High coupling / ISP violation / missing abstractions |
| **Evidence** | `stages.ts` `SimContext`: player, tanks, nameplates, arena, effects, projectiles, input, audio, run, combat, waves, hudModel, death/reload cells, emit, requestGameOver. Every stage receives the whole world. |
| **Why it hurts** | Stages depend on unrelated services; hard to see real deps; encourages “just grab from ctx”; test setup must wire everything. |
| **Suggested direction** | Per-stage narrow contexts or constructor-injected deps; leave only truly shared cells (dt, emit) on a thin bus. Optional: split into `WorldState` vs `Services`. |

#### P0.3 — `AIController` multi-responsibility blob

| | |
|--|--|
| **Category** | God object / SRP / size |
| **Evidence** | Largest game file ~396 LOC; owns FSM, perception, cover, strafe/orbit, obstacle avoidance, anti-stuck, boost, turret/fire, role modifiers. Helpers extracted (`aiCover`, `aiRoles`) but orchestration stays monolithic. |
| **Why it hurts** | Hard to tune one behavior without regression; testing requires full controller. |
| **Suggested direction** | Strategy/modules: `Perception`, `EngageMover`, `PatrolMover`, `AimFire`, `Avoidance` behind a small orchestrator. |

---

### P1 — High coupling of concrete services

#### P1.1 — `AudioFX` concrete everywhere

| | |
|--|--|
| **Category** | High coupling / missing abstraction |
| **Evidence** | Degree 39; in `WeaponDeps`, `CombatDeps`, `SimContext`, `HudModel` (muted), `QualityController`, stages. Single procedural WebAudio class ~291 LOC. |
| **Suggested direction** | `AudioPort` / `IAudio` with no-op for tests; keep `AudioFX` as sole impl. Optionally split engine loop vs one-shot SFX. |

#### P1.2 — `Effects` concrete hub

| | |
|--|--|
| **Category** | High coupling / missing abstraction |
| **Evidence** | Degree 34; weapons, combat, projectiles, camera, tank FX, stages. Internal modules already split; **callers** still hard-bind to class. |
| **Suggested direction** | `EffectsPort` (muzzle/impact/explosion/shake/FOV) for combat/weapons; full class only at bootstrap. |

#### P1.3 — `WeaponDeps` pulls full scene services

| | |
|--|--|
| **Category** | High coupling |
| **Evidence** | `WeaponDeps`: `THREE.Scene`, `Effects`, `AudioFX`, `DamageSystem`, `ProjectileManager`, `onShotFired`. Every weapon construct needs full world. |
| **Suggested direction** | Narrow ports per concern (damage + projectiles + fx + audio); scene only for beam/mesh ownership or inject `WeaponVfx`. |

---

### P2 — SRP / residual size concentrations

#### P2.1 — `RailgunWeapon` still multi-concern

| | |
|--|--|
| **Category** | SRP / size |
| **Evidence** | ~306–354 LOC; FSM + hitscan + charge juice + damage scale + blocker logic. Beam already in `RailgunBeamFx`; charge glow/jitter still inline (prior “low residual”). |
| **Suggested direction** | Extract charge presentation + hitscan resolver; leave FSM thin. |

#### P2.2 — `GameBootstrap` dense composition root

| | |
|--|--|
| **Category** | Coupling / complexity (acceptable root, still heavy) |
| **Evidence** | ~260–278 LOC, ~49 graph edges; wires render, audio, combat, waves, loop, visibility, death. Contains leftover `console.debug` bugfix probes. |
| **Suggested direction** | Keep as composition root; extract pure wiring tables / `bindLifecycleHooks`; strip debug. Not a “god object” if thin factories stay pure. |

#### P2.3 — Stages with policy + debug noise

| | |
|--|--|
| **Category** | SRP / hygiene |
| **Evidence** | `PlayerInputStage`, `ProjectileStage`, `WavesStage` embed combat/lifecycle policy + `TEMP DEBUG [BUGFIX-*]` logs. Same pattern in `AI`, `FlamethrowerWeapon`, `GameModeController`. **12** `console.debug` sites under `src/`. |
| **Suggested direction** | Remove or gate behind `import.meta.env.DEV`; move non-trivial policy to named pure functions (already partly done for death/C2). |

#### P2.4 — `physics.ts` kitchen sink

| | |
|--|--|
| **Category** | Missing module boundaries / mixed concerns |
| **Evidence** | Colliders, clamp, LOS, segment/circle hits, rear point — shared by AI, projectiles, arena, stages. |
| **Suggested direction** | Split `math/`, `collision/`, `los/` or at least group exports by domain. |

---

### P3 — Presentation / data coupling

#### P3.1 — `HudModel` deep reads

| | |
|--|--|
| **Category** | Coupling / missing DTO |
| **Evidence** | Constructor: `RunState` + `AudioFX` + `WaveManager` + `PlayerController`; `getHud` walks full `TankEntity` for scoreboard (hull/turret catalogs, weapon meta). Prior residual: “HudModel DTO later.” |
| **Suggested direction** | Build scoreboard rows in sim or from a narrow `HudUnit` port; HUD only consumes DTO + flags. |

#### P3.2 — React `GameApi` surface vs sim leakage

| | |
|--|--|
| **Category** | Coupling |
| **Evidence** | `Game` implements clean `GameApi`; still `fillMinimapDynamics(sim.tanks)` and quality/audio through facade. Generally OK; risk is API growth without DTO layer. |
| **Suggested direction** | Keep `GameApi` stable; push any new UI needs through snapshots only. |

---

### P4 — Configuration / catalog scatter (lower urgency)

#### P4.1 — Multiple config entry points

| | |
|--|--|
| **Category** | Duplication / discoverability |
| **Evidence** | `core/constants`, `game/constants`, `game/tuning`, `core/catalog` + `catalogData` + `TankCatalog` / `WeaponCatalog`. Workable but onboarding friction. |
| **Suggested direction** | Document single import map; optional barrel `core/index` without reintroducing cycles. |

#### P4.2 — Damage path cognitive load

| | |
|--|--|
| **Category** | Residual complexity (behavior mostly unified) |
| **Evidence** | `resolveWeaponDamage(params.damage, tuning)`; bots via `damageScale` in `PlayerFactory`/`botSpawn`; wave buffs mutate `params.damage`. Prior **P5** was “rail/flame ignore scale” — code now uses `resolveWeaponDamage` + tests (`weaponDamageScale.test.ts`). Residual is **documentation/clarity**, not dual systems. |
| **Suggested direction** | One short domain note in `weaponDamage.ts` / ANALYSIS; avoid reintroducing hardcoded tuning damage. |

#### P4.3 — `TankEntity` deprecated fields

| | |
|--|--|
| **Category** | Dead weight |
| **Evidence** | `baseDamage = 0` marked `@deprecated`; wave buff uses `buffBase`. |
| **Suggested direction** | Remove when call sites clear. |

---

### Explicitly NOT top problems anymore

| Former issue | Status |
|--------------|--------|
| `Game` as god constructor | **Fixed** — thin class + `GameBootstrap` + controllers |
| Import cycles `core ↔ game` | **Fixed** |
| Weapons branching in Game by `weaponType` | **Fixed** — `Weapon` interface + factory |
| Full `TankEntity` in AI/weapons | **Fixed** — ports (P3r) |
| Railgun beam mesh ownership | **Fixed** — `RailgunBeamFx` |
| Camera look on PlayerController | **Fixed** — `CameraLookState` |

---

## Severity matrix (next refactor backlog)

| ID | Problem | Type | Priority | Effort | Risk to gameplay |
|----|---------|------|----------|--------|------------------|
| P0.1 | TankEntity fan-in | God type / coupling | **Critical** | High | Low if ports only |
| P0.2 | SimContext bag | Coupling / ISP | **Critical** | Medium–High | Low |
| P0.3 | AIController blob | God object / SRP | **High** | High | Medium (AI feel) |
| P1.1 | AudioFX concrete | Abstraction | **High** | Low–Med | Low |
| P1.2 | Effects concrete | Abstraction | **High** | Low–Med | Low |
| P1.3 | WeaponDeps fat | Coupling | **Medium** | Medium | Low |
| P2.1 | Railgun multi-concern | SRP | **Medium** | Medium | Low–Med |
| P2.2 | Bootstrap density | Hygiene | **Medium** | Low | Low |
| P2.3 | TEMP debug logs | Hygiene | **Medium** | Low | None |
| P2.4 | physics kitchen sink | Structure | **Low–Med** | Medium | Low |
| P3.1 | HudModel DTO | Coupling | **Low–Med** | Medium | Low |
| P3.2 | GameApi growth | Coupling | **Low** | Ongoing | Low |
| P4.x | Config/catalog scatter | DX | **Low** | Low | None |

---

## Recommended order of attack (if implementing later)

1. **P2.3** — strip TEMP debug (quick win, no design).
2. **P1.1 + P1.2** — introduce `AudioPort` / `EffectsPort` at deps boundaries (unlocks tests).
3. **P0.2** — narrow stage contexts (reduces accidental coupling).
4. **P0.1** — sim-system ports off `TankEntity` (highest structural payoff).
5. **P0.3** — AI split (behavior isolation).
6. **P2.1 / P1.3 / P3.1** — polish layers.

Preserve rule from prior work: **no silent balance changes** without product OK.

---

## Implementation status (2026-07-18 session 2)

| ID | Status |
|----|--------|
| P2.3 | **done** — all TEMP debug removed |
| P1.1 | **done** — `ports/AudioPort.ts` |
| P1.2 | **done** — `ports/EffectsPort.ts` |
| P0.1 | **done** — `tank/simPorts.ts` + systems |
| P0.2 | **done** (type-level) — Pick-slices + ports on SimContext |
| P0.3 | **done** (partial) — `aiTuning` / `aiObstacle` / `aiAimFire` |
| P2.1 | **done** (charge FX) — `railgunChargeFx.ts` |
| P3.1 | **done** — HudUnit |
| P4.3 | **done** — `baseDamage` removed |
| P2.4 / catalog | deferred (optional DX) |

Verify: typecheck OK · **123/123** tests · graphify update.
