import { Check, Gauge, Lock, Shield } from 'lucide-react';
import { HULLS } from '../core/catalog';
import type { HullId, HullDef } from '../core/catalog';

/** Bar scale for the armour readout — derived so a new top-tier hull cannot clip. */
const MAX_HULL_HP = Math.max(...Object.values(HULLS).map((h) => h.maxHealth));
/** Bar scale for the speed readout (fastest hull ≈ full bar). */
const MAX_HULL_SPEED = Math.max(...Object.values(HULLS).map((h) => h.speed));

interface HullCardProps {
  hull: HullDef;
  isSelected: boolean;
  isLocked?: boolean;
  delay: string;
  onSelect: (id: HullId) => void;
  disabled?: boolean;
}

export default function HullCard({ hull, isSelected, isLocked, delay, onSelect, disabled }: HullCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hull.id)}
      disabled={disabled || isLocked}
      aria-pressed={isSelected}
      aria-disabled={isLocked}
      title={isLocked ? `${hull.name} (Заблокировано)` : hull.desc}
      className={`hud-panel garage-card anim-up p-3${isSelected ? ' is-selected hull-selected' : ''}${isLocked ? ' is-locked opacity-50 cursor-not-allowed' : ''}`}
      style={{ '--d': delay } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-lg tracking-wide text-white">{hull.name}</span>
        {isSelected && <Check size={18} className="g-check text-amber-300" aria-hidden />}
        {isLocked && <Lock size={16} className="text-white/50" aria-hidden />}
      </div>
      {isLocked ? (
        <div className="card-badge cut-chip px-2 py-0.5 mb-2 text-[10px] tracking-wider uppercase bg-white/5 text-white/50 border border-white/10 flex items-center gap-1">
          <Lock size={10} aria-hidden /> ЗАКРЫТО
        </div>
      ) : (
        <div className="card-badge cut-chip px-2 py-0.5 mb-2 text-[10px] tracking-wider uppercase bg-amber-500/20 text-amber-200 border border-amber-500/40">
          {hull.badge}
        </div>
      )}
      {/* Компактная карточка: без описания — паспорт справа несёт факты,
          флейвор доступен в тултипе; 1fr-ряд выше держит бары на одной линии. */}
      <div className="space-y-2 text-[10px]">
        <div>
          <div className="flex justify-between text-white/70 mb-1">
            <span className="flex items-center gap-1"><Shield size={10} aria-hidden /> БРОНЯ</span>
            <span className="font-display text-emerald-300">{hull.maxHealth} HP</span>
          </div>
          <div className="g-bar">
            <i className="g-stat-bar bg-emerald-400" style={{ width: `${(hull.maxHealth / MAX_HULL_HP) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-white/70 mb-1">
            <span className="flex items-center gap-1"><Gauge size={10} aria-hidden /> СКОРОСТЬ</span>
            <span className="font-display text-amber-300">{hull.speed}</span>
          </div>
          <div className="g-bar">
            <i className="g-stat-bar bg-amber-400" style={{ width: `${(hull.speed / MAX_HULL_SPEED) * 100}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
}
