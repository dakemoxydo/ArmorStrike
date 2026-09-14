// ===== Красная обводка модели танка («враг в прицеле») — outline по силуэту =====
// Обводится внешний контур машины ЦЕЛИКОМ, а не каждой детали: stencil-маска.
// Каждая деталь-«железо» получает невидимый mask-меш (экранная проекция детали
// пишется в stencil без цвета и глубины), а rim/core/halo проходят только там,
// где маска пуста ⇒ стыки башни/корпуса/ствола обводкой не покрываются.
// Слой 1 — rim: тёмный контр-кант (E): back-side shell чуть шире core, почти
// чёрный; core перекрывает его по depth ⇒ тёмное кольцо видно только снаружи от
// красной линии — обводка не растворяется на светлом фоне.
// Слой 2 — core: сплошная back-side «оболочка» (чёткая линия силуэта).
// Слой 3 — halo: аддитивный ореол шире всех; яркость в фрагменте затухает от
// линии наружу (fresnel по back-граням) — мягкое красное свечение, которое
// «дышит» общей интенсивностью (у униформы). Back-поверхности halo — самые
// дальние из shell'ов, поэтому под rim/core он режется depth-тестом: свечение
// начинается наружного края контр-канта.
// Все shell-слои — с экранным подмешиванием толщины (C): сдвиг умножается на
// mix(1, dist/widthRefDist, widthDistMix) — вдали линия не истончается в нить,
// вблизи не жирнеет.
// Shell/mask-меши — дети исходных мешей: трансформации (башня/ствол) наследуются
// бесплатно. Occlusion — обычный depth-test, сквозь стены обводка не светит.
// Требует stencil-буфера кадра: RenderWorld (контекст `stencil: true` + RT
// композера со `stencilBuffer: true`), иначе маска молча не работает.
import * as THREE from 'three';
import { TARGET_HIGHLIGHT } from '../tuning';
import { markShared } from '../resources/sharedResources';

/** Ключ кэша shell-мешей в group.userData. */
export const AIM_OUTLINE_KEY = 'aimOutline';

/** Бит силуэтной маски: mask-меши пишут его, shell'ы требуют отсутствия. */
const SILHOUETTE_BIT = 1;

let rimMat: THREE.MeshBasicMaterial | null = null;
let coreMat: THREE.MeshBasicMaterial | null = null;
let haloMat: THREE.MeshBasicMaterial | null = null;
let maskMat: THREE.MeshBasicMaterial | null = null;
// Общий на все танки; видима ровно одна цель за раз, так что
// «дыхание» пишется в один uniform без cross-fade конфликтов.
const haloIntensity = { value: TARGET_HIGHLIGHT.pulse.base };
// Общие uniforms экранной толщины (C) — во все shell-слои.
const widthRefDist = { value: TARGET_HIGHLIGHT.widthRefDist };
const widthDistMix = { value: TARGET_HIGHLIGHT.widthDistMix };

// ВАЖНО (r185): в meshbasic_vert <beginnormal_vertex> под #ifdef USE_ENVMAP/
// USE_SKINNING, а атрибут `normal` и uniform normalMatrix объявлены безусловно
// в вершинном префиксе WebGLProgram — используем их, а не objectNormal.
// Дистанция берётся от НЕвытолкнутой вершины (трансформация в метрах object
// space ≈ мир: модели не скейлятся), поправка — непрерывная функция дистанции.
const PUSH_GLSL =
  '#include <begin_vertex>\n\ttransformed += normalize( normal ) * ' +
  '( uOutlineWidth * mix( 1.0, length( ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz ) / uWidthRefDist, uWidthDistMix ) );';
const UNIFORM_DECL =
  '#include <common>\nuniform float uOutlineWidth;\nuniform float uWidthRefDist;\nuniform float uWidthDistMix;';

// Семантика three r185: material.stencilWrite включает ВЕСЬ stencil-конвейер
// (WebGLState.setMaterial), а не только запись. Shell'ам нужен только тест —
// запись обнулена: stencilWriteMask 0, ops по умолчанию Keep.
function ensureMaterials(): void {
  if (coreMat) return;
  const t = TARGET_HIGHLIGHT;

  // Контр-кант (E): рисуется в opaque-очереди ДО core (renderOrder -6 в
  // buildShells). Он шире (coreWidth + rimWidth) и его back-поверхности
  // дальше от камеры ⇒ core проходит depth-test и перекрывает тёмный shell,
  // снаружи остаётся тёмное кольцо шириной rimWidth.
  rimMat = markShared(
    new THREE.MeshBasicMaterial({
      color: t.rimColor,
      side: THREE.BackSide,
      toneMapped: false,
      stencilWrite: true,
      stencilFunc: THREE.EqualStencilFunc,
      stencilRef: 0,
      stencilFuncMask: SILHOUETTE_BIT,
      stencilWriteMask: 0,
    }),
  );
  rimMat.name = 'aimRim';
  rimMat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutlineWidth = { value: t.coreWidth + t.rimWidth };
    shader.uniforms.uWidthRefDist = widthRefDist;
    shader.uniforms.uWidthDistMix = widthDistMix;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', UNIFORM_DECL)
      .replace('#include <begin_vertex>', PUSH_GLSL);
  };

  coreMat = markShared(
    new THREE.MeshBasicMaterial({
      color: t.color,
      side: THREE.BackSide,
      toneMapped: false,
      // Рисуем только где маска силуэта пуста (== SILHOUETTE_BIT отсутствует):
      // полоски shell'ов поверх любой детали танка отсекаются stencil-тестом.
      stencilWrite: true,
      stencilFunc: THREE.EqualStencilFunc,
      stencilRef: 0,
      stencilFuncMask: SILHOUETTE_BIT,
      stencilWriteMask: 0,
    }),
  );
  coreMat.name = 'aimCore';
  coreMat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutlineWidth = { value: t.coreWidth };
    shader.uniforms.uWidthRefDist = widthRefDist;
    shader.uniforms.uWidthDistMix = widthDistMix;
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
      stencilWrite: true,
      stencilFunc: THREE.EqualStencilFunc,
      stencilRef: 0,
      stencilFuncMask: SILHOUETTE_BIT,
      stencilWriteMask: 0,
    }),
  );
  haloMat.name = 'aimHalo';
  haloMat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutlineWidth = { value: t.haloWidth };
    shader.uniforms.uHaloIntensity = haloIntensity;
    shader.uniforms.uWidthRefDist = widthRefDist;
    shader.uniforms.uWidthDistMix = widthDistMix;
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

  // Невидимая проекция детали в stencil. DoubleSide + depthWrite:false +
  // renderOrder раньше всей opaque-очереди ⇒ union экранных проекций всех
  // деталей пишется целиком (и скрытые части тоже) = silhouette машины.
  maskMat = markShared(
    new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilRef: SILHOUETTE_BIT,
      stencilZPass: THREE.ReplaceStencilOp, // fail/zFail по умолчанию Keep
    }),
  );
  maskMat.name = 'aimMask';
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
    const mask = new THREE.Mesh(src.geometry, maskMat!);
    const rim = new THREE.Mesh(src.geometry, rimMat!);
    const core = new THREE.Mesh(src.geometry, coreMat!);
    const halo = new THREE.Mesh(src.geometry, haloMat!);
    // Порядок обязателен: маска (-12) заполняет stencil до всех shell'ов;
    // rim (-6) пишется до core (0) — иначе тёмный кант перезальёт красную
    // линию. halo — transparent-очередь, всегда после opaque.
    mask.renderOrder = -12;
    rim.renderOrder = -6;
    // identity-локально: мир = мир родителя ⇒ совпадение с корпусом + анимация.
    for (const m of [mask, rim, core, halo]) {
      m.castShadow = false;
      m.receiveShadow = false;
      src.add(m);
      shells.push(m);
    }
  }
  return shells;
}

/**
 * Вкл/выкл обводку на модели. Лень: shell-меши (mask/rim/core/halo на каждую
 * деталь) строятся один раз при первом включении на этом танке и кэшируются в
 * group.userData; дальше — `visible` (скрытая маска перестаёт писать stencil).
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
