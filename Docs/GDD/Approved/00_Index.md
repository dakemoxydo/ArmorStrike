# GDD — Approved Mechanics (ArmorStrike)

Карта готовых механик, извлечённых из кода. Статус **Approved** = реализовано в репозитории и согласовано с текущим балансом в `src/core/catalogData.ts` / `src/game/constants.ts` / `src/game/tuning.ts`.

> **Правило:** правки баланса сначала в коде, затем синхронизация этого GDD. Черновики — в [[../Drafts/|Drafts]].

## Навигация

| Документ | Механика | Ключевые классы |
|----------|----------|-----------------|
| [[Player_Controls]] | Ввод игрока | `PlayerController`, `CameraLookState` |
| [[Tank_Movement]] | Движение корпуса + нитро | `TankMotionSystem`, `BOOST` |
| [[Tank_Aim]] | Наведение башни | `TankAimSystem` |
| [[Health_And_Regen]] | HP, реген, смерть | `TankEntity` (`combat`/`fx`), `TankCombatTimersSystem` |
| [[Damage_System]] | Урон / knockback / блоки | `DamageSystem`, `CombatSystem`, `applyHit` |
| [[Weapon_Cannon]] | Пушка «Смоки» | `CannonWeapon`, `ProjectileManager` |
| [[Weapon_Railgun]] | Рельсотрон | `RailgunWeapon` |
| [[Weapon_Flamethrower]] | Огнемёт Firebird | `FlamethrowerWeapon`, `inFlameConeXZ` |
| [[Projectile_System]] | Снаряды (пул) | `ProjectileManager`, `ProjectileBehavior` |
| [[Wave_System]] | **Removed (P0)** — был wave loop | — |
| [[Wave_Buffs]] | **Removed (P0)** — intermission buffs | — |
| [[Match_Framework]] | Режимы DM/TDM/CP, roster, respawn, win | `MatchRuntime`, `spawnMatchRoster` |
| [[Team_Deathmatch]] | TDM 5v5, FF off, team HUD (P3) | `ModeSelect`, `teams`, `HudScoreboard` |
| [[Capture_Point]] | CP A/B/C, score tick, markers (P4) | `captureLogic`, `CaptureMarkers`, `MatchRuntime` |
| [[AI_Bots]] | ИИ ботов | `AIController`, `aiRoles` |
| [[Scoring]] | Очки и убийства | `scoring`, `SCORE` |
| [[Garage_Loadout]] | Гараж 3×3 | `RunState`, `HULLS`/`TURRETS` |
| [[Arena_Physics]] | Арена и коллизии | `Arena`, `physics`, `PhysicsSystem` |
| [[Maps]] | Карты и выбор арены (300×300) | `mapCatalog`, `Arena.rebuild`, `MapSelect` |
| [[City_Level_Design]] | Город: grid, districts, overpass | `buildCityContent`, `cityGroundTexture` |
| [[Village_Level_Design]] | Деревня: square, barns, paddocks | `buildVillageContent`, `villageGroundTexture` |
| [[Game_Lifecycle]] | Режимы, пауза, death cam | `RunState`, `deathLifecycle` |

## Архитектура

- [[../../Architecture/Core|Core Architecture]] — слои, симуляция, порты, фабрики

## Жанр и петля

**Жанр:** 3D tank arena (переход к classic match modes). Арена **300×300** (карты: Завод / Деревня / Город).

**Core loop (P6 complete):**
1. Гараж → корпус + башня.
2. **ModeSelect** (DM / TDM / CP) → **MapSelect** → старт.
3. Respawn 4 с; DM 30 kills / TDM **75** team / CP 1000 score / time 12 мин.
4. CP: ~50% bots push A/B/C; rest hunt.
5. Results: реванш / смена режима / гараж / меню.

**План:** [[../Drafts/Classic_Match_Modes|Classic_Match_Modes]] — **P0–P6 shipped**.

## Источники истины в коде

| Данные | Файл |
|--------|------|
| Корпуса / башни / тюнинг оружия | `src/core/catalogData.ts` |
| Арена, boost, score, волны | `src/game/constants.ts` |
| Heal, knockback decay, damp | `src/game/tuning.ts` |
| Порядок тика симуляции | `src/game/engine/stages.ts` |
| Bootstrap | `src/game/GameBootstrap.ts` |
