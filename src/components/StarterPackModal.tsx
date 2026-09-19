import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Gauge,
  PackageOpen,
  Shield,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { HULLS, HULL_IDS, TURRETS, TURRET_IDS } from '../core/catalog';
import type { HullId, TurretId } from '../core/catalog';
import { getWeaponMeta } from '../core/WeaponCatalog';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface StarterPackModalProps {
  onComplete: (hullId: HullId, turretId: TurretId) => void;
  initialHulls?: HullId[];
  initialTurrets?: TurretId[];
}

function pickThreeDistinct<T>(pool: readonly T[]): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, 3);
}

const MAX_HULL_HP = Math.max(...Object.values(HULLS).map((h) => h.maxHealth));
const MAX_HULL_SPEED = Math.max(...Object.values(HULLS).map((h) => h.speed));

export default function StarterPackModal({
  onComplete,
  initialHulls,
  initialTurrets,
}: StarterPackModalProps) {
  const [step, setStep] = useState<'hull' | 'turret' | 'assembled'>('hull');
  const [hullOptions] = useState<HullId[]>(() => initialHulls ?? pickThreeDistinct(HULL_IDS));
  const [turretOptions] = useState<TurretId[]>(() => initialTurrets ?? pickThreeDistinct(TURRET_IDS));

  const [selectedHull, setSelectedHull] = useState<HullId | null>(null);
  const [selectedTurret, setSelectedTurret] = useState<TurretId | null>(null);

  const containerRef = useFocusTrap(true);

  const handleSelectHull = (id: HullId) => {
    setSelectedHull(id);
    setStep('turret');
  };

  const handleSelectTurret = (id: TurretId) => {
    setSelectedTurret(id);
    setStep('assembled');
  };

  const handleConfirm = () => {
    if (selectedHull && selectedTurret) {
      onComplete(selectedHull, selectedTurret);
    }
  };

  const assembledHull = selectedHull ? HULLS[selectedHull] : null;
  const assembledTurret = selectedTurret ? TURRETS[selectedTurret] : null;

  return (
    <div
      ref={containerRef}
      className="scrim-over fixed inset-0 z-50 flex items-center justify-center p-4 select-none overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="starter-pack-title"
    >
      <div className="hud-panel max-w-4xl w-full p-6 md:p-8 flex flex-col gap-6 relative border border-amber-500/30 shadow-2xl bg-[#07111a]/95">
        {/* Шапка модального окна */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 cut-chip">
              <PackageOpen size={24} aria-hidden />
            </div>
            <div>
              <h2 id="starter-pack-title" className="text-xl md:text-2xl font-display tracking-wider text-white">
                СТАРТОВЫЙ КОМПЛЕКТ НОВОБРАНЦА
              </h2>
              <p className="text-xs text-white/60 tracking-wider">
                {step === 'hull' && 'ШАГ 1 ИЗ 3 · КОНТЕЙНЕР ШАССИ — ВЫБЕРИТЕ КОРПУС'}
                {step === 'turret' && 'ШАГ 2 ИЗ 3 · КОНТЕЙНЕР ВООРУЖЕНИЯ — ВЫБЕРИТЕ БАШНЮ'}
                {step === 'assembled' && 'ШАГ 3 ИЗ 3 · БОЕВАЯ МАШИНА СОБРАНА И ГОТОВА'}
              </p>
            </div>
          </div>

          {/* Индикатор шагов */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 cut-chip border ${
                step === 'hull'
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                  : 'bg-white/5 border-white/15 text-white/50'
              }`}
            >
              1. КОРПУС
            </span>
            <span className="text-white/50">→</span>
            <span
              className={`px-2.5 py-1 cut-chip border ${
                step === 'turret'
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                  : 'bg-white/5 border-white/15 text-white/50'
              }`}
            >
              2. БАШНЯ
            </span>
            <span className="text-white/50">→</span>
            <span
              className={`px-2.5 py-1 cut-chip border ${
                step === 'assembled'
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                  : 'bg-white/5 border-white/15 text-white/50'
              }`}
            >
              3. СБОРКА
            </span>
          </div>
        </div>

        {/* Шаг 1: Выбор корпуса */}
        {step === 'hull' && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-white/80 leading-relaxed">
              Арсенал заблокирован. Из стартового контейнера шасси выпало 3 варианта корпуса.
              Выберите базовую платформу боевой машины:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hullOptions.map((id, index) => {
                const h = HULLS[id];
                return (
                  <div
                    key={h.id}
                    className="hud-panel p-4 flex flex-col justify-between gap-4 border border-amber-500/20 bg-amber-950/20 hover:border-amber-400/60 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg tracking-wide text-white">{h.name}</span>
                        <span className="card-badge cut-chip px-2 py-0.5 text-[10px] tracking-wider uppercase bg-amber-500/20 text-amber-200 border border-amber-500/40">
                          {h.badge}
                        </span>
                      </div>
                      <p className="text-xs text-white/65 min-h-[3rem] leading-relaxed">{h.desc}</p>

                      <div className="space-y-2 text-xs pt-2 border-t border-white/10">
                        <div>
                          <div className="flex justify-between text-white/70 mb-1">
                            <span className="flex items-center gap-1">
                              <Shield size={12} aria-hidden /> БРОНЯ
                            </span>
                            <span className="font-display text-emerald-300">{h.maxHealth}</span>
                          </div>
                          <div className="g-bar">
                            <i
                              className="g-stat-bar bg-emerald-400"
                              style={{ width: `${(h.maxHealth / MAX_HULL_HP) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-white/70 mb-1">
                            <span className="flex items-center gap-1">
                              <Gauge size={12} aria-hidden /> СКОРОСТЬ
                            </span>
                            <span className="font-display text-amber-300">{h.speed}</span>
                          </div>
                          <div className="g-bar">
                            <i
                              className="g-stat-bar bg-amber-400"
                              style={{ width: `${(h.speed / MAX_HULL_SPEED) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-autofocus={index === 0 ? '' : undefined}
                      onClick={() => handleSelectHull(h.id)}
                      className="btn-game btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 mt-2"
                    >
                      <span>ВЫБРАТЬ {h.name.toUpperCase()}</span>
                      <ArrowRight size={14} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Шаг 2: Выбор башни */}
        {step === 'turret' && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-white/80 leading-relaxed">
              Корпус <span className="text-amber-300 font-display">{assembledHull?.name}</span> утверждён!
              Теперь откройте контейнер вооружения и выберите одно из 3 орудий:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {turretOptions.map((id, index) => {
                const t = TURRETS[id];
                const meta = getWeaponMeta(t.weaponType);
                return (
                  <div
                    key={t.id}
                    className="hud-panel p-4 flex flex-col justify-between gap-4 border border-amber-500/20 bg-amber-950/20 hover:border-amber-400/60 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg tracking-wide text-white">{t.name}</span>
                        <span className="card-badge cut-chip px-2 py-0.5 text-[10px] tracking-wider uppercase bg-amber-500/20 text-amber-200 border border-amber-500/40">
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-xs text-white/65 min-h-[3rem] leading-relaxed">{t.desc}</p>

                      <div className="space-y-2 text-xs pt-2 border-t border-white/10">
                        <div>
                          <div className="flex justify-between text-white/70 mb-1">
                            <span className="flex items-center gap-1">
                              <Zap size={12} aria-hidden /> УРОН
                            </span>
                            <span className="font-display text-amber-300">{t.damage}</span>
                          </div>
                          <div className="g-bar">
                            <i
                              className="g-stat-bar bg-amber-400"
                              style={{ width: `${(t.damage / 50) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-white/70 mb-1">
                            <span className="flex items-center gap-1">
                              <Target size={12} aria-hidden /> ДАЛЬНОСТЬ
                            </span>
                            <span className="font-display text-amber-300">
                              {Number.isFinite(t.range) ? `${t.range} м` : '∞'}
                            </span>
                          </div>
                          <div className="g-bar">
                            <i
                              className="g-stat-bar bg-amber-400"
                              style={{ width: `${Number.isFinite(t.range) ? Math.min(100, (t.range / 85) * 100) : 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between text-[11px] text-white/60 pt-1">
                          <span>{meta.kind}</span>
                          <span>МАГАЗИН: {t.magazine}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-autofocus={index === 0 ? '' : undefined}
                      onClick={() => handleSelectTurret(t.id)}
                      className="btn-game btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 mt-2 border-amber-400/50 hover:border-amber-400"
                    >
                      <span>ВЫБРАТЬ {t.name.toUpperCase()}</span>
                      <ArrowRight size={14} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Шаг 3: Боевая машина готова */}
        {step === 'assembled' && assembledHull && assembledTurret && (
          <div className="flex flex-col items-center text-center gap-6 py-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cut-chip">
              <CheckCircle size={36} aria-hidden />
            </div>

            <div className="space-y-1">
              <div className="hud-label text-emerald-400 text-xs flex items-center justify-center gap-1">
                <Sparkles size={14} aria-hidden /> ПЕРВАЯ БОЕВАЯ МАШИНА СОБРАНА
              </div>
              <h3 className="font-display text-2xl md:text-3xl tracking-wider text-white">
                <span className="text-amber-300">{assembledHull.name}</span>
                <span className="text-white/50"> · </span>
                <span className="text-amber-300">{assembledTurret.name}</span>
              </h3>
              <p className="text-xs text-white/60 tracking-wider">
                РОЛЬ: [{assembledHull.badge}] + [{assembledTurret.badge}]
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl w-full text-center">
              <div className="cut-chip bg-white/5 p-2.5 border border-white/10">
                <div className="text-[10px] tracking-widest text-white/50 mb-1">ПРОЧНОСТЬ</div>
                <div className="font-display text-lg text-emerald-300">{assembledHull.maxHealth}</div>
              </div>
              <div className="cut-chip bg-white/5 p-2.5 border border-white/10">
                <div className="text-[10px] tracking-widest text-white/50 mb-1">СКОРОСТЬ</div>
                <div className="font-display text-lg text-amber-300">{assembledHull.speed} м/с</div>
              </div>
              <div className="cut-chip bg-white/5 p-2.5 border border-white/10">
                <div className="text-[10px] tracking-widest text-white/50 mb-1">УРОН ОРУДИЯ</div>
                <div className="font-display text-lg text-amber-300">{assembledTurret.damage}</div>
              </div>
              <div className="cut-chip bg-white/5 p-2.5 border border-white/10">
                <div className="text-[10px] tracking-widest text-white/50 mb-1">ДАЛЬНОСТЬ</div>
                <div className="font-display text-lg text-amber-300">
                  {Number.isFinite(assembledTurret.range) ? `${assembledTurret.range} м` : '∞'}
                </div>
              </div>
            </div>

            <p className="text-xs text-white/60 max-w-md">
              Остальные корпуса и башни заблокированы в ангаре. Детали собраны и смонтированы на вашу платформу.
            </p>

            <button
              type="button"
              data-autofocus
              onClick={handleConfirm}
              className="btn-game btn-primary px-8 py-3.5 text-sm tracking-wider font-display"
            >
              ПРИНЯТЬ ТАНК И В АНГАР
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
