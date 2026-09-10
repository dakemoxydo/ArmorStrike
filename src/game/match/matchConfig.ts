// ===== Дефолтные конфиги режимов (locked design) =====
import type { MatchConfig, MatchModeId } from './matchTypes';

/**
 * Balance (P6 / design fallback):
 * - DM 30 kills · TDM 75 team kills (was 100 — long) · CP 1000 @ +1/s
 * - Soft end 12 min all modes
 */
const BASE = {
  timeLimitSec: 12 * 60,
  respawnDelaySec: 4,
  spawnInvulnSec: 2,
  dmBotCount: 7,
  teamSize: 5,
  winKills: 30,
  winTeamKills: 75,
  winTeamScore: 1000,
} as const;

export function configForMode(mode: MatchModeId): MatchConfig {
  return {
    mode,
    winKills: BASE.winKills,
    winTeamKills: BASE.winTeamKills,
    winTeamScore: BASE.winTeamScore,
    timeLimitSec: BASE.timeLimitSec,
    respawnDelaySec: BASE.respawnDelaySec,
    spawnInvulnSec: BASE.spawnInvulnSec,
    dmBotCount: BASE.dmBotCount,
    teamSize: BASE.teamSize,
  };
}

export const DEFAULT_MATCH_MODE: MatchModeId = 'deathmatch';

/** Normal bot combat scales (no wave ramp). */
export const BOT_NORMAL = {
  /** AI sight / aim — mid of legacy wave curve. */
  sightRange: 46,
  aimError: 0.1,
  healthScale: 1,
  damageScale: 1,
  /**
   * Cooldown pad (бот чуть медленнее игрока). Эффективен ТОЛЬКО для класса
   * пушки: у railgun/flamer `TURRET.shotCooldown = 0`, их каденция —
   * внутренняя логика оружия (charge/reload / energy), поэтому оверрайды
   * ролей в rosterSpawn (assault 1.15 / sniper 1.35) там инертны:
   * снайперы и штурмы стреляют в каденции игрока.
   */
  shotCooldownScale: 1.2,
  /** Fake "wave" for roleForBot elite gate — no elite spam in match roster. */
  roleWave: 1,
} as const;
