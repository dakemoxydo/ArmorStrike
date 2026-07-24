// ===== Фабрика/бутстрап подсистем игры =====
// Извлечено из конструктора Game: конструирует и связывает все подсистемы,
// применяет сохранённый пресет качества и навешивает слушатели окна.
import * as THREE from 'three';
import { Arena } from './Arena';
import { Effects } from './effects';
import { ProjectileManager } from './engine/Projectile';
import { PlayerController } from './PlayerController';
import { AudioFX } from './audio';
import type { AudioPort } from './ports/AudioPort';
import type { EffectsPort } from './ports/EffectsPort';
import { CombatSystem } from './CombatSystem';
import { HudModel } from './HudModel';
import { RenderWorld } from './RenderWorld';
import { RunState } from './RunState';
import { BotRoster } from './BotRoster';
import { GameSimulation } from './engine/GameSimulation';
import type { WeaponFactoryDeps } from './PlayerFactory';
import { GameLoop } from './GameLoop';
import { PreviewController } from './PreviewController';
import { GarageInput } from '../ui/GarageInput';
import { getQualityPreset, loadQuality } from './graphicsQuality';
import type { GameEvent } from './types';
import {
  applyPlayerDeathState,
  shouldAutoPauseOnInterrupt,
} from './deathLifecycle';

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
  audio: AudioPort;
  emitEvent: (e: GameEvent) => void;
  addListener: (fn: (e: GameEvent) => void) => void;
  removeListener: (fn: (e: GameEvent) => void) => void;
  onResize: () => void;
  onVisibility: () => void;
  hudSink: { current: ((hud: import('./types').HudSnapshot) => void) | null };
}

// ---- Builder: рендер и сцена ----
function buildRenderWorld(canvas: HTMLCanvasElement): {
  renderWorld: RenderWorld;
  scene: THREE.Scene;
  cameraRig: RenderWorld['cameraRig'];
} {
  const renderWorld = new RenderWorld(canvas);
  return { renderWorld, scene: renderWorld.scene, cameraRig: renderWorld.cameraRig };
}

// ---- Builder: шина событий ----
function buildEventBus(): {
  emitEvent: (e: GameEvent) => void;
  addListener: (fn: (e: GameEvent) => void) => void;
  removeListener: (fn: (e: GameEvent) => void) => void;
} {
  const listeners = new Set<(e: GameEvent) => void>();
  const emitEvent = (e: GameEvent) => { for (const fn of listeners) fn(e); };
  return {
    emitEvent,
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
  };
}

// ---- Builder: базовые подсистемы ----
function buildCoreSubsystems(scene: THREE.Scene, canvas: HTMLCanvasElement): {
  arena: Arena;
  effects: EffectsPort;
  projectiles: ProjectileManager;
  input: PlayerController;
  audio: AudioPort;
  run: RunState;
} {
  const arena = new Arena(scene);
  const effects = new Effects(scene);
  const projectiles = new ProjectileManager(scene);
  const input = new PlayerController();
  const audio = new AudioFX();
  const run = new RunState();
  input.attach(canvas);
  return { arena, effects, projectiles, input, audio, run };
}

// ---- Builder: производные системы (зависят от combat) ----
function buildDerivedSystems(
  scene: THREE.Scene,
  arena: Arena,
  effects: EffectsPort,
  audio: AudioPort,
  projectiles: ProjectileManager,
  input: PlayerController,
  run: RunState,
  emitEvent: (e: GameEvent) => void,
  combat: CombatSystem,
): {
  weaponDeps: WeaponFactoryDeps;
  bots: BotRoster;
  hudModel: HudModel;
  matchHolder: { current: import('./match/MatchRuntime').MatchRuntime | null };
} {
  const weaponDeps: WeaponFactoryDeps = {
    scene, effects, audio,
    damageSystem: combat.damageSystem,
    projectiles,
    onShotFired: () => emitEvent({ type: 'shotFired' }),
  };
  const bots = new BotRoster();
  // getMatch filled after GameSimulation construction (see bootstrapGame).
  const matchHolder: { current: import('./match/MatchRuntime').MatchRuntime | null } = { current: null };
  const hudModel = new HudModel({
    run,
    audio,
    bots,
    input,
    getMatch: () => matchHolder.current,
  });
  hudModel.buildMinimap(arena);
  return { weaponDeps, bots, hudModel, matchHolder };
}

// ---- Builder: оконные обработчики ----
function registerWindowHandlers(
  canvas: HTMLCanvasElement,
  renderWorld: RenderWorld,
  sim: GameSimulation,
  input: PlayerController,
  emitEvent: (e: GameEvent) => void,
): {
  onResize: () => void;
  onVisibility: () => void;
} {
  const onResize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderWorld.resize(w, h);
  };
  onResize();
  window.addEventListener('resize', onResize);

  const onVisibility = () => {
    // Auto-pause on tab hide, gated by death cam (BUGFIX-C1)
    if (
      document.hidden &&
      shouldAutoPauseOnInterrupt(sim.run.mode, sim.run.paused, sim.deathT)
    ) {
      sim.run.paused = true;
      emitEvent({ type: 'pauseChanged', value: true });
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  input.onLockLost = () => {
    // Root fix C1: intentional lock release on death must NOT pause.
    if (shouldAutoPauseOnInterrupt(sim.run.mode, sim.run.paused, sim.deathT)) {
      sim.run.paused = true;
      emitEvent({ type: 'pauseChanged', value: true });
    }
  };

  return { onResize, onVisibility };
}

// ---- Builder: гаражный ввод ----
function buildGarageInput(
  canvas: HTMLCanvasElement,
  sim: GameSimulation,
  cameraRig: RenderWorld['cameraRig'],
): GarageInput {
  const garageInput = new GarageInput({
    canvas,
    isInteractive: () => sim.run.mode === 'garage',
    cameraRig,
  });
  garageInput.attach();
  return garageInput;
}

// ---- Builder: игровой цикл ----
function buildGameLoop(
  sim: GameSimulation,
  cameraRig: RenderWorld['cameraRig'],
  renderWorld: RenderWorld,
  hudModel: HudModel,
  emitEvent: (e: GameEvent) => void,
  previewController: PreviewController,
): {
  gameLoop: GameLoop;
  hudSink: { current: ((hud: import('./types').HudSnapshot) => void) | null };
} {
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
  return { gameLoop, hudSink };
}

/** Строит и связывает все подсистемы, возвращая готовый контекст. */
export function bootstrapGame(canvas: HTMLCanvasElement): GameContext {
  const { renderWorld, scene, cameraRig } = buildRenderWorld(canvas);
  const { emitEvent, addListener, removeListener } = buildEventBus();
  const { arena, effects, projectiles, input, audio, run } = buildCoreSubsystems(scene, canvas);
  // Per-map atmosphere: арена применит пресет текущей карты и будет обновлять при rebuild.
  arena.setRenderWorld(renderWorld);

  // eslint-disable-next-line prefer-const -- assigned after CombatSystem closures capture it
  let sim!: GameSimulation;
  const combat = new CombatSystem({
    arena, effects, audio,
    emit: (e) => emitEvent(e),
    onPlayerDeath: () => sim?.onPlayerDeath?.(),
    getMatch: () => sim?.match ?? null,
    getTanks: () => sim?.tanks ?? [],
  });

  const { weaponDeps, bots, hudModel, matchHolder } = buildDerivedSystems(
    scene, arena, effects, audio, projectiles, input, run, emitEvent, combat,
  );

  sim = new GameSimulation(arena, effects, projectiles, input, audio, run, combat, bots, hudModel);
  matchHolder.current = sim.match;
  sim.onPlayerDeath = () => {
    // C1: disable input + clear pause BEFORE releaseLock so onLockLost cannot freeze death cam.
    const st = {
      deathT: sim.deathT,
      paused: sim.run.paused,
      inputEnabled: input.enabled,
    };
    applyPlayerDeathState(st);
    sim.deathT = st.deathT;
    sim.run.paused = st.paused;
    input.enabled = st.inputEnabled;
    input.releaseLock();
  };

  const previewController = new PreviewController(scene, () => sim.run.mode);
  previewController.rebuild(sim.run.currentHull, sim.run.currentTurret);
  renderWorld.applyQuality(getQualityPreset(loadQuality()));

  const { onResize, onVisibility } = registerWindowHandlers(canvas, renderWorld, sim, input, emitEvent);
  const garageInput = buildGarageInput(canvas, sim, cameraRig);
  const { gameLoop, hudSink } = buildGameLoop(sim, cameraRig, renderWorld, hudModel, emitEvent, previewController);

  // Wire hit-stop / slow-mo на убийствах (после создания gameLoop)
  combat.setOnKillPunch((byPlayer) => {
    gameLoop.timeScale.hitStop(0.04);
    if (byPlayer) gameLoop.timeScale.killSlowMo(0.5, 0.45);
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
    addListener,
    removeListener,
    onResize,
    onVisibility,
    hudSink,
  };
}
