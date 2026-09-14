/**
 * Подсветка «враг в прицеле» (Target Highlight, P7):
 *  • selectAimedEnemy — конус/дальность/LOS/командность и выбор ближайшего к центру;
 *  • AimHighlighter — гистерезис удержания и мгновенный разрыв при смерти/потере LOS;
 *  • TargetHighlightStage — красная обводка (inverted hull + stencil-маска
 *    силуэта) на модели врага, сброс при смене цели, смерти игрока и
 *    очистке ростера.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AimHighlighter, aimConeRadFor, selectAimedEnemy } from '../game/targetHighlight';
import type { AimCone } from '../game/targetHighlight';
import { TargetHighlightStage } from '../game/engine/stages/TargetHighlightStage';
import type { FrameContext } from '../game/engine/stages/types';
import type { Arena } from '../game/Arena';
import { TankEntity } from '../game/Tank';
import type { TankParams, TankVisual } from '../game/tank/types';
import { colliderFromCenter } from '../game/engine/physics';
import type { Collider } from '../game/engine/physics';
import { TARGET_HIGHLIGHT } from '../game/tuning';
import { AIM_OUTLINE_KEY, getOutlineIntensity } from '../game/tank/modelOutline';
import type { TeamId } from '../game/match/matchTypes';

/** Конус игрока из (0,0) вдоль +Z с заданной полууглой/дальностью. */
function coneTo(halfRad: number, range = 75): AimCone {
  return { x: 0, z: 0, dirX: 0, dirZ: 1, halfCos: Math.cos(halfRad), range };
}

const EMPTY: Collider[] = [];

function cand(id: number, x: number, z: number, over: Partial<{ teamId: TeamId; alive: boolean }> = {}) {
  return {
    id,
    alive: true,
    teamId: null as TeamId,
    position: { x, z },
    ...over,
  };
}

describe('selectAimedEnemy', () => {
  const self = cand(0, 0, 0);

  it('берёт врага строго перед прицелом и отвергает вне конуса', () => {
    const ahead = cand(1, 0, 50);
    expect(selectAimedEnemy([self, ahead], self, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY)?.id).toBe(1);
    // 4 м в стороны на 50 м ≈ 4.6° > 4° — мимо.
    const wide = cand(2, 4, 50);
    expect(selectAimedEnemy([self, wide], self, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY)).toBeNull();
    // 2 м в стороны ≈ 2.3° — внутри.
    const near = cand(3, 2, 50);
    expect(selectAimedEnemy([self, near], self, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY)?.id).toBe(3);
  });

  it('дальность = range оружия', () => {
    const far = cand(1, 0, 76);
    expect(selectAimedEnemy([self, far], self, coneTo(TARGET_HIGHLIGHT.coneRad, 75), EMPTY)).toBeNull();
  });

  it('из нескольких целей в конусе выбирает ближайшую к центру', () => {
    const edge = cand(1, 2.5, 45);   // ≈3.2°
    const center = cand(2, 0, 50);   // 0°
    // center первым и крайним — порядок не важен, dot решает.
    expect(selectAimedEnemy([self, center, edge], self, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY)?.id).toBe(2);
    expect(selectAimedEnemy([self, edge, center], self, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY)?.id).toBe(2);
  });

  it('стена между игроком и целью снимает цель, но не «сжигает» остальных', () => {
    const wall = colliderFromCenter(0, 25, 2.4, 4, 3, 'block');
    const colliders = [wall];
    const behind = cand(1, 0, 50);          // за стеной — LOS перекрыт
    const open = cand(2, 2.5, 45);          // ≈3.2°, чистый коридор
    expect(selectAimedEnemy([self, behind], self, coneTo(TARGET_HIGHLIGHT.coneRad), colliders)).toBeNull();
    expect(selectAimedEnemy([self, behind, open], self, coneTo(TARGET_HIGHLIGHT.coneRad), colliders)?.id).toBe(2);
  });

  it('союзник по команде не подсвечивается; мёртвый — тоже', () => {
    const alphaSelf = { ...cand(0, 0, 0), teamId: 'alpha' as const };
    const ally = cand(1, 0, 50, { teamId: 'alpha' });
    const foe = cand(2, 0, 49, { teamId: 'bravo' });
    const s = selectAimedEnemy([alphaSelf, ally, foe], alphaSelf, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY);
    expect(s?.id).toBe(2);
    const deadFoe = { ...foe, alive: false };
    expect(selectAimedEnemy([alphaSelf, deadFoe], alphaSelf, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY)).toBeNull();
  });

  it('FFA: все посторонние — враги, сам себя не светим', () => {
    const bot = cand(7, 0, 50);
    expect(selectAimedEnemy([self, bot], self, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY)?.id).toBe(7);
    expect(selectAimedEnemy([self], self, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY)).toBeNull();
  });
});

describe('aimConeRadFor', () => {
  it('огнемёт — половинка своего боевого конуса, иначе узкий конус прицела', () => {
    expect(aimConeRadFor('flamethrower')).toBeCloseTo(Math.PI / 8, 5); // 45°/2 = 22.5°
    expect(aimConeRadFor('cannon')).toBe(TARGET_HIGHLIGHT.coneRad);
    expect(aimConeRadFor('railgun')).toBe(TARGET_HIGHLIGHT.coneRad);
    expect(aimConeRadFor(undefined)).toBe(TARGET_HIGHLIGHT.coneRad);
  });

  it('цель под 20° попадает только огнемёту', () => {
    const me = cand(0, 0, 0);
    const at20 = cand(1, 50 * Math.tan((20 * Math.PI) / 180), 50);
    expect(selectAimedEnemy([me, at20], me, coneTo(TARGET_HIGHLIGHT.coneRad), EMPTY)).toBeNull();
    expect(selectAimedEnemy([me, at20], me, coneTo(aimConeRadFor('flamethrower')), EMPTY)?.id).toBe(1);
  });
});

describe('AimHighlighter (гистерезис)', () => {
  const self = cand(0, 0, 0);

  it('после потери цели держит её holdSec и гаснет', () => {
    const hl = new AimHighlighter();
    const cone = coneTo(TARGET_HIGHLIGHT.coneRad);
    const enemy = cand(1, 0, 50);
    expect(hl.update(0.016, [self, enemy], self, cone, EMPTY)?.id).toBe(1);
    enemy.position.x = 30; // резко вне конуса
    // ~9 кадров по 16 мс удержание ещё живое (0.15 с), затем гаснет.
    expect(hl.update(0.016, [self, enemy], self, cone, EMPTY)?.id).toBe(1);
    for (let i = 0; i < 10; i++) hl.update(0.016, [self, enemy], self, cone, EMPTY);
    expect(hl.update(0.016, [self, enemy], self, cone, EMPTY)).toBeNull();
  });

  it('смерть или стена во время удержания рвёт подсветку сразу', () => {
    const hl = new AimHighlighter();
    const cone = coneTo(TARGET_HIGHLIGHT.coneRad);
    const enemy = cand(1, 0, 50);
    hl.update(0.016, [self, enemy], self, cone, EMPTY);
    enemy.alive = false;
    expect(hl.update(0.016, [self, enemy], self, cone, EMPTY)).toBeNull();

    const hl2 = new AimHighlighter();
    const enemy2 = cand(2, 0, 50);
    hl2.update(0.016, [self, enemy2], self, cone, EMPTY);
    const wall = colliderFromCenter(0, 25, 4, 4, 3, 'block'); // закрыла LOS
    expect(hl2.update(0.016, [self, enemy2], self, cone, [wall])).toBeNull();
  });
});

// ===== Стадия: обводка по силуэту врага (rim + core + halo) =====
// Слои режутся stencil-маской (mask-меш на каждую деталь), поэтому на каждый
// исходный меш приходится четвёрка: [mask, rim, core, halo].

function makeParams(over: Partial<TankParams> = {}): TankParams {
  return {
    maxHealth: 100, speed: 15, reverseSpeed: 9, turnSpeed: 2.5, turretSpeed: 10,
    damage: 32, shotCooldown: 0.28, weaponType: 'cannon', range: 75, ...over,
  };
}

/** Реальная THREE-модель: корпус (Standard) + командное кольцо (Basic — не обводится). */
function makeTank(over: Partial<TankParams> = {}): TankEntity {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshStandardMaterial());
  const teamRing = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.5, 36),
    new THREE.MeshBasicMaterial(),
  );
  group.add(body, teamRing);
  const visual = {
    group,
    hull: group,
    turret: new THREE.Group(),
    barrelGroup: new THREE.Group(),
    muzzle: new THREE.Object3D(),
    ring: teamRing,
    bodyMats: [],
    bodyBaseColors: [],
    trackTex: null as unknown as THREE.CanvasTexture,
  } as unknown as TankVisual;
  return new TankEntity('T', false, makeParams(over), visual);
}

function runStage(
  stage: TargetHighlightStage,
  player: TankEntity,
  tanks: TankEntity[],
  dt = 0.016,
) {
  const ctx = {
    dt,
    emit: () => {},
    player,
    tanks,
    deathT: { value: 0 },
    prevReloading: { value: false },
    requestGameOver: () => {},
  } as unknown as FrameContext;
  stage.update(ctx);
}

function makeStage(colliders: Collider[] = []): TargetHighlightStage {
  const arena = { colliders } as unknown as Arena;
  return new TargetHighlightStage(arena);
}

function shells(t: TankEntity): THREE.Mesh[] | undefined {
  return t.visual.group.userData[AIM_OUTLINE_KEY] as THREE.Mesh[] | undefined;
}

function outlineOn(t: TankEntity): boolean {
  const s = shells(t);
  return !!s && s.length > 0 && s.every((m) => m.visible);
}

/** Мини-стаб шейдера: наши onBeforeCompile трогают только uniforms/шейдерные строки. */
function compileStub(mat: THREE.MeshBasicMaterial) {
  type ShaderArgs = Parameters<THREE.MeshBasicMaterial['onBeforeCompile']>;
  const shader = {
    uniforms: {},
    vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n#include <project_vertex>\n',
    fragmentShader: '#include <common>\nvec3 outgoingLight = vec3(0.0);\n#include <opaque_fragment>\n',
  } as unknown as ShaderArgs[0];
  mat.onBeforeCompile(shader, null as unknown as ShaderArgs[1]);
  return shader;
}

describe('TargetHighlightStage', () => {
  // shell'ы идут четвёрками на меш: [mask, rim, core, halo] — слои помечены name.
  const byName = (n: string) => (m: THREE.Mesh) =>
    (m.material as THREE.MeshBasicMaterial).name === n;
  const isMask = byName('aimMask');
  const isRim = byName('aimRim');
  const isCore = byName('aimCore');
  const isHalo = byName('aimHalo');

  function shownEnemy(): { stage: TargetHighlightStage; enemy: TankEntity; player: TankEntity } {
    const stage = makeStage();
    const player = makeTank();
    player.position.set(0, 0, 0);
    player.aimYaw = 0;
    const enemy = makeTank();
    enemy.position.set(0, 0, 50);
    runStage(stage, player, [player, enemy]);
    return { stage, enemy, player };
  }

  it('загорается на враге в прицеле: mask+rim+core+halo только над Standard-мешами', () => {
    const { enemy, player } = shownEnemy();
    const s = shells(enemy);
    expect(s?.length).toBe(4); // 1 Standard-меш × 4 слоя; кольцо (Basic) не обводится
    expect(s?.every((m) => m.visible)).toBe(true);
    expect(s?.filter(isMask).length).toBe(1);
    expect(s?.filter(isRim).length).toBe(1);
    expect(s?.filter(isCore).length).toBe(1);
    expect(s?.filter(isHalo).length).toBe(1);
    const rim = s!.find(isRim)!.material as THREE.MeshBasicMaterial;
    expect(rim.side).toBe(THREE.BackSide);
    expect(rim.blending).toBe(THREE.NormalBlending); // opaque — перекрывается core по depth
    expect(rim.color.getHex()).not.toBe(TARGET_HIGHLIGHT.color); // тёмный, не красный
    const halo = s!.find(isHalo)!.material as THREE.MeshBasicMaterial;
    expect(halo.side).toBe(THREE.BackSide);
    expect(halo.transparent).toBe(true);
    expect(halo.depthWrite).toBe(false);
    // shell — ребёнок исходного меша ⇒ следует за башней/стволом бесплатно.
    expect(s?.[0].parent).toBeInstanceOf(THREE.Mesh);
    expect(shells(player)).toBeUndefined(); // игрок не обводится
  });

  it('силуэт: маска пишет stencil-бит, shell-слои рисуются только где он пуст', () => {
    const { enemy } = shownEnemy();
    const s = shells(enemy)!;
    const mask = s.find(isMask)!;
    const rim = s.find(isRim)!;
    const core = s.find(isCore)!;
    const maskMat = mask.material as THREE.MeshBasicMaterial;
    const rimMat = rim.material as THREE.MeshBasicMaterial;
    const coreMat = core.material as THREE.MeshBasicMaterial;
    const haloMat = s.find(isHalo)!.material as THREE.MeshBasicMaterial;
    // Маска: невидимая проекция детали, всегда пишет SILHOUETTE_BIT (=1).
    expect(maskMat.colorWrite).toBe(false);
    expect(maskMat.depthWrite).toBe(false);
    expect(maskMat.stencilWrite).toBe(true); // в three это включает и сам тест
    expect(maskMat.stencilFunc).toBe(THREE.AlwaysStencilFunc);
    expect(maskMat.stencilRef).toBe(1);
    expect(maskMat.stencilZPass).toBe(THREE.ReplaceStencilOp);
    expect(maskMat.stencilFail).toBe(THREE.KeepStencilOp);
    // Порядок opaque-очереди: маска (-12) → rim (-6) → core (0); halo — transparent.
    expect(mask.renderOrder).toBeLessThan(rim.renderOrder);
    expect(rim.renderOrder).toBeLessThan(core.renderOrder);
    // Все три shell-слоя: рисуем только где маска пуста, сами stencil не трогаем.
    for (const mat of [rimMat, coreMat, haloMat]) {
      expect(mat.stencilWrite).toBe(true);
      expect(mat.stencilFunc).toBe(THREE.EqualStencilFunc);
      expect(mat.stencilRef).toBe(0);
      expect(mat.stencilFuncMask).toBe(1);
      expect(mat.stencilWriteMask).toBe(0);
      expect(mat.stencilZPass).toBe(THREE.KeepStencilOp);
    }
  });

  it('шейдер core: uniform толщины линии + экранный сдвиг вдоль нормалей в вершинном', () => {
    const { enemy } = shownEnemy();
    const mat = shells(enemy)!.find(isCore)!.material as THREE.MeshBasicMaterial;
    const shader = compileStub(mat);
    expect((shader.uniforms.uOutlineWidth as { value: number }).value).toBe(TARGET_HIGHLIGHT.coreWidth);
    expect(shader.vertexShader).toContain(
      'transformed += normalize( normal ) * ( uOutlineWidth * mix( 1.0, length( ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz ) / uWidthRefDist, uWidthDistMix ) );',
    );
  });

  it('контр-кант (E): rim-шейдер шире core на rimWidth', () => {
    const { enemy } = shownEnemy();
    const mat = shells(enemy)!.find(isRim)!.material as THREE.MeshBasicMaterial;
    const shader = compileStub(mat);
    expect((shader.uniforms.uOutlineWidth as { value: number }).value).toBe(
      TARGET_HIGHLIGHT.coreWidth + TARGET_HIGHLIGHT.rimWidth,
    );
    // Тот же экранный сдвиг, что у core — полоски остаются пропорциональными.
    expect(shader.vertexShader).toContain('uWidthRefDist');
  });

  it('экранные толщины (C): все shell-слои делят общие uniforms поправки', () => {
    const { enemy } = shownEnemy();
    const s = shells(enemy)!;
    for (const pred of [isRim, isCore, isHalo]) {
      const mat = s.find(pred)!.material as THREE.MeshBasicMaterial;
      const shader = compileStub(mat);
      expect((shader.uniforms.uWidthRefDist as { value: number }).value).toBe(
        TARGET_HIGHLIGHT.widthRefDist,
      );
      expect((shader.uniforms.uWidthDistMix as { value: number }).value).toBe(
        TARGET_HIGHLIGHT.widthDistMix,
      );
    }
    // Маска — ванильный MeshBasic, сдвига не имеет вовсе.
    const maskShader = compileStub(s.find(isMask)!.material as THREE.MeshBasicMaterial);
    expect(maskShader.vertexShader).not.toContain('uOutlineWidth');
  });

  it('шейдер halo: широкий сдвиг + fresnel-затухание и «дыхание» во фрагментном', () => {
    const { enemy } = shownEnemy();
    const mat = shells(enemy)!.find(isHalo)!.material as THREE.MeshBasicMaterial;
    const shader = compileStub(mat);
    expect((shader.uniforms.uOutlineWidth as { value: number }).value).toBe(TARGET_HIGHLIGHT.haloWidth);
    expect(shader.vertexShader).toContain('vHaloN = normalize( normalMatrix * normal );');
    expect(shader.vertexShader).toContain('vHaloV = normalize( - mvPosition.xyz );');
    expect(shader.fragmentShader).toContain('outgoingLight *= pow( clamp( abs( dot( normalize( vHaloN ), normalize( vHaloV ) ) )');
    expect(shader.fragmentShader).toContain('uHaloIntensity');
    expect(shader.fragmentShader).toContain('#include <opaque_fragment>');
  });

  it('«дыхание»: пока цель видна, интенсивность ореола пульсирует в коридоре pulse', () => {
    const { stage, player, enemy } = shownEnemy();
    const p = TARGET_HIGHLIGHT.pulse;
    const v1 = getOutlineIntensity();
    expect(v1).toBeGreaterThanOrEqual(p.base - p.amp);
    expect(v1).toBeLessThanOrEqual(p.base + p.amp);
    runStage(stage, player, [player, enemy], 0.5);
    expect(getOutlineIntensity()).not.toBe(v1);
  });

  it('переключение цели: старая обводка гаснет, новая горит', () => {
    const stage = makeStage();
    const player = makeTank();
    player.aimYaw = 0;
    const a = makeTank();
    a.position.set(0, 0, 50);
    const b = makeTank();
    b.position.set(1.5, 0, 55);
    runStage(stage, player, [player, a, b]);
    expect(outlineOn(a)).toBe(true);
    // Разворачиваем прицел к b и отводим a далеко (вне дальности/конуса).
    player.aimYaw = Math.atan2(1.5, 55);
    a.position.set(60, 0, -60);
    runStage(stage, player, [player, a, b], 0.016);
    expect(outlineOn(b)).toBe(true);
    expect(outlineOn(a)).toBe(false);
  });

  it('смерть игрока и очистка ростера гасят обводку', () => {
    const stage = makeStage();
    const player = makeTank();
    player.aimYaw = 0;
    const enemy = makeTank();
    enemy.position.set(0, 0, 50);
    runStage(stage, player, [player, enemy]);
    expect(outlineOn(enemy)).toBe(true);
    player.alive = false;
    runStage(stage, player, [player, enemy]);
    expect(outlineOn(enemy)).toBe(false);
    // Повторное включение перед очисткой — onRosterCleared тоже должен гасить.
    player.alive = true;
    runStage(stage, player, [player, enemy]);
    expect(outlineOn(enemy)).toBe(true);
    stage.onRosterCleared?.();
    expect(outlineOn(enemy)).toBe(false);
  });

  it('после смерти и респауна старая удержанная цель не «оживает»', () => {
    const stage = makeStage();
    const player = makeTank();
    player.aimYaw = 0;
    const enemy = makeTank();
    enemy.position.set(0, 0, 50);
    runStage(stage, player, [player, enemy]);
    player.alive = false;
    runStage(stage, player, [player, enemy]);
    // Респаун: враг уведен далеко за конус — hold-состояние должно быть сброшено.
    player.alive = true;
    enemy.position.set(80, 0, 80);
    runStage(stage, player, [player, enemy]);
    expect(outlineOn(enemy)).toBe(false);
  });
});
