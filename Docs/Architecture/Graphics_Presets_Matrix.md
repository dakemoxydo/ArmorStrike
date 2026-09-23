# Graphics Presets Matrix — ArmorStrike

**Статус:** engineering doc (synced with code)
**Связано:** [Standard Resources](Standard_Resources.md) · [Core](Core.md)
**Код:** `src/game/graphicsQuality.ts` (пресеты), `src/game/RenderWorld.applyQuality`
(рендер-применение), `src/game/ArenaEffects.update` (frame-path gate),
`src/game/QualityController.ts` (UI-переключение, localStorage `as2_quality`),
`src/components/PauseMenu.tsx` (кнопка цикла low → medium → high).

## Матрица пресетов (по коду)

| Параметр | low | medium | high | Где применяется |
|---|---|---|---|---|
| `pixelRatioMax` | 1 | 1.5 | 2 | `renderer.setPixelRatio(min(devicePixelRatio, max))` |
| `shadowMapSize` | 512 | 1024 | 2048 | `sun.shadow.mapSize`, старая карта диспозится |
| `shadows` | true | true | true | `renderer.shadowMap.enabled` + `sun.castShadow` |
| Bloom composer | нет | нет | нет | UnrealBloom размывает чернильный контур; leftover composer только диспозится |
| Декоративные анимации арены (beacon blink, furnace glow, molten) | **выключены** | вкл | вкл | `ArenaEffects.update`: `if quality !== 'low'` |
| Аренний стековый дым (`ArenaEffects`) | кап **22**, cadence **0.26 с**, 50% спавнов пропускается | кап 44, cadence 0.13 с | кап 44, cadence 0.13 с | `ArenaEffects.spawnStackSmoke` / `update` (`qualitySource() === 'low'`) |
| Боевые пулы частиц | без изменений | без изменений | без изменений | пулы константны: SmokeSystem 42, wreck-smoke 32, sparks 800, flame 160, wrecks ≤6, drive dust 120, tracks 500, ambient dust 140, scorch 10 |

## Паритет: что НЕ масштабируется по пресету

1. **Боевые частицы/дым** — бюджеты боевых пулов константны на всех пресетах.
   Осознанный выбор (аудит iter 7): пулы уже ограничены, их аллокация не зависит
   от качества; «низкое качество» экономит fill-rate (pixelRatio), а не количество
   спрайтов. Исключение — **аренний стековый дым** (`ArenaEffects`): на low он
   тиран (кап 22 вместо 44, cadence 0.26 вместо 0.13, 50% спавнов мимо — вместе
   ~4× разгрузка). Пин low-ветки — `arenaEffectsSmoke.test.ts`.
   Постпроцессинг bloom снят на всех тирах (комиксный контур).
2. **Тени** — включены даже на low; меняется только разрешение карты
   (512 достаточно для стилистики, полное отключение сломало бы визуальную
   согласованность карт).
3. **Антиалиасинг** — фиксируется при создании рендерера (`antialias: preset !== 'low'`
   в конструкторе `RenderWorld`) и НЕ меняется в runtime (комментарий в `applyQuality`);
   смена пресета после загрузки не включает/выключает MSAA.

## Поведение переключения

- Цикл: low → medium → high → low (`nextQuality`); применяется немедленно,
  сохраняется в localStorage (`as2_quality`), восстанавливается при следующем
  запуске (`loadQuality`, fallback 'high').
- Смена пресета безопасна в любой момент раунда: leftover bloom teardown покрыт
  тестом `renderWorldQuality.test.ts` (high больше не строит composer); shadow map dispose — частью `applyQuality`.
- Если `shadows` когда-нибудь меняется между пресетами, `applyQuality` форсит
  разовый `material.needsUpdate` по сцене: three.js не перекомпилирует уже
  собранные материалы при переключении `renderer.shadowMap.enabled` сам
  (без этого флаг молча не действовал бы визуально). Сегодня все пресеты
  держат `shadows: true` (см. матрицу) — ветка спит, но корректна.
- Frame-path не читает localStorage: `Arena.setRenderWorld` подключает живой
  геттер из RenderWorld (`setQualitySource`) — пресет читается из памяти каждый кадр.

## Известные ограничения

- Пресеты не управляют дальностью тумана/атмосферой — они принадлежат карте
  (`atmospherePresets.ts`, см. [[Standard_Cel_Shaded_Rendering]]).
- Нет отдельного управления частицами/тенями в UI — только трёхпозиционный цикл.
- Стилизованный Cel-Shading и чернильные контуры силуэтов активны на **всех трёх уровнях качества** (low/med/high) с нулевым оверхедом пост-процессинга.
