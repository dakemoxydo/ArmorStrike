// ===== Территория завода 150×150: литейка, баки, контейнерный двор, трубопроводы, козловой кран =====
import * as THREE from 'three';
import { ARENA } from './constants';
import type { Collider } from './physics';
import { colliderFromCenter } from './physics';
import {
  factoryGroundTexture, signTexture, smokeTexture, structureTexture, wallTexture,
} from './textures';
import type { ArenaBuildContext } from './arena/context';
import { buildAtmosphere } from './arena/atmosphere';
import { buildCentralHall } from './arena/centralHall';
import { buildContainerYard } from './arena/containerYard';
import { buildFoundry } from './arena/foundry';
import { buildGantryCrane } from './arena/gantryCrane';
import { buildPipeRack } from './arena/pipeRack';
import { buildRamps } from './arena/ramps';
import { buildScattered } from './arena/scattered';
import { buildSilos } from './arena/silos';
import { buildSkyline } from './arena/skyline';
import { buildSmokestacks } from './arena/smokestacks';
import { buildTransformers } from './arena/transformers';

export interface BlockInfo {
  id: number;
  group: THREE.Group;
  collider: Collider;
  hp: number;
  maxHp: number;
  mats: THREE.MeshStandardMaterial[];
  flash: number;
  size: number;
}

interface SmokeSprite { s: THREE.Sprite; life: number; maxLife: number; vx: number }

export class Arena {
  group = new THREE.Group();
  colliders: Collider[] = [];
  blocks = new Map<number, BlockInfo>();
  half = ARENA.size / 2;

  private dome: THREE.Mesh | null = null;
  private dust: THREE.Points | null = null;
  private obeliskCore: THREE.Mesh | null = null;
  private obeliskRing: THREE.Mesh | null = null;
  private craneTrolley: THREE.Group | null = null;
  private furnaceGlowMats: THREE.MeshStandardMaterial[] = [];
  private moltenMats: THREE.MeshBasicMaterial[] = [];
  private beaconMats: THREE.MeshBasicMaterial[] = [];
  private smokeEmitters: THREE.Vector3[] = [];
  private smokePool: SmokeSprite[] = [];
  private smokeT = 0;
  private smokeTex: THREE.Texture;

  constructor(scene: THREE.Scene) {
    this.smokeTex = smokeTexture();
    this.build();
    scene.add(this.group);
  }

  // ----------------------------------------------------
  private addColliderBlock(
    x: number, z: number, w: number, d: number, h: number,
    destructible: boolean,
    buildMesh: () => THREE.Object3D,
    hp = 100,
    kind: 'block' | 'wall' = 'block',
    blocksSight = true,
  ) {
    const meshWrap = new THREE.Group();
    meshWrap.position.set(x, 0, z);
    meshWrap.add(buildMesh());
    this.group.add(meshWrap);
    const col = colliderFromCenter(x, z, w, d, h, kind, { destructible, blocksSight });
    this.colliders.push(col);
    if (destructible) {
      const mats: THREE.MeshStandardMaterial[] = [];
      meshWrap.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) if (m instanceof THREE.MeshStandardMaterial) mats.push(m);
        }
      });
      this.blocks.set(col.id, {
        id: col.id, group: meshWrap, collider: col,
        hp, maxHp: hp, mats, flash: 0, size: Math.max(w, d),
      });
    }
    return col;
  }

  private box(w: number, h: number, d: number, mat: THREE.Material, cy?: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = cy ?? h / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // ----------------------------------------------------
  private build() {
    const H = this.half;
    const ctx = this.makeContext();

    const structMat = new THREE.MeshStandardMaterial({
      map: structureTexture(), roughness: 0.55, metalness: 0.5, color: 0xb9c6d6,
    });

    // ===== Внешняя пустота завода =====
    const voidMat = new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 1 });
    const voidPlane = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), voidMat);
    voidPlane.rotation.x = -Math.PI / 2;
    voidPlane.position.y = -0.08;
    voidPlane.receiveShadow = true;
    this.group.add(voidPlane);

    // ===== Карта пола завода =====
    const groundMat = new THREE.MeshStandardMaterial({
      map: factoryGroundTexture(ARENA.size), roughness: 0.88, metalness: 0.2,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.size, ARENA.size), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // ===== Силуэты района за стенами =====
    buildSkyline(ctx);

    // ===== Стены ангара =====
    const wMat = new THREE.MeshStandardMaterial({
      map: wallTexture(), roughness: 0.6, metalness: 0.4, color: 0xbfd2e6,
    });
    const L = ARENA.size + ARENA.wallT * 2;
    const wallDefs: [number, number, number, number][] = [
      [0, -(H + ARENA.wallT / 2), L, ARENA.wallT],
      [0, H + ARENA.wallT / 2, L, ARENA.wallT],
      [-(H + ARENA.wallT / 2), 0, ARENA.wallT, L],
      [H + ARENA.wallT / 2, 0, ARENA.wallT, L],
    ];
    for (const [x, z, w, d] of wallDefs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, ARENA.wallH, d), wMat);
      m.position.set(x, ARENA.wallH / 2, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
      this.colliders.push(colliderFromCenter(x, z, w, d, ARENA.wallH, 'wall'));
    }

    // пилястры вдоль стен + натриевые лампы
    const pilMat = new THREE.MeshStandardMaterial({ color: 0x222d3d, roughness: 0.6, metalness: 0.5 });
    const lampMatWarm = new THREE.MeshBasicMaterial({ color: 0xffb84d });
    for (let i = -2; i <= 2; i++) {
      const p = i * 26;
      for (const side of [-1, 1]) {
        this.addColliderBlock(p, side * (H - 0.6), 1.6, 1.6, ARENA.wallH + 1, false,
          () => this.box(1.6, ARENA.wallH + 1, 1.6, pilMat.clone()), 0, 'wall');
        this.addColliderBlock(side * (H - 0.6), p, 1.6, 1.6, ARENA.wallH + 1, false,
          () => this.box(1.6, ARENA.wallH + 1, 1.6, pilMat.clone()), 0, 'wall');
      }
    }
    for (let i = -3; i <= 3; i++) {
      const p = i * 18;
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 1.6), lampMatWarm);
      lamp.position.set(p, ARENA.wallH - 1.2, -(H - 1.2));
      this.group.add(lamp);
      const lamp2 = lamp.clone();
      lamp2.position.set(p, ARENA.wallH - 1.2, H - 1.2);
      this.group.add(lamp2);
    }

    // верхняя световая полоса
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x2ee6c0, transparent: true, opacity: 0.75 });
    for (const [x, z, w, d] of wallDefs) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.995, 0.16, Math.max(d * 0.35, 0.45)), stripMat);
      s.position.set(x, ARENA.wallH + 0.14, z);
      this.group.add(s);
    }

    // ===== Вывески завода =====
    const signMat = new THREE.MeshStandardMaterial({
      map: signTexture('ЗАВОД-51', 'ЛИТЕЙНЫЙ КОМПЛЕКС «ARMORSTRIKE»'),
      emissive: 0x22333a, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.2,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(44, 11), signMat);
    sign.position.set(0, ARENA.wallH + 3.5, -(H + ARENA.wallT - 0.2));
    this.group.add(sign);
    const sign2Mat = new THREE.MeshStandardMaterial({
      map: signTexture('ЦЕХ №7', 'МЕХАНИЧЕСКАЯ СБОРКА'),
      emissive: 0x22333a, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.2,
    });
    const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(32, 8), sign2Mat);
    sign2.position.set(-(H + ARENA.wallT - 0.2), ARENA.wallH + 3, 0);
    sign2.rotation.y = Math.PI / 2;
    this.group.add(sign2);

    // ===== Угловые дымовые трубы =====
    buildSmokestacks(ctx, structMat);

    // ===== Центральный машинный зал =====
    buildCentralHall(ctx, structMat);

    // ===== Козловой кран =====
    buildGantryCrane(ctx);

    // ===== Литейный цех (север) =====
    buildFoundry(ctx, structMat);

    // ===== Резервуарная группа (юг) =====
    buildSilos(ctx);

    // ===== Контейнерный двор (запад) =====
    buildContainerYard(ctx);

    // ===== Трубопроводная эстакада (восток) =====
    buildPipeRack(ctx);

    // ===== Трансформаторные блоки (диагонали) =====
    buildTransformers(ctx);

    // ===== Рампы =====
    buildRamps(ctx);

    // ===== Рассеянный груз: ящики и бочки =====
    buildScattered(ctx);

    // ===== Энергокупол, голографический обелиск, пыль =====
    buildAtmosphere(ctx);
  }

  private makeContext(): ArenaBuildContext {
    return {
      group: this.group,
      half: this.half,
      colliders: this.colliders,
      blocks: this.blocks,
      beaconMats: this.beaconMats,
      smokeEmitters: this.smokeEmitters,
      furnaceGlowMats: this.furnaceGlowMats,
      moltenMats: this.moltenMats,
      box: (w, h, d, mat, cy) => this.box(w, h, d, mat, cy),
      addColliderBlock: (x, z, w, d, h, destructible, buildMesh, hp, kind, blocksSight) =>
        this.addColliderBlock(x, z, w, d, h, destructible, buildMesh, hp, kind, blocksSight),
      setObelisk: (core, ring) => { this.obeliskCore = core; this.obeliskRing = ring; },
      setCraneTrolley: (trolley) => { this.craneTrolley = trolley; },
      setDome: (dome) => { this.dome = dome; },
      setDust: (dust) => { this.dust = dust; },
    };
  }

  // ----------------------------------------------------
  private spawnStackSmoke(p: THREE.Vector3) {
    let slot = this.smokePool.find((s) => s.life <= 0);
    if (!slot) {
      const mat = new THREE.SpriteMaterial({
        map: this.smokeTex, transparent: true, depthWrite: false,
        color: 0x8a929c, opacity: 0.3,
      });
      const s = new THREE.Sprite(mat);
      this.group.add(s);
      slot = { s, life: 0, maxLife: 1, vx: 0 };
      this.smokePool.push(slot);
      if (this.smokePool.length > 44) {
        const old = this.smokePool.shift()!;
        this.group.remove(old.s);
      }
    }
    slot.life = slot.maxLife = 3.2 + Math.random() * 1.6;
    slot.vx = (Math.random() - 0.5) * 0.6;
    slot.s.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8));
    slot.s.scale.setScalar(2 + Math.random() * 1.5);
    (slot.s.material as THREE.SpriteMaterial).rotation = Math.random() * Math.PI * 2;
  }

  /** Урон блоку */
  damageBlock(id: number, dmg: number): 'destroyed' | 'hit' | null {
    const b = this.blocks.get(id);
    if (!b) return null;
    b.hp -= dmg;
    b.flash = 1;
    if (b.hp <= 0) {
      b.collider.active = false;
      this.group.remove(b.group);
      b.group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      this.blocks.delete(id);
      return 'destroyed';
    }
    return 'hit';
  }

  update(dt: number, elapsed: number) {
    if (this.dome) {
      this.dome.rotation.y = elapsed * 0.02;
      (this.dome.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(elapsed * 0.8) * 0.015;
    }
    if (this.obeliskCore) {
      this.obeliskCore.rotation.y = elapsed * 0.9;
      this.obeliskCore.rotation.x = elapsed * 0.4;
      this.obeliskCore.position.y = 12.6 + Math.sin(elapsed * 1.3) * 0.35;
    }
    if (this.obeliskRing) {
      this.obeliskRing.rotation.z = elapsed * 0.6;
      this.obeliskRing.position.y = 12.6 + Math.sin(elapsed * 1.3 + 1) * 0.35;
    }
    if (this.dust) this.dust.rotation.y = elapsed * 0.012;

    const blink = Math.sin(elapsed * 2.6) > 0 ? 0.9 : 0.18;
    for (const m of this.beaconMats) m.opacity = blink;

    const fc = 0.85 + Math.sin(elapsed * 3.1) * 0.28;
    for (const m of this.furnaceGlowMats) m.emissiveIntensity = fc;
    const mp = 0.5 + Math.sin(elapsed * 2.7) * 0.16;
    for (const m of this.moltenMats) m.opacity = mp;

    if (this.craneTrolley) {
      this.craneTrolley.position.x = Math.sin(elapsed * 0.14) * 13;
      this.craneTrolley.rotation.z = Math.sin(elapsed * 0.6) * 0.008;
    }

    this.smokeT -= dt;
    if (this.smokeT <= 0 && this.smokeEmitters.length > 0) {
      this.smokeT = 0.13;
      const e = this.smokeEmitters[Math.floor(Math.random() * this.smokeEmitters.length)];
      this.spawnStackSmoke(e);
    }
    for (const s of this.smokePool) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const m = s.s.material as THREE.SpriteMaterial;
      const k = Math.max(0, s.life / s.maxLife);
      m.opacity = 0.26 * Math.min(1, k * 2);
      s.s.position.y += dt * 2.3;
      s.s.position.x += s.vx * dt;
      s.s.scale.setScalar(s.s.scale.x + dt * 2.6);
      m.rotation += dt * 0.3;
      if (s.life <= 0) m.opacity = 0;
    }

    for (const b of this.blocks.values()) {
      if (b.flash > 0) {
        b.flash = Math.max(0, b.flash - dt * 5);
        for (const m of b.mats) m.emissive.setScalar(b.flash * 0.9);
        if (b.hp < b.maxHp * 0.4) {
          b.group.rotation.z = Math.sin(elapsed * 30) * 0.004 * b.flash;
        }
      }
    }
  }
}
