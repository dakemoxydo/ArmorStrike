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
  /** Однократно при alive → !alive владельца: стоп звуков/заряда, скрыть визуалы (optional). */
  onOwnerDeath?(): void;
  dispose(): void;
  getAmmoState(): WeaponAmmoState;
}
```

Реализации:
- `CannonWeapon` — ballistic projectile pool
- `RailgunWeapon` — hitscan + неотменяемый charge FSM (M20), отложенный показ (M19–M21)
- `FlamethrowerWeapon` — cone / overlap damage + particle pool

Запрещено: `switch (weaponType)` в `Game` / stage. Ветвление — только в `createWeapon` (и catalog).

## 2. Owner & context ports

| Тип | Назначение |
|-----|------------|
| `WeaponOwner` | `TankLike` + fireTimer, params, visual muzzle/barrel, onFired, setBarrelKick? |
| `CombatPeer` | peer в `ctx.tanks` (position/alive + visual.group) |
| `WeaponContext` | `{ tanks, colliders }` — **без** concrete Arena |
| `WeaponDeps` | scene, EffectsPort, AudioPort, `LightRig`, DamageSystem, ProjectileManager, onShotFired? |

Оружие не знает о React, HUD React-tree, match modes / WaveManager.

> **Исключение из «только порты»:** `WeaponDeps.lights: LightRig` — оружие берёт слоты
> постоянного бюджета света **напрямую** (порт `EffectsPort` его не отдаёт). Это осознанно:
> число источников света входит в ключ кэша шейдерных программ, поэтому риг — общий
> инвариант, а не деталь реализации одного эффекта. Правила работы со светом —
> [Standard Frame Stability](Standard_Frame_Stability.md) §1.

## 3. Fire pipeline (кадр)

1. Input/AI фиксируют `wantsFire` (`PlayerInputStage` / `BotAiStage`)
2. `TankSystemStage` — motion/aim интегрируются, презентация башни синкаится
3. `WeaponFireStage` → `weapon.setFire(wantsFire)` — строго после синка башни,
   иначе выстрел вылетает из дула прошлого кадра
4. `WeaponSystemStage` → `WeaponSystem.update` → `weapon.update`
5. Оружие само решает charge / ammo / spawn projectile / hitscan
6. `owner.onFired(recoil)` — cooldown + knockback + barrel kick
7. Урон → `DamageSystem` / `applyHit` (не прямой `health -=` снаружи entity)

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
- [ ] Depends on ports, not concrete Effects/Audio/Arena (свет — через `WeaponDeps.lights`, см. §2)
- [ ] Damage only via DamageSystem / applyHit
- [ ] Ammo state через `buildAmmoState` shape
- [ ] Player & bot factory path без дублирования
- [ ] Unit tests на pure fire logic / cone / FSM

## 9. Оружейные FX: pure-слой + presentation-классы (M20–M22)

Паттерн из рельсотрона; новое оружие со сложной презентацией следует ему:

1. **Чистый слой без Three** — решения/таймлайны в отдельных маленьких модулях
   `src/game/weapons/*.ts`, тестируемых как обычные функции/классы:
   `railgunFireLogic.ts` (гейт `railgunShouldStartCharge`, геометрия шаров
   `chargeBallRadii`), `railgunBeamSweep.ts` (`BeamSweep` — события по
   дистанции `d` бегущего фронта), `railgunBlockers.ts`. Никаких mesh'ей,
   никаких портов — только числа и порядок.
2. **Presentation-класс владеет своими mesh'ами** (`RailgunBeamFx`,
   `RailgunChargeBalls`): конструкция получает `scene` (+ `LightRig` для
   лучей), сам никогда не добавляет/не удаляет источники света — только пишет
   в слоты рига (бюджет света, [Standard Frame Stability](Standard_Frame_Stability.md) §1).
   Прозрачность `depthWrite:false`, `frustumCulled=false`. Дальше два разных
   приёма: у шаров заряда glow (additive) лежит поверх «материи» (NormalBlending)
   через `renderOrder`; у луча (M22) **один** additive-слой, а форма/мерцание/
   толщина целиком в `ShaderMaterial` — стек cylinder'ов «core + body + glow»
   давал обводку вокруг линии, от неё отказались. Подприём оттуда же: линия —
   **лента из двух колонок**, её толщина задаётся в вершинном шейдере ПОСЛЕ
   проекции: в CSS-пикселях и перпендикулярно спроецированной оси луча (направление
   линии на экран — производная перспективы вдоль оси, нормализованная в пиксельном
   пространстве). Раздувать трубку вдоль мирового радиала ДО проекции нельзя: когда
   луч уходит от камеры (в шутере это основной ракурс) радиал почти параллелен
   направлению взгляда, его экранная проекция схлопывается, и «пиксельный пол»
   превращается в 1–2 px — эффект еле заметен при корректных юниформах и вызовах.
   Профиль поперёк линии (`vWide`) тоже экранный, иначе горячее ядро уезжало бы
   к краю. Экранную цену пикселя эффект считает из стабильных величин — размеров
   окна и номинального fov, с зажатием в разумный диапазон. К `renderer`/живой
   камере в момент рендера не обращаемся: редкая камера (ortho-проход, ресайз с
   нулевой высотой) иначе обнуляет или раздувает габарит так, что эффект исчезает
   совсем.
3. **Ref-counted shared геометрия уровня модуля** — N экземпляров оружия делят
   одну `BufferGeometry` (лента луча — ключ по радиусу базы, unit-сфера у шаров);
   acquire в конструкторе, release в `dispose()`, гео жива до последней ссылки
   (hot-reload/test-safe).
4. **Оркестрация из FSM явными хуками**, не самонаблюдением:
   `beginCharge()` в кадре старта, `setProgress(p)` каждый кадр CHARGING,
   `confirmFire()` в кадре выстрела, `update(dt, owner)` каждый кадр (ранний
   выход в off), `hide()` в `onOwnerDeath`, `dispose()` в `dispose`. Позиция
   берётся живой с muzzle каждый кадр (`fillMuzzleAndAim`) — FX трясутся
   вместе со стволом бесплатно.
5. **Урон мгновенен, показ отложен** (контракт hitscan-оружия): урон/knockback/
   пинги резолвятся в кадре firing; визуалы собираются в payload
   (`PendingShotVisual`), воспроизводятся через `tracerDelay`, а внутри окна событие за
   событием отдаёт `BeamSweep`. Синхронность под-эффектов (glow/FOV/pull/шары
   → «соприкосновение» = кадр выстрела) получается естественно: всё едет от
   одного FSM-овского `progress`, отдельных связок нет.
