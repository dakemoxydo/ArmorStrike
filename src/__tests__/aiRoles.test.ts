import { describe, it, expect } from 'vitest';
import {
  aimErrorMulForRole,
  coverHpFracForRole,
  personaForRole,
  roleForBot,
  roleLabel,
} from '../game/aiRoles';
import { preferredRange } from '../game/AI';

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
