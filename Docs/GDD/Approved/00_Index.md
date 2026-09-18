# GDD — Approved Mechanics (ArmorStrike)

Карта готовых механик, извлечённых из кода. Статус **Approved** = реализовано в репозитории и согласовано с текущим балансом в `src/core/catalogData.ts` / `src/game/constants.ts` / `src/game/tuning.ts`.

> **Правило:** правки баланса сначала в коде, затем синхронизация этого GDD. Черновики — в [Drafts](../Drafts/README.md).

## Навигация

| Документ | Механика | Ключевые классы |
|----------|----------|-----------------|
| [[Player_Controls]] | Ввод игрока | `PlayerController`, `CameraLookState` |
| [[Tank_Movement]] | Движение корпуса + нитро + анимация гусениц | `TankMotionSystem`, `TankAnimationSystem`, `BOOST` |
| [[Tank_Suspension_Dynamics]] | Пружинно-демпферная подвеска, крен/тангаж корпуса, отдача шасси при выстреле, сотрясение | `TankAnimationSystem`, `SUSPENSION_TUNING`, `Tank.onFired` |
| [[Tank_Tracks_And_Dust]] | Следы гусениц на грунте (500 InstancedMesh) и динамическая пыль шасси (120 InstancedMesh) | `TrackMarkPool`, `DriveDustPool`, `TankFxSystem`, `trackMarkTexture` |
| [[Tank_Aim]] | Наведение башни | `TankAimSystem` |
| [[Vertical_Auto_Aim]] | Вертикальная автонаводка (наклон ствола к цели) + захват в прицеле | `TankAimSystem` (`barrelPitch`), `TargetHighlightStage`, `Tank.setPitchAim`/`aimDir` |
| [[Target_Highlight_Aim]] | Подсветка врага в конусе прицела (P7) | `TargetHighlightStage`, `AimHighlighter`, `modelOutline.ts` |
| [[Health_And_Regen]] | HP, смерть, респаун (без пассивного регена) | `TankEntity` (`combat`/`fx`), `TankCombatTimersSystem` |
| [[Damage_System]] | Урон / knockback / блоки | `DamageSystem`, `CombatSystem`, `applyHit` |
| [[Kill_Feedback]] | Hit-stop / slow-mo за убийство игроком | `TimeScale`, `CombatSystem.setOnKillPunch` |
| [[Weapon_Cannon]] | Пушка «Смоки» | `CannonWeapon`, `ProjectileManager` |
| [[Weapon_Railgun]] | Рельсотрон | `RailgunWeapon`, `BeamSweep`, `RailgunChargeBalls` |
| [[Weapon_Flamethrower]] | Огнемёт Firebird | `FlamethrowerWeapon`, `inFlameConeXZ` |
| [[Weapon_Gauss]] | Пушка «Гаусс» | `GaussWeapon`, `GaussBeamFx` |
| [[Weapon_Isida]] | Нано-дуга «Изида» (ремонт союзников + вампиризм) | `IsidaWeapon`, `isidaTargeting`, `NanoBeamFx`, `NanoFlowPool`, `addSupportHeal` |
| [[Projectile_System]] | Снаряды (пул) | `ProjectileManager`, `ProjectileBehavior` |
| [[Match_Framework]] | Режимы DM/TDM/CP, roster, respawn, win | `MatchRuntime`, `spawnMatchRoster` |
| [[Team_Deathmatch]] | TDM 5v5, FF off, team HUD (P3) | `ModeSelect`, `teams`, `HudScoreboard` |
| [[Capture_Point]] | CP A/B/C, score tick, markers (P4) | `captureLogic`, `CaptureMarkers`, `MatchRuntime` |
| [[AI_Bots]] | ИИ ботов | `AIController`, `aiRoles` |
| [[Scoring]] | Очки и убийства | `scoring`, `SCORE` |
| [[Garage_Loadout]] | Гараж 5×5 (5 корпусов × 5 башен) | `RunState`, `HULLS`/`TURRETS` |
| [[Garage_Viewport_Safe_Zone]] | Кадрирование предпросмотра в свободной от UI зоне + peek-осмотр | `CameraRig`, `GarageInput`, `Garage` |
| [[Arena_Physics]] | Арена и коллизии | `Arena`, `physics`, `PhysicsSystem` |
| [[Maps]] | Карты и выбор арены (300×300) | `mapCatalog`, `Arena.rebuild`, `MapSelect` |
| [[UI_Polish]] | Единый дизайн-язык UI/HUD: токены, состояния, раскладки, настройка прицела | `variables.css`, `styles/*.css`, `ui/crosshairStyle.ts`, `uiUxPresentation.test.ts`, `crosshairSettings.test.tsx` |
| [[Factory_Level_Design]] | Завод: foundry, containers, crane, tank farm | `buildFactoryContent`, `factoryGroundTexture` |
| [[City_Level_Design]] | Город: grid, districts, overpass | `buildCityContent`, `cityGroundTexture` |
| [[Village_Level_Design]] | Деревня: площадь, часовня, амбары, пруды, сад | `buildVillageContent`, `villageGroundTexture` |
| [[Game_Lifecycle]] | Режимы, пауза, death cam, быстрая игра | `RunState`, `deathLifecycle` |
| [[Starter_Crates_And_Progression]] | Стартовые контейнеры новобранца (Draft Pick 3 карт), закрытый арсенал | `RunState`, `GarageBinding`, `StarterPackModal` |
| [[Economy_Currency_And_Quests]] | Экономика (Кредиты CR), боевые выплаты, система квестов и покупка контейнеров | `matchRewards`, `questCatalog`, `RunState`, `QuestsModal` |
| [[Cloud_Profiles_And_Auth]] | Профили игроков, Supabase Auth (username/email), гостевой режим и облачные сохранения | `RunState`, `AuthService`, `CloudSaveService`, `AuthModal`, `UserBadge` |
| [[Multiplayer_Lobby_And_Rooms]] | Сетевой мультиплеер, браузер серверов, создание комнат, быстрая игра и репликация танков | `multiplayerService`, `RemotePlayerManager`, `NetworkSyncStage`, `ServerBrowserModal` |
| [[Stylized_Art_Direction]] | Стилизованный Low-Poly / Cel-Shaded / Комикс арт-дирекшен: ступенчатый шейдинг, чернильная обводка танков и геометрии, комиксный UI/HUD, дневное солнце | `src/game/shaders/celShading.ts`, `src/game/tank/comicInkOutline.ts`, `src/styles/*.css`, `src/game/ArenaBuilder.ts` |

**Removed-механики** (wave-era, удалены в P0) — надгробные доки в `../Archive/`: [[../Archive/Wave_System|Wave_System]], [[../Archive/Wave_Buffs|Wave_Buffs]]. Approved = только реализованное; история — в git.

## Архитектура

- [[../../Architecture/Core|Core Architecture]] — слои, симуляция, порты, фабрики
- [[../../Architecture/Core_Patterns|Core Patterns]] — сквозные правила: layering, bootstrap, pipeline стадий, port-паттерн, event bus → React, ожидания тестов
- [[../../Architecture/Standard_UI_Input|Standard UI Input]] — каналы UI↔симуляция, гейт ре-рендера, ввод
- [[../../Architecture/Standard_UI_Safe_Zone|Standard UI Safe Zone]] — камера кадрирует 3D-субъект в свободном от UI прямоугольнике
- [[../../Architecture/Standard_Tank|Standard Tank]] — entity, systems, фабрика меша
- [[../../Architecture/Standard_Hull_Models|Standard Hull Models]] — процедурные корпуса, слоты материалов, бюджет детализации
- [[../../Architecture/Standard_Turret_Models|Standard Turret Models]] — процедурные башни + стволы, слоты, per-tank `railGlowMat`
- [[../../Architecture/Standard_Frame_Stability|Standard Frame Stability]] — постоянный бюджет света, warm-up шейдеров, пул обломков, hit-stop гейт, HUD-квантование
- [[../../Architecture/Standard_Match|Standard Match]] — каркас матча: `GameMode` vs `MatchModeId`, правила roster/respawn/win
- [[../../Architecture/Standard_Weapon|Standard Weapon]] — weapon-стратегия (единый интерфейс), снаряды, урон (`weapons/*`, `DamageSystem`)
- [[../../Architecture/Standard_Arena_Level_Design|Standard Arena Level Design]] — content-builder-правила арены и верификация (factory/city/village)
- [[../../Architecture/Standard_Resources|Standard Resources]] — memoized-фабрики текстур, `markShared`-владение, dispose
- [[../../Architecture/Graphics_Presets_Matrix|Graphics Presets Matrix]] — матрица low/med/high: pixel ratio, тени, bloom, частицы
- [[../../Architecture/Standard_Multiplayer|Standard Multiplayer]] — сетевая синхронизация, Supabase Realtime, Presence, RemotePlayerManager, интерполяция, RPC-комнаты
- [[../../Architecture/Standard_Cel_Shaded_Rendering|Standard Cel-Shaded Rendering]] — комиксный конвейер: ступенчатое освещение, чернильный контур силуэтов, дневные атмосферы

## Жанр и петля

**Жанр:** 3D tank arena, classic match modes (DM / TDM / CP). Арена **300×300** (карты: Завод / Деревня / Город).

**Core loop (P6 complete):**
1. Гараж → корпус + башня.
2. **ModeSelect** (DM / TDM / CP) → **MapSelect** → старт.
3. Respawn 4 с; DM 25 kills / TDM **50** team / CP 1000 score / time 12 мин.
4. CP: ~50% bots push A/B/C; rest hunt.
5. Results: реванш / смена режима / гараж / меню.

**План:** Classic Match Modes (P0–P6) — **shipped**; доки — в таблице выше (черновик удалён из Drafts, история в git).

## Источники истины в коде

| Данные | Файл |
|--------|------|
| Корпуса / башни / тюнинг оружия | `src/core/catalogData.ts` |
| Арена, boost, score | `src/game/constants.ts` |
| Match win/roster/time | `src/game/match/matchConfig.ts` |
| Knockback decay, damp, smoke, target highlight (P7) | `src/game/tuning.ts` |
| Порядок тика симуляции | `src/game/engine/stages/` (`index.ts`) |
| Bootstrap | `src/game/GameBootstrap.ts` |
| Модель vs код для корпуса/башни | `src/game/tank/TankConfig.ts` |
| Визуал корпуса (процедурный) | `src/game/tank/hull.ts`, `src/game/tank/hullKit.ts` |
| Визуал башни (процедурный) | `src/game/tank/turret.ts` |
| Динамика подвески и отдача шасси | `src/game/engine/systems/TankAnimationSystem.ts`, `src/game/tuning.ts` |
| УВН башни и состояние тангажа ствола | `src/core/catalogData.ts` (`TURRETS`), `src/game/tank/components.ts` |
| Сетевой сервис, комнаты и пакеты | `src/game/network/multiplayerService.ts`, `src/game/network/types.ts` |
| Удалённые игроки и сетевая интерполяция | `src/game/network/RemotePlayerManager.ts`, `src/game/engine/stages/NetworkSyncStage.ts` |
| Cel-Shading и чернильный контур силуэтов | `src/game/shaders/celShading.ts`, `src/game/tank/comicInkOutline.ts` |
| Пресеты дневной комиксной атмосферы | `src/game/atmospherePresets.ts` |
