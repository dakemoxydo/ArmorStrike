// ===== Каталог танков: корпуса, башни и общие стили окраски =====
// Единое место для определений HULLS/TURRETS и построения TankStyle,
// чтобы игрок (PlayerFactory) и боты (botSpawn) не дублировали литералы.
//
// Разделение краски (п.21, по мотивам Tanki Online): в командных режимах
// КОРПУС красится в цвет фракции, а личная краска живёт на металлических
// акцентах башни (`accent`) и на собственных маркерах игрока (`glow`).
// В Deathmatch фракционных цветов нет → работает прежняя личная палитра.
import type { Color } from 'three';
import { COLORS } from './constants';
import type { TankStyle } from './types';

/** Смешивание 24-бит цветов: t = доля цвета b (0 → a, 1 → b). */
function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Тёмная база металлических акцентов (былый `accent` ботов/игрока). */
const METAL_DARK = 0x2b2f36;

/**
 * Стиль окраски игрока.
 *
 * @param faction Цвет фракции (Alpha/Bravo) в командных режимах. Без него
 * (FFA, предпросмотр гаража) корпус — сочный изумрудно-мятный камуфляж с белыми полосами.
 */
export function buildPlayerStyle(faction?: Color): TankStyle {
  const paint = faction
    ? {
        // Камуфляж корпуса целиком из фракционного цвета (как у ботов),
        // чуть светлее базы, чтобы «свой» читался и на тёмной карте.
        body: `#${faction.clone().multiplyScalar(0.62).getHexString()}`,
        dark: '#16202a',
        light: `#${faction.clone().multiplyScalar(0.92).getHexString()}`,
      }
    : { body: '#2fae8f', dark: '#144e40', light: '#ffffff' };
  return {
    ...paint,
    // Кольцо/лампа/антенна — яркий сочный маркер «это я».
    glow: COLORS.player,
    // Личная краска переехала на акценты башни (п.21).
    accent: mixHex(METAL_DARK, COLORS.player, 0.45),
    antenna: true,
  };
}

/**
 * Стиль окраски бота, производный от цвета его команды.
 *
 * @param teamColor Фракция (командные режимы) или личная палитра (FFA).
 * @param personal  Личная краска для акцентов башни. В FFA не передаётся:
 *                  там цвет корпуса уже и есть личный, дублировать его в
 *                  металле смысла нет.
 */
export function buildBotStyle(teamColor: Color, personal?: Color): TankStyle {
  return {
    body: `#${teamColor.clone().multiplyScalar(0.55).getHexString()}`,
    dark: '#3a1512',
    light: `#${teamColor.clone().multiplyScalar(0.8).getHexString()}`,
    glow: teamColor.getHex(),
    accent: personal ? mixHex(METAL_DARK, personal.getHex(), 0.45) : METAL_DARK,
    antenna: false,
  };
}
