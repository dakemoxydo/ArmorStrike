// ===== Глобальный тест-стаб canvas (J20) =====
// jsdom не реализует HTMLCanvasElement.getContext и шумит
// "Not implemented: HTMLCanvasElement's getContext() method" в каждом suite,
// где canvas создаётся без мока. Стаб возвращает null — то же falsy-поведение,
// что сегодня (код с `if (!ctx)` идёт по тем же веткам, шума нет).
// Файлы с богатыми моками document.createElement поверх не affected.
// typeof-гард: setup выполняется и в node-suite'ах, где DOM отсутствует.
if (typeof HTMLCanvasElement !== 'undefined') {
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext: () => null;
  };
  proto.getContext = () => null;
}

// ===== Тестовый Supabase anon-key =====
// supabaseClient требует VITE_SUPABASE_ANON_KEY из окружения и падает без
// него (fail-closed, без хардкода секрета). Сьютам, импортящим клиент без
// мока (Garage → UserBadge → authService), достаточно dummy-ключа: сеть
// нигде не ходит, все вызовы замоканы или не вызываются.
if (typeof process !== 'undefined' && process.env) {
  process.env.VITE_SUPABASE_ANON_KEY ??= 'test-anon-key';
  process.env.VITE_SUPABASE_URL ??= 'https://test.supabase.co';
}
