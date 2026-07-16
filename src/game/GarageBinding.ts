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
  constructor(private d: GarageBindingDeps) {}

  setSelection(hullId: HullId, turretId: TurretId) {
    const { sim, previewController, emit } = this.d;
    sim.run.currentHull = hullId;
    sim.run.currentTurret = turretId;
    previewController.rebuild(hullId, turretId);
    sim.audio.click();
    sim.run.save();
    emit({ type: 'garageChanged' });
  }
}
