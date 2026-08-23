import * as THREE from 'three';
import type { HullId, TurretId } from '../../core/catalog';
import type { TankStyle } from '../../core/types';
import { camoTexture, trackTexture } from '../textures';
import { buildHull } from './hull';
import { buildTurret as buildTurretProcedural } from './turret';
import { HULL_CONFIG, TURRET_CONFIG, HULL_TURRET_Y, MODELS_ENABLED } from './TankConfig';
import { assetManager } from './AssetManager';
import type { TankBuildContext } from './context';
import { normalizeHullModel, prepareTexturedModel } from './modelUtils';

export interface TankBuildResult {
  hull: THREE.Group;
  turret: THREE.Group;
  group: THREE.Group;
  barrelGroup: THREE.Group;
  muzzle: THREE.Object3D;
  bodyMats: THREE.MeshStandardMaterial[];
  /** Accent-материал (антенна и процедурные детали) — не искать по индексу. */
  metalMat: THREE.MeshStandardMaterial;
  trackTex: THREE.CanvasTexture;
  railGlowMat?: THREE.MeshStandardMaterial;
  /** Local Y for turret on hull (model or procedural table). */
  turretY: number;
}

function createStyleMaterials(style: TankStyle): {
  bodyMats: THREE.MeshStandardMaterial[];
  bodyMat: THREE.MeshStandardMaterial;
  turretMat: THREE.MeshStandardMaterial;
  metalMat: THREE.MeshStandardMaterial;
  lampMat: THREE.MeshBasicMaterial;
  trackTex: THREE.CanvasTexture;
  trackMat: THREE.MeshStandardMaterial;
} {
  const bodyMats: THREE.MeshStandardMaterial[] = [];
  const bodyMat = new THREE.MeshStandardMaterial({
    map: camoTexture(style.body, style.dark, style.light),
    roughness: 0.5,
    metalness: 0.45,
    emissive: 0x000000,
  });
  bodyMats.push(bodyMat);

  const turretMat = bodyMat.clone();
  turretMat.map = camoTexture(style.light, style.body, style.dark);
  bodyMats.push(turretMat);

  const metalMat = new THREE.MeshStandardMaterial({
    color: style.accent,
    roughness: 0.35,
    metalness: 0.75,
  });
  bodyMats.push(metalMat);

  const lampMat = new THREE.MeshBasicMaterial({ color: style.glow });
  const trackTex = trackTexture();
  const trackMat = new THREE.MeshStandardMaterial({
    map: trackTex,
    roughness: 0.9,
    metalness: 0.15,
  });

  return { bodyMats, bodyMat, turretMat, metalMat, lampMat, trackTex, trackMat };
}

export class TankFactory {
  /**
   * Hybrid tank builder: procedural code + optional GLTF hull.
   * Turret stays procedural unless TURRET_CONFIG says otherwise.
   */
  static async build(
    hullId: HullId,
    turretId: TurretId,
    style: TankStyle,
  ): Promise<TankBuildResult> {
    const hullConfig = HULL_CONFIG[hullId];
    const turretConfig = TURRET_CONFIG[turretId];
    const mats = createStyleMaterials(style);

    const hullGroup = new THREE.Group();
    const turretGroup = new THREE.Group();
    const barrelGroup = new THREE.Group();
    const muzzle = new THREE.Object3D();

    const ctx: TankBuildContext = {
      style,
      bodyMats: mats.bodyMats,
      bodyMat: mats.bodyMat,
      turretMat: mats.turretMat,
      metalMat: mats.metalMat,
      lampMat: mats.lampMat,
      trackTex: mats.trackTex,
      trackMat: mats.trackMat,
      group: hullGroup,
      hull: hullGroup,
      turret: turretGroup,
      barrelGroup,
      muzzle,
      railGlowMat: undefined,
    };

    let turretY = HULL_TURRET_Y[hullId];

    // bodyMats starts with style mats (turret/procedural FX); textured hull appends its own
    const bodyMats = [...mats.bodyMats];

    // --- Hull ---
    // MODELS_ENABLED=false (см. TankConfig) — система GLTF отключена, всегда процедурный путь.
    if (MODELS_ENABLED && hullConfig.type === 'model' && hullConfig.path) {
      try {
        const model = await assetManager.load(hullConfig.path);
        const deckY = normalizeHullModel(model);
        // Keep baked textures — do NOT overwrite with procedural camo
        const modelMats = prepareTexturedModel(model);
        if (modelMats.length > 0) {
          // Prefer model mats for hit-flash; keep turret/metal at end for procedural bits
          bodyMats.length = 0;
          bodyMats.push(...modelMats, mats.turretMat, mats.metalMat);
        }
        hullGroup.add(model);
        turretY = Math.max(0.9, deckY * 0.82);
      } catch (e) {
        console.error(`Failed to load hull model for ${hullId}. Falling back to procedural.`, e);
        buildHull(ctx, hullId);
        turretY = HULL_TURRET_Y[hullId];
      }
    } else {
      buildHull(ctx, hullId);
    }

    // --- Turret (procedural unless a model is configured) ---
    if (MODELS_ENABLED && turretConfig.type === 'model' && turretConfig.path) {
      try {
        const model = await assetManager.load(turretConfig.path);
        const modelMats = prepareTexturedModel(model);
        bodyMats.push(...modelMats);
        turretGroup.add(model);
      } catch (e) {
        console.error(`Failed to load turret model for ${turretId}. Falling back to procedural.`, e);
        buildTurretProcedural(ctx, turretId);
      }
    } else {
      buildTurretProcedural(ctx, turretId);
    }

    turretGroup.position.set(0, turretY, -0.1);
    hullGroup.add(turretGroup);

    const finalGroup = new THREE.Group();
    finalGroup.add(hullGroup);

    return {
      hull: hullGroup,
      turret: turretGroup,
      group: finalGroup,
      barrelGroup: ctx.barrelGroup,
      muzzle: ctx.muzzle,
      bodyMats,
      metalMat: mats.metalMat,
      trackTex: mats.trackTex,
      railGlowMat: ctx.railGlowMat,
      turretY,
    };
  }
}
