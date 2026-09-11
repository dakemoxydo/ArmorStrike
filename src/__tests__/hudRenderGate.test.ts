import { describe, expect, it } from 'vitest';
import type { HudSnapshot, ScoreRow } from '../game/types';
import { captureStripKey, hudNeedsRender } from '../ui/hudRenderGate';

/**
 * The HUD re-render gate replaced a hand-maintained ~25-field comparison list.
 * The class of bug it fixes: a new HudSnapshot field silently skipping the
 * update (maxHealth was not compared at all; scoreboard content only by
 * visibility, so an open board went stale). These tests pin both the semantics
 * and the "new field is covered automatically" invariant.
 */

function snap(over: Partial<HudSnapshot> = {}): HudSnapshot {
  return {
    mode: 'playing', paused: false, health: 100, maxHealth: 100, ammo: 6, magazine: 6,
    reloading: false, reloadProgress: 0, isCharging: false, boost: 1, score: 0, kills: 0,
    deaths: 0, enemiesAlive: 4, alive: true, respawnInSec: 0, timeSec: 0, muted: false,
    turretId: 'railgun', weaponName: 'Railgun', weaponLabel: 'РЕЛЬСА',
    weaponAccentClass: 'text-cyan-300', showScore: false,
    scoreboard: [], matchMode: 'deathmatch', winTarget: 30, timeLimitSec: 720,
    teamKillsAlpha: 0, teamKillsBravo: 0, teamScoreAlpha: 0, teamScoreBravo: 0,
    capturePoints: [],
    ...over,
  };
}

function row(over: Partial<ScoreRow> = {}): ScoreRow {
  return {
    name: 'Bot 1', hull: 'Hunter', weaponName: 'Railgun',
    hpFrac: 1, isPlayer: false, alive: true, kills: 0, deaths: 0, teamId: null,
    ...over,
  };
}

describe('hudNeedsRender — automatic field coverage', () => {
  it('identical snapshots never force a render', () => {
    expect(hudNeedsRender(snap(), snap())).toBe(false);
  });

  it('a field absent from the override table is still compared (new-field invariant)', () => {
    // Simulates a future HudSnapshot field: no gate entry, must still be caught.
    const prev = { ...snap(), futureField: 1 } as HudSnapshot;
    const next = { ...snap(), futureField: 2 } as HudSnapshot;
    expect(hudNeedsRender(prev, next)).toBe(true);
    expect(hudNeedsRender(next, { ...snap(), futureField: 2 } as HudSnapshot)).toBe(false);
  });

  it('maxHealth change forces a render (the concrete bug the gate fixes)', () => {
    expect(hudNeedsRender(snap({ maxHealth: 100 }), snap({ maxHealth: 140 }))).toBe(true);
  });
});

describe('hudNeedsRender — ref-painted channels never force', () => {
  it('health, boost and reloadProgress are painted imperatively', () => {
    expect(hudNeedsRender(snap({ health: 100 }), snap({ health: 37 }))).toBe(false);
    expect(hudNeedsRender(snap({ boost: 1 }), snap({ boost: 0.2 }))).toBe(false);
    expect(hudNeedsRender(snap({ reloadProgress: 0 }), snap({ reloadProgress: 0.9 }))).toBe(false);
  });
});

describe('hudNeedsRender — ammo semantics per weapon class', () => {
  it('discrete railgun ammo forces a render', () => {
    expect(hudNeedsRender(snap({ ammo: 6 }), snap({ ammo: 5 }))).toBe(true);
  });

  it('continuous flamethrower energy does not force while the turret is unchanged', () => {
    const prev = snap({ turretId: 'flamethrower', ammo: 80 });
    const next = snap({ turretId: 'flamethrower', ammo: 79.4 });
    expect(hudNeedsRender(prev, next)).toBe(false);
  });

  it('switching turret to flamethrower forces a render even with equal ammo', () => {
    const prev = snap({ turretId: 'railgun', ammo: 80 });
    const next = snap({ turretId: 'flamethrower', ammo: 80 });
    expect(hudNeedsRender(prev, next)).toBe(true);
  });
});

describe('hudNeedsRender — quantized to the displayed value', () => {
  it('timeSec only forces on whole-second boundaries', () => {
    expect(hudNeedsRender(snap({ timeSec: 12.1 }), snap({ timeSec: 12.9 }))).toBe(false);
    expect(hudNeedsRender(snap({ timeSec: 12.9 }), snap({ timeSec: 13.0 }))).toBe(true);
  });

  it('respawn countdown only forces when the shown whole second changes', () => {
    // Счётчик тикает каждый кадр — рендер нужен только на смене секунды.
    expect(hudNeedsRender(snap({ alive: false, respawnInSec: 3.9 }), snap({ alive: false, respawnInSec: 3.1 }))).toBe(false);
    expect(hudNeedsRender(snap({ alive: false, respawnInSec: 3.1 }), snap({ alive: false, respawnInSec: 2.9 }))).toBe(true);
  });

  it('team score only forces on integer steps', () => {
    expect(hudNeedsRender(snap({ teamScoreAlpha: 10.2 }), snap({ teamScoreAlpha: 10.8 }))).toBe(false);
    expect(hudNeedsRender(snap({ teamScoreAlpha: 10.8 }), snap({ teamScoreAlpha: 11.0 }))).toBe(true);
  });
});

describe('hudNeedsRender — freshly allocated arrays compare by content', () => {
  it('an equal-but-new scoreboard array does not force a render', () => {
    const prev = snap({ showScore: true, scoreboard: [row()] });
    const next = snap({ showScore: true, scoreboard: [row()] });
    expect(next.scoreboard).not.toBe(prev.scoreboard);
    expect(hudNeedsRender(prev, next)).toBe(false);
  });

  it('an open scoreboard updates when another tank scores (stale-board bug)', () => {
    const prev = snap({ showScore: true, scoreboard: [row({ kills: 3 })] });
    const next = snap({ showScore: true, scoreboard: [row({ kills: 4 })] });
    expect(hudNeedsRender(prev, next)).toBe(true);
  });

  it('scoreboard HP forces only when the displayed percent changes', () => {
    const prev = snap({ showScore: true, scoreboard: [row({ hpFrac: 0.5 })] });
    const same = snap({ showScore: true, scoreboard: [row({ hpFrac: 0.501 })] });
    const lower = snap({ showScore: true, scoreboard: [row({ hpFrac: 0.44 })] });
    expect(hudNeedsRender(prev, same)).toBe(false);
    expect(hudNeedsRender(prev, lower)).toBe(true);
  });

  it('row reordering forces a render', () => {
    const prev = snap({ showScore: true, scoreboard: [row({ name: 'A' }), row({ name: 'B' })] });
    const next = snap({ showScore: true, scoreboard: [row({ name: 'B' }), row({ name: 'A' })] });
    expect(hudNeedsRender(prev, next)).toBe(true);
  });

  it('capture progress forces only on 10% steps', () => {
    const pt = { id: 'A' as const, x: 0, z: 0, owner: 'alpha' as const, progress: 0.5, contested: false };
    const prev = snap({ capturePoints: [pt] });
    const within = snap({ capturePoints: [{ ...pt, progress: 0.54 }] });
    const step = snap({ capturePoints: [{ ...pt, progress: 0.61 }] });
    expect(hudNeedsRender(prev, within)).toBe(false);
    expect(hudNeedsRender(prev, step)).toBe(true);
  });

  it('capture owner and contest flips force a render', () => {
    const base = { id: 'B' as const, x: 0, z: 0, owner: 'alpha' as const, progress: 0.5, contested: false };
    const prev = snap({ capturePoints: [base] });
    expect(hudNeedsRender(prev, snap({ capturePoints: [{ ...base, owner: 'bravo' }] }))).toBe(true);
    expect(hudNeedsRender(prev, snap({ capturePoints: [{ ...base, contested: true }] }))).toBe(true);
  });
});

describe('captureStripKey', () => {
  it('is empty for no zones and encodes owner/contest/progress bucket', () => {
    expect(captureStripKey([])).toBe('');
    const a = captureStripKey([{ id: 'A', x: 0, z: 0, owner: null, progress: 0.05, contested: false }]);
    const b = captureStripKey([{ id: 'A', x: 9, z: 9, owner: null, progress: 0.09, contested: false }]);
    expect(a).toBe(b); // same bucket, position is not part of the strip
  });
});
