# ArmorStrike

3D tank survival (waves) — React 19 + TypeScript + Three.js + Vite + Tailwind.

## Quick start

```bash
npm install
npm run dev
```

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src
npm test            # vitest
npm run build       # single-file dist/index.html
```

Windows: `start.bat` starts the Vite dev server.

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
