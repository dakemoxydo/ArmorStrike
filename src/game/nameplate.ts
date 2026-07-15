// ===== Именные таблички ботов (спрайт с именем и полоской HP) =====
import * as THREE from 'three';

export class Nameplate {
  readonly sprite: THREE.Sprite;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private readonly w = 256;
  private readonly h = 80;
  private lastFrac = -1;
  private name: string;

  constructor(name: string, color: number) {
    this.name = name;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2d context');
    this.ctx = ctx;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({
      map: this.tex, transparent: true, depthTest: true, depthWrite: false,
    });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.scale.set(4.2, 1.32, 1);
    this.draw(1, color);
  }

  private draw(frac: number, color: number) {
    const c = this.ctx;
    const w = this.w, h = this.h;
    c.clearRect(0, 0, w, h);

    // фон
    c.fillStyle = 'rgba(6,12,18,0.55)';
    this.roundRect(8, 6, w - 16, h - 12, 12);
    c.fill();
    c.strokeStyle = `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},0.6)`;
    c.lineWidth = 2;
    this.roundRect(8, 6, w - 16, h - 12, 12);
    c.stroke();

    // имя
    c.fillStyle = '#eaf6ff';
    c.font = '600 22px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(this.name, w / 2, 26);

    // полоска HP
    const bx = 26, by = 48, bw = w - 52, bh = 16;
    c.fillStyle = 'rgba(255,255,255,0.12)';
    this.roundRect(bx, by, bw, bh, 7);
    c.fill();
    const f = Math.max(0, Math.min(1, frac));
    const r = Math.round(255 * (1 - f));
    const g = Math.round(70 + 185 * f);
    c.fillStyle = `rgb(${r},${g},96)`;
    if (f > 0.01) {
      this.roundRect(bx, by, Math.max(6, bw * f), bh, 7);
      c.fill();
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  update(frac: number, color: number) {
    if (Math.abs(frac - this.lastFrac) > 0.012) {
      this.draw(frac, color);
      this.tex.needsUpdate = true;
      this.lastFrac = frac;
    }
  }

  setPosition(x: number, y: number, z: number) {
    this.sprite.position.set(x, y, z);
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.sprite);
    this.tex.dispose();
    (this.sprite.material as THREE.SpriteMaterial).dispose();
  }
}
