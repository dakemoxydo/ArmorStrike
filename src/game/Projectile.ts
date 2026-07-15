// ===== Снаряды: рельсотрон (точный луч), огнемёт (огненная струя), пушка (осколочно-фугасный снаряд) =====
import * as THREE from 'three';
import { COLORS, PROJECTILE } from './constants';
import type { Collider } from './physics';
import { pointInCollider, segmentHitsCircle } from './physics';
import type { Arena } from './Arena';
import type { TankEntity } from './Tank';
import type { Effects } from './effects';
import { glowTexture } from './textures';

export interface HitContext {
  colliders: Collider[];
  tanks: TankEntity[];
  arena: Arena;
  effects: Effects;
  onTankHit: (target: TankEntity, dmg: number, owner: TankEntity) => void;
  onBlockDestroyed: (pos: THREE.Vector3, size: number) => void;
}

export type WeaponType = 'railgun' | 'flamethrower' | 'cannon';

interface Shot {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  glow: THREE.Sprite;
  mat: THREE.MeshStandardMaterial;
  glowMat: THREE.SpriteMaterial;
  dir: THREE.Vector3;
  alive: boolean;
  traveled: number;
  maxRange: number;
  speed: number;
  weaponType: WeaponType;
  owner: TankEntity | null;
  damage: number;
  trailT: number;
  color: THREE.Color;
  splashRadius: number;   // радиус поражения для пушки
  splashDmg: number;      // урон по площади
}

const POOL_SIZE = 42;
const tmp = new THREE.Vector3();

export class ProjectileManager {
  private shots: Shot[] = [];

  constructor(scene: THREE.Scene) {
    const capGeo = new THREE.CapsuleGeometry(PROJECTILE.radius, 1.15, 4, 10);
    capGeo.rotateX(Math.PI / 2);
    const gTex = glowTexture();

    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.5,
        roughness: 0.3, metalness: 0,
      });
      const coreMesh = new THREE.Mesh(capGeo, mat);
      const glowMat = new THREE.SpriteMaterial({
        map: gTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.85,
      });
      const glow = new THREE.Sprite(glowMat);
      glow.scale.setScalar(1.7);
      const group = new THREE.Group();
      group.add(coreMesh);
      group.add(glow);
      group.visible = false;
      scene.add(group);

      this.shots.push({
        group, coreMesh, glow, mat, glowMat,
        dir: new THREE.Vector3(), alive: false, traveled: 0,
        maxRange: PROJECTILE.range, speed: PROJECTILE.speed,
        weaponType: 'railgun', owner: null, damage: 0, trailT: 0,
        color: new THREE.Color(), splashRadius: 0, splashDmg: 0,
      });
    }
  }

  fire(
    owner: TankEntity, origin: THREE.Vector3, dir: THREE.Vector3,
    damage: number, weaponType: WeaponType = 'railgun', customRange?: number,
  ) {
    const s = this.shots.find((x) => !x.alive);
    if (!s) return;
    s.alive = true;
    s.owner = owner;
    s.damage = damage;
    s.traveled = 0;
    s.weaponType = weaponType;
    s.dir.copy(dir).normalize();

    if (weaponType === 'flamethrower') {
      // Огнемёт: конус пламени с разбросом
      s.dir.x += (Math.random() - 0.5) * 0.13;
      s.dir.z += (Math.random() - 0.5) * 0.13;
      s.dir.y += (Math.random() - 0.5) * 0.04; // небольшой вертикальный разброс
      s.dir.normalize();
      s.speed = 30;
      s.maxRange = customRange ?? 22;
      s.color.setHex(0xff5500);
      s.glow.scale.setScalar(3.0);
      s.coreMesh.scale.set(2.0, 2.0, 1.2);
      s.splashRadius = 0;
      s.splashDmg = 0;
    } else if (weaponType === 'cannon') {
      // Пушка: тяжёлый снаряд с осколочно-фугасным действием
      s.speed = 48;
      s.maxRange = customRange ?? 75;
      s.color.setHex(0xffb020);
      s.glow.scale.setScalar(2.2);
      s.coreMesh.scale.set(1.3, 1.3, 1.4);
      s.splashRadius = 5.0;   // радиус взрыва 5 м
      s.splashDmg = Math.round(damage * 0.5); // половина урона по площади
    } else {
      // Рельсотрон: точный энергетический луч
      s.speed = 72;
      s.maxRange = customRange ?? 85;
      s.color.setHex(owner.isPlayer ? COLORS.player : 0xff3366);
      s.glow.scale.setScalar(1.7);
      s.coreMesh.scale.set(0.8, 0.8, 1.8);
      s.splashRadius = 0;
      s.splashDmg = 0;
    }

    s.group.position.copy(origin).addScaledVector(s.dir, 0.5);
    s.group.lookAt(tmp.copy(s.group.position).add(s.dir));
    s.mat.emissive.copy(s.color);
    s.mat.color.copy(s.color);
    s.glowMat.color.copy(s.color);
    s.group.visible = true;
  }

  update(dt: number, ctx: HitContext) {
    for (const s of this.shots) {
      if (!s.alive) continue;

      const speed = s.speed * dt;
      const steps = Math.max(1, Math.ceil(speed / 0.6));
      const stepLen = speed / steps;
      const pos = s.group.position;
      let dead = false;

      // Огнемёт: струя расширяется по мере удаления
      if (s.weaponType === 'flamethrower') {
        const growth = 1.0 + (s.traveled / s.maxRange) * 2.5;
        s.glow.scale.setScalar(2.8 * growth);
        s.glowMat.opacity = 0.75 * (1 - s.traveled / s.maxRange);
      }

      for (let i = 0; i < steps && !dead; i++) {
        const px = pos.x;
        const pz = pos.z;
        pos.addScaledVector(s.dir, stepLen);
        s.traveled += stepLen;

        // --- столкновение с препятствиями ---
        for (const c of ctx.colliders) {
          if (!c.active || !c.blocksShots) continue;
          if (!pointInCollider(pos.x, pos.z, c, PROJECTILE.radius)) continue;
          if (pos.y > c.height + PROJECTILE.radius) continue;

          const hitPos = tmp.set(px, pos.y, pz).clone();

          if (s.weaponType === 'flamethrower') {
            // Огонь: дым и искры при столкновении со стеной
            ctx.effects.spawnSmoke(hitPos, 3, 1.5, true);
            ctx.effects.impact(hitPos, 0xff6600);
          } else if (s.weaponType === 'cannon') {
            // Пушка: взрыв при столкновении со стеной
            ctx.effects.explosion(hitPos, 0xffb020, 1.2);
            ctx.effects.impact(hitPos, 0xffcc44);
            // Осколочно-фугасный урон по площади
            this.doSplash(hitPos, ctx, s);
          } else {
            // Рельсотрон: яркая вспышка
            ctx.effects.impact(hitPos, s.color.getHex());
          }

          if (c.destructible) {
            const res = ctx.arena.damageBlock(c.id, s.damage);
            if (res === 'destroyed') {
              hitPos.y = Math.min(c.height * 0.5, 2);
              ctx.onBlockDestroyed(hitPos, 1.4);
            }
          }
          this.despawn(s);
          dead = true;
          break;
        }
        if (dead) break;

        // --- попадание в танк ---
        for (const t of ctx.tanks) {
          if (!t.alive || t === s.owner) continue;
          if (!segmentHitsCircle(px, pz, pos.x, pos.z, t.position.x, t.position.z, t.radius + PROJECTILE.radius)) continue;

          const hitPos = tmp.set(pos.x, 1.6, pos.z).clone();

          if (s.weaponType === 'flamethrower') {
            // Огонь: поджог, лёгкий импульс
            ctx.effects.spawnSmoke(hitPos, 2, 0.8, false);
            ctx.effects.impact(hitPos, 0xff5500);
            t.knockback.addScaledVector(s.dir, 0.5);
          } else if (s.weaponType === 'cannon') {
            // Пушка: мощный взрыв + отбрасывание
            ctx.effects.explosion(hitPos, 0xffb020, 1.3);
            ctx.effects.impact(hitPos, 0xffcc44);
            t.knockback.addScaledVector(s.dir, 4.0);
          } else {
            // Рельсотрон: пробитие + отброс
            ctx.effects.impact(hitPos, 0x8fffe8);
            t.knockback.addScaledVector(s.dir, 2.8);
          }

          ctx.onTankHit(t, s.damage, s.owner!);
          // Осколочный урон по соседним (исключая прямое попадание)
          if (s.weaponType === 'cannon') this.doSplash(hitPos, ctx, s, t);
          this.despawn(s);
          dead = true;
          break;
        }
        if (dead) break;

        // --- предел дальности ---
        if (s.traveled >= s.maxRange) {
          if (s.weaponType === 'flamethrower') {
            ctx.effects.spawnSmoke(pos, 1, 0.7, false);
          } else if (s.weaponType === 'cannon') {
            // Пушка: взрыв в воздухе при максимальной дальности
            ctx.effects.explosion(pos, 0xffb020, 0.8);
            this.doSplash(pos, ctx, s);
          } else {
            ctx.effects.trailPuff(pos, s.color);
          }
          this.despawn(s);
          dead = true;
        }
      }

      // --- светящийся след ---
      if (!dead) {
        s.trailT -= dt;
        if (s.trailT <= 0) {
          if (s.weaponType === 'flamethrower') {
            // Огнемёт: густой огненный след
            ctx.effects.trailPuff(pos, new THREE.Color(0xff6600));
            s.trailT = 0.03;
          } else if (s.weaponType === 'cannon') {
            ctx.effects.trailPuff(pos, s.color);
            s.trailT = 0.04;
          } else {
            // Рельсотрон: тонкий энергетический след
            ctx.effects.trailPuff(pos, s.color);
            s.trailT = 0.025;
          }
        }
      }
    }
  }

  /** Осколочно-фугасный урон по площади (только для пушки) */
  private doSplash(hitPos: THREE.Vector3, ctx: HitContext, s: Shot, exclude?: TankEntity) {
    if (s.splashRadius <= 0 || !s.owner) return;
    for (const t of ctx.tanks) {
      if (!t.alive || t === s.owner || t === exclude) continue;
      const dx = t.position.x - hitPos.x;
      const dz = t.position.z - hitPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > s.splashRadius) continue;
      // Урон падает с расстоянием
      const falloff = 1 - dist / s.splashRadius;
      const dmg = Math.round(s.splashDmg * falloff);
      if (dmg > 0) {
        ctx.onTankHit(t, dmg, s.owner);
        // Отбрасывание от эпицентра взрыва
        if (dist > 0.1) {
          const push = 2.5 * falloff;
          t.knockback.x += (dx / dist) * push;
          t.knockback.z += (dz / dist) * push;
        }
      }
    }
  }

  private despawn(s: Shot) {
    s.alive = false;
    s.owner = null;
    s.group.visible = false;
  }

  clear() {
    for (const s of this.shots) this.despawn(s);
  }
}
