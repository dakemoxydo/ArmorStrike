# Wave Buffs — УДАЛЕНЫ (P0)

**Статус:** Removed  
**Слой:** —  
**Связано:** [[Wave_System]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes (Draft)]]

## Что было

Между волнами UI `WaveIntermission` предлагал бафф (`damage` / `speed` / `reload`) через `applyWaveBuff` / `chooseWaveBuff`.

## Что удалено

| Артефакт | Файл (удалён) |
|----------|----------------|
| `applyWaveBuff` / `clearWaveBuff` | `src/game/waveBuffs.ts` |
| `WAVE_BUFF_OPTIONS` / preview types | `src/game/wavePreview.ts` |
| `WaveIntermission` UI | `src/components/WaveIntermission.tsx` |
| API `chooseWaveBuff` | `GameApi` / `GameModeController` |
| `RunState.intermission` | `RunState` |
| Events `intermission` / `wave` | `types.ts` |

## Дальше

Мета-прогрессия run-scoped не планируется в классических матчах v1 (loadout только из гаража).
