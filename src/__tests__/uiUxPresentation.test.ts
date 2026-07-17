import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isLowHealth,
  scoreboardHpClass,
  weaponStatusKind,
} from '../ui/hudPresentation';

const root = resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('hudPresentation pure helpers (shipped)', () => {
  it('scoreboardHpClass encodes HP by hue bands', () => {
    expect(scoreboardHpClass(1)).toBe('hp-high');
    expect(scoreboardHpClass(0.56)).toBe('hp-high');
    expect(scoreboardHpClass(0.55)).toBe('hp-mid');
    expect(scoreboardHpClass(0.3)).toBe('hp-mid');
    expect(scoreboardHpClass(0.25)).toBe('hp-low');
    expect(scoreboardHpClass(0)).toBe('hp-low');
    expect(scoreboardHpClass(2)).toBe('hp-high');
    expect(scoreboardHpClass(-1)).toBe('hp-low');
  });

  it('weaponStatusKind prioritizes charge > reload > empty', () => {
    expect(
      weaponStatusKind({
        isCharging: true,
        reloading: true,
        turretId: 'railgun',
        ammo: 0,
        magazine: 1,
      }),
    ).toBe('charging');
    expect(
      weaponStatusKind({
        reloading: true,
        turretId: 'cannon',
        ammo: 0,
        magazine: 3,
      }),
    ).toBe('reloading');
    expect(
      weaponStatusKind({
        turretId: 'railgun',
        ammo: 0,
        magazine: 1,
      }),
    ).toBe('empty');
    expect(
      weaponStatusKind({
        turretId: 'railgun',
        ammo: 1,
        magazine: 1,
      }),
    ).toBe(null);
    expect(
      weaponStatusKind({
        turretId: 'flamethrower',
        ammo: 0,
        magazine: 100,
      }),
    ).toBe(null);
  });

  it('isLowHealth matches HUD danger threshold', () => {
    expect(isLowHealth(31, 100)).toBe(true);
    expect(isLowHealth(32, 100)).toBe(false);
    expect(isLowHealth(50, 200)).toBe(true);
    expect(isLowHealth(0, 0)).toBe(false);
  });
});

describe('UI/UX structural contracts (critical/medium fixes)', () => {
  it('C1: weapon status lives in reserved in-panel slot, not absolute -bottom-5', () => {
    const weapon = readSrc('src/components/hud/HudWeapon.tsx');
    const css = readSrc('src/styles/hud.css');
    expect(weapon).not.toMatch(/-bottom-5/);
    expect(weapon).toMatch(/weapon-status/);
    expect(css).toMatch(/\.weapon-status/);
    expect(css).toMatch(/min-height:\s*1em/);
  });

  it('C2: controls hint uses raised wrap class', () => {
    const hud = readSrc('src/components/HUD.tsx');
    const css = readSrc('src/styles/hud.css');
    expect(hud).toMatch(/hud-hint-wrap/);
    expect(css).toMatch(/\.hud-hint-wrap/);
    expect(css).toMatch(/bottom:\s*calc\(1\.5rem \+ 9rem\)/);
  });

  it('C3: garage passport stacks below lg and docks at lg+', () => {
    const garage = readSrc('src/components/Garage.tsx');
    const css = readSrc('src/styles/garage.css');
    expect(garage).toMatch(/garage-passport/);
    expect(garage).not.toMatch(/absolute right-4 md:right-8 top-1\/2/);
    expect(css).toMatch(/\.garage-passport/);
    expect(css).toMatch(/@media \(min-width: 1024px\)/);
  });

  it('C4: hull/turret cards are keyboard buttons with aria-pressed', () => {
    const hull = readSrc('src/components/HullCard.tsx');
    const turret = readSrc('src/components/TurretCard.tsx');
    expect(hull).toMatch(/<button/);
    expect(hull).toMatch(/aria-pressed=\{isSelected\}/);
    expect(turret).toMatch(/<button/);
    expect(turret).toMatch(/aria-pressed=\{isSelected\}/);
  });

  it('C5: prefers-reduced-motion covers animations and HUD loops', () => {
    const anim = readSrc('src/styles/animations.css');
    const hud = readSrc('src/styles/hud.css');
    const overlays = readSrc('src/styles/overlays.css');
    const buttons = readSrc('src/styles/buttons.css');
    for (const src of [anim, hud, overlays, buttons]) {
      expect(src).toMatch(/prefers-reduced-motion:\s*reduce/);
    }
    expect(anim).toMatch(/\.floaty/);
    expect(hud).toMatch(/\.hp-fill\.danger/);
  });

  it('M1: pause and game-over use useFocusTrap', () => {
    expect(readSrc('src/components/PauseMenu.tsx')).toMatch(/useFocusTrap/);
    expect(readSrc('src/components/GameOverScreen.tsx')).toMatch(/useFocusTrap/);
    expect(readSrc('src/hooks/useFocusTrap.ts')).toMatch(/focusables/);
  });

  it('M5: crosshair no longer infinite-spins', () => {
    const css = readSrc('src/styles/hud.css');
    expect(css).not.toMatch(/animation:\s*ch-spin/);
  });

  it('M7: design tokens expanded beyond --glow', () => {
    const vars = readSrc('src/styles/variables.css');
    expect(vars).toMatch(/--accent/);
    expect(vars).toMatch(/--danger/);
    expect(vars).toMatch(/--warn/);
    expect(vars).toMatch(/--bg-root/);
    expect(vars).toMatch(/--text-muted/);
  });

  it('M12: railgun passport tip uses live damage not hardcoded 42', () => {
    const garage = readSrc('src/components/Garage.tsx');
    expect(garage).toMatch(/currTurret\.damage/);
    expect(garage).not.toMatch(/42 ЕД/);
  });

  it('M14: scoreboard uses scoreboardHpClass from shipped helper', () => {
    const sb = readSrc('src/components/hud/HudScoreboard.tsx');
    expect(sb).toMatch(/scoreboardHpClass/);
    expect(sb).toMatch(/role="region"/);
  });

  it('M15: HUD exposes polite live region for vitals thresholds', () => {
    const hud = readSrc('src/components/HUD.tsx');
    const hook = readSrc('src/hooks/useGameHud.ts');
    expect(hud).toMatch(/liveRef/);
    expect(hud).toMatch(/aria-live="polite"/);
    expect(hook).toMatch(/liveRef/);
    expect(hook).toMatch(/Броня критична/);
  });
});
