// ===== Территория завода 150×150: литейка, баки, контейнерный двор, трубопроводы, козловой кран =====
import * as THREE from 'three';
import { ARENA } from './constants';
import type { Collider } from './physics';
import { colliderFromCenter } from './physics';
import {
  barrelTexture, containerTexture, crateTexture, factoryGroundTexture,
  hexTexture, signTexture, smokeTexture, structureTexture, wallTexture,
} from './textures';

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
    this.buildSkyline();

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
        // север/юг
        this.addColliderBlock(p, side * (H - 0.6), 1.6, 1.6, ARENA.wallH + 1, false,
          () => this.box(1.6, ARENA.wallH + 1, 1.6, pilMat.clone()), 0, 'wall');
        // восток/запад
        this.addColliderBlock(side * (H - 0.6), p, 1.6, 1.6, ARENA.wallH + 1, false,
          () => this.box(1.6, ARENA.wallH + 1, 1.6, pilMat.clone()), 0, 'wall');
      }
    }
    // тёплые лампы на стенах
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
    this.buildSmokestacks(structMat);

    // ===== Центральный машинный зал =====
    this.buildCentralHall(structMat);

    // ===== Козловой кран =====
    this.buildGantryCrane();

    // ===== Литейный цех (север) =====
    this.buildFoundry(structMat);

    // ===== Резервуарная группа (юг) =====
    this.buildSilos();

    // ===== Контейнерный двор (запад) =====
    this.buildContainerYard();

    // ===== Трубопроводная эстакада (восток) =====
    this.buildPipeRack();

    // ===== Трансформаторные блоки (диагонали) =====
    this.buildTransformers();

    // ===== Рампы =====
    this.buildRamps();

    // ===== Рассеянный груз: ящики и бочки =====
    this.buildScattered();

    // ===== Энергокупол, голографический обелиск, пыль =====
    this.buildAtmosphere();
  }

  // ----------------------------------------------------
  private buildSkyline() {
    const dark = new THREE.MeshStandardMaterial({ color: 0x0a0f16, roughness: 1, emissive: 0x0c141f, emissiveIntensity: 0.35 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffa64d });
    const rng = (a: number, b: number) => a + Math.random() * (b - a);
    // кольцо далеких цехов
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2 + rng(-0.06, 0.06);
      const r = rng(105, 150);
      const w = rng(10, 26), h = rng(8, 34);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), dark);
      m.position.set(Math.cos(ang) * r, h / 2 - 0.5, Math.sin(ang) * r);
      m.rotation.y = rng(0, Math.PI);
      this.group.add(m);
      // редкие светящиеся окна
      if (Math.random() > 0.4) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.5, h * 0.12), winMat);
        win.position.set(m.position.x, h * rng(0.3, 0.7), m.position.z);
        win.lookAt(0, win.position.y, 0);
        this.group.add(win);
      }
      // отдельные трубы
      if (i % 5 === 0) {
        const th = rng(26, 44);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, th, 8), dark);
        st.position.set(m.position.x + rng(-10, 10), th / 2, m.position.z + rng(-10, 10));
        this.group.add(st);
        this.smokeEmitters.push(new THREE.Vector3(st.position.x, th + 1, st.position.z));
      }
    }
    // газгольдер
    const gz = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 14), dark);
    gz.position.set(-120, 10, -95);
    this.group.add(gz);
  }

  // ----------------------------------------------------
  private buildSmokestacks(structMat: THREE.Material) {
    const H = this.half;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = sx * (H - 4), z = sz * (H - 4);
        const stack = new THREE.Group();
        stack.position.set(x, 0, z);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.4, 16, 12), structMat.clone());
        body.position.y = 8;
        body.castShadow = true; body.receiveShadow = true;
        stack.add(body);
        const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0x303b49, roughness: 0.5, metalness: 0.6 }));
        ring1.position.y = 6; stack.add(ring1);
        const ring2 = ring1.clone(); ring2.position.y = 11; stack.add(ring2);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.3, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x3a4655, roughness: 0.4, metalness: 0.7 }));
        cap.position.y = 16.4; stack.add(cap);
        // красный авиационный огонь
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
        beacon.position.y = 17.6;
        stack.add(beacon);
        this.beaconMats.push(beacon.material as THREE.MeshBasicMaterial);
        this.group.add(stack);
        this.colliders.push(colliderFromCenter(x, z, 5.6, 5.6, 16, 'wall'));
        this.smokeEmitters.push(new THREE.Vector3(x, 17.2, z));
      }
    }
  }

  // ----------------------------------------------------
  private buildCentralHall(structMat: THREE.Material) {
    // главный корпус
    this.addColliderBlock(0, 0, 16, 10, 9.4, false, () => {
      const g = new THREE.Group();
      const bodyMat = structMat.clone();
      g.add(this.box(16, 9.4, 10, bodyMat));
      // крышные вентиляторы
      for (const vx of [-4.5, 0.5, 5]) {
        const vent = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 10),
          new THREE.MeshStandardMaterial({ color: 0x2f3a48, roughness: 0.4, metalness: 0.7 }));
        vent.position.set(vx, 10.1, -1.5);
        vent.castShadow = true;
        g.add(vent);
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.15, 6),
          new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.8 }));
        fan.position.set(vx, 10.95, -1.5);
        g.add(fan);
      }
      // фронтальный сервисный люк (лёгкий циановый свет)
      const doorGlow = new THREE.Mesh(new THREE.BoxGeometry(5, 4.4, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x175d52 }));
      doorGlow.position.set(0, 2.4, 5.1);
      g.add(doorGlow);
      return g;
    }, 0, 'wall');

    // пристройка-аннекс
    this.addColliderBlock(0, -9.5, 8, 5, 5, false, () => {
      const g = new THREE.Group();
      g.add(this.box(8, 5, 5, structMat.clone()));
      const win = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.4, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x1a6f62 }));
      win.position.set(0, 3.4, -2.55);
      g.add(win);
      return g;
    }, 0, 'wall');

    // пара дымоходов цеха
    for (const sx of [7.5, 10.5]) {
      this.addColliderBlock(sx, 8.5, 3.4, 3.4, 11, false, () => {
        const g = new THREE.Group();
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 11, 10), structMat.clone());
        cyl.position.y = 5.5; cyl.castShadow = true; cyl.receiveShadow = true;
        g.add(cyl);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 0.6, 10),
          new THREE.MeshStandardMaterial({ color: 0x3a4655, roughness: 0.4, metalness: 0.7 }));
        cap.position.y = 11.2;
        g.add(cap);
        this.smokeEmitters.push(new THREE.Vector3(sx, 11.6, 8.5));
        return g;
      }, 0, 'wall');
    }

    // голографическая вышка на крыше (обелиск)
    const holoMat = new THREE.MeshBasicMaterial({
      color: 0x2ee6c0, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.obeliskCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15), holoMat);
    this.obeliskCore.position.set(0, 12.6, 0);
    this.group.add(this.obeliskCore);
    this.obeliskRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.06, 8, 48), holoMat.clone());
    this.obeliskRing.position.set(0, 12.6, 0);
    this.obeliskRing.rotation.x = Math.PI / 2;
    this.group.add(this.obeliskRing);
  }

  // ----------------------------------------------------
  private buildGantryCrane() {
    const paintMat = new THREE.MeshStandardMaterial({ color: 0xc7851f, roughness: 0.5, metalness: 0.55 });
    const beamMat = new THREE.MeshStandardMaterial({ map: structureTexture(), color: 0xd9a533, roughness: 0.45, metalness: 0.6 });
    const legH = 13;

    // 4 опоры порталов
    for (const sx of [-20, 20]) {
      for (const sz of [-6, 6]) {
        this.addColliderBlock(sx, sz, 2.2, 2.2, legH, false,
          () => this.box(2.2, legH, 2.2, paintMat.clone()), 0, 'wall');
        // огонёк на опоре
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
        b.position.set(sx, legH + 0.7, sz);
        this.group.add(b);
        this.beaconMats.push(b.material as THREE.MeshBasicMaterial);
      }
      // портальная рама (балка поперёк z)
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 15.8), beamMat);
      cap.position.set(sx, legH - 0.2, 0);
      cap.castShadow = true;
      this.group.add(cap);
    }
    // главные балки вдоль x
    for (const sz of [-6, 6]) {
      const girder = new THREE.Mesh(new THREE.BoxGeometry(40, 1.4, 1.3), beamMat);
      girder.position.set(0, 12.6, sz);
      girder.castShadow = true;
      this.group.add(girder);
      // зигзаг-ферменные раскосы
      for (let i = -18; i < 18; i += 4) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 0.35), paintMat.clone());
        brace.position.set(i + 2, 12.6, sz);
        brace.rotation.z = (i % 8 === 2 ? 0.7 : -0.7);
        this.group.add(brace);
      }
    }
    // движущаяся тележка с крюком
    const trolley = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 14.2), paintMat.clone());
    frame.castShadow = true;
    trolley.add(frame);
    for (const sz of [-6, 6]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.9 }));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, -0.5, sz);
      trolley.add(wheel);
    }
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 4),
      new THREE.MeshBasicMaterial({ color: 0x0a0d12 }));
    cable.position.y = -2.4;
    trolley.add(cable);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x8a5a12, roughness: 0.5, metalness: 0.6 }));
    hook.position.y = -4.2;
    hook.castShadow = true;
    trolley.add(hook);
    trolley.position.set(0, 12.6, 0);
    this.group.add(trolley);
    this.craneTrolley = trolley;
  }

  // ----------------------------------------------------
  private buildFoundry(structMat: THREE.Material) {
    const glow = () => {
      const m = new THREE.MeshStandardMaterial({
        color: 0x2a1410, roughness: 0.6, metalness: 0.3,
        emissive: 0xff5a10, emissiveIntensity: 0.9,
      });
      this.furnaceGlowMats.push(m);
      return m;
    };

    // главная печь
    this.addColliderBlock(-8, -50, 9, 7, 7, false, () => {
      const g = new THREE.Group();
      g.add(this.box(9, 7, 7, structMat.clone()));
      // светящиеся решётки топки на лицевой стороне
      for (const wx of [-2.5, 0, 2.5]) {
        const grille = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.25), glow());
        grille.position.set(wx, 2.2, 3.6);
        g.add(grille);
      }
      // верхняя вытяжная труба
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 5, 10),
        structMat.clone());
      stack.position.set(0, 9, 0);
      stack.castShadow = true;
      g.add(stack);
      this.smokeEmitters.push(new THREE.Vector3(-8, 12, -50));
      // красный огонь-индикатор
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.9 }));
      b.position.set(-8 + 4.2, 7.5, -50 + 3.2);
      this.beaconMats.push(b.material as THREE.MeshBasicMaterial);
      this.group.add(b);
      return g;
    }, 0, 'wall');

    // вторая печь поменьше
    this.addColliderBlock(-19, -46, 6, 6, 5.5, false, () => {
      const g = new THREE.Group();
      g.add(this.box(6, 5.5, 6, structMat.clone()));
      const grille = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.25), glow());
      grille.position.set(0, 2, 3.1);
      g.add(grille);
      return g;
    }, 0, 'wall');

    // разливочный ковш
    this.addColliderBlock(1, -46, 4.5, 4.5, 4, false, () => {
      const g = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.7, 4, 12), structMat.clone());
      pot.position.y = 2; pot.castShadow = true; pot.receiveShadow = true;
      g.add(pot);
      const melt = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.3, 12), glow());
      melt.position.y = 4.1;
      g.add(melt);
      return g;
    }, 0, 'wall');

    // каналы расплава по полу (визуально)
    const moltenMat = () => {
      const m = new THREE.MeshBasicMaterial({
        color: 0xff6a10, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this.moltenMats.push(m);
      return m;
    };
    const ch1 = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 8), moltenMat());
    ch1.rotation.x = -Math.PI / 2;
    ch1.position.set(-8, 0.05, -41.5);
    this.group.add(ch1);
    const ch2 = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.1), moltenMat());
    ch2.rotation.x = -Math.PI / 2;
    ch2.position.set(-4.5, 0.06, -45.8);
    this.group.add(ch2);
    const ch3 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 5.5), moltenMat());
    ch3.rotation.x = -Math.PI / 2;
    ch3.position.set(-18.8, 0.05, -40.4);
    this.group.add(ch3);

    // тёплые источники света в литейке
    const l1 = new THREE.PointLight(0xff6a15, 320, 34, 1.9);
    l1.position.set(-8, 5, -47);
    this.group.add(l1);
    const l2 = new THREE.PointLight(0xff8a30, 160, 24, 1.9);
    l2.position.set(1, 3.5, -45);
    this.group.add(l2);
  }

  // ----------------------------------------------------
  private buildSilos() {
    const siloMat = new THREE.MeshStandardMaterial({ color: 0x49606e, map: structureTexture(), roughness: 0.45, metalness: 0.6 });
    const silos: [number, number][] = [[12, 47], [20, 50], [27, 46]];
    for (const [x, z] of silos) {
      this.addColliderBlock(x, z, 6, 6, 11, false, () => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.1, 11, 14), siloMat.clone());
        body.position.y = 5.5; body.castShadow = true; body.receiveShadow = true;
        g.add(body);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(2.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), siloMat.clone());
        dome.position.y = 11;
        dome.castShadow = true;
        g.add(dome);
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(3.02, 3.02, 0.6, 14),
          new THREE.MeshBasicMaterial({ color: 0xffb02e }));
        stripe.position.y = 7.4;
        g.add(stripe);
        const lampC = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x35d5ff, transparent: true, opacity: 0.85 }));
        lampC.position.y = 13.4;
        g.add(lampC);
        this.beaconMats.push(lampC.material as THREE.MeshBasicMaterial);
        return g;
      }, 0, 'wall');
    }
    // низкие грунтовые трубопроводы между баками (снаряды пролетают над)
    this.addColliderBlock(19.5, 42.5, 16, 1.8, 1.4, false, () => {
      const g = new THREE.Group();
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 16, 8), siloMat.clone());
      pipe.rotation.z = Math.PI / 2;
      pipe.position.y = 0.7; pipe.castShadow = true; pipe.receiveShadow = true;
      g.add(pipe);
      return g;
    }, 0, 'block', false);
    this.addColliderBlock(34.5, 26, 1.8, 20, 1.4, false, () => {
      const g = new THREE.Group();
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 20, 8), siloMat.clone());
      pipe.rotation.x = Math.PI / 2;
      pipe.position.y = 0.7; pipe.castShadow = true; pipe.receiveShadow = true;
      g.add(pipe);
      return g;
    }, 0, 'block', false);

    // прохладный акцент свет
    const lc = new THREE.PointLight(0x2fb8ff, 90, 26, 2);
    lc.position.set(20, 6, 47);
    this.group.add(lc);
  }

  // ----------------------------------------------------
  private buildContainerYard() {
    const defs: { c: string; d: string; label: string }[] = [
      { c: '#7a2d22', d: '#3a1610', label: 'ГРУЗ-51' },
      { c: '#1f4d6e', d: '#0d2231', label: 'СТАЛЬ' },
      { c: '#2e5c33', d: '#142a17', label: 'NEOS' },
      { c: '#8a6420', d: '#3d2c0c', label: 'ТРАНС-7' },
      { c: '#5a2a62', d: '#251030', label: 'ОПАСНО' },
      { c: '#274a58', d: '#101f26', label: 'TEST-6' },
    ];
    let cr = 0;

    // ряд А — прочные (неразрушаемые) контейнеры вдоль стены
    for (const z of [-26, -13, 0, 13, 26]) {
      const def = defs[(cr++) % defs.length];
      const mat = new THREE.MeshStandardMaterial({
        map: containerTexture(def.c, def.label, def.d), roughness: 0.5, metalness: 0.55,
      });
      this.addColliderBlock(-62, z, 4.2, 11, 3.2, false,
        () => this.box(4.2, 3.2, 11, mat), 0, 'block');
    }
    // ряд Б — разрушаемые контейнеры ближе к центру
    for (const z of [-19, -6, 7, 20]) {
      const def = defs[(cr++) % defs.length];
      const mat = new THREE.MeshStandardMaterial({
        map: containerTexture(def.c, def.label, def.d), roughness: 0.5, metalness: 0.55, emissive: 0x000000,
      });
      const edge = new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.5 });
      this.addColliderBlock(-52, z, 4.2, 11, 3.2, true, () => {
        const g = new THREE.Group();
        g.add(this.box(4.2, 3.2, 11, mat));
        const e = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.1, 11.05), edge);
        e.position.y = 3.16;
        g.add(e);
        return g;
      }, 130, 'block');
    }
    // два штабеля (двухъярусные)
    for (const z of [-32, 32]) {
      const def = defs[(cr++) % defs.length];
      const mat = new THREE.MeshStandardMaterial({
        map: containerTexture(def.c, def.label, def.d), roughness: 0.5, metalness: 0.55,
      });
      this.addColliderBlock(-57.5, z, 9, 4.5, 6.4, false, () => {
        const g = new THREE.Group();
        const low = this.box(9, 3.2, 4.4, mat); low.position.y = 1.6; g.add(low);
        const up = this.box(9, 3.2, 4.4, mat); up.position.y = 4.8; up.rotation.y = 0.08; g.add(up);
        return g;
      }, 0, 'block');
    }
  }

  // ----------------------------------------------------
  private buildPipeRack() {
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4a5d6e, map: structureTexture(), roughness: 0.4, metalness: 0.7 });
    const pylMat = new THREE.MeshStandardMaterial({ map: structureTexture(), color: 0xb9c6d6, roughness: 0.55, metalness: 0.5 });

    // опорные пилоны коридора
    for (const z of [-30, -18, -6, 6, 18, 30]) {
      this.addColliderBlock(46, z, 1.8, 1.8, 8, false, () => {
        const g = new THREE.Group();
        g.add(this.box(1.8, 8, 1.8, pylMat.clone()));
        // перемычка-рамка над
        const frame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.7, 1.2), pylMat.clone());
        frame.position.y = 7.6;
        g.add(frame);
        return g;
      }, 0, 'wall');
    }
    // три высокие трубы вдоль эстакады (снаряды и танки проходят под ними)
    for (const [y, col] of [[6.1, 0x4a5d6e], [7.0, 0x5d4a3e], [7.9, 0x3e5d4a]] as const) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 72, 10),
        new THREE.MeshStandardMaterial({ color: col, map: structureTexture(), roughness: 0.4, metalness: 0.7 }));
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(46 + (y - 7) * 1.4, y, 0);
      pipe.castShadow = true;
      this.group.add(pipe);
    }
    // низкие напольные лотки
    for (const z of [-20, 0, 20]) {
      this.addColliderBlock(50.5, z, 3, 7, 1.5, false, () => {
        const g = new THREE.Group();
        g.add(this.box(3, 1.5, 7, pipeMat.clone()));
        return g;
      }, 0, 'block', false);
    }
    // клапанные колёса у пилонов
    const valveMat = new THREE.MeshStandardMaterial({ color: 0xa8221c, roughness: 0.5, metalness: 0.4 });
    for (const z of [-24, 12]) {
      const valve = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 12), valveMat);
      valve.position.set(44.8, 4.2, z);
      valve.rotation.y = Math.PI / 2;
      this.group.add(valve);
    }
  }

  // ----------------------------------------------------
  private buildTransformers() {
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.35, metalness: 0.8 });
    const baseMat = new THREE.MeshStandardMaterial({ map: structureTexture(), color: 0xb9c6d6, roughness: 0.55, metalness: 0.5 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = sx * 40, z = sz * 40;
        this.addColliderBlock(x, z, 6, 6, 4.5, false, () => {
          const g = new THREE.Group();
          g.add(this.box(6, 3, 6, baseMat.clone()));
          // три катушки
          for (const cx of [-1.6, 0, 1.6]) {
            const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.6, 8), coilMat.clone());
            coil.position.set(cx, 3.8, 0);
            coil.castShadow = true;
            g.add(coil);
          }
          // предупреждающий щит
          const warn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.12),
            new THREE.MeshBasicMaterial({ color: 0xffb02e }));
          warn.position.set(0, 1.6, 3.1);
          g.add(warn);
          const lampB = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xff3326, transparent: true, opacity: 0.85 }));
          lampB.position.set(0, 5.1, 0);
          g.add(lampB);
          this.beaconMats.push(lampB.material as THREE.MeshBasicMaterial);
          return g;
        }, 0, 'wall');
      }
    }
  }

  // ----------------------------------------------------
  private buildRamps() {
    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x2a3648, roughness: 0.55, metalness: 0.5,
      emissive: 0x0c2033, emissiveIntensity: 0.5,
    });
    const addRamp = (x: number, z: number, yaw: number) => {
      const wdt = 5, len = 4.6, hgt = 1.35;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(len, 0);
      shape.lineTo(len, hgt);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: wdt, bevelEnabled: false });
      geo.translate(-len / 2, 0, -wdt / 2);
      const mesh = new THREE.Mesh(geo, rampMat.clone());
      mesh.castShadow = true; mesh.receiveShadow = true;
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = yaw;
      g.add(mesh);
      this.group.add(g);
      const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
      const fw = len * c + wdt * s, fd = len * s + wdt * c;
      this.colliders.push(colliderFromCenter(x, z, fw, fd, hgt, 'ramp', { blocksShots: false, blocksSight: false }));
    };
    // думающие пандусы у дорог и между цехами
    addRamp(26, 26, Math.PI * 0.75);
    addRamp(-26, 26, -Math.PI * 0.75);
    addRamp(26, -26, Math.PI * 0.25);
    addRamp(-26, -26, -Math.PI * 0.25);
    addRamp(0, 34, Math.PI);
    addRamp(0, -34, 0);
    addRamp(38, 0, Math.PI / 2);
    addRamp(-27, 0, -Math.PI / 2);
  }

  // ----------------------------------------------------
  private buildScattered() {
    const amber = crateTexture('#ffb02e');
    const steel = crateTexture('#5ec8ff');
    const solidMat = new THREE.MeshStandardMaterial({ map: steel, roughness: 0.45, metalness: 0.55, color: 0x9fb4cc });

    const crate = (x: number, z: number, w: number, d: number, h: number, yaw = 0) => {
      const mat = new THREE.MeshStandardMaterial({ map: amber, roughness: 0.55, metalness: 0.35, emissive: 0x000000 });
      const edge = new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.5 });
      this.addColliderBlock(x, z, w, d, h, true, () => {
        const g = new THREE.Group();
        const b = this.box(w, h, d, mat); b.rotation.y = yaw;
        g.add(b);
        const e = new THREE.Mesh(new THREE.BoxGeometry(w * 1.01, 0.09, d * 1.01), edge);
        e.position.y = h - 0.05; e.rotation.y = yaw;
        g.add(e);
        return g;
      }, h > 3 ? 150 : 90);
    };
    const solidCrate = (x: number, z: number, w: number, d: number, h: number) => {
      this.addColliderBlock(x, z, w, d, h, false, () => this.box(w, h, d, solidMat.clone()), 0, 'block');
    };

    // груз вокруг центрального зала
    crate(13, -11, 5, 4, 2.4);
    crate(-13, 11, 5, 4, 2.4);
    crate(18, -30, 5, 5, 2.4, 0.3);
    crate(-18, 30, 5, 5, 2.4, -0.3);
    // литейка
    crate(9, -52, 5, 5, 2.4);
    crate(-26, -56, 4, 4, 2.4, 0.4);
    // резервуары
    crate(33, 40, 4, 4, 2.4);
    crate(8, 55, 5, 5, 2.4, 0.2);
    // эстакада
    crate(40, -10, 4, 4, 2.4);
    crate(40, 12, 4, 4, 2.4, -0.25);
    // центральные прочные ящики-укрытия
    solidCrate(0, 26, 6, 3, 3.4);
    solidCrate(0, -28, 6, 3, 3.4);
    solidCrate(30, 15, 3, 6, 3.4);
    solidCrate(-32, -14, 3, 6, 3.4);

    // ======== кластеры бочек (разрушаемые) ========
    const bcolors = ['#a03a26', '#2b6ea0', '#7d8c25', '#8a6a1a'];
    let bi = 0;
    const barrels = (x: number, z: number, n: number) => {
      const col = bcolors[(bi++) % bcolors.length];
      const mat = new THREE.MeshStandardMaterial({
        map: barrelTexture(col), roughness: 0.5, metalness: 0.4, emissive: 0x000000,
      });
      const r = 0.55, h = 1.25;
      this.addColliderBlock(x, z, 2.6, 2.6, h, true, () => {
        const g = new THREE.Group();
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + (i % 2) * 0.6;
          const rad = (i === 0) ? 0 : 0.85;
          const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), mat);
          b.position.set(Math.cos(a) * rad, h / 2, Math.sin(a) * rad);
          b.rotation.z = (Math.random() - 0.5) * 0.1;
          b.castShadow = true; b.receiveShadow = true;
          g.add(b);
        }
        return g;
      }, 55);
    };
    barrels(12.5, 12.5, 4);
    barrels(-12.5, -12.5, 4);
    barrels(36, -24, 5);
    barrels(-34, 17, 4);
    barrels(20, 33, 5);
    barrels(-4, -35, 4);
    barrels(53, -6, 4);
    barrels(-52, 26, 5);
  }

  // ----------------------------------------------------
  private buildAtmosphere() {
    // энергетический купол поверх завода
    const domeGeo = new THREE.CylinderGeometry(this.half + 6, this.half + 6, 48, 48, 1, true);
    const domeMat = new THREE.MeshBasicMaterial({
      map: hexTexture(), transparent: true, opacity: 0.05,
      side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.dome = new THREE.Mesh(domeGeo, domeMat);
    this.dome.position.y = 20;
    this.group.add(this.dome);

    // парящая пыль
    const N = 320;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * ARENA.size;
      pos[i * 3 + 1] = 0.5 + Math.random() * 13;
      pos[i * 3 + 2] = (Math.random() - 0.5) * ARENA.size;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x7adfff, size: 0.16, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.dust = new THREE.Points(geo, mat);
    this.group.add(this.dust);
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
    // купол
    if (this.dome) {
      this.dome.rotation.y = elapsed * 0.02;
      (this.dome.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(elapsed * 0.8) * 0.015;
    }
    // обелиск
    if (this.obeliskCore) {
      this.obeliskCore.rotation.y = elapsed * 0.9;
      this.obeliskCore.rotation.x = elapsed * 0.4;
      this.obeliskCore.position.y = 12.6 + Math.sin(elapsed * 1.3) * 0.35;
    }
    if (this.obeliskRing) {
      this.obeliskRing.rotation.z = elapsed * 0.6;
      this.obeliskRing.position.y = 12.6 + Math.sin(elapsed * 1.3 + 1) * 0.35;
    }
    // пыль
    if (this.dust) this.dust.rotation.y = elapsed * 0.012;

    // мигание маячков
    const blink = Math.sin(elapsed * 2.6) > 0 ? 0.9 : 0.18;
    for (const m of this.beaconMats) m.opacity = blink;

    // пульсация литейки
    const fc = 0.85 + Math.sin(elapsed * 3.1) * 0.28;
    for (const m of this.furnaceGlowMats) m.emissiveIntensity = fc;
    const mp = 0.5 + Math.sin(elapsed * 2.7) * 0.16;
    for (const m of this.moltenMats) m.opacity = mp;

    // тележка крана ездит по балкам
    if (this.craneTrolley) {
      this.craneTrolley.position.x = Math.sin(elapsed * 0.14) * 13;
      this.craneTrolley.rotation.z = Math.sin(elapsed * 0.6) * 0.008;
    }

    // дым из труб
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

    // вспышки повреждённых блоков
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
