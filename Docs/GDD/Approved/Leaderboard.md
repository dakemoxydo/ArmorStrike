# GDD — Глобальный лидерборд (Leaderboard)

**Статус:** Approved  
**Дата:** 2026-09-22  
**Слой:** Cloud meta  
**Связано:** [[Cloud_Profiles_And_Auth]], [[Scoring]], [[Economy_Currency_And_Quests]], [[Game_Lifecycle]]  
**Код:** `src/game/leaderboard/leaderboardService.ts`, `src/components/LeaderboardModal.tsx`, `supabase/migrations/20260922120000_create_leaderboard.sql`

---

## 1. Intent

Глобальный рейтинг личных рекордов (`best_score` = XP за матч, [[Scoring]]):
1. После каждого `gameOver` авторизованный игрок **автоматически** отправляет результат.
2. Сервер оставляет **только лучший** счёт (upsert only-if-better) + контекст того матча.
3. Топ-50 доступен всем (в т.ч. гостям) из лобби и с экрана результатов.

Гости **не** попадают в рейтинг — UI явно предлагает войти.

---

## 2. Схема БД

### Таблица `public.leaderboard`

| Колонка | Тип | Ограничения |
|---|---|---|
| `user_id` | `uuid` | PK → `auth.users(id) ON DELETE CASCADE` |
| `username` | `text` | 3–20 (зеркало `profiles`, обновляется при submit) |
| `best_score` | `integer` | 0…1_000_000 |
| `kills` / `deaths` / `best_streak` | `integer` | 0…1000; streak ≤ kills |
| `mode` | `text` | `deathmatch \| team_deathmatch \| capture_point` |
| `match_time_sec` | `integer` | 0…7200 |
| `matches_played` | `integer` | ≥1, инкремент на каждый submit |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` меняется **только** при улучшении рекорда |

Индекс: `(best_score DESC, updated_at ASC, user_id ASC)` — топ-N и tie-break
(ранее достигнутый равный счёт выше).

### RLS и права

- `ENABLE ROW LEVEL SECURITY`.
- **SELECT** → `anon`, `authenticated` (`using (true)`): публичное чтение.
- **INSERT/UPDATE/DELETE** → политик нет; `REVOKE ALL` у клиентских ролей.
- Запись **только** через `SECURITY DEFINER` RPC (каталог-паттерн проекта,
  как `create_room`).

### RPC

1. **`submit_leaderboard_entry(p_score, p_kills, p_deaths, p_mode, p_match_time_sec, p_best_streak)`**  
   - `auth.uid()` обязателен (иначе `auth_required`).  
   - Клампы всех чисел + валидация `mode` **до** INSERT.  
   - `username` берётся из `public.profiles` (клиент не может подменить ник).  
   - `INSERT … ON CONFLICT (user_id) DO UPDATE`:  
     `best_score = greatest(old, excluded)`; детальные колонки и `updated_at`
     обновляются **только если** `excluded.best_score > old`;  
     `matches_played` инкрементируется всегда.  
   - Ответ: `{ success, improved, best_score, matches_played }` или
     `{ success:false, error }`.  
   - `GRANT EXECUTE` → **только** `authenticated`.

2. **`leaderboard_my_rank()`** — 1-based место игрока
   (`dense_rank` по `best_score DESC, updated_at ASC, user_id ASC`).
   `GRANT EXECUTE` → `authenticated`.

---

## 3. Клиент

```mermaid
flowchart LR
  GO[gameOver ивент] --> BS[useGameBootstrap]
  BS -->|mono token| SVC[LeaderboardService.submitMatchResult]
  SVC -->|rpc| DB[(leaderboard)]
  UI[GameOverScreen status] <-- статус -- BS
  Menu[MainMenu ЛИДЕРБОРД] --> Modal[LeaderboardModal]
  Modal -->|fetchTop 50 + rank| DB
```

### Статусы отправки (`LeaderboardSubmitStatus`)

| Статус | Условия | UI на GameOver |
|---|---|---|
| `pending` | вызов ушёл | «ОТПРАВКА РЕКОРДА…» |
| `improved` | `improved=true` | «НОВЫЙ РЕКОРД …» |
| `saved` | рекорд не beaten | «РЕКОРД СОХРАНЁН · ЛУЧШИЙ: N» |
| `guest` | нет сессии / `auth_required` | «ВОЙДИТЕ В АККАУНТ…» |
| `error` | сеть / RPC fail | «НЕ УДАЛОСЬ ОТПРАВИТЬ…» |

Отправка выполняется **в обработчике ивента** `gameOver` (не в `useEffect`
модала) + моно-токен `leaderboardToken`: поздний ответ прошлого матча не
перетирает свежий статус; StrictMode не дублирует запись.

`LeaderboardService` **никогда не бросает** исключение — экран результатов
не зависит от сети.

### UI входы

- **MainMenu** → кнопка «ЛИДЕРБОРД» (`BarChart3`) между Задачами и Настройками.
- **GameOverScreen** → статус-чип + кнопка «ЛИДЕРБОРД».
- **LeaderboardModal** (`useFocusTrap`, Esc, refresh): топ-50, подсветка «ВЫ»,
  для игрока вне топа — отдельный блок «ВАШЕ МЕСТО»; loading / error+retry /
  empty.

Горячие клавиши: `leaderboardOpen` гейтит глобальный Escape (как quests/auth).

---

## 4. Failure modes (закрытые)

| Риск | Защита |
|---|---|
| Гость шлёт score | без сессии → `guest`, RPC не вызывается; `auth.uid()` на сервере |
| Спуф username | сервер берёт из `profiles` |
| Отрицательный/гигантский score | клампы в TS **и** в SQL до CHECK |
| Чужой mode | allowlist → `deathmatch` |
| Прямая запись в таблицу | нет policy + `REVOKE ALL` на INSERT/UPDATE/DELETE |
| Двойной submit (StrictMode) | ивент-хук + `leaderboardToken` |
| Гонка параллельных submit | `ON CONFLICT` атомарен |
| Сеть/офлайн | try/catch → `error`, UI-ретрай в модалке |
| Поздний ответ старого матча | моно-токен сбрасывает stale |
| Нет `profiles` (гонка signup) | `profile_missing` → `error` |
| Равные счёты | `updated_at ASC`, затем `user_id` |
| Удаление аккаунта | `ON DELETE CASCADE` |
| Рейтинг нечитаем анону | явный `GRANT SELECT` (Data API) |
| Спам fetch | `limit` 1…100 (дефолт 50) |

---

## 5. Приёмка

- [x] Таблица + RLS + RPC в миграции `20260922120000_create_leaderboard.sql`.
- [x] `LeaderboardService`: submit/fetch без throw, клампы, guest/error.
- [x] Авто-отправка на `gameOver` (bootstrap), статус на GameOverScreen.
- [x] LeaderboardModal из MainMenu и GameOver; Esc-гейт.
- [x] Юнит-тесты: `leaderboardService.test.ts`, `LeaderboardModal.test.tsx`,
      пины в `uiWiringPins.test.ts`, MainMenu/GameOver.
- [x] `npm run typecheck` + `npm test` + `npm run lint` + `docs:check`.
