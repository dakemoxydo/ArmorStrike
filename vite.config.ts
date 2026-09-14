import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * Деплой: корень сайта по умолчанию. Для подпапки — `BASE_PATH=/game/ npm run build`.
 *
 * Пути ассетов правок НЕ требуют (проверено сборкой + CI-гейтом «subfolder deploy»):
 * Vite переписывает `url()` из CSS в относительные (`./fonts/...`), а `assetUrl()`
 * (src/game/tank/TankConfig.ts) читает `import.meta.env.BASE_URL`. Менять `base`
 * и пути «вместе» больше не нужно — достаточно `base`.
 */
const base = process.env.BASE_PATH?.trim() || '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  // Dev-порт — единый источник правды для всех локальных инструментов.
  //
  // `host: '127.0.0.1'` обязателен: дефолт Vite — `localhost`, а Node 17+ больше
  // не переупорядочивает результат `dns.lookup` под IPv4-first. На Windows
  // `localhost` резолвится в `::1`, сервер биндится ТОЛЬКО на IPv6-loopback,
  // и браузер, идущий на `127.0.0.1:5178`, получает
  // ERR_CONNECTION_REFUSED / «Страница не найдена». Явный IPv4-хост это чинит.
  // Нужен доступ с других устройств — `npm run dev -- --host` (перекроет на 0.0.0.0).
  //
  // `watch.ignored` — против падения сервера на `EBUSY: resource busy or locked,
  // watch '...\<file>.<pid>.<uuid>.tmpdir\<file>.tmp'`: атомарное сохранение
  // редактора (Studio/VSCode) создаёт соседний каталог-временюху, chokidar не
  // может его открыть и роняет весь dev-сервер — посреди игры это означает
  // «эффекта выстрела просто нет» на полугорячей странице. Дефолтные паттерны
  // перечислены явно: при явном `ignored` Vite не обязан подмешивать свои.
  server: {
    port: 5178,
    host: '127.0.0.1',
    // `**/screenshots/**` — там скретч-инструменты (beam-preview, map-plan,
    // game-probe) пишут артефакты и держат chrome-профили: залоченный Chrome
    // `Network/Cookies` даёт ровно тот же EBUSY. В графе приложения их нет.
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/.*tmpdir/**', '**/screenshots/**'],
    },
  },
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    // Вровень с tsconfig (ES2020): parse-fail на старых браузерах вместо
    // молчаливого esnext-артефакта, который не ловит ErrorBoundary (M1).
    target: 'es2020',
    cssCodeSplit: false,
    // Single-file инлайн ~1.1 МБ: предупреждать о росте раньше, чем тихо
    // распухнуть (M3). Актуальный размер — см. CI size-gate.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    // React Testing Library регистрирует авто-cleanup через глобальный
    // afterEach, поэтому globals нужны. Существующие suite'ы импортируют
    // describe/it/expect явно — на них это не влияет.
    globals: true,
    // DOM-окружение подключается точечно: `// @vitest-environment jsdom`
    // в начале файла. Остальные ~50 логических suite'ов остаются на быстром
    // node-окружении, поэтому глобальный environment не переключаем.
  },
});
