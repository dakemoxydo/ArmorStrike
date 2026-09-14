// ===== Привязка выбора гаража (корпус + башня) =====
import type { GameSimulation } from './engine/GameSimulation';
import type { PreviewController } from './PreviewController';
import type { GameEvent } from './types';
import type { HullId, TurretId } from '../core/catalog';

export interface GarageBindingDeps {
  sim: GameSimulation;
  previewController: PreviewController;
  emit: (e: GameEvent) => void;
}

/**
 * Инкапсулирует смену выбранных корпуса/башни, пересборку превью и событие.
 * Ранее жило в Game (setGarageSelection).
 */
export class GarageBinding {
  /**
   * Serializes selection commits (mirrors GameModeController.startSeq): fast
   * clicks spawn overlapping async rebuilds, and the LAST successful preview
   * must be the one committed — otherwise an earlier await can resolve later
   * and overwrite the newer committed loadout.
   */
  private seq = 0;

  constructor(private d: GarageBindingDeps) {}

  async setSelection(hullId: HullId, turretId: TurretId) {
    const { sim, previewController, emit } = this.d;
    const seq = ++this.seq;
    // Rebuild the preview FIRST, commit only on success: `run.currentHull` /
    // `currentTurret` (and the persisted loadout) must never point at a hull
    // whose preview failed to build. A rejection propagates to the caller
    // (Game → Garage UI reverts its optimistic selection).
    await previewController.rebuild(hullId, turretId);
    // Superseded by a newer selection while the GLB was loading — the newer
    // call owns the commit (it may still be in flight itself).
    if (seq !== this.seq) return;
    sim.run.currentHull = hullId;
    sim.run.currentTurret = turretId;
    sim.audio.click();
    sim.run.save();
    emit({ type: 'garageChanged' });
  }
}
