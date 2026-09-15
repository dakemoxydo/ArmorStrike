# Garage Loadout — Сборка танка

**Статус:** Approved  
**Слой:** Meta / UI  
**Связано:** [[Tank_Movement]], оружие, [[Match_Framework]]

## Модель сборки

**Корпус × Башня = 5 × 5 = 25** валидных loadout'ов.

| Корпус (`HullId`) | Башня (`TurretId`) → оружие |
|-------------------|-----------------------------|
| hunter / viking / mammoth / speedy / titan | railgun / flamethrower / cannon / gauss / isida |

Данные: `HULLS`, `TURRETS` в `src/core/catalogData.ts`.  
Типы: `src/core/catalogTypes.ts`.

## Лестница корпусов

Порядок ключей `HULLS` = порядок карточек в гараже и цикл корпусов ботов
(`HULL_IDS[i % 5]`). Полные статы — в [[Tank_Movement]].

| Корпус | Ниша | Броня / скорость |
|--------|------|------------------|
| `hunter` | Средний универсал | 180 HP / 12.5 |
| `viking` | Штурм, скорость | 150 HP / 15.0 |
| `mammoth` | Тяжёлая броня | 250 HP / 11.5 |
| `speedy` | Перехватчик, макс. скорость | 120 HP / 18.0 |
| `titan` | **Флагман брони** — самый тяжёлый и защищённый | 300 HP / 10.2 |

`titan` добавлен последним в каталог: порядок существующих ключей не менялся,
поэтому раздача корпусов ботам в первых 4 индексах ростера прежняя.
Штурмовики не берут сверхтяжёлые корпуса — `rosterSpawn.makeBot` свапает
`mammoth`/`titan` на `viking` (см. [[AI_Bots]]).

## Параметры entity

`createTankEntity`:

```
maxHealth   = hull.maxHealth * healthScale
speed/...   = hull.*
turretSpeed = turret.turretSpeed
damage      = turret.damage * damageScale
shotCooldown= turret.shotCooldown * shotCooldownScale
weaponType  = turret.weaponType
range       = turret.range
```

Игрок: scales = 1. Боты матча: `BOT_NORMAL` (`healthScale` / `damageScale` / `shotCooldownScale` в `matchConfig.ts`; без wave ramp).

## UI / persistence

| Элемент | Деталь |
|---------|--------|
| `Garage.tsx` | вкладки КОРПУС / БАШНЯ, passport stats, safe-zone-инсеты + peek-класс |
| `HullCard` / `TurretCard` | компактные карточки (имя + бейдж + бары; описание — тултип) |
| Кадрирование предпросмотра | [[Garage_Viewport_Safe_Zone]]: танк центрируется в свободной от UI зоне |
| `RunState.currentHull/Turret` | runtime |
| `localStorage['as2_loadout']` | `{ hullId, turretId }` |
| 3D preview | `PreviewController` + `buildTankMesh` |

Выбор в UI — оптимистичный; `GameApi.setGarageSelection` возвращает
`Promise`: коммит в `RunState` (+ save + `garageChanged`) происходит только
после успешной пересборки превью, при ошибке UI откатывает карточку к
последнему закоммиченному корпусу/башне.

## Стили

- Игрок: `buildPlayerStyle()` (teal accent).
- Боты: `buildBotStyle(color)` из `COLORS.bots`.

## Классы

| Символ | Файл |
|--------|------|
| `HULLS`, `TURRETS` | `src/core/catalogData.ts` / `catalog.ts` |
| `createTankEntity`, `createWeapon` | `src/game/PlayerFactory.ts` |
| `RunState.load/save` | `src/game/RunState.ts` |
| `Garage` | `src/components/Garage.tsx` |
| `GarageBinding` | `src/game/GarageBinding.ts` |
