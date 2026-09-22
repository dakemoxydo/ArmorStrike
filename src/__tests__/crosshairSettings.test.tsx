// @vitest-environment jsdom
// ===== Настройка прицела: пресеты, persist, contract CSS и пикера =====
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import HudCrosshair from '../components/hud/HudCrosshair';
import PauseMenu from '../components/PauseMenu';
import type { GameApi } from '../game/GameApi';
import {
  CROSSHAIR_STYLES,
  DEFAULT_CROSSHAIR_STYLE,
  loadCrosshairStyle,
  saveCrosshairStyle,
} from '../ui/crosshairStyle';

const root = resolve(__dirname, '../..');
const css = (name: string) => readFileSync(resolve(root, `src/styles/${name}`), 'utf8');

describe('crosshairStyle — persist (as2_crosshair)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('дефолт — минималистичная точка', () => {
    expect(DEFAULT_CROSSHAIR_STYLE).toBe('dot');
    expect(loadCrosshairStyle()).toBe('dot');
  });

  it('save → load возвращает выбранный пресет', () => {
    saveCrosshairStyle('ring');
    expect(loadCrosshairStyle()).toBe('ring');
    saveCrosshairStyle('cross');
    expect(loadCrosshairStyle()).toBe('cross');
  });

  it('мусор в хранилище → дефолт', () => {
    localStorage.setItem('as2_crosshair', 'holographic-scope');
    expect(loadCrosshairStyle()).toBe(DEFAULT_CROSSHAIR_STYLE);
  });

  it('порядок пикера: ТОЧКА → КРЕСТ → ПОЛНЫЙ', () => {
    expect(CROSSHAIR_STYLES.map((s) => s.id)).toEqual(['dot', 'cross', 'ring']);
  });
});

describe('HudCrosshair — data-ch выбирает пресет', () => {
  const ref: RefObject<HTMLDivElement | null> = { current: null };

  it('атрибут равен пресету; без пропа — точка', () => {
    const { container, rerender } = render(<HudCrosshair crossRef={ref} hitmark={null} />);
    expect(container.querySelector('.crosshair')?.getAttribute('data-ch')).toBe('dot');
    rerender(<HudCrosshair crossRef={ref} hitmark={null} crosshair="ring" />);
    expect(container.querySelector('.crosshair')?.getAttribute('data-ch')).toBe('ring');
  });

  it('разметка неизменна на любом пресете (скрывает только CSS)', () => {
    const { container } = render(<HudCrosshair crossRef={ref} hitmark={null} crosshair="dot" />);
    for (const sel of ['.ch-dot', '.ch-ring', '.ch-outer', '.ch-tick']) {
      expect(container.querySelector(sel), sel).not.toBeNull();
    }
  });

  it('hitmarker остаётся и на минимальном пресете', () => {
    const { container } = render(
      <HudCrosshair crossRef={ref} hitmark={{ kill: true, key: 1 }} crosshair="dot" />,
    );
    expect(container.querySelector('.hitmarker.kill')).not.toBeNull();
  });
});

describe('hud.css — contract пресетов', () => {
  const hudCss = css('hud.css');

  it('внешнее кольцо только у «полного»', () => {
    expect(hudCss).toContain(".crosshair:not([data-ch='ring']) .ch-outer");
  });

  it('точка: нет кольца и засечек; крест: кольцо убрано', () => {
    expect(hudCss).toContain(".crosshair[data-ch='dot'] .ch-ring");
    expect(hudCss).toContain(".crosshair[data-ch='dot'] .ch-tick");
    expect(hudCss).toContain(".crosshair[data-ch='cross'] .ch-ring");
  });

  it('динамический прицел: стили зарядки объявлены в hud.css', () => {
    expect(hudCss).toContain('.crosshair.is-charging');
    expect(hudCss).toContain('.crosshair.is-charged');
  });
});

describe('PauseMenu — пикер в секции настроек (behavioral)', () => {
  const pauseGame = {
    currentHull: 'hunter',
    currentTurret: 'railgun',
    getQuality: () => 'medium',
    cycleQuality: () => 'high',
    setMouseSettings: () => {},
  } as unknown as GameApi;

  beforeEach(() => {
    localStorage.clear();
    // jsdom не считает layout: без offsetParent-стаба фокус-трап PauseMenu
    // не видит focusables (тот же стаб, что в useFocusTrap.test.tsx).
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return document.body;
      },
    });
  });

  function renderPause(crosshair: 'dot' | 'cross' | 'ring' = 'cross') {
    const onCrosshair = vi.fn();
    const utils = render(
      <PauseMenu
        game={pauseGame}
        muted={false}
        stats={{ score: 0, kills: 0, timeSec: 0 }}
        crosshair={crosshair}
        onCrosshair={onCrosshair}
        damageNumbers
        onDamageNumbers={vi.fn()}
        onResume={vi.fn()}
        onRestart={vi.fn()}
        onGarage={vi.fn()}
        onMenu={vi.fn()}
        onToggleMute={vi.fn()}
      />,
    );
    return { ...utils, onCrosshair };
  }

  it('три кнопки с превью и aria-pressed у активного', () => {
    const { container, onCrosshair } = renderPause('cross');

    const group = screen.getByRole('group', { name: 'Настройка прицела' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(CROSSHAIR_STYLES.map((s) => s.label)).toEqual(['ТОЧКА', 'КРЕСТ', 'ПОЛНЫЙ']);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    for (const id of ['dot', 'cross', 'ring']) {
      expect(container.querySelector(`.ch-prev-${id}`), id).not.toBeNull();
    }

    fireEvent.click(buttons[2]);
    expect(onCrosshair).toHaveBeenCalledWith('ring');
  });

  it('число pause-section не растёт (S5): пикер живёт в существующей секции', () => {
    const { container } = renderPause('dot');
    expect(container.querySelectorAll('.pause-section')).toHaveLength(3);
    expect(container.querySelector('.ch-picker')).not.toBeNull();
  });
});

describe('overlays.css — стили превью пикера', () => {
  it('стили превью объявлены в overlays.css', () => {
    const overlays = css('overlays.css');
    for (const sel of ['.ch-picker', '.ch-pick', '.ch-prev-cross', '.ch-prev-ring']) {
      expect(overlays, sel).toContain(sel);
    }
  });
});
