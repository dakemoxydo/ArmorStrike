import { Check, Gauge, Shield } from 'lucide-react';
import type { HullId, HullDef } from '../core/catalog';

interface HullCardProps {
  hull: HullDef;
  isSelected: boolean;
  delay: string;
  onSelect: (id: HullId) => void;
  disabled?: boolean;
}

export default function HullCard({ hull, isSelected, delay, onSelect, disabled }: HullCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hull.id)}
      disabled={disabled}
      aria-pressed={isSelected}
      className={`hud-panel garage-card anim-up p-4${isSelected ? ' is-selected hull-selected' : ''}${disabled ? ' garage-disabled' : ''}`}
      style={{ '--d': delay } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-lg tracking-wide text-white">{hull.name}</span>
        {isSelected && <Check size={18} className="g-check text-cyan-300" aria-hidden />}
      </div>
      <div className="inline-block px-2 py-0.5 mb-3 text-[9px] tracking-widest uppercase bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 rounded-sm">
        {hull.badge}
      </div>
      <p className="text-[11px] text-white/60 leading-relaxed mb-4 min-h-[34px]">{hull.desc}</p>
      <div className="space-y-2 text-[10px]">
        <div>
          <div className="flex justify-between text-white/70 mb-1">
            <span className="flex items-center gap-1"><Shield size={10} aria-hidden /> БРОНЯ</span>
            <span className="font-display text-emerald-300">{hull.maxHealth} HP</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="g-stat-bar bg-emerald-400 h-full rounded-full" style={{ width: `${(hull.maxHealth / 160) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-white/70 mb-1">
            <span className="flex items-center gap-1"><Gauge size={10} aria-hidden /> СКОРОСТЬ</span>
            <span className="font-display text-cyan-300">{hull.speed}</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="g-stat-bar bg-cyan-400 h-full rounded-full" style={{ width: `${(hull.speed / 20) * 100}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
}
