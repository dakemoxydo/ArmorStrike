import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Coins,
  Gauge,
  Lock,
  Shield,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import type { HullDef, TurretDef } from '../core/catalog';
import { getWeaponMeta } from '../core/WeaponCatalog';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ECONOMY_PRICES } from '../game/economy/matchRewards';

interface DirectUnlockModalProps {
  items: readonly (HullDef | TurretDef)[];
  isHull: boolean;
  playerCredits: number;
  onConfirm: (item: HullDef | TurretDef) => void;
  onClose: () => void;
}

export default function DirectUnlockModal({
  items,
  isHull,
  playerCredits,
  onConfirm,
  onClose,
}: DirectUnlockModalProps) {
  const trapRef = useFocusTrap(true);
  const cost = ECONOMY_PRICES.directUnlock;
  const canAfford = playerCredits >= cost;

  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const currentItem = items[selectedIdx] ?? items[0];
  if (!currentItem) return null;

  const hull = isHull ? (currentItem as HullDef) : null;
  const turret = !isHull ? (currentItem as TurretDef) : null;
  const weaponMeta = turret ? getWeaponMeta(turret.weaponType) : null;

  return (
    <div
      ref={trapRef}
      className="scrim-over fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-modal-title"
    >
      <div className="hud-panel max-w-lg w-full p-6 flex flex-col gap-5 relative border border-amber-500/30 shadow-2xl bg-[#07111a]/95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 cut-chip">
              <Lock size={20} aria-hidden />
            </div>
            <div>
              <h2 id="unlock-modal-title" className="text-lg font-display tracking-wider text-white">
                ПРЯМАЯ РАЗБЛОКИРОВКА
              </h2>
              <p className="text-xs text-white/60 tracking-wider">
                {isHull ? 'ВЫБЕРИТЕ КОРПУС ДЛЯ РАЗБЛОКИРОВКИ' : 'ВЫБЕРИТЕ БАШНЮ ДЛЯ РАЗБЛОКИРОВКИ'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-game btn-ghost p-1.5 text-white/70 hover:text-white"
            aria-label="Закрыть"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Item Selector if multiple */}
        {items.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {items.map((it, idx) => {
              const isSel = idx === selectedIdx;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`cut-chip px-3 py-1.5 text-xs font-display transition-colors border ${
                    isSel
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-white/5 text-white/70 border-white/10 hover:border-white/25'
                  }`}
                >
                  {it.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Item details */}
        <div className="hud-panel p-4 bg-white/5 border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-amber-200">{currentItem.name}</h3>
            <span className="cut-chip bg-white/10 px-2 py-0.5 text-[10px] tracking-wider text-white/80 font-mono">
              {isHull ? 'ШАССИ' : weaponMeta?.kind.toUpperCase()}
            </span>
          </div>

          <p className="text-xs text-white/60 leading-relaxed">
            {currentItem.desc}
          </p>

          {/* Stats */}
          {hull && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center">
              <div className="cut-chip bg-black/30 p-2 border border-white/10">
                <div className="text-[10px] text-white/60 flex items-center justify-center gap-1">
                  <Shield size={12} className="text-emerald-400" /> ПРОЧНОСТЬ
                </div>
                <div className="font-display text-base text-emerald-400 mt-0.5">{hull.maxHealth} HP</div>
              </div>
              <div className="cut-chip bg-black/30 p-2 border border-white/10">
                <div className="text-[10px] text-white/60 flex items-center justify-center gap-1">
                  <Gauge size={12} className="text-amber-400" /> СКОРОСТЬ
                </div>
                <div className="font-display text-base text-amber-300 mt-0.5">{hull.speed} м/с</div>
              </div>
            </div>
          )}

          {turret && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
              <div className="cut-chip bg-black/30 p-2 border border-white/10">
                <div className="text-[10px] text-white/60 flex items-center justify-center gap-1">
                  <Target size={12} className="text-amber-400" /> УРОН
                </div>
                <div className="font-display text-base text-amber-300 mt-0.5">{turret.damage}</div>
              </div>
              <div className="cut-chip bg-black/30 p-2 border border-white/10">
                <div className="text-[10px] text-white/60 flex items-center justify-center gap-1">
                  <Zap size={12} className="text-amber-400" /> МАГАЗИН
                </div>
                <div className="font-display text-base text-amber-300 mt-0.5">{turret.magazine}</div>
              </div>
              <div className="cut-chip bg-black/30 p-2 border border-white/10">
                <div className="text-[10px] text-white/60 flex items-center justify-center gap-1">
                  <Sparkles size={12} className="text-emerald-400" /> ПЕРЕЗАРЯДКА
                </div>
                <div className="font-display text-base text-emerald-300 mt-0.5">{turret.fullReload}с</div>
              </div>
            </div>
          )}
        </div>

        {/* Cost & Balance */}
        <div className="flex items-center justify-between px-2 text-xs">
          <div className="flex items-center gap-1.5 text-white/70">
            <span>Ваш баланс:</span>
            <span className="font-display text-amber-300 flex items-center gap-1">
              <Coins size={13} /> {playerCredits} CR
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-white/70">Стоимость:</span>
            <span className="font-display text-amber-300 flex items-center gap-1">
              <Coins size={13} /> {cost} CR
            </span>
          </div>
        </div>

        {!canAfford && (
          <div className="cut-chip flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>Недостаточно кредитов. Выполняйте боевые задачи и побеждайте в боях.</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="btn-game btn-ghost px-5 py-2.5 text-xs"
          >
            <span>ОТМЕНА</span>
          </button>
          <div>
            <button
              type="button"
              disabled={!canAfford}
              onClick={() => onConfirm(currentItem)}
              className="btn-game btn-primary px-6 py-2.5 text-xs disabled:opacity-50"
            >
              <span>РАЗБЛОКИРОВАТЬ ЗА {cost} CR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
