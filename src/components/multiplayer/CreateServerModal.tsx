import { useState, type FormEvent } from 'react';
import { Bot, Globe, Lock, Shield, Users, X } from 'lucide-react';
import type { MatchModeId } from '../../game/match/matchTypes';
import type { MapId } from '../../game/maps/mapCatalog';
import type { CreateRoomOptions } from '../../game/network/types';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface CreateServerModalProps {
  defaultUsername: string;
  onCreate: (opts: CreateRoomOptions) => Promise<void>;
  onCancel: () => void;
}

const MODES: { id: MatchModeId; label: string; desc: string }[] = [
  { id: 'deathmatch', label: 'DM (Каждый сам за себя)', desc: 'Все против всех' },
  { id: 'team_deathmatch', label: 'КБ (Командный бой)', desc: 'Alpha против Bravo' },
  { id: 'capture_point', label: 'CP (Захват точек)', desc: 'Борьба за базы A/B/C' },
];

const MAPS: { id: MapId; label: string; nameEn: string }[] = [
  { id: 'factory', label: 'Завод', nameEn: 'Foundry District' },
  { id: 'city', label: 'Город', nameEn: 'Neo City' },
  { id: 'village', label: 'Деревня', nameEn: 'Old Village' },
];

const PLAYER_CAPACITIES = [4, 6, 8, 10];

export default function CreateServerModal({
  defaultUsername,
  onCreate,
  onCancel,
}: CreateServerModalProps) {
  const [name, setName] = useState(`Сервер ${defaultUsername}`);
  const [mode, setMode] = useState<MatchModeId>('team_deathmatch');
  const [mapId, setMapId] = useState<MapId>('factory');
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [botsEnabled, setBotsEnabled] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trapRef = useFocusTrap(true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Укажите название сервера');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        mode,
        map_id: mapId,
        max_players: maxPlayers,
        bots_enabled: botsEnabled,
        password: password.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания сервера');
      setLoading(false);
    }
  };

  return (
    <div
      className="scrim-over fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade"
      role="dialog"
      aria-modal="true"
      aria-label="Создание игрового сервера"
    >
      <div
        ref={trapRef}
        className="hud-panel relative w-full max-w-xl border border-amber-500/40 bg-[#060a12]/95 p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-game btn-ghost btn-icon absolute right-4 top-4 disabled:opacity-50"
          aria-label="Закрыть"
        >
          <X size={18} className="bicon" aria-hidden />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Globe size={22} aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-xl tracking-wider text-amber-300">
              СОЗДАТЬ СЕРВЕР
            </h2>
            <div className="text-xs text-white/60">
              Настройте параметры сетевого матча
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Server Name */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/70 mb-1.5">
              НАЗВАНИЕ СЕРВЕРА
            </label>
            <input
              type="text"
              data-autofocus
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название сервера..."
              className="cut-control w-full px-3 py-2 bg-black/60 border-2 border-[#0b0e14] focus:border-amber-400 focus:outline-none text-sm text-white placeholder-white/50 shadow-[0_2px_0_#0b0e14]"
            />
          </div>

          {/* Mode Select */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/70 mb-1.5">
              РЕЖИМ ИГРЫ
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`cut-control p-3 text-left border-2 transition-all ${
                      active
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-[0_3px_0_#0b0e14] translate-y-[-1px]'
                        : 'border-[#0b0e14] bg-black/40 text-white/70 hover:border-white/25 hover:bg-black/60 shadow-[0_2px_0_#0b0e14]'
                    }`}
                  >
                    <div className="text-xs font-display tracking-wider font-semibold">{m.label.split(' ')[0]}</div>
                    <div className="text-[10px] text-white/50 mt-1">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map Select */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/70 mb-1.5">
              КАРТА АРЕНЫ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MAPS.map((map) => {
                const active = mapId === map.id;
                return (
                  <button
                    key={map.id}
                    type="button"
                    onClick={() => setMapId(map.id)}
                    className={`cut-control p-3 text-center border-2 transition-all ${
                      active
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-[0_3px_0_#0b0e14] translate-y-[-1px]'
                        : 'border-[#0b0e14] bg-black/40 text-white/70 hover:border-white/25 hover:bg-black/60 shadow-[0_2px_0_#0b0e14]'
                    }`}
                  >
                    <div className="text-xs font-display tracking-wider font-semibold">{map.label}</div>
                    <div className="text-[10px] text-white/45 mt-0.5">{map.nameEn}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Capacity & Bots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
                <Users size={14} aria-hidden /> МАКСИМУМ ИГРОКОВ
              </label>
              <div className="flex gap-2">
                {PLAYER_CAPACITIES.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setMaxPlayers(cap)}
                    className={`cut-chip flex-1 py-1.5 border-2 text-xs font-display transition-all ${
                      maxPlayers === cap
                        ? 'border-amber-400 bg-amber-500/25 text-amber-200 font-bold shadow-[0_2px_0_#0b0e14]'
                        : 'border-[#0b0e14] bg-black/40 text-white/60 hover:border-white/25 shadow-[0_1px_0_#0b0e14]'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
                <Bot size={14} aria-hidden /> ИИ-БОТЫ
              </label>
              <button
                type="button"
                onClick={() => setBotsEnabled(!botsEnabled)}
                className={`cut-control w-full py-1.5 px-3 border-2 text-xs font-display flex items-center justify-between transition-colors ${
                  botsEnabled
                    ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-300 shadow-[0_2px_0_#0b0e14]'
                    : 'border-[#0b0e14] bg-black/40 text-white/50 shadow-[0_2px_0_#0b0e14]'
                }`}
              >
                <span>Заполнять ботами:</span>
                <span className="font-bold">{botsEnabled ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО'}</span>
              </button>
            </div>
          </div>

          {/* Password (Optional) */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/70 mb-1.5 flex items-center gap-1.5">
              <Lock size={14} aria-hidden /> ПАРОЛЬ СЕРВЕРА (ОПЦИОНАЛЬНО)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Оставьте пустым для открытого сервера..."
              className="cut-control w-full px-3 py-2 bg-black/60 border-2 border-[#0b0e14] focus:border-amber-400 focus:outline-none text-sm text-white placeholder-white/50 shadow-[0_2px_0_#0b0e14]"
            />
            <p className="mt-1 text-[10px] text-white/45">
              Если указать пароль, зайти смогут только те, кто знает его.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn-game btn-ghost px-5 py-2.5 text-xs disabled:opacity-50"
            >
              ОТМЕНА
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-game btn-primary px-8 py-2.5 text-xs font-display flex items-center gap-2"
            >
              <Shield size={16} aria-hidden />
              <span>{loading ? 'СОЗДАНИЕ...' : 'СОЗДАТЬ И НАЧАТЬ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
