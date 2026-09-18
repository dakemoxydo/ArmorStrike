import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import type { HullId, TurretId } from '../../core/catalog';
import type { MapId } from '../maps/mapCatalog';
import type { MatchModeId, TeamId } from '../match/matchTypes';
import type {
  CreateRoomOptions,
  MatchSyncPacket,
  RoomData,
  TankDamagePacket,
  TankTransformPacket,
  WeaponFirePacket,
} from './types';

export interface RoomFilterOptions {
  mode?: MatchModeId;
  mapId?: MapId;
  hideFull?: boolean;
  hidePassword?: boolean;
  search?: string;
}

export interface PlayerProfileInfo {
  userId: string;
  username: string;
  hullId: HullId;
  turretId: TurretId;
}

export type NetworkEventHandler = (event: string, payload: unknown) => void;

export class MultiplayerService {
  private currentChannel: RealtimeChannel | null = null;
  private currentRoomId: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: Set<NetworkEventHandler> = new Set();

  /**
   * Получить список активных серверов с фильтрацией.
   */
  static async listRooms(filter?: RoomFilterOptions): Promise<RoomData[]> {
    try {
      // Сначала вызываем фоновую очистку зависших серверов
      try {
        await supabase.rpc('cleanup_stale_rooms');
      } catch {
        // Игнорируем ошибку, если RPC недоступен
      }

      let query = supabase
        .from('rooms')
        .select('*')
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter?.mode) {
        query = query.eq('mode', filter.mode);
      }
      if (filter?.mapId) {
        query = query.eq('map_id', filter.mapId);
      }
      if (filter?.hidePassword) {
        query = query.eq('has_password', false);
      }

      const { data, error } = await query;
      if (error || !data) {
        console.error('[MultiplayerService] listRooms error:', error);
        return [];
      }

      let rooms = data as RoomData[];

      if (filter?.hideFull) {
        rooms = rooms.filter((r) => r.player_count < r.max_players);
      }
      if (filter?.search && filter.search.trim() !== '') {
        const s = filter.search.trim().toLowerCase();
        rooms = rooms.filter((r) => r.name.toLowerCase().includes(s) || r.host_name.toLowerCase().includes(s));
      }

      return rooms;
    } catch (err) {
      console.error('[MultiplayerService] listRooms failed:', err);
      return [];
    }
  }

  /**
   * Создать новый сервер.
   */
  static async createRoom(
    opts: CreateRoomOptions,
    player: PlayerProfileInfo,
  ): Promise<{ success: boolean; room?: RoomData; error?: string }> {
    try {
      const roomPayload = {
        name: opts.name.trim() || `Сервер ${player.username}`,
        host_id: player.userId,
        host_name: player.username,
        mode: opts.mode,
        map_id: opts.map_id,
        max_players: opts.max_players ?? 8,
        player_count: 1,
        has_password: Boolean(opts.password && opts.password.trim().length > 0),
        password_hash: opts.password?.trim() || null,
        bots_enabled: opts.bots_enabled ?? true,
        status: 'waiting',
      };

      const { data: room, error: createErr } = await supabase
        .from('rooms')
        .insert(roomPayload)
        .select()
        .single();

      if (createErr || !room) {
        return { success: false, error: createErr?.message || 'Не удалось создать комнату' };
      }

      // Добавляем хоста в room_players
      const isTeam = opts.mode === 'team_deathmatch' || opts.mode === 'capture_point';
      const initialTeam: TeamId = isTeam ? 'alpha' : null;

      await supabase.from('room_players').insert({
        room_id: room.id,
        user_id: player.userId,
        username: player.username,
        hull_id: player.hullId,
        turret_id: player.turretId,
        team: initialTeam,
        is_host: true,
        ping: 0,
      });

      return { success: true, room: room as RoomData };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Подключиться к серверу по ID с проверкой пароля.
   */
  static async joinRoom(
    roomId: string,
    player: PlayerProfileInfo,
    password?: string,
  ): Promise<{ success: boolean; room?: RoomData; team?: TeamId; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('join_room_with_password', {
        p_room_id: roomId,
        p_user_id: player.userId,
        p_username: player.username,
        p_hull_id: player.hullId,
        p_turret_id: player.turretId,
        p_password: password?.trim() || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data || !data.success) {
        return { success: false, error: data?.error || 'Не удалось войти на сервер' };
      }

      return {
        success: true,
        room: data.room as RoomData,
        team: data.team as TeamId,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Быстрая игра: находит лучший доступный открытый сервер без пароля,
   * либо мгновенно создаёт новый открытый сервер с ботами.
   */
  static async quickMatch(
    player: PlayerProfileInfo,
    preferMode?: MatchModeId,
    preferMap?: MapId,
  ): Promise<{ success: boolean; room?: RoomData; isHost: boolean; team?: TeamId; error?: string }> {
    try {
      const { data: foundRooms, error } = await supabase.rpc('find_quick_match', {
        p_mode: preferMode ?? null,
        p_map_id: preferMap ?? null,
      });

      if (!error && Array.isArray(foundRooms) && foundRooms.length > 0) {
        const target = foundRooms[0];
        const joinRes = await this.joinRoom(target.id, player);
        if (joinRes.success && joinRes.room) {
          return {
            success: true,
            room: joinRes.room,
            isHost: false,
            team: joinRes.team,
          };
        }
      }

      // Если серверов нет или вход не удался — создаём новый публичный сервер
      const modes: MatchModeId[] = ['team_deathmatch', 'deathmatch', 'capture_point'];
      const maps: MapId[] = ['factory', 'city', 'village'];
      const chosenMode = preferMode ?? modes[Math.floor(Math.random() * modes.length)];
      const chosenMap = preferMap ?? maps[Math.floor(Math.random() * maps.length)];
      const roomNum = Math.floor(100 + Math.random() * 900);

      const createRes = await this.createRoom(
        {
          name: `Битва #${roomNum}`,
          mode: chosenMode,
          map_id: chosenMap,
          max_players: 8,
          bots_enabled: true,
          password: '',
        },
        player,
      );

      if (!createRes.success || !createRes.room) {
        return { success: false, isHost: false, error: createRes.error };
      }

      const team: TeamId = (chosenMode === 'team_deathmatch' || chosenMode === 'capture_point') ? 'alpha' : null;

      return {
        success: true,
        room: createRes.room,
        isHost: true,
        team,
      };
    } catch (err) {
      return {
        success: false,
        isHost: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Покинуть комнату.
   */
  static async leaveRoom(roomId: string, userId: string): Promise<void> {
    try {
      await supabase.rpc('leave_room', {
        p_room_id: roomId,
        p_user_id: userId,
      });
    } catch (err) {
      console.warn('[MultiplayerService] leaveRoom RPC error:', err);
    }
  }

  /**
   * Подписаться на Realtime канал комнаты для передачи пакетов в реальном времени.
   */
  connectToRoom(
    roomId: string,
    player: PlayerProfileInfo,
    onPacket: NetworkEventHandler,
  ): RealtimeChannel {
    this.disconnect();
    this.currentRoomId = roomId;
    this.eventHandlers.add(onPacket);

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: player.userId },
      },
    });

    // Обработка входящих broadcast пакетов
    channel.on('broadcast', { event: 'tank_transform' }, ({ payload }) => {
      this.dispatch('tank_transform', payload);
    });
    channel.on('broadcast', { event: 'weapon_fire' }, ({ payload }) => {
      this.dispatch('weapon_fire', payload);
    });
    channel.on('broadcast', { event: 'tank_damage' }, ({ payload }) => {
      this.dispatch('tank_damage', payload);
    });
    channel.on('broadcast', { event: 'match_sync' }, ({ payload }) => {
      this.dispatch('match_sync', payload);
    });
    channel.on('broadcast', { event: 'chat_msg' }, ({ payload }) => {
      this.dispatch('chat_msg', payload);
    });

    // Presence: отслеживание подключения/отключения игроков
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      this.dispatch('presence_sync', state);
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      this.dispatch('player_left', leftPresences);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({
          userId: player.userId,
          username: player.username,
          hullId: player.hullId,
          turretId: player.turretId,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    this.currentChannel = channel;

    // Heartbeat таймер (каждые 15 секунд подтверждаем жизнь комнаты)
    this.heartbeatTimer = setInterval(() => {
      if (this.currentRoomId) {
        void supabase.rpc('heartbeat_room', { p_room_id: this.currentRoomId });
      }
    }, 15000);

    return channel;
  }

  /**
   * Отправить обновление положения своего танка (20-30 Гц).
   */
  sendTransform(packet: TankTransformPacket) {
    if (!this.currentChannel) return;
    this.currentChannel.send({
      type: 'broadcast',
      event: 'tank_transform',
      payload: packet,
    });
  }

  /**
   * Отправить выстрел оружия.
   */
  sendFire(packet: WeaponFirePacket) {
    if (!this.currentChannel) return;
    this.currentChannel.send({
      type: 'broadcast',
      event: 'weapon_fire',
      payload: packet,
    });
  }

  /**
   * Отправить событие урона.
   */
  sendDamage(packet: TankDamagePacket) {
    if (!this.currentChannel) return;
    this.currentChannel.send({
      type: 'broadcast',
      event: 'tank_damage',
      payload: packet,
    });
  }

  /**
   * Отправить синхронизацию очков и времени матча (от хоста).
   */
  sendMatchSync(packet: MatchSyncPacket) {
    if (!this.currentChannel) return;
    this.currentChannel.send({
      type: 'broadcast',
      event: 'match_sync',
      payload: packet,
    });
  }

  /**
   * Отключиться от текущей комнаты и очистить таймеры.
   */
  disconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.currentChannel) {
      void supabase.removeChannel(this.currentChannel);
      this.currentChannel = null;
    }
    this.currentRoomId = null;
    this.eventHandlers.clear();
  }

  private dispatch(event: string, payload: unknown) {
    for (const handler of this.eventHandlers) {
      try {
        handler(event, payload);
      } catch (err) {
        console.error('[MultiplayerService] handler error:', err);
      }
    }
  }
}
