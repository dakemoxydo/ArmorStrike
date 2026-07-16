// ===== Каталог танков: корпуса, башни и общие стили окраски =====
// Единое место для определений HULLS/TURRETS и построения TankStyle,
// чтобы игрок (PlayerFactory) и боты (WaveManager) не дублировали литералы.
import type { Color } from 'three';
import { COLORS } from '../game/constants';
import type { TankStyle } from '../game/Tank';

export { HULLS, TURRETS } from '../game/constants';
export type { HullId, TurretId } from '../game/constants';

/** Стиль окраски игрока (фиксированная палитра). */
export function buildPlayerStyle(): TankStyle {
  return {
    body: '#2fae8f', dark: '#1a6e5b', light: '#5fd8b8',
    glow: COLORS.player, accent: 0x274a58, antenna: true,
  };
}

/** Стиль окраски бота, производный от его цвета команды. */
export function buildBotStyle(teamColor: Color): TankStyle {
  return {
    body: `#${teamColor.clone().multiplyScalar(0.55).getHexString()}`,
    dark: '#3a1512',
    light: `#${teamColor.clone().multiplyScalar(0.8).getHexString()}`,
    glow: teamColor.getHex(), accent: 0x2b2f36, antenna: false,
  };
}
