// ===== Слой всплывающих чисел урона/лечения (п.1) =====
// Пул DOM-нод поверх HUD. Числа создаются императивно из GameEvent'ов и НИКОГДА
// не проходят через React-состояние: бой порождает 10+ событий в секунду
// (огнемёт — 10 тиков/с), и стейт дал бы ререндер HUD на каждое попадание —
// ровно то, от чего защищает `ui/hudRenderGate.ts`.
//
// Позиция (x/y) — проценты вьюпорта, уже спроецированные GameLoop в кадре удара.
// Движение/затухание — CSS-анимация, освобождение ноды — таймером: под
// `prefers-reduced-motion` анимация выключена, и без таймера число осталось бы
// на экране навсегда (тот же приём, что и TOAST_MS в useGameHud).
import type { DamageFloatKind } from '../game/damageFloats';

/** Размер пула. Перелив переиспользует самую старую ноду (кольцевой курсор). */
const POOL_SIZE = 16;
/** Долгоживущие «важные» числа читаются дольше мелких тиков огнемёта/дуги. */
const LIFE_SHORT_MS = 620;
const LIFE_LONG_MS = 950;
/** Порог «мелкого» числа (тики DoT) — короче живёт и мельче шрифтом. */
const SMALL_VALUE = 10;

/** Тексты-маркеры без числа. */
const LABELS: Partial<Record<DamageFloatKind, string>> = {
  immunity: 'ИММУНИТЕТ',
};

/**
 * Класс вида → CSS-правила в hud.css (.dmg-float.is-*). Маппинг явный, потому
 * что `critHeal` в kebab-case читается в стилях проще, чем camelCase-селектор.
 */
const KIND_CLASS: Record<DamageFloatKind, string> = {
  normal: 'is-normal',
  crit: 'is-crit',
  kill: 'is-kill',
  heal: 'is-heal',
  critHeal: 'is-heal is-crit-heal',
  immunity: 'is-immunity',
};

export interface DamageFloatLayer {
  /** Корень, к которому прикреплён слой (нужен для пересоздания при ре-монте). */
  readonly root: HTMLElement;
  spawn(x: number, y: number, value: number, kind: DamageFloatKind): void;
  /** Мгновенно убрать все активные числа (смена режима/рестарт раунда). */
  clear(): void;
  dispose(): void;
}

export function createDamageFloatLayer(root: HTMLElement): DamageFloatLayer {
  /** Handle таймера ноды: `undefined` — нода свободна (clearTimeout это принимает). */
  type Handle = ReturnType<typeof setTimeout> | undefined;
  const nodes: HTMLElement[] = [];
  const timers: Handle[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const el = document.createElement('span');
    el.className = 'dmg-float';
    // Нода пула изначально пуста и не видима: layout не считается до spawn.
    el.style.visibility = 'hidden';
    root.appendChild(el);
    nodes.push(el);
    timers.push(undefined);
  }
  let cursor = 0;
  let disposed = false;

  const release = (i: number) => {
    const el = nodes[i];
    timers[i] = undefined;
    if (!el) return;
    el.classList.remove('is-live');
    el.style.visibility = 'hidden';
  };

  return {
    root,

    spawn(x, y, value, kind) {
      if (disposed) return;
      const i = cursor;
      cursor = (cursor + 1) % POOL_SIZE;
      const el = nodes[i];
      if (timers[i] !== undefined) clearTimeout(timers[i]);

      const label = LABELS[kind];
      const small = !label && kind === 'normal' && value < SMALL_VALUE;
      // Лечение показываем со знаком «+»: рядом с числами урона канал должен
      // читаться без колебаний «это мне или мне?».
      const text = label ?? `${kind === 'heal' || kind === 'critHeal' ? '+' : ''}${Math.max(1, Math.round(value))}`;
      el.textContent = text;
      el.className = `dmg-float ${KIND_CLASS[kind]}${small ? ' is-small' : ''}`;
      el.style.left = `${x.toFixed(2)}%`;
      el.style.top = `${y.toFixed(2)}%`;
      el.style.visibility = 'visible';
      // Рестарт CSS-анимации на переиспользуемой ноде: без принудительного
      // reflow браузер не увидит, что класс добавился «заново».
      void el.offsetWidth;
      el.classList.add('is-live');
      timers[i] = setTimeout(release, (label || !small) ? LIFE_LONG_MS : LIFE_SHORT_MS, i);
    },

    clear() {
      for (let i = 0; i < POOL_SIZE; i++) {
        if (timers[i] !== undefined) clearTimeout(timers[i]);
        release(i);
      }
    },

    dispose() {
      disposed = true;
      for (let i = 0; i < POOL_SIZE; i++) {
        if (timers[i] !== undefined) clearTimeout(timers[i]);
        const el = nodes[i];
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
      nodes.length = 0;
    },
  };
}
