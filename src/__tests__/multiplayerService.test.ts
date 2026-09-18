// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MultiplayerService } from '../game/network/multiplayerService';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('MultiplayerService', () => {
  const dummyPlayer = {
    userId: 'user_123',
    username: 'TankerPro',
    hullId: 'hunter' as const,
    turretId: 'railgun' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('listRooms', () => {
    it('fetches rooms and filters by search and hideFull', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Заводская битва',
          host_id: 'host-1',
          host_name: 'AlphaCommander',
          mode: 'team_deathmatch',
          map_id: 'factory',
          max_players: 8,
          player_count: 8,
          has_password: false,
          bots_enabled: true,
          status: 'in_progress',
        },
        {
          id: 'room-2',
          name: 'Городская дуэль',
          host_id: 'host-2',
          host_name: 'BetaSniper',
          mode: 'deathmatch',
          map_id: 'city',
          max_players: 4,
          player_count: 2,
          has_password: true,
          bots_enabled: false,
          status: 'waiting',
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockRooms, error: null }),
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });
      (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

      // Search matching "город"
      const resultSearch = await MultiplayerService.listRooms({ search: 'город' });
      expect(resultSearch).toHaveLength(1);
      expect(resultSearch[0].id).toBe('room-2');

      // Filter hideFull
      const resultHideFull = await MultiplayerService.listRooms({ hideFull: true });
      expect(resultHideFull).toHaveLength(1);
      expect(resultHideFull[0].id).toBe('room-2');
    });
  });

  describe('createRoom', () => {
    it('creates room and inserts player as host', async () => {
      const insertedRoom = {
        id: 'new-room-99',
        name: 'Новый Сервер',
        host_id: 'user_123',
        host_name: 'TankerPro',
        mode: 'team_deathmatch',
        map_id: 'factory',
        max_players: 8,
        player_count: 1,
        has_password: false,
        bots_enabled: true,
        status: 'waiting',
      };

      const insertRoomMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRoom, error: null }),
        }),
      });

      const insertPlayerMock = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'rooms') return { insert: insertRoomMock };
        if (table === 'room_players') return { insert: insertPlayerMock };
        return {};
      });

      const res = await MultiplayerService.createRoom(
        {
          name: 'Новый Сервер',
          mode: 'team_deathmatch',
          map_id: 'factory',
        },
        dummyPlayer,
      );

      expect(res.success).toBe(true);
      expect(res.room?.id).toBe('new-room-99');
      expect(insertPlayerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          room_id: 'new-room-99',
          user_id: 'user_123',
          is_host: true,
          team: 'alpha',
        }),
      );
    });
  });

  describe('joinRoom', () => {
    it('calls join_room_with_password rpc', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: true,
          room: { id: 'room-55', name: 'Сервер' },
          team: 'bravo',
        },
        error: null,
      });

      const res = await MultiplayerService.joinRoom('room-55', dummyPlayer, 'secret123');

      expect(res.success).toBe(true);
      expect(res.team).toBe('bravo');
      expect(supabase.rpc).toHaveBeenCalledWith('join_room_with_password', {
        p_room_id: 'room-55',
        p_user_id: 'user_123',
        p_username: 'TankerPro',
        p_hull_id: 'hunter',
        p_turret_id: 'railgun',
        p_password: 'secret123',
      });
    });
  });

  describe('quickMatch', () => {
    it('joins existing open room when available', async () => {
      (supabase.rpc as any).mockImplementation((rpcName: string) => {
        if (rpcName === 'find_quick_match') {
          return Promise.resolve({
            data: [{ id: 'quick-found-room' }],
            error: null,
          });
        }
        if (rpcName === 'join_room_with_password') {
          return Promise.resolve({
            data: {
              success: true,
              room: { id: 'quick-found-room', name: 'Быстрый' },
              team: 'bravo',
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const res = await MultiplayerService.quickMatch(dummyPlayer);

      expect(res.success).toBe(true);
      expect(res.isHost).toBe(false);
      expect(res.room?.id).toBe('quick-found-room');
    });

    it('auto-creates a room when no open servers found', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: [], error: null });

      const insertedRoom = {
        id: 'auto-room-777',
        name: 'Битва #555',
        host_id: 'user_123',
        host_name: 'TankerPro',
        mode: 'deathmatch',
        map_id: 'factory',
        max_players: 8,
        player_count: 1,
        has_password: false,
        bots_enabled: true,
        status: 'waiting',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedRoom, error: null }),
              }),
            }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      });

      const res = await MultiplayerService.quickMatch(dummyPlayer, 'deathmatch', 'factory');

      expect(res.success).toBe(true);
      expect(res.isHost).toBe(true);
      expect(res.room?.id).toBe('auto-room-777');
    });
  });

  describe('connectToRoom and channel events', () => {
    it('subscribes to room channel and sends packets', () => {
      const sendMock = vi.fn();
      const trackMock = vi.fn();
      const onMock = vi.fn().mockReturnThis();
      const subscribeMock = vi.fn((cb) => {
        cb('SUBSCRIBED');
      });

      const mockChannel = {
        on: onMock,
        subscribe: subscribeMock,
        send: sendMock,
        track: trackMock,
      };

      (supabase.channel as any).mockReturnValue(mockChannel);

      const service = new MultiplayerService();
      const onPacket = vi.fn();

      service.connectToRoom('room-100', dummyPlayer, onPacket);

      expect(supabase.channel).toHaveBeenCalledWith('room:room-100', expect.any(Object));
      expect(trackMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          username: 'TankerPro',
        }),
      );

      // Test sending transform
      service.sendTransform({
        userId: 'user_123',
        x: 10,
        z: 20,
        yaw: 1.5,
        aimYaw: 1.5,
        barrelPitch: 0.1,
        speed: 12,
        boosting: false,
        timestamp: 1000,
      });

      expect(sendMock).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'tank_transform',
        payload: expect.objectContaining({ x: 10, z: 20 }),
      });

      // Test sending fire
      service.sendFire({
        userId: 'user_123',
        turretId: 'railgun',
        origin: [0, 1, 0],
        dir: [0, 0, 1],
        barrelPitch: 0,
        timestamp: 1001,
      });

      expect(sendMock).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'weapon_fire',
        payload: expect.objectContaining({ turretId: 'railgun' }),
      });

      // Test disconnect
      service.disconnect();
      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});
