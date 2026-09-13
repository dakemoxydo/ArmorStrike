// @vitest-environment jsdom
// ===== Garage viewport safe zone: кадрирование камеры + peek-осмотр =====
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraLookState } from '../game/camera/CameraLookState';
import { CameraRig, type CameraUpdateParams } from '../game/CameraRig';
import { GarageInput } from '../ui/GarageInput';
import type { EffectsPort } from '../game/ports/EffectsPort';
import type { GameMode } from '../game/types';

const root = resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
}

/**
 * Минимальные CameraUpdateParams для режимов без игрока: гараж использует
 * previewVisual (обязателен guard), эффекты и elapsed; look/player не читает.
 */
function modeParams(mode: GameMode, elapsed = 0): CameraUpdateParams {
  return {
    mode,
    elapsed,
    look: new CameraLookState(),
    player: null,
    previewVisual: null,
    colliders: [],
    effects: {
      getShake: () => 0,
    } as unknown as EffectsPort,
  };
}

function makeRig(): CameraRig {
  return new CameraRig(new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2000));
}

describe('CameraRig — garage safe-zone view offset', () => {
  let rig: CameraRig;

  beforeEach(() => {
    rig = makeRig();
    rig.setViewportSize(1600, 900);
  });

  it('centers the tank in the free rect: dx=(right-left)/2, dy=(bottom-top)/2', () => {
    rig.setGarageInset({ top: 64, right: 280, bottom: 420, left: 0 });

    rig.update(0.016, modeParams('garage'));

    const view = rig.camera.view;
    expect(view?.enabled).toBe(true);
    expect(view?.offsetX).toBeCloseTo(140); // 280 / 2 — сдвиг влево от паспорта
    expect(view?.offsetY).toBeCloseTo(178); // (420 - 64) / 2 — сдвиг вверх от дока
    expect(view?.fullWidth).toBe(1600);
    expect(view?.fullHeight).toBe(900);
  });

  it('clears the offset when the garage UI reports no footprint', () => {
    rig.setGarageInset({ top: 0, right: 0, bottom: 0, left: 0 });

    rig.update(0.016, modeParams('garage'));

    expect(rig.camera.view?.enabled ?? false).toBe(false);
  });

  it('clears the offset on leaving garage (menu/playing stay unframed)', () => {
    rig.setGarageInset({ top: 64, right: 280, bottom: 420, left: 0 });
    rig.update(0.016, modeParams('garage'));
    expect(rig.camera.view?.enabled).toBe(true);

    rig.update(0.016, modeParams('playing'));

    expect(rig.camera.view?.enabled ?? false).toBe(false);
  });

  it('ignores the offset without a viewport size (before first resize)', () => {
    const bare = makeRig(); // setViewportSize не вызывался
    bare.setGarageInset({ top: 0, right: 0, bottom: 400, left: 0 });

    bare.update(0.016, modeParams('garage'));

    expect(bare.camera.view?.enabled ?? false).toBe(false);
  });
});

describe('CameraRig — peek damps the dock/passport cover to zero', () => {
  it('keeps the header inset, drops bottom/right cover while peeking', () => {
    const rig = makeRig();
    rig.setViewportSize(1600, 900);
    rig.setGarageInset({ top: 64, right: 280, bottom: 420, left: 0 });
    rig.garagePeek = true;

    for (let i = 0; i < 240; i += 1) {
      rig.update(1 / 60, modeParams('garage'));
    }

    const view = rig.camera.view;
    expect(view?.enabled).toBe(true);
    // Демпфер сходится, но применённый офсет «замораживается» при дельте
    // < 0.25 px (guard пересборки проекции) — допускаем субпиксельный хвост.
    expect(view?.offsetY).toBeCloseTo(-32, 0); // -(64 / 2)
    expect(view?.offsetX).toBeCloseTo(0, 0);
  });

  it('clears the offset entirely when the peeked cover zeroes out and no header is left', () => {
    const rig = makeRig();
    rig.setViewportSize(1600, 900);
    rig.setGarageInset({ top: 0, right: 0, bottom: 420, left: 0 });
    rig.garagePeek = true;

    for (let i = 0; i < 240; i += 1) {
      rig.update(1 / 60, modeParams('garage'));
    }

    // dx и dy оба ушли в ноль → проекционный сдвиг снят, кадр полный.
    expect(rig.camera.view?.enabled ?? false).toBe(false);
  });
});

describe('GarageInput — peek lifecycle', () => {
  let canvas: HTMLCanvasElement;
  let onPeek: (active: boolean) => void;
  let rigDrag: (dx: number, dy: number) => void;
  let input: GarageInput;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    onPeek = vi.fn((_active: boolean) => undefined);
    rigDrag = vi.fn((_dx: number, _dy: number) => undefined);
    input = new GarageInput({
      canvas,
      isInteractive: () => true,
      cameraRig: { garageDrag: rigDrag } as unknown as CameraRig,
      onPeekChange: onPeek,
    });
    input.attach();
  });

  it('activates peek on a real drag and deactivates on pointerup', () => {
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 30, clientY: 12 }));

    expect(onPeek).toHaveBeenCalledTimes(1);
    expect(onPeek).toHaveBeenNthCalledWith(1, true);
    expect(rigDrag).toHaveBeenLastCalledWith(20, 2);

    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

    expect(onPeek).toHaveBeenCalledTimes(2);
    expect(onPeek).toHaveBeenNthCalledWith(2, false);
  });

  it('does not peek on a click without drag movement', () => {
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

    expect(onPeek).not.toHaveBeenCalled();
  });

  it('ends peek on detach so a mid-drag unmount cannot leave it stuck', () => {
    canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 40, clientY: 10 }));
    expect(onPeek).toHaveBeenNthCalledWith(1, true);

    input.detach();

    expect(onPeek).toHaveBeenNthCalledWith(2, false);
  });
});

describe('Garage safe zone — source invariants', () => {
  it('Garage.tsx measures the UI footprint and pushes it to the rig', () => {
    const garage = readSrc('src/components/Garage.tsx');
    expect(garage).toMatch(/ResizeObserver/);
    expect(garage).toMatch(/setGarageViewportInset\(/);
    // Размонтирование снимает след UI — камера не держит устаревший кадр.
    expect(garage).toMatch(/setGarageViewportInset\(null\)/);
    expect(garage).toMatch(/garage-peek/);
  });

  it('GameApi owns the inset contract; Game forwards it to the rig', () => {
    expect(readSrc('src/game/GameApi.ts')).toMatch(/setGarageViewportInset\(inset: GarageViewportInset \| null\): void/);
    expect(readSrc('src/game/Game.ts')).toMatch(/setGarageInset\(inset\)/);
  });

  it('peek hides the dock by class and respects prefers-reduced-motion', () => {
    const css = readSrc('src/styles/garage.css');
    expect(css).toMatch(/\.garage-peek \.garage-bottom/);
    expect(css).toMatch(/\.garage-bottom\s*\{[\s\S]*?transition:\s*transform var\(--ease-base\), opacity var\(--ease-fast\)/);
    const reduced = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*\}/)?.[0] ?? '';
    expect(reduced).toMatch(/\.garage-bottom\s*\{\s*transition:\s*none/);
    // U22: имя мёртвого класса `.garage-dock` не возвращается.
    expect(css).not.toMatch(/\.garage-dock[\s,:{]/);
  });

  it('GarageInput owns the peek state machine; bootstrap wires rig + event', () => {
    const input = readSrc('src/ui/GarageInput.ts');
    expect(input).toMatch(/dragDist > 6/);
    expect(input).toMatch(/onPeekChange\?\.\(true\)/);
    const bootstrap = readSrc('src/game/GameBootstrap.ts');
    expect(bootstrap).toMatch(/garagePeek = active/);
    expect(bootstrap).toMatch(/\{ type: 'garagePeek', value: active \}/);
  });

  it('the dock follows the card row: passport is compact, leftovers are absorbed', () => {
    const garage = readSrc('src/components/Garage.tsx');
    // Панель паспорта ужата (p-3), эхо выбора — одна строка; иначе колонка
    // паспорта задавала высоту всего дока и под карточками оставался пояс.
    expect(garage).toMatch(/hud-panel p-3/);
    expect(garage).not.toMatch(/hud-panel p-5/);
    expect(garage).toMatch(/КОРПУС · БАШНЯ/);
    expect(garage).toMatch(/garage-weapon-tip/);
    // Остаток высоты разбирает колонка карточек (чип прижат к низу дока).
    expect(garage).toMatch(/garage-cards-col flex flex-col justify-between/);
    const css = readSrc('src/styles/garage.css');
    const short = css.match(/@media \(max-height: 560px\)\s*\{[\s\S]*\}/)?.[0] ?? '';
    expect(short).toMatch(/\.garage-hint-label\s*\{\s*display:\s*none/);
    expect(short).toMatch(/\.garage-weapon-tip\s*\{\s*display:\s*none/);
  });
});
