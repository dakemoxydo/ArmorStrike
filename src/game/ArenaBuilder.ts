import {
  cityGroundTexture,
  factoryGroundTexture,
  villageGroundTexture,
} from './textures';
import { ARENA } from './constants';
import type { Arena } from './Arena';
import type { ArenaBuildContext } from './arena/context';
import { buildArenaShell } from './arena/shell';
import { buildFactoryContent } from './arena/factoryMap';
import { buildVillageContent } from './arena/villageMap';
import { buildCityContent } from './arena/cityMap';
import type { ArenaEffects } from './ArenaEffects';
import type { MapId } from './maps/mapCatalog';
import { DEFAULT_MAP_ID } from './maps/mapCatalog';

export function buildArena(
  arena: Arena,
  effects: ArenaEffects,
  mapId: MapId = DEFAULT_MAP_ID,
) {
  const ctx = makeContext(arena, effects);

  switch (mapId) {
    case 'village':
      buildArenaShell(ctx, {
        groundMap: villageGroundTexture(ARENA.size),
        groundRoughness: 0.92,
        groundMetalness: 0.05,
        wallColor: 0xc8bca0,
        pillarColor: 0x4a3a28,
        lampColor: 0xffc266,
        stripColor: 0xc8a24a,
        signA: ['ДЕРЕВНЯ', 'ПОСЁЛОК «ARMORSTRIKE»'],
        signB: ['ПЛОЩАДЬ', 'РЫНОК · КОЛОДЕЦ'],
      });
      buildVillageContent(ctx);
      break;
    case 'city':
      buildArenaShell(ctx, {
        groundMap: cityGroundTexture(ARENA.size),
        groundRoughness: 0.82,
        groundMetalness: 0.25,
        wallColor: 0x90a8c0,
        pillarColor: 0x1a2430,
        lampColor: 0xaaccff,
        stripColor: 0x5ec8ff,
        signA: ['ГОРОД', 'СЕКТОР «ARMORSTRIKE»'],
        signB: ['ЦЕНТР', 'ПЛАЗА · АВЕНЮ · ЭСТАКАДА'],
      });
      buildCityContent(ctx);
      break;
    case 'factory':
    default:
      buildArenaShell(ctx, {
        groundMap: factoryGroundTexture(ARENA.size),
        groundRoughness: 0.88,
        groundMetalness: 0.2,
        wallColor: 0xbfd2e6,
        pillarColor: 0x222d3d,
        lampColor: 0xffb84d,
        stripColor: 0x2ee6c0,
        signA: ['ЗАВОД-51', 'ЛИТЕЙНЫЙ КОМПЛЕКС «ARMORSTRIKE»'],
        signB: ['ЦЕХ №7', 'МЕХАНИЧЕСКАЯ СБОРКА'],
      });
      buildFactoryContent(ctx);
      break;
  }
}

export function makeContext(arena: Arena, effects: ArenaEffects): ArenaBuildContext {
  return {
    group: arena.group,
    half: arena.half,
    colliders: arena.colliders,
    blocks: arena.blocks,
    beaconMats: effects.beaconMats,
    smokeEmitters: effects.smokeEmitters,
    furnaceGlowMats: effects.furnaceGlowMats,
    moltenMats: effects.moltenMats,
    box: (w, h, d, mat, cy) => arena.box(w, h, d, mat, cy),
    addColliderBlock: (x, z, w, d, h, destructible, buildMesh, hp, kind, blocksSight) =>
      arena.addColliderBlock(x, z, w, d, h, destructible, buildMesh, hp, kind, blocksSight),
    setObelisk: (core, ring) => { effects.obeliskCore = core; effects.obeliskRing = ring; },
    setCraneTrolley: (trolley) => { effects.craneTrolley = trolley; },
    setDome: (dome) => { effects.dome = dome; },
    setDust: (dust) => { effects.dust = dust; },
  };
}
