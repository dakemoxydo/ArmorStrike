// ===== Cel-Shading (Toon Quantization) Shader Patch for MeshStandardMaterial =====
// Quantizes continuous PBR diffuse and specular lighting into discrete, high-contrast
// comic bands (shadow, midtone, highlight) with crisp specular cuts.
//
// Maintains 100% compatibility with:
// - `instanceof THREE.MeshStandardMaterial`
// - DirectionalLight shadows & PCF filtering
// - Base color / map / roughness / metalness
// - Zero extra draw calls or full-screen post-processing passes.
import type * as THREE from 'three';

const CEL_STEPS = 3.0;
const CEL_MIN_SHADOW = 0.3; // Prevent complete pitch-black crushing in direct shadows

const CEL_LIGHTS_GLSL = `
#include <lights_physical_fragment>

// Comic Cel-shading diffuse quantization
float _cel_dLum = length(reflectedLight.directDiffuse);
if (_cel_dLum > 0.0005) {
  float _cel_stepped = floor(_cel_dLum * ${CEL_STEPS.toFixed(1)} + 0.45) / ${CEL_STEPS.toFixed(1)};
  _cel_stepped = max(_cel_stepped, ${CEL_MIN_SHADOW.toFixed(2)});
  reflectedLight.directDiffuse *= (_cel_stepped / _cel_dLum);
}

// Comic Cel-shading specular cut
float _cel_sLum = length(reflectedLight.directSpecular);
if (_cel_sLum > 0.0005) {
  float _cel_specCut = step(0.16, _cel_sLum);
  reflectedLight.directSpecular *= (_cel_specCut / _cel_sLum);
}
`;

/**
 * Apply cel-shaded lighting quantization to a MeshStandardMaterial.
 * Modifies the material in-place and returns it.
 */
export function applyCelShading<T extends THREE.MeshStandardMaterial>(material: T): T {
  material.customProgramCacheKey = () => 'cel-shaded-std-v1';

  const prevOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prevOnBeforeCompile) {
      prevOnBeforeCompile(shader, renderer);
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_fragment>',
      CEL_LIGHTS_GLSL,
    );
  };

  material.needsUpdate = true;
  return material;
}
