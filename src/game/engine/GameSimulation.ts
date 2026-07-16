import * as THREE from 'three';
import type { TankEntity } from '../Tank';
import { Nameplate } from '../nameplate';
import type { Arena } from '../Arena';
import type { Effects } from '../effects';
import type { ProjectileManager } from './Projectile';
import type { PlayerController } from '../PlayerController';
import type { AudioFX } from '../audio';
import type { RunState } from '../RunState';
import type { WaveManager } from '../WaveManager';
import type { CombatSystem } from '../CombatSystem';
import type { HudModel } from '../HudModel';
import type { GameEvent } from '../types';
import { buildSimulationStages, type SimSystem } from './stages';

export class GameSimulation {
  player: TankEntity | null = null;
  tanks: TankEntity[] = [];
  nameplates = new Map<number, { plate: Nameplate; color: number }>();
  deathT = -1;
  prevReloading = false;

  private systems: SimSystem[] = buildSimulationStages();

  /** Колбэк гибели игрока (устанавливается Game после создания sim). */
  onPlayerDeath?: () => void;

  constructor(
    readonly arena: Arena,
    readonly effects: Effects,
    readonly projectiles: ProjectileManager,
    readonly input: PlayerController,
    readonly audio: AudioFX,
    readonly run: RunState,
    readonly combat: CombatSystem,
    readonly waves: WaveManager,
    readonly hudModel: HudModel,
  ) {}

  step(dt: number, emit: (e: GameEvent) => void) {
    const p = this.player;
    if (!p) return;
    this.run.matchTime += dt;

    const ctx = { sim: this, dt, emit };
    for (const s of this.systems) s.update(ctx);
  }

  clearTanks(scene: THREE.Scene) {
    for (const np of this.nameplates.values()) np.plate.dispose(scene);
    this.nameplates.clear();
    for (const t of this.tanks) t.dispose(scene);
    this.tanks = [];
    this.waves.reset();
    this.player = null;
  }
}
