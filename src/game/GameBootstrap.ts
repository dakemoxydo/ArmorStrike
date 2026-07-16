// ===== Фабрика/бутстрап подсистем игры =====
// Извлечено из конструктора Game: конструирует и связывает все подсистемы,
// применяет сохранённый пресет качества и навешивает слушатели окна.
import * as THREE from 'three';
import { Arena } from './Arena';
import { Effects } from './effects';
import { ProjectileManager } from './engine/Projectile';
import { PlayerController } from './PlayerController';
import { AudioFX } from './audio';
import { CombatSystem } from './CombatSystem';
import { HudModel } from './HudModel';
import { RenderWorld } from './RenderWorld';
import { RunState } from './RunState';
import { WaveManager } from './WaveManager';
import { GameSimulation } from './engine/GameSimulation';
import { createWeapon, type WeaponFactoryDeps } from './PlayerFactory';
import { GameLoop } from './GameLoop';
import { PreviewController } from './PreviewController';
import { GarageInput } from '../ui/GarageInput';
import { getQualityPreset, loadQuality } from './graphicsQuality';
import type { GameEvent } from './types';

export interface GameContext {
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  renderWorld: RenderWorld;
  cameraRig: RenderWorld['cameraRig'];
  sim: GameSimulation;
  previewController: PreviewController;
  gameLoop: GameLoop;
  weaponDeps: WeaponFactoryDeps;
  garageInput: GarageInput;
  audio: AudioFX;
  emitEvent: (e: GameEvent) => void;
  addListener: (fn: (e: GameEvent) => void) => void;
  removeListener: (fn: (e: GameEvent) => void) => void;
  onResize: () => void;
  onVisibility: () => void;
  hudSink: { current: ((hud: import('./types').HudSnapshot) => void) | null };
}

/** Строит и связывает все подсистемы, возвращая готовый контекст. */
export function bootstrapGame(canvas: HTMLCanvasElement): GameContext {
  const renderWorld = new RenderWorld(canvas);
  const scene = renderWorld.scene;
  const cameraRig = renderWorld.cameraRig;

  const arena = new Arena(scene);
  const effects = new Effects(scene);
  const projectiles = new ProjectileManager(scene);
  const input = new PlayerController();
  const audio = new AudioFX();
  const run = new RunState();

  input.attach(canvas);

  const listeners = new Set<(e: GameEvent) => void>();
  const emitEvent = (e: GameEvent) => {
    for (const fn of listeners) fn(e);
  };

  const combat = new CombatSystem({
    arena, effects, audio,
    emit: (e) => emitEvent(e),
    onPlayerDeath: () => sim?.onPlayerDeath?.(),
  });

  const weaponDeps: WeaponFactoryDeps = {
    scene,
    effects,
    audio,
    damageSystem: combat.damageSystem,
    projectiles,
    onShotFired: () => emitEvent({ type: 'shotFired' }),
  };

  const waves = new WaveManager({
    scene, arena, effects, audio, run,
    createWeapon: (tank, type) => createWeapon(tank, type, weaponDeps),
    emit: (e) => emitEvent(e),
  });

  const hudModel = new HudModel({ run, audio, waves, input });
  hudModel.buildMinimap(arena);

  const sim = new GameSimulation(arena, effects, projectiles, input, audio, run, combat, waves, hudModel);
  sim.onPlayerDeath = () => {
    input.releaseLock();
    sim.deathT = 0;
  };

  const previewController = new PreviewController(scene, () => sim.run.mode);
  previewController.rebuild(sim.run.currentHull, sim.run.currentTurret);

  // Применить сохранённый пресет (конструктор RenderWorld уже загрузил его)
  renderWorld.applyQuality(getQualityPreset(loadQuality()));

  const onResize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderWorld.resize(w, h);
  };
  onResize();
  window.addEventListener('resize', onResize);
  const onVisibility = () => {
    if (document.hidden && sim.run.mode === 'playing' && !sim.run.paused) {
      sim.run.paused = true;
      emitEvent({ type: 'pauseChanged', value: true });
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  input.onLockLost = () => {
    if (sim.run.mode === 'playing' && !sim.run.paused) {
      sim.run.paused = true;
      emitEvent({ type: 'pauseChanged', value: true });
    }
  };

  const garageInput = new GarageInput({
    canvas,
    isInteractive: () => sim.run.mode === 'garage',
    cameraRig,
  });
  garageInput.attach();

  const hudSink: { current: ((hud: import('./types').HudSnapshot) => void) | null } = { current: null };

  const gameLoop = new GameLoop({
    sim,
    cameraRig,
    renderWorld,
    hudModel,
    hud: hudModel.getHud(null, []),
    emit: emitEvent,
    getPreviewVisual: () => previewController.previewVisual,
    onHud: (hud) => hudSink.current?.(hud),
  });

  return {
    canvas,
    scene,
    renderWorld,
    cameraRig,
    sim,
    previewController,
    gameLoop,
    weaponDeps,
    garageInput,
    audio,
    emitEvent,
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
    onResize,
    onVisibility,
    hudSink,
  };
}
