import { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Globe,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shuffle,
  X,
} from 'lucide-react';
import type { MatchModeId } from '../../game/match/matchTypes';
import type { MapId } from '../../game/maps/mapCatalog';
import type { CreateRoomOptions, RoomData } from '../../game/network/types';
import { MultiplayerService, type RoomFilterOptions } from '../../game/network/multiplayerService';
import CreateServerModal from './CreateServerModal';
import PasswordPromptModal from './PasswordPromptModal';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ServerBrowserModalProps {
  username: string;
  onJoinRoom: (roomId: string, password?: string) => Promise<void>;
  onCreateRoom: (opts: CreateRoomOptions) => Promise<void>;
  onQuickMatch: () => Promise<void>;
  onClose: () => void;
}

export default function ServerBrowserModal({
  username,
  onJoinRoom,
  onCreateRoom,
  onQuickMatch,
  onClose,
}: ServerBrowserModalProps) {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<MatchModeId | 'all'>('all');
  const [mapFilter, setMapFilter] = useState<MapId | 'all'>('all');
  const [hideFull, setHideFull] = useState(false);
  const [hidePassword, setHidePassword] = useState(false);

  // Submodals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordTargetRoom, setPasswordTargetRoom] = useState<RoomData | null>(null);

  const trapRef = useFocusTrap(true);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opts: RoomFilterOptions = {
        search: search.trim() || undefined,
        mode: modeFilter === 'all' ? undefined : modeFilter,
        mapId: mapFilter === 'all' ? undefined : mapFilter,
        hideFull,
        hidePassword,
      };
      const list = await MultiplayerService.listRooms(opts);
      setRooms(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки серверов');
    } finally {
      setLoading(false);
    }
  }, [search, modeFilter, mapFilter, hideFull, hidePassword]);

  useEffect(() => {
    void fetchRooms();
    const interval = setInterval(fetchRooms, 8000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleJoinClick = (room: RoomData) => {
    if (room.has_password) {
      setPasswordTargetRoom(room);
    } else {
      void onJoinRoom(room.id);
    }
  };

  const handlePasswordConfirm = (password: string) => {
    if (!passwordTargetRoom) return;
    const rId = passwordTargetRoom.id;
    setPasswordTargetRoom(null);
    void onJoinRoom(rId, password);
  };

  const mapLabel = (m: MapId) => {
    switch (m) {
      case 'factory': return 'Завод';
      case 'city': return 'Город';
      case 'village': return 'Деревня';
      default: return m;
    }
  };

  const modeLabel = (m: MatchModeId) => {
    switch (m) {
      case 'deathmatch': return 'DM';
      case 'team_deathmatch': return 'TDM';
      case 'capture_point': return 'CP';
      default: return m;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md anim-fade"
      role="dialog"
      aria-modal="true"
      aria-label="Список серверов мультиплеера"
    >
      <div
        ref={trapRef}
        className="hud-panel relative flex flex-col w-full max-w-5xl h-[85vh] border border-cyan-500/40 bg-[#060a12]/95 p-6 md:p-8 shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Globe size={22} aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl tracking-wider text-cyan-300">
                  СПИСОК СЕРВЕРОВ
                </h2>
                <span className="cut-chip bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-xs font-mono">
                  {rooms.length} ОНЛАЙН
                </span>
              </div>
              <div className="text-xs text-white/60">
                Подключайтесь к существующему бою или создайте свой сервер
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onQuickMatch}
              className="btn-game btn-ghost px-4 py-2 text-xs flex items-center gap-2 text-amber-300 hover:text-amber-200"
              title="Быстрый вход на любой открытый сервер"
            >
              <Shuffle size={16} aria-hidden />
              <span className="hidden sm:inline">БЫСТРАЯ ИГРА</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="btn-game btn-primary px-5 py-2 text-xs flex items-center gap-1.5"
            >
              <Plus size={16} aria-hidden />
              <span>СОЗДАТЬ СЕРВЕР</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors ml-2"
              aria-label="Закрыть список серверов"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex items-center min-w-[200px]">
              <Search size={14} className="absolute left-2.5 text-white/50 pointer-events-none" aria-hidden />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени..."
                className="w-full pl-8 pr-3 py-1.5 bg-black/50 border border-white/15 focus:border-cyan-400 focus:outline-none text-xs text-white placeholder-white/50"
              />
            </div>

            {/* Mode filter buttons */}
            <div className="flex items-center border border-white/10 bg-black/40 p-0.5 text-xs">
              {(['all', 'deathmatch', 'team_deathmatch', 'capture_point'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeFilter(m)}
                  className={`px-2.5 py-1 text-[11px] font-display transition-colors ${
                    modeFilter === m ? 'bg-cyan-500/25 text-cyan-200 font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {m === 'all' ? 'ВСЕ РЕЖИМЫ' : modeLabel(m)}
                </button>
              ))}
            </div>

            {/* Map filter */}
            <div className="flex items-center border border-white/10 bg-black/40 p-0.5 text-xs">
              {(['all', 'factory', 'city', 'village'] as const).map((mp) => (
                <button
                  key={mp}
                  type="button"
                  onClick={() => setMapFilter(mp)}
                  className={`px-2.5 py-1 text-[11px] font-display transition-colors ${
                    mapFilter === mp ? 'bg-cyan-500/25 text-cyan-200 font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {mp === 'all' ? 'ВСЕ КАРТЫ' : mapLabel(mp)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-white/70">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={hideFull}
                onChange={(e) => setHideFull(e.target.checked)}
                className="border-white/20 bg-black/40 text-cyan-400 focus:ring-0"
              />
              <span>Скрыть полные</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={hidePassword}
                onChange={(e) => setHidePassword(e.target.checked)}
                className="border-white/20 bg-black/40 text-cyan-400 focus:ring-0"
              />
              <span>Без пароля</span>
            </label>

            <button
              type="button"
              onClick={() => void fetchRooms()}
              disabled={loading}
              className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
              title="Обновить список серверов"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden />
            </button>
          </div>
        </div>

        {/* Server List Content */}
        <div className="flex-1 overflow-y-auto mt-2 min-h-0">
          {error && (
            <div className="p-3 mb-3 bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
              {error}
            </div>
          )}

          {loading && rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/50">
              <Loader2 size={28} className="animate-spin text-cyan-400" aria-hidden />
              <div className="text-xs tracking-wider">ЗАГРУЗКА СПИСКА СЕРВЕРОВ...</div>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <div className="h-12 w-12 bg-white/5 flex items-center justify-center text-white/45">
                <Globe size={26} aria-hidden />
              </div>
              <div>
                <div className="text-sm font-semibold text-white/70">
                  НЕТ ДОСТУПНЫХ СЕРВЕРОВ
                </div>
                <div className="text-xs text-white/45 mt-1 max-w-sm">
                  Активных серверов по выбранным фильтрам не найдено. Создайте свой сервер или запустите быструю игру!
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="btn-game btn-primary px-6 py-2.5 text-xs"
                >
                  <Plus size={16} aria-hidden />
                  <span>СОЗДАТЬ СЕРВЕР</span>
                </button>
                <button
                  type="button"
                  onClick={onQuickMatch}
                  className="btn-game btn-ghost px-6 py-2.5 text-xs text-amber-300"
                >
                  <Shuffle size={16} aria-hidden />
                  <span>БЫСТРАЯ ИГРА</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-display text-white/50 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Сервер</th>
                    <th className="py-2.5 px-3">Режим</th>
                    <th className="py-2.5 px-3">Карта</th>
                    <th className="py-2.5 px-3 text-center">Игроки</th>
                    <th className="py-2.5 px-3 text-center">Боты</th>
                    <th className="py-2.5 px-3 text-center">Статус</th>
                    <th className="py-2.5 px-3 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {rooms.map((room) => {
                    const isFull = room.player_count >= room.max_players;
                    return (
                      <tr
                        key={room.id}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        {/* Name & Host */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {room.has_password && (
                              <Lock size={14} className="text-amber-400 shrink-0" aria-label="Требуется пароль" />
                            )}
                            <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                              {room.name}
                            </div>
                          </div>
                          <div className="text-[10px] text-white/45 mt-0.5">
                            Создатель: {room.host_name}
                          </div>
                        </td>

                        {/* Mode */}
                        <td className="py-3 px-3">
                          <span className="cut-chip bg-white/10 text-white/80 px-2 py-0.5 text-[11px] font-mono">
                            {modeLabel(room.mode)}
                          </span>
                        </td>

                        {/* Map */}
                        <td className="py-3 px-3 text-white/70">
                          {mapLabel(room.map_id)}
                        </td>

                        {/* Player Count */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono font-bold ${
                              isFull ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {room.player_count} / {room.max_players}
                          </span>
                        </td>

                        {/* Bots */}
                        <td className="py-3 px-3 text-center">
                          {room.bots_enabled ? (
                            <span className="text-emerald-400/90 text-[11px] flex items-center justify-center gap-1">
                              <Bot size={13} aria-hidden /> Да
                            </span>
                          ) : (
                            <span className="text-white/45 text-[11px]">Нет</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${
                              room.status === 'in_progress'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-cyan-500/15 text-cyan-300'
                            }`}
                          >
                            {room.status === 'in_progress' ? 'В бою' : 'Ожидание'}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleJoinClick(room)}
                            disabled={isFull}
                            className={`btn-game px-4 py-1.5 text-xs ${
                              isFull
                                ? 'opacity-40 cursor-not-allowed btn-ghost'
                                : 'btn-primary'
                            }`}
                          >
                            {isFull ? 'ЗАПОЛНЕН' : 'ВОЙТИ'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Server Modal */}
      {createModalOpen && (
        <CreateServerModal
          defaultUsername={username}
          onCreate={async (opts) => {
            setCreateModalOpen(false);
            await onCreateRoom(opts);
          }}
          onCancel={() => setCreateModalOpen(false)}
        />
      )}

      {/* Password Prompt Modal */}
      {passwordTargetRoom && (
        <PasswordPromptModal
          roomName={passwordTargetRoom.name}
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPasswordTargetRoom(null)}
        />
      )}
    </div>
  );
}
