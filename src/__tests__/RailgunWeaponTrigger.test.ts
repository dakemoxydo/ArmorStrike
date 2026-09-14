// ===== M20: клик запускает заряд, отменить выстрел нельзя =====
// Регресс на старое поведение (M18 cancel-on-release): отпущенный триггер
// во время CHARGING больше НЕ сбрасывает заряд — выстрел неизбежен.
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { RailgunWeapon } from '../game/weapons/RailgunWeapon';
import type { WeaponContext, WeaponDeps, WeaponOwner } from '../game/weapons/types';
import { LightRig } from '../game/effects/LightRig';
import { WEAPON_TUNING } from '../core/catalog';

function makeWeapon() {
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
  };
  const barrelGroup = new THREE.Group();
  const muzzle = new THREE.Object3D();
  const group = new THREE.Group();
  group.add(barrelGroup);
  barrelGroup.add(muzzle);
  const owner = {
    id: 1,
    teamId: 0,
    isPlayer: true,
    alive: true,
    fireTimer: 0,
    position: new THREE.Vector3(),
    params: { damage: WEAPON_TUNING.railgun.damage, range: WEAPON_TUNING.railgun.range },
    visual: { group, barrelGroup, muzzle },
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
  return { w, ctx, audio, effects, scene };
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
});
