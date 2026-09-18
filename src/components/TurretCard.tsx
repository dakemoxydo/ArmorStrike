import { Check, Lock, Target, Zap } from 'lucide-react';
import type { TurretId, TurretDef } from '../core/catalog';
import { getWeaponMeta } from '../core/WeaponCatalog';

interface TurretCardProps {
  turret: TurretDef;
  isSelected: boolean;
  isLocked?: boolean;
  delay: string;
  onSelect: (id: TurretId) => void;
  disabled?: boolean;
}

export default function TurretCard({ turret, isSelected, isLocked, delay, onSelect, disabled }: TurretCardProps) {
  const weaponLabel = getWeaponMeta(turret.weaponType).kind;
  return (
    <button
      type="button"
      onClick={() => onSelect(turret.id)}
      disabled={disabled || isLocked}
      aria-pressed={isSelected}
      aria-disabled={isLocked}
      title={isLocked ? `${turret.name} (Заблокировано)` : turret.desc}
      className={`hud-panel garage-card anim-up p-3${isSelected ? ' is-selected turret-selected' : ''}${isLocked ? ' is-locked opacity-50 cursor-not-allowed' : ''}`}
      style={{ '--d': delay } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-lg tracking-wide text-white">{turret.name}</span>
        {isSelected && <Check size={18} className="g-check text-amber-300" aria-hidden />}
        {isLocked && <Lock size={16} className="text-white/50" aria-hidden />}
      </div>
      {isLocked ? (
        <div className="card-badge cut-chip px-2 py-0.5 mb-2 text-[10px] tracking-wider uppercase bg-white/5 text-white/50 border border-white/10 flex items-center gap-1">
          <Lock size={10} aria-hidden /> ЗАКРЫТО
        </div>
      ) : (
        <div className="card-badge cut-chip px-2 py-0.5 mb-2 text-[10px] tracking-wider uppercase bg-amber-500/20 text-amber-200 border border-amber-500/40">
          {turret.badge}
        </div>
      )}
      {/* Компактная карточка: без описания — паспорт справа несёт факты,
          флейвор доступен в тултипе; 1fr-ряд выше держит бары на одной линии. */}
      <div className="space-y-2 text-[10px]">
        <div>
          <div className="flex justify-between text-white/70 mb-1">
            <span className="flex items-center gap-1"><Zap size={10} aria-hidden /> УРОН</span>
            <span className="font-display text-amber-300">{turret.damage}</span>
          </div>
          <div className="g-bar">
            <i className="g-stat-bar bg-amber-400" style={{ width: `${(turret.damage / 50) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-white/70 mb-1">
            <span className="flex items-center gap-1"><Target size={10} aria-hidden /> ДАЛЬНОСТЬ</span>
            <span className="font-display text-amber-300">
              {Number.isFinite(turret.range) ? `${turret.range} м` : '∞'}
            </span>
          </div>
          <div className="g-bar">
            <i
              className="g-stat-bar bg-amber-400"
              style={{ width: `${Number.isFinite(turret.range) ? Math.min(100, (turret.range / 85) * 100) : 100}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-white/60 pt-1 border-t border-white/10">
          <span className="text-[10px] tracking-wider">{weaponLabel}</span>
          <span className="text-[10px] tracking-wider">МАГАЗИН: {turret.magazine}</span>
        </div>
      </div>
    </button>
  );
}
