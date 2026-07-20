// ===== Выбор режима матча (DM / TDM / CP) =====
import { useEffect, useState } from 'react';
import { ArrowLeft, Crosshair, Flag, Play, Users } from 'lucide-react';
import type { MatchModeId } from '../game/types';
import { useFocusTrap } from '../hooks/useFocusTrap';

export interface ModeOption {
  id: MatchModeId;
  title: string;
  blurb: string;
  meta: string;
  /** false = shown but not selectable (future phases). */
  enabled: boolean;
}

const MODES: ModeOption[] = [
  {
    id: 'deathmatch',
    title: 'БОЙ НАСМЕРТЬ',
    blurb: 'Free-for-all: 8 бойцов, первый до 30 убийств.',
    meta: '1+7 · 30 kills · 12 мин',
    enabled: true,
  },
  {
    id: 'team_deathmatch',
    title: 'КОМАНДНЫЙ БОЙ',
    blurb: '5 vs 5, без friendly fire. Победа — 75 командных фрагов.',
    meta: '5v5 · 75 team · 12 мин',
    enabled: true,
  },
  {
    id: 'capture_point',
    title: 'ЗАХВАТ ТОЧКИ',
    blurb: '5 vs 5, точки A/B/C. Своя точка: +1/s. Победа — 1000 очков.',
    meta: '5v5 · 1000 score · 12 мин',
    enabled: true,
  },
];

interface ModeSelectProps {
  initialMode?: MatchModeId;
  onConfirm: (mode: MatchModeId) => void;
  onCancel: () => void;
}

export default function ModeSelect({
  initialMode = 'deathmatch',
  onConfirm,
  onCancel,
}: ModeSelectProps) {
  const start =
    MODES.find((m) => m.enabled && m.id === initialMode)?.id
    ?? MODES.find((m) => m.enabled)?.id
    ?? 'deathmatch';
  const [selected, setSelected] = useState<MatchModeId>(start);
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    const enabled = MODES.filter((m) => m.enabled);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.code === 'Enter') {
        e.preventDefault();
        const opt = MODES.find((m) => m.id === selected);
        if (opt?.enabled) onConfirm(selected);
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const i = enabled.findIndex((m) => m.id === selected);
        if (i < 0) return;
        const next = e.code === 'ArrowRight'
          ? enabled[(i + 1) % enabled.length]
          : enabled[(i - 1 + enabled.length) % enabled.length];
        setSelected(next.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onConfirm, onCancel]);

  const icon = (id: MatchModeId) => {
    if (id === 'team_deathmatch') return <Users size={28} aria-hidden />;
    if (id === 'capture_point') return <Flag size={28} aria-hidden />;
    return <Crosshair size={28} aria-hidden />;
  };

  return (
    <div
      ref={trapRef}
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#04060bf0] p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-select-title"
    >
      <div className="menu-stripes pointer-events-none absolute inset-x-0 top-0 h-2" />
      <div className="menu-stripes pointer-events-none absolute inset-x-0 bottom-0 h-2" />

      <div className="relative z-10 w-full max-w-4xl">
        <div className="anim-up mb-6 flex flex-wrap items-end justify-between gap-4" style={{ '--d': '0.05s' } as React.CSSProperties}>
          <div>
            <div className="hud-label mb-1 text-cyan-300/70">ПОДГОТОВКА К БОЮ</div>
            <h2 id="mode-select-title" className="font-display text-3xl tracking-wider md:text-4xl">
              ВЫБОР РЕЖИМА
            </h2>
          </div>
          <button type="button" onClick={onCancel} className="btn-game btn-ghost px-5 py-2.5 text-xs">
            <ArrowLeft size={16} className="bicon" aria-hidden />
            <span>НАЗАД</span>
          </button>
        </div>

        <div
          className="anim-up grid gap-4 sm:grid-cols-3"
          style={{ '--d': '0.15s' } as React.CSSProperties}
          role="listbox"
          aria-label="Режимы матча"
        >
          {MODES.map((m) => {
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={active}
                disabled={!m.enabled}
                onClick={() => m.enabled && setSelected(m.id)}
                className={[
                  'hud-panel relative flex flex-col items-start gap-3 p-5 text-left transition-all',
                  m.enabled
                    ? active
                      ? 'border-cyan-400/70 shadow-[0_0_28px_rgba(46,230,192,0.28)]'
                      : 'border-white/10 hover:border-cyan-400/40'
                    : 'cursor-not-allowed opacity-45',
                ].join(' ')}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded border ${
                  active && m.enabled
                    ? 'border-cyan-400/50 bg-cyan-950/50 text-cyan-300'
                    : 'border-white/15 bg-black/30 text-white/70'
                }`}>
                  {icon(m.id)}
                </div>
                <div>
                  <div className="font-display text-sm tracking-wider text-white">{m.title}</div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">{m.blurb}</p>
                </div>
                <div className="mt-auto font-display text-[10px] tracking-[0.18em] text-cyan-300/70">
                  {m.meta}
                </div>
              </button>
            );
          })}
        </div>

        <div className="anim-up mt-8 flex justify-end" style={{ '--d': '0.28s' } as React.CSSProperties}>
          <button
            type="button"
            className="btn-game btn-primary px-10 py-3.5 text-base"
            disabled={!MODES.find((m) => m.id === selected)?.enabled}
            onClick={() => onConfirm(selected)}
            aria-label="Продолжить к выбору карты"
          >
            <Play size={18} className="bicon" aria-hidden />
            <span>ДАЛЕЕ — КАРТА</span>
          </button>
        </div>
      </div>
    </div>
  );
}
