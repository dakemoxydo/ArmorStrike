// ===== M20: клик запускает заряд, отменить выстрел нельзя =====
// Регресс на старое поведение (M18 cancel-on-release): отпущенный триггер
// во время CHARGING больше НЕ сбрасывает заряд — выстрел неизбежен.
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { RailgunWeapon } from '../game/weapons/RailgunWeapon';
import type { CombatPeer, WeaponContext, WeaponDeps, WeaponOwner } from '../game/weapons/types';
import { LightRig } from '../game/effects/LightRig';
import { WEAPON_TUNING } from '../core/catalog';

function makeWeapon(opts: { isPlayer?: boolean } = {}) {
  const scene = new THREE.Scene();
  const rig = new LightRig(scene);
  let nextHandle = 1;
  const audio = {
    chargeRailgun: vi.fn(() => ({ id: nextHandle++ })),
    stopChargeRailgun: vi.fn(),
    setChargeRailgunPitch: vi.fn(),
    shoot: vi.fn(),
    railgunPierce: vi.fn(),
  };
  const effects = {
    railgunMuzzle: vi.fn(),
    railgunImpact: vi.fn(),
    trailPuff: vi.fn(),
    debris: vi.fn(),
    boostJet: vi.fn(),
    addShake: vi.fn(),
    setFovTighten: vi.fn(),
    addFovPunch: vi.fn(),
    spawnSmoke: vi.fn(),
  };
  const barrelGroup = new THREE.Group();
  const muzzle = new THREE.Object3D();
  // Реальный материал, не мок: его пишут railgunChargeFx / onOwnerDeath.
  const railGlowMat = new THREE.MeshStandardMaterial({ emissive: new THREE.Color(0x2ee6c0) });
  railGlowMat.emissiveIntensity = WEAPON_TUNING.railgun.emissiveIdle;
  const group = new THREE.Group();
  group.add(barrelGroup);
  barrelGroup.add(muzzle);
  const owner = {
    id: 1,
    teamId: 0,
    isPlayer: opts.isPlayer ?? true,
    alive: true,
    fireTimer: 0,
    position: new THREE.Vector3(),
    params: { damage: WEAPON_TUNING.railgun.damage, range: WEAPON_TUNING.railgun.range },
    visual: { group, barrelGroup, muzzle, railGlowMat },
    muzzleWorld: (out: THREE.Vector3) => out.set(0, 1.6, 0),
    aimDir: (out: THREE.Vector3) => out.set(0, 0, 1),
    onFired: vi.fn(),
    setBarrelKick: vi.fn(),
  } as unknown as WeaponOwner;
  const damageSystem = {
    applyDamage: vi.fn(),
    applyKnockback: vi.fn(),
    damageBlock: vi.fn(),
  };
  const deps = {
    scene, lights: rig, audio, effects, damageSystem, projectiles: {},
  } as unknown as WeaponDeps;
  const w = new RailgunWeapon(owner, deps);
  const ctx: WeaponContext = { tanks: [], colliders: [] };
  return { w, ctx, audio, effects, scene, railGlowMat };
}

describe('RailgunWeapon trigger (M20 click-to-fire, no cancel)', () => {
  it('releasing the trigger mid-charge does NOT cancel', () => {
    const { w, audio } = makeWeapon();
    w.setFire(true);
    expect(w.state).toBe('CHARGING');
    expect(audio.chargeRailgun).toHaveBeenCalledTimes(1);

    w.setFire(false); // клик отпущен — заряд обязан жить
    expect(w.state).toBe('CHARGING');
    expect(w.isCharging).toBe(true);
    expect(audio.stopChargeRailgun).not.toHaveBeenCalled();

    w.setFire(true); // повторный клик не перезапускает заряд
    expect(audio.chargeRailgun).toHaveBeenCalledTimes(1);
  });

  it('a tap that was released long ago still completes and fires', () => {
    const { w, ctx, audio } = makeWeapon();
    w.setFire(true);
    w.setFire(false);
    // крутим тики без повторного нажатия: chargeTime = 1.1 с
    for (let t = 0; t < 1.2; t += 0.1) w.update(0.1, ctx);
    expect(audio.shoot).toHaveBeenCalledWith('railgun');
    expect(w.state).toBe('COOLDOWN');
  });

  it('death mid-charge still stops the shot (only non-click escape)', () => {
    const { w, audio, effects } = makeWeapon();
    w.setFire(true);
    w.onOwnerDeath!();
    expect(w.state).toBe('IDLE');
    expect(audio.stopChargeRailgun).toHaveBeenCalledTimes(1);
    expect(effects.setFovTighten).toHaveBeenCalledWith(0);
  });

  it('beam front: impacts/trail arrive after the shot, not in the fire frame', () => {
    const { w, ctx, effects } = makeWeapon();
    w.setFire(true);
    // Докручиваем по одному кадру (0.1 с), пока не наступит выстрел (COOLDOWN).
    let guard = 0;
    while (w.state === 'CHARGING' && guard++ < 30) w.update(0.1, ctx);
    expect(w.state).toBe('COOLDOWN');
    // В кадре самого выстрела фронт ещё не добежал: трейла нет (hitscan-урон
    // мгновенен, но показ отложен на tracerDelay + обгон фронтом).
    expect(effects.trailPuff.mock.calls.length).toBe(0);
    // Несколько кадров спустя свип прогоняет фронт — сегменты появляются.
    for (let i = 0; i < 15; i++) w.update(0.016, ctx);
    expect(effects.trailPuff.mock.calls.length).toBeGreaterThan(0);
  });

  it('M21: charge balls appear mid-charge and self-clear after the fire pop', () => {
    const { w, ctx, scene } = makeWeapon();
    const ballMeshes = () =>
      scene.children.filter(
        (c) => c instanceof THREE.Mesh && (c.geometry as THREE.SphereGeometry).type === 'SphereGeometry',
      ) as THREE.Mesh[];
    expect(ballMeshes()).toHaveLength(2);
    for (const m of ballMeshes()) expect(m.visible).toBe(false);

    w.setFire(true);
    // Середина заряда (chargeTime 1.1 с): 0.2 с — оба шара на дуле, белый больше.
    w.update(0.1, ctx);
    w.update(0.1, ctx);
    expect(w.state).toBe('CHARGING');
    for (const m of ballMeshes()) expect(m.visible).toBe(true);
    const white = ballMeshes().find((m) => (m.material as THREE.MeshBasicMaterial).color.getHex() === 0xffffff)!;
    const cyan = ballMeshes().find((m) => (m.material as THREE.MeshBasicMaterial).color.getHex() === 0x8fffe8)!;
    expect(white.scale.x).toBeGreaterThan(cyan.scale.x);

    // Доигрываем до выстрела: pop-релиз (releaseDuration 0.09 с) гасит оба шара,
    // при этом cooldown ещё идёт — скрытие не зависит от state.
    let guard = 0;
    while (w.state === 'CHARGING' && guard++ < 30) w.update(0.1, ctx);
    expect(w.state).toBe('COOLDOWN');
    for (let i = 0; i < 10; i++) w.update(0.05, ctx); // 0.5 с > релиза
    for (const m of ballMeshes()) expect(m.visible).toBe(false);
  });

  it('M21: death mid-charge hides the balls instantly', () => {
    const { w, ctx, scene } = makeWeapon();
    w.setFire(true);
    w.update(0.4, ctx);
    const ballMeshes = () =>
      scene.children.filter(
        (c) => c instanceof THREE.Mesh && (c.geometry as THREE.SphereGeometry).type === 'SphereGeometry',
      ) as THREE.Mesh[];
    expect(ballMeshes().every((m) => m.visible)).toBe(true);

    w.onOwnerDeath!();
    w.update(0.016, ctx); // ни одного кадра show после смерти
    for (const m of ballMeshes()) expect(m.visible).toBe(false);
  });

  it('death mid-charge zeroes the rail glow (no glowing wreck)', () => {
    const { w, ctx, railGlowMat } = makeWeapon();
    w.setFire(true);
    w.update(0.4, ctx); // glow рос вместе с зарядом
    expect(railGlowMat.emissiveIntensity).toBeGreaterThan(WEAPON_TUNING.railgun.emissiveIdle);
    // WeaponSystem мёртвых не обновляет — сбрасывать обязан onOwnerDeath.
    w.onOwnerDeath!();
    expect(railGlowMat.emissiveIntensity).toBe(0);
  });

  it('bot fire shakes the camera only within fireShakeBotRange of the player', () => {
    const rt = WEAPON_TUNING.railgun;
    const peer = (z: number) => ({
      id: 2, teamId: null, alive: true, isPlayer: true,
      position: new THREE.Vector3(0, 0, z),
      visual: { group: new THREE.Group() },
    }) as unknown as CombatPeer;

    const near = makeWeapon({ isPlayer: false });
    near.ctx.tanks = [peer(rt.fireShakeBotRange - 10)];
    near.w.setFire(true);
    let guard = 0;
    while (near.w.state === 'CHARGING' && guard++ < 30) near.w.update(0.1, near.ctx);
    expect(near.w.state).toBe('COOLDOWN');
    expect(near.effects.addShake).toHaveBeenCalledWith(rt.fireShakeBot);

    const far = makeWeapon({ isPlayer: false });
    far.ctx.tanks = [peer(rt.fireShakeBotRange + 50)];
    far.w.setFire(true);
    guard = 0;
    while (far.w.state === 'CHARGING' && guard++ < 30) far.w.update(0.1, far.ctx);
    expect(far.effects.addShake).not.toHaveBeenCalled();
  });
});
