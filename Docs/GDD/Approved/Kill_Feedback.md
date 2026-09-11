# Kill Feedback — Hit-stop и slow-mo

**Статус:** Approved
**Слой:** Simulation / Presentation
**Связано:** [[Damage_System]], [[Health_And_Regen]], [[Scoring]], [[Game_Lifecycle]]
**Код:** `src/game/effects/TimeScale.ts`, `CombatSystem.setOnKillPunch` (`GameBootstrap.ts`)

## Зачем

Удар должен «ощущаться». На убийстве включаются два кратких искажения времени —
hit-stop (полная заморозка) и slow-mo (замедление). Оба — **награда за frag игрока**,
не за смерть вообще.

## Триггер

Вызывается из `CombatSystem.onTankDestroyed`, после kill credit:

```
byPlayer = owner?.isPlayer ?? false
onKillPunch?.(byPlayer)
```

| Убийца | Hit-stop | Slow-mo | Тряска камеры |
|--------|----------|---------|---------------|
| Игрок | **40 мс**, `dt = 0` | **0.5 с** при `0.45×` | `0.55` |
| Бот | — | — | `0.35` |

Бот-vs-бот получает только FX (взрыв, обломки, тряска) — без морозки матча.
Причина: `dt = 0` останавливает **всю** симуляцию и камеру; при 7 ботах hit-stop на
каждой смерти превращался в постоянные 40-мс замирания (см.
[[../../Architecture/Standard_Frame_Stability|Standard Frame Stability]] §3).

## Поведение `TimeScale`

| Фаза | Условие | Возвращаемый множитель `dt` |
|------|---------|------------------------------|
| Hit-stop | `freezeT > 0` | `0` (полная заморозка) |
| Slow-mo | `slowT > 0`, вне fade | `scale` = `slowScale` |
| Slow-mo fade | `slowT < 0.15 с` | плавный подъём `slowScale → 1` |
| Конец slow-mo | `slowT` истёк в кадре | `1` без экстраполяции (иначе `k < 0` раздувает scale) |
| Норма | — | `1` |

- **Приоритет:** hit-stop перекрывает slow-mo (`freezeT` тикает первым).
- Оба таймера идут по **реальному** времени (`realDt`), не по масштабированному.
- Повторный вызов берёт максимум длительности (`Math.max`), не складывает.

## Сброс

`timeScale.reset()` входит в round-start chain (`executeStartRound`) — смена режима,
рестарт и реванш начинаются без остаточного slow-mo. См. [[Game_Lifecycle]]
(«Старт матча: режим → карта») и [[Match_Framework]].

## Значения

| Константа | Значение | Где |
|-----------|----------|-----|
| Hit-stop, игрок | `0.04` с | `GameBootstrap.ts` |
| Slow-mo длительность | `0.5` с | `GameBootstrap.ts` |
| Slow-mo масштаб | `0.45` | `GameBootstrap.ts` |
| Fade-out slow-mo | `0.15` с | `TimeScale.ts` |
| Тряска: игрок / бот | `0.55` / `0.35` | `CombatSystem.ts` |

## Классы

| Символ | Файл |
|--------|------|
| `TimeScale` (`hitStop` / `killSlowMo` / `update` / `reset`) | `src/game/effects/TimeScale.ts` |
| `setOnKillPunch` + гейт `byPlayer` | `src/game/CombatSystem.ts`, `src/game/GameBootstrap.ts` |
