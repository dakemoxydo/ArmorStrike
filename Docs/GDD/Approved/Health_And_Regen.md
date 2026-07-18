# Health & Regen — Прочность и саморемонт

**Статус:** Approved  
**Слой:** Simulation / Domain  
**Связано:** [[Damage_System]], [[Tank_Movement]], [[Game_Lifecycle]]

## Модель HP

- `maxHealth` — из корпуса (`HULLS`) × `healthScale` (у ботов растёт с волной).
- `health` — текущее.
- `alive` — false при `health <= 0`.
- Отдельной «брони» (damage reduction) **нет**: «броня» = запас HP + slow корпус.

## Получение урона

`TankEntity.takeDamage(dmg, attackerId)`:

```
if !alive || dmg <= 0: return
health -= dmg
hitFlash = 1
lastAttackerId = attackerId
timeSinceHit = 0
if health <= 0:
  health = 0
  alive = false
  deathT = 0
  throttle = steer = 0
```

**Важно:** боевой код **не** вызывает `takeDamage` напрямую — только через `DamageSystem.applyDamage` (хуки скоринга/VFX).

## Саморемонт

`TankCombatTimersSystem` + `tuning.ts`:

| Константа | Значение | Смысл |
|-----------|----------|--------|
| `HEAL_DELAY` | 10 с | пауза после последнего хита |
| `HEAL_PER_SEC` | 3.5 HP/с | скорость регена |

```
timeSinceHit += dt
if timeSinceHit > HEAL_DELAY && health < maxHealth:
  health = min(maxHealth, health + HEAL_PER_SEC * dt)
```

## Визуальные пороги

| Эффект | Условие | Система |
|--------|---------|---------|
| Hit flash | после урона | `TankPresentationSystem` / materials |
| Smoke | `health / maxHealth < SMOKE_HEALTH_FRAC` (0.32) | `TankFxSystem` |
| Death anim | `!alive`, `deathT` | `TankAnimationSystem` |

## Смерть игрока

1. `CombatSystem.onTankDestroyed` → `onPlayerDeath`
2. `applyPlayerDeathState`: `deathT = 0`, `paused = false`, input off
3. ~2 с death cam → `mode = 'over'` + `gameOver`

См. [[Game_Lifecycle]].

## Классы

| Символ | Файл |
|--------|------|
| `TankEntity.takeDamage` | `src/game/Tank.ts` |
| `TankCombatTimersSystem` | `src/game/engine/systems/TankCombatTimersSystem.ts` |
| `HEAL_*`, `SMOKE_HEALTH_FRAC` | `src/game/tuning.ts` |
| `applyPlayerDeathState` | `src/game/deathLifecycle.ts` |
