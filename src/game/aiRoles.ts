// ===== Роли ИИ ботов: sniper / assault / elite / standard =====
import type { TurretId } from '../core/catalog';
import type { AIPersona } from './AI';

export type AIRole = 'standard' | 'sniper' | 'assault' | 'elite';

const ROLE_LABEL: Record<AIRole, string> = {
  standard: 'Боец',
  sniper: 'Снайпер',
  assault: 'Штурм',
  elite: 'Элит',
};

export function roleLabel(role: AIRole): string {
  return ROLE_LABEL[role];
}

/**
 * Назначение роли: элит — первый бот с 3-й волны;
 * оружие задаёт sniper (рельса) / assault (огонь) / standard (пушка).
 */
export function roleForBot(wave: number, index: number, turretId: TurretId): AIRole {
  if (wave >= 3 && index === 0) return 'elite';
  if (turretId === 'railgun') return 'sniper';
  if (turretId === 'flamethrower') return 'assault';
  return 'standard';
}

/** Persona под роль (элит/снайпер точнее и злее, штурм — max aggro). */
export function personaForRole(role: AIRole, wave: number): AIPersona {
  const waveReact = Math.max(0.08, 0.18 - wave * 0.012);
  switch (role) {
    case 'sniper':
      return { aggro: 0.22, react: waveReact, lead: 1.15 };
    case 'assault':
      return { aggro: 0.95, react: Math.max(0.06, waveReact * 0.7), lead: 0.65 };
    case 'elite':
      return { aggro: 0.88, react: Math.max(0.07, waveReact * 0.75), lead: 1.05 };
    default:
      return {
        aggro: 0.35 + Math.random() * 0.4,
        react: Math.max(0.1, 0.15 + Math.random() * 0.3 - wave * 0.02),
        lead: 0.7 + Math.random() * 0.5,
      };
  }
}

/** Множитель ошибки прицела (меньше = точнее). */
export function aimErrorMulForRole(role: AIRole): number {
  if (role === 'sniper') return 0.5;
  if (role === 'elite') return 0.65;
  if (role === 'assault') return 1.15;
  return 1;
}

/** Порог HP для ухода в укрытие (элит раньше). */
export function coverHpFracForRole(role: AIRole): number {
  if (role === 'elite') return 0.5;
  if (role === 'sniper') return 0.4;
  return 0.35;
}
