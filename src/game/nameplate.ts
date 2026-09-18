// ===== Именные таблички (комикс-плашка: срез, Russo One, чернильный контур) =====
import * as THREE from 'three';

/**
 * HP redraw step. The bar is 204px wide, so 2% ≈ 4px — invisible, while
 * cutting canvas redraws and 256×80 texture uploads to a handful per damage
 * event (update() runs for every bot, every frame).
 */
const HP_DRAW_STEP = 0.02;

const INK = '#0b0e14';
const CUT = 10;

/** Fade starts here (metres from local player); gone by FADE_END. */
export const NAMEPLATE_FADE_START = 48;
export const NAMEPLATE_FADE_END = 110;
const SCALE_NEAR_X = 4.2;
const SCALE_NEAR_Y = 1.32;
const SCALE_FAR_X = 2.8;
const SCALE_FAR_Y = 0.88;

export class Nameplate {
  readonly sprite: THREE.Sprite;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private readonly mat: THREE.SpriteMaterial;
  private readonly w = 256;
  private readonly h = 80;
  /** Last drawn HP bucket + color — redraw only when the picture changes. */
  private lastStep = -1;
  private lastColor = -1;
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
    this.mat = new THREE.SpriteMaterial({
      map: this.tex, transparent: true, depthTest: true, depthWrite: false,
    });
    this.sprite = new THREE.Sprite(this.mat);
    this.sprite.scale.set(SCALE_NEAR_X, SCALE_NEAR_Y, 1);
    this.draw(1, color);
  }

  private cutRect(x: number, y: number, w: number, h: number, cut: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + cut, y);
    c.lineTo(x + w, y);
    c.lineTo(x + w, y + h - cut);
    c.lineTo(x + w - cut, y + h);
    c.lineTo(x, y + h);
    c.lineTo(x, y + cut);
    c.closePath();
  }

  private draw(frac: number, color: number) {
    const c = this.ctx;
    const w = this.w, h = this.h;
    c.clearRect(0, 0, w, h);

    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;

    // ink drop + paper fill
    this.cutRect(10, 8, w - 16, h - 12, CUT);
    c.fillStyle = INK;
    c.fill();
    this.cutRect(8, 6, w - 16, h - 12, CUT);
    c.fillStyle = 'rgba(11, 16, 25, 0.92)';
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.stroke();
    c.strokeStyle = `rgba(${r},${g},${b},0.85)`;
    c.lineWidth = 2;
    c.stroke();

    // name — Russo One with 8-dir ink
    const nx = w / 2;
    const ny = 28;
    c.font = '400 20px "Russo One", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = INK;
    for (const [ox, oy] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [-2, 0], [2, 0], [0, -2], [0, 2]]) {
      c.fillText(this.name, nx + ox, ny + oy);
    }
    c.fillStyle = '#f4f0e6';
    c.fillText(this.name, nx, ny);

    // HP bar — same language as .hp-shell / .hp-fill
    const bx = 22, by = 48, bw = w - 44, bh = 14;
    this.cutRect(bx, by, bw, bh, 4);
    c.fillStyle = INK;
    c.fill();
    this.cutRect(bx + 2, by + 2, bw - 4, bh - 4, 3);
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.fill();
    const f = Math.max(0, Math.min(1, frac));
    if (f > 0.01) {
      const fillW = Math.max(8, (bw - 4) * f);
      this.cutRect(bx + 2, by + 2, fillW, bh - 4, 3);
      c.fillStyle = f > 0.55 ? '#34d399' : f > 0.25 ? '#fbbf24' : '#ef4444';
      c.fill();
    }
  }

  update(frac: number, color: number) {
    const f = Math.max(0, Math.min(1, frac));
    const step = Math.round(f / HP_DRAW_STEP);
    if (step === this.lastStep && color === this.lastColor) return;
    this.lastStep = step;
    this.lastColor = color;
    this.draw(step * HP_DRAW_STEP, color);
    this.tex.needsUpdate = true;
  }

  /**
   * Distance fade/scale vs the local player (E2). Opacity 1 until
   * NAMEPLATE_FADE_START, 0 at NAMEPLATE_FADE_END; scale clamps down.
   */
  setRange(dist: number) {
    const span = NAMEPLATE_FADE_END - NAMEPLATE_FADE_START;
    const t = Math.max(0, Math.min(1, (dist - NAMEPLATE_FADE_START) / span));
    const opacity = 1 - t;
    this.mat.opacity = opacity;
    const s = Math.max(0, Math.min(1, (dist - 16) / (NAMEPLATE_FADE_END - 16)));
    this.sprite.scale.set(
      SCALE_NEAR_X + (SCALE_FAR_X - SCALE_NEAR_X) * s,
      SCALE_NEAR_Y + (SCALE_FAR_Y - SCALE_NEAR_Y) * s,
      1,
    );
    if (opacity < 0.05) this.sprite.visible = false;
  }

  setPosition(x: number, y: number, z: number) {
    this.sprite.position.set(x, y, z);
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.sprite);
    this.tex.dispose();
    this.mat.dispose();
  }
}
