// ===== Временные боевые баффы между волнами (урон / скорость / перезарядка) =====
import type { BuffableTank } from './tank/simPorts';
import type { WaveBuffId } from './wavePreview';

const DAMAGE_MUL = 1.25;
const SPEED_MUL = 1.2;
const TURN_MUL = 1.15;
/** Higher = faster reload / shorter cooldowns. */
const RELOAD_MUL = 1 / 0.7; // ~1.429 → 30% faster

export interface BuffBaseSnapshot {
  damage: number;
  speed: number;
  reverseSpeed: number;
  turnSpeed: number;
  shotCooldown: number;
}

/** Снять эффекты предыдущего волнового баффа. */
export function clearWaveBuff(player: BuffableTank) {
  if (player.buffBase) {
    player.params.damage = player.buffBase.damage;
    player.params.speed = player.buffBase.speed;
    player.params.reverseSpeed = player.buffBase.reverseSpeed;
    player.params.turnSpeed = player.buffBase.turnSpeed;
    player.params.shotCooldown = player.buffBase.shotCooldown;
    player.buffBase = null;
  }
  player.reloadSpeedMul = 1;
  player.boostDrainMul = 1;
  player.boostRechargeMul = 1;
}

/** Применить выбранный бафф. Предыдущий активный сбрасывается. */
export function applyWaveBuff(player: BuffableTank, id: WaveBuffId) {
  clearWaveBuff(player);

  player.buffBase = {
    damage: player.params.damage,
    speed: player.params.speed,
    reverseSpeed: player.params.reverseSpeed,
    turnSpeed: player.params.turnSpeed,
    shotCooldown: player.params.shotCooldown,
  };
  const b = player.buffBase;

  if (id === 'damage') {
    player.params.damage = Math.round(b.damage * DAMAGE_MUL);
    return;
  }

  if (id === 'speed') {
    player.params.speed = b.speed * SPEED_MUL;
    player.params.reverseSpeed = b.reverseSpeed * SPEED_MUL;
    player.params.turnSpeed = b.turnSpeed * TURN_MUL;
    return;
  }

  // reload: faster magazine/rail cooldown + shorter inter-shot cooldown
  player.reloadSpeedMul = RELOAD_MUL;
  player.params.shotCooldown = b.shotCooldown / RELOAD_MUL;
}
