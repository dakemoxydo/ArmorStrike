# Standard Multiplayer — сетевой мультиплеер и синхронизация

**Статус:** Living doc  
**Связано:** [Core Patterns](Core_Patterns.md), [Standard Match](Standard_Match.md), GDD [[../GDD/Approved/Multiplayer_Lobby_And_Rooms|Multiplayer_Lobby_And_Rooms]]

Архитектурный стандарт сетевого мультиплеера в ArmorStrike на базе Supabase Realtime (Broadcast + Presence) и RPC PostgreSQL.

---

## 1. Топология и транспорт

```
   ┌─────────────────────────────────────────────────────────────┐
   │                  PostgreSQL / Supabase                      │
   │  Таблицы: public.rooms, public.room_players                 │
   │  RPC: find_quick_match, join_room_with_password, leave_room │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ RPC (HTTP/REST)
                                  ▼
                    ┌───────────────────────────┐
                    │    multiplayerService     │
                    └─────────────┬─────────────┘
                                  │ Supabase Realtime (WebSocket)
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
       Broadcast Events (20 Hz)          Presence (Heartbeat / Drops)
     - tank_transform                  - player_joined
     - weapon_fire                     - player_left
     - tank_damage                     - presenceState sync
     - match_sync
```

### 1.1 Разделение зон ответственности
- **PostgreSQL RPC:** управление жизненным циклом комнат (создание, подбор «Быстрой игры», проверка паролей, учет вместимости слотов, heartbeat, авто-очистка брошенных серверов `cleanup_stale_rooms`).
- **Supabase Realtime Presence:** непрерывный учет активных участников в WebSocket-канале `room:${roomId}`. Автоматически оповещает о разрыве соединения (`player_left`).
- **Supabase Realtime Broadcast:** высокочастотный обмен легковесными UDP-подобными пакетами через WebSocket без сохранения в базу данных.

---

## 2. Конвейер симуляции и стадия NetworkSyncStage

Сетевая стадия встроена в конвейер стадий симуляции (`src/game/engine/stages/`):

```
PlayerInputStage ──► TankMotionStage ──► NetworkSyncStage ──► CombatStage ──► Render
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
       Local Tank Broadcast (20 Hz)                                RemotePlayerManager.update(dt)
   - position (x, z)                                             - Lerp позиций (rate = 14)
   - yaw, aimYaw, barrelPitch                                    - Нормализованная интерполяция углов
   - speed, boosting                                             - Таймаут отключений (15 с)
```

1. **Частота отправки:** 20 Гц (интервал 50 мс, `1 / NETWORK_TICK_RATE`). Не перегружает WebSocket-соединение и укладывается в бесплатный лимит Realtime квот.
2. **Локальный танк:** считывает `transform.position`, `transform.yaw`, `aim.yaw`, `aim.barrelPitch`, `motion.speed`, `boost.boosting`. Отправляет широковещательный пакет `tank_transform`.
3. **Удалённые танки:** стадия вызывает `sim.remotePlayers.update(dt)`.

---

## 3. RemotePlayerManager и сглаживание движения

`RemotePlayerManager` управляет пулом сущностей удалённых игроков (`RemotePlayer`):

### 3.1 Жизненный цикл
- При получении пакета `tank_transform` от неизвестного `userId` менеджер спавнит полноценную сущность `TankEntity` в `sim.tanks`, создавая процедурный меш корпуса, башни, оружие и неймплейт (`PlayerNameplate`).
- При получении `player_left` через Presence или при отсутствии пакетов свыше 15 секунд (`DISCONNECT_TIMEOUT`) танк удаляется из `sim.tanks` и сцены Three.js.
- При выходе в меню / сбросе раунда `sim.remotePlayers.clear()` уничтожает все меши и освобождает ресурсы.

### 3.2 Интерполяция координат и углов
- **Позиция:** экспоненциальный Lerp со скоростью $14 \cdot dt$:
  ```ts
  entity.transform.position.lerp(player.targetPos, Math.min(1, 14 * dt));
  ```
- **Углы (корпус, башня, УВН):** сглаживание с защитой от оборота через $360^\circ$ (разность углов нормализуется в диапазон $[-\pi; +\pi]$):
  ```ts
  let diff = player.targetYaw - entity.transform.yaw;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  entity.transform.yaw += diff * Math.min(1, 14 * dt);
  ```

---

## 4. Событийная модель боя (Fire & Damage)

1. **Стрельба (`weapon_fire`):**
   - При выстреле локального игрока отправляется пакет с координатами дула, направлением `dir` и типом башни `turretId`.
   - При получении пакета `weapon_fire` для удалённого танка вызываются визуальные эффекты и звук выстрела его оружия (`tank.weapon.onFired(...)`).

2. **Урон и уничтожение (`tank_damage`):**
   - Урон обсчитывается на стороне стрелявшего/цели и рассылается пакетом `tank_damage`.
   - Если HP удалённого танка падает до 0, инициируется анимация разрушения (Wreck/Hit-stop) и выводится уведомление в kill-feed.

---

## 5. Host Authority и Drop-in

- **Drop-in:** игроки могут подключаться к уже идущему матчу без ожидания лобби.
- **Боты:** если `bots_enabled = true`, недостающие слоты заполняются локальными ботами хоста. При подключении живых игроков боты уступают слоты реальным танкистам.
- **Heartbeat:** хост посылает `heartbeat_room` каждые 15 секунд. Зависшие комнаты автоматически снимаются с листинга через 45 секунд отсутствия пульса.

---

## 6. Источники истины в коде

| Компонент | Файл |
|-----------|------|
| Сетевой сервис и API комнат | `src/game/network/multiplayerService.ts` |
| Интерфейсы пакетов и типов комнат | `src/game/network/types.ts` |
| Менеджер удалённых танков и интерполяция | `src/game/network/RemotePlayerManager.ts` |
| Стадия симуляции тика | `src/game/engine/stages/NetworkSyncStage.ts` |
| Подключение к симуляции | `src/game/engine/GameSimulation.ts`, `src/game/Game.ts` |
| Миграция PostgreSQL | `supabase/migrations/20260918010000_create_multiplayer_rooms.sql` |
