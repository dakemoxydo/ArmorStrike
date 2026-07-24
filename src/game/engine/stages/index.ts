// ===== Реестр стадий симуляции (порядок = порядок тика из GDD) =====
import type { SimSystem, NameplateMap } from './types';
import type { Arena } from '../../Arena';
import type { EffectsPort } from '../../ports/EffectsPort';
import type { ProjectileManager } from '../Projectile';
import type { PlayerController } from '../../PlayerController';
import type { AudioPort } from '../../ports/AudioPort';
import type { CombatSystem } from '../../CombatSystem';
import type { BotRoster } from '../../BotRoster';
import type { HudModel } from '../../HudModel';
import type { MatchRuntime } from '../../match/MatchRuntime';

import { PlayerInputStage } from './PlayerInputStage';
import { BotAiStage } from './BotAiStage';
import { WeaponSystemStage, TankSystemStage, TankAnimationSystemStage, TankFxSystemStage } from './TankStages';
import {
  AmbientStage,
  NameplateSystemStage,
  PhysicsSystemStage,
  ProjectileStage,
  MinimapStage,
  MatchStage,
  BoostStage,
  EngineAudioStage,
} from './WorldStages';

export interface StageDeps {
  arena: Arena;
  effects: EffectsPort;
  projectiles: ProjectileManager;
  input: PlayerController;
  audio: AudioPort;
  combat: CombatSystem;
  bots: BotRoster;
  hudModel: HudModel;
  match: MatchRuntime;
  nameplates: NameplateMap;
}

/** Упорядоченный список стадий (повторяет порядок тика из GDD/Game_Lifecycle). */
export function buildSimulationStages(d: StageDeps): SimSystem[] {
  return [
    new PlayerInputStage(d.input, d.audio),
    new BotAiStage(d.bots, d.arena, d.match),
    new WeaponSystemStage(d.arena),
    new TankSystemStage(),
    new TankAnimationSystemStage(),
    new TankFxSystemStage(d.effects),
    new AmbientStage(d.effects),
    new NameplateSystemStage(d.bots, d.nameplates),
    new PhysicsSystemStage(d.arena),
    new ProjectileStage(d.projectiles, d.arena, d.effects, d.combat),
    new MinimapStage(d.arena, d.hudModel),
    new MatchStage(d.match),
    new BoostStage(d.effects),
    new EngineAudioStage(d.audio),
  ];
}

// Re-export types for external consumers.
export type { FrameContext, SimSystem, ScalarCell, NameplateMap } from './types';
