# ArmorStrike

3D tank arena (DM / TDM / Capture Point) — React 19 + TypeScript + Three.js + Vite + Tailwind.

## Quick start

```bash
npm install
npm run dev
```

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src
npm test            # vitest
npm run build       # inlines JS/CSS into dist/index.html; copies public/ (self-hosted fonts) next to it
```

Windows: double-click `start.bat` to launch the game in your browser. If the dev server is already running on port 5178, it just opens the game; otherwise it installs dependencies and starts the server automatically. Use `start.bat --no-open` to skip the auto-open.

**Deploy note:** `dist/index.html` is self-contained for app code, but self-hosted fonts live under `dist/fonts/`. Serve the whole `dist/` folder (not only the HTML file). No runtime requests leave the origin (fully offline-capable). Tank hulls render procedurally; the GLB pipeline is disabled (`MODELS_ENABLED = false` in `src/game/tank/TankConfig.ts`).

## Controls

| Action | Key |
|--------|-----|
| Drive | WASD / arrows |
| Aim | Mouse (pointer lock) |
| Fire | LMB / Space |
| Boost | Shift |
| Reload | R |
| Scoreboard | Tab (hold) |
| Pause | Esc |
| Mute | M |
| Graphics quality | Pause menu → «ГРАФ.» (low / medium / high) |

Graphics preset is stored in `localStorage` (`as2_quality`).

## Architecture (short)

- `src/core/` — domain data (catalog, damage), no imports from `game/`
- `src/game/Game.ts` — presentation: render, modes, garage, loop wiring
- `src/game/engine/GameSimulation.ts` — combat simulation step
- `src/components/` — React HUD / Garage / Pause
- Loadout is saved in `localStorage` (`as2_loadout`)
