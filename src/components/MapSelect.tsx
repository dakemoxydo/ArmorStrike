// ===== Выбор карты перед стартом матча =====
import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Factory, Play, Trees } from 'lucide-react';
import { MAP_IDS, MAPS, type MapId, DEFAULT_MAP_ID } from '../game/maps/mapCatalog';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { isInteractiveKeyboardTarget } from '../ui/keyboardTarget';

interface MapSelectProps {
  initialMapId?: MapId;
  onConfirm: (mapId: MapId) => void;
  onCancel: () => void;
}

const ICONS: Record<MapId, React.ReactNode> = {
  factory: <Factory size={28} aria-hidden />,
  village: <Trees size={28} aria-hidden />,
  city: <Building2 size={28} aria-hidden />,
};

export default function MapSelect({
  initialMapId = DEFAULT_MAP_ID,
  onConfirm,
  onCancel,
}: MapSelectProps) {
  const [selected, setSelected] = useState<MapId>(initialMapId);
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.code === 'Enter') {
        // H7: Enter на сфокусированной кнопке — активация кнопки, не глобальный confirm.
        if (isInteractiveKeyboardTarget(e.target)) return;
        e.preventDefault();
        onConfirm(selected);
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const i = MAP_IDS.indexOf(selected);
        const next = e.code === 'ArrowRight'
          ? MAP_IDS[(i + 1) % MAP_IDS.length]
          : MAP_IDS[(i - 1 + MAP_IDS.length) % MAP_IDS.length];
        setSelected(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onConfirm, onCancel]);

  const def = MAPS[selected];

  return (
    <div
      ref={trapRef}
      className="scrim-menu absolute inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-select-title"
    >
      <div className="menu-stripes pointer-events-none absolute inset-x-0 top-0 h-2" />
      <div className="menu-stripes pointer-events-none absolute inset-x-0 bottom-0 h-2" />

      <div className="relative z-10 w-full max-w-4xl">
        {/* Тот же каркас, что у выбора режима (U9/U10). */}
        <div className="anim-up mb-6 flex flex-wrap items-center justify-between gap-4" style={{ '--d': '0.05s' } as React.CSSProperties}>
          <button type="button" onClick={onCancel} className="btn-game btn-ghost px-5 py-2.5 text-xs">
            <ArrowLeft size={16} className="bicon" aria-hidden />
            <span>НАЗАД</span>
          </button>
          <span className="cut-chip prep-step">ШАГ 2 ИЗ 2 · КАРТА</span>
        </div>

        <div className="anim-up mb-6" style={{ '--d': '0.1s' } as React.CSSProperties}>
          <div className="hud-label mb-1">ПОДГОТОВКА К БОЮ</div>
          <h2 id="map-select-title" className="font-display text-3xl tracking-hero md:text-4xl">
            ВЫБОР КАРТЫ
          </h2>
        </div>

        <div
          className="anim-up grid gap-4 sm:grid-cols-3"
          style={{ '--d': '0.15s' } as React.CSSProperties}
          role="listbox"
          aria-label="Карты"
        >
          {MAP_IDS.map((id) => {
            const m = MAPS[id];
            const active = id === selected;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => setSelected(id)}
                className={`map-card hud-panel text-left transition-all duration-200 ${active ? 'map-card-active' : ''}`}
                style={{
                  ['--map-accent' as string]: m.accent,
                  ['--map-accent-rgb' as string]: m.accentRgb,
                }}
              >
                {active && <span className="picked-flag">ВЫБРАНО</span>}
                <div className="map-card-icon">{ICONS[id]}</div>
                <div className="font-display text-lg tracking-wider" style={{ color: m.accent }}>
                  {m.name}
                </div>
                <div className="mt-0.5 text-[10px] tracking-widest text-white/60 uppercase">
                  {m.nameEn}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/60">
                  {m.blurb}
                </p>
              </button>
            );
          })}
        </div>

        <div
          className="anim-up mt-8 flex flex-wrap items-center justify-between gap-4"
          style={{ '--d': '0.28s' } as React.CSSProperties}
        >
          <p className="prep-hint">
            ← → смена карты · Enter: в бой · Esc: назад
          </p>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="btn-game btn-primary px-10 py-3.5 text-base"
            aria-label={`Начать бой на карте ${def.name}`}
            data-autofocus
          >
            <Play size={20} className="bicon" aria-hidden />
            <span>В БОЙ · {def.name.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
