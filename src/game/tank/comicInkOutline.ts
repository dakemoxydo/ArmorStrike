// ===== Permanent Comic Ink Outline for Tanks =====
// Inverted-hull back-face silhouette ink contour (Borderlands / Anime Cel style).
// Обводка — ОДНА на весь силуэт машины. Невидимая stencil-маска (union экранных
// проекций всех деталей) пишется раньше чернильных shell'ов, а сам чернильный
// слой проходит только там, где маска пуста ⇒ стыки башня/корпус/ствол/гусеницы
// и мелкие детали (болты, ливреи) обводкой не перекрываются. Без маски каждая
// деталь обводилась бы отдельно и стыки читались бы лишними линиями.
// Тот же приём, что у подсветки цели (modelOutline.ts).
// Expands back-facing polygons along vertex normals with screen-distance scaling.
// Требует stencil-буфера кадра (RenderWorld: контекст `stencil: true`); без него
// stencil-тест всегда проходит и контур деградирует к послойному — не падает.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { markShared } from '../resources/sharedResources';

export const COMIC_INK_KEY = 'comicInkOutline';
export const COMIC_INK_MASK_KEY = 'comicInkSilhouetteMask';
/** Имя mask-меша — по нему его исключают из теней и из мишеней рейкаста. */
export const COMIC_INK_MASK_NAME = 'comicInkMaskMesh';

const INK_COLOR = 0x181c26; // Deep slate graphite (softened from harsh jet-black)
/**
 * Ширина чернильного контура танка (м). Читается как самостоятельная линия силуэта
 * (~0.8% ширины корпуса): hairline 0.012 тонул в камуфляже и сливал детали.
 * Экспорт нужен пину BUILDING_INK_WIDTH (arena/buildingInk.ts).
 */
export const TANK_INK_WIDTH = 0.02;
const WIDTH_REF_DIST = 45.0;
const WIDTH_DIST_MIX = 0.38;

/** Бит силуэтной маски: mask-меши пишут его, чернильный слой требует отсутствия. */
const SILHOUETTE_BIT = 1;
/** Маска раньше всех shell'ов (чернильный -1) и позже маски подсветки цели (-12). */
const MASK_RENDER_ORDER = -11;

let inkMaterial: THREE.MeshBasicMaterial | null = null;
let maskMaterial: THREE.MeshBasicMaterial | null = null;

function getSharedInkMaterial(): THREE.MeshBasicMaterial {
  if (!inkMaterial) {
    const mat = new THREE.MeshBasicMaterial({
      color: INK_COLOR,
      side: THREE.BackSide,
      toneMapped: false,
      depthWrite: true,
      // Рисуем только где маска силуэта пуста (== SILHOUETTE_BIT отсутствует):
      // полоски shell'ов поверх любой детали танка отсекаются stencil-тестом.
      // stencilWrite включает в three весь stencil-конвейер (и тест, и запись),
      // поэтому запись обнулена: stencilWriteMask 0, ops по умолчанию Keep.
      stencilWrite: true,
      stencilFunc: THREE.EqualStencilFunc,
      stencilRef: 0,
      stencilFuncMask: SILHOUETTE_BIT,
      stencilWriteMask: 0,
    });
    mat.name = 'comicInk';

    const uniformDecl =
      '#include <common>\nuniform float uOutlineWidth;\nuniform float uWidthRefDist;\nuniform float uWidthDistMix;';
    const pushGlsl =
      '#include <begin_vertex>\n\ttransformed += normalize( normal ) * ' +
      '( uOutlineWidth * mix( 1.0, length( ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz ) / uWidthRefDist, uWidthDistMix ) );';

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uOutlineWidth = { value: TANK_INK_WIDTH };
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
 * Невидимая проекция деталей в stencil. DoubleSide + depthWrite:false +
 * renderOrder раньше всей opaque-очереди ⇒ union экранных проекций всех
 * деталей пишется целиком (и скрытые части тоже) = силуэт машины.
 */
function getSharedMaskMaterial(): THREE.MeshBasicMaterial {
  if (!maskMaterial) {
    const mat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilRef: SILHOUETTE_BIT,
      stencilZPass: THREE.ReplaceStencilOp, // fail/zFail по умолчанию Keep
    });
    mat.name = 'comicInkMask';
    maskMaterial = markShared(mat);
  }
  return maskMaterial;
}

/** Служебные меши обводки (чернильный shell + маска) — не железо: без теней и не мишени. */
export function isComicInkHelper(o: THREE.Object3D): boolean {
  return o.name === 'comicInkMesh' || o.name === COMIC_INK_MASK_NAME;
}

/**
 * Attaches inverted-hull ink outline meshes to all standard solid meshes in the group.
 * Identity-local: meshes become children of the source parts and naturally follow
 * turret rotation, barrel pitch, and hull suspension.
 */
export function attachComicInkOutline(root: THREE.Object3D): THREE.Mesh[] {
  const inkMat = getSharedInkMaterial();
  const sources: THREE.Mesh[] = [];

  root.traverse((o) => {
    // Обводим только «железо» (Standard-материалы): лампы, командное кольцо и
    // щит респавна — MeshBasic, они частью корпуса не считаются.
    if (
      o instanceof THREE.Mesh &&
      !Array.isArray(o.material) &&
      o.material instanceof THREE.MeshStandardMaterial
    ) {
      sources.push(o);
    }
  });

  const shells: THREE.Mesh[] = [];
  for (const src of sources) {
    const inkMesh = new THREE.Mesh(src.geometry, inkMat);
    inkMesh.name = 'comicInkMesh';
    inkMesh.castShadow = false;
    inkMesh.receiveShadow = false;
    // Render immediately behind front faces in opaque queue
    inkMesh.renderOrder = (src.renderOrder || 0) - 1;
    src.add(inkMesh);
    shells.push(inkMesh);
  }

  root.userData[COMIC_INK_KEY] = shells;
  root.userData[COMIC_INK_MASK_KEY] = attachSilhouetteMask(root, sources);
  return shells;
}

/**
 * Stencil-маска силуэта: по мешу на «жёсткий кадр» (корпус / башня / ствол), а не
 * на деталь — на танке ~15 деталей, и маска на каждую стоила бы столько же
 * draw call'ов. Кадр = родитель детали: маска лежит в его системе координат,
 * поэтому башня и ствол продолжают вести её при повороте.
 */
function attachSilhouetteMask(root: THREE.Object3D, sources: THREE.Mesh[]): THREE.Mesh[] {
  // r185: updateWorldMatrix пересчитывает matrixWorld только при
  // matrixWorldNeedsUpdate, а у свежесобранной иерархии флаг снят ⇒ без `force`
  // мировые матрицы остались бы единичными и смещения деталей в маску не попали.
  // Закладка одноразовая, поэтому форсируем честно.
  root.updateWorldMatrix(true, true, true);

  const byFrame = new Map<THREE.Object3D, THREE.Mesh[]>();
  for (const src of sources) {
    const frame = src.parent ?? root;
    const bucket = byFrame.get(frame);
    if (bucket) bucket.push(src);
    else byFrame.set(frame, [src]);
  }

  const maskMat = getSharedMaskMaterial();
  const toFrame = new THREE.Matrix4();
  const masks: THREE.Mesh[] = [];
  for (const [frame, parts] of byFrame) {
    // Один источник — переиспользуем его геометрию (shared, dispose её не тронет).
    const geometry = parts.length === 1 ? parts[0].geometry : mergeFrameGeometry(parts, frame, toFrame);
    if (geometry) {
      masks.push(addMask(frame, geometry, maskMat));
      continue;
    }
    // merge не вышел — тот же силуэт, просто маска на каждую деталь.
    for (const p of parts) masks.push(addMask(p, p.geometry, maskMat));
  }
  return masks;
}

function addMask(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = COMIC_INK_MASK_NAME;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = MASK_RENDER_ORDER;
  parent.add(mesh);
  return mesh;
}

/**
 * Слить детали кадра в одну геометрию маски. Нормали/UV маске не нужны (DoubleSide,
 * без смещения вершин), поэтому клонируется только `position` — это же делает
 * набор атрибутов гарантированно одинаковым для `mergeGeometries`. Смешанная
 * индексация приводится к общей (все в треугольники), иначе merge возвращает null.
 * Геометрия результата принадлежит танку (не shared) — её освобождает teardown.
 */
function mergeFrameGeometry(
  parts: THREE.Mesh[],
  frame: THREE.Object3D,
  toFrame: THREE.Matrix4,
): THREE.BufferGeometry | null {
  const flat = parts.some((p) => p.geometry.index === null);
  toFrame.copy(frame.matrixWorld).invert();
  const local = new THREE.Matrix4();
  const clones: THREE.BufferGeometry[] = [];

  for (const p of parts) {
    const src = flat && p.geometry.index ? p.geometry.toNonIndexed() : p.geometry;
    const clone = new THREE.BufferGeometry();
    clone.setAttribute('position', src.getAttribute('position').clone());
    if (!flat && src.index) clone.setIndex(src.index.clone());
    local.multiplyMatrices(toFrame, p.matrixWorld);
    clone.applyMatrix4(local);
    clones.push(clone);
    if (src !== p.geometry) src.dispose();
  }

  const merged = mergeGeometries(clones, false);
  for (const clone of clones) clone.dispose();
  if (!merged) return null;
  merged.computeBoundingSphere();
  return merged;
}
