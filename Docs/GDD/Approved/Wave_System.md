# Wave System — Волны и спавн

**Статус:** Approved  
**Слой:** Gameplay loop  
**Связано:** [[Wave_Buffs]], [[AI_Bots]], [[Scoring]], [[Garage_Loadout]]

## Цикл

```
startRound → WaveManager.begin() → spawn wave 1
     │
зачистка всех bots (alive=false)
     │
waitingForChoice = true, intermission UI
     │
игрок выбирает бафф → confirmChoice()
     │
dispose corpses → spawn wave N+1
```

## Количество ботов

```
botsForWave(wave) = min(2 + wave, 5)
```

| Волна | Ботов |
|-------|-------|
| 1 | 3 |
| 2 | 4 |
| 3+ | 5 (cap) |

## Состав (детерминированный preview)

`previewWaveComposition(wave)` == логика hull/turret/role при спавне:

```
hullId   = HULL_IDS[i % 3]          // elite → mammoth
turretId = TURRET_IDS[(i + wave) % 3]
role     = roleForBot(wave, i, turretId)
```

## Скейлинг бота (`spawnBot`)

```
healthScale = 0.8 + wave * 0.1
damageScale = 0.7 + wave * 0.08
```

| Роль | Модификаторы |
|------|----------------|
| **elite** | hull=mammoth, HP×1.35, dmg×1.2, имя `ЭЛИТ-N` |
| **assault** | предпочитает viking вместо mammoth, shotCooldownScale 1.15 |
| **sniper** | viking→hunter, shotCooldownScale 1.4 |
| **standard** | shotCooldownScale 1.3 |

AI tune: `sightRange=46`, `aimError = max(0.05, 0.14 - wave*0.012)`.

## Точки спавна

`SPAWN_POINTS` (7 точек у краёв). `pickSpawnIndex`:

- неиспользуемая точка с `dist ≥ MIN_BOT_SPAWN_DIST` (32) от игрока;
- иначе furthest unused / furthest overall.

Игрок стартует примерно в `(0, 0, -58)`.

## Score за волну

При старте wave > 1:

```
score += SCORE.waveBonus(wave - 1)
waveBonus(w) = 150 + w * 50
```

+ `audio.waveHorn()`, event `{ type: 'wave', n }`.

## Классы

| Класс / fn | Файл |
|------------|------|
| `WaveManager` | `src/game/WaveManager.ts` |
| `spawnBot`, `pickSpawnIndex`, `SPAWN_POINTS` | `src/game/botSpawn.ts` |
| `previewWaveComposition` | `src/game/wavePreview.ts` |
| `botsForWave`, `botAiForWave` | `src/game/constants.ts` |
| `createTankEntity` | `src/game/PlayerFactory.ts` |
