# Standard: Weapons, Projectiles & Damage

**Статус:** engineering standard  
**Код:** `src/game/weapons/*`, `src/game/engine/Projectile*`, `src/core/DamageSystem.ts`, `CombatSystem.ts`  
**GDD:** [Weapon Cannon](../GDD/Approved/Weapon_Cannon.md), [Weapon Railgun](../GDD/Approved/Weapon_Railgun.md), [Weapon Flamethrower](../GDD/Approved/Weapon_Flamethrower.md), [Projectile System](../GDD/Approved/Projectile_System.md), [Damage System](../GDD/Approved/Damage_System.md)  
**Связано:** [Core](Core.md) · [Core Patterns](Core_Patterns.md) · [Standard Tank](Standard_Tank.md)

## 1. Weapon strategy (единый интерфейс)

```ts
interface Weapon {
  readonly owner: WeaponOwner;
  setFire(active: boolean): void;
  update(dt: number, ctx: WeaponContext): void;
  updateReload(dt: number): void;
  requestReload(): void;
  dispose(): void;
  getAmmoState(): WeaponAmmoState;
}
```

Реализации:
- `CannonWeapon` — ballistic projectile pool
- `RailgunWeapon` — hitscan + charge FSM
- `FlamethrowerWeapon` — cone / overlap damage + particle pool

Запрещено: `switch (weaponType)` в `Game` / stage. Ветвление — только в `createWeapon` (и catalog).

## 2. Owner & context ports

| Тип | Назначение |
|-----|------------|
| `WeaponOwner` | `TankLike` + fireTimer, params, visual muzzle/barrel, onFired, setBarrelKick? |
| `CombatPeer` | peer в `ctx.tanks` (position/alive + visual.group) |
| `WeaponContext` | `{ tanks, colliders }` — **без** concrete Arena |
| `WeaponDeps` | scene, EffectsPort, AudioPort, DamageSystem, ProjectileManager, onShotFired? |

Оружие не знает о React, HUD React-tree, match modes / WaveManager.

## 3. Fire pipeline (кадр)

1. Input/AI: `setFire(wantsFire)`
2. `WeaponSystemStage` → `WeaponSystem.update` → `weapon.update`
3. Оружие само решает charge / ammo / spawn projectile / hitscan
4. `owner.onFired(recoil)` — cooldown + knockback + barrel kick
5. Урон → `DamageSystem` / `applyHit` (не прямой `health -=` снаружи entity)

`canFire()` на entity — только `alive && fireTimer <= 0`.  
Контракт «есть ли патроны/заряд» — **внутри** weapon.

## 4. Projectiles

- `ProjectileManager` — object pool (`POOL_SIZE ≈ 42`).
- `Shot` — runtime record (dir, damage, splash, owner, weaponType, …).
- `ProjectileBehavior` — strategy на тип; **сейчас** зарегистрирован только `cannon` в `BEHAVIORS`.
- Railgun / flamethrower **не** обязаны идти через pool.

`HitContext`: colliders, tanks, effects, damageSystem, onTankHit.

Правило C2 (уже в stages): **реальный HP** только через `damageSystem.applyDamage` (takeDamage + hooks).  
Не вызывать `onTankDamaged` / presentation hook в обход applyDamage.

## 5. Shared hit helpers

`applyHit` / `applySplashHit` (`engine/applyHit.ts`):
- applyDamage + knockback + visual effect callback
- вызывающий задаёт формулу dmg / силу толчка / effect
- устраняет copy-paste между railgun, flame, projectile, splash

## 6. DamageSystem split

**core (pure):**

```ts
createDamageSystem(arena, hooks): DamageSystem
// applyDamage → if alive && dmg>0 → target.takeDamage → hooks.onTankDamaged
// applyKnockback, damageBlock
```

**game glue:** `CombatSystem`
- владеет `damageSystem`
- hooks: audio, shake, `GameEvent` (playerHit / enemyHit / kill), scoring, player death callback, block VFX

Правило: scoring/VFX **никогда** не внутри `core/DamageSystem`.

## 7. Catalog boundary

- Статы оружия / hull / turret — `src/core/catalog*` + `WeaponCatalog` / `TankCatalog`.
- Runtime tuning constants — `game/constants`, `WEAPON_TUNING` где уже заведено.
- Новое оружие: catalog entry → class implementing `Weapon` → ветка в `createWeapon` → tests.

## 8. Checklist нового оружия

- [ ] Implements `Weapon` полностью (включая dispose)
- [ ] Depends on ports, not concrete Effects/Audio/Arena
- [ ] Damage only via DamageSystem / applyHit
- [ ] Ammo state через `buildAmmoState` shape
- [ ] Player & bot factory path без дублирования
- [ ] Unit tests на pure fire logic / cone / FSM
