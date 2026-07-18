# Wave Buffs — Баффы между волнами

**Статус:** Approved  
**Слой:** Meta progression (run-scoped)  
**Связано:** [[Wave_System]], [[Tank_Movement]], оружие

## Когда

После зачистки волны UI intermission (`WaveIntermission`) предлагает **один** бафф на **следующую** волну. Предыдущий бафф сбрасывается при выборе нового.

## Опции (`WAVE_BUFF_OPTIONS`)

| ID | UI | Эффект | Множители в коде |
|----|-----|--------|------------------|
| `damage` | УРОН | +25% урона оружия | `DAMAGE_MUL = 1.25` |
| `speed` | СКОРОСТЬ | +20% ход, +15% поворот | `SPEED_MUL=1.2`, `TURN_MUL=1.15` |
| `reload` | ПЕРЕЗАРЯДКА | −30% reload/КД/заряда | `RELOAD_MUL = 1/0.7 ≈ 1.429` |

Описание в UI:

- damage: `+25% урона оружия на следующую волну`
- speed: `+20% хода и +15% поворота корпуса`
- reload: `−30% времени перезарядки / КД / заряда`

## Применение (`applyWaveBuff`)

1. `clearWaveBuff` — восстановить `buffBase` snapshot params, `reloadSpeedMul=1`.
2. Сохранить новый `buffBase` (damage, speed, reverse, turn, shotCooldown).
3. Применить выбранный id:

| id | Изменения |
|----|-----------|
| `damage` | `params.damage = round(base * 1.25)` |
| `speed` | speed/reverse ×1.2, turn ×1.15 |
| `reload` | `reloadSpeedMul = RELOAD_MUL`, `shotCooldown /= RELOAD_MUL` |

Оружие читает `reloadSpeedMul` через `ownerReloadMul` (рельса charge/cooldown, пушка reload, огонь recharge).

## Классы

| Символ | Файл |
|--------|------|
| `WaveBuffId`, `WAVE_BUFF_OPTIONS` | `src/game/wavePreview.ts` |
| `applyWaveBuff`, `clearWaveBuff` | `src/game/waveBuffs.ts` |
| `WaveIntermission` | `src/components/WaveIntermission.tsx` |
| `GameModeController` | `src/game/GameModeController.ts` (выбор → buff → confirm) |
