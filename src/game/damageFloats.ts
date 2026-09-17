// ===== Очередь «всплывающих чисел» урона/лечения (sim → presentation) =====
// Бой считает урон в своём порядке стадий, экранная позиция числа зависит от
// камеры, а камера финализируется только в GameLoop (после cameraRig.update).
// Поэтому попадания пишутся в этот кольцевой буфер, а GameLoop в конце кадра
// проецирует их в проценты вьюпорта и превращает в GameEvent.
//
// Буфер пулингованный: ровно `cap` объектов на всё время жизни игры, ноль
// аллокаций на попадание (см. Docs/Architecture/Standard_Frame_Stability.md).
import type { DamageType } from '../core/catalog';

/**
 * Вид числа для HUD-канала: цвет/размер/текст задаёт CSS (см. .dmg-float.*).
 * `kill` — добивающий удар, `immunity` — урон поглотил респавн-щит.
 */
export type DamageFloatKind =
  | 'normal' | 'crit' | 'kill' | 'heal' | 'critHeal' | 'immunity';

/** Запись очереди: мировая точка + величина + вид. */
export interface DamageFloatRequest {
  x: number;
  y: number;
  z: number;
  /** Показываемое число (урон/лечение, уже с резистами и критом). */
  value: number;
  kind: DamageFloatKind;
  /** Тип урона — тонировка числа по оси контр-пиков (см. Damage_System.md). */
  type?: DamageType;
}

/** Узкий порт для пишущей стороны (CombatSystem, оружие лечения). */
export type DamageFloatSink = (
  x: number, y: number, z: number, value: number, kind: DamageFloatKind, type?: DamageType,
) => void;

/** Высота над центром корпуса, откуда «вылетает» число (чтобы не тонуло в модели). */
export const FLOAT_HEIGHT = 2.2;
/** Разброс мировой точки: тики огнемёта/лечения не складываются в одну колонку. */
export const FLOAT_JITTER = 0.9;

/**
 * Кольцевой буфер фиксированной ёмкости. Переполнение сбрасывает самое старое
 * число: в шквале splash-попаданий важнее последние, чем «зависший» рендер
 * сотен DOM-нод.
 */
export class DamageFloatQueue {
  private readonly _pool: DamageFloatRequest[];
  private _read = 0;
  private _write = 0;
  private _pending = 0;

  constructor(private readonly cap = 24) {
    this._pool = new Array<DamageFloatRequest>(cap);
    for (let i = 0; i < cap; i++) {
      this._pool[i] = { x: 0, y: 0, z: 0, value: 0, kind: 'normal', type: undefined };
    }
  }

  get size(): number { return this._pending; }

  push(
    x: number, y: number, z: number,
    value: number, kind: DamageFloatKind, type?: DamageType,
  ): void {
    if (this._pending === this.cap) {
      this._read = (this._read + 1) % this.cap;
      this._pending--;
    }
    const slot = this._pool[this._write];
    slot.x = x; slot.y = y; slot.z = z;
    slot.value = value; slot.kind = kind; slot.type = type;
    this._write = (this._write + 1) % this.cap;
    this._pending++;
  }

  /** Вызывает `fn` для каждой записи и очищает буфер. */
  drain(fn: (r: DamageFloatRequest) => void): void {
    while (this._pending > 0) {
      fn(this._pool[this._read]);
      this._read = (this._read + 1) % this.cap;
      this._pending--;
    }
  }

  /** Сброс между раундами (рестарт/смена карты): висящие числа не должны
   *  переезжать в новый матч. */
  clear(): void {
    this._read = 0;
    this._write = 0;
    this._pending = 0;
  }
}
