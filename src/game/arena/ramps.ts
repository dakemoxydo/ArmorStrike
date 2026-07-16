import * as THREE from 'three';
import { colliderFromCenter } from '../engine/physics';
import type { ArenaBuildContext } from './context';

export function buildRamps(ctx: ArenaBuildContext) {
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
    ctx.group.add(g);
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    const fw = len * c + wdt * s, fd = len * s + wdt * c;
    ctx.colliders.push(colliderFromCenter(x, z, fw, fd, hgt, 'ramp', { blocksShots: false, blocksSight: false }));
  };
  addRamp(26, 26, Math.PI * 0.75);
  addRamp(-26, 26, -Math.PI * 0.75);
  addRamp(26, -26, Math.PI * 0.25);
  addRamp(-26, -26, -Math.PI * 0.25);
  addRamp(0, 34, Math.PI);
  addRamp(0, -34, 0);
  addRamp(38, 0, Math.PI / 2);
  addRamp(-27, 0, -Math.PI / 2);
}
