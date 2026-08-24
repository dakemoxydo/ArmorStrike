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
| Bloom composer | нет | нет | да | downgrade → полный dispose; возврат → свежий композер от CSS-размера канваса |
| Декоративные анимации арены (beacon blink, furnace glow, molten) | **выключены** | вкл | вкл | `ArenaEffects.update`: `if quality !== 'low'` |
| Спавн/объёмы частиц и дыма | без изменений | без изменений | без изменений | пулы фиксированы: smoke ≤44, sparks 800, flame 160, wrecks ≤6 |

## Паритет: что НЕ масштабируется по пресету

1. **Частицы/дым** — бюджеты пулов константны на всех пресетах. Осознанный выбор
   (аудит iter 7): пулы уже ограничены, их аллокация не зависит от качества;
   «низкое качество» экономит fill-rate (pixelRatio) и постпроцессинг, а не
   количество спрайтов.
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
- Смена пресета безопасна в любой момент раунда: bloom teardown/rebuild покрыт
  тестом `renderWorldQuality.test.ts`; shadow map dispose — частью `applyQuality`.
- Frame-path не читает localStorage: `Arena.setRenderWorld` подключает живой
  геттер из RenderWorld (`setQualitySource`) — пресет читается из памяти каждый кадр.

## Известные ограничения

- Пресеты не управляют дальностью тумана/атмосферой — они принадлежат карте
  (`atmospherePresets.ts`).
- Нет отдельного управления частицами/тенями в UI — только трёхпозиционный цикл.
