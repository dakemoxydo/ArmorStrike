# Standard Frame Stability — ArmorStrike

**Статус:** engineering standard (synced with code)
**Связано:** [Core Patterns](Core_Patterns.md) · [Standard Match](Standard_Match.md) · [Standard Resources](Standard_Resources.md) · [Standard Weapon](Standard_Weapon.md) · [Graphics Presets Matrix](Graphics_Presets_Matrix.md)
**Не путать с:** [Docs/GDD](../GDD/Approved/00_Index.md) (баланс и дизайн-механика)

Инварианты против «фризов» кадра. Симптом-триггер: **лаг/замирание в момент выстрела
или смерти**. Каждое правило ниже обязательно — его нарушение возвращает hitch.

## 0. Четыре источника фриза

| Источник | Механизм | Правило |
|----------|----------|---------|
| Смена числа источников света | `numPointLights` входит в ключ программы → пересборка ключа у **всех** lit-материалов + синхронный GLSL-компил в кадре | §1, §2 |
| Hit-stop без гейта | `TimeScale.update` возвращает `dt = 0` — морозится вся симуляция, эффекты, камера | §3 |
| Аллокации в момент смерти | новые `Mesh` + `Material` + `material.dispose()` → эвикция программы из кэша three → повторный компил | §4 |
| UI-работа в кадре | принудительный reflow, перерисовка canvas + загрузка текстуры | §5 |

## 1. Инвариант: бюджет источников света постоянен

**Где:** `src/game/effects/LightRig.ts` · потребители: `FlashSystem`, `RailgunBeamFx`,
`FlameParticlePool`.

Число источников света в сцене — часть ключа кэша шейдерных программ
(`WebGLPrograms.getProgramCacheKey` → `numPointLights`). Любой `scene.add(light)` /
`scene.remove(light)` поднимает `lights.state.version` (`WebGLLights`), и на следующем
кадре **каждый** материал с `needsLights` пересобирает ключ в `WebGLRenderer.setProgram`.
При фактической смене числа — материал переключается на другую программу, а при первом
появлении комбинации GLSL компилируется **синхронно внутри кадра** (десятки–сотни мс).

Поэтому динамический боевой свет **никогда не входит и не выходит из сцены**:

```ts
const rig = new LightRig(scene);          // весь бюджет создан один раз
rig.set('flash', 0, pos, color, 40, 14);  // включение = запись в существующий light
rig.off('flash', 0);                      // выключение = intensity = 0, light на месте
```

| Канал | Ёмкость | Кто пишет |
|-------|---------|-----------|
| `flash` | 4 | `FlashSystem` (выстрелы, попадания, взрывы) |
| `beam` | 2 | `RailgunBeamFx` (muzzle + impact, общий на все рейлганы) |
| `flame` | 1 | `FlameParticlePool` (muzzle огнемёта, общий на все огнемёты) |

Всего **7** источников на всю сессию. Все — `castShadow = false` (иначе добавился бы
shadow-count в ключ и shadow-pass на кадр).

Правила для нового эффекта со светом:

1. **Не создавать `PointLight` в эффекте.** Взять слот из рига: `rig.light(channel, i)`.
2. **Нет своей ёмкости — просить канал.** Новый тип света = новый канал в
   `LIGHT_CHANNEL_CAPACITY` (сознательное решение: +1 постоянный источник на кадр).
3. **`dispose()` эффекта не диспозит свет** — он принадлежит ригу. Только `off()`.
4. **`clear()` при рестарте раунда** гасит все каналы, не меняя число источников.
5. **Ёмкость канала исчерпана → переиспользовать самый «отработавший» слот**
   (`FlashSystem.flash`), а не добавлять свет.

`index` в `rig.light()` клампится к ёмкости канала — вызывающий может использовать
локальный индекс пула, не зная раскладки рига.

## 2. Warm-up шейдеров один раз за раунд

**Где:** `RenderWorld.warmUp()` (`src/game/RenderWorld.ts`), вызов —
`GameModeController.executeStartRound` (`await renderWorld.warmUp()` перед
`sim.run.mode = 'playing'`).

Даже при постоянном бюджете света первая программа для комбинации компилируется при
первом рендере. `warmUp()` вызывает `renderer.compileAsync(scene, camera)` — компиляция
всех программ текущей сцены **под загрузочным оверлеем**, до старта матча.

- Вызывать **после** сборки арены и ростера (материалы танков уже в сцене), но **до**
  `mode = 'playing'` — иначе первый кадр боя оплатит компил.
- `compileAsync` использует `KHR_parallel_shader_compile`, когда расширение есть (не
  блокирует main thread); при его отсутствии `WebGLProgram.isReady()` истинно сразу, и
  промис всё равно резолвится через `setTimeout`-тики — поэтому вызов обязан быть под
  оверлеем, а не в игровом кадре.
- Одного прохода достаточно **именно потому**, что бюджет света постоянен (§1). При
  динамических источниках один проход не покрывает все комбинации.

## 3. Hit-stop / slow-mo — только за убийство игроком

**Где:** `CombatSystem.setOnKillPunch` (гейт) → `TimeScale` (`effects/TimeScale.ts`).

`TimeScale.update()` при активном hit-stop возвращает `dt = 0`: морозится **вся**
симуляция (`sim.step`), эффекты, арена и камера — рендер продолжается. Значит hit-stop
на каждом убийстве любого танка (при 7 ботах) = постоянные 40-мс замирания матча.

Правило: **hit-stop и slow-mo — награда за frag игрока, а не за смерть вообще.**

```ts
combat.setOnKillPunch((byPlayer) => {
  if (!byPlayer) return;                 // бот убил бота → без морозки
  gameLoop.timeScale.hitStop(0.04);
  gameLoop.timeScale.killSlowMo(0.5, 0.45);
});
```

- Бот-vs-бот: только FX, обломки и тряска камеры (усиленная — `0.55` игрок / `0.35` бот).
- Приоритет в `TimeScale`: hit-stop (`dt = 0`) > slow-mo (масштаб + fade-out 0.15 с).
- `timeScale.reset()` — в round-start chain (см. [Standard Match](Standard_Match.md) §5).

Балансные значения и семантика — в GDD [[../GDD/Approved/Kill_Feedback|Kill Feedback]].

## 4. Смерть не аллоцирует: пул обломков

**Где:** `src/game/effects/WreckSystem.ts`.

Раньше смерть создавала 4–6 новых `Mesh` + `Material` и вызывала
`material.dispose()` при уборке. Диспоуз материала уходит в
`programCache.releaseProgram`; при нуле ссылок программа уничтожается и позже
компилируется заново — прямо в бою.

Правило: **пул фиксированного размера, построенный заранее.**

- `MAX_WRECKS = 6` слотов строятся в конструкторе (`group.visible = false`), материалы —
  по одному `emberMat` на слот.
- `spawn()` только позиционирует/поворачивает готовые меши, меняет цвет эмиттера и
  видимость — **ноль аллокаций**.
- `removeWreck()` только скрывает слот (`active = false`, `visible = false`,
  `opacity = 0`) — без `scene.remove` и без диспоуза материалов.
- Геометрии/материалы слотов — общие (`markShared`-путь), освобождаются политикой
  ресурсов, а не на смерть танка. См. [Standard Resources](Standard_Resources.md) §1.

Тот же приём, что в `SmokeSystem` / `ScorchSystem` / `RingSystem` / `CoreSystem` /
`MuzzleSystem` / `SparkPool` / `ProjectileManager` — новый эффект на смерть обязан
следовать пулу, а не создавать объекты в рантайме.

## 5. HUD: без reflow и с квантованием

**Где:** `src/hooks/useGameHud.ts`, `src/components/hud/HudCrosshair.tsx`,
`src/game/nameplate.ts`.

- **Никакого принудительного reflow.** Для перезапуска CSS-анимации класс снимается по
  `onAnimationEnd`, а не через чтение layout-свойства (`offsetWidth` и т.п.) в обработчике
  события. Чтение layout заставляет браузер синхронно пересчитать стили на каждый выстрел.
- **Квантование непрерывных каналов.** Nameplate рисует HP только при изменении шага
  (`HP_DRAW_STEP = 0.02`) или цвета — иначе canvas + `texture.needsUpdate = true` на
  каждый кадр урона.
- **`memo` не кормится мутируемым снапшотом.** `snap.current` — один и тот же объект все
  кадры (ноль аллокаций), поэтому shallow-compare `memo` всегда его пропускает: панель
  оружия так замерла на патронах после маунта. Детям HUD — примитивы/refs/свежие объекты;
  пинится `src/__tests__/hudLiveUpdates.test.tsx`.
- **Миникарта рисуется в device-пикселях.** Бэкинг-стор × `devicePixelRatio` (кап 2),
  CSS-размер остаётся `MAP_SIZE` — иначе радар мылит на HiDPI. Фиксированные размеры
  (радиусы, толщины, шрифт) масштабируются на `k = backing / MAP_SIZE`.
- **Фингерпринт статики без строк.** `staticLayerKey` — целочисленный rolling-hash
  (ид + геометрия + `alive`), а не конкатенация строки на каждый кадр.
- **Тосты снимаются таймером, а не только анимацией.** `TOAST_MS` в `useGameHud` гасит
  `dmgArc` / `hitmark` / `frag` / `streak` / `vignette`; под `prefers-reduced-motion`
  CSS-анимация отключена, и без таймера элементы висели бы на экране навсегда. По той же
  причине вращение развёртки радара замирает при reduced motion.
- Общий контракт по HUD-рендеру — [Standard UI Input](Standard_UI_Input.md) §2
  (`hudNeedsRender`: ref-painted / continuous / quantized / by-content).

## 6. Диагностика и тесты

| Что | Где |
|-----|-----|
| Постоянство бюджета света | `src/__tests__/lightRig.test.ts` (весь бюджет привязан один раз; переполнение пула флешей не меняет число источников) |
| Beam-свет из рига | `src/__tests__/RailgunBeamFx.test.ts` (слоты `rig.light('beam', …)`, счётчик постоянен) |
| Hit-stop / slow-mo | `src/__tests__/timeScale.test.ts` |
| Порядок round-start (в т.ч. warm-up) | `src/__tests__/gameModeLifecycle.test.ts` |
| Draw-call census | `npm run census` → [Standard Resources](Standard_Resources.md) §3 |

---
*Паттерны извлечены из фикса фризов на выстрелах/смертях (LightRig + warm-up + пул
обломков + гейт hit-stop + HUD-квантование); обновляется после рефакторингов.*
