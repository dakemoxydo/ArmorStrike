# Garage Loadout — Сборка танка

**Статус:** Approved  
**Слой:** Meta / UI  
**Связано:** [[Tank_Movement]], оружие, [[Match_Framework]]

## Модель сборки

**Корпус × Башня = 3 × 3 = 9** валидных loadout'ов.

| Корпус (`HullId`) | Башня (`TurretId`) → оружие |
|-------------------|-----------------------------|
| hunter / viking / mammoth | railgun / flamethrower / cannon |

Данные: `HULLS`, `TURRETS` в `src/core/catalogData.ts`.  
Типы: `src/core/catalogTypes.ts`.

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
| `createTankEntity`, `createWeapon`, `buildPlayerTank` | `src/game/PlayerFactory.ts` |
| `RunState.load/save` | `src/game/RunState.ts` |
| `Garage` | `src/components/Garage.tsx` |
| `GarageBinding` | `src/game/GarageBinding.ts` |
