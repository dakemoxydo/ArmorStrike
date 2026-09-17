// ===== Настройка «Числа урона» (п.1) + localStorage =====
// Настройка чисто презентационная: бой считает урон одинаково, слой HUD просто
// не создаёт DOM-нод. Значение по умолчанию — включено (это канал обратной
// связи, а не украшение), выключается для слабозаметных/производительных сцен.
const LS_KEY = 'as2_damage_numbers';

export const DEFAULT_DAMAGE_NUMBERS = true;

export function loadDamageNumbers(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch { /* ignore */ }
  return DEFAULT_DAMAGE_NUMBERS;
}

export function saveDamageNumbers(on: boolean): void {
  try {
    localStorage.setItem(LS_KEY, on ? '1' : '0');
  } catch { /* ignore */ }
}
