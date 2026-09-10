import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  // Деплой — корень сайта. При переезде в подпапку (/game/) поменять base
  // ВМЕСТЕ с путями ассетов (см. src/game/tank/TankConfig.ts: assetUrl):
  // абсолютные /models и /fonts иначе не резолвятся (M2).
  base: '/',
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
});
