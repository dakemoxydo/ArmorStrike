# Player Controls — Управление игроком

**Статус:** Approved  
**Слой:** Presentation / Input  
**Связано:** [[Tank_Movement]], [[Tank_Aim]], [[Game_Lifecycle]]

## Назначение

Переводит клавиатуру, мышь (pointer lock) и кнопки огня в поля танка: `throttle`, `steer`, `boosting`, `aimYaw`, `wantsFire`, `reloadRequested`.

## Схема управления

| Действие | Ввод | Результат |
|----------|------|-----------|
| Вперёд / назад | W/S или ↑/↓ | `throttle` ∈ [−1, 1] |
| Поворот корпуса | A/D или ←/→ | `steer` ∈ [−1, 1] |
| Нитро | Shift | `boosting = true` (при условиях) |
| Прицел / башня | Мышь (pointer lock) | `CameraLookState` → `aimYaw` |
| Огонь | ЛКМ или Space | `wantsFire` → `weapon.setFire` |
| Перезарядка | R | `weapon.requestReload()` |
| Табло | Tab (удержание) | `scoreHeld` → HUD |
| Пауза | Esc | UI / `RunState.paused` |
| Mute | M | `AudioFX` |

## Логика прицела

- Камера следует за мышью (`CameraLookState.applyPointerDelta`).
- Башня целится туда же, куда смотрит камера (`aimYaw` = look yaw).
- Выстрел летит **горизонтально** от дула: `aimDir = (sin(aimYaw), 0, cos(aimYaw))`
  (`Tank.aimDir`, общий для пушки/рельсы/огнемёта). Взгляд камеры с pitch —
  это только yaw + ориентир, баллистику pitch не задаёт.
- Прицел HUD **не** фиксирован в центре экрана: каждый кадр он ставится на
  точку реальной остановки выстрела. `GameLoop.updateCrosshair` берёт дуло
  (`muzzleWorld`), считает дистанцию трассы `reticleImpactDistance`
  (`src/game/aimReticle.ts`: min из дальности оружия, ближайшего
  blocksShots-коллайдера на высоте дула — тот же тест, что у рельсы
  (`nearestShotBlockerDist`), и входа в круг чужого танка `radius +
  PROJECTILE.radius` — тот же тест, что у полёта снаряда), проецирует точку
  камерой текущего кадра в % вьюпорта → `HudSnapshot.crossX/crossY`.
- `crossX/crossY` — ref-painted непрерывный канал: исключены из
  `hudRenderGate`, DOM (`style.left/top` у `.crosshair`) красит `useGameHud`
  каждый кадр без ре-рендера. Вне `playing` / при смерти / на паузе
  дефолт — 50/50 (сам прицел в эти состояния скрыт).

## Pointer Lock

- Включение: клик по canvas в бою (`requestLock`).
- Потеря lock: `onLockLost` → auto-pause **только** если бой активен (см. [[Game_Lifecycle]] / `shouldAutoPauseOnInterrupt`).
- На death cam и intermission lock отпускается намеренно — пауза **не** ставится.

## Классы и файлы

| Класс / символ | Файл | Роль |
|----------------|------|------|
| `PlayerController` | `src/game/PlayerController.ts` | Клавиши, мышь, fire, reload |
| `CameraLookState` | `src/game/camera/CameraLookState.ts` | Yaw/pitch взгляда |
| `PlayerInputStage` | `src/game/engine/stages/PlayerInputStage.ts` | Тик: `input.update` (триггер — в `WeaponFireStage`) |
| `PlayingCameraMode` | `src/game/camera/PlayingCameraMode.ts` | Камера в бою |
| `reticleImpactDistance` | `src/game/aimReticle.ts` | Точка попадания на линии выстрела (чистая логика) |
| `GameLoop.updateCrosshair` | `src/game/GameLoop.ts` | Проекция точки попадания в экран % → `HudSnapshot.crossX/crossY` |

## Состояния

```
enabled = false  →  меню / гараж / over / пауза
enabled = true   →  playing (unpaused)
locked  = pointerLockElement === canvas
```

> `onKeyDown` гейтится по `enabled`: вне боя клавиши принадлежат странице —
> Space активирует сфокусированную кнопку, Tab двигает фокус (пауза тоже
> выставляет `enabled = false`, включая auto-pause).

## Заметки дизайна

- Space и ЛКМ — оба «спуск»; оружие само интерпретирует удержание (рельса / огонь / пушка).
  У рельсы (M20) достаточно **клика**: отпускание не отменяет заряд, выстрел неизбежен.
- `swallow` блокирует scroll/default на стрелках, Space, Tab **только в бою**
  (пока `enabled`; вне боя обработчик не мешает странице).
