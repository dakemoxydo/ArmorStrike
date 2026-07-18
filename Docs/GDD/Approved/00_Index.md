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
| [[Wave_System]] | Волны и спавн | `WaveManager`, `spawnBot` |
| [[Wave_Buffs]] | Баффы между волнами | `applyWaveBuff`, `WAVE_BUFF_OPTIONS` |
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

**Жанр:** 3D tank survival (волны) на арене **300×300** (карты: Завод / Деревня / Город).

**Core loop:**
1. Гараж → выбор корпус + башня (9 комбинаций).
2. Выбор карты → старт матча.
3. Волна N: зачистка ботов.
4. Intermission → выбор баффа → волна N+1.
5. Смерть игрока → game over + score.

## Источники истины в коде

| Данные | Файл |
|--------|------|
| Корпуса / башни / тюнинг оружия | `src/core/catalogData.ts` |
| Арена, boost, score, волны | `src/game/constants.ts` |
| Heal, knockback decay, damp | `src/game/tuning.ts` |
| Порядок тика симуляции | `src/game/engine/stages.ts` |
| Bootstrap | `src/game/GameBootstrap.ts` |
