// ===== Контроллер игровых режимов (menu/garage/playing/over + пауза) =====
import type * as THREE from 'three';
import type { GameSimulation } from './engine/GameSimulation';
import type { CameraRig } from './CameraRig';
import type { RenderWorld } from './RenderWorld';
import type { PreviewController } from './PreviewController';
import type { TimeScale } from './effects/TimeScale';
import type { GameMode, GameEvent } from './types';
import type { WeaponFactoryDeps } from './PlayerFactory';
import type { DamageFloatQueue } from './damageFloats';
import type { MapId } from './maps/mapCatalog';
import { DEFAULT_MAP_ID, isMapId } from './maps/mapCatalog';
import { spawnMatchRoster } from './match/rosterSpawn';
import { DEFAULT_MATCH_MODE } from './match/matchConfig';
import type { MatchModeId, TeamId } from './match/matchTypes';

export interface RoundOptions {
  botsEnabled?: boolean;
  playerTeam?: TeamId;
}

export interface GameModeControllerDeps {
  sim: GameSimulation;
  scene: THREE.Scene;
  cameraRig: CameraRig;
  renderWorld: RenderWorld;
  previewController: PreviewController;
  canvas: HTMLCanvasElement;
  weaponDeps: WeaponFactoryDeps;
  /** Hit-stop/slow-mo clock (owned by GameLoop) — reset on round start (L-2). */
  timeScale: TimeScale;
  /** Очередь всплывающих чисел — сбрасывается на старте раунда (без переноса). */
  floats: DamageFloatQueue;
  emit: (e: GameEvent) => void;
  /** Rebuild minimap static layer after arena map switch. */
  onArenaRebuilt?: () => void;
}

/**
 * Инкапсулирует переходы между режимами, старт раунда и паузу.
 */
export class GameModeController {
  /** Last selected match mode (ModeSelect UI → setMatchMode). */
  matchMode: MatchModeId = DEFAULT_MATCH_MODE;

  /**
   * Serializes async startRound calls. Bumped on each call; stale jobs exit
   * before mutating mode / player after await spawnMatchRoster.
   */
  private startSeq = 0;
  private startChain: Promise<void> = Promise.resolve();

  constructor(private d: GameModeControllerDeps) {}

  setMode(mode: GameMode) {
    const { sim, cameraRig, previewController, canvas, emit } = this.d;
    const wasPlaying = sim.run.mode === 'playing' || sim.run.mode === 'over';
    if (mode === 'menu' || mode === 'garage') {
      // Invalidate any in-flight startRound so it cannot re-apply after leave.
      // Не под `wasPlaying`: раунд стартуют из меню/гаража, и во время загрузки
      // GLB режим ещё не 'playing' — иначе старт «дотягивается» и выкидывает в бой.
      this.startSeq += 1;
    }
    if (wasPlaying && (mode === 'menu' || mode === 'garage')) {
      sim.clearTanks(this.d.scene);
      sim.projectiles.clear();
      sim.deathT = -1;
      sim.run.paused = false;
      sim.input.enabled = false;
      sim.input.resetKeys();
      sim.input.releaseLock();
      cameraRig.resetFov();
    }
    sim.run.mode = mode;
    sim.audio.click();
    if (mode === 'garage') {
      cameraRig.resetGarage();
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = '';
    }
    if (mode === 'menu' || mode === 'garage') {
      previewController.setVisible(true);
    } else {
      previewController.setVisible(false);
    }
    emit({ type: 'modeChanged', mode });
  }

  setMatchMode(mode: MatchModeId) {
    this.matchMode = mode;
  }

  /**
   * Start match on map. Concurrent calls are queued; only the latest sequence
   * applies roster + playing mode (avoids double tanks during GLB load).
   */
  startRound(mapId: MapId = DEFAULT_MAP_ID, matchMode?: MatchModeId, options?: RoundOptions): Promise<void> {
    const seq = ++this.startSeq;
    const job = this.startChain.then(() => this.executeStartRound(seq, mapId, matchMode, options));
    // Keep chain alive so later starts still run after a failed start.
    this.startChain = job.catch(() => undefined);
    return job;
  }

  private async executeStartRound(
    seq: number,
    mapId: MapId,
    matchMode?: MatchModeId,
    options?: RoundOptions,
  ): Promise<void> {
    // Superseded while waiting in the queue — skip entirely.
    if (seq !== this.startSeq) return;

    const { sim, scene, previewController, cameraRig, renderWorld, weaponDeps, emit, onArenaRebuilt } = this.d;
    const mode = matchMode ?? this.matchMode;

    sim.audio.ensure();
    sim.audio.stopEngine();
    sim.clearTanks(scene);
    sim.projectiles.clear();
    // No carryover from the previous round: combat transients (L-1), held
    // input (L-6) and hit-stop/slow-mo clock (L-2).
    sim.effects.clearTransients();
    sim.input.resetKeys();
    this.d.timeScale.reset();
    // Числа урона прошлого раунда не переезжают в новый (очередь ещё не спроецирована).
    this.d.floats.clear();
    previewController.setVisible(false);

    const id = isMapId(mapId) ? mapId : DEFAULT_MAP_ID;
    sim.arena.rebuild(id);
    onArenaRebuilt?.();

    sim.run.resetRun();
    sim.deathT = -1;
    sim.prevReloading = false;
    // Kill-streak window survives matchTime reset otherwise (negative time
    // deltas never expire) — stale streaks would suppress labels next round.
    sim.combat.resetStreaks();
    sim.match.reset(mode, { mapId: id, scene });

    const { player, bots } = await spawnMatchRoster(sim.match.config, {
      scene,
      weaponDeps,
      tanks: sim.tanks,
      nameplates: sim.nameplates,
      hullId: sim.run.currentHull,
      turretId: sim.run.currentTurret,
      playerName: sim.run.username,
      botsEnabled: options?.botsEnabled,
      playerTeam: options?.playerTeam,
    });

    // Another startRound or leave-to-menu invalidated us after async spawn.
    if (seq !== this.startSeq) {
      // Roster was pushed into sim.tanks during spawn — drop it; winner will rebuild.
      sim.clearTanks(scene);
      sim.projectiles.clear();
      return;
    }

    sim.player = player;
    sim.bots.bots = bots;

    // Shader warm-up under the loading overlay. The light budget is constant
    // (LightRig), so this one pass covers every combat material — no GLSL
    // compiles on the first shot / first death.
    await renderWorld.warmUp();

    // Superseded while warming shaders (leave-to-menu / newer startRound) —
    // the roster is live in the scene already, so drop it and bail BEFORE
    // applying the playing mode. Without this check the stale job re-applied
    // `playing` + pointer lock over the menu the user just opened.
    if (seq !== this.startSeq) {
      sim.clearTanks(scene);
      sim.projectiles.clear();
      return;
    }

    sim.run.mode = 'playing';
    sim.run.paused = false;
    sim.input.enabled = true;
    sim.input.look.reset(player.yaw);
    cameraRig.snap(player, sim.input.look.yaw, sim.input.look.pitch);
    sim.audio.startEngine();
    sim.input.requestLock();
    emit({ type: 'modeChanged', mode: 'playing' });
  }

  togglePause() {
    const { sim, emit } = this.d;
    if (sim.run.mode !== 'playing' || sim.deathT >= 0) return;

    // Защита от гонки Esc в Firefox: при нажатии Esc браузер сначала сбрасывает pointer lock
    // (onLockLost переводит в paused = true), а затем шлёт keydown 'Escape'.
    // Без этой защиты togglePause мгновенно снимал только что выставленную паузу.
    if (sim.run.paused && performance.now() - sim.lastAutoPauseTime < 300) {
      return;
    }

    sim.run.paused = !sim.run.paused;
    // Pause owns the keyboard too: Space/Tab must drive the PauseMenu, not
    // the combat controller (mirrors the auto-pause paths in GameBootstrap).
    sim.input.enabled = !sim.run.paused;
    if (sim.run.paused) {
      sim.input.releaseLock();
    } else {
      sim.input.requestLock();
    }
    emit({ type: 'pauseChanged', value: sim.run.paused });
  }
}
