// ===== World markers for CP zones (disk + letter billboard) =====
import * as THREE from 'three';
import { COLORS } from '../../core/constants';
import type { CaptureOwner, CaptureZoneState } from './captureLogic';

const COL_NEUTRAL = 0x8a96a4;
const COL_ALPHA = COLORS.teamAlpha;
const COL_BRAVO = COLORS.teamBravo;

function ownerColor(owner: CaptureOwner, contested: boolean, progress: number): number {
  if (contested) return 0xffd24a;
  if (owner === 'alpha') return COL_ALPHA;
  if (owner === 'bravo') return COL_BRAVO;
  // Neutral but being captured: tint toward capturer lightly via progress (handled elsewhere).
  void progress;
  return COL_NEUTRAL;
}

function makeLetterSprite(letter: string, color: number): THREE.Sprite {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const c = cv.getContext('2d')!;
  c.clearRect(0, 0, 128, 128);
  c.fillStyle = 'rgba(6,12,18,0.55)';
  c.beginPath();
  c.arc(64, 64, 52, 0, Math.PI * 2);
  c.fill();
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  c.strokeStyle = `rgba(${r},${g},${b},0.9)`;
  c.lineWidth = 6;
  c.stroke();
  c.fillStyle = '#eaf6ff';
  c.font = 'bold 72px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(letter, 64, 68);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(8, 8, 1);
  spr.position.y = 6;
  return spr;
}

interface MarkerEntry {
  group: THREE.Group;
  ring: THREE.Mesh;
  fill: THREE.Mesh;
  letter: THREE.Sprite;
  lastKey: string;
}

/**
 * Three.js presentation for capture zones. State is owned by MatchRuntime.
 */
export class CaptureMarkers {
  private entries: MarkerEntry[] = [];
  private root = new THREE.Group();

  constructor(private scene: THREE.Scene) {
    this.root.name = 'captureMarkers';
    scene.add(this.root);
  }

  /** Rebuild markers for zone set (call after match start). */
  mount(zones: readonly CaptureZoneState[]) {
    this.clearMeshes();
    for (const z of zones) {
      const group = new THREE.Group();
      group.position.set(z.x, 0.05, z.z);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(z.radius * 0.92, z.radius, 48),
        new THREE.MeshBasicMaterial({
          color: COL_NEUTRAL,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;

      const fill = new THREE.Mesh(
        new THREE.CircleGeometry(z.radius * 0.88, 48),
        new THREE.MeshBasicMaterial({
          color: COL_NEUTRAL,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = 0.01;

      const letter = makeLetterSprite(z.id, COL_NEUTRAL);
      group.add(ring, fill, letter);
      this.root.add(group);
      this.entries.push({ group, ring, fill, letter, lastKey: '' });
    }
    this.sync(zones);
  }

  sync(zones: readonly CaptureZoneState[]) {
    for (let i = 0; i < this.entries.length && i < zones.length; i++) {
      const e = this.entries[i];
      const z = zones[i];
      const key = `${z.owner}|${z.contested}|${z.progress.toFixed(2)}|${z.actor}`;
      if (key === e.lastKey) continue;
      e.lastKey = key;

      let col = ownerColor(z.owner, z.contested, z.progress);
      if (z.owner === null && z.actor && z.progress > 0) {
        col = z.actor === 'alpha' ? COL_ALPHA : COL_BRAVO;
      }
      (e.ring.material as THREE.MeshBasicMaterial).color.setHex(col);
      (e.fill.material as THREE.MeshBasicMaterial).color.setHex(col);
      (e.fill.material as THREE.MeshBasicMaterial).opacity = z.contested
        ? 0.22
        : 0.1 + z.progress * 0.2;

      // Rebuild letter only when ownership color family changes.
      const letterCol = z.contested ? 0xffd24a : col;
      const mat = e.letter.material as THREE.SpriteMaterial;
      const map = mat.map as THREE.CanvasTexture;
      const cv = map.image as HTMLCanvasElement;
      const c = cv.getContext('2d')!;
      c.clearRect(0, 0, 128, 128);
      c.fillStyle = 'rgba(6,12,18,0.55)';
      c.beginPath();
      c.arc(64, 64, 52, 0, Math.PI * 2);
      c.fill();
      const r = (letterCol >> 16) & 255;
      const g = (letterCol >> 8) & 255;
      const b = letterCol & 255;
      c.strokeStyle = `rgba(${r},${g},${b},0.9)`;
      c.lineWidth = 6;
      c.stroke();
      c.fillStyle = '#eaf6ff';
      c.font = 'bold 72px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(z.id, 64, 68);
      map.needsUpdate = true;
    }
  }

  private clearMeshes() {
    for (const e of this.entries) {
      e.group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
        if (o instanceof THREE.Sprite) {
          const m = o.material as THREE.SpriteMaterial;
          m.map?.dispose();
          m.dispose();
        }
      });
      this.root.remove(e.group);
    }
    this.entries = [];
  }

  dispose() {
    this.clearMeshes();
    this.scene.remove(this.root);
  }
}
