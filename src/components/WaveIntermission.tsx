// ===== Между волнами: превью состава + выбор 1 из 3 боевых баффов =====
import { Crosshair, Flame, Gauge, GaugeCircle, Swords, Timer, Waves, Zap } from 'lucide-react';
import type { GameApi } from '../game/GameApi';
import type { WaveBuffId, WeaponTally } from '../game/types';
import { WAVE_BUFF_OPTIONS, type RoleTally } from '../game/wavePreview';
import { useFocusTrap } from '../hooks/useFocusTrap';

export interface IntermissionPayload {
  clearedWave: number;
  nextWave: number;
  tally: WeaponTally[];
  roleTally?: RoleTally[];
}

interface WaveIntermissionProps {
  game: GameApi;
  data: IntermissionPayload;
  onChosen: () => void;
}

const BUFF_ICON: Record<WaveBuffId, typeof Zap> = {
  damage: Swords,
  speed: GaugeCircle,
  reload: Timer,
};

const WEAPON_ICON: Record<string, typeof Crosshair> = {
  railgun: Crosshair,
  cannon: Gauge,
  flamethrower: Flame,
};

export default function WaveIntermission({ game, data, onChosen }: WaveIntermissionProps) {
  const trapRef = useFocusTrap(true);

  const pick = (id: WaveBuffId) => {
    game.chooseWaveBuff(id);
    onChosen();
  };

  return (
    <div
      ref={trapRef}
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intermission-title"
    >
      <div className="absolute inset-0 bg-[#03070cf0] backdrop-blur-md" />
      <div className="fx-scanlines absolute inset-0" />

      <div className="relative flex max-h-full w-full max-w-lg flex-col items-center overflow-y-auto overscroll-contain px-5 py-4">
        <div className="anim-pop flex flex-col items-center" style={{ '--d': '0s' } as React.CSSProperties}>
          <Waves size={36} className="text-cyan-300" aria-hidden />
          <h2 id="intermission-title" className="font-display mt-3 text-3xl tracking-[0.28em] text-white md:text-4xl">
            ВОЛНА {data.clearedWave} ЗАЧИЩЕНА
          </h2>
          <div className="head-rule mt-3 w-48" style={{ '--d': '0.12s' } as React.CSSProperties} />
          <p className="mt-2 text-center text-[11px] tracking-[0.22em] text-white/55">
            СЛЕДУЮЩАЯ · ВОЛНА {data.nextWave}
          </p>
        </div>

        <div
          className="anim-up mt-5 flex w-full flex-wrap items-center justify-center gap-2"
          style={{ '--d': '0.16s' } as React.CSSProperties}
          aria-label="Состав следующей волны"
        >
          {data.tally.length === 0 ? (
            <div className="hud-panel px-4 py-2 text-sm text-white/70">противники</div>
          ) : (
            data.tally.map((t) => {
              const Icon = WEAPON_ICON[t.weapon] ?? Crosshair;
              return (
                <div
                  key={t.weapon}
                  className="hud-panel flex items-center gap-2 px-3.5 py-2"
                >
                  <Icon size={14} className="text-amber-300" aria-hidden />
                  <span className="font-display text-sm text-white">
                    {t.count}× {t.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {data.roleTally && data.roleTally.length > 0 && (
          <div
            className="anim-up mt-2 flex w-full flex-wrap items-center justify-center gap-1.5"
            style={{ '--d': '0.18s' } as React.CSSProperties}
            aria-label="Роли противников"
          >
            {data.roleTally.map((r) => (
              <div
                key={r.role}
                className={`rounded px-2 py-1 text-[10px] tracking-[0.14em] ${
                  r.role === 'elite'
                    ? 'bg-amber-500/20 text-amber-200'
                    : r.role === 'sniper'
                      ? 'bg-cyan-500/15 text-cyan-200'
                      : r.role === 'assault'
                        ? 'bg-red-500/15 text-red-200'
                        : 'bg-white/10 text-white/60'
                }`}
              >
                {r.count}× {r.label.toUpperCase()}
              </div>
            ))}
          </div>
        )}

        <p className="anim-up mt-6 text-[11px] tracking-[0.2em] text-white/50" style={{ '--d': '0.22s' } as React.CSSProperties}>
          БОЕВАЯ ПОДГОТОВКА
        </p>

        <div className="mt-3 flex w-full flex-col gap-2.5">
          {WAVE_BUFF_OPTIONS.map((opt, i) => {
            const Icon = BUFF_ICON[opt.id];
            return (
              <div key={opt.id} className="anim-up" style={{ '--d': `${0.26 + i * 0.05}s` } as React.CSSProperties}>
                <button
                  type="button"
                  onClick={() => pick(opt.id)}
                  className="btn-game btn-ghost w-full justify-start gap-3 px-5 py-3.5 text-left"
                >
                  <Icon size={18} className="bicon text-cyan-300" aria-hidden />
                  <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span className="font-display text-sm tracking-[0.18em]">{opt.title}</span>
                    <span className="text-[11px] font-normal tracking-normal text-white/55 normal-case">
                      {opt.desc}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
