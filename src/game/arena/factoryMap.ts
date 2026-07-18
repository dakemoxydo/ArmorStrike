// ===== Карта Factory (базовая): заводские модули =====
import * as THREE from 'three';
import { structureTexture } from '../textures';
import type { ArenaBuildContext } from './context';
import { buildAtmosphere } from './atmosphere';
import { buildCentralHall } from './centralHall';
import { buildContainerYard } from './containerYard';
import { buildFoundry } from './foundry';
import { buildGantryCrane } from './gantryCrane';
import { buildPipeRack } from './pipeRack';
import { buildRamps } from './ramps';
import { buildScattered } from './scattered';
import { buildSilos } from './silos';
import { buildSkyline } from './skyline';
import { buildSmokestacks } from './smokestacks';
import { buildTransformers } from './transformers';

/** Interior props for the original factory arena. */
export function buildFactoryContent(ctx: ArenaBuildContext) {
  const structMat = new THREE.MeshStandardMaterial({
    map: structureTexture(), roughness: 0.55, metalness: 0.5, color: 0xb9c6d6,
  });

  buildSkyline(ctx);
  buildSmokestacks(ctx, structMat);
  buildCentralHall(ctx, structMat);
  buildGantryCrane(ctx);
  buildFoundry(ctx, structMat);
  buildSilos(ctx);
  buildContainerYard(ctx);
  buildPipeRack(ctx);
  buildTransformers(ctx);
  buildRamps(ctx);
  buildScattered(ctx);
  buildAtmosphere(ctx);
}
