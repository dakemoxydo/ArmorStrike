// ===== Выбор режима матча (DM / TDM / CP) =====
import { useEffect, useState } from 'react';
import { ArrowLeft, Crosshair, Flag, Play, Users } from 'lucide-react';
import type { MatchModeId } from '../game/types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { isInteractiveKeyboardTarget } from '../ui/keyboardTarget';

interface ModeOption {
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
    blurb: 'Каждый сам за себя: 8 бойцов, победа — 25 убийств.',
    meta: '1+7 · 25 фрагов · 12 мин',
    enabled: true,
  },
  {
    id: 'team_deathmatch',
    title: 'КОМАНДНЫЙ БОЙ',
    blurb: '5 на 5, без огня по своим. Победа — 50 командных фрагов.',
    meta: '5×5 · 50 фрагов · 12 мин',
    enabled: true,
  },
  {
    id: 'capture_point',
    title: 'ЗАХВАТ ТОЧКИ',
    blurb: '5 на 5, точки A/B/C. Своя точка: +1 очко/с. Победа — 1000 очков.',
    meta: '5×5 · 1000 очков · 12 мин',
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
        // H7: фокус на кнопке — Enter принадлежит кнопке (её activation),
        // глобальный обработчик молчит (тот же гейт, что в App).
        if (isInteractiveKeyboardTarget(e.target)) return;
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
      className="scrim-menu absolute inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-select-title"
    >
      <div className="menu-stripes pointer-events-none absolute inset-x-0 top-0 h-2" />
      <div className="menu-stripes pointer-events-none absolute inset-x-0 bottom-0 h-2" />

      <div className="relative z-10 w-full max-w-4xl">
        {/* Шапка каркаса: назад слева, номер шага справа (U10). */}
        <div className="anim-up mb-6 flex flex-wrap items-center justify-between gap-4" style={{ '--d': '0.05s' } as React.CSSProperties}>
          <button type="button" onClick={onCancel} className="btn-game btn-ghost px-5 py-2.5 text-xs">
            <ArrowLeft size={16} className="bicon" aria-hidden />
            <span>НАЗАД</span>
          </button>
          <span className="cut-chip prep-step">ШАГ 1 ИЗ 2 · РЕЖИМ</span>
        </div>

        <div className="anim-up mb-6" style={{ '--d': '0.1s' } as React.CSSProperties}>
          <div className="hud-label mb-1">ПОДГОТОВКА К БОЮ</div>
          <h2 id="mode-select-title" className="font-display text-3xl tracking-hero md:text-4xl">
            ВЫБОР РЕЖИМА
          </h2>
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
                  'hud-panel mode-card relative flex flex-col items-start gap-3 p-5 text-left transition-all',
                  active ? 'is-active' : '',
                ].join(' ')}
              >
                {active && <span className="picked-flag">ВЫБРАНО</span>}
                <div className="mode-icon">
                  {icon(m.id)}
                </div>
                <div>
                  <div className="font-display text-sm tracking-wider text-white">{m.title}</div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">{m.blurb}</p>
                </div>
                <div className="mode-meta">
                  {m.meta}
                </div>
              </button>
            );
          })}
        </div>

        <div className="anim-up mt-8 flex flex-wrap items-center justify-between gap-4" style={{ '--d': '0.28s' } as React.CSSProperties}>
          <p className="prep-hint">
            ← → смена режима · Enter: далее · Esc: назад
          </p>
          <button
            type="button"
            className="btn-game btn-primary px-10 py-3.5 text-base"
            disabled={!MODES.find((m) => m.id === selected)?.enabled}
            onClick={() => onConfirm(selected)}
            aria-label="Продолжить к выбору карты"
            data-autofocus
          >
            <Play size={18} className="bicon" aria-hidden />
            <span>ДАЛЕЕ · КАРТА</span>
          </button>
        </div>
      </div>
    </div>
  );
}
