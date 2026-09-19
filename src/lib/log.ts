// ===== Централизованный логгер (J17) =====
// Весь прод-код пишет сюда, а не в console напрямую: единый префикс,
// единая точка для будущей отправки ошибок в телеметрию.
// eslint no-console здесь — warn по конфигу, вызовы осознанные.
export function logWarn(...args: unknown[]): void {
  console.warn('[ArmorStrike]', ...args);
}

export function logError(...args: unknown[]): void {
  console.error('[ArmorStrike]', ...args);
}
