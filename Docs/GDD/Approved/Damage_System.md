# Damage System — Централизованный урон

**Статус:** Approved  
**Слой:** Domain (`core/`) + Combat glue (`game/`)  
**Связано:** [[Health_And_Regen]], [[Weapon_Cannon]], [[Weapon_Railgun]], [[Weapon_Flamethrower]], [[Scoring]]

## Принцип

Чистая логика HP отделена от эффектов:

1. **`core/DamageSystem`** — `takeDamage` / knockback / `arena.damageBlock`
2. **Hooks (`CombatSystem`)** — звук, shake, события HUD, скоринг, explosion

`core/` **не** импортирует `game/`.

## Контракт

```ts
interface DamageSystem {
  applyDamage(target: TankLike, dmg: number, source: TankLike): void
  applyKnockback(target: TankLike, dir: Vector3, force: number): void
  damageBlock(blockId: number, dmg: number, hitPos: Vector3): void
}
```

Фабрика: `createDamageSystem(arena, hooks)` — `src/core/DamageSystem.ts`.

### applyDamage

```
if !target.alive: return
if source.id === target.id: return    // self-hit
if (target.invulnT ?? 0) > 0: return  // spawn invuln (match respawn)
if source.teamId != null && source.teamId === target.teamId: return  // FF off (team modes)
if dmg <= 0: return                    // VFX-only hits (cannon direct via splash path uses 0 here)
target.takeDamage(dmg, source.id)
hooks.onTankDamaged(target, dmg, source)
```

Гейты self/invuln/FF — **канон здесь**. Beam-оружия (огнемёт, «Изида»)
проверяют их заранее локально — это защитная дубликация ради пропущенного
applyHit-вызова на тик, а не второй источник истины (J14).

### applyKnockback

```
target.knockback += dir * force
```

Затухание knockback — в [[Tank_Movement]] (`KNOCKBACK_DECAY`).

### damageBlock

```
res = arena.damageBlock(blockId, dmg)
if res === 'destroyed': hooks.onBlockDestroyed(hitPos, 1.4)
```

Масштав взрыва — фиксированные `1.4` (FX-тюнинг, J14), не габарит блока.

## applyHit / applySplashHit

`src/game/engine/applyHit.ts` — общий helper оружия и снарядов:

| Helper | Поведение |
|--------|-----------|
| `applyHit` | damage + knockback + effect(hitPoint) |
| `applySplashHit` | damage + knock **от эпицентра** + effect(target.pos) |

## Splash falloff (пушка)

`ProjectileManager.doSplash`:

```
falloff = 1 - dist / splashRadius
dmg     = round(splashDmg * falloff)
```

Цель прямого попадания может исключаться из splash (`exclude`).

## CombatSystem hooks

| Событие | Действия |
|---------|----------|
| Игрок получил урон | `hitPlayer`, shake 0.3, `playerHit` (`dir` относительно ракурса камеры `aimYaw` для точного позиционирования дуги на экране) |
| Бот получил урон | `hitEnemy`, `enemyHit` |
| Танк уничтожен | explosion, debris; kill score / player death |
| Блок уничтожен | explosion + debris + audio |

## Классы

| Символ | Файл |
|--------|------|
| `createDamageSystem` | `src/core/DamageSystem.ts` |
| `TankLike`, `DamageSystem` | `src/core/types.ts` |
| `CombatSystem` | `src/game/CombatSystem.ts` |
| `applyHit`, `applySplashHit` | `src/game/engine/applyHit.ts` |
