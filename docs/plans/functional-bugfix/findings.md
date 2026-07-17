# Prioritized functional bug inventory

Grounded in code + parallel explore agents (combat, weapons, modes, physics/AI).  
Severity ordered: critical → medium → low. Each entry has concrete repro steps.

---

## CRITICAL — all fixed

### C1. Death softlock — auto-pause freezes game-over — **FIXED**
- **Severity:** critical (softlock)
- **Root:** On death, `releaseLock` while `input.enabled` → `onLockLost` sets `paused=true` → `GameLoop` skips `sim.step` → death timer never advances → `togglePause` blocked while `deathT >= 0`.
- **Fix:** `deathLifecycle`: arm deathT, clear pause, disable input before releaseLock; gate lock-lost/visibility auto-pause when `deathT >= 0`; game-over disables input.
- **Repro (was):**
  1. Start match (pointer lock active).
  2. Die (enemy kill).
  3. Observe pause overlay / frozen sim; no game-over screen after ~2s.
  4. Press ESC or «ПРОДОЛЖИТЬ» → no effect; Restart/Menu still work as escape hatches.

### C2. Cannon projectiles never reduce tank HP — **FIXED**
- **Severity:** critical (broken mechanic + wave softlock for cannon-only)
- **Root:** `onHitTank` uses `applyHit(..., dmg=0)`; `ProjectileStage.onTankHit` called `combat.onTankDamaged` (presentation hook only, no `takeDamage`). Splash same split.
- **Fix:** `onTankHit` → `damageSystem.applyDamage`; `applyDamage` early-outs `dmg <= 0` (also fixes M2 double FX).
- **Repro (was):**
  1. Garage → equip **Пушка «Смоки»** (cannon).
  2. Start match; shoot a bot center-mass (and nearby for splash).
  3. Hear/see hit FX and knockback; nameplate HP does not drop; bot never dies to cannon.
  4. If only cannon damage available, wave never clears → softlock.

### C3. Railgun bots fire once then soft-stop — **FIXED**
- **Severity:** critical (bot combat broken)
- **Root:** `RailgunWeapon.setFire` only started charge on **rising edge** (`active && !prevFire && IDLE`). AI sets `wantsFire=true` every frame while aimed; after first shot `prevFire` stays true through COOLDOWN→IDLE → no second edge.
- **Fix:** Level-trigger in IDLE via `railgunShouldStartCharge(active, state, alive)` (held fire re-arms after cooldown).
- **Repro (was):**
  1. Start match; wait for a wave with a railgun bot (turret rotation includes railgun).
  2. Stay in open LOS until bot charges (~1.1s) and fires once.
  3. Remain visible and roughly still for 10+ seconds after the beam.
  4. Bot often never charges again unless LOS breaks or aim blips for a frame.

---

## MEDIUM — all fixed

### M1. Kill score / frag counter never update — **FIXED**
- **Root:** `SCORE.kill` unused; `run.kills` only reset, never incremented; only wave bonus mutates score.
- **Fix:** `applyPlayerKillScore` in `CombatSystem.onTankDestroyed` when `byPlayer`.
- **Repro (was):**
  1. Equip railgun; kill several bots.
  2. Kill feed toast may appear; HUD «ФРАГИ» stays 0; score only jumps on wave clear.
  3. Game-over screen shows kills 0.

### M2. Double combat feedback on cannon hit — **FIXED** (with C2)
- **Root:** `applyHit(..., 0)` still ran `applyDamage(0)` hooks; then `onTankHit` ran presentation again.
- **Fix:** `dmg <= 0` early-out in `createDamageSystem.applyDamage`.
- **Repro (was):**
  1. Equip cannon; hit one bot once.
  2. Hear/see doubled hit SFX / enemy hitmarks relative to a single railgun hit.

### M3. ESC pause / pointer-lock race — **FIXED**
- **Root:** `togglePause` did not `releaseLock`; lock-lost also paused → ESC could double-toggle; or pause UI with mouse still locked.
- **Fix:** On pause, `releaseLock()`; on resume, `requestLock()`; setMode disables input before release.
- **Repro (was):**
  1. Play with pointer lock.
  2. Press ESC once or repeatedly.
  3. Either pause flashes and combat continues, or pause shows but buttons unclickable until browser unlocks pointer.

### M4. `requestGameOver` leaves combat input enabled — **FIXED**
- **Root:** Transition to `'over'` set mode/events only; no `input.enabled=false` / releaseLock.
- **Fix:** `applyGameOverInputState` + releaseLock in `requestGameOver`.
- **Repro (was):**
  1. Reach game-over (death timer completed without softlock).
  2. Click canvas / mousedown.
  3. Pointer lock can re-engage; game-over buttons hard to use until browser unlocks.

### M5. Waves advance during death cam — **FIXED**
- **Root:** `WavesStage` not gated on player alive / deathT; clearing bots during death cam awards waveBonus and spawns next wave.
- **Fix:** Skip `waves.update` when `!player.alive || deathT >= 0`.
- **Repro (was):**
  1. Kill last bot while low HP, then die (or die with remaining bots dying mid death cam).
  2. During 2s death cam, wave can advance; game-over wave/score inflated by wave bonus.

### M6. `params.damage` / wave damageScale ignored by railgun & flamethrower — **FIXED**
- **Root:** Railgun/flamethrower hardcoded `WEAPON_TUNING.*.damage`; only cannon used `t.params.damage` (wave scale in botSpawn).
- **Fix:** Both weapons use `owner.params.damage` (fallback to tuning).
- **Repro (was):**
  1. Compare early-wave vs late-wave railgun or flamethrower bots (same hull).
  2. Player HP loss per hit stays base (85 / 12) while bot max HP scales with wave.

### M7. Flamethrower cone 3D angle → point-blank misses — **FIXED**
- **Root:** Muzzle elevated, target y≈0, full 3D `angleTo`, half-cone ~22.5° → pure pitch exceeds cone at short range.
- **Fix:** Planar XZ cone via `inFlameConeXZ`.
- **Repro (was):**
  1. Equip Firebird; stand ~2–4 m from a bot, aim at it.
  2. Hold fire: particles may show; damage ticks often fail.
  3. Step back to mid range → damage starts.

### M8. Player death leaves flamethrower firing audio — **FIXED**
- **Root:** On death, player input stage did not `setFire(false)`; WeaponSystem skips dead tanks so energy path never stops loop.
- **Fix:** `PlayerInputStage` calls `weapon.setFire(false)` when player not alive.
- **Repro (was):**
  1. Equip Firebird; hold fire; die mid-stream.
  2. Flame audio continues through death timer / game-over until tanks cleared.

### M9. Railgun hitscan blocked by decorative arena meshes — **FIXED**
- **Root:** `arena.group.traverse` all Mesh; decorative props stopped beam; projectiles only use `blocksShots` colliders.
- **Fix:** Tank mesh raycast + `nearestShotBlockerDist` on colliders with `blocksShots`.
- **Repro (was):**
  1. Equip railgun; aim so ray grazes a lamp/sign/prop that cannon shells ignore.
  2. Fire: beam shortens; tanks behind may take no hit; impact FX on prop.

### M10. Physics: tank–tank after walls + near-zero explosive separation — **FIXED**
- **Root:** Wall resolve then pair push with unbounded `1/d` for small d; no second wall pass → embed/fling.
- **Fix:** `separateTankPair` with maxPush + axis for near-coincident; second `resolveWalls` after pairs.
- **Repro (was):**
  1. Pin against wall; let bot drive into you repeatedly → jitter into wall / speed thrash.
  2. Force two tanks nearly stacked → one frame fling across arena.

### M11. AI aim noise re-rolled every frame — **FIXED**
- **Root:** Each AI tick set `aimYaw = atan2 + randomError`; turret never settled within aimTol → fire starved.
- **Fix:** Hold `aimNoise` for ~0.35–0.6s between re-rolls.
- **Repro (was):**
  1. Early wave, railgun/cannon bot with clear LOS at preferred range.
  2. Observe turret hunting and long gaps with no shots despite facing you.

### M12. Ramps are solid AABB walls (no climb); shots pass through — **FIXED**
- **Root:** Ramp colliders full boxes for hull; `blocksShots: false` so shells pass; felt like invisible wall.
- **Fix:** Hull/AI skip `kind === 'ramp'` colliders (visual remains; no solid wall).
- **Repro (was):**
  1. Drive toward a ramp mesh (e.g. near ±26, ±26 or axis ramps).
  2. Hull stops on invisible box; no climb.
  3. Fire through ramp volume — shells pass.

---

## LOW (not required — deferred)

### L1. `applyDamage(0)` presentation (standalone residual if knock-only helpers remain)
- **Repro:** Any knockback-only path that still called hooks before C2 fix.

### L2. Flamethrower `reloading` when energy < 10
- **Repro:** Drain flame below 10 while holding fire → reload SFX/UI mid-stream.

### L3. Flame restart dead-zone energy (0, 5]
- **Repro:** Empty tank, release, tap fire at energy 3–5 → no spray until above 5.

### L4. Cannon ammo spent if projectile pool full
- **Repro:** Stress-fire when 42 pool saturated → ammo decreases without shot.

### L5. Global single flame audio source conflicts
- **Repro:** Two flame bots fire; one stops → silence while other still sprays.

### L6. Dead shooter skips weapon FX update (beam freeze)
- **Repro:** Kill railgun bot as beam appears → beam hangs until wave cleanup.

### L7. Engine audio may linger leaving match without pause
- **Repro:** setMode menu/garage from playing while not paused → engine may continue.

### L8. `resolveCircle` only 2 sweeps
- **Repro:** Drive hard into multi-AABB corners at full boost → brief residual embed.

### L9. Friendly-fire incomplete for area/pen weapons
- **Repro:** Cluster bots with flame/cannon/rail pen → ally HP drops from splash/cone/pen.

---

## Final status
**Critical + medium: closed.** Low only remaining (deferred under non-goals).
