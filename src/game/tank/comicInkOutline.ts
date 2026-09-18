// ===== Permanent Comic Ink Outline for Tanks =====
// Inverted-hull back-face silhouette ink contour (Borderlands / Anime Cel style).
// Expands back-facing polygons along vertex normals with screen-distance scaling.
// Runs in standard forward pass: 0 extra render targets, 0 stencil conflicts.
import * as THREE from 'three';
import { markShared } from '../resources/sharedResources';

export const COMIC_INK_KEY = 'comicInkOutline';

const INK_COLOR = 0x12151c; // Deep charcoal-black ink
const INK_WIDTH = 0.024;    // Meters in model space (~1% of hull width)
const WIDTH_REF_DIST = 40.0;
const WIDTH_DIST_MIX = 0.45;

let inkMaterial: THREE.MeshBasicMaterial | null = null;

function getSharedInkMaterial(): THREE.MeshBasicMaterial {
  if (!inkMaterial) {
    const mat = new THREE.MeshBasicMaterial({
      color: INK_COLOR,
      side: THREE.BackSide,
      toneMapped: false,
      depthWrite: true,
    });
    mat.name = 'comicInk';

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
 * Attaches inverted-hull ink outline meshes to all standard solid meshes in the group.
 * Identity-local: meshes become children of the source parts and naturally follow
 * turret rotation, barrel pitch, and hull suspension.
 */
export function attachComicInkOutline(root: THREE.Object3D): THREE.Mesh[] {
  const inkMat = getSharedInkMaterial();
  const sources: THREE.Mesh[] = [];

  root.traverse((o) => {
    // Only outline solid geometry parts (not lights, particles, or rings)
    if (
      o instanceof THREE.Mesh &&
      !Array.isArray(o.material) &&
      (o.material instanceof THREE.MeshStandardMaterial || o.material.name === 'comicInk')
    ) {
      if (o.material.name !== 'comicInk') {
        sources.push(o);
      }
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
  return shells;
}
