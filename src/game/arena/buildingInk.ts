// ===== Чернильный контур крупных зданий (Inverted-Hull Outline) =====
// Тот же приём, что у танков (`tank/comicInkOutline.ts`): shell с BackSide,
// выталкивающий вершины вдоль нормалей в вершинном шейдере. Ноль новых
// render-проходов, ноль конфликтов со stencil-подсветкой прицела.
//
// Бюджет (Visual_Coherence_Pass п.10): ink получают ТОЛЬКО крупные здания —
// несущие wall-блоки (`Arena.addColliderBlock` с kind 'wall', т.е. цеха,
// офисы, дома, амбары, часовня, цистерны), отсев по габариту коллайдера.
// Мелочь (заборы, бочки, ящики, машины, киоски, растительность, скайлайн)
// контура не получает: 1–2 шелла на корпус вместо десятков на детали.
//
// Масштаб ширины: танковый hairline 0.012 м на 10–30-метровом корпусе с
// дистанции 50–150 м не читается, поэтому у зданий свой shared-материал
// с шириной 0.06 м и той же дистанционной компенсацией.
import * as THREE from 'three';
import { markShared } from '../resources/sharedResources';

export const BUILDING_INK_KEY = 'buildingInkOutline';
export const BUILDING_INK_MESH = 'buildingInkMesh';

/** Порог «крупного здания» по габариту коллайдера (метры). */
export const BUILDING_INK_MIN_SIDE = 8; // max(w, d) либо высота
export const BUILDING_INK_MIN_HEIGHT = 4;
/** Максимум шеллов на один корпус: несущая масса + крыша/доминанта. */
export const BUILDING_INK_MAX_SHELLS = 2;
/** Отсев субмешей: чернила только массам, не дверям/окнам/полосам. */
const MIN_MASS_SIDE = 1.5;
const MIN_MASS_SPAN = 5;

/** Ширина контура зданий (м): комикс-читаемая с 50–150 м, без blob-эффекта вблизи. */
export const BUILDING_INK_WIDTH = 0.10;

const INK_COLOR = 0x181c26; // тот же графит, что у танков
const INK_WIDTH = BUILDING_INK_WIDTH;
const WIDTH_REF_DIST = 45.0;
const WIDTH_DIST_MIX = 0.38;

let inkMaterial: THREE.MeshBasicMaterial | null = null;

function getSharedBuildingInkMaterial(): THREE.MeshBasicMaterial {
  if (!inkMaterial) {
    const mat = new THREE.MeshBasicMaterial({
      color: INK_COLOR,
      side: THREE.BackSide,
      toneMapped: false,
      depthWrite: true,
    });
    mat.name = 'buildingInk';

    const uniformDecl =
      '#include <common>\nuniform float uOutlineWidth;\nuniform float uWidthRefDist;\nuniform float uWidthDistMix;';
    const pushGlsl =
      '#include <begin_vertex>\n\ttransformed += normalize( normal ) * ' +
      '( uOutlineWidth * mix( 1.0, length( ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz ) / uWidthRefDist, uWidthDistMix ) );';

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uOutlineWidth = { value: INK_WIDTH };
      shader.uniforms.uWidthRefDist = { value: WIDTH_REF_DIST };
      shader.uniforms.uWidthDistMix = { value: WIDTH_DIST_MIX };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', uniformDecl)
        .replace('#include <begin_vertex>', pushGlsl);
    };

    inkMaterial = markShared(mat);
  }
  return inkMaterial;
}

/**
 * Получает ли блок чернильный контур: только несущие wall-здания
 * крупнее порога (цеха, офисы, дома, амбары, часовня, цистерны, трубы ТЭЦ).
 * Рампы, мелкий декор, контейнеры ('block'), скайлайн (без коллайдера) —
 * мимо: бюджет draw calls не трогаем.
 */
export function shouldOutlineBuilding(
  kind: 'block' | 'wall' | 'ramp',
  w: number, d: number, h: number,
): boolean {
  if (kind !== 'wall') return false;
  if (h < BUILDING_INK_MIN_HEIGHT) return false;
  return Math.max(w, d) >= BUILDING_INK_MIN_SIDE || h >= BUILDING_INK_MIN_SIDE;
}

const tmpBox = new THREE.Box3();
const tmpSize = new THREE.Vector3();

/**
 * Вешает до BUILDING_INK_MAX_SHELLS inverted-hull шеллов на крупнейшие
 * несущие массы внутри wrap'а блока. Шеллы — дети исходных мешей: наследуют
 * трансформации, удаляются вместе с блоком, shared-материал/геометрия
 * переживают dispose (markShared). Идемпотентен (повторный вызов — no-op).
 */
export function attachBuildingInkOutline(root: THREE.Object3D): THREE.Mesh[] {
  const inkMat = getSharedBuildingInkMaterial();
  const candidates: { mesh: THREE.Mesh; volume: number }[] = [];

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return;
    if (o.name === BUILDING_INK_MESH) return;
    if (Array.isArray(o.material)) return;
    if (!(o.material instanceof THREE.MeshStandardMaterial)) return;
    if (o.material.name === 'comicInk' || o.material.name === 'buildingInk') return;
    // Повторный проход: у обработанного меша уже есть шелл-ребёнок.
    if (o.children.some((c) => c.name === BUILDING_INK_MESH)) return;
    tmpBox.setFromObject(o);
    tmpBox.getSize(tmpSize);
    const min = Math.min(tmpSize.x, tmpSize.y, tmpSize.z);
    const max = Math.max(tmpSize.x, tmpSize.y, tmpSize.z);
    if (min < MIN_MASS_SIDE || max < MIN_MASS_SPAN) return;
    candidates.push({ mesh: o, volume: tmpSize.x * tmpSize.y * tmpSize.z });
  });

  candidates.sort((a, b) => b.volume - a.volume);

  const shells: THREE.Mesh[] = [];
  for (const { mesh } of candidates.slice(0, BUILDING_INK_MAX_SHELLS)) {
    const inkMesh = new THREE.Mesh(mesh.geometry, inkMat);
    inkMesh.name = BUILDING_INK_MESH;
    inkMesh.castShadow = false;
    inkMesh.receiveShadow = false;
    inkMesh.renderOrder = (mesh.renderOrder || 0) - 1;
    mesh.add(inkMesh);
    shells.push(inkMesh);
  }

  const prev = root.userData[BUILDING_INK_KEY] as THREE.Mesh[] | undefined;
  root.userData[BUILDING_INK_KEY] = [...(prev ?? []), ...shells];
  return shells;
}
