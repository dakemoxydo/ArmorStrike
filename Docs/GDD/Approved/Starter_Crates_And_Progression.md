# Стартовые контейнеры и блокировка арсенала (Starter Crates & Progression)

**Статус:** Approved  
**Дата:** 2026-09-18  
**Источники истины в коде:**
- `src/game/RunState.ts` — инвентарь `unlockedHulls`, `unlockedTurrets`, статус распаковки `starterPackClaimed`, метод `claimStarterPack`, сохранение `as2_loadout`.
- `src/game/GarageBinding.ts` — валидация выбора экипировки (`setSelection`), метод `claimStarterPack` с пересборкой 3D-предпросмотра и событием `garageChanged`.
- `src/game/GameApi.ts` / `src/game/Game.ts` — контракт `unlockedHulls`, `unlockedTurrets`, `starterPackClaimed`, `claimStarterPack`.
- `src/components/StarterPackModal.tsx` — модальный экран онбординга новобранца с механикой Draft Pick (3 случайные карты корпуса, затем 3 случайные карты башни).
- `src/components/Garage.tsx`, `HullCard.tsx`, `TurretCard.tsx` — заблокированное состояние закрытых деталей с иконкой `Lock`, бейджем `ЗАКРЫТО` и защитой от выбора.
- `src/App.tsx` — реактивный вызов онбординга при `!game.starterPackClaimed`.

---

## 1. Назначение и геймплейная роль

До введения механики все 5 корпусов и 5 башен были открыты сразу. Это лишало игрока ощущения прогрессии и уникального стартового билда.
Механика вводит:
1. **Изначально закрытый арсенал**: у нового игрока заблокированы все корпуса и башни в Гараже.
2. **Стартовый подарок новобранца (Draft Pick 3 карт)**:
   - Игрок последовательно открывает 2 тактических контейнера снабжения:
     - **Шаг 1 — Контейнер шасси:** генератор выбирает 3 уникальных корпуса из 5 (`HULL_IDS`), игрок выбирает понравившийся;
     - **Шаг 2 — Контейнер вооружения:** генератор выбирает 3 уникальных орудия из 5 (`TURRET_IDS`), игрок выбирает башню;
     - **Шаг 3 — Сборка боевой машины:** демонстрация собранного танка, суммарных ТТХ (HP, скорость, урон, дальность) и ролей связки.
3. **Автоматический монтаж и сохранение**:
   - Выбранные детали добавляются в списки `unlockedHulls` и `unlockedTurrets`;
   - Выставляются как активный `currentHull` и `currentTurret`;
   - Флаг `starterPackClaimed = true` и инвентарь сохраняются в `as2_loadout`;
   - 3D-предпросмотр в ангаре немедленно перестраивается на новую машину.

---

## 2. Поведение в Гараже

- В `Garage.tsx` карточки корпусов (`HullCard`) и башен (`TurretCard`) проверяются на принадлежность к `unlockedHulls` и `unlockedTurrets`.
- Если деталь ещё не открыта:
  - Отображается иконка `Lock`;
  - Бейдж заменяется на `ЗАКРЫТО`;
  - Карточка визуально приглушена (`opacity-50`, `cursor-not-allowed`);
  - Клик заблокирован на уровне UI (`disabled={disabled || isLocked}`) и валидируется в `GarageBinding.setSelection`.

---

## 3. Модель данных

```ts
interface PersistedLoadout {
  version: 2;
  hullId: HullId;
  turretId: TurretId;
  unlockedHulls: HullId[];
  unlockedTurrets: TurretId[];
  starterPackClaimed: boolean;
}
```

- При отсутствии `starterPackClaimed: true` профиль считается новым, активируя экраны онбординга.
