import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // Dev-порт — единый источник правды (scripts/screenshot.sh ходит сюда).
  server: { port: 5178 },
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
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
