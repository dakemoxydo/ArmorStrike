import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RailgunBeamFx, BEAM_ARC } from '../game/weapons/RailgunBeamFx';
import { LightRig, LIGHT_CHANNEL_CAPACITY } from '../game/effects/LightRig';
import { WEAPON_TUNING } from '../core/catalog';

/** Rig capacity of the whole scene — the light count must never change. */
const RIG_LIGHTS =
  LIGHT_CHANNEL_CAPACITY.flash + LIGHT_CHANNEL_CAPACITY.beam + LIGHT_CHANNEL_CAPACITY.flame;

function makeFx() {
  const scene = new THREE.Scene();
  const rig = new LightRig(scene);
  const fx = new RailgunBeamFx(scene, rig);
  const meshes = () => scene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
  const lightCount = () => scene.children.filter((c) => c instanceof THREE.PointLight).length;
  const mat = () => meshes()[0].material as THREE.ShaderMaterial;
  const uni = () => mat().uniforms;
  return {
    scene,
    rig,
    fx,
    meshes,
    mat,
    uni,
    lightCount,
    muzzleLight: rig.light('beam', 0),
    impactLight: rig.light('beam', 1),
  };
}

describe('RailgunBeamFx', () => {
  it('M22: ровно один слой — никаких core/body/glow обводок поверх линии', () => {
    const { scene, fx, meshes, mat, lightCount } = makeFx();

    expect(meshes()).toHaveLength(1);
    const material = mat();
    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    // Форма дуги живёт в шейдере, а не в наложенных мешах-ореолах.
    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(scene.children.length).toBe(RIG_LIGHTS + 1);

    fx.dispose();
    expect(lightCount()).toBe(RIG_LIGHTS);
  });

  it('M22: пиксельный пол ширины считается из высоты окна, без жизни в кадре рендера', () => {
    const { fx, meshes, uni } = makeFx();
    const scale = uni().uPxScale.value as number;

    // Конечное и в зажатом диапазоне: 0 = луч исчез, раздутая трубка = камера
    // внутри трубки = все фрагменты отсекаются. Оба варианта — «эффекта нет».
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThanOrEqual(1e-4);
    expect(scale).toBeLessThanOrEqual(1e-2);
    expect(uni().uPxWidth.value).toBe(BEAM_ARC.pixelWidth);
    // Масштаб = 2/(H · projY) на фактической высоте окна (в node без DOM или с
    // нулевой высотой — дефолт 720p, как в самом модуле).
    const win = typeof window === 'undefined' ? undefined : window;
    const h = win && win.innerHeight > 0 ? win.innerHeight : 720;
    const projY = 1 / Math.tan(THREE.MathUtils.degToRad(58 / 2));
    expect(scale).toBeCloseTo(2 / (h * projY), 9);
    // Никаких хуков в момент рендера: прежний onBeforeRender давал шейдеру
    // состояние renderer/camera, которого эффект не переживёт, если то врастёт
    // в неадекватные величины (ortho-камера, resize с нулевой высотой).
    expect(Object.prototype.hasOwnProperty.call(meshes()[0], 'onBeforeRender')).toBe(false);

    fx.dispose();
  });

  it('show() возвращает mesh в сцену, если тот остался без родителя', () => {
    const { scene, fx, meshes } = makeFx();
    fx.show(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 30);
    expect(meshes()).toHaveLength(1);

    // Пересборка арены / teardown сцены между выстрелами снимает mesh с родителя.
    scene.remove(meshes()[0]);
    expect(meshes()).toHaveLength(0);

    fx.show(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), 30);
    expect(meshes()).toHaveLength(1); // само-восстановление, луч снова рендерится
    expect(meshes()[0].visible).toBe(true);

    fx.dispose();
  });

  it('M22: числа тюнинга доезжают до uniform’ов, а не дублируются в шейдере', () => {
    const { fx, uni } = makeFx();
    const map = {
      radius: 'uRadius',
      pixelWidth: 'uPxWidth',
      thicknessNoise: 'uThick',
      amplitude: 'uAmp',
      snapRate: 'uSnap',
      muzzleStraight: 'uStraight',
      coreExp: 'uCoreExp',
      filaments: 'uFilaments',
      strandAmount: 'uStrandAmt',
      gain: 'uGain',
      spiralRadius: 'uSpiralRadius',
      spiralPitch: 'uSpiralPitch',
      spiralMuzzleSafe: 'uSpiralSafe',
      spiralPixelWidth: 'uSpiralPxWidth',
      spiralGain: 'uSpiralGain',
    } as const;
    for (const [key, uniform] of Object.entries(map)) {
      expect(uni()[uniform].value).toBe(BEAM_ARC[key as keyof typeof BEAM_ARC]);
    }
    // Страховка от «опять слишком тонкий»: пол не меньше 6 px, ядро острее
    // прежнего (ширина выросла — нить должна остаться нитью), яркость
    // компенсирована под возросшую площадь аддитивного слоя.
    // Ширина — пиксельный пол, и он не должен деградировать в «ниточку»:
    // 12 CSS-px (~1 мм на экране) держатся и на дуельной, и на предельной дистанции.
    expect(BEAM_ARC.pixelWidth).toBeGreaterThanOrEqual(10);
    expect(BEAM_ARC.coreExp).toBeGreaterThan(1.7);
    expect(BEAM_ARC.gain).toBeGreaterThan(1.2);
    expect(BEAM_ARC.gain).toBeLessThan(2.2);
    // Гаснуть — не линейно: иначе трассер «еле виден» уже на середине жизни.
    expect(BEAM_ARC.fadeExp).toBeGreaterThan(0);
    expect(BEAM_ARC.fadeExp).toBeLessThan(0.8);
    // Параметры спирали вокруг луча (Variant A)
    expect(BEAM_ARC.spiralRadius).toBeGreaterThan(0.2);
    expect(BEAM_ARC.spiralPitch).toBeGreaterThan(2);
    expect(BEAM_ARC.spiralMuzzleSafe).toBeGreaterThan(1.5);

    fx.dispose();
  });

  it('геометрия объединяет центральный луч и спираль в один BufferGeometry (один draw call)', () => {
    const { fx, meshes } = makeFx();
    const geo = meshes()[0].geometry;
    const pos = geo.getAttribute('position');
    const rows = BEAM_ARC.lengthSegments + 1;
    const cols = BEAM_ARC.widthSegments;
    const expectedVerts = rows * cols * 2; // 2 полосы: луч и спираль
    expect(pos.count).toBe(expectedVerts);

    // Первые vertices — луч (y = 0), вторые — спираль (y = 1)
    const stripVerts = rows * cols;
    expect(pos.getY(0)).toBe(0);
    expect(pos.getY(stripVerts - 1)).toBe(0);
    expect(pos.getY(stripVerts)).toBe(1);
    expect(pos.getY(expectedVerts - 1)).toBe(1);

    // Индексы покрывают обе полосы
    const index = geo.getIndex();
    expect(index).not.toBeNull();
    const expectedIndices = (rows - 1) * (cols - 1) * 6 * 2;
    expect(index!.count).toBe(expectedIndices);

    fx.dispose();
  });

  it('show places the arc + lights; update fades; dispose removes the mesh', () => {
    const { scene, fx, meshes, uni, lightCount, muzzleLight, impactLight } = makeFx();

    // Idle: one beam mesh, hidden, no opacity, no light output.
    expect(meshes()).toHaveLength(1);
    expect(meshes()[0].visible).toBe(false);
    expect(uni().uOpacity.value).toBe(0);
    expect(muzzleLight.intensity).toBe(0);
    expect(impactLight.intensity).toBe(0);

    const muzzle = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, 1);
    fx.show(muzzle, dir, 40);

    const beam = meshes()[0];
    expect(beam.visible).toBe(true);
    expect(beam.scale.z).toBe(40);
    // Мировая длина известна шейдеру: по ней считается число звеньев дуги.
    expect(uni().uLen.value).toBe(40);
    expect(uni().uCells.value).toBeCloseTo(40 / BEAM_ARC.cellLength, 5);
    expect(uni().uOpacity.value).toBe(1);

    // Lights are rig slots: written on show, never attached/detached.
    expect(muzzleLight.intensity).toBeGreaterThan(0);
    expect(impactLight.intensity).toBeGreaterThan(0);
    expect(impactLight.position.z).toBeCloseTo(40, 5);
    // Colors are re-applied per show (slots are shared across instances).
    expect(muzzleLight.color.getHex()).toBe(0x2ee6c0);
    expect(impactLight.color.getHex()).toBe(0xfff0a0);

    const dur = WEAPON_TUNING.railgun.beamDuration;
    // Четверть жизни прошла — а линия всё ещё на ~88% яркости (fadeExp < 1):
    // при линейном затухании трассер «еле виден» уже в самом начале.
    fx.update(dur * 0.25);
    expect(uni().uOpacity.value).toBeGreaterThan(0.85);
    expect(BEAM_ARC.fadeExp).toBeLessThan(1);

    fx.update(dur * 0.25);
    expect(uni().uOpacity.value).toBeCloseTo(Math.pow(0.5, BEAM_ARC.fadeExp), 5);
    expect(uni().uTime.value).toBeCloseTo(dur * 0.5, 5);

    fx.update(dur * 0.5 + 0.001);
    expect(meshes()[0].visible).toBe(false);
    expect(uni().uOpacity.value).toBe(0);
    // Faded: lights extinguished in place, scene light count unchanged.
    expect(muzzleLight.intensity).toBe(0);
    expect(impactLight.intensity).toBe(0);
    expect(lightCount()).toBe(RIG_LIGHTS);

    fx.dispose();
    expect(meshes()).toHaveLength(0);
    // Rig lights belong to the scene, not to the beam fx.
    expect(lightCount()).toBe(RIG_LIGHTS);
    expect(scene.children.length).toBe(RIG_LIGHTS);
  });

  it('setImpactPosition moves impact light and re-arms the flash (owner writes only)', () => {
    const { fx, uni, impactLight } = makeFx();
    // Claim общего слота `beam` происходит в show(); без него запись — no-op.
    fx.show(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), 30);
    const afterShow = impactLight.intensity;
    const p = new THREE.Vector3(10, 2, -5);
    fx.setImpactPosition(p);

    expect(impactLight.position.x).toBe(10);
    expect(impactLight.position.y).toBe(2);
    expect(impactLight.position.z).toBe(-5);
    // Интенсивность — прерогатива update(): max(fade, pulse), не прямая запись.
    expect(impactLight.intensity).toBe(afterShow);
    // Позиция луча не зависит от импакта: сам он не двинулся.
    expect(uni().uLen.value).toBe(30);

    fx.dispose();
  });

  it('impact events flash above the fade curve, then settle back to it', () => {
    const { fx, impactLight } = makeFx();
    const dur = WEAPON_TUNING.railgun.beamDuration;
    fx.show(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), 100);
    // Полжизни позади: fade уже увёл свет вдвое от пика.
    fx.update(dur * 0.5);
    const faded = impactLight.intensity;
    expect(faded).toBeGreaterThan(0);
    // Bump больше не съедается fade-строкой того же кадра: вспышка — envelope-пол.
    fx.setImpactPosition(new THREE.Vector3(0, 1, 50));
    fx.update(0.001);
    expect(impactLight.intensity).toBeGreaterThan(faded);
    // После окна envelope остаётся только линейный спад.
    fx.update(0.15);
    expect(impactLight.intensity).toBeLessThan(faded);

    fx.dispose();
  });

  it('two beams, shared slot pair: last show claims; non-owner hide does not extinguish', () => {
    const scene = new THREE.Scene();
    const rig = new LightRig(scene);
    const a = new RailgunBeamFx(scene, rig);
    const b = new RailgunBeamFx(scene, rig);
    const muzzle = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, 1);
    a.show(muzzle, dir, 20);
    b.show(muzzle, dir, 60); // второй выстрел забрал общие слоты

    const impact = rig.light('beam', 1);
    expect(impact.position.z).toBeCloseTo(60, 5);

    a.setImpactPosition(new THREE.Vector3(9, 9, 9)); // не владелец — no-op
    expect(impact.position.z).toBeCloseTo(60, 5);

    a.update(0.2);
    a.hide(); // гасит только СВОИ слоты — чужой свет обязан выжить
    expect(impact.intensity).toBeGreaterThan(0);
    expect(rig.light('beam', 0).intensity).toBeGreaterThan(0);

    b.setLength(30); // владелец — свет едет за терminusом
    expect(impact.position.z).toBeCloseTo(30, 5);

    b.hide();
    expect(impact.intensity).toBe(0);
    a.dispose();
    b.dispose();
  });

  it('punch widens the arc and settles width + wiggle amplitude back to rest', () => {
    const { fx, meshes, uni } = makeFx();
    fx.show(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 20);

    const beam = meshes()[0];
    expect(beam.scale.x).toBeGreaterThan(1.5);
    expect(uni().uAmp.value).toBeGreaterThan(BEAM_ARC.amplitude);

    fx.update(0.06);
    expect(beam.scale.x).toBeCloseTo(1, 1);
    expect(beam.scale.y).toBeCloseTo(1, 1);
    expect(uni().uAmp.value).toBeCloseTo(BEAM_ARC.amplitude, 2);

    fx.dispose();
  });

  it('setLength shortens the arc mesh, re-seeds cells and moves the impact light', () => {
    const { fx, meshes, uni, impactLight } = makeFx();
    const muzzle = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(0, 0, 1);
    fx.show(muzzle, dir, 40);

    // M18 fix: previously only the light moved — the mesh kept drawing through walls.
    fx.setLength(20);
    const beam = meshes()[0];
    expect(beam.scale.z).toBe(20);
    // Midpoint should be at z = 10 (muzzle.z + 20/2).
    expect(beam.position.z).toBeCloseTo(10, 5);
    // Звенья — по мировой длине: уже нарисованная часть луча форму не меняет.
    expect(uni().uLen.value).toBe(20);
    expect(uni().uCells.value).toBeCloseTo(20 / BEAM_ARC.cellLength, 5);
    expect(impactLight.position.z).toBeCloseTo(20, 5);

    fx.dispose();
  });

  it('setLength is a no-op when no active beam', () => {
    const { scene, fx, lightCount } = makeFx();
    // No show() called — setLength must not throw or add children.
    expect(() => fx.setLength(10)).not.toThrow();
    expect(scene.children.length).toBe(RIG_LIGHTS + 1); // rig + idle mesh
    expect(lightCount()).toBe(RIG_LIGHTS);
    fx.dispose();
  });

  it('hide kills the arc instantly and stops the shader clock', () => {
    const { fx, meshes, uni, muzzleLight } = makeFx();
    fx.show(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 30);
    fx.update(0.02);
    const t = uni().uTime.value as number;
    expect(t).toBeGreaterThan(0);

    fx.hide();
    expect(meshes()[0].visible).toBe(false);
    expect(uni().uOpacity.value).toBe(0);
    expect(muzzleLight.intensity).toBe(0);

    fx.update(0.1);
    expect(uni().uTime.value).toBe(t); // часы идут только пока луч жив
    fx.dispose();
  });

  it('shared geometry is ref-counted: disposed only after last instance disposes', () => {
    const scene = new THREE.Scene();
    const rig = new LightRig(scene);
    const geoOf = (fx: RailgunBeamFx) => (Reflect.get(fx, 'mesh') as THREE.Mesh).geometry;
    const a = new RailgunBeamFx(scene, rig);
    const b = new RailgunBeamFx(scene, rig);
    a.dispose();
    // Second instance still alive → geometry NOT yet disposed.
    // Re-creating a third instance reuses the same shared geo (no duplicate construction).
    const c = new RailgunBeamFx(scene, rig);
    expect(geoOf(c)).toBe(geoOf(b));
    b.dispose();
    c.dispose();
    // After all instances gone, only the rig lights are left.
    expect(scene.children.filter((o) => o instanceof THREE.Mesh)).toHaveLength(0);
    expect(scene.children).toHaveLength(RIG_LIGHTS);
  });
});
