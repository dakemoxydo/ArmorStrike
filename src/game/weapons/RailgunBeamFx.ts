// ===== Визуальный луч рельсотрона: ЕДИНАЯ электрическая дуга =====
// M22: один слой вместо трёх (core/body/glow). «Обводок» больше нет: единственная
// ширина луча — это сама дуга, ни мягкого ореола, ни тело-цилиндра поверх ядра.
// Форму рисует шейдер, а не геометрия: 1D-шум вдоль оси луча даёт живой излом
// молнии, который скачко́м перестраивается uSnapRate раз/с и чуть «течёт» между
// перестройками. Толщина — пиксельный пол (VERTEX_SHADER): линия держит заданное
// число экранных пикселей на любой дистанции и жирнеет перспективой только вблизи
// дула. Пол считается от высоты окна и номинального fov (cssPxScale) — НИКАКИХ
// обращений к renderer/камере в момент рендера: цена ошибки в этом числе — разду́тая
// до невидимости трубка, а таких ошибок шейдер не прощает. Внутри этой ширины —
// жгут из нитей плюс неровность толщины по звеньям, чтобы жирная линия осталась
// разрядом, а не залитым цилиндром.
// Выделен из RailgunWeapon: владеет mesh'ем, PointLight и fade.
// Чисто визуально — уроном / hitscan не занимается.
// Perf: свет берётся из LightRig и НИКОГДА не добавляется/не удаляется из
// сцены — смена числа источников заставляет three пересобирать программу
// каждому lit-материалу и компилировать GLSL прямо в кадре выстрела.
import * as THREE from 'three';
import { WEAPON_TUNING } from '../../core/catalog';
import type { LightRig } from '../effects/LightRig';

const tmpMid = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const tmpEnd = new THREE.Vector3();

/** Номинальный fov мировой камеры (RenderWorld / CameraRig держат 58°). */
const CAMERA_FOV_DEG = 58;
const NOMINAL_PROJ_Y = 1 / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV_DEG / 2));
/** CSS-размер окна (канвас во весь экран) с разумным диапазоном: ноль/Infinity
 *  из `innerWidth/innerHeight` иначе унёс бы либо толщину линии, либо весь экран. */
function cssViewport(): { w: number; h: number } {
  const rawW = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const rawH = typeof window === 'undefined' ? 720 : window.innerHeight;
  const num = (v: number, dflt: number) => (Number.isFinite(v) && v > 0 ? v : dflt);
  return {
    w: Math.min(8192, Math.max(160, num(rawW, 1280))),
    h: Math.min(8192, Math.max(110, num(rawH, 720))),
  };
}
/**
 * Мировых единиц на один CSS-пиксель на глубине 1: `2 / (H · projY)`. H — высота
 * окна, fov — номинальный: FOV-панч выстрела (±5.5°) меняет ширину линии на ~3 %,
 * и платить за точность обращением к живой камере нечем. Вне браузера (тесты) —
 * дефолт 720p. Диапазон — страховка: уронить пол в ноль или раздуть линию до
 * размера сцены хуже, чем ошибиться на пару пикселей. Покрывает окно от ~110 px.
 */
export function cssPxScale(): number {
  return Math.min(1e-2, Math.max(1e-4, 2 / (cssViewport().h * NOMINAL_PROJ_Y)));
}
/** NDC-шаг на один CSS-пиксель по X и Y: связывает пиксельную толщину с клипом. */
export function cssPxToNdc(target: THREE.Vector2): THREE.Vector2 {
  const { w, h } = cssViewport();
  return target.set(2 / w, 2 / h);
}

const PUNCH_DUR = 0.055;
/** Длительность вспышки impact-light на каждом импакт-событии фронта (сек).
 *  `impactPulse` — envelope-пол, который update() пишет ПОВЕРХ fade-кривой
 *  (max): прежний «bump» в setImpactPosition перезаписывался фейдом в том же
 *  кадре, и вспышек пробитий фактически не было. */
const IMPACT_PULSE_DUR = 0.12;

/**
 * Слоты `beam[0]/beam[1]` — постоянный бюджет LightRig на все рельсотроны,
 * но пишут в них только владельцы: show() забирает claim обоих слотов,
 * setLength/setImpactPosition/update пропускают чужие, hide()/dispose()
 * гасят и отпускают только собственные. Без арбитража второй одновременный
 * выстрел переставлял огни первого, а hide() доигравшего луча тушил свет
 * ещё живого (тот же подход, что арбитраж `flame` в FlameParticlePool).
 */
interface BeamLightClaim {
  muzzle: RailgunBeamFx | null;
  impact: RailgunBeamFx | null;
}
const BEAM_CLAIMS = new WeakMap<LightRig, BeamLightClaim>();

// Modest intensities/ranges — high values + many lights stall the GPU hard.
const MUZZLE_LIGHT_PEAK = 28;
const IMPACT_LIGHT_PEAK = 18;
const LIGHT_DIST = 12;
/** Rig channel indices: the pair is shared by all railgun instances. */
const MUZZLE_SLOT = 0;
const IMPACT_SLOT = 1;
const MUZZLE_LIGHT_COLOR = 0x2ee6c0;
const IMPACT_LIGHT_COLOR = 0xfff0a0;

/**
 * Внешность дуги — единый источник правды (GDD: `Weapon_Railgun.md` →
 * «Луч: единая электрическая дуга (M22)»). Экспортировано ради тестов: они
 * сверяются с этими числами, а не с продублированными литералами.
 */
export const BEAM_ARC = {
  /**
   * Перспективная база луча (мировые единицы): тоньше этой толщины линия не
   * становится никогда, а ближе к дулу она жирнеет по-настоящему.
   */
  radius: 0.06,
  /**
   * Пиксельный пол ширины линии, CSS-пиксели. Единица измерения — экран, а не
   * метры: на снайперской дистанции мировая толщина ушла бы в доли пикселя, а
   * физическая ширина разряда обязана оставаться читаемой.
   * 7 px было «еле видно»: яркость ядра упирается в плато ACES (~214 sRGB),
   * поднять её нельзя, поэтому читаемость добирается площадью — 12 px это
   * ~1 мм линии на экране и на дуельной, и на предельной дистанции.
   */
  pixelWidth: 12,
  /** Сегментов вдоль оси: ≥2.5 вершин на звено дуги даже на максимальной длине. */
  lengthSegments: 192,
  /**
   * Столбцов поперёк линии. Двух достаточно: координата `vWide` интерполируется
   * линейно, а весь профиль (ядро, нити) считается во фрагменте с неё.
   */
  widthSegments: 2,
  /** Длина «звена» дуги в мировых единицах: чем короче, тем чаще изломы. */
  cellLength: 1.8,
  /** Амплитуда излома в покое (мировые единицы). */
  amplitude: 0.3,
  /** Полных перестроек формы в секунду (0 = статичный след разряда в пространстве, как у спирали). */
  snapRate: 0,
  /** Первые N мировых единиц от дула дуга прямая — иначе линия липнет к стволу. */
  muzzleStraight: 1.2,
  /** Кадр выстрела: дуга толще и «расслабленнее», затем стягивается в провод. */
  punchScale: 1.9,
  /** Неровность толщины вдоль дуги (±доля): звенья то раздувает, то ссыхает. */
  thicknessNoise: 0.3,
  /**
   * Резкость горячего ядра внутри ширины: профиль `pow(1 − |vWide|, coreExp)`.
   * На риббоне экспонента заведомо меньше трубочной (3): 1 − |v| падает от центра
   * к кромке линейно, и при 3 видимая полоса сжалась бы обратно в ~4 px.
   */
  coreExp: 2,
  /** Число нитей жгута внутри одной линии (на 12 px их должно быть больше). */
  filaments: 4,
  /** Глубина модуляции яркости нитей (0 = одна жила, 0.26 = ±26% поперёк линии). */
  strandAmount: 0.26,
  /**
   * Ядро пробивает ACES + порог bloom (0.85), но НЕ должно упираться в 255:
   * при 12 px и gain 2 плато ядра заливалось на 12 пикселей подряд, bloom
   * размазывал его до ~28 px, и жгут внутри линии переставал читаться (вместо
   * электричества — светящаяся кишка). Вклад аддитивного слоя = яркость ×
   * площадь, поэтому с шириной gain уехал вниз: плато ~235, нити видны.
   */
  gain: 1.5,
  /**
   * Кривая гашения: `uOpacity = t^fadeExp`, `t` — остаток жизни. Линейное
   * затухание (fadeExp = 1) съедало половину яркости уже к середине жизни, и на
   * светлом фоне дневной карты трассер становился «еле виден» ровно тогда, когда
   * его и видно лучше всего. 0.45: до половины жизни линия держит ~73% яркости,
   * а гаснет так же полностью и за то же `beamDuration`.
   */
  fadeExp: 0.45,
  /** Цвет ядра / цвет кромки линии. */
  coreColor: 0xffffff,
  edgeColor: 0x8fffe8,
  // --- Спираль вокруг луча (Variant A — винтовая линия, статичный след) ---
  /** Радиус витка спирали в мировых единицах (широкий соленоид вокруг луча). */
  spiralRadius: 0.85,
  /** Длина одного полного витка спирали вдоль луча (метры, угол витка ~45°). */
  spiralPitch: 5.2,
  /** Дистанция от дула, на которой радиус спирали плавно нарастает от 0 (защита прицела). */
  spiralMuzzleSafe: 3.0,
  /** Экранная толщина линии спирали в CSS-пикселях. */
  spiralPixelWidth: 4.5,
  /** Цвет плазменной спирали. */
  spiralColor: 0x8fffe8,
  /** Множитель светимости спирали. */
  spiralGain: 1.4,
} as const;

/**
 * Вершины: форма дуги = 1D value-noise по дистанции вдоль луча. Аргумент шума —
 * `t * uCells`, где `uCells = длина / cellLength`, т.е. это мировая дистанция в
 * «звенах»: пока фронт бежит (setLength), уже нарисованная часть луча форму не
 * меняет, дуга просто растёт из дула.
 * Геометрия — лента из двух колонок: `position.z` даёт дистанцию вдоль оси,
 * `position.x` — поперечную координату `vWide` (−1..1). Толщина назначается
 * ПОСЛЕ проекции: в CSS-пикселях и перпендикулярно спроецированной оси. Push
 * вдоль мирового радиала (как было раньше) схлопывался в ноль, когда луч уходит
 * от камеры, — а в шутере это основной ракурс, поэтому «пол в пикселях» на
 * экране оставался 1–2 px и линия была еле заметной.
 */
// Шейдер и геометрия дуги экспортированы для NanoBeamFx («Изида»): один источник
// правды на форму разряда, различия — только в uniform'ах и палитре.
export const VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uAmp;
uniform float uCells;
uniform float uLen;
uniform float uSnap;
uniform float uStraight;
uniform float uRadius;
uniform float uPxWidth;
uniform float uPxScale;
uniform float uThick;
uniform vec2 uPxToNdc;

uniform float uSpiralRadius;
uniform float uSpiralPitch;
uniform float uSpiralSafe;
uniform float uSpiralPxWidth;

varying float vT;
varying float vWide;
varying float vPhase;
varying float vSpark;
varying float vFlicker;
varying float vIsSpiral;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float vnoise1(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash11(i), hash11(i + 1.0), u) * 2.0 - 1.0;
}

// Профиль дуги: статичный след разряда в пространстве (подобно спирали, форма
// не ползёт во времени, а фиксируется вдоль мировой дистанции).
float arcProfile(float x, float seed) {
  return vnoise1(x + seed) * 0.72 + vnoise1(x * 2.3 + seed * 1.7) * 0.28;
}

void main() {
  float t = position.z + 0.5;            // геометрия: ось вдоль +Z, длина 1
  vT = t;
  vWide = position.x;                    // −1..1 поперёк линии (экранный профиль)
  float isSpiral = position.y;           // 0 = центральный луч, 1 = спираль
  vIsSpiral = isSpiral;

  vec3 ax = normalize(modelMatrix[0].xyz);
  vec3 ay = normalize(modelMatrix[1].xyz);
  vec3 axis = normalize(modelMatrix[2].xyz);
  float rs = max(length(modelMatrix[0].xyz), 1e-4);   // радиальный масштаб = punch

  vec3 world;
  float rPx;

  if (isSpiral > 0.5) {
    // Спираль: винтовая линия вокруг луча (статичный след в пространстве)
    float worldDist = t * uLen;
    float spiralGrow = smoothstep(0.0, uSpiralSafe, worldDist);
    float angle = worldDist * (6.2831853 / uSpiralPitch);
    vec2 helixOffset = vec2(cos(angle), sin(angle)) * (uSpiralRadius * spiralGrow * rs);
    world = (modelMatrix * vec4(0.0, 0.0, position.z, 1.0)).xyz
          + ax * helixOffset.x + ay * helixOffset.y;
    rPx = uSpiralPxWidth * 0.5 * rs;
    vPhase = 0.0;
    vSpark = 1.0;
    vFlicker = 1.0;
  } else {
    // Центральный луч: электрическая дуга (статичный след в пространстве, как спираль)
    float snapSeed = floor(uSeed) * 11.31 + floor(uTime * uSnap) * 11.31;
    float x = t * uCells;
    float grow = smoothstep(0.0, uStraight, t * uLen);
    vec2 j = vec2(arcProfile(x, snapSeed), arcProfile(x + 57.13, snapSeed + 7.31));
    world = (modelMatrix * vec4(0.0, 0.0, position.z, 1.0)).xyz
          + (ax * j.x + ay * j.y) * (uAmp * grow);

    vec4 mvPos = viewMatrix * vec4(world, 1.0);
    float depth = max(-mvPos.z, 1e-4);
    float lump = 1.0 + uThick * arcProfile(x * 1.7 + 41.3, snapSeed + 3.17);
    float basePx = (uRadius * rs * lump) / (depth * uPxScale);
    rPx = max(uPxWidth * 0.5 * rs, basePx) * lump;

    vPhase = x * 2.1;
    vSpark = 0.68 + 0.32 * hash11(floor(x * 2.0) + snapSeed);
    vFlicker = 1.0;
  }

  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  vec4 clip = projectionMatrix * mvPosition;

  vec4 axClip = projectionMatrix * vec4((viewMatrix * vec4(axis, 0.0)).xyz, 0.0);
  float w = max(clip.w, 1e-4);
  vec2 dNdc = (axClip.xy * w - clip.xy * axClip.w) / (w * w);
  vec2 dPx = vec2(dNdc.x / uPxToNdc.x, dNdc.y / uPxToNdc.y);
  float dl = length(dPx);
  vec2 perp = dl > 1e-4 ? vec2(-dPx.y, dPx.x) / dl : vec2(1.0, 0.0);
  clip.xy += perp * (vWide * rPx) * uPxToNdc * w;

  gl_Position = clip;
}
`;

/**
 * Фрагменты: ядро линии там, где поверхность трубки смотрит в камеру, к кромкам
 * мягко гаснет.
 */
export const FRAGMENT_SHADER = /* glsl */ `
uniform float uOpacity;
uniform float uGain;
uniform float uCoreExp;
uniform float uFilaments;
uniform float uStrandAmt;
uniform vec3 uCoreColor;
uniform vec3 uEdgeColor;

uniform vec3 uSpiralColor;
uniform float uSpiralGain;

varying float vT;
varying float vWide;
varying float vPhase;
varying float vSpark;
varying float vFlicker;
varying float vIsSpiral;

void main() {
  if (vIsSpiral > 0.5) {
    // Спираль: мягкая светящаяся линия плазмы
    float core = pow(max(0.0, 1.0 - abs(vWide)), 1.4);
    if (core <= 0.005) discard;
    float head = 1.0 + 0.3 * smoothstep(0.86, 1.0, vT);
    float a = uOpacity * core * head * uSpiralGain;
    vec3 col = uSpiralColor;
    gl_FragColor = vec4(col * a, a);
  } else {
    // Центральный луч: горячая нить со жгутом и мерцанием
    float core = pow(max(0.0, 1.0 - abs(vWide)), uCoreExp);
    if (core <= 0.002) discard;
    float s = 0.5 + 0.5 * cos(vWide * 3.14159265 * uFilaments + vPhase);
    float strands = 1.0 - uStrandAmt + 2.0 * uStrandAmt * pow(s, 1.5);
    float head = 1.0 + 0.5 * smoothstep(0.86, 1.0, vT);
    float a = uOpacity * core * strands * vSpark * vFlicker * head * uGain;
    vec3 col = mix(uEdgeColor, uCoreColor, pow(core, 2.4));
    gl_FragColor = vec4(col * a, a);
  }

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Shared geometry across all beam instances (perf: avoid rebuilding the strip).
 * Ref-counted: each RailgunBeamFx instance acquires on construction and releases
 * on dispose; the geometry is disposed only when the last user is gone (fixes
 * module-level leak under hot-reload / repeated test runs).
 */
const SHARED_GEO_REFS = new Map<number, { geo: THREE.BufferGeometry; refs: number }>();

export function acquireSharedBeamGeo(radius: number): THREE.BufferGeometry {
  let entry = SHARED_GEO_REFS.get(radius);
  if (!entry) {
    // Две ленты в одной BufferGeometry (один draw call, без дополнительных мешей):
    // 1. Центральный луч: position.y = 0
    // 2. Спираль вокруг луча: position.y = 1
    // Ось вдоль +Z (длина 1 — масштабируется mesh.scale.z), position.x = vWide ∈ [−1, 1]
    // поперёк линии. Нормалей нет: профиль считается из vWide во фрагменте.
    const rows = BEAM_ARC.lengthSegments + 1;
    const cols = Math.max(2, BEAM_ARC.widthSegments);
    const stripVerts = rows * cols;
    const totalVerts = stripVerts * 2;
    const pos = new Float32Array(totalVerts * 3);
    const idx: number[] = [];

    // Полоса 1: центральный разряд (isSpiral = 0)
    let p = 0;
    for (let r = 0; r < rows; r += 1) {
      const z = r / (rows - 1) - 0.5;
      for (let c = 0; c < cols; c += 1) {
        pos[p] = (c / (cols - 1)) * 2 - 1;
        pos[p + 1] = 0;
        pos[p + 2] = z;
        p += 3;
      }
    }
    for (let r = 0; r < rows - 1; r += 1) {
      for (let c = 0; c < cols - 1; c += 1) {
        const a = r * cols + c;
        const b = a + cols;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }

    // Полоса 2: спираль вокруг луча (isSpiral = 1)
    const spiralOffset = stripVerts;
    for (let r = 0; r < rows; r += 1) {
      const z = r / (rows - 1) - 0.5;
      for (let c = 0; c < cols; c += 1) {
        pos[p] = (c / (cols - 1)) * 2 - 1;
        pos[p + 1] = 1;
        pos[p + 2] = z;
        p += 3;
      }
    }
    for (let r = 0; r < rows - 1; r += 1) {
      for (let c = 0; c < cols - 1; c += 1) {
        const a = spiralOffset + r * cols + c;
        const b = a + cols;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    entry = { geo, refs: 0 };
    SHARED_GEO_REFS.set(radius, entry);
  }
  entry.refs += 1;
  return entry.geo;
}

export function releaseSharedBeamGeo(radius: number): void {
  const entry = SHARED_GEO_REFS.get(radius);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    entry.geo.dispose();
    SHARED_GEO_REFS.delete(radius);
  }
}

export class RailgunBeamFx {
  private mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private uni: {
    uTime: { value: number };
    uSeed: { value: number };
    uOpacity: { value: number };
    uAmp: { value: number };
    uCells: { value: number };
    uLen: { value: number };
    uSnap: { value: number };
    uStraight: { value: number };
    uRadius: { value: number };
    uPxWidth: { value: number };
    uPxScale: { value: number };
    uPxToNdc: { value: THREE.Vector2 };
    uThick: { value: number };
    uGain: { value: number };
    uCoreExp: { value: number };
    uFilaments: { value: number };
    uStrandAmt: { value: number };
    uCoreColor: { value: THREE.Color };
    uEdgeColor: { value: THREE.Color };
    uSpiralRadius: { value: number };
    uSpiralPitch: { value: number };
    uSpiralSafe: { value: number };
    uSpiralPxWidth: { value: number };
    uSpiralColor: { value: THREE.Color };
    uSpiralGain: { value: number };
  };
  private muzzleLight: THREE.PointLight;
  private impactLight: THREE.PointLight;
  private beamFadeTimer = 0;
  private punchTimer = 0;
  /** Envelope вспышки impact-light (0..1, затухает за IMPACT_PULSE_DUR). */
  private impactPulse = 0;
  /** Локальные часы шейдера: идут, только пока луч жив. */
  private time = 0;
  private rayLength = 1;
  /** Beam frame captured at show(): origin + direction, so length can change later. */
  private beamOrigin = new THREE.Vector3();
  private beamDir = new THREE.Vector3(0, 0, 1);

  constructor(private scene: THREE.Scene, private rig: LightRig) {
    this.uni = {
      uTime: { value: 0 },
      uSeed: { value: 1.0 },
      uOpacity: { value: 0 },
      uAmp: { value: BEAM_ARC.amplitude },
      uCells: { value: 1 },
      uLen: { value: 1 },
      uSnap: { value: BEAM_ARC.snapRate },
      uStraight: { value: BEAM_ARC.muzzleStraight },
      uRadius: { value: BEAM_ARC.radius },
      uPxWidth: { value: BEAM_ARC.pixelWidth },
      uPxScale: { value: cssPxScale() },
      uPxToNdc: { value: cssPxToNdc(new THREE.Vector2()) },
      uThick: { value: BEAM_ARC.thicknessNoise },
      uGain: { value: BEAM_ARC.gain },
      uCoreExp: { value: BEAM_ARC.coreExp },
      uFilaments: { value: BEAM_ARC.filaments },
      uStrandAmt: { value: BEAM_ARC.strandAmount },
      uCoreColor: { value: new THREE.Color(BEAM_ARC.coreColor) },
      uEdgeColor: { value: new THREE.Color(BEAM_ARC.edgeColor) },
      uSpiralRadius: { value: BEAM_ARC.spiralRadius },
      uSpiralPitch: { value: BEAM_ARC.spiralPitch },
      uSpiralSafe: { value: BEAM_ARC.spiralMuzzleSafe },
      uSpiralPxWidth: { value: BEAM_ARC.spiralPixelWidth },
      uSpiralColor: { value: new THREE.Color(BEAM_ARC.spiralColor) },
      uSpiralGain: { value: BEAM_ARC.spiralGain },
    };

    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uni,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      // Лента лежит в плоскости оси луча, а раздвигается в экранных пикселях —
      // намотка может оказаться обратной относительно камеры.
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      // rgb уже умножен на вклад яркости, поэтому просим GPU не домножать ещё
      // и на srcAlpha: иначе fade и ширина линии ушли бы по a².
      premultipliedAlpha: true,
      // Туман сцены начинается за пределами дистанции луча (fogNear 108+,
      // range 120), а аддитивному разряду он и не нужен: смешивание с цветом
      // тумана только замусорило бы линию.
      fog: false,
    });

    this.mesh = new THREE.Mesh(acquireSharedBeamGeo(BEAM_ARC.radius), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.matrixAutoUpdate = true;
    this.scene.add(this.mesh);

    // Rig lights are permanently attached; a beam only writes to them.
    this.muzzleLight = rig.light('beam', MUZZLE_SLOT);
    this.impactLight = rig.light('beam', IMPACT_SLOT);
  }

  /** Claim-запись рига для этого луча (создаётся при первом show). */
  private beamClaim(): BeamLightClaim {
    let claim = BEAM_CLAIMS.get(this.rig);
    if (!claim) {
      claim = { muzzle: null, impact: null };
      BEAM_CLAIMS.set(this.rig, claim);
    }
    return claim;
  }

  /**
   * Гасит и отпускает только те общие слоты, которыми владеет ЭТОТ луч.
   * Свет остаётся прикреплённым к сцене (бюджет LightRig не меняется).
   */
  private releaseLights() {
    const claim = this.beamClaim();
    if (claim.muzzle === this) {
      claim.muzzle = null;
      this.muzzleLight.intensity = 0;
    }
    if (claim.impact === this) {
      claim.impact = null;
      this.impactLight.intensity = 0;
    }
  }

  /** Place/scale the arc tube and re-seed the along-beam noise for this length. */
  private layoutBeam(): void {
    tmpMid.copy(this.beamOrigin).addScaledVector(this.beamDir, this.rayLength * 0.5);
    tmpLook.copy(this.beamOrigin).addScaledVector(this.beamDir, this.rayLength + 1);

    this.mesh.position.copy(tmpMid);
    this.mesh.scale.set(this.punchWidth(), this.punchWidth(), this.rayLength);
    this.mesh.lookAt(tmpLook);

    this.uni.uLen.value = this.rayLength;
    this.uni.uCells.value = Math.max(1, this.rayLength / BEAM_ARC.cellLength);
  }

  /** Текущий радиальный масштаб (1 в покое, punchScale в кадр выстрела). */
  private punchWidth(): number {
    if (this.punchTimer <= 0) return 1;
    const u = 1 - this.punchTimer / PUNCH_DUR;
    const ease = 1 - (1 - u) * (1 - u);
    return THREE.MathUtils.lerp(BEAM_ARC.punchScale, 1, ease);
  }

  /** Показать луч от muzzle вдоль dir на длину rayLength; punch + fade. */
  show(muzzle: THREE.Vector3, dir: THREE.Vector3, rayLength: number) {
    this.beamOrigin.copy(muzzle);
    this.beamDir.copy(dir);
    this.rayLength = Math.max(0.5, rayLength);

    // Само-восстановление: mesh мог остаться без родителя (пересборка арены или
    // teardown сцены между выстрелами) — иначе луч молча не рендерился бы.
    if (this.mesh.parent !== this.scene) this.scene.add(this.mesh);
    // Окно могли ресайзнуть между выстрелами — пиксельный пол пересчитывается.
    this.uni.uPxScale.value = cssPxScale();
    cssPxToNdc(this.uni.uPxToNdc.value);
    this.uni.uSeed.value = Math.random() * 1000 + 1.0;

    this.punchTimer = PUNCH_DUR;
    this.impactPulse = 0;
    // Забираем claim общих слотов: с этого кадра чужие инстансы не пишут в
    // наши огни, а их hide() их не тушит.
    const claim = this.beamClaim();
    claim.muzzle = this;
    claim.impact = this;
    this.layoutBeam();
    this.uni.uAmp.value = BEAM_ARC.amplitude * BEAM_ARC.punchScale;
    this.mesh.visible = true;
    this.uni.uOpacity.value = 1;

    this.beamFadeTimer = WEAPON_TUNING.railgun.beamDuration;

    tmpEnd.copy(this.beamOrigin).addScaledVector(this.beamDir, this.rayLength);
    // Colors/distances are re-applied on every show(): the rig slots are shared
    // with other railgun instances and with the flame channel's neighbours.
    this.rig.set('beam', MUZZLE_SLOT, muzzle, MUZZLE_LIGHT_COLOR, MUZZLE_LIGHT_PEAK, LIGHT_DIST);
    this.rig.set('beam', IMPACT_SLOT, tmpEnd, IMPACT_LIGHT_COLOR, IMPACT_LIGHT_PEAK, LIGHT_DIST);
  }

  /**
   * Shorten the visible beam to `dist` (a wall/block stopped it earlier than
   * the initial range) and move the impact light to the new beam end.
   * M18 fix: previously only the light moved — the mesh kept drawing
   * straight through the wall to full range (GDD: walls stop the beam).
   */
  setLength(dist: number) {
    if (!this.mesh.visible) return; // no active beam to shorten
    this.rayLength = Math.max(0.5, dist);
    this.layoutBeam();
    if (this.beamClaim().impact === this) {
      tmpEnd.copy(this.beamOrigin).addScaledVector(this.beamDir, this.rayLength);
      this.impactLight.position.copy(tmpEnd);
    }
  }

  /**
   * Позиция impact-light (последнее попадание по танку / стене) + вспышка.
   * Пишет только владелец слота: чужой вызов — no-op, иначе два луча
   * перетягивают один общий огонь.
   */
  setImpactPosition(p: THREE.Vector3) {
    if (this.beamClaim().impact !== this) return;
    this.impactLight.position.copy(p);
    // Полная перезарядка envelope: update() пишет max(fade, pulse), поэтому
    // импакт виден и на середине кривой гашения.
    this.impactPulse = 1;
  }

  /** Мгновенно скрыть луч и погасить свет (смерть владельца mid-fade). */
  hide() {
    this.mesh.visible = false;
    this.uni.uOpacity.value = 0;
    this.beamFadeTimer = 0;
    this.punchTimer = 0;
    this.impactPulse = 0;
    this.releaseLights();
  }

  /**
   * Затухание дуги + radial punch settle + часы шейдера.
   * Punch тянет за собой и ширину, и амплитуду излома: кадр выстрела — широкая
   * «разболтанная» дуга, дальше она стягивается в натянутый провод, и уже
   * натянутая гаснет по uOpacity. Радиальный масштаб mesh'а (scale.x/y) — не
   * габарит геометрии, а именно множитель толщины: его читает шейдер как `punch`.
   */
  update(dt: number) {
    const live = this.beamFadeTimer > 0 || this.punchTimer > 0;
    if (!live) return;
    this.time += dt;
    this.uni.uTime.value = this.time;

    if (this.punchTimer > 0) {
      this.punchTimer = Math.max(0, this.punchTimer - dt);
      const p = this.punchWidth();
      this.mesh.scale.x = this.mesh.scale.y = p;
      this.uni.uAmp.value = BEAM_ARC.amplitude * p;
    }

    if (this.beamFadeTimer <= 0) return;

    this.beamFadeTimer -= dt;
    const dur = WEAPON_TUNING.railgun.beamDuration;
    const t = Math.max(0, this.beamFadeTimer / dur);
    // Гаснет по кривой (BEAM_ARC.fadeExp): трассеру важно быть ярким в ПЕРВУЮ
    // половину жизни — именно там его замечает глаз, а к концу он всё равно
    // схлопывается в ноль. Огни (вспышка/терминус) остаются на линейном t:
    // их пики подобрались под быстрый спад, а не под площадную читаемость.
    const op = Math.pow(t, BEAM_ARC.fadeExp);

    if (this.impactPulse > 0) {
      this.impactPulse = Math.max(0, this.impactPulse - dt / IMPACT_PULSE_DUR);
    }
    this.uni.uOpacity.value = op;
    // Общие слоты `beam`: пишет только владелец claim (show() последнего луча).
    const claim = this.beamClaim();
    if (claim.muzzle === this) this.muzzleLight.intensity = t * t * MUZZLE_LIGHT_PEAK;
    if (claim.impact === this) {
      // Вспышка импактов — envelope-пол поверх линейного спада (fix: прежний
      // bump из setImpactPosition перезаписывался этой строкой в том же кадре).
      this.impactLight.intensity = Math.max(t, this.impactPulse) * IMPACT_LIGHT_PEAK;
    }

    if (this.beamFadeTimer <= 0) {
      this.hide();
    }
  }

  dispose() {
    this.releaseLights();
    this.scene.remove(this.mesh);
    this.mat.dispose();
    // Rig lights are shared and scene-owned — never disposed here.
    // Shared geometry is ref-counted — release our references last.
    releaseSharedBeamGeo(BEAM_ARC.radius);
  }
}
