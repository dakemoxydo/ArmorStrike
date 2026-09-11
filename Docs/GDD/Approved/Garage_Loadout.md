# Garage Loadout — Сборка танка

**Статус:** Approved  
**Слой:** Meta / UI  
**Связано:** [[Tank_Movement]], оружие, [[Match_Framework]]

## Модель сборки

**Корпус × Башня = 5 × 3 = 15** валидных loadout'ов.

| Корпус (`HullId`) | Башня (`TurretId`) → оружие |
|-------------------|-----------------------------|
| hunter / viking / mammoth / speedy / titan | railgun / flamethrower / cannon |

Данные: `HULLS`, `TURRETS` в `src/core/catalogData.ts`.  
Типы: `src/core/catalogTypes.ts`.

## Лестница корпусов

Порядок ключей `HULLS` = порядок карточек в гараже и цикл корпусов ботов
(`HULL_IDS[i % 5]`). Полные статы — в [[Tank_Movement]].

| Корпус | Ниша | Броня / скорость |
|--------|------|------------------|
| `hunter` | Средний универсал | 100 HP / 15.5 |
| `viking` | Штурм, скорость | 80 HP / 19.5 |
| `mammoth` | Тяжёлая броня | 160 HP / 11.0 |
| `speedy` | Перехватчик, макс. скорость | 70 HP / 23.5 |
| `titan` | **Флагман брони** — самый тяжёлый и медленный | 190 HP / 9.5 |

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
| `Garage.tsx` | вкладки КОРПУС / БАШНЯ, passport stats |
| `HullCard` / `TurretCard` | карточки выбора |
| `RunState.currentHull/Turret` | runtime |
| `localStorage['as2_loadout']` | `{ hullId, turretId }` |
| 3D preview | `PreviewController` + `buildTankMesh` |

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
