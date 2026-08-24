import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GameModeController } from '../game/GameModeController';
import type { GameModeControllerDeps } from '../game/GameModeController';

/**
 * Match lifecycle reset coverage (BACKLOG A3): every executeStartRound step
 * must run on EVERY round start — mode switch (DM→TDM→CP) or same-mode
 * restart — so no cross-round state survives:
 *   clearTanks → projectiles.clear → arena.rebuild(mapId) → onArenaRebuilt →
 *   run.resetRun (score/kills/matchTime=0) → deathT=-1 → prevReloading=false →
 *   combat.resetStreaks() → match.reset(mode, {mapId}) → fresh roster applied.
 *
 * spawnMatchRoster is module-mocked to a deterministic roster; everything else
 * is lightweight recording fakes. The controller's async startSeq/queue runs
 * for real.
 */

vi.mock('../game/match/rosterSpawn', () => ({
  spawnMatchRoster: vi.fn(async () => {
    const player = { name: 'P1', isPlayer: true, yaw: 0.4 };
    const bots = [{ name: 'B1' }, { name: 'B2' }];
    return { player, bots };
  }),
}));

function makeDeps() {
  const order: string[] = [];
  const sim = {
    audio: { ensure: vi.fn(() => order.push('audio.ensure')), stopEngine: vi.fn(), startEngine: vi.fn(), click: vi.fn() },
    clearTanks: vi.fn(() => order.push('clearTanks')),
    projectiles: { clear: vi.fn(), dispose: vi.fn() },
    arena: { rebuild: vi.fn((_id: string) => order.push(`arena.rebuild:${_id}`)) },
    run: {
      mode: 'over', paused: false, score: 42, kills: 7,
      currentHull: 'hunter', currentTurret: 'railgun',
      resetRun: vi.fn(function (this: { score: number; kills: number }) {
        this.score = 0;
        this.kills = 0;
        order.push('resetRun');
      }),
    },
    deathT: 5,
    prevReloading: true,
    combat: { resetStreaks: vi.fn(() => order.push('resetStreaks')) },
    match: {
      reset: vi.fn(
        (_mode: string, opts: { mapId: string }) => order.push(`match.reset:${opts.mapId}`),
      ),
      config: {},
    },
    tanks: [] as unknown[],
    nameplates: new Map(),
    bots: { bots: [] as unknown[] },
    input: { enabled: false, releaseLock: vi.fn(), requestLock: vi.fn(), look: { reset: vi.fn(), yaw: 0, pitch: 0 } },
  };
  const deps = {
    sim,
    scene: new THREE.Scene(),
    cameraRig: { resetFov: vi.fn(), resetGarage: vi.fn(), snap: vi.fn() },
    renderWorld: {} as never,
    previewController: { setVisible: vi.fn() },
    canvas: { style: {} } as unknown as HTMLCanvasElement,
    weaponDeps: {} as never,
    emit: vi.fn(),
    onArenaRebuilt: vi.fn(() => order.push('onArenaRebuilt')),
  } as unknown as GameModeControllerDeps & Record<string, unknown>;
  (deps as unknown as { sceneOrder?: string[] }).sceneOrder = undefined;
  return { deps: deps as unknown as GameModeControllerDeps, sim, order };
}

describe('GameModeController round-start reset sequence', () => {
  let d: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    d = makeDeps();
  });

  it('applies the full reset chain on a fresh round start', async () => {
    const ctrl = new GameModeController(d.deps);
    await ctrl.startRound('village');

    expect(d.sim.clearTanks).toHaveBeenCalledWith(d.deps.scene);
    expect(d.sim.projectiles.clear).toHaveBeenCalled();
    expect(d.sim.arena.rebuild).toHaveBeenCalledWith('village');
    expect(d.deps.onArenaRebuilt).toHaveBeenCalledTimes(1);
    expect(d.sim.run.resetRun).toHaveBeenCalledTimes(1);
    expect(d.sim.run.score).toBe(0);
    expect(d.sim.run.kills).toBe(0);
    expect(d.sim.deathT).toBe(-1);
    expect(d.sim.prevReloading).toBe(false);
    expect(d.sim.combat.resetStreaks).toHaveBeenCalledTimes(1);
    expect(d.sim.match.reset).toHaveBeenCalledWith(expect.any(String), { mapId: 'village', scene: d.deps.scene });
    // Fresh roster wins over the previous one
    const simView = d.sim as unknown as { player: unknown; bots: { bots: unknown[] } };
    expect(simView.player).toEqual({ name: 'P1', isPlayer: true, yaw: 0.4 });
    expect(simView.bots.bots).toHaveLength(2);
    expect(d.sim.run.mode).toBe('playing');
  });

  it('orders the chain so state resets happen after rebuild and before roster', async () => {
    const ctrl = new GameModeController(d.deps);
    await ctrl.startRound('city');

    const i = (marker: string) =>
      d.order.findIndex((s) => s.startsWith(marker));
    expect(i('clearTanks')).toBeLessThan(i('arena.rebuild'));
    expect(i('arena.rebuild')).toBeLessThan(i('onArenaRebuilt'));
    expect(i('onArenaRebuilt')).toBeLessThan(i('resetRun'));
    expect(i('resetRun')).toBeLessThan(i('resetStreaks'));
    expect(i('resetStreaks')).toBeLessThan(i('match.reset'));
  });

  it('second round start re-runs every reset (no cross-round carryover path)', async () => {
    const ctrl = new GameModeController(d.deps);
    await ctrl.startRound('factory');
    await ctrl.startRound('village');

    expect(d.sim.combat.resetStreaks).toHaveBeenCalledTimes(2);
    expect(d.sim.run.resetRun).toHaveBeenCalledTimes(2);
    expect(d.sim.arena.rebuild).toHaveBeenNthCalledWith(2, 'village');
  });
});
