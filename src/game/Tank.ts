// ===== Танк: построение модели (корпуса + башни) и сущность танка =====
import * as THREE from 'three';
import { BOOST, TANK } from './constants';
import type { HullId, TurretId } from './constants';
import { clamp, wrapAngle } from './physics';
import { camoTexture, trackTexture } from './textures';

export interface TankVisual {
  group: THREE.Group;
  hull: THREE.Group;
  turret: THREE.Group;
  barrelGroup: THREE.Group;
  muzzle: THREE.Object3D;
  ring: THREE.Mesh;
  bodyMats: THREE.MeshStandardMaterial[];
  trackTex: THREE.CanvasTexture;
  railGlowMat?: THREE.MeshStandardMaterial;
}

export interface TankStyle {
  body: string;
  dark: string;
  light: string;
  glow: number;      // цвет командного свечения
  accent: number;    // цвет ствола/деталей
  antenna: boolean;
}

export function buildTankMesh(
  style: TankStyle,
  hullId: HullId = 'hunter',
  turretId: TurretId = 'railgun',
): TankVisual {
  const group = new THREE.Group();
  const hull = new THREE.Group();
  group.add(hull);

  const bodyMats: THREE.MeshStandardMaterial[] = [];
  const bodyMat = new THREE.MeshStandardMaterial({
    map: camoTexture(style.body, style.dark, style.light),
    roughness: 0.5, metalness: 0.45, emissive: 0x000000,
  });
  bodyMats.push(bodyMat);
  const turretMat = bodyMat.clone();
  turretMat.map = camoTexture(style.light, style.body, style.dark);
  bodyMats.push(turretMat);
  const metalMat = new THREE.MeshStandardMaterial({
    color: style.accent, roughness: 0.35, metalness: 0.75,
  });
  bodyMats.push(metalMat);

  const lampMat = new THREE.MeshBasicMaterial({ color: style.glow });

  // --- ГУСЕНИЦЫ И КОРПУС ---
  const trackTex = trackTexture();
  const trackMat = new THREE.MeshStandardMaterial({
    map: trackTex, roughness: 0.9, metalness: 0.15,
  });

  if (hullId === 'viking') {
    // === ВИКИНГ: Низкий, широкий и стремительный ===
    const trW = 0.95, trH = 0.82, trL = 4.6;
    for (const side of [-1, 1]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(trW, trH, trL), trackMat);
      tr.position.set(side * 1.55, 0.42, 0);
      hull.add(tr);
      const fender = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 4.7), metalMat);
      fender.position.set(side * 1.55, 0.88, 0);
      hull.add(fender);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 4.2), bodyMat);
    base.position.y = 0.75;
    hull.add(base);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, 3.2), bodyMat);
    upper.position.set(0, 1.22, -0.1);
    hull.add(upper);
    const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.48, 1.4), bodyMat);
    glacis.position.set(0, 0.98, 2.0);
    glacis.rotation.x = -0.62;
    hull.add(glacis);
    const exhaust = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 0.6), metalMat);
    exhaust.position.set(0, 1.35, -1.95);
    hull.add(exhaust);
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.08), lampMat);
      lamp.position.set(side * 1.0, 0.92, 2.55);
      lamp.rotation.x = -0.6;
      hull.add(lamp);
    }
  } else if (hullId === 'mammoth') {
    // === МАМОНТ: Огромный, бронированный монолит ===
    const trW = 1.15, trH = 1.1, trL = 4.9;
    for (const side of [-1, 1]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(trW, trH, trL), trackMat);
      tr.position.set(side * 1.7, 0.55, 0);
      hull.add(tr);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 4.8), metalMat);
      skirt.position.set(side * 2.3, 0.7, 0);
      hull.add(skirt);
      const fender = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 5.0), bodyMat);
      fender.position.set(side * 1.7, 1.15, 0);
      hull.add(fender);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.92, 4.4), bodyMat);
    base.position.y = 1.15;
    hull.add(base);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.65, 3.4), bodyMat);
    upper.position.set(0, 1.88, -0.1);
    hull.add(upper);
    const plow = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.85, 0.6), metalMat);
    plow.position.set(0, 0.95, 2.35);
    plow.rotation.x = -0.2;
    hull.add(plow);
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lampMat);
      lamp.position.set(side * 1.1, 1.45, 2.35);
      hull.add(lamp);
    }
  } else {
    // === ХАНТЕР: Классический универсальный ===
    const trW = 0.85, trH = 0.95, trL = 4.6;
    for (const side of [-1, 1]) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(trW, trH, trL), trackMat);
      tr.position.set(side * 1.4, 0.48, 0);
      hull.add(tr);
      const fender = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 4.7), metalMat);
      fender.position.set(side * 1.4, 1.0, 0);
      hull.add(fender);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.75, 4.0), bodyMat);
    base.position.y = 0.95;
    hull.add(base);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 3.0), bodyMat);
    upper.position.set(0, 1.55, -0.15);
    hull.add(upper);
    const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.6, 1.1), bodyMat);
    glacis.position.set(0, 1.25, 1.95);
    glacis.rotation.x = -0.5;
    hull.add(glacis);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 0.7), metalMat);
    rear.position.set(0, 1.75, -1.85);
    hull.add(rear);
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.08), lampMat);
      lamp.position.set(side * 0.8, 1.15, 2.48);
      lamp.rotation.x = -0.5;
      hull.add(lamp);
    }
  }

  // --- БАШНЯ ---
  const turret = new THREE.Group();
  const turretY = hullId === 'viking' ? 1.5 : hullId === 'mammoth' ? 2.3 : 1.9;
  turret.position.set(0, turretY, -0.1);
  hull.add(turret);

  const barrelGroup = new THREE.Group();
  const muzzle = new THREE.Object3D();
  let railGlowMat: THREE.MeshStandardMaterial | undefined;

  if (turretId === 'flamethrower') {
    // === ОГНЕМЁТ ===
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.55, 12), turretMat);
    tBase.position.y = 0.15;
    turret.add(tBase);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), turretMat);
    dome.position.set(0, 0.35, -0.1);
    turret.add(dome);
    const can1 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.0, 10), metalMat);
    can1.rotation.z = Math.PI / 2;
    can1.position.set(-0.55, 0.7, -0.95);
    turret.add(can1);
    const can2 = can1.clone();
    can2.position.set(0.55, 0.7, -0.95);
    turret.add(can2);

    barrelGroup.position.set(0, 0.4, 0.45);
    turret.add(barrelGroup);
    for (const side of [-0.22, 0.22]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.6, 10), metalMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(side, 0, 0.8);
      barrelGroup.add(pipe);
      const ringGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.15, 10),
        new THREE.MeshBasicMaterial({ color: 0xff6600 }),
      );
      ringGlow.rotation.x = Math.PI / 2;
      ringGlow.position.set(side, 0, 1.55);
      barrelGroup.add(ringGlow);
    }
    muzzle.position.z = 1.75;
    barrelGroup.add(muzzle);

  } else if (turretId === 'cannon') {
    // === ПУШКА «СМОКИ» ===
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.5, 10), turretMat);
    tBase.position.y = 0.12;
    turret.add(tBase);
    const tTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 2.1), turretMat);
    tTop.position.set(0, 0.6, -0.15);
    turret.add(tTop);
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.16, 10), metalMat);
    hatch.position.set(-0.35, 0.98, -0.5);
    turret.add(hatch);

    barrelGroup.position.set(0, 0.55, 0.5);
    turret.add(barrelGroup);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 2.1, 12), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 1.05;
    barrelGroup.add(barrel);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.7, 10), metalMat);
    sleeve.rotation.x = Math.PI / 2;
    sleeve.position.z = 0.35;
    barrelGroup.add(sleeve);
    muzzle.position.z = 2.15;
    barrelGroup.add(muzzle);

  } else {
    // === РЕЛЬСОТРОН ===
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.5, 10), turretMat);
    tBase.position.y = 0.12;
    turret.add(tBase);
    const tTop = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 2.0), turretMat);
    tTop.position.set(0, 0.55, -0.15);
    turret.add(tTop);
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.16, 10), metalMat);
    hatch.position.set(-0.3, 0.9, -0.5);
    turret.add(hatch);

    barrelGroup.position.set(0, 0.5, 0.55);
    turret.add(barrelGroup);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.9, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 1.45;
    barrelGroup.add(barrel);
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.55), metalMat);
    brake.position.z = 2.85;
    barrelGroup.add(brake);

    // Материал энергорельсов ствола с контролируемым emissiveIntensity
    railGlowMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: new THREE.Color(style.glow),
      emissiveIntensity: 0.15,
      roughness: 0.2,
      metalness: 0.8,
    });
    const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.5), railGlowMat);
    railGlow.position.set(0, 0.14, 1.3);
    barrelGroup.add(railGlow);
    muzzle.position.z = 3.2;
    barrelGroup.add(muzzle);
  }

  if (style.antenna) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.5, 6), metalMat);
    ant.position.set(0.72, 1.4, -0.7);
    turret.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), lampMat);
    tip.position.set(0.72, 2.15, -0.7);
    turret.add(tip);
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.5, 36),
    new THREE.MeshBasicMaterial({
      color: style.glow, transparent: true, opacity: 0.65,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  group.traverse((o) => {
    if (o instanceof THREE.Mesh && o !== ring) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return { group, hull, turret, barrelGroup, muzzle, ring, bodyMats, trackTex, railGlowMat };
}

export interface TankParams {
  maxHealth: number;
  speed: number;
  reverseSpeed: number;
  turnSpeed: number;
  turretSpeed: number;
  damage: number;
  shotCooldown: number;
  weaponType?: 'railgun' | 'flamethrower' | 'cannon';
  range?: number;
}

let nextTankId = 1;
const V = new THREE.Vector3();

export class TankEntity {
  id = nextTankId++;
  name: string;
  isPlayer: boolean;
  params: TankParams;
  visual: TankVisual;

  yaw = 0;
  turretYaw = 0;
  aimYaw = 0;
  speed = 0;
  throttle = 0;
  steer = 0;
  boosting = false;      // запрос ускорения от контроллера
  boostActive = false;   // фактически активно (учитывает энергию/газ)
  boostEnergy = 1;       // запас нитро 0..1
  knockback = new THREE.Vector3();

  timeSinceHit = 0;      // сек с последнего получения урона (для саморемонта)
  smokeAcc = 0;          // аккумулятор дыма повреждений
  dustAcc = 0;           // аккумулятор пыли из-под гусениц
  hullId?: HullId;       // для табло счёта
  turretId?: TurretId;   // для табло счёта

  radius = TANK.radius;
  health: number;
  alive = true;
  deathT = 0;

  fireTimer = 0;
  ammo = 0;
  magazine = 0;
  fullReloading = false;
  reloadTimer = 0;
  fullReloadTime = 2.3;

  hitFlash = 0;
  barrelKick = 0;
  lastAttackerId = -1;
  vel = new THREE.Vector3();

  constructor(name: string, isPlayer: boolean, params: TankParams, visual: TankVisual) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.params = params;
    this.visual = visual;
    this.health = params.maxHealth;
  }

  get position() { return this.visual.group.position; }
  get maxHealth() { return this.params.maxHealth; }

  muzzleWorld(out: THREE.Vector3): THREE.Vector3 {
    return this.visual.muzzle.getWorldPosition(out);
  }

  aimDir(out: THREE.Vector3): THREE.Vector3 {
    out.set(Math.sin(this.aimYaw), 0, Math.cos(this.aimYaw));
    return out;
  }

  canFire(): boolean {
    if (!this.alive || this.fireTimer > 0) return false;
    if (this.isPlayer) return this.ammo > 0 && !this.fullReloading;
    return true;
  }

  onFired(recoil: number) {
    this.fireTimer = this.params.shotCooldown;
    this.barrelKick = 1;
    this.aimDir(V);
    this.knockback.addScaledVector(V, -recoil);
    if (this.isPlayer) this.ammo = Math.max(0, this.ammo - 1);
  }

  startFullReload() {
    if (this.fullReloading || !this.alive) return;
    this.fullReloading = true;
    this.reloadTimer = this.fullReloadTime;
  }

  takeDamage(dmg: number, attackerId: number) {
    if (!this.alive) return;
    this.health -= dmg;
    this.hitFlash = 1;
    this.lastAttackerId = attackerId;
    this.timeSinceHit = 0;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.deathT = 0;
      this.throttle = 0;
      this.steer = 0;
    }
  }

  update(dt: number) {
    const p = this.params;

    if (!this.alive) {
      this.boostActive = false;
      this.deathT += dt;
      this.visual.barrelGroup.rotation.x = THREE.MathUtils.damp(
        this.visual.barrelGroup.rotation.x, 0.3, 4, dt,
      );
      this.visual.turret.rotation.y += dt * 0.15;
      const k = clamp(1 - this.deathT * 0.5, 0.15, 1);
      for (const m of this.visual.bodyMats) {
        m.color.setScalar(k);
        m.emissive.setScalar(0);
      }
      this.visual.ring.visible = false;
      return;
    }

    const wantBoost = this.boosting && this.boostEnergy > BOOST.minActivate && this.throttle > 0.15;
    this.boostActive = wantBoost;

    // Саморемонт вне боя (как в game1)
    this.timeSinceHit += dt;
    if (this.timeSinceHit > 5 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + 7 * dt);
    }
    this.boostEnergy = clamp(
      this.boostEnergy + (wantBoost ? -BOOST.drainPerSec : BOOST.rechargePerSec) * dt,
      0, 1,
    );

    const maxFwd = p.speed * (wantBoost ? BOOST.multiplier : 1);
    const targetSpeed = this.throttle >= 0
      ? this.throttle * maxFwd
      : this.throttle * p.reverseSpeed;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, wantBoost ? 6 : 4.5, dt);

    const agility = 0.55 + 0.45 * Math.min(Math.abs(this.speed) / p.speed, 1);
    this.yaw += this.steer * p.turnSpeed * agility * dt;

    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const px = this.position.x;
    const pz = this.position.z;
    this.position.x += (fx * this.speed + this.knockback.x) * dt;
    this.position.z += (fz * this.speed + this.knockback.z) * dt;
    this.knockback.multiplyScalar(Math.exp(-5.5 * dt));
    this.vel.set((this.position.x - px) / dt, 0, (this.position.z - pz) / dt);

    this.fireTimer = Math.max(0, this.fireTimer - dt);

    if (this.isPlayer) {
      if (this.fullReloading) {
        this.reloadTimer -= dt;
        if (this.reloadTimer <= 0) {
          this.fullReloading = false;
          this.ammo = this.magazine;
        }
      } else if (this.ammo === 0) {
        this.startFullReload();
      }
    }

    const rel = wrapAngle(this.aimYaw - this.yaw);
    const diff = wrapAngle(rel - this.turretYaw);
    const maxStep = p.turretSpeed * dt;
    this.turretYaw += clamp(diff, -maxStep, maxStep);

    this.visual.hull.rotation.y = this.yaw;
    this.visual.turret.rotation.y = this.turretYaw;
    this.barrelKick = THREE.MathUtils.damp(this.barrelKick, 0, 9, dt);
    this.visual.barrelGroup.position.z = 0.55 - this.barrelKick * 0.4;

    this.visual.trackTex.offset.y -= this.speed * dt * 0.22;

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 6);
      for (const m of this.visual.bodyMats) m.emissive.setScalar(this.hitFlash * 0.85);
    }

    const ringMat = this.visual.ring.material as THREE.MeshBasicMaterial;
    ringMat.opacity = 0.45 + Math.sin(performance.now() * 0.004 + this.id) * 0.18;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.visual.group);
    this.visual.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
  }
}
