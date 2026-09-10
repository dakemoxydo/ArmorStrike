// ===== Гейт ре-рендера HUD: нужен ли React-рендер после кадра =====
//
// Логика ИНВЕРТИРОВАНА намеренно. Раньше в useGameHud лежал рукописный список
// сравнений из ~25 полей, и любое новое поле HudSnapshot молча выпадало из
// проверки: `maxHealth` не сравнивался вообще, а содержимое `scoreboard` — только
// по факту показа, поэтому открытое табло не обновлялось. Теперь по умолчанию
// сравниваются ВСЕ поля, а исключения — только семантические категории:
//
//   • ref-painted — пишутся в DOM императивно каждый кадр, рендер им не нужен;
//   • continuous  — непрерывные каналы (энергия огнемёта), сравнение огрубляется;
//   • quantized   — сравниваем по ОТОБРАЖАЕМОМУ значению (мм:сс, проценты).
//
// Добавление поля в HudSnapshot больше не требует правки этого файла.
import type { CaptureHudPoint, HudSnapshot, ScoreRow } from '../game/types';
import { ammoForcesHudRender } from './hudPresentation';

/** HP в табло рисуется как `Math.round(frac * 100)` — сравниваем с той же точностью. */
function hpBucket(frac: number): number {
  return Math.round(Math.max(0, Math.min(1, frac)) * 100);
}

/** Табло пересобирается через `.map()` каждый кадр — сравниваем по содержимому. */
function boardDiffers(a: readonly ScoreRow[], b: readonly ScoreRow[]): boolean {
  if (a === b) return false;
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.name !== y.name ||
      x.hull !== y.hull ||
      x.turret !== y.turret ||
      x.weapon !== y.weapon ||
      x.weaponName !== y.weaponName ||
      x.isPlayer !== y.isPlayer ||
      x.alive !== y.alive ||
      x.kills !== y.kills ||
      x.deaths !== y.deaths ||
      x.teamId !== y.teamId ||
      hpBucket(x.hpFrac) !== hpBucket(y.hpFrac)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Полоса точек захвата: владелец/спор дискретны, прогресс рисуется шагом 10%.
 * Ключ нужен потому, что HudModel переиспользует один и тот же массив.
 */
export function captureStripKey(pts: readonly CaptureHudPoint[]): string {
  if (!pts.length) return '';
  let k = '';
  for (const p of pts) {
    k += `${p.id}:${p.owner ?? 'n'}:${p.contested ? 1 : 0}:${Math.floor(p.progress * 10)},`;
  }
  return k;
}

/** Компаратор поля: true = значения различаются настолько, что нужен рендер. */
type FieldDiffers = (a: HudSnapshot, b: HudSnapshot) => boolean;

/**
 * Переопределения для полей, которые нельзя сравнивать «в лоб».
 * Всё, чего здесь нет, сравнивается через Object.is.
 */
const FIELD_DIFFERS: Partial<Record<keyof HudSnapshot, FieldDiffers>> = {
  // Пишутся в DOM через refs каждый кадр — рендер им не нужен никогда.
  health: () => false,
  boost: () => false,
  reloadProgress: () => false,

  // Дискретные патроны (рельса/пушка) требуют рендера; энергия огнемёта — нет.
  ammo: (a, b) => ammoForcesHudRender(a.turretId, b.turretId, a.ammo, b.ammo),

  // Сравнение по отображаемому значению: секунды и очки команд рисуются целыми.
  timeSec: (a, b) => Math.floor(a.timeSec) !== Math.floor(b.timeSec),
  teamScoreAlpha: (a, b) => Math.floor(a.teamScoreAlpha) !== Math.floor(b.teamScoreAlpha),
  teamScoreBravo: (a, b) => Math.floor(a.teamScoreBravo) !== Math.floor(b.teamScoreBravo),

  // Массивы пересоздаются каждый кадр — сравниваем содержимое.
  scoreboard: (a, b) => boardDiffers(a.scoreboard, b.scoreboard),
  capturePoints: (a, b) => captureStripKey(a.capturePoints) !== captureStripKey(b.capturePoints),
};

/** Нужен ли ре-рендер HUD, чтобы показать `next` вместо `prev`. */
export function hudNeedsRender(prev: HudSnapshot, next: HudSnapshot): boolean {
  for (const key of Object.keys(next) as (keyof HudSnapshot)[]) {
    const differs = FIELD_DIFFERS[key];
    if (differs) {
      if (differs(prev, next)) return true;
      continue;
    }
    if (!Object.is(prev[key], next[key])) return true;
  }
  return false;
}
