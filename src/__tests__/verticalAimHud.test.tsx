// @vitest-environment jsdom
/**
 * Индикация захвата цели автонаводкой в прицеле HUD.
 *  • живой канал `isTargetLocked` → класс `.is-locked` на `.crosshair`;
 *  • контракт hud.css: боевой красный `#ff2d3c` + смыкание засечек;
 *  • класс не висит после смерти/паузы и при отсутствии цели.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import HUD from '../components/HUD';
import type { GameApi } from '../game/GameApi';
import type { GameEvent, HudSnapshot, MinimapDynamic } from '../game/types';

const root = resolve(__dirname, '../..');
const hudCss = readFileSync(resolve(root, 'src/styles/hud.css'), 'utf8');

function baseSnap(): HudSnapshot {
  return {
    mode: 'playing', paused: false, health: 100, maxHealth: 100, ammo: 6, magazine: 6,
    reloading: false, reloadProgress: 0, isCharging: false, boost: 1, score: 0, kills: 0,
    deaths: 0, enemiesAlive: 2, alive: true, respawnInSec: 0, timeSec: 0, muted: false,
    turretId: 'cannon', weaponName: 'Cannon', weaponLabel: 'ПУШКА',
    weaponAccentClass: '', showScore: false,
    scoreboard: [], matchMode: 'deathmatch', winTarget: 30, timeLimitSec: 720,
    teamKillsAlpha: 0, teamKillsBravo: 0, teamScoreAlpha: 0, teamScoreBravo: 0,
    capturePoints: [], crossX: 50, crossY: 50, isTargetLocked: false,
  };
}

function makeGame() {
  const listeners: ((e: GameEvent) => void)[] = [];
  let hudCb: ((h: HudSnapshot) => void) | null = null;
  const game = {
    addListener: (fn: (e: GameEvent) => void) => { listeners.push(fn); },
    removeListener: () => {},
    setHudCallback: (fn: ((h: HudSnapshot) => void) | null) => { hudCb = fn; },
    toggleMute: () => false,
    getMinimapStatic: () => [],
    fillMinimapDynamics: (out: MinimapDynamic[]) => { out.length = 0; return out; },
    getCaptureMinimap: () => [],
  } as unknown as GameApi;
  return { game, frame: (h: HudSnapshot) => hudCb?.(h) };
}

describe('Прицел — захват цели (.is-locked)', () => {
  it('класс ставится, когда isTargetLocked=true в бою, и снимается без цели', () => {
    const h = makeGame();
    const live = baseSnap();
    const { container } = render(<HUD game={h.game} active />);
    const cross = () => container.querySelector('.crosshair');

    act(() => { h.frame(live); });
    expect(cross()?.classList.contains('is-locked')).toBe(false);

    act(() => { live.isTargetLocked = true; h.frame(live); });
    expect(cross()?.classList.contains('is-locked')).toBe(true);

    act(() => { live.isTargetLocked = false; h.frame(live); });
    expect(cross()?.classList.contains('is-locked')).toBe(false);
  });

  it('не показывает захват на мёртвом игроке и на паузе (прицел скрыт)', () => {
    const h = makeGame();
    const live = baseSnap();
    const { container } = render(<HUD game={h.game} active />);
    const cross = () => container.querySelector('.crosshair');

    // Первый кадр переводит HUD в 'playing' и монтирует прицел; класс ставится
    // со второго (когда crossRef уже указывает на смонтированный узел).
    act(() => { live.isTargetLocked = false; h.frame(live); });
    act(() => { live.isTargetLocked = true; h.frame(live); });
    expect(cross()?.classList.contains('is-locked')).toBe(true);

    // Мёртв: прицел размонтирован (в HUD нет .crosshair), захват не может остаться.
    act(() => { live.alive = false; live.respawnInSec = 3; h.frame(live); });
    expect(cross()).toBeNull();

    // Пауза: прицел также скрыт — индикатор захвата не виден.
    act(() => { live.alive = true; live.respawnInSec = 0; live.paused = true; h.frame(live); });
    expect(cross()).toBeNull();
  });
});

describe('hud.css — контракт боевого захвата', () => {
  it('красный прицел #ff2d3c и смыкание засечек объявлены', () => {
    expect(hudCss).toContain('.crosshair.is-locked .cross-core .ch-dot');
    expect(hudCss).toContain('.crosshair.is-locked .cross-core .ch-tick');
    expect(hudCss).toContain('#ff2d3c');
    // Смыкание: .is-locked двигает засечки к центру (translate по обеим осям).
    expect(hudCss).toMatch(/\.crosshair\.is-locked:not\(\.is-charging\)[\s\S]*translateY\(6px\)/);
    expect(hudCss).toMatch(/\.crosshair\.is-locked:not\(\.is-charging\)[\s\S]*translateX\(6px\)/);
  });

  it('под prefers-reduced-motion переход прицела гасится', () => {
    const reduced = hudCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(reduced).toMatch(/\.crosshair \.ch-dot,[\s\S]*?transition:\s*none/);
  });
});
