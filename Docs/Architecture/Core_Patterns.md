# Core Patterns — ArmorStrike

**Статус:** engineering standard (synced with code)  
**Связано:** [Core](Core.md) · [Standard Tank](Standard_Tank.md) · [Standard Weapon](Standard_Weapon.md) · [Standard UI Input](Standard_UI_Input.md)  
**Не путать с:** [Docs/GDD](../GDD/Approved/00_Index.md) (баланс и дизайн-механика)

## 1. Layering (жёсткое правило)

```
React UI  (components/, hooks/)
    ↓ только GameApi / types / catalog
Game facade  (Game, GameApi, GameLoop, GameModeController)
    ↓
Simulation  (GameSimulation, stages, systems)
    ↓
Domain core  (src/core/)
```

| Пакет | Содержимое | Импорты |
|-------|------------|---------|
| `src/core/` | catalog, `DamageSystem`, pure types | **запрещён** импорт `game/` |
| `src/game/` | sim, weapons, AI, arena, render | может импортировать `core/` |
| `src/components/` | React views | `GameApi`, types, HUD helpers — **не** engine/sim |

Любой новый код обязан уважать направление зависимостей. Циклов `core` ↔ `game` быть не должно.

## 2. Bootstrap composition

Единая сборка: `bootstrapGame` (`GameBootstrap.ts`).

Порядок ответственности:
1. `RenderWorld` (renderer, scene, camera, lights)
2. `Arena`, `Effects`, `AudioFX`, `ProjectileManager`
3. `PlayerController`, `RunState`
4. `CombatSystem` → владеет `createDamageSystem`
5. `WaveManager`, `HudModel`, weapon factory deps
6. `GameSimulation` + `GameLoop` + stages
7. Window handlers (resize, visibility → auto-pause)

Новые подсистемы подключать в bootstrap, а не «сбоку» из React.

## 3. Simulation pipeline (ordered stages)

Контракт стадии:

```ts
interface SimSystem {
  readonly name: string;
  update(ctx: SimContext): void;
}
```

Порядок (`buildSimulationStages`):

1. `PlayerInputStage` — WASD/mouse → tank + fire
2. `BotAiStage` — AI → fire
3. `WeaponSystemStage` — `weapon.update`
4. `TankSystemStage` — motion, aim, heal, timers
5. Animation / FX / nameplates / ambient
6. `PhysicsSystem` — walls + tank separation
7. Projectiles — flight & hits
8. Waves — intermission when cleared
9. Death / game-over timer

Правила:
- `dt` clamp ~0.05s в game loop.
- Стадия зависит от `SimContext` (или `Pick`-среза), не от concrete `Game`.
- Не вставлять тяжёлую презентацию до physics/projectiles без явной причины (порядок = детерминизм кадра).

## 4. Port pattern (I/O isolation)

| Port | Роль | Concrete |
|------|------|----------|
| `EffectsPort` | shake, explosions, muzzle, trails | `Effects` |
| `AudioPort` | procedural WebAudio | `AudioFX` |
| `WeaponContext.colliders` | LOS / shot geometry | список из Arena |
| `HitContext` | projectile walls + damage | pool update |

Weapons / combat / systems **не** импортируют concrete `Effects` / `AudioFX` / `Arena`, если достаточно порта.  
Цель: unit-тесты без Three/WebAudio и отсутствие import cycles.

## 5. Event bus → React

`GameEvent` union (`game/types.ts`) — единственный push-канал UI:

`playerHit` · `enemyHit` · `kill` · `wave` · `intermission` · `shotFired` · `gameOver` · `pauseChanged` · `modeChanged` · `garageChanged`

Правило: sim/combat **эмитит события**; React **подписывается**. Обратный поток команд — только методы `GameApi`.

## 6. Run state & persistence

- `RunState`: mode, pause, intermission, score, kills, loadout.
- Persistence keys: `as2_loadout`, `as2_quality` (`localStorage`).
- Режим игры (`GameMode`): `'menu' | 'garage' | 'playing' | 'over'`.

## 7. Testing expectations

- Чистая логика — unit tests в `src/__tests__/` (scoring, flame cone, railgun FSM, damage, physics, ports).
- Команды: `npm test`, `npm run typecheck`, `npm run lint`.
- Новые pure helpers предпочтительнее god-class методов.

## 8. Non-goals (текущий билд)

Не вводить без явного дизайн-решения:
- multiplayer / netcode
- отдельная armor DR-формула (сейчас HP-only)
- projectile pool для railgun/flame
- прямой импорт `Game` из React-компонентов
