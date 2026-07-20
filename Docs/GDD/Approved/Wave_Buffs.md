# Wave Buffs — УДАЛЕНЫ (P0)

**Статус:** Removed  
**Слой:** —  
**Связано:** [[Wave_System]], [[Match_Framework]], [[../Drafts/Classic_Match_Modes|Classic_Match_Modes]]

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

## Замена

Мета-прогрессия run-scoped не используется (loadout только из гаража).  
Матчи: [[Match_Framework]] (DM / TDM / CP shipped).
