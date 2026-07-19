# Standard: Tank Entity & Systems

**Статус:** engineering standard  
**Код:** `src/game/Tank.ts`, `src/game/tank/*`, `src/game/engine/systems/Tank*.ts`  
**GDD-механика:** [Tank Aim](../GDD/Approved/Tank_Aim.md), [Tank Movement](../GDD/Approved/Tank_Movement.md), [Health And Regen](../GDD/Approved/Health_And_Regen.md) (числа — там)  
**Связано:** [Core](Core.md) · [Core Patterns](Core_Patterns.md) · [Standard Weapon](Standard_Weapon.md)

## 1. Entity = id + composition

Runtime-сущность: **`TankEntity`**.

Хранение (SRP-слайсы):

| Component | Класс / тип       | Ответственность                                        |
| --------- | ----------------- | ------------------------------------------------------ |
| motion    | `TankMotionState` | yaw, aim, throttle, boost, knockback, vel              |
| combat    | `TankCombatState` | health, alive, deathT, fireTimer, lastAttackerId       |
| buffs     | `TankBuffState`   | wave multipliers + `BuffBaseSnapshot`                  |
| fx        | `TankFxState`     | hitFlash, barrelKick, smoke/dust acc (presentation)    |
| visual    | `TankVisual`      | Three mesh tree; **position** живёт на `visual.group`  |
| params    | `TankParams`      | maxHealth, speeds, damage, cooldown, weaponType, range |
| weapon    | `Weapon?`         | strategy instance                                      |

Запрещено: раздувать `TankEntity` новой «логикой кадра» (движение, aim, FX). Это работа systems.

## 2. Flat port projections

`TankEntity` реализует structural ports через getters/setters:

- `TankLike` (`core/types`) — урон / hit-test
- `WeaponOwner` — оружие
- `MotionBody` / `AimBody` / … — sim systems
- `ControllableTank` — player input
- `BuffableTank` — wave buffs
- `HudUnit` / `CameraFollowable` — UI / camera

Правило: **call sites зависят от узкого порта**, не от полного класса.  
Новое поле: сначала component → затем flat projection, если порт уже существует.

## 3. Factory (единый путь сборки)

```
createTankEntity(input)  →  hull+turret params + buildTankMesh + TankEntity
createWeapon(owner, type, deps)  →  Railgun | Flamethrower | Cannon
```

- Игрок: `buildPlayerTank` / PlayerFactory path
- Боты: `botSpawn` → тот же `createTankEntity` + `createWeapon`
- Скейлы волны (`healthScale`, `damageScale`, …) — только на factory input, не хардкод в entity.

## 4. Sim systems (ISP)

Порты: `src/game/tank/simPorts.ts`.

`TankSystem` (живой танк, порядок фиксирован):

1. `TankMotionSystem.updateOne` — drive / boost / knockback
2. `TankCombatTimersSystem.updateOne` — heal, fireTimer, reload tick
3. `TankAimSystem.updateOne` — turret → aimYaw
4. `TankPresentationSystem.sync` — yaw/turret → mesh

Отдельно (другие stages): `TankAnimationSystem`, `TankFxSystem`, `PhysicsSystem` (`PhysicsBody`).

Правила написания system:
- Сигнатура `updateOne(body: NarrowPort, dt)` или batch по массиву портов.
- **Без** импорта React, **без** знания `GameMode` (кроме явных stage-гейтов).
- Мёртвые танки (`!alive`) не гоняются в motion/weapon (см. существующие early-continue).

## 5. Damage entry на entity

- `takeDamage(dmg, attackerId)` — **чистая** логика HP/death (без VFX).
- Смерть: health=0, alive=false, deathT=0, throttle/steer=0.
- Presentation feedback: `fx.hitFlash`, `fx.timeSinceHit` — не через React.

Полный путь HP-урона снаружи: только `DamageSystem.applyDamage` (см. [Standard Weapon](Standard_Weapon.md)).

## 6. Lifecycle / dispose

`dispose(scene)`: `weapon?.dispose()`, remove group, `disposeObject3D`.  
Новые runtime-ресурсы (pools, listeners) обязаны чиститься здесь или в weapon.dispose.

## 7. Checklist нового tank-related кода

- [ ] Данные в component, не god-fields на entity
- [ ] System принимает узкий port из `simPorts`
- [ ] Factory path для player и bot общий
- [ ] Нет импорта `core` ← `game` наоборот
- [ ] Unit-test на pure helper, если есть формула
