import * as THREE from 'three';
import { markShared, unmarkShared } from '../resources/sharedResources';

/** Кэш process-lifetime текстур: ключ → CanvasTexture, помеченная markShared. */
const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Мемоизация фабрики текстур по строковому ключу.
 * Возвращённая текстура помечена markShared — поштучный teardown
 * (disposeObject3D / disposeArenaSubtree / SpriteMaterial.map?.dispose)
 * обязан её пропустить; владельцем остаётся этот кэш до конца процесса.
 */
export function cachedTexture(key: string, build: () => THREE.CanvasTexture): THREE.CanvasTexture {
  let t = cache.get(key);
  if (!t) {
    t = markShared(build());
    cache.set(key, t);
  }
  return t;
}

/** Число закэшированных текстур (диагностика утечек кэша). */
export function cachedTextureCount(): number {
  return cache.size;
}

/** Есть ли запись в кэше (без сборки) — для LRU-логики поверх кэша. */
export function cachedTextureHas(key: string): boolean {
  return cache.has(key);
}

/**
 * Выгрузить запись владельцем кэша: снимает markShared и освобождает
 * GPU-текстуру. Только для политик выгрузки (LRU-1 ground), не для
 * поштучного teardown'а.
 */
export function cachedTextureEvict(key: string): void {
  const t = cache.get(key);
  if (!t) return;
  cache.delete(key);
  unmarkShared(t);
  t.dispose();
}

export function makeCanvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { c, ctx: c.getContext('2d')! };
}

export function toTexture(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function noise(ctx: CanvasRenderingContext2D, size: number, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const v = Math.floor(Math.random() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * Math.random()})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
