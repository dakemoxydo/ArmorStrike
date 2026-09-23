// ===== Подсистема рендера: renderer, сцена, камера, свет, небо, окружение =====
import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import { getQualityPreset, type QualityLevel, type QualityPreset } from './graphicsQuality';
import type { MapId } from './maps/mapCatalog';
import { getAtmosphere } from './atmospherePresets';

const NIGHT = getAtmosphere('factory');

export class RenderWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly cameraRig: CameraRig;

  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private rim: THREE.DirectionalLight;
  private sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private quality: QualityLevel;
  private atmosphere: MapId = 'factory';

  /**
   * Legacy bloom composer slot. UnrealBloom blurs ink outlines, so the comic
   * pipeline never builds it; the field stays so dispose() can tear down a
   * leftover injected in tests / old sessions.
   */
  private composer: { setSize: (w: number, h: number) => void; dispose: () => void; render: () => void } | null = null;
  private bloomPass: { dispose: () => void } | null = null;
  private useComposer = false;
  /** Always null — comic lighting has no RoomEnvironment IBL. */
  private envRT: THREE.WebGLRenderTarget | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const preset = getQualityPreset();
    this.quality = preset.id;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: preset.id !== 'low',
      powerPreference: 'high-performance',
      // Контекст по умолчанию (r185) — без stencil-буфера; outline по силуэту
      // (modelOutline.ts) пишется через stencil-маску, нужен буфер.
      stencil: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatioMax));
    this.renderer.shadowMap.enabled = preset.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Linear + no IBL: ACES + RoomEnvironment filled cel bands and looked PBR.
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = NIGHT.exposure;

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 900);
    this.cameraRig = new CameraRig(this.camera);
    this.scene.background = new THREE.Color(NIGHT.background);
    this.scene.fog = new THREE.Fog(NIGHT.fogColor, NIGHT.fogNear, NIGHT.fogFar);

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(480, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uZen: { value: new THREE.Vector3(...NIGHT.skyZenith) },
          uHor: { value: new THREE.Vector3(...NIGHT.skyHorizon) },
          uCloud: { value: new THREE.Vector3(...NIGHT.skyCloud) },
          uSunDir: { value: new THREE.Vector3(...NIGHT.skySunDir) },
          uSunDisc: { value: new THREE.Vector3(...NIGHT.skySunDisc) },
          uSunGlow: { value: new THREE.Vector3(...NIGHT.skySunGlow) },
        },
        vertexShader: `
          varying vec3 vPos;
          void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        // Комикс-небо: 3 плоские полосы горизонта, жёсткие пятна облаков
        // (step вместо smoothstep — без airbrush-растяжек), плоский диск
        // солнца с твёрдым ореолом-кольцом. Шейдинг только ступени, не градиент.
        fragmentShader: `
          varying vec3 vPos;
          uniform vec3 uZen;
          uniform vec3 uHor;
          uniform vec3 uCloud;
          uniform vec3 uSunDir;
          uniform vec3 uSunDisc;
          uniform vec3 uSunGlow;
          void main() {
            vec3 n = normalize(vPos);
            float h = n.y;
            vec3 mid = mix(uHor, uZen, 0.55);
            vec3 col = h < 0.18 ? uHor : (h < 0.48 ? mid : uZen);
            float field = sin(n.x * 9.0 + n.z * 13.0) * cos(n.z * 11.0 - n.x * 6.0);
            float patch = step(0.38, field) * step(0.08, h);
            col = mix(col, uCloud, patch);
            vec3 sunDir = normalize(uSunDir);
            float sunDot = dot(n, sunDir);
            float disc = step(0.998, sunDot);
            float ring = step(0.99, sunDot) * (1.0 - disc);
            col = mix(col, uSunDisc, disc);
            col = mix(col, mix(uSunDisc, uSunGlow, 0.5), ring * 0.7);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    this.scene.add(this.sky);

    this.scene.environment = null;

    this.hemi = new THREE.HemisphereLight(NIGHT.hemiSky, NIGHT.hemiGround, NIGHT.hemiIntensity);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(NIGHT.sunColor, NIGHT.sunIntensity);
    this.sun.position.set(...NIGHT.sunPosition);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    const sc = this.sun.shadow.camera;
    sc.left = -170; sc.right = 170; sc.top = 170; sc.bottom = -170;
    sc.near = 10; sc.far = 420;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.rim = new THREE.DirectionalLight(NIGHT.rimColor, NIGHT.rimIntensity);
    this.rim.position.set(-30, 20, -40);
    this.scene.add(this.rim);
  }

  getQuality(): QualityLevel {
    return this.quality;
  }

  /** Текущая карта атмосферы (для тестов / отладки). */
  getAtmosphere(): MapId {
    return this.atmosphere;
  }

  /**
   * Применить атмосферный пресет под карту (sky/fog/sun/hemi/rim/exposure).
   * Вызывается из buildArena при каждой сборке/пересборке арены.
   */
  applyAtmosphere(mapId: MapId) {
    const p = getAtmosphere(mapId);
    this.atmosphere = mapId;

    (this.scene.background as THREE.Color).set(p.background);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(p.fogColor);
    fog.near = p.fogNear;
    fog.far = p.fogFar;
    this.renderer.toneMappingExposure = p.exposure;

    this.hemi.color.set(p.hemiSky);
    this.hemi.groundColor.set(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;

    this.sun.color.set(p.sunColor);
    this.sun.intensity = p.sunIntensity;
    this.sun.position.set(...p.sunPosition);

    this.rim.color.set(p.rimColor);
    this.rim.intensity = p.rimIntensity;

    const u = this.sky.material.uniforms;
    u.uZen.value.set(...p.skyZenith);
    u.uHor.value.set(...p.skyHorizon);
    u.uCloud.value.set(...p.skyCloud);
    u.uSunDir.value.set(...p.skySunDir);
    u.uSunDisc.value.set(...p.skySunDisc);
    u.uSunGlow.value.set(...p.skySunGlow);
  }

  /**
   * Меню/гараж-подиум (п.16 Visual_Coherence_Pass): туман живой арены
   * выключен — на сцене только бумага MenuStage. Включение возвращает
   * параметры текущего пресета; rebuild раунда вернёт их и так через
   * applyAtmosphere.
   */
  setFogEnabled(enabled: boolean) {
    const fog = this.scene.fog as THREE.Fog;
    if (enabled) {
      const p = getAtmosphere(this.atmosphere);
      fog.color.set(p.fogColor);
      fog.near = p.fogNear;
      fog.far = p.fogFar;
    } else {
      // Не снимаем объект Fog (applyAtmosphere пишет в него как в Fog):
      // near/far за пределом сцены дают fog factor ≈ 0.
      fog.near = 1e6;
      fog.far = 1e9;
    }
  }

  /** Применить пресет (pixel ratio + shadow map). Antialias не меняется runtime. */
  applyQuality(preset: QualityPreset) {
    this.quality = preset.id;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatioMax));

    // three.js pitfall: `shadowMap.enabled` is baked into lit-material
    // programs; flipping it at runtime does NOT recompile already-compiled
    // materials, so the toggle would silently no-op visually. Shipped presets
    // keep shadows on at every tier by design (Graphics_Presets_Matrix.md),
    // but if a preset ever disables them this forces the one-time recompile.
    const shadowToggled = this.renderer.shadowMap.enabled !== preset.shadows;
    this.renderer.shadowMap.enabled = preset.shadows;
    this.sun.castShadow = preset.shadows;
    const size = preset.shadowMapSize;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    if (shadowToggled) {
      const seen = new Set<THREE.Material>();
      this.scene.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (!mat) return;
        for (const m of Array.isArray(mat) ? mat : [mat]) {
          if (seen.has(m)) continue;
          seen.add(m);
          m.needsUpdate = true;
        }
      });
    }
    // Comic pipeline: never rebuild UnrealBloom (blurs inverted-hull ink).
    this.disposeBloom();
  }

  private disposeBloom() {
    this.bloomPass?.dispose();
    this.bloomPass = null;
    this.composer?.dispose();
    this.composer = null;
    this.useComposer = false;
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }

  render() {
    if (this.useComposer && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Pre-compile every shader the current scene needs.
   *
   * The dynamic light budget is constant (see `effects/LightRig`), so one pass
   * covers all combat materials: without it the first shot / first explosion
   * pays a synchronous GLSL compile inside the frame. `compileAsync` uses
   * `KHR_parallel_shader_compile` when available, so the wait does not block
   * the main thread; it resolves immediately when the extension is absent.
   *
   * Call after the arena and the match roster are in the scene, under a loading
   * overlay (GameModeController.executeStartRound).
   */
  async warmUp(): Promise<void> {
    await this.renderer.compileAsync(this.scene, this.camera);
  }

  /**
   * Full teardown. `renderer.dispose()` alone releases only the WebGL context —
   * it does NOT free scene-owned GL resources. Every GPU resource created here
   * (PMREM env target, sky program, shadow map) is therefore released
   * explicitly; otherwise each Game instance leaks them (React StrictMode mounts
   * the boot effect twice in dev, so the first instance's leak is observable).
   */
  dispose() {
    this.disposeBloom();

    this.scene.environment = null;
    this.envRT?.dispose();
    this.envRT = null;

    this.sky.geometry.dispose();
    this.sky.material.dispose();

    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;

    // Lights + sky are the only children left (Arena/preview removed their own
    // groups during teardown) — drop them so nothing keeps them alive.
    this.scene.clear();

    this.renderer.dispose();
  }
}
