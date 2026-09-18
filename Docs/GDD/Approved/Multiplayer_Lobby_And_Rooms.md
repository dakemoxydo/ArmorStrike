# GDD — Multiplayer, Server Browser & Matchmaking (ArmorStrike)

Сетевой мультиплеер реального времени: браузер комнат, создание приватных/публичных серверов, «Быстрая игра» (Quick Match) в один клик и синхронизация танков.

## 1. Концепция и режимы входа

1. **Список серверов (`ServerBrowserModal`):**
   - Просмотр всех активных сетевых комнат в реальном времени.
   - Живой авто-рефреш каждые 8 секунд или по кнопке обновления.
   - Фильтры по режимам (`DM`, `TDM`, `CP`), картам (`Завод`, `Город`, `Деревня`), чекбоксы скрытия полных серверов и серверов с паролем.
   - Полнотекстовый поиск по названию комнаты и никнейму хоста.
   - Прямой вход на сервер: если сервер открыт — мгновенное подключение; если закрыт — открытие модального окна ввода пароля (`PasswordPromptModal`).

2. **Создание сервера (`CreateServerModal`):**
   - Название сервера (до 32 символов);
   - Режим игры (DM / TDM / CP);
   - Выбор карты (Завод / Город / Деревня);
   - Лимит игроков (4, 6, 8, 10);
   - Переключатель ботов: «Заполнять ботами» (если включено, пустые слоты добираются ботами);
   - Пароль (опционально: пустой = открытый публичный сервер).

3. **Быстрая игра («БЫСТРАЯ ИГРА»):**
   - Вход в 1 клик прямо из Главного Меню или Браузера Серверов.
   - Вызывает хранимую процедуру `find_quick_match`:
     - Ищет доступную комнату: `has_password = false`, `status != 'ended'`, `player_count < max_players`.
     - Приоритет отдаётся комнатам с наибольшим числом реальных игроков.
   - Если подходящих серверов нет — автоматически создаёт новый открытый сервер с ботами и мгновенно запускает игрока на карту (Drop-In), позволяя другим игрокам бесшовно подключаться прямо во время боя.

---

## 2. База данных и бэкенд (Supabase PostgreSQL)

Миграция: `supabase/migrations/20260918010000_create_multiplayer_rooms.sql`.

### 2.1 Таблица `public.rooms`
- `id` (uuid, PK);
- `name` (text, 1..32);
- `host_id` (text), `host_name` (text);
- `mode` (`deathmatch` | `team_deathmatch` | `capture_point`);
- `map_id` (`factory` | `city` | `village`);
- `max_players` (2..10);
- `player_count` (integer);
- `has_password` (boolean), `password_hash` (text null);
- `bots_enabled` (boolean);
- `status` (`waiting` | `in_progress` | `ended`);
- `created_at`, `last_heartbeat` (timestamptz).

### 2.2 Таблица `public.room_players`
- `id` (uuid, PK);
- `room_id` (uuid FK к `rooms.id` ON DELETE CASCADE);
- `user_id` (text), `username` (text);
- `hull_id` (text), `turret_id` (text);
- `team` (text null: `'alpha'` | `'bravo'`);
- `is_host` (boolean);
- `ping` (integer);
- `joined_at` (timestamptz).

### 2.3 Хранимые процедуры (RPC)
- `find_quick_match(p_mode, p_map_id)`: атомарный поиск лучшей комнаты с предварительной очисткой зависших серверов.
- `join_room_with_password(p_room_id, p_user_id, p_username, p_hull_id, p_turret_id, p_password)`: атомарная проверка пароля и лимита мест с распределением по командам Alpha/Bravo при TDM/CP.
- `leave_room(p_room_id, p_user_id)`: освобождение слота, авто-удаление пустых комнат и миграция хоста при выходе создателя.
- `heartbeat_room(p_room_id)`: продление времени жизни сервера каждые 15 секунд.
- `cleanup_stale_rooms()`: очистка комнат без пинга более 45 секунд.

---

## 3. Архитектура сетевой синхронизации (Simulation & Network)

### 3.1 Транспорт и каналы
- Транспорт: **Supabase Realtime** (Broadcast + Presence).
- Канал комнаты: `room:${roomId}`.
- Presence: непрерывное отслеживание подключенных игроков (`presenceState`) и обнаружение отключений (`player_left`).

### 3.2 Сетевые пакеты
- `tank_transform`: позиция `(x, z)`, углы `yaw`, `aimYaw`, `barrelPitch`, скорость `speed`, нитро-буст `boosting` (частота 20 Гц).
- `weapon_fire`: выстрел орудия (`turretId`, координаты `origin`, вектор направления `dir`, наклон `barrelPitch`).
- `tank_damage`: урон и факт уничтожения танка (`targetUserId`, `attackerUserId`, `damage`, `remainingHealth`, `isKill`).
- `match_sync`: синхронизация таймера матча, очков команд и статуса баз CP.

### 3.3 Менеджер удалённых игроков (`RemotePlayerManager`)
- Управляет жизненным циклом удалённых танков (`TankEntity`) в `sim.tanks`.
- Создаёт для каждого удалённого игрока собственный меш корпуса/башни, оружие и неймплейт с фракционным цветом (Alpha/Bravo).
- Интерполяция: плавная интерполяция позиции (Lerp со скоростью $14 \cdot dt$) и углов корпуса/башни/ствола с учётом кругового сглаживания ($-\pi \dots +\pi$).
- Автоматическая очистка при потере связи (таймаут 15 секунд без пакетов).

---

## 4. Источники истины в коде

| Компонент | Файл |
|-----------|------|
| Сервис сети и RPC | `src/game/network/multiplayerService.ts` |
| Типы комнат и пакетов | `src/game/network/types.ts` |
| Интерполяция и удалённые танки | `src/game/network/RemotePlayerManager.ts` |
| Стадия симуляции тика | `src/game/engine/stages/NetworkSyncStage.ts` |
| Браузер серверов UI | `src/components/multiplayer/ServerBrowserModal.tsx` |
| Создание сервера UI | `src/components/multiplayer/CreateServerModal.tsx` |
| Пароль сервера UI | `src/components/multiplayer/PasswordPromptModal.tsx` |
| Интеграция в GameApi | `src/game/GameApi.ts`, `src/game/Game.ts` |
| Миграция базы данных | `supabase/migrations/20260918010000_create_multiplayer_rooms.sql` |
