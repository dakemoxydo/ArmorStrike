import * as THREE from 'three';
import type { ArenaBuildContext } from './context';

export function buildSkyline(ctx: ArenaBuildContext) {
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0f16, roughness: 1, emissive: 0x0c141f, emissiveIntensity: 0.35 });
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffa64d });
  const rng = (a: number, b: number) => a + Math.random() * (b - a);
  for (let i = 0; i < 26; i++) {
    const ang = (i / 26) * Math.PI * 2 + rng(-0.06, 0.06);
    const r = rng(105, 150);
    const w = rng(10, 26), h = rng(8, 34);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), dark);
    m.position.set(Math.cos(ang) * r, h / 2 - 0.5, Math.sin(ang) * r);
    m.rotation.y = rng(0, Math.PI);
    ctx.group.add(m);
    if (Math.random() > 0.4) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.5, h * 0.12), winMat);
      win.position.set(m.position.x, h * rng(0.3, 0.7), m.position.z);
      win.lookAt(0, win.position.y, 0);
      ctx.group.add(win);
    }
    if (i % 5 === 0) {
      const th = rng(26, 44);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, th, 8), dark);
      st.position.set(m.position.x + rng(-10, 10), th / 2, m.position.z + rng(-10, 10));
      ctx.group.add(st);
      ctx.smokeEmitters.push(new THREE.Vector3(st.position.x, th + 1, st.position.z));
    }
  }
  const gz = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 14), dark);
  gz.position.set(-120, 10, -95);
  ctx.group.add(gz);
}
