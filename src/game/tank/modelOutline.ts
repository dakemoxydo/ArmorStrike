// ===== Красная обводка модели танка («враг в прицеле») — двухслойный outline =====
// Слой 1 — core: тонкая сплошная back-side «оболочка» (чёткая линия силуэта).
// Слой 2 — halo: аддитивный ореол шире core; яркость в фрагменте затухает от
// линии наружу (fresnel по back-граням) — мягкое красное свечение, которое
// маскирует стыки на углах и «дышит» общей интенсивностью (у униформы).
// Shell-меши — дети исходных мешей: трансформации (башня/ствол) наследуются
// бесплатно. Occlusion — обычный depth-test, сквозь стены обводка не светит.
import * as THREE from 'three';
import { TARGET_HIGHLIGHT } from '../tuning';
import { markShared } from '../resources/sharedResources';

/** Ключ кэша shell-мешей в group.userData. */
export const AIM_OUTLINE_KEY = 'aimOutline';

let coreMat: THREE.MeshBasicMaterial | null = null;
let haloMat: THREE.MeshBasicMaterial | null = null;
// Общая на оба слоя и все танки; видима ровно одна цель за раз, так что
// «дыхание» пишется в один uniform без cross-fade конфликтов.
const haloIntensity = { value: TARGET_HIGHLIGHT.pulse.base };

// ВАЖНО (r185): в meshbasic_vert <beginnormal_vertex> под #ifdef USE_ENVMAP/
// USE_SKINNING, а атрибут `normal` и uniform normalMatrix объявлены безусловно
// в вершинном префиксе WebGLProgram — используем их, а не objectNormal.
const PUSH_GLSL = '#include <begin_vertex>\n\ttransformed += normalize( normal ) * uOutlineWidth;';
const UNIFORM_DECL = '#include <common>\nuniform float uOutlineWidth;';

function ensureMaterials(): void {
  if (coreMat && haloMat) return;
  const t = TARGET_HIGHLIGHT;

  coreMat = markShared(
    new THREE.MeshBasicMaterial({
      color: t.color,
      side: THREE.BackSide,
      toneMapped: false,
    }),
  );
  coreMat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutlineWidth = { value: t.coreWidth };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', UNIFORM_DECL)
      .replace('#include <begin_vertex>', PUSH_GLSL);
  };

  haloMat = markShared(
    new THREE.MeshBasicMaterial({
      color: t.color,
      side: THREE.BackSide,
      toneMapped: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  haloMat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutlineWidth = { value: t.haloWidth };
    shader.uniforms.uHaloIntensity = haloIntensity;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', UNIFORM_DECL + '\nvarying vec3 vHaloN;\nvarying vec3 vHaloV;')
      .replace('#include <begin_vertex>', PUSH_GLSL)
      // mvPosition готов сразу после project_vertex; берём вытолкнутую вершину,
      // чтобы градиент считался по фактическому пикселу ореола.
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
\tvHaloN = normalize( normalMatrix * normal );
\tvHaloV = normalize( - mvPosition.xyz );`,
      );
    // |N·V| на видимой back-полосе ореола: ≈0 на внешнем крае, макс у линии —
    // значит затухание наружу = gl_FragColor ярче там, где ореол примыкает к core.
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vHaloN;\nvarying vec3 vHaloV;\nuniform float uHaloIntensity;',
      )
      .replace(
        '#include <opaque_fragment>',
        `outgoingLight *= pow( clamp( abs( dot( normalize( vHaloN ), normalize( vHaloV ) ) ) * ${t.haloFall.toFixed(2)}, 0.0, 1.0 ), ${t.haloExp.toFixed(2)} ) * uHaloIntensity;
\t#include <opaque_fragment>`,
      );
  };
}

function buildShells(group: THREE.Object3D): THREE.Mesh[] {
  ensureMaterials();
  // Снимок мешей до добавления shell-детей (traverse иначе дошёл бы до своих).
  const sources: THREE.Mesh[] = [];
  group.traverse((o) => {
    // Обводим только «железо» (Standard-материалы). MeshBasic-элементы —
    // командное кольцо под танком и лампы — не часть корпуса.
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
    const core = new THREE.Mesh(src.geometry, coreMat!);
    const halo = new THREE.Mesh(src.geometry, haloMat!);
    // identity-локально: мир = мир родителя ⇒ совпадение с корпусом + анимация.
    for (const m of [core, halo]) {
      m.castShadow = false;
      m.receiveShadow = false;
      src.add(m);
      shells.push(m);
    }
  }
  return shells;
}

/**
 * Вкл/выкл обводку на модели. Лень: shell-меши строятся один раз при первом
 * включении на этом танке и кэшируются в group.userData; дальше — `visible`.
 */
export function setTankOutline(group: THREE.Object3D, visible: boolean): void {
  let shells = group.userData[AIM_OUTLINE_KEY] as THREE.Mesh[] | undefined;
  if (!shells) {
    if (!visible) return;
    shells = buildShells(group);
    group.userData[AIM_OUTLINE_KEY] = shells;
  }
  for (const m of shells) m.visible = visible;
}

/** Интенсивность ореола («дыхание»). Дёшево: одна запись в общий uniform. */
export function setOutlineIntensity(value: number): void {
  haloIntensity.value = value;
}

/** Текущее значение — для тестов/диагностики. */
export function getOutlineIntensity(): number {
  return haloIntensity.value;
}
