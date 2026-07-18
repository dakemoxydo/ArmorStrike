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
- Прицел HUD — центр экрана (crosshair).

## Pointer Lock

- Включение: клик по canvas в бою (`requestLock`).
- Потеря lock: `onLockLost` → auto-pause **только** если бой активен (см. [[Game_Lifecycle]] / `shouldAutoPauseOnInterrupt`).
- На death cam и intermission lock отпускается намеренно — пауза **не** ставится.

## Классы и файлы

| Класс / символ | Файл | Роль |
|----------------|------|------|
| `PlayerController` | `src/game/PlayerController.ts` | Клавиши, мышь, fire, reload |
| `CameraLookState` | `src/game/camera/CameraLookState.ts` | Yaw/pitch взгляда |
| `PlayerInputStage` | `src/game/engine/stages.ts` | Тик: `input.update` → `weapon.setFire` |
| `PlayingCameraMode` | `src/game/camera/PlayingCameraMode.ts` | Камера в бою |

## Состояния

```
enabled = false  →  меню / гараж / over
enabled = true   →  playing
locked  = pointerLockElement === canvas
```

## Заметки дизайна

- Space и ЛКМ — оба «спуск»; оружие само интерпретирует удержание (рельса / огонь / пушка).
- `swallow` блокирует scroll/default на стрелках, Space, Tab в бою.
