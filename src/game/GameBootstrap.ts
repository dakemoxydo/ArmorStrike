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
import { DamageFloatQueue } from './damageFloats';
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
  /** Live HUD object mutated every frame by GameLoop — same ref as getHud(). */
  hud: import('./types').HudSnapshot;
  /** Очередь всплывающих чисел (сбрасывается на старте раунда). */
  floats: DamageFloatQueue;
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
  effects: Effects;
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
  effects: Effects,
  audio: AudioPort,
  projectiles: ProjectileManager,
  input: PlayerController,
  run: RunState,
  emitEvent: (e: GameEvent) => void,
  combat: CombatSystem,
  floats: DamageFloatQueue,
): {
  weaponDeps: WeaponFactoryDeps;
  bots: BotRoster;
  hudModel: HudModel;
  matchHolder: { current: import('./match/MatchRuntime').MatchRuntime | null };
} {
  const weaponDeps: WeaponFactoryDeps = {
    scene, effects, audio,
    lights: effects.lights,
    damageSystem: combat.damageSystem,
    projectiles,
    onShotFired: () => emitEvent({ type: 'shotFired' }),
    healthNet: { emit: () => undefined },
    // «Изида»: очки поддержки (лечение союзников) — в личный счёт забега,
    // симметрично очкам за фраги в MatchRuntime (run.score — косметика/XP, не teamScore).
    onSupportScore: (points: number) => {
      if (points > 0) run.score += points;
    },
    // Числа лечения идут мимо DamageSystem (луч лечит сам), поэтому оружие
    // пишет в ту же очередь, что и CombatSystem для урона.
    onDamageFloat: (x, y, z, value, kind, type) => floats.push(x, y, z, value, kind, type),
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
  cameraRig: RenderWorld['cameraRig'],
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
    // Размер нужен камере для safe-zone сдвига гаража (setViewOffset).
    cameraRig.setViewportSize(w, h);
  };
  onResize();
  window.addEventListener('resize', onResize);

  const onVisibility = () => {
    // Auto-pause on tab hide, gated by death cam (BUGFIX-C1)
    if (
      document.hidden &&
      shouldAutoPauseOnInterrupt(sim.run.mode, sim.run.paused, sim.deathT, sim.networked)
    ) {
      sim.run.paused = true;
      // rAF в скрытой вкладке стоит — GameLoop не успеет заморозить аудио сам
      // в этом кадре, вешаем таймлайн прямо здесь (идемпотентно с его вызовом).
      sim.audio.setPaused(true);
      // Pause owns the keyboard: menu buttons must keep Space/Tab (see
      // PlayerController.onKeyDown enabled gate).
      sim.input.enabled = false;
      emitEvent({ type: 'pauseChanged', value: true });
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  input.onLockLost = () => {
    // Root fix C1: intentional lock release on death must NOT pause.
    if (shouldAutoPauseOnInterrupt(sim.run.mode, sim.run.paused, sim.deathT, sim.networked)) {
      sim.run.paused = true;
      sim.input.enabled = false;
      sim.lastAutoPauseTime = performance.now();
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
  emitEvent: (e: GameEvent) => void,
): GarageInput {
  const garageInput = new GarageInput({
    canvas,
    isInteractive: () => sim.run.mode === 'garage',
    cameraRig,
    // Peek-осмотр: камера демпфирует safe-zone, UI скрывает док по событию.
    onPeekChange: (active) => {
      cameraRig.garagePeek = active;
      emitEvent({ type: 'garagePeek', value: active });
    },
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
  floats: DamageFloatQueue,
): {
  gameLoop: GameLoop;
  hudSink: { current: ((hud: import('./types').HudSnapshot) => void) | null };
  hud: import('./types').HudSnapshot;
} {
  const hudSink: { current: ((hud: import('./types').HudSnapshot) => void) | null } = { current: null };
  // Single snapshot instance: GameLoop mutates it; Game.getHud() returns the same ref.
  const hud = hudModel.getHud(null, []);
  const gameLoop = new GameLoop({
    sim,
    cameraRig,
    renderWorld,
    hudModel,
    hud,
    emit: emitEvent,
    getPreviewVisual: () => previewController.previewVisual,
    onHud: (h) => hudSink.current?.(h),
    floats,
  });
  return { gameLoop, hudSink, hud };
}

/** Строит и связывает все подсистемы, возвращая готовый контекст. */
export async function bootstrapGame(canvas: HTMLCanvasElement): Promise<GameContext> {
  const { renderWorld, scene, cameraRig } = buildRenderWorld(canvas);
  const { emitEvent, addListener, removeListener } = buildEventBus();
  const { arena, effects, projectiles, input, audio, run } = buildCoreSubsystems(scene, canvas);
  // Per-map atmosphere: арена применит пресет текущей карты и будет обновлять при rebuild.
  arena.setRenderWorld(renderWorld);

  // eslint-disable-next-line prefer-const -- assigned after CombatSystem closures capture it
  let sim!: GameSimulation;
  // Очередь всплывающих чисел (п.1): пишут CombatSystem/оружие, читает GameLoop
  // в конце кадра, когда камера уже финальна.
  const floats = new DamageFloatQueue();
  const combat = new CombatSystem({
    arena, effects, audio,
    emit: (e) => emitEvent(e),
    onPlayerDeath: () => sim?.onPlayerDeath?.(),
    getMatch: () => sim?.match ?? null,
    getTanks: () => sim?.tanks ?? [],
    floats,
  });

  const { weaponDeps, bots, hudModel, matchHolder } = buildDerivedSystems(
    scene, arena, effects, audio, projectiles, input, run, emitEvent, combat, floats,
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
  await previewController.rebuild(sim.run.currentHull, sim.run.currentTurret);
  // Первый кадр — сцена подиума (п.16): пока режим меню/гаража, живая арена
  // и её туман скрыты; rebuild первого раунда вернёт и арену, и пресет тумана.
  const stageOnBoot = sim.run.mode === 'menu' || sim.run.mode === 'garage';
  arena.group.visible = !stageOnBoot;
  renderWorld.setFogEnabled(!stageOnBoot);
  renderWorld.applyQuality(getQualityPreset(loadQuality()));

  const { onResize, onVisibility } = registerWindowHandlers(canvas, renderWorld, cameraRig, sim, input, emitEvent);
  const garageInput = buildGarageInput(canvas, sim, cameraRig, emitEvent);
  const { gameLoop, hudSink, hud } = buildGameLoop(
    sim, cameraRig, renderWorld, hudModel, emitEvent, previewController, floats,
  );

  // Hit-stop / slow-mo — только за убийство ИГРОКОМ. Раньше hitStop() стоял без
  // гейта и морозил матч (TimeScale отдаёт dt = 0) на каждой смерти любого танка:
  // при 7 ботах это постоянные 40-мс замирания всей симуляции и камеры.
  combat.setOnKillPunch((byPlayer) => {
    if (!byPlayer) return;
    if (sim.networked) return;
    gameLoop.timeScale.hitStop(0.04);
    gameLoop.timeScale.killSlowMo(0.5, 0.45);
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
    hud,
    floats,
  };
}
