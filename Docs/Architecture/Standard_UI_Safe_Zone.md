# Standard: UI Safe Zone — камера кадрирует субъект в свободной от UI зоне

**Статус:** engineering standard (паттерн)
**Код:** `CameraRig.applyGarageViewOffset`, `GameApi.setGarageViewportInset`, `components/Garage.tsx`, `ui/GarageInput.ts`
**GDD:** [Garage Viewport Safe Zone](../GDD/Approved/Garage_Viewport_Safe_Zone.md)
**Связано:** [Standard UI Input](Standard_UI_Input.md) · [Standard Frame Stability](Standard_Frame_Stability.md)

## Суть паттерна

Когда полноэкранный 3D-субъект перекрывается UI, **не** двигайте субъекта и
**не** режьте canvas — опишите занятые UI прямоугольники пиксельными инсетами и
совмещайте центр субъекта с центром свободного прямоугольника проекционным
сдвигом:

```
camera.setViewOffset(fullW, fullH, dx, dy, fullW, fullH)
dx = (rightCover − leftCover) / 2
dy = (bottomCover − topCover) / 2
```

Сдвиг запечён в проекционную матрицу — работает одинаково с прямым рендером и
post-processing (bloom). Пивот орбиты не трогается: вращение вокруг субъекта
остаётся «на месте» (взгляд-на-точку-ниже-центра этим не владеет).

## Правила реализации

1. **Источник истины — DOM.** UI-слой измеряет свой след (`ResizeObserver` +
   `window resize`) и пушит его через узкий `GameApi`-метод
   (`setGarageViewportInset(inset | null)`). Инсеты в CSS px; доли офсета
   нормированы на full-размер, поэтому pixelRatio не важен.
   Размонтирование UI обязано пушить `null`.
2. **Пересчёт только при изменении.** Per-frame guard: применяйте сдвиг заново
   только при `|Δdx| ≥ 0.25` или `|Δdy| ≥ 0.25` px или смене размера вьюпорта;
   при `|dx| < 0.5 && |dy| < 0.5` — `clearViewOffset()`. Проекцию не пересобирают
   каждый кадр впустую (Frame Stability).
3. **Режим-онли + сброс.** Оффсеты живут в одном режиме (гараж); выход —
   `clearViewOffset()`, форс-переприменение при возврате (`appliedOffset.dx = NaN`).
4. **Размер вьюпорта — один источник.** `onResize` в bootstrap обновляет и
   рендерер, и rig (`setViewportSize`), чтобы офсет не остался на устаревших
   размерах.
5. **Временные состояния — демпфированием, а не телепортом.** Временное скрытие
   UI (peek при drag-осмотре) — это демпфированное к нулю покрытие
   (`dampTo`, rate 7), синхронно с CSS-переходом дока. Состояние ставится
   одним слоем (`GarageInput` → rig напрямую + `GameEvent` для UI-класса).
6. **Reduced-motion.** CSS-переходы новых состояний попадают в существующий
   `@media (prefers-reduced-motion: reduce)` блок; демпфер камеры не отключается —
   он за экраном UI.

## Контракты

| Символ | Роль |
|--------|------|
| `GarageViewportInset` | `src/game/types.ts` — px-след по краям |
| `GameApi.setGarageViewportInset` | единственный канал UI → камера (без DOM в симуляции) |
| `CameraRig.setGarageInset / setViewportSize / garagePeek` | состояние кадрирования |
| `GarageInput.onPeekChange` | единственный источник peek-состояния |

Тесты-образцы: `src/__tests__/garageSafeZone.test.ts` — математика `dx/dy`,
сброс при выходе, демпфирование peek, жизненный цикл peek, инварианты
источников (source-level pins).
