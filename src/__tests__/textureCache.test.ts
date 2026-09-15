import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import {
  cachedTexture,
  cachedTextureCount,
  cachedTextureHas,
  cachedTextureEvict,
} from '../game/textures/shared';
import { markShared, isShared, unmarkShared } from '../game/resources/sharedResources';

function fakeTexture(tag: string): THREE.CanvasTexture {
  const t = new THREE.Texture();
  t.name = tag;
  return t as unknown as THREE.CanvasTexture;
}

describe('cachedTexture registry (R-1/R-2)', () => {
  it('memoizes by key: same key → same instance, builder called once', () => {
    const before = cachedTextureCount();
    const build = vi.fn(() => fakeTexture('a'));
    const t1 = cachedTexture('test:memo:a', build);
    const t2 = cachedTexture('test:memo:a', build);
    expect(t1).toBe(t2);
    expect(build).toHaveBeenCalledTimes(1);
    expect(cachedTextureCount()).toBe(before + 1);
  });

  it('different keys → different instances', () => {
    const a = cachedTexture('test:key:a', () => fakeTexture('ka'));
    const b = cachedTexture('test:key:b', () => fakeTexture('kb'));
    expect(a).not.toBe(b);
  });

  it('returned textures are marked shared so per-piece teardown skips them', () => {
    const t = cachedTexture('test:shared:flag', () => fakeTexture('sf'));
    expect(isShared(t)).toBe(true);
  });

  it('cachedTextureHas reports presence without building', () => {
    expect(cachedTextureHas('test:has:x')).toBe(false);
    cachedTexture('test:has:x', () => fakeTexture('hx'));
    expect(cachedTextureHas('test:has:x')).toBe(true);
  });

  it('evict disposes the texture and clears the shared flag (owner-only)', () => {
    const disposeSpy = vi.spyOn(THREE.Texture.prototype, 'dispose');
    const t = cachedTexture('test:evict:x', () => fakeTexture('ex'));
    expect(isShared(t)).toBe(true);
    cachedTextureEvict('test:evict:x');
    expect(cachedTextureHas('test:evict:x')).toBe(false);
    expect(disposeSpy).toHaveBeenCalled();
    unmarkShared(t); // no-op safety for WeakSet hygiene
    disposeSpy.mockRestore();
  });

  it('evict of a missing key is a silent no-op', () => {
    expect(() => cachedTextureEvict('test:missing:zz')).not.toThrow();
  });

  it('markShared round-trip works on plain resources', () => {
    const geo = new THREE.BufferGeometry();
    expect(isShared(geo)).toBe(false);
    markShared(geo);
    expect(isShared(geo)).toBe(true);
    unmarkShared(geo);
    expect(isShared(geo)).toBe(false);
  });
});

// B6-регрессия: LRU-1 слот ground раньше evictил несуществующий ключ
// 'ground:last' (реальные ключи `ground:<map>:<size>`) — silent no-op, и все
// три канваса 3072² оставались в VRAM. Пин на уровне исходника: выгрузка
// обязана идти по реальному последнему ключу.
describe('ground LRU-1 slot source pin (B6)', () => {
  const groundSrc = readFileSync(
    resolve(__dirname, '../../src/game/textures/ground.ts'),
    'utf8',
  );

  it('evicts by tracked last real key, not a never-written literal', () => {
    expect(groundSrc).toContain('let lastGroundKey');
    expect(groundSrc).toMatch(/cachedTextureEvict\(lastGroundKey\)/);
    // Литерал-призрак больше не должен нигде передаваться в evict.
    expect(groundSrc).not.toMatch(/cachedTextureEvict\(\s*['"`]ground/);
  });
});
