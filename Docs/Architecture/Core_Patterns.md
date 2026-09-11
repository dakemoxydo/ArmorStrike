# Core Patterns — ArmorStrike

**Статус:** engineering standard (synced with code)  
**Связано:** [Core](Core.md) · [Standard Tank](Standard_Tank.md) · [Standard Weapon](Standard_Weapon.md) · [Standard UI Input](Standard_UI_Input.md) · [Standard Match](Standard_Match.md)  
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
2. `Arena`, `Effects` (владеет постоянным бюджетом света `LightRig`), `AudioFX`, `ProjectileManager`
3. `PlayerController`, `RunState`
4. `CombatSystem` → владеет `createDamageSystem`
5. `BotRoster`, `HudModel`, weapon factory deps
6. `GameSimulation` (`MatchRuntime`) + `GameLoop` + stages
7. Window handlers (resize, visibility → auto-pause)

Новые подсистемы подключать в bootstrap, а не «сбоку» из React.

`Effects` отдаёт `LightRig` фабрике оружия через `weaponDeps.lights` (свет нельзя
attach/detach в рантайме). Warm-up шейдеров — `renderWorld.warmUp()` в
`executeStartRound`, а не в bootstrap: к моменту вызова арена и ростер уже в сцене.
См. [Standard Frame Stability](Standard_Frame_Stability.md).

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
5. `TankAnimationSystemStage` — barrel/track anim, death pose
6. `TankFxSystemStage` — smoke/dust FX
7. `AmbientStage` — ambient center
8. `NameplateSystemStage` — nameplate sync
9. `PhysicsSystemStage` — walls + tank separation
10. `ProjectileStage` — flight & hits
11. `MinimapStage` — minimap sync
12. `MatchStage` — invuln, respawn, capture, win
13. `BoostStage` — player boost jet
14. `EngineAudioStage` — engine audio

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

`playerHit` · `enemyHit` · `kill` · `shotFired` · `killStreak` · `gameOver` (winner fields) · `pauseChanged` · `modeChanged` · `garageChanged`

Правило: sim/combat **эмитит события**; React **подписывается**. Обратный поток команд — только методы `GameApi`.

## 6. Run state & persistence

- `RunState`: mode, pause, score, kills, loadout (no intermission).
- `MatchModeId` / `MatchRuntime` — rules inside `playing` (see Standard Match).
- Persistence keys: `as2_loadout`, `as2_quality` (`localStorage`).
- App shell (`GameMode`): `'menu' | 'garage' | 'playing' | 'over'`.

## 7. Testing expectations

- Чистая логика — unit tests в `src/__tests__/` (scoring, match win/teams/capture/objective, flame cone, railgun FSM, damage, physics, ports).
- Команды: `npm test`, `npm run typecheck`, `npm run lint`.
- Новые pure helpers предпочтительнее god-class методов (match layer: `match/*`).

## 8. Non-goals (текущий билд)

Не вводить без явного дизайн-решения:
- multiplayer / netcode
- отдельная armor DR-формула (сейчас HP-only)
- projectile pool для railgun/flame
- прямой импорт `Game` из React-компонентов
