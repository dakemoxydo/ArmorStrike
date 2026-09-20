// ===== Cel-Shading (Toon Quantization) Shader Patch for MeshStandardMaterial =====
// Quantizes continuous PBR diffuse and specular lighting into discrete, high-contrast
// comic bands (shadow, midtone, highlight) with crisp specular cuts.
//
// Maintains 100% compatibility with:
// - `instanceof THREE.MeshStandardMaterial`
// - DirectionalLight shadows & PCF filtering
// - Base color / map / roughness / metalness
// - Zero extra draw calls or full-screen post-processing passes.
import * as THREE from 'three';

const CEL_STEPS = 4.0;
const CEL_MIN_SHADOW = 0.32; // Prevent complete pitch-black crushing in direct shadows
const CEL_BLEND = 0.68;      // Ratio of stylized quantization to continuous diffuse (0 = full PBR, 1 = hard bands)

const CEL_SHADED_FLAG = '__armorstrike_cel_shaded__';

const CEL_QUANTIZATION_GLSL = `
// Comic Cel-shading diffuse quantization
{
  float _cel_dLum = length(reflectedLight.directDiffuse);
  if (_cel_dLum > 0.0005) {
    float _cel_raw = _cel_dLum;
    float _cel_val = _cel_raw * ${CEL_STEPS.toFixed(1)};
    float _cel_f = floor(_cel_val);
    float _cel_frac = fract(_cel_val);
    // Smooth micro-ramp across cel thresholds to eliminate jagged pixel aliasing
    float _cel_smooth = _cel_f + smoothstep(0.25, 0.75, _cel_frac);
    float _cel_stepped = max(_cel_smooth / ${CEL_STEPS.toFixed(1)}, ${CEL_MIN_SHADOW.toFixed(2)});
    // Balanced blend: stylized comic bands + natural diffuse gradient
    // Softens harsh banding while preserving distinct illustrated light zones
    float _cel_final = mix(_cel_raw, _cel_stepped, ${CEL_BLEND.toFixed(2)});
    reflectedLight.directDiffuse *= (_cel_final / _cel_dLum);
  }

  // Comic Cel-shading specular cut with anti-aliased rolloff
  float _cel_sLum = length(reflectedLight.directSpecular);
  if (_cel_sLum > 0.0005) {
    float _cel_specCut = smoothstep(0.10, 0.22, _cel_sLum);
    reflectedLight.directSpecular *= (_cel_specCut / _cel_sLum);
  }
}
`;

/**
 * Apply cel-shaded lighting quantization to a MeshStandardMaterial.
 * Modifies the material in-place and returns it.
 * Idempotent: safe to call multiple times or on cloned materials.
 */
export function applyCelShading<T extends THREE.MeshStandardMaterial>(material: T): T {
  if ((material as unknown as Record<string, unknown>)[CEL_SHADED_FLAG]) {
    return material;
  }
  Object.defineProperty(material, CEL_SHADED_FLAG, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: true,
  });

  material.customProgramCacheKey = () => 'cel-shaded-std-v1';

  const prevOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prevOnBeforeCompile) {
      prevOnBeforeCompile(shader, renderer);
    }

    if (shader.fragmentShader.includes('// Comic Cel-shading diffuse quantization')) {
      return;
    }

    const targetChunk = shader.fragmentShader.includes('#include <lights_fragment_end>')
      ? '#include <lights_fragment_end>'
      : '#include <lights_physical_fragment>';

    shader.fragmentShader = shader.fragmentShader.replace(
      targetChunk,
      `${targetChunk}\n${CEL_QUANTIZATION_GLSL}`,
    );
  };

  material.needsUpdate = true;
  return material;
}

/**
 * Проверка: материал уже получил cel-патч (флаг идемпотентности).
 * Используется тестами покрытия арены: все здания обязаны быть в cel-конвейере.
 */
export function isCelShaded(material: THREE.Material): boolean {
  return (material as unknown as Record<string, unknown>)[CEL_SHADED_FLAG] === true;
}

/**
 * Применить cel-shading ко всем MeshStandardMaterial под `root`.
 * Покрывает Mesh и InstancedMesh (наследник Mesh), включая материалы,
 * созданные напрямую через `new THREE.Mesh` и добавленные в группу
 * без `Arena.box` / `Arena.addColliderBlock` (трубы, фермы крана,
 * опоры эстакады, скайлайн, растительность, вода, витражи).
 * Идемпотентен: повторный проход после rebuild безопасен.
 */
export function applyCelShadingToObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial) {
          applyCelShading(m);
        }
      }
    }
  });
}
