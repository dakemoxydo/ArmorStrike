// @vitest-environment jsdom
// ===== Настройка прицела: пресеты, persist, contract CSS и пикера =====
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RefObject } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import HudCrosshair from '../components/hud/HudCrosshair';
import {
  CROSSHAIR_STYLES,
  DEFAULT_CROSSHAIR_STYLE,
  loadCrosshairStyle,
  saveCrosshairStyle,
} from '../ui/crosshairStyle';

const root = resolve(__dirname, '../..');
const css = (name: string) => readFileSync(resolve(root, `src/styles/${name}`), 'utf8');
const src = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

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
});

describe('PauseMenu — пикер в секции настроек', () => {
  const pause = src('src/components/PauseMenu.tsx');

  it('три кнопки с превью и aria-pressed у активного', () => {
    expect(pause).toMatch(/ch-picker/);
    expect(pause).toMatch(/ch-prev-\$\{style\.id\}/);
    expect(pause).toMatch(/aria-pressed=\{crosshair === style\.id\}/);
    // Пикер живёт внутри существующей секции настроек: число pause-section не растёт (S5).
    expect((pause.match(/pause-section/g) ?? []).length).toBe(3);
  });

  it('стили превью объявлены в overlays.css', () => {
    const overlays = css('overlays.css');
    for (const sel of ['.ch-picker', '.ch-pick', '.ch-prev-cross', '.ch-prev-ring']) {
      expect(overlays, sel).toContain(sel);
    }
  });
});
