// ===== Игровой цикл: владеет RAF, dt-клампом и порядком обновления кадра =====
import { TankAnimationSystem } from './engine/systems/TankAnimationSystem';
import type { GameSimulation } from './engine/GameSimulation';
import type { CameraRig } from './CameraRig';
import type { RenderWorld } from './RenderWorld';
import type { HudModel } from './HudModel';
import type { HudSnapshot, GameEvent } from './types';
import type { TankVisual } from './Tank';
import { TimeScale } from './effects/TimeScale';

export interface GameLoopDeps {
  sim: GameSimulation;
  cameraRig: CameraRig;
  renderWorld: RenderWorld;
  hudModel: HudModel;
  /** Мутируемый HUD-снапшот, обновляемый каждый кадр (возвращается getHud()). */
  hud: HudSnapshot;
  /** Эмиттер событий боя (прокидывается в sim.step). */
  emit: (e: GameEvent) => void;
  /** Текущий визуал предпросмотра для камеры меню/гаража. */
  getPreviewVisual: () => TankVisual | null;
  /** Колбэк для пуша HUD-снапшота в React (вызывается каждый кадр). */
  onHud: (hud: HudSnapshot) => void;
}

/** Тонкая обёртка над requestAnimationFrame: симуляция + рендер + HUD. */
export class GameLoop {
  private raf = 0;
  private lastTs = 0;
  private elapsed = 0;
  private running = false;
  /** TimeScale для hit-stop и slow-mo. */
  readonly timeScale = new TimeScale();

  constructor(private deps: GameLoopDeps) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tick = (ts: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    const realDt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 0.016);
    this.lastTs = ts;

    // Применяем timeScale (hit-stop / slow-mo)
    const dt = this.timeScale.update(realDt);
    this.elapsed += dt;

    const { sim, cameraRig, renderWorld, hudModel, hud, emit, getPreviewVisual, onHud } = this.deps;

    const combatLive = sim.run.mode === 'playing' && !sim.run.paused;
    if (combatLive) {
      sim.step(dt, emit);
    } else if (!sim.run.paused && sim.tanks.length > 0) {
      // Death-pose/decay animation outside the combat step (mode 'over':
      // playing already handled it inside step — no double update).
      // PAUSED frames deliberately skip it: the pause must freeze the world,
      // not accumulate death timers behind the scrim (instant respawns after
      // a long pause were the visible symptom).
      TankAnimationSystem.updateDead(sim.tanks, dt);
    }

    if (!sim.run.paused) {
      sim.arena.update(dt, this.elapsed);
      sim.effects.update(dt);
    }
    cameraRig.update(dt, {
      mode: sim.run.mode, elapsed: this.elapsed, look: sim.input.look,
      player: sim.player, previewVisual: getPreviewVisual(),
      colliders: sim.arena.colliders, effects: sim.effects,
    });

    if (sim.run.paused) sim.audio.setEngine(0);
    const showScoreboard =
      sim.run.mode === 'playing' && sim.input.scoreHeld && !sim.run.paused;
    hudModel.getHud(sim.player, sim.tanks, showScoreboard, hud);
    onHud(hud);

    renderWorld.render();
  };
}
