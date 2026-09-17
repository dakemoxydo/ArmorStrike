// ===== Танк: сущность = id + composition of domain components =====
// Systems / weapons keep using flat port projections (MotionBody, WeaponOwner, …);
// storage lives in motion / combat / buffs / fx / visual.
import * as THREE from 'three';
import { TANK } from './constants';
import { SUSPENSION_TUNING } from './tuning';
import type { HullId, TurretId } from '../core/catalog';
import type { Weapon, WeaponOwner } from './weapons/types';
import { disposeObject3D } from './resources/disposeObject3D';
import type { TankLike } from '../core/types';
import type { TankParams, TankVisual, TankFxState } from './tank/types';
import {
  TankBuffState,
  TankCombatState,
  TankMotionState,
  createTankFxState,
} from './tank/components';
import type { TeamId } from './match/matchTypes';

export type { TankParams, TankVisual } from './tank/types';
/** Удобный re-export сборки меша (импорт типов — из tank/types, цикл разорван). */
export { buildTankMesh } from './tank/buildMesh';

let nextTankId = 1;

export class TankEntity implements TankLike, WeaponOwner {
  id = nextTankId++;
  name: string;
  isPlayer: boolean;
  params: TankParams;
  visual: TankVisual;

  /** Drive / aim pose / knockback. */
  readonly motion = new TankMotionState();
  /** HP, death, fire timer. */
  readonly combat: TankCombatState;
  /** Owner-level spawn multipliers (role cadence pads). */
  readonly buffs = new TankBuffState();
  /** Presentation-only FX accumulators (outside TankLike). */
  readonly fx: TankFxState = createTankFxState();

  /** Match: FFA null; TDM/CP alpha|bravo. */
  teamId: TeamId = null;
  /** Match personal kills / deaths. */
  kills = 0;
  deaths = 0;

  hullId?: HullId;
  turretId?: TurretId;
  weapon?: Weapon;
  radius = TANK.radius;

  constructor(name: string, isPlayer: boolean, params: TankParams, visual: TankVisual) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.params = params;
    this.visual = visual;
    this.combat = new TankCombatState(params.maxHealth);
  }

  // ---- Flat port projections (MotionBody / AimBody / WeaponOwner / TankLike / AIBody) ----
  // Call sites and port types stay structural; storage is in components above.

  get yaw() { return this.motion.yaw; }
  set yaw(v: number) { this.motion.yaw = v; }

  get turretYaw() { return this.motion.turretYaw; }
  set turretYaw(v: number) { this.motion.turretYaw = v; }

  get aimYaw() { return this.motion.aimYaw; }
  set aimYaw(v: number) { this.motion.aimYaw = v; }

  get barrelPitch() { return this.motion.barrelPitch; }
  set barrelPitch(v: number) { this.motion.barrelPitch = v; }

  get pitchDy() { return this.motion.pitchDy; }
  set pitchDy(v: number) { this.motion.pitchDy = v; }

  get pitchDistXZ() { return this.motion.pitchDistXZ; }
  set pitchDistXZ(v: number) { this.motion.pitchDistXZ = v; }

  get pitchLocked() { return this.motion.pitchLocked; }
  set pitchLocked(v: boolean) { this.motion.pitchLocked = v; }

  get speed() { return this.motion.speed; }
  set speed(v: number) { this.motion.speed = v; }

  get throttle() { return this.motion.throttle; }
  set throttle(v: number) { this.motion.throttle = v; }

  get steer() { return this.motion.steer; }
  set steer(v: number) { this.motion.steer = v; }

  get boosting() { return this.motion.boosting; }
  set boosting(v: boolean) { this.motion.boosting = v; }

  get boostActive() { return this.motion.boostActive; }
  set boostActive(v: boolean) { this.motion.boostActive = v; }

  get boostEnergy() { return this.motion.boostEnergy; }
  set boostEnergy(v: number) { this.motion.boostEnergy = v; }

  get knockback() { return this.motion.knockback; }
  set knockback(v: THREE.Vector3) { this.motion.knockback.copy(v); }

  get vel() { return this.motion.vel; }
  set vel(v: THREE.Vector3) { this.motion.vel.copy(v); }

  get reloadSpeedMul() { return this.buffs.reloadSpeedMul; }
  set reloadSpeedMul(v: number) { this.buffs.reloadSpeedMul = v; }

  get health() { return this.combat.health; }
  set health(v: number) { this.combat.health = v; }

  get alive() { return this.combat.alive; }
  set alive(v: boolean) { this.combat.alive = v; }

  get deathT() { return this.combat.deathT; }
  set deathT(v: number) { this.combat.deathT = v; }

  get fireTimer() { return this.combat.fireTimer; }
  set fireTimer(v: number) { this.combat.fireTimer = v; }

  get lastAttackerId() { return this.combat.lastAttackerId; }
  set lastAttackerId(v: number) { this.combat.lastAttackerId = v; }

  get invulnT() { return this.combat.invulnT; }
  set invulnT(v: number) { this.combat.invulnT = v; }

  get timeSinceDamaged() { return this.combat.timeSinceDamaged; }
  set timeSinceDamaged(v: number) { this.combat.timeSinceDamaged = v; }

  /** Накопленный шанс крита (мутируется DamageSystem на попаданиях). */
  get critChance() { return this.combat.critChance; }
  set critChance(v: number) { this.combat.critChance = v; }

  // Статика сборки (из каталога) для расчёта урона в core/DamageSystem:
  // тип урона башни, резисты корпуса, кривая крита орудия.
  get damageType() { return this.params.damageType; }
  get damageResist() { return this.params.damageResist; }
  get critTuning() { return this.params.critTuning; }

  get position() { return this.visual.group.position; }
  get maxHealth() { return this.params.maxHealth; }

  muzzleWorld(out: THREE.Vector3): THREE.Vector3 {
    return this.visual.muzzle.getWorldPosition(out);
  }

  /**
   * Направление выстрела — полный 3D-вектор ствола: азимут `aimYaw` + наклон
   * `barrelPitch` (положительный = вверх). XZ-проекция остаётся строго вдоль
   * прицела (её модуль делится на cos pitch), поэтому горизонтальная трасса
   * снаряда/луча не меняется, добавляется только вертикальная составляющая.
   */
  aimDir(out: THREE.Vector3): THREE.Vector3 {
    const pitch = this.motion.barrelPitch;
    const cp = Math.cos(pitch);
    out.set(Math.sin(this.aimYaw) * cp, Math.sin(pitch), Math.cos(this.aimYaw) * cp);
    return out;
  }

  /**
   * Вход вертикальной автонаводки: геометрия к точке прицела `targetCenter`
   * (мировой центр корпуса цели). dy и XZ-дистанция берутся от дула, как и
   * вектор выстрела — цель выше дула даёт подъём, ниже — склонение.
   */
  setPitchAim(targetCenter: THREE.Vector3): void {
    this.muzzleWorld(this._pitchTmp);
    const dx = targetCenter.x - this._pitchTmp.x;
    const dz = targetCenter.z - this._pitchTmp.z;
    this.motion.pitchDistXZ = Math.sqrt(dx * dx + dz * dz);
    this.motion.pitchDy = targetCenter.y - this._pitchTmp.y;
    this.motion.pitchLocked = true;
  }

  /** Нет цели — целевой тангаж вернётся к горизонту (0). */
  clearPitchAim(): void {
    this.motion.pitchLocked = false;
  }

  /** Готовность к выстрелу по базовым условиям (fireTimer). Контракт
   *  оружия (наличие патронов/заряда) проверяется самим оружием. */
  canFire(): boolean {
    return this.alive && this.fireTimer <= 0;
  }

  onFired(recoil: number) {
    this.fireTimer = this.params.shotCooldown;
    // Visual kick scales with recoil so railgun (≈18) snaps harder than cannon (≈5).
    this.fx.barrelKick = Math.min(2.25, 0.55 + Math.abs(recoil) * 0.07);
    // Отдача в корпус — строго горизонтальна по азимуту прицела. Не берём
    // aimDir: он теперь 3D (с тангажом), а вертикальной составляющей отдачи
    // у гусеничной техники быть не должно (и knockback.y всё равно не читается).
    this._v.set(Math.sin(this.aimYaw), 0, Math.cos(this.aimYaw));
    this.knockback.addScaledVector(this._v, -recoil);

    // Угловой импульс отдачи в подвеску корпуса с учётом угла башни relative to hull:
    const relTurretYaw = this.turretYaw;
    this.fx.pitchVel -= Math.cos(relTurretYaw) * recoil * SUSPENSION_TUNING.recoilPitchScale;
    this.fx.rollVel += Math.sin(relTurretYaw) * recoil * SUSPENSION_TUNING.recoilRollScale;
  }

  /** Railgun charge pull-back / external barrel animation driver. */
  setBarrelKick(amount: number) {
    this.fx.barrelKick = amount;
  }

  takeDamage(dmg: number, attackerId: number) {
    if (!this.alive || dmg <= 0) return;
    this.health -= dmg;
    this.combat.timeSinceDamaged = 0;
    this.fx.hitFlash = 1;
    this.lastAttackerId = attackerId;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.deathT = 0;
      this.throttle = 0;
      this.steer = 0;
      // Оружие должно остановить звуки/заряд/визуалы при смерти владельца.
      // Вызывается один раз на переход alive → !alive.
      this.weapon?.onOwnerDeath?.();
    }
  }

  private _v = new THREE.Vector3();
  private _pitchTmp = new THREE.Vector3();

  dispose(scene: THREE.Scene) {
    this.weapon?.dispose();
    scene.remove(this.visual.group);
    disposeObject3D(this.visual.group);
  }
}
