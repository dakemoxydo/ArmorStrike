import * as THREE from 'three';
import { smokeTexture } from './textures';

interface SmokeSprite { s: THREE.Sprite; life: number; maxLife: number; vx: number }

export class ArenaEffects {
  dome: THREE.Mesh | null = null;
  dust: THREE.Points | null = null;
  obeliskCore: THREE.Mesh | null = null;
  obeliskRing: THREE.Mesh | null = null;
  craneTrolley: THREE.Group | null = null;
  furnaceGlowMats: THREE.MeshStandardMaterial[] = [];
  moltenMats: THREE.MeshBasicMaterial[] = [];
  beaconMats: THREE.MeshBasicMaterial[] = [];
  smokeEmitters: THREE.Vector3[] = [];

  private smokePool: SmokeSprite[] = [];
  private smokeT = 0;
  private smokeTex: THREE.Texture;

  constructor(private group: THREE.Group) {
    this.smokeTex = smokeTexture();
  }

  /**
   * Clear animated refs and smoke pool before arena rebuild.
   * Does not dispose the shared smoke texture.
   */
  resetForRebuild() {
    this.dome = null;
    this.dust = null;
    this.obeliskCore = null;
    this.obeliskRing = null;
    this.craneTrolley = null;
    this.furnaceGlowMats.length = 0;
    this.moltenMats.length = 0;
    this.beaconMats.length = 0;
    this.smokeEmitters.length = 0;
    this.smokeT = 0;
    for (const slot of this.smokePool) {
      this.group.remove(slot.s);
      // Material only — map is shared via smokeTexture().
      slot.s.material.dispose();
    }
    this.smokePool.length = 0;
  }

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
  }
}
