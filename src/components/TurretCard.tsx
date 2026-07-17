import { Check, Target, Zap } from 'lucide-react';
import type { TurretId, TurretDef } from '../core/catalog';
import { getWeaponMeta } from '../core/WeaponCatalog';

interface TurretCardProps {
  turret: TurretDef;
  isSelected: boolean;
  delay: string;
  onSelect: (id: TurretId) => void;
  disabled?: boolean;
}

export default function TurretCard({ turret, isSelected, delay, onSelect, disabled }: TurretCardProps) {
  const weaponLabel = getWeaponMeta(turret.weaponType).kind;
  return (
    <button
      type="button"
      onClick={() => onSelect(turret.id)}
      disabled={disabled}
      aria-pressed={isSelected}
      className={`hud-panel garage-card anim-up p-4${isSelected ? ' is-selected turret-selected' : ''}${disabled ? ' garage-disabled' : ''}`}
      style={{ '--d': delay } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-lg tracking-wide text-white">{turret.name}</span>
        {isSelected && <Check size={18} className="g-check text-amber-300" aria-hidden />}
      </div>
      <div className="inline-block px-2 py-0.5 mb-3 text-[9px] tracking-widest uppercase bg-amber-500/20 text-amber-200 border border-amber-500/40 rounded-sm">
        {turret.badge}
      </div>
      <p className="text-[11px] text-white/60 leading-relaxed mb-4 min-h-[34px]">{turret.desc}</p>
      <div className="space-y-2 text-[10px]">
        <div>
          <div className="flex justify-between text-white/70 mb-1">
            <span className="flex items-center gap-1"><Zap size={10} aria-hidden /> УРОН</span>
            <span className="font-display text-amber-300">{turret.damage}</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="g-stat-bar bg-amber-400 h-full rounded-full" style={{ width: `${(turret.damage / 50) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-white/70 mb-1">
            <span className="flex items-center gap-1"><Target size={10} aria-hidden /> ДАЛЬНОСТЬ</span>
            <span className="font-display text-cyan-300">{turret.range} м</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="g-stat-bar bg-cyan-400 h-full rounded-full" style={{ width: `${(turret.range / 85) * 100}%` }} />
          </div>
        </div>
        <div className="flex justify-between text-white/60 pt-1 border-t border-white/10">
          <span className="text-[9px] tracking-wider">{weaponLabel}</span>
          <span className="text-[9px] tracking-wider">МАГАЗИН: {turret.magazine}</span>
        </div>
      </div>
    </button>
  );
}
