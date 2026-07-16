import * as THREE from 'three';
import type { TankEntity } from './Tank';
import { Nameplate } from './nameplate';
import { COLORS } from './constants';
import { WeaponSystem } from './systems/WeaponSystem';
import { TankSystem } from './systems/TankSystem';
import { TankAnimationSystem } from './systems/TankAnimationSystem';
import { TankFxSystem } from './systems/TankFxSystem';
import { NameplateSystem } from './systems/NameplateSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { MinimapSystem } from './systems/MinimapSystem';
import type { Arena } from './Arena';
import type { Effects } from './effects';
import type { ProjectileManager } from './Projectile';
import type { PlayerController } from './PlayerController';
import type { AudioFX } from './audio';
import type { RunState } from './RunState';
import type { WaveManager } from './WaveManager';
import type { CombatSystem } from './CombatSystem';
import type { HudModel } from './HudModel';
import type { GameEvent } from './Game';

const _bv = new THREE.Vector3();
const _bd = new THREE.Vector3();

export class GameSimulation {
  player: TankEntity | null = null;
  tanks: TankEntity[] = [];
  nameplates = new Map<number, { plate: Nameplate; color: number }>();
  deathT = -1;
  prevReloading = false;

  combat!: CombatSystem;
  waves!: WaveManager;
  hudModel!: HudModel;

  constructor(
    readonly arena: Arena,
    readonly effects: Effects,
    readonly projectiles: ProjectileManager,
    readonly input: PlayerController,
    readonly audio: AudioFX,
    readonly run: RunState,
  ) {}

  step(dt: number, emit: (e: GameEvent) => void) {
    const p = this.player;
    if (!p) return;
    this.run.matchTime += dt;

    if (p.alive) {
      const wantsFire = this.input.update(p);
      p.weapon?.setFire(wantsFire);
      if (p.fullReloading && !this.prevReloading) this.audio.reload();
      this.prevReloading = p.fullReloading;
    } else {
      this.prevReloading = false;
    }

    const bounds = this.arena.half - 6;
    const others = this.tanks.filter((t) => !t.isPlayer);
    for (const b of this.waves.bots) {
      b.ai.update(dt, {
        player: p, bots: others,
        colliders: this.arena.colliders, bounds,
      });
      b.tank.weapon?.setFire(b.ai.wantsFire);
    }

    WeaponSystem.update(this.tanks, this.arena, dt);
    TankSystem.update(this.tanks, dt);
    TankAnimationSystem.update(this.tanks, dt);
    TankFxSystem.update(this.tanks, this.effects, dt);

    if (p) this.effects.setAmbientCenter(p.position.x, p.position.z);
    NameplateSystem.update(this.waves.bots, this.nameplates);
    PhysicsSystem.resolveCollisions(this.tanks, this.arena.colliders);

    this.projectiles.update(dt, {
      colliders: this.arena.colliders,
      tanks: this.tanks,
      arena: this.arena,
      effects: this.effects,
      onTankHit: (target, dmg, owner) => this.combat.onTankHit(target, dmg, owner),
      onBlockDestroyed: this.combat.onBlockDestroyed,
    });

    this.waves.update(dt, this.tanks, this.nameplates);
    MinimapSystem.sync(this.arena, this.hudModel.getByIdMap());

    if (this.deathT >= 0) {
      this.deathT += dt;
      if (this.deathT > 2.0) {
        this.deathT = -1;
        this.run.mode = 'over';
        emit({ type: 'gameOver', score: this.run.score, kills: this.run.kills, wave: this.waves.wave });
      }
    }

    const boostBack = p.yaw + Math.PI;
    const bx = p.position.x + Math.sin(boostBack) * 2.4;
    const bz = p.position.z + Math.cos(boostBack) * 2.4;
    if (p.alive && p.boostActive) {
      _bv.set(bx, 0.75, bz);
      _bd.set(Math.sin(boostBack), 0.05, Math.cos(boostBack)).normalize();
      this.effects.boostJet(_bv, _bd, COLORS.player);
    }

    this.audio.setEngine(
      p.alive ? Math.min(1, Math.abs(p.speed) / p.params.speed) : 0,
      p.alive && p.boostActive,
    );
  }

  clearTanks(scene: THREE.Scene) {
    for (const t of this.tanks) t.weapon?.dispose();
    for (const np of this.nameplates.values()) np.plate.dispose(scene);
    this.nameplates.clear();
    for (const t of this.tanks) t.dispose(scene);
    this.tanks = [];
    this.waves.reset();
    this.player = null;
  }
}
