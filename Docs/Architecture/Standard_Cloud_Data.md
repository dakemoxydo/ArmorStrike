# Standard Cloud Data — облачные сервисы на Supabase (RLS + RPC)

**Статус:** Living doc  
**Связано:** [Core Patterns](Core_Patterns.md), [Standard Multiplayer](Standard_Multiplayer.md), GDD [[../GDD/Approved/Leaderboard|Leaderboard]], GDD [[../GDD/Approved/Cloud_Profiles_And_Auth|Cloud_Profiles_And_Auth]]

Архитектурный стандарт клиентской работы с облачными данными Supabase:
таблицы с RLS, запись через SECURITY DEFINER RPC, мягкий (never-throw)
сервисный слой и ивент-триггерная отправка из bootstrap-хука.

---

## 1. Разделение слоёв

```
React UI  (components/, hooks/)
    ↓ только статусы/колбэки
Сервисный слой  (src/game/**/*Service.ts)  ← supabase-js
    ↓ RPC (запись) / SELECT (чтение)
PostgreSQL (RLS)  ·  supabase/migrations/
```

| Слой | Правило |
|------|---------|
| `supabase/migrations/*.sql` | Таблица, RLS-политики, `GRANT`/`REVOKE`, SECURITY DEFINER RPC. Единственное место записи-источника. |
| `src/game/**` (границы `boundaries/dependencies`) | Клиентский сервис (`LeaderboardService`, `CloudSaveService`, `multiplayerService`). `game/` **не** импортирует `components/`/`hooks/` — сервис вызывается из хуков, не наоборот. |
| `src/hooks/` | Владеет жизненным циклом вызова (ивент, debounce, моно-токен) и публикует статус в состояние. |
| `src/components/` | Только рендер статуса и кнопок; не знает про `supabase` напрямую. |

Каталог-паттерн RPC: запись, которую клиент не имеет права делать сам
(см. `create_room`, `submit_leaderboard_entry`), живёт как
`SECURITY DEFINER` функция; таблица при этом остаётся `REVOKE ALL` на
INSERT/UPDATE/DELETE для клиентских ролей.

---

## 2. Модель доступа (canonical)

Для публично читаемых, приватно записываемых данных (лидерборд как эталон):

1. `ENABLE ROW LEVEL SECURITY`.
2. **Чтение:** политика `SELECT` для `anon` + `authenticated` (`using (true)`)
   **и** явный `GRANT SELECT` (Data API PostgREST не видит политики без гранта).
3. **Запись:** политик нет + `REVOKE ALL` у `anon, authenticated`;
   `GRANT EXECUTE` на RPC **только** тем ролям, которым можно писать
   (например, только `authenticated`).
4. RPC внутри: `auth.uid()` обязателен → иначе `{ success:false, error:'auth_required' }`;
   клампы/allowlist значений **до** INSERT; недоверенные поля (ник, timestamp)
   берутся из серверных источников (`profiles`, `now()`), не из аргументов.
5. Конкурентная запись «одна строка на субъект» — `INSERT … ON CONFLICT … DO UPDATE`
   с серверной функцией выбора (`greatest` для only-if-better).

Клиентская сторона дублирует клампы (`clampInt` в сервисе) — не как защита
от злонамеренного клиента, а чтобы UI-состояние совпадало с серверным.

---

## 3. Клиентский сервис (never-throw)

Эталон: `src/game/leaderboard/leaderboardService.ts`.

- Каждый публичный метод обёрнут в `try/catch` и **всегда** возвращает
  дискриминированное состояние (`status` / `ok`), исключение наружу не выходит —
  экран результатов и меню не зависят от сети.
- Гость коротается **до** сетевого вызова (`auth.getUser()` → `guest`),
  RPC не шлётся.
- Ошибки RPC маппятся в `error` + текст; серверный `error:'auth_required'`
  трактуется как `guest`.
- Чтение: `limit` клампится на клиенте; row-данные проходят через
  `mapRow` с фолбэками на враждебные значения (`'not-a-number'` → 0,
  неизвестный `mode` → allowlist-фолбэк).
- `CloudSaveService` — соседний пример: `try/catch → null/false` +
  debounce-очередь (`scheduleSave`, 500 мс).

---

## 4. Триггер отправки: ивент, не mount

Запись «после матча» выполняется в **обработчике ивента** `gameOver`
inside `useGameBootstrap` (`src/hooks/useGameBootstrap.ts`), а не в
`useEffect`/mount экрана результатов:

1. React 18/19 StrictMode в dev монтирует дважды — mount-отправка дублировала бы RPC.
2. Моно-токен (`useRef` счётчик): перед вызовом `++token`, в `.then`
   ответ применяется только если токен не ушёл вперёд — поздний ответ
   прошлого матча не перетирает статус нового.
3. Промежуточное состояние (`'pending'`) публикуется синхронно до старта
   запроса, чтобы UI показывал «отправка…».

Статус живёт в `BootstrapResult` (`leaderboardSubmit`) и пробрасывается пропом
в `GameOverScreen`; открывание модалки — отдельный стейт в `useUiModals`.

---

## 5. Модалка и хоткеи (чек-лист UI)

Для любой новой глобальной модалки:

1. Состояние open/close — редьюсер `useUiModals` (`openX`/`closeX`), не локальный
   `useState` в компоненте (Esc-гейт и рендер живут в разных местах).
2. Рендер в `App.tsx`: `{modals.xOpen && <XModal onClose={...} />}`.
3. `useAppHotkeys`: добавить флаг в union и в **Esc-ветку** (модалка закрывает
   себя, а не игру) + в dependency-массив хука.
4. Сама модалка: `useFocusTrap`, `role="dialog"`/`aria-labelledby`, кнопка Esc,
   состояния loading / error+retry / empty.
5. Источники открытия: не только меню — и контекстные точки
   (например, кнопка на `GameOverScreen`).
6. Пины: строка в `src/__tests__/uiWiringPins.test.ts` (import, рендер, Esc-гейт,
   actions редьюсера) + поведенческий тест в `appFlow.test.tsx`.

---

## 6. Тесты (минимум)

| Что | Где |
|-----|-----|
| Клампы, гость, RPC-ошибки, never-throw, маппинг row | юнит сервиса (`leaderboardService.test.ts`, `cloudSaveService.test.ts`, `multiplayerService.test.ts`) |
| Состояния модалки (loading/error/empty/retry) | тест компонента (`LeaderboardModal.test.tsx`) |
| Wiring-пины (import/action/Esc) | `uiWiringPins.test.ts` |
| Поведение в потоке приложения | `appFlow.test.tsx` |

Моки `supabase.from(...)` — цепочка-двойник (`select/order/limit/eq/maybeSingle`),
`auth.getUser` и `rpc` — `vi.fn()`; клиентский модуль мокается целиком
(`vi.mock('../lib/supabaseClient')`), ключи в моке не подставляются.
