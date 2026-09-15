# Health & Lifecycle — Прочность и живучесть танка

**Статус:** Approved  
**Слой:** Simulation / Domain  
**Связано:** [[Damage_System]], [[Tank_Movement]], [[Game_Lifecycle]]

## Модель HP

- `maxHealth` — из корпуса (`HULLS`): Speedy (120), Викинг (150), Хантер (180), Мамонт (250), Титан (300) × `healthScale` (матч-боты: `BOT_NORMAL.healthScale`).
- `health` — текущее.
- `alive` — false при `health <= 0`.
- Отдельной «брони» (damage reduction) **нет**: «броня» = запас HP + slow корпус.
- **Ремонт вне боя (Out-of-Combat Repair):**
  - При получении урона таймер покоя `timeSinceDamaged` сбрасывается в 0.
  - Если танк не получает урон в течение `REPAIR_TUNING.outOfCombatDelaySec` (**5.0 с**), включается плавный автоматический ремонт со скоростью `baseRatePerSec + maxHealth * maxHealthFracPerSec` (**8.0 HP/с + 4% maxHealth/с**) вплоть до `maxHealth`. Speedy восстанавливается со скоростью 12.8 HP/с (~9 с), Титан — 20.0 HP/с (~15 с).
  - В командных режимах сохраняется мгновенная поддержка союзной турелью «Изида» ([[Weapon_Isida]]). Мёртвые танки не ремонтируются. При респауне HP восстанавливается мгновенно до 100%.

## Получение урона

`TankEntity.takeDamage(dmg, attackerId)` (storage: `combat` + `fx` + `motion` components; flat projections for ports):

```
if !alive || dmg <= 0: return
health -= dmg          # combat.health
hitFlash = 1           # fx.hitFlash
lastAttackerId = …     # combat.lastAttackerId
if health <= 0:
  health = 0
  alive = false
  deathT = 0
  throttle = steer = 0 # motion
```

**Важно:** боевой код **не** вызывает `takeDamage` напрямую — только через `DamageSystem.applyDamage` (хуки скоринга/VFX).

## Визуальные пороги

| Эффект | Условие | Система |
|--------|---------|---------|
| Hit flash | после урона (`fx.hitFlash = 1`) | `TankAnimationSystem` / bodyMats (J14: не presentation) |
| Smoke | `health / maxHealth < SMOKE_HEALTH_FRAC` (0.32) | `TankFxSystem` |
| Death anim | `!alive`, `deathT` | `TankAnimationSystem` |

## Смерть игрока (respawn, не game over)

1. `CombatSystem.onTankDestroyed` → `onPlayerDeath`
2. `applyPlayerDeathState`: `deathT = 0`, `paused = false`, input off + release lock (без auto-pause)
3. Death cam длится `respawnDelaySec` (**4 с**, `matchConfig.ts`) → `RespawnController.respawnTank`: restore HP, `invulnT = spawnInvulnSec` (**2 с**), re-lock input, `startEngine`

Смерть игрока **не** заканчивает матч — конец только через win conditions (`evaluateMatchEnd`).
См. [[Game_Lifecycle]] / [[Match_Framework]].

## Классы

| Символ | Файл |
|--------|------|
| `TankEntity.takeDamage` | `src/game/Tank.ts` |
| `TankCombatTimersSystem` | `src/game/engine/systems/TankCombatTimersSystem.ts` |
| `SMOKE_HEALTH_FRAC` | `src/game/tuning.ts` |
| `applyPlayerDeathState` | `src/game/deathLifecycle.ts` |
