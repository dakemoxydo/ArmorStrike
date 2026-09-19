import { useEffect, useState } from 'react';
import {
  Coins,
  Gauge,
  PackageOpen,
  Shield,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { HULLS, TURRETS } from '../core/catalog';
import type { HullDef, HullId, TurretDef, TurretId } from '../core/catalog';
import { getWeaponMeta } from '../core/WeaponCatalog';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ECONOMY_PRICES } from '../game/economy/matchRewards';

interface CrateOpeningModalProps {
  type: 'hull' | 'turret';
  options: readonly (HullId | TurretId)[];
  credits: number;
  onPick: (id: HullId | TurretId) => void;
  onClose: () => void;
}

const MAX_HULL_HP = Math.max(...Object.values(HULLS).map((h) => h.maxHealth));
const MAX_HULL_SPEED = Math.max(...Object.values(HULLS).map((h) => h.speed));

export default function CrateOpeningModal({
  type,
  options,
  credits,
  onPick,
  onClose,
}: CrateOpeningModalProps) {
  const [selectedId, setSelectedId] = useState<HullId | TurretId | null>(null);
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cost = ECONOMY_PRICES.crate;
  const canAfford = credits >= cost;

  const handleConfirm = () => {
    if (!selectedId || !canAfford) return;
    onPick(selectedId);
  };

  const isHull = type === 'hull';
  const title = isHull ? 'КЕЙС КОРПУСА' : 'КЕЙС БАШНИ';
  const subtitle = isHull
    ? 'Выберите один корпус из выпавших вариантов для добавления в Гараж'
    : 'Выберите одну башню из выпавших вариантов для добавления в Гараж';

  return (
    <div
      ref={trapRef}
      className="scrim-over fixed inset-0 z-50 flex items-center justify-center p-4 select-none overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crate-modal-title"
    >
      <div className="hud-panel max-w-4xl w-full p-6 md:p-8 flex flex-col gap-6 relative border border-amber-500/30 shadow-2xl bg-[#07111a]/95">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 cut-chip">
              <PackageOpen size={24} aria-hidden />
            </div>
            <div>
              <h2 id="crate-modal-title" className="text-xl md:text-2xl font-display tracking-wider text-white">
                {title}
              </h2>
              <p className="text-xs text-white/60 tracking-wider">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hud-panel flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20">
              <Coins size={16} className="text-amber-400" aria-hidden />
              <span className="font-display text-base text-amber-300">{credits}</span>
              <span className="text-[10px] tracking-wider text-amber-400/80">CR</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-game btn-ghost p-2 text-white/70 hover:text-white"
              aria-label="Закрыть кейс"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {options.map((optId) => {
            const isSelected = selectedId === optId;
            if (isHull) {
              const h = HULLS[optId as HullId];
              return (
                <HullOptionCard
                  key={h.id}
                  hull={h}
                  isSelected={isSelected}
                  onSelect={() => setSelectedId(h.id)}
                />
              );
            }
            const t = TURRETS[optId as TurretId];
            return (
              <TurretOptionCard
                key={t.id}
                turret={t}
                isSelected={isSelected}
                onSelect={() => setSelectedId(t.id)}
              />
            );
          })}
        </div>

        {/* Action bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span>СТОИМОСТЬ ОТКРЫТИЯ:</span>
            <span className="font-display text-amber-300 flex items-center gap-1">
              <Coins size={14} aria-hidden /> {cost} CR
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="btn-game btn-ghost px-5 py-2.5 text-xs flex-1 sm:flex-initial"
            >
              <span>ОТМЕНА</span>
            </button>
            <div>
              <button
                type="button"
                disabled={!selectedId || !canAfford}
                onClick={handleConfirm}
                className="btn-game btn-primary px-8 py-2.5 text-sm flex-1 sm:flex-initial disabled:opacity-50"
              >
                <span>ПОДТВЕРДИТЬ ВЫБОР</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HullOptionCard({
  hull,
  isSelected,
  onSelect,
}: {
  hull: HullDef;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const hpPct = Math.round((hull.maxHealth / MAX_HULL_HP) * 100);
  const speedPct = Math.round((hull.speed / MAX_HULL_SPEED) * 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`hud-panel flex flex-col justify-between p-5 text-left transition-all border ${
        isSelected
          ? 'border-amber-400 bg-amber-950/40 shadow-lg shadow-amber-500/20 scale-[1.02]'
          : 'border-white/10 hover:border-amber-500/40 bg-white/5'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-widest text-amber-300 font-mono">
            КЛАСС ШАССИ
          </span>
          {isSelected && (
            <span className="cut-chip bg-amber-400 text-slate-950 px-1.5 py-0.5 text-[9px] font-bold tracking-widest">
              ВЫБРАНО
            </span>
          )}
        </div>
        <h3 className="font-display text-lg text-white mb-1">{hull.name}</h3>
        <p className="text-xs text-white/60 mb-4 leading-relaxed line-clamp-2">
          {hull.desc}
        </p>
      </div>

      <div className="space-y-3 pt-3 border-t border-white/10">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60 flex items-center gap-1.5">
              <Shield size={13} className="text-emerald-400" aria-hidden /> Прочность
            </span>
            <span className="font-display text-emerald-400">{hull.maxHealth}</span>
          </div>
          <div className="h-1.5 bg-black/40 cut-chip overflow-hidden border border-white/10">
            <div className="h-full bg-emerald-400" style={{ width: `${hpPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60 flex items-center gap-1.5">
              <Gauge size={13} className="text-amber-400" aria-hidden /> Скорость
            </span>
            <span className="font-display text-amber-300">{hull.speed} м/с</span>
          </div>
          <div className="h-1.5 bg-black/40 cut-chip overflow-hidden border border-white/10">
            <div className="h-full bg-amber-400" style={{ width: `${speedPct}%` }} />
          </div>
        </div>
      </div>
    </button>
  );
}

function TurretOptionCard({
  turret,
  isSelected,
  onSelect,
}: {
  turret: TurretDef;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meta = getWeaponMeta(turret.weaponType);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`hud-panel flex flex-col justify-between p-5 text-left transition-all border ${
        isSelected
          ? 'border-amber-400 bg-amber-950/40 shadow-lg shadow-amber-500/20 scale-[1.02]'
          : 'border-white/10 hover:border-amber-500/40 bg-white/5'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-widest text-amber-300 font-mono">
            {meta.kind.toUpperCase()}
          </span>
          {isSelected && (
            <span className="cut-chip bg-amber-400 text-slate-950 px-1.5 py-0.5 text-[9px] font-bold tracking-widest">
              ВЫБРАНО
            </span>
          )}
        </div>
        <h3 className="font-display text-lg text-white mb-1">{turret.name}</h3>
        <p className="text-xs text-white/60 mb-4 leading-relaxed line-clamp-2">
          {turret.desc}
        </p>
      </div>

      <div className="space-y-2 pt-3 border-t border-white/10">
        <div className="flex justify-between text-xs">
          <span className="text-white/60 flex items-center gap-1.5">
            <Target size={13} className="text-amber-400" aria-hidden /> Урон
          </span>
          <span className="font-display text-amber-300">{turret.damage}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/60 flex items-center gap-1.5">
            <Zap size={13} className="text-amber-400" aria-hidden /> Магазин
          </span>
          <span className="font-display text-amber-300">{turret.magazine}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/60 flex items-center gap-1.5">
            <Sparkles size={13} className="text-emerald-400" aria-hidden /> Перезарядка
          </span>
          <span className="font-display text-emerald-300">{turret.fullReload}с</span>
        </div>
      </div>
    </button>
  );
}
