// ===== Подсистема рендера: renderer, сцена, камера, свет, небо, окружение =====
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
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

  /** Post-processing: bloom (только на high quality). */
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private useComposer = false;

  constructor(canvas: HTMLCanvasElement) {
    const preset = getQualityPreset();
    this.quality = preset.id;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: preset.id !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatioMax));
    this.renderer.shadowMap.enabled = preset.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
            vec3 col = mix(uHor, uZen, clamp(h * 1.6, 0.0, 1.0));
            vec3 sunDir = normalize(uSunDir);
            float sunDot = max(0.0, dot(n, sunDir));
            float sunDisc = smoothstep(0.9975, 0.999, sunDot);
            col += uSunDisc * sunDisc * 2.0;
            col += uSunGlow * pow(sunDot, 16.0) * 0.4;
            float cloud = sin(n.x * 10.0 + n.z * 16.0) * cos(n.z * 12.0 - n.x * 7.0);
            float puff = smoothstep(0.25, 0.7, cloud);
            if (h > 0.04) {
              col = mix(col, uCloud, puff * 0.25 * smoothstep(0.04, 0.2, h));
            }
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    this.scene.add(this.sky);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    pmrem.dispose();

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

    // Bloom post-processing (только на high quality)
    this.setupBloom(preset);
  }

  private setupBloom(preset: QualityPreset) {
    if (preset.id !== 'high') {
      this.useComposer = false;
      return;
    }
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35,  // strength — мягкий bloom
      0.6,   // radius
      0.85,  // threshold — только яркие emissive
    );
    this.composer.addPass(this.bloomPass);
    this.useComposer = true;
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

  /** Применить пресет (pixel ratio + shadow map). Antialias не меняется runtime. */
  applyQuality(preset: QualityPreset) {
    this.quality = preset.id;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatioMax));
    this.renderer.shadowMap.enabled = preset.shadows;
    this.sun.castShadow = preset.shadows;
    const size = preset.shadowMapSize;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    // Bloom только на high
    if (preset.id === 'high' && !this.composer) {
      this.setupBloom(preset);
    } else if (preset.id !== 'high') {
      this.useComposer = false;
    }
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

  dispose() {
    this.renderer.dispose();
  }
}
