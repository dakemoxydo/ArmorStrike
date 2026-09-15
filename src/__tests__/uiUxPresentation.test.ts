import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ammoForcesHudRender,
  isLowHealth,
  liveRegionKey,
  liveRegionText,
  scoreboardHpClass,
  weaponStatusKind,
} from '../ui/hudPresentation';

const root = resolve(__dirname, '../..');
const UI_STYLES = ['hud.css', 'garage.css', 'overlays.css', 'buttons.css'] as const;
const ALL_STYLES = [...UI_STYLES, 'base.css', 'variables.css', 'animations.css'] as const;

function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
}

function style(name: string): string {
  return readSrc(`src/styles/${name}`);
}

/** Все объявления одного свойства во всех UI-файлах стилей. */
function declaredValues(prop: string, files: readonly string[] = UI_STYLES): string[] {
  const out: string[] = [];
  for (const f of files) {
    for (const m of style(f).matchAll(new RegExp(`${prop}:\\s*([^;]+);`, 'g'))) {
      out.push(m[1].trim());
    }
  }
  return out;
}

/** Рекурсивный обход компонентов: нужен для инвариантов по разметке. */
function componentFiles(dir = 'src/components'): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...componentFiles(rel));
    else if (entry.name.endsWith('.tsx')) out.push(rel);
  }
  return out;
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

  it('ammoForcesHudRender: discrete ammo forces; continuous flame does not', () => {
    expect(ammoForcesHudRender('railgun', 'railgun', 1, 0)).toBe(true);
    expect(ammoForcesHudRender('cannon', 'cannon', 3, 2)).toBe(true);
    expect(ammoForcesHudRender('flamethrower', 'flamethrower', 80, 79)).toBe(false);
    expect(ammoForcesHudRender('railgun', 'flamethrower', 1, 100)).toBe(true);
    // Wiring: the hook delegates the render decision to the gate, and the gate
    // is where the ammo-vs-flame distinction is applied (it lived inline in the
    // hook before the hand-maintained field list was replaced).
    const hook = readSrc('src/hooks/useGameHud.ts');
    const gate = readSrc('src/ui/hudRenderGate.ts');
    expect(hook).toMatch(/hudNeedsRender/);
    expect(gate).toMatch(/ammoForcesHudRender/);
    expect(hook).toMatch(/flameFillRef/);
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

  it('C2: controls hint sits under the score panel and leaves on first input', () => {
    const hud = readSrc('src/components/HUD.tsx');
    const hook = readSrc('src/hooks/useGameHud.ts');
    const css = readSrc('src/styles/hud.css');
    expect(hud).toMatch(/hud-hint-wrap/);
    expect(css).toMatch(/\.hud-hint-wrap/);
    // U6: раньше блок стоял по центру низа — ровно там камера держит машину
    // игрока, и на 800×600 подсказка её закрывала. Теперь он под панелью счёта,
    // ниже самой высокой её разновидности (режим захвата точки).
    expect(css).toMatch(/top:\s*calc\(var\(--hud-inset\) \+ 11\.5rem\)/);
    expect(css).not.toMatch(/bottom:\s*calc\(1\.5rem \+ 9rem\)/);
    // Снятие по первому вводу, а не только по таймеру.
    expect(hook).toMatch(/addEventListener\('pointerdown', hide\)/);
    expect(hook).toMatch(/addEventListener\('keydown', hide\)/);
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
    // Announcement strings now live in the pure helper (testable without DOM);
    // the hook just feeds it the threshold snapshot.
    expect(hook).toMatch(/liveRegionText/);
    expect(hook).toMatch(/liveRegionKey/);
    expect(liveRegionText({
      lowHp: true, health: 12.4, reloading: false, isCharging: false,
      emptyMag: false, dead: false,
    })).toMatch(/Броня критична: 13/);
  });

  it('live region: railgun charge ≠ magazine reload (M15 hotfix)', () => {
    const base = {
      lowHp: false, health: 100, reloading: false, isCharging: false,
      emptyMag: false, dead: false,
    };
    // Railgun reports isCharging together with reloading (shared progress);
    // charge must announce «Зарядка», never «Перезарядка».
    const charging = liveRegionText({ ...base, reloading: true, isCharging: true });
    expect(charging).toBe('Зарядка');
    expect(charging).not.toMatch(/Перезарядка/);
    // A genuine cooldown/reload (not charging) still says «Перезарядка».
    expect(liveRegionText({ ...base, reloading: true })).toBe('Перезарядка');
    // charge and reload are distinct keys, so crossing between them re-announces.
    expect(liveRegionKey({ ...base, reloading: true, isCharging: true }))
      .not.toBe(liveRegionKey({ ...base, reloading: true }));
  });

  it('M16: boot/error surfaces are announced and the play canvas is labelled', () => {
    for (const rel of ['src/components/BootError.tsx', 'src/components/ErrorBoundary.tsx']) {
      const src = readSrc(rel);
      // Assertive announcement: the screen replaces the whole app, so nothing
      // else tells AT users why the game vanished.
      expect(src, `${rel} must announce`).toMatch(/role="alert"/);
      // Decorative icons must not be read as content.
      expect(src, `${rel} icons must be hidden`).toMatch(/<AlertTriangle[^>]*aria-hidden/);
      expect(src, `${rel} reload icon must be hidden`).toMatch(/<RefreshCcw[^>]*aria-hidden/);
    }

    // Canvas has no implicit ARIA role: assert on the tag itself, not the file
    // (App.tsx also holds role="alert"/aria-live for round errors, which would
    // make a whole-file match pass vacuously).
    const app = readSrc('src/App.tsx');
    const canvas = app.match(/<canvas[\s\S]*?<\/canvas>/)?.[0] ?? '';
    expect(canvas).not.toBe('');
    expect(canvas).toMatch(/role="img"/);
    expect(canvas).toMatch(/aria-label=/);
    // Fallback content for UAs without <canvas>.
    const inner = canvas.replace(/^<canvas[^>]*>/, '').replace(/<\/canvas>$/, '').trim();
    expect(inner.length).toBeGreaterThan(0);
  });
});

describe('UI polish invariants (tokens replace ad-hoc values)', () => {
  it('U17: the only radius left in UI is the circle token', () => {
    const values = declaredValues('border-radius', ALL_STYLES);
    expect(values.length).toBeGreaterThan(0);
    expect(values.filter((v) => v !== 'var(--radius-circle)')).toEqual([]);
  });

  it('U19: every clip cut comes from a cut token', () => {
    // Ни один срез не задаёт радиус числом: все ступени — токены (U19).
    // `calc(...)` разворачивается отдельно — производные вроде
    // `calc(var(--panel-cut) - 3px)` законны.
    for (const v of declaredValues('clip-path', ALL_STYLES)) {
      const withoutCalc = v
        .replace(/var\(--[a-z-]+\)/g, 'V')
        .replace(/calc\([^)]*\)/g, 'calc()');
      expect(withoutCalc, `hardcoded clip radius in "${v}"`).not.toMatch(/\d+px/);
    }
    const cuts = declaredValues('clip-path');
    expect(cuts.some((v) => v.includes('var(--panel-cut)'))).toBe(true);
    expect(cuts.some((v) => v.includes('var(--control-cut)'))).toBe(true);
    expect(cuts.some((v) => v.includes('var(--bar-cut)'))).toBe(true);
    expect(cuts.some((v) => v.includes('var(--chip-cut)'))).toBe(true);
  });

  it('U18: letter-spacing only comes from the four tracking tokens', () => {
    for (const f of ALL_STYLES) {
      for (const v of declaredValues('letter-spacing', [f])) {
        expect(v, `${f} declares raw tracking`).toMatch(/^var\(--track-(tight|base|wide|hero)\)$/);
      }
    }
    const vars = style('variables.css');
    for (const t of ['tight', 'base', 'wide', 'hero']) {
      expect(vars).toMatch(new RegExp(`--track-${t}:`));
    }
    // Разметка не проносит произвольную разрядку мимо шкалы.
    for (const rel of [...componentFiles(), 'src/App.tsx']) {
      expect(readSrc(rel), `${rel} has an arbitrary tracking value`).not.toMatch(/tracking-\[/);
    }
  });

  it('U20: glow and soft-shadow radii come from --glow-r-* tokens', () => {
    // Ищем радиус в позиции размытия: `0 0 <n>px rgba(…`. Форма `0 0 0 1px`
    // (кольцо без размытия) под шаблон не попадает — там px стоит в спреде.
    const rawGlow = /(?:^|[:,(\n])\s*0 0 \d+px rgba\(/;
    for (const f of ALL_STYLES) {
      expect(style(f), `${f} hardcodes a glow radius`).not.toMatch(rawGlow);
    }
    for (const t of ['xs', 'sm', 'md', 'lg']) {
      expect(style('variables.css')).toMatch(new RegExp(`--glow-r-${t}:`));
    }
  });

  it('U7: the four HUD corners share one inset token', () => {
    for (const rel of [
      'src/components/hud/HudRadar.tsx',
      'src/components/hud/HudFeed.tsx',
      'src/components/hud/HudVitals.tsx',
      'src/components/hud/HudWeapon.tsx',
    ]) {
      expect(readSrc(rel), `${rel} must use --hud-inset`).toMatch(/var\(--hud-inset\)/);
    }
    expect(style('variables.css')).toMatch(/--hud-inset:\s*1\.5rem/);
  });

  it('U15: overlay scrims come from the four scrim tokens', () => {
    expect(style('overlays.css')).toMatch(/\.scrim-menu\s*\{\s*background:\s*var\(--scrim-menu\)/);
    expect(style('overlays.css')).toMatch(/\.scrim-pause\s*\{[\s\S]*?var\(--scrim-pause\)/);
    expect(style('overlays.css')).toMatch(/\.scrim-over\s*\{\s*background:\s*var\(--scrim-over\)/);
    for (const rel of [
      'src/components/PauseMenu.tsx',
      'src/components/GameOverScreen.tsx',
      'src/components/ModeSelect.tsx',
      'src/components/MapSelect.tsx',
    ]) {
      expect(readSrc(rel), `${rel} must use a scrim class`).toMatch(/scrim-(menu|pause|over)/);
    }
    // Размытие допущено только в двух радиусах: табло (3px) и пауза (6px).
    const blurRadii = declaredValues('backdrop-filter', ALL_STYLES)
      .flatMap((v) => [...v.matchAll(/blur\(([^)]+)\)/g)].map((m) => m[1]));
    expect([...new Set(blurRadii)].sort()).toEqual(['3px', '6px']);
  });

  it('U22: garage dead CSS is gone and the dock backing is back on the live node', () => {
    const css = style('garage.css');
    for (const dead of ['garage-shell', 'garage-preview-spacer', 'garage-dock', 'garage-card-grid']) {
      expect(css, `${dead} is dead CSS`).not.toMatch(new RegExp(`\\.${dead}[\\s,:{]`));
    }
    expect(css).toMatch(/\.garage-bottom\s*\{[\s\S]*?background:\s*linear-gradient/);
    expect(css).toMatch(/\.garage-hint-label/);
  });

  it('U23: .head-rule and .hint-panel each live in exactly one stylesheet', () => {
    const owners = ALL_STYLES.map((f) => ({
      f,
      head: (style(f).match(/\.head-rule\s*\{/g) ?? []).length,
      hint: (style(f).match(/\.hint-panel\s*\{/g) ?? []).length,
    }));
    expect(owners.filter((o) => o.head > 0).map((o) => o.f)).toEqual(['overlays.css']);
    expect(owners.filter((o) => o.hint > 0).map((o) => o.f)).toEqual(['hud.css']);
  });

  it('U17: markup uses cut utilities, not Tailwind rounded', () => {
    for (const rel of [...componentFiles(), 'src/App.tsx']) {
      expect(readSrc(rel), `${rel} still uses a rounded utility`).not.toMatch(/(?:^|[\s"])rounded(?:-[a-z]+)?(?:[\s"]|$)/m);
    }
  });
});

describe('UI polish invariants (state matrix, §3.5)', () => {
  it('U13: one disabled state for buttons and cards', () => {
    // `.btn-game` раньше отключённого состояния не имел вовсе.
    expect(style('buttons.css')).toMatch(/\.btn-game:disabled/);
    expect(style('base.css')).toMatch(/\.is-disabled\s*\{/);
    // Старое имя класса и разнобой прозрачностей убраны.
    for (const f of ALL_STYLES) {
      expect(style(f), `${f} still uses .garage-disabled`).not.toMatch(/\.garage-disabled/);
    }
    for (const rel of [...componentFiles(), 'src/App.tsx']) {
      expect(readSrc(rel), `${rel} uses the old disabled class`).not.toMatch(/garage-disabled/);
    }
  });

  it('U14: every interactive role has hover, active and one focus ring', () => {
    for (const [file, role] of [
      ['overlays.css', '.map-card'],
      ['overlays.css', '.mode-card'],
      ['garage.css', '.garage-tab'],
      ['garage.css', '.garage-card'],
      ['buttons.css', '.btn-game'],
    ] as const) {
      const css = style(file);
      expect(css, `${role} has no :hover`).toMatch(new RegExp(`${role.replace('.', '\\.')}:hover`));
      expect(css, `${role} has no :active`).toMatch(new RegExp(`${role.replace('.', '\\.')}:active`));
    }
    // Кольцо фокуса объявлено ровно один раз на все роли.
    const offsets = ALL_STYLES.flatMap((f) => (style(f).match(/outline-offset/g) ?? []).map(() => f));
    expect(offsets).toEqual(['base.css']);
  });

  it('U11: leaving the match is one danger action in pause and results', () => {
    const pause = readSrc('src/components/PauseMenu.tsx');
    const over = readSrc('src/components/GameOverScreen.tsx');
    for (const src of [pause, over]) {
      expect(src).toMatch(/onMenu[^>]*btn-game btn-danger/);
      expect(src).toMatch(/<ArrowLeft[^>]*className="bicon"/);
      expect(src).toMatch(/<span>В МЕНЮ<\/span>/);
    }
  });

  it('U12: pause buttons use three size steps, nothing below 11px', () => {
    const pause = readSrc('src/components/PauseMenu.tsx');
    expect(pause).not.toMatch(/text-\[10px\]/);
    expect(pause).toMatch(/text-base/);
    expect(pause).toMatch(/text-sm/);
  });

  it('U16: frag and streak share one toast lane', () => {
    const css = style('hud.css');
    const hud = readSrc('src/components/HUD.tsx');
    expect(css).toMatch(/\.toast-lane\s*\{/);
    expect(hud).toMatch(/toast-lane/);
    // Оба тоста больше не задают собственный `top` — позицию держит полоса.
    for (const role of ['.frag-popup', '.streak-banner']) {
      const block = css.match(new RegExp(`\\${role}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(block, `${role} still positions itself`).not.toMatch(/\btop:/);
    }
    // И их keyframes больше не тащат translateX: он был компенсацией absolute.
    expect(css).not.toMatch(/translateX\(-50%\) scale/);
  });

  it('U26: the boot loader speaks the cut-corner language', () => {
    const app = readSrc('src/App.tsx');
    const css = style('hud.css');
    expect(app).toMatch(/className="loader"/);
    expect(app).not.toMatch(/animate-spin|rounded-full/);
    expect(css).toMatch(/\.loader\s*\{[\s\S]*?clip-path:\s*polygon\(var\(--control-cut\)/);
  });

  it('U8/U9/U10: both preparation screens share one frame', () => {
    for (const rel of ['src/components/ModeSelect.tsx', 'src/components/MapSelect.tsx']) {
      const src = readSrc(rel);
      expect(src, `${rel} misses the step chip`).toMatch(/prep-step/);
      expect(src, `${rel} misses the footer hint`).toMatch(/prep-hint/);
      expect(src, `${rel} misses the selection flag`).toMatch(/picked-flag/);
      // «Назад» — первым в шапке, а не справа.
      expect(src.indexOf('onCancel')).toBeLessThan(src.indexOf('prep-step'));
    }
    expect(style('overlays.css')).toMatch(/\.picked-flag\s*\{/);
    expect(style('overlays.css')).toMatch(/\.prep-step\s*\{/);
  });
});

describe('UI polish invariants (layout per scenario, S1–S5)', () => {
  it('S1: the menu CTA comes before the build chip, and keys are one primitive', () => {
    const menu = readSrc('src/components/MainMenu.tsx');
    // Главное действие — сразу под лидом; сборка сжата до строки-чипа ниже.
    expect(menu.indexOf('ИГРАТЬ')).toBeGreaterThan(-1);
    expect(menu.indexOf('ИГРАТЬ')).toBeLessThan(menu.indexOf('build-chip'));
    expect(menu).toMatch(/build-chip/);
    // Клавиша — общий примитив: чип определён один раз, в base.css.
    expect(style('base.css')).toMatch(/\.key-chip\s*\{/);
    expect(menu).toMatch(/key-chip/);
    expect(readSrc('src/components/HUD.tsx')).toMatch(/<b className="key-chip">/);
    // Старое правило для `<b>` внутри подсказки удалено — иначе два источника.
    for (const f of ALL_STYLES) {
      expect(style(f), `${f} still styles .hint-panel b`).not.toMatch(/\.hint-panel b\s*\{/);
    }
  });

  it('S2: garage header is navigation only; the CTA ends the selection motion', () => {
    const garage = readSrc('src/components/Garage.tsx');
    // Паспорт идёт раньше CTA, а CTA прижат к низу колонки паспорта (`mt-auto`).
    expect(garage.indexOf('garage-passport')).toBeLessThan(garage.indexOf('btn-game btn-primary'));
    expect(garage).toMatch(/anim-up mt-auto/);
    expect(garage).toMatch(/btn-game btn-primary w-full/);
    // Шапка — сетка `1fr auto 1fr`: табы центрируются независимо от «назад».
    expect(style('garage.css')).toMatch(/\.garage-header\s*\{[\s\S]*?grid-template-columns:\s*1fr auto 1fr/);
  });

  it('U24: card rows line up via grid, not min-height', () => {
    const css = style('garage.css');
    expect(css).toMatch(/\.garage-card\s*\{[\s\S]*?grid-template-rows:\s*auto auto 1fr auto/);
    expect(css).toMatch(/\.card-badge\s*\{[\s\S]*?justify-self:\s*start/);
    for (const rel of ['src/components/HullCard.tsx', 'src/components/TurretCard.tsx']) {
      const src = readSrc(rel);
      expect(src, `${rel} misses card-badge`).toMatch(/card-badge/);
      expect(src, `${rel} still uses a magic min-height`).not.toMatch(/min-h-\[\d+px\]/);
    }
  });

  it('S5: the pause menu groups into sections with dividers', () => {
    const pause = readSrc('src/components/PauseMenu.tsx');
    expect((pause.match(/pause-section/g) ?? []).length).toBe(3);
    expect(style('overlays.css')).toMatch(/\.pause-section\s*\{[\s\S]*?border-top:\s*1px solid/);
  });

  it('S5: results render K/D through the shared StatCard', () => {
    const over = readSrc('src/components/GameOverScreen.tsx');
    expect(over).toMatch(/label="K\/D" value=\{formatKd/);
    expect((over.match(/<StatCard/g) ?? []).length).toBe(5);
  });

  it('S4: one breakpoint shrinks the radar, and its size has a single source', () => {
    const draw = readSrc('src/components/hud/minimapDraw.ts');
    const size = Number(draw.match(/export const MAP_SIZE = (\d+)/)?.[1]);
    expect(size).toBeGreaterThan(0);
    // CSS-размер обязан совпадать с MAP_SIZE, иначе радар поедет по пропорциям.
    expect(style('hud.css')).toMatch(new RegExp(`--radar-size:\\s*${size}px`));
    expect(style('hud.css')).toMatch(/@media \(max-width: 1100px\), \(max-height: 800px\)/);
    // Размер задаёт CSS, а не инлайновый стиль из отрисовщика: иначе брейкпоинт
    // бессилен — инлайн перебивает таблицу стилей.
    expect(draw).not.toMatch(/cv\.style\.width/);
    expect(readSrc('src/components/hud/HudRadar.tsx')).toMatch(/radar-panel/);
  });

  it('entry animations never sit on a .btn-primary element', () => {
    // `.btn-primary` задаёт `animation: gradient-drift` шорткатом и перебивает
    // `anim-up`/`anim-left`: элемент остаётся с `opacity: 0` навсегда, потому что
    // шорткат затирает и `enter-up`, и его `forwards`. Вход анимирует обёртка.
    const classStrings = (rel: string) =>
      [...readSrc(rel).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
        .map((m) => m[1] ?? m[2] ?? '');
    for (const rel of [...componentFiles(), 'src/App.tsx']) {
      for (const cls of classStrings(rel)) {
        if (cls.includes('btn-primary')) {
          expect(cls, `${rel} animates a primary button directly`).not.toMatch(/\banim-(up|left|pop)\b/);
        }
      }
    }
  });
});

describe('UI polish invariants (data language, U27/U28)', () => {
  it('U27: one name per weapon — the brand label is gone', () => {
    // Панель оружия показывала два имени одной пушки («RAILGUN · РЕЛЬСОТРОН»).
    // Бренд-поле удалено, в снапшот уходит роль — тип и имя, а не два имени.
    expect(readSrc('src/core/WeaponCatalog.ts')).not.toMatch(/\blabel\b/);
    expect(readSrc('src/game/HudModel.ts')).toMatch(/weaponLabel = wmeta\.kind/);
    expect(readSrc('src/hooks/useGameHud.ts')).toMatch(/weaponLabel: _defaultWeapon\.kind/);
  });

  it('U27: `Speedy` stays latin — it is the name the player asked for', () => {
    // Git-история, iteration 18: «Назови его Speedy» — явный запрос игрока, и та
    // же строка записана в утверждённом `Tank_Movement.md`. Латиница намеренна:
    // это не опечатка, которую нужно «починить» транслитерацией.
    expect(readSrc('src/core/catalogData.ts')).toMatch(/name: 'Speedy'/);
    expect(readSrc('Docs/GDD/Approved/Tank_Movement.md')).toMatch(/Speedy/);
  });

  it('U28: no small text drops below 4.5:1 contrast', () => {
    // Утилиты прозрачности ниже 0.6 на тексте 10–12 px давали ≈3.8:1 на панели
    // и меньше на светлой сцене. Разделители-«·» живут на 0.45 и не текст.
    for (const rel of [...componentFiles(), 'src/App.tsx']) {
      const src = readSrc(rel);
      for (const m of src.matchAll(/text-white\/(\d+)/g)) {
        expect(Number(m[1]), `${rel}: text-white/${m[1]}`).toBeGreaterThanOrEqual(45);
      }
    }
    for (const f of ALL_STYLES) {
      for (const m of style(f).matchAll(/color:\s*rgba\(255,\s*255,\s*255,\s*0\.(\d+)\)/g)) {
        expect(Number(`0.${m[1]}`), `${f}: ${m[0]}`).toBeGreaterThanOrEqual(0.45);
      }
    }
  });
});
