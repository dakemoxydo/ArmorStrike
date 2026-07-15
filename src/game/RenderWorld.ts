// ===== Подсистема рендера: renderer, сцена, камера, свет, небо, окружение =====
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraRig } from './CameraRig';

export class RenderWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly cameraRig: CameraRig;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
    this.cameraRig = new CameraRig(this.camera);
    this.scene.background = new THREE.Color(0x060a12);
    this.scene.fog = new THREE.Fog(0x0a0f18, 75, 250);

    // Sky-dome шейдер (градиент неба, солнце, облака) — адаптация из game1
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(480, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
          varying vec3 vPos;
          void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          varying vec3 vPos;
          void main() {
            vec3 n = normalize(vPos);
            float h = n.y;
            vec3 zen = vec3(0.03, 0.05, 0.09);
            vec3 hor = vec3(0.10, 0.17, 0.26);
            vec3 col = mix(hor, zen, clamp(h * 1.6, 0.0, 1.0));
            vec3 sunDir = normalize(vec3(0.5, 0.6, 0.4));
            float sunDot = max(0.0, dot(n, sunDir));
            float sunDisc = smoothstep(0.9975, 0.999, sunDot);
            col += vec3(1.0, 0.85, 0.6) * sunDisc * 2.0;
            col += vec3(0.5, 0.6, 0.8) * pow(sunDot, 16.0) * 0.4;
            float cloud = sin(n.x * 10.0 + n.z * 16.0) * cos(n.z * 12.0 - n.x * 7.0);
            float puff = smoothstep(0.25, 0.7, cloud);
            if (h > 0.04) {
              col = mix(col, vec3(0.16, 0.22, 0.30), puff * 0.25 * smoothstep(0.04, 0.2, h));
            }
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    this.scene.add(sky);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0x8fb9d8, 0x0a0e14, 0.5);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe6c0, 2.4);
    sun.position.set(58, 78, 32);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -88; sc.right = 88; sc.top = 88; sc.bottom = -88;
    sc.near = 10; sc.far = 220;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x2ee6c0, 0.5);
    rim.position.set(-30, 20, -40);
    this.scene.add(rim);
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}
