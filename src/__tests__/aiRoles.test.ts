import { describe, it, expect } from 'vitest';
import {
  aimErrorMulForRole,
  coverHpFracForRole,
  personaForRole,
  roleForBot,
  roleLabel,
} from '../game/aiRoles';
import { preferredRange } from '../game/AI';
import { BOT_NORMAL } from '../game/match/matchConfig';
import { TURRETS } from '../core/catalog';

describe('aiRoles', () => {
  it('maps weapon to role; elite is first bot from wave 3', () => {
    expect(roleForBot(1, 0, 'railgun')).toBe('sniper');
    expect(roleForBot(1, 1, 'flamethrower')).toBe('assault');
    expect(roleForBot(1, 2, 'cannon')).toBe('standard');
    expect(roleForBot(3, 0, 'cannon')).toBe('elite');
    expect(roleForBot(3, 1, 'railgun')).toBe('sniper');
  });

  it('persona: assault max aggro, sniper low aggro', () => {
    const a = personaForRole('assault', 2);
    const s = personaForRole('sniper', 2);
    const e = personaForRole('elite', 2);
    expect(a.aggro).toBeGreaterThan(0.8);
    expect(s.aggro).toBeLessThan(0.4);
    expect(e.aggro).toBeGreaterThan(0.7);
  });

  it('sniper aims better; assault looser', () => {
    expect(aimErrorMulForRole('sniper')).toBeLessThan(aimErrorMulForRole('standard'));
    expect(aimErrorMulForRole('assault')).toBeGreaterThan(aimErrorMulForRole('standard'));
  });

  it('elite seeks cover earlier than standard', () => {
    expect(coverHpFracForRole('elite')).toBeGreaterThan(coverHpFracForRole('standard'));
  });

  it('role labels are non-empty', () => {
    for (const r of ['standard', 'sniper', 'assault', 'elite'] as const) {
      expect(roleLabel(r).length).toBeGreaterThan(0);
    }
  });

  it('preferredRange still ranks weapons', () => {
    expect(preferredRange('flamethrower', 0.5)).toBeLessThan(preferredRange('cannon', 0.5));
    expect(preferredRange('cannon', 0.5)).toBeLessThan(preferredRange('railgun', 0.5));
  });
});

// ===== D2: таблица параметров ролей против Docs/GDD/Approved/AI_Bots.md =====
// GDD пинирует: aimError ×, cover HP, aggro/lead по ролям. react — code truth.
describe('aiRoles — точная таблица ролей (D2 vs AI_Bots.md)', () => {
  it('aimError × и cover HP совпадают с таблицей GDD', () => {
    // | elite | sniper | assault | standard |
    expect(aimErrorMulForRole('elite')).toBeCloseTo(0.65);
    expect(aimErrorMulForRole('sniper')).toBeCloseTo(0.5);
    expect(aimErrorMulForRole('assault')).toBeCloseTo(1.15);
    expect(aimErrorMulForRole('standard')).toBe(1);
    expect(coverHpFracForRole('elite')).toBe(0.5);
    expect(coverHpFracForRole('sniper')).toBe(0.4);
    expect(coverHpFracForRole('assault')).toBe(0.35);
    expect(coverHpFracForRole('standard')).toBe(0.35);
  });

  it('persona aggro/lead ролей — точно по GDD (roleWave=1)', () => {
    const s = personaForRole('sniper', BOT_NORMAL.roleWave);
    expect(s.aggro).toBeCloseTo(0.22);
    expect(s.lead).toBeCloseTo(1.15);
    const a = personaForRole('assault', BOT_NORMAL.roleWave);
    expect(a.aggro).toBeCloseTo(0.95);
    expect(a.lead).toBeCloseTo(0.65);
    const e = personaForRole('elite', BOT_NORMAL.roleWave);
    expect(e.aggro).toBeCloseTo(0.88);
    expect(e.lead).toBeCloseTo(1.05);
  });

  it('standard: persona в документированных пределах (random-ish, сэмпл 500)', () => {
    for (let i = 0; i < 500; i++) {
      const p = personaForRole('standard', BOT_NORMAL.roleWave);
      // aggro U[0.35, 0.75] — не пересекается с sniper 0.22 / assault 0.95.
      expect(p.aggro).toBeGreaterThanOrEqual(0.35);
      expect(p.aggro).toBeLessThanOrEqual(0.75);
      // react U[0.13, 0.43] при wave=1 (max(0.1, …) не режет).
      expect(p.react).toBeGreaterThanOrEqual(0.13);
      expect(p.react).toBeLessThanOrEqual(0.43);
      expect(p.lead).toBeGreaterThanOrEqual(0.7);
      expect(p.lead).toBeLessThanOrEqual(1.2);
    }
  });

  it('эффективный aimError: снайпер < стандарт < штурм (разброс реален)', () => {
    const sniper = BOT_NORMAL.aimError * aimErrorMulForRole('sniper');
    const standard = BOT_NORMAL.aimError * aimErrorMulForRole('standard');
    const assault = BOT_NORMAL.aimError * aimErrorMulForRole('assault');
    expect(sniper).toBeCloseTo(0.05);
    expect(standard).toBeCloseTo(0.1);
    expect(assault).toBeCloseTo(0.115);
    expect(sniper).toBeLessThan(standard);
    expect(standard).toBeLessThan(assault);
  });

  it('aggro разброс ролей не пересекается: снайпер < стандарт < штурм', () => {
    const sniper = personaForRole('sniper', BOT_NORMAL.roleWave).aggro;
    const assault = personaForRole('assault', BOT_NORMAL.roleWave).aggro;
    for (let i = 0; i < 200; i++) {
      const ag = personaForRole('standard', BOT_NORMAL.roleWave).aggro;
      expect(ag).toBeGreaterThan(sniper);
      expect(ag).toBeLessThan(assault);
    }
  });

  it('react: штурм реагирует быстрее снайпера (code truth)', () => {
    const a = personaForRole('assault', BOT_NORMAL.roleWave);
    const s = personaForRole('sniper', BOT_NORMAL.roleWave);
    expect(a.react).toBeCloseTo(0.1176);
    expect(s.react).toBeCloseTo(0.168);
    expect(a.react).toBeLessThan(s.react);
  });

  it('cooldown pad действует только на класс пушки (railgun/flamer инертны)', () => {
    // Роль оверрайдит shotCooldownScale (sniper 1.35 / assault 1.15), но
    // TURRET.shotCooldown ненулевой только у пушки — для остальных классов
    // масштабирование 0×k не меняет каденцию (она weapon-internal).
    for (const id of ['railgun', 'flamethrower'] as const) {
      expect(TURRETS[id].shotCooldown).toBe(0);
    }
    expect(TURRETS.cannon.shotCooldown).toBe(0.28);
    // Стандарт (пушка) реально медленнее игрока: 0.28 × 1.2 = 0.336.
    expect(TURRETS.cannon.shotCooldown * BOT_NORMAL.shotCooldownScale).toBeCloseTo(0.336);
  });
});
