# Weapon: Isida «Изида» (Nano-Beam Support)

**Статус:** Approved  
**Тип:** Directional continuous nano-beam: тиковый урон + вампиризм по врагам, ремонт союзников в командных режимах  
**Связано:** [[Damage_System]], [[Tank_Aim]], [[Health_And_Regen]], [[Scoring]], [[Weapon_Flamethrower]] (модель баллона)  
**Прототип:** турель «Изида» (Tanki Online); канон — ru.tankiwiki.com/Izida.

## Фэнтези

Генератор нанороботов: луч, который *разрушает* структуру брони врага и *восстанавливает*
её у союзника. Направление потока частиц читается глазами: к врагу — ремонтные наниты,
обратно — «высосанное» сырьё (вампирство). В DM союзников нет по построению — оружие
чисто вампирическое; в TDM/CP — единственный саппорт мете.

## Тюнинг (`WEAPON_TUNING.isida`)

| Параметр | Значение | Описание |
|----------|----------|----------|
| `damagePerSec` | 42 | DPS по врагу (канон M1–M2) |
| `healPerSec` | 32 | лечение союзника в секунду |
| `vampirism` | 0.35 | доля **фактического** тикового урона, возвращаемая стрелку |
| `tickRate` | 0.25 с | период тика (аккумулятор, как у flamethrower) |
| `range` | 20 м | дальность захвата/луча, без спада |
| `coneHalfAngle` | 10° (π/18) | полуугол конуса автозахвата (канон: полный 20°) |
| `acquireTime` | 0.3 с | пауза перестроения луча при захвате/смене цели (тиков нет) |
| `healHpFrac` | 0.99 | союзник с HP ≥ 99% max не захватывается и отпускается |
| `energyMax` | 100 | ёмкость баллона = «магазин» HUD |
| `drainAttack` | 30 ед/с | расход в атаке |
| `drainHeal` | 18 ед/с | расход в ремонте |
| `drainIdle` | 12 ед/с | зажатый спуск без цели — дуга «в холостую» |
| `rechargeRate` | 24 ед/с | regen при погасшем луче × `reloadSpeedMul` |
| `knockback` | 0 | луч не сдувает с прицела |
| `fireShakePlayer` | 0.014 | микро-отдача в камеру при тиках нано-луча |
| `flowCount` | 48 | инстансы потока нанороботов |
| `colorAttack` | `0xff2d6b` | coral-magenta край дуги/потока в атаке |
| `colorHeal` | `0x39e6a8` | mint в ремонте |
| `colorIdle` | `0x2ee6c0` | бирюзовый холостой дуги |

`turretSpeed: 7.5`. `TURRETS.isida`: `damage = round(damagePerSec × tickRate) = 11`
(т.е. тиковый урон — source of truth в каталоге, инвариант в `catalog.test.ts`),
`magazine = energyMax = 100`, `shotCooldown = 0`, `fullReload = 0`, `recoil = 0`,
`range = 20`, badge `НАНОЛУЧ`. Мета: `WeaponCatalog.isida` — «ИЗИДА · НАНО-ДУГА ПОДДЕРЖКИ»,
accent `#39e6a8`.

## FSM (`IsidaWeapon`)

Дискретный режим наружу — `getBeamMode(): BeamMode`
(`'none' | 'idle' | 'acquire' | 'attack' | 'heal'`).

```
beamOn = latch: зажат спуск && alive && energy > 5 (порог старта)
        снимается: спуск / смерть / energy ≤ 0

mode = beamOn ? (target ? (acquireT > 0 ? 'acquire' : targetMode) : 'idle') : 'none'
```

- **Энергия:** `beamOn` → drain по режиму (30/18/12); иначе regen `24 × reloadSpeedMul`
  до потолка. Полный бой ≈ 3.3 с, ремонт ≈ 5.5 с → цикл «burst → откат → репозиционирование».
- **Тики:** аккумулятор `tickT ≥ tickRate`, только при `beamOn && target && acquireT ≤ 0`.
- **Ammo-мост в HUD:** `getAmmoState()` → `ammo = round(energy)`, `reloading = energy < 10`
  (это «низкий баллон», а не магазин — и текст, и щелчок `audio.reload` гейтятся
  общим предикатом `isBeamTurretId`, G3), `reloadProgress = energy/energyMax`. `updateReload` /
  `requestReload` — no-op (непрерывное оружие, как flamethrower).

## Захват цели (`isidaTargeting.ts`, чистые функции)

`acquireIsidaTarget(peers, owner, cone, colliders)` — один проход по танкам:

1. Кандидат: жив, не owner, в конусе `coneHalfAngle` от оси башни (dot ≥ cos),
   `dist ≤ range` (без спада), чистая `losClear` по XZ (стены и танки рвут луч).
2. **Враг** (`isBeamHostile`, зеркалит `match/teams`: FFA null — враждебен всем) —
   приоритет: берется ближайший к оси.
3. **Союзник** (`isBeamAllied && teamId !== null && health < maxHealth × healHpFrac`) —
   только если врага в конусе нет. В DM хил-лок невозможен по построению.
4. **Sticky:** текущая цель держится, пока проходит `isBeamCandidate` для своего режима
   (тот же набор проверок); срыв (смерть/LOS/выход из конуса/долечили) → в следующий
   кадр пересборка с фазой `acquire` 0.3 с (анти-пинг-понг между двумя танками).
5. Башню захват НЕ двигает — наведение остаётся игроком.

`targetHighlight.ts`: для isida радиус-конус подсветки = `coneHalfAngle` (игрок видит
область захвата так же, как у гаусса). Крест-`scanThrough` у прицела — не для изиды
(луч blockится препятствиями, «прощупывание» врага сквозь стену обманывало бы).

## Атака: тиковый урон + вампиризм

```
if (target.invulnT > 0) return;            // спавн-неуязвимость: ни урона, ни возврата
dmg = resolveWeaponDamage(owner.params.damage, damagePerSec × tickRate);   // игрок: 11
applyHit(damageSystem, target, dmg, owner, knockDir, knockback = 0, trailPuff(coral), hitPoint);
owner.health = min(owner.maxHealth, owner.health + dmg × 0.40);            // cap на maxHealth
```

Вампиризм привязан к **гарантированному тику**: все пять условий молчаливого пропуска
`DamageSystem` (!alive, self, invuln, FF, dmg≤0) исключены заранее — `invulnT` гасится
в оружиевом pre-check, остальные гарантированы захватом/гейтами. FF-обхода нет:
`applyHit` не пропустит урон по своим — нечего и «возвращать».

## Ремонт союзника и очки поддержки

```
before = t.health
t.health = min(t.maxHealth, t.health + healPerSec × tickRate)   // 5.5 HP/тик, мимо DamageSystem
t.fx.healFlash = 1                                              // мятный отклик корпуса
healed = t.health − before                                      // только ФАКТИЧЕСКИЙ delta
if (owner.isPlayer): addSupportHeal(carry, healed) → onSupportScore(earned)
if (t.health ≥ t.maxHealth × 0.99) target = null                // долечен — отпустить
```

- **`SCORE.supportPerHp = 1`** — очко за фактическое вылеченное HP; дробный остаток
  переносится (`addSupportHeal` — чистая функция с `carry`, в `game/scoring.ts`).
  5 с ремонта ≈ +110 очков ≈ фрага (kill = 100).
- Начисление — **персональный `run.score`** (`GameBootstrap`: `onSupportScore(points) →
  run.score += points`), **не teamScore**: кемпинг-хил на точке не должен ломать
  экономику захвата; вклад саппорта в победу — живучесть союзников.
- Бот-владелец очков не получает (симметрично `applyPlayerKillScore(byPlayer)`).
- Ремонт не трогает `fx.timeSinceHit` — пассивный реген не «дублируется» и не сбрасывается.

## Отклик цели: `fx.healFlash`

Новое поле `TankFxState.healFlash` (`src/game/tank/components.ts`), рисуется в
`TankAnimationSystem`: `hitFlash` приоритетнее (белый, спад 6/с); иначе `healFlash`
спадает за 4/с и красит корпусные материалы в мятный
`emissive.setRGB(e·0.18, e, e·0.62)`, `e = healFlash·0.6`; иначе emissive гасится.
Симметрия: враг под лучом белит `hitFlash` + коралловые `trailPuff` на тик;
союзник — mint-вспышка корпуса + мятные `trailPuff`.

## Визуал луча

Бюджетные решения: **без новых источников света** (фиксированный бюджет `LightRig`
не расширяли — только `effects.trailPuff / impact / muzzle / addShake`), аудио — follow-up.

- **`NanoBeamFx`** — две тонкие шейдер-дуги (`NANO_ARC`: `radius 0.045`, `pixelWidth 7`,
  `amplitude 0.13`, `snapRate 14`, `filaments 5`, `muzzleStraight 0.5`), переиспользующие
  экспортированные `RailgunBeamFx` шейдеры, ref-counted геометрию (`acquireSharedBeamGeo`)
  и CSS-пиксельные утилиты — без дублирования шейдера и без регресса рельсы.
  Стартов из **двух рожков-эмитёров** (`muzzle ± right·0.17` / `− right·0.15 − dir·0.06`,
  per-arc `uSeed` 3.71/9.37 — нити не синхронны) и сходятся в точку попадания
  (`x, y+0.9, z`). При захвате — «раздутие» толщины `w = 0.45 + 0.55·(1 − acquireT/acquireTime)`
  (вместо BeamSweep у рельсы: фронт дуги натягивается), alpha fade-in `8/с`, fade-out `7/с`.
- **`NanoFlowPool`** — подпись оружия: InstancedMesh 48 гран-нанитов (икосаэдр 0.11,
  additive), спавн `SPAWN_RATE = 96/с`, скорость 0.9–1.7, helix-виток
  `angle = phase + time·6.5` с огибающей `sin(p·π)`. **Направление читается:**
  ремонт — поток от дула к союзнику (mint), вампиризм — разворачивается и бежит
  **от цели к стрелку** (coral): поглощение видно literally.
- **Энерго-связка модели:** `railGlowMat` башни анимируется оружием: в off — breathed
  `0.1 + 0.04·sin(2t)`; в бою база `attack 1.15 / heal 0.9 / idle 0.55 × (0.85 + 0.15·sin(9t))`;
  при `energy < 10` — тремор `|sin(18t)|` (мерцание «баллон садится»).
- Смерть владельца: beam fade + `flow.onOwnerDeath()` (долёт частиц запрещён), glow в idle.

## Модель башни (`buildIsida`, `src/game/tank/turret.ts`)

Layout `{ barrelY: 0.58, muzzleZ: 1.50 }`; бюджет 2882 вершины (shell 1793 +
barrel 1089) — внутри тестовой вилки 600–20000; габариты башни L×W×H ≈ 3.2 × 2.3 × 1.1.

- **Корпус:** гранёный купол по референсу Tanki Online: восьмигранный нижний
  пояс с тёмным швом, сплюснутый 7-гранный купол с вырезом 45° спереди —
  ниша под излучатель (стенки, задняя стенка, пол, потолок), сплошная крышка,
  боковые бронещёки, кормовые жалюзи и радиаторный блок, диагональные панели
  со светящимися окнами (`lamp`), люк, светящиеся полосы крышки, заклёпки.
- **«Клешни вместо ствола»:** ствола-трубы НЕТ. В `barrelGroup` —
  призматическая «голова» с гребнем и приводом наклона, тёмный блок
  генератора нанороботов со светящимся `rail`-ядром и магнитопроводом,
  два сходящихся зубца с `rail`-дорожками потока, стальными обоймами
  и `rail`-эмиттерами. Торцы эмиттеров строго в (±0.17, muzzleZ) —
  точках спавна дуг (`NanoBeamFx`).
- **`rail`-слот** заполняют ядро генератора, магнитопровод, дорожки потока
  и эмиттеры ⇒ `railGlowMat` существует (инвариант в `turretGeometry.test.ts`).

## HUD

- **Энерго-бар:** полный reuse канала flamethrower — `.flame-shell` + ref-paint ширины
  `.flame-fill` в `useGameHud` (`turretId === 'flamethrower' || 'isida'`), без per-frame
  React-рендеров: `ammoForcesHudRender` для двух непрерывных башен — `false`.
  Поверх — `.beam-shell` с режимным тейнтом (coral attack / bright mint heal / dim teal
  idle / blink acquire) и статус-лейблы `.weapon-status.is-beam-*`:
  `▼ ПОГЛОЩЕНИЕ`, `✚ РЕМОНТ`, `ЗАХВАТ ЦЕЛИ`, `ХОЛОСТОЙ ХОД` (пустой баллон приоритетнее:
  `ПЕРЕЗАРЯДКА`). Иконка прицела панели — `Zap`, в ремонте — `Wrench` (mint).
- **`beamMode`** попадает в снапшот из оружия: `HudModel` читает
  `player.weapon.getBeamMode?.() ?? 'none'` → `HudSnapshot.beamMode` (дискретное поле —
  само гонит re-render сравнением в `hudNeedsRender`).
- «ПУСТО · R» у isida не показывается (`weaponStatusKind` исключает непрерывные баллоны).
- Гараж: подсказка в паспорте «Нано-дуга · РЕМОНТ СОЮЗНИКОВ · ВАМПИРИЗМ 40%» (emerald).

## ИИ ботов

- `roleForBot('isida') → 'assault'` — агрессивная вампир-дуэль (лечение союзников ботами
  сознательно **не** в v1; роль `vamp` из черновика не заводили — assault уже даёт нужное
  поведение). Тюнинг: `preferredRange 11` (между flame 7 и default 20),
  `aimTolerance 0.13` — держит цель внутри конуса захвата 0.175 рад.
- **`BOT_TURRETS` не расширяли:** в v1 Изида — player-only (золотые таблицы
  `botDutyTable.test.ts` зафиксированы; выход в общий пул — отдельный баланс-тик).
  Вся механика при этом бото-совместима (вампирзм = самостоятельность, `isPlayer`-гейты
  только на тряску и очки).

## Классы и файлы

| Роль | Файл |
|------|------|
| `IsidaWeapon` (FSM, вампиризм, ремонт, glow) | `src/game/weapons/IsidaWeapon.ts` |
| `acquireIsidaTarget` / `isBeamCandidate` / `isBeamHostile` / `isBeamAllied` | `src/game/weapons/isidaTargeting.ts` |
| `NanoBeamFx` (2 дуги) | `src/game/weapons/NanoBeamFx.ts` |
| `NanoFlowPool` (поток нанитов) | `src/game/weapons/NanoFlowPool.ts` |
| Общие beam-примитивы (экспорты) | `src/game/weapons/RailgunBeamFx.ts` |
| `BeamMode`, `onSupportScore`, `getBeamMode` | `src/game/weapons/types.ts` |
| `addSupportHeal` / `SCORE.supportPerHp` | `src/game/scoring.ts`, `src/game/constants.ts` |
| `fx.healFlash` + ренд | `src/game/tank/components.ts`, `types.ts`, `simPorts.ts`, `src/game/engine/systems/TankAnimationSystem.ts` |
| Модель | `src/game/tank/turret.ts` (`buildIsida`) |
| Каталог | `src/core/catalogTypes.ts`, `catalogData.ts`, `WeaponCatalog.ts` |
| Wiring | `src/game/PlayerFactory.ts`, `GameBootstrap.ts`, `TankConfig.ts`, `targetHighlight.ts` |
| AI | `src/game/aiRoles.ts`, `aiTuning.ts` |
| HUD | `src/components/hud/HudWeapon.tsx`, `src/ui/hudPresentation.ts`, `src/game/HudModel.ts`, `src/hooks/useGameHud.ts`, `src/styles/hud.css` |

## Тесты

- `src/__tests__/isidaTargeting.test.ts` — чистая геометрия: фракции, конус/дальность/LOS,
  приоритет враг > союзник, `healHpFrac`, max-dot выбор, стики-проверки `isBeamCandidate`.
- `src/__tests__/IsidaWeapon.test.ts` — FSM по кадрам (0.1 с): acquire 0.3 → attack;
  тики кратны `TICK_DMG` + вампиризм `dmg × 0.40` с cap; invulnT → ни урона ни возврата;
  смерть/стена/долечивание срывают лок; три ставки drain + regen с потолком; порог старта
  `> 5`; healing кратно `healPerSec × tickRate`, `healFlash`, floor-carry очков
  `supportPerHp` (и не-игроку не платит); DM не лечит; `onOwnerDeath` / `onRespawn`.
- `scoring.test.ts` — `addSupportHeal` (floor + carry 5.5+5.5 = 11);
  `catalog.test.ts` — `TURRETS.isida.damage = round(45 × 0.25)` и инварианты каталога;
  `turretGeometry.test.ts` — `railGlowMat` у isida + вилка вершин/атрибутов;
  `uiUxPresentation.test.ts` — гейты HUD (`ammoForcesHudRender`, статусы).

## Отклонения от черновика / follow-up

- Роль `vamp` и support-focus ботов (`BotAiStage`) — не в v1 (см. «ИИ ботов»).
- Beam-канал `LightRig` (impact light по режиму) — не использовали: фиксированный
  бюджет света; режим читается дугами, потоком и свечением rail-колец корпуса.
- Аудио-гудение с detune по режиму — follow-up (`AudioPort` у isida не задействован).
- Мятный outline ремонтируемого союзника (P7-расширение) и подсветка link-кольца
  прицела — phase 2; сейчас отклик — `healFlash` корпуса + статус HUD.
- `BeamSweep` фазы захвата заменён дешевле: раздутие толщины дуги + `muzzle`-вспышка
  на старте и `impact` + `addShake(0.05)` на завершении лока.
