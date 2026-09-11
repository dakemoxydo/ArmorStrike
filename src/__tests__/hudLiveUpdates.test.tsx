// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import HUD from '../components/HUD';
import type { GameApi } from '../game/GameApi';
import type { GameEvent, HudSnapshot, MinimapDynamic } from '../game/types';

/**
 * Регресс-тесты живых обновлений HUD через игровой цикл.
 *
 * Класс бага, который здесь пинится: `HUD` передаёт детям `snap.current` —
 * объект, мутируемый на месте через `Object.assign` каждый кадр. Любой `memo`
 * на таком объекте навсегда замораживает компонент (так панель оружия перестала
 * обновлять патроны и статус перезарядки). Поэтому панель обязана получать
 * примитивы, а тесты гоняют именно живой объект снапшота, а не новые ссылки.
 */

function baseSnap(): HudSnapshot {
  return {
    mode: 'playing', paused: false, health: 100, maxHealth: 100, ammo: 0, magazine: 0,
    reloading: false, reloadProgress: 0, isCharging: false, boost: 1, score: 0, kills: 0,
    deaths: 0, enemiesAlive: 2, alive: true, respawnInSec: 0, timeSec: 0, muted: false,
    turretId: 'railgun', weaponName: 'Railgun', weaponLabel: 'РЕЛЬСА',
    weaponAccentClass: 'text-cyan-300', showScore: false,
    scoreboard: [], matchMode: 'deathmatch', winTarget: 30, timeLimitSec: 720,
    teamKillsAlpha: 0, teamKillsBravo: 0, teamScoreAlpha: 0, teamScoreBravo: 0,
    capturePoints: [],
  };
}

/** Минимальный GameApi: тесту нужны только каналы HUD-кадра и событий боя. */
function makeGame() {
  const listeners: ((e: GameEvent) => void)[] = [];
  let hudCb: ((h: HudSnapshot) => void) | null = null;
  const game = {
    addListener: (fn: (e: GameEvent) => void) => { listeners.push(fn); },
    removeListener: (fn: (e: GameEvent) => void) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    setHudCallback: (fn: ((h: HudSnapshot) => void) | null) => { hudCb = fn; },
    toggleMute: () => false,
    getMinimapStatic: () => [],
    fillMinimapDynamics: (out: MinimapDynamic[]) => { out.length = 0; return out; },
    getCaptureMinimap: () => [],
  } as unknown as GameApi;
  return {
    game,
    /** Кадр игрового цикла: снапшот — тот же объект, что мутирует GameLoop. */
    frame: (h: HudSnapshot) => hudCb?.(h),
    emit: (e: GameEvent) => listeners.forEach((fn) => fn(e)),
  };
}

describe('HUD live updates — weapon panel', () => {
  it('ammo pips follow the live snapshot instead of freezing on mount', () => {
    const h = makeGame();
    const live = baseSnap();
    live.ammo = 6;
    live.magazine = 6;
    const { container } = render(<HUD game={h.game} active />);

    act(() => { h.frame(live); });
    expect(container.querySelectorAll('.ammo-pip')).toHaveLength(6);
    expect(container.querySelectorAll('.ammo-pip.full')).toHaveLength(6);

    act(() => { live.ammo = 3; h.frame(live); });
    expect(container.querySelectorAll('.ammo-pip.full')).toHaveLength(3);

    act(() => { live.magazine = 8; live.ammo = 8; h.frame(live); });
    expect(container.querySelectorAll('.ammo-pip')).toHaveLength(8);
  });

  it('reload and empty status follow the snapshot', () => {
    const h = makeGame();
    const live = baseSnap();
    live.ammo = 6;
    live.magazine = 6;
    const { container } = render(<HUD game={h.game} active />);
    act(() => { h.frame(live); });

    act(() => { live.reloading = true; h.frame(live); });
    expect(container.querySelector('.weapon-status')?.textContent).toContain('ПЕРЕЗАРЯДКА');

    act(() => { live.reloading = false; live.ammo = 0; h.frame(live); });
    expect(container.querySelector('.weapon-status')?.textContent).toContain('ПУСТО');
    expect(container.querySelector('.weapon-panel')?.className).toContain('is-empty');
  });
});

describe('HUD live updates — death / respawn', () => {
  it('shows the death overlay with a countdown and hides the crosshair', () => {
    const h = makeGame();
    const live = baseSnap();
    const { container } = render(<HUD game={h.game} active />);
    act(() => { h.frame(live); });
    expect(container.querySelector('.death-overlay')).toBeNull();
    expect(container.querySelector('.crosshair')).not.toBeNull();

    act(() => { live.alive = false; live.respawnInSec = 3; h.frame(live); });
    expect(container.querySelector('.death-overlay')).not.toBeNull();
    expect(container.querySelector('.death-sub')?.textContent).toContain('3');
    expect(container.querySelector('.crosshair')).toBeNull();
  });
});

describe('HUD live updates — transient combat toasts', () => {
  it('vignette, damage arc and hitmarker unmount after their lifetime', () => {
    // Под prefers-reduced-motion CSS-анимация отключена, поэтому тосты обязаны
    // сниматься таймером: иначе они остаются на экране навсегда.
    vi.useFakeTimers();
    try {
      const h = makeGame();
      const live = baseSnap();
      const { container } = render(<HUD game={h.game} active />);
      act(() => { h.frame(live); });

      act(() => { h.emit({ type: 'playerHit', dir: 0 }); });
      expect(container.querySelector('.damage-vignette')).not.toBeNull();
      expect(container.querySelector('.damage-arc')).not.toBeNull();

      act(() => { vi.advanceTimersByTime(1100); });
      expect(container.querySelector('.damage-vignette')).toBeNull();
      expect(container.querySelector('.damage-arc')).toBeNull();

      act(() => { h.emit({ type: 'enemyHit', killed: false }); });
      expect(container.querySelector('.hitmarker')).not.toBeNull();
      act(() => { vi.advanceTimersByTime(500); });
      expect(container.querySelector('.hitmarker')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a second hit restarts the vignette instead of being cut short by the first timer', () => {
    vi.useFakeTimers();
    try {
      const h = makeGame();
      const live = baseSnap();
      const { container } = render(<HUD game={h.game} active />);
      act(() => { h.frame(live); });

      act(() => { h.emit({ type: 'playerHit', dir: 0 }); });
      act(() => { vi.advanceTimersByTime(600); });
      act(() => { h.emit({ type: 'playerHit', dir: 0 }); }); // перезапуск
      act(() => { vi.advanceTimersByTime(300); });
      expect(container.querySelector('.damage-vignette')).not.toBeNull();
      act(() => { vi.advanceTimersByTime(500); });
      expect(container.querySelector('.damage-vignette')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
