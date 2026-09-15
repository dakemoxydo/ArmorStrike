// ===== Игровой цикл: владеет RAF, dt-клампом и порядком обновления кадра =====
import * as THREE from 'three';
import { WEAPON_TUNING } from '../core/catalog';
import { TankAnimationSystem } from './engine/systems/TankAnimationSystem';
import type { GameSimulation } from './engine/GameSimulation';
import type { CameraRig } from './CameraRig';
import type { RenderWorld } from './RenderWorld';
import type { HudModel } from './HudModel';
import type { HudSnapshot, GameEvent } from './types';
import type { TankVisual } from './Tank';
import { TimeScale } from './effects/TimeScale';
import { reticleImpactDistance } from './aimReticle';
import { clamp } from './engine/physics';

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

  // Scratch-векторы прицела (см. updateCrosshair) — без аллокаций на кадр.
  private readonly _muzzleW = new THREE.Vector3();
  private readonly _aimDir = new THREE.Vector3();
  private readonly _impactP = new THREE.Vector3();
  private readonly _lockTargetP = new THREE.Vector3();

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

    if (sim.run.paused || sim.run.mode === 'over') sim.audio.setEngine(0);
    // Пауза замораживает и аудио-таймлайн: гул/тики заряда рельсы иначе
    // доигрывали под затемнением (rAF идёт, шаг симуляции — нет). Идемпотентно.
    sim.audio.setPaused(sim.run.paused);
    const showScoreboard =
      sim.run.mode === 'playing' && sim.input.scoreHeld && !sim.run.paused;
    hudModel.getHud(sim.player, sim.tanks, showScoreboard, hud);
    this.updateCrosshair(hud);
    onHud(hud);

    renderWorld.render();
  };

  /**
   * Прицел на реальной линии выстрела: пуля/луч летит горизонтально от дула
   * по aimYaw (см. Tank.aimDir), а не вдоль взгляда камеры с pitch. Берём
   * точку, где выстрел реально остановится (стена/чужой танк/дальность),
   * проецируем её камерой текущего кадра в % вьюпорта — HUD красит позицию
   * через ref. Сцена ещё не отрендерена, но камера после cameraRig.update
   * финальна (тряска/FOV учтены), проекция совпадает с картинкой этого кадра.
   */
  private updateCrosshair(hud: HudSnapshot): void {
    const { sim, cameraRig } = this.deps;
    const pl = sim.player;
    if (sim.run.mode !== 'playing' || !pl || !pl.alive) {
      hud.hasLockTarget = false;
      return;
    }

    pl.muzzleWorld(this._muzzleW);
    pl.aimDir(this._aimDir);
    const wt = pl.params.weaponType;
    const range = pl.params.range ?? WEAPON_TUNING[wt ?? 'cannon'].range;
    const dist = reticleImpactDistance(
      this._muzzleW.x, this._muzzleW.z, this._muzzleW.y,
      this._aimDir.x, this._aimDir.z,
      range, sim.arena.colliders, sim.tanks, pl.id,
      // Рельса и Гаусс сканируют/пробивают препятствия для прицела
      wt === 'railgun' || wt === 'gauss',
    );
    this._impactP.copy(this._muzzleW).addScaledVector(this._aimDir, dist);

    const cam = cameraRig.camera;
    cam.updateMatrixWorld();
    this._impactP.project(cam);
    // Точка за камерой (x/w меняет знак) — зеркалим clamp'ом к краю: на практике
    // линия выстрела всегда в секторе обзора (камера и башня делят один yaw).
    hud.crossX = clamp((this._impactP.x * 0.5 + 0.5) * 100, 1, 99);
    hud.crossY = clamp((-this._impactP.y * 0.5 + 0.5) * 100, 1, 99);

    // Проекция захваченной цели lock-on (Гаусс) на экран
    const lockTarget = pl.weapon?.getLockTarget?.();
    if (lockTarget && 'position' in lockTarget && lockTarget.position) {
      this._lockTargetP.copy(lockTarget.position);
      this._lockTargetP.y += 0.8;
      const targetDist = cam.position.distanceTo(this._lockTargetP);
      this._lockTargetP.project(cam);
      if (this._lockTargetP.z <= 1) {
        hud.hasLockTarget = true;
        hud.lockTargetX = clamp((this._lockTargetP.x * 0.5 + 0.5) * 100, 0, 100);
        hud.lockTargetY = clamp((-this._lockTargetP.y * 0.5 + 0.5) * 100, 0, 100);
        hud.lockTargetDist = targetDist;
      } else {
        hud.hasLockTarget = false;
      }
    } else {
      hud.hasLockTarget = false;
    }
  }
}
