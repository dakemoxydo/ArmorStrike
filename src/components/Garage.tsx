// ===== ГАРАЖ: сборка танка из корпуса и башни с 3D предпросмотром =====
import { useEffect, useState } from 'react';
import {
  ArrowLeft, HardDrive, MoveUp,
  Play, Shield, Target,
} from 'lucide-react';
import { HULLS, TURRETS } from '../core/catalog';
import type { HullId, TurretId } from '../core/catalog';
import type { GameApi } from '../game/GameApi';
import HullCard from './HullCard';
import TurretCard from './TurretCard';

interface GarageProps {
  game: GameApi | null;
  onStart: () => void;
  onBack: () => void;
}

export default function Garage({ game, onStart, onBack }: GarageProps) {
  const [activeTab, setActiveTab] = useState<'hulls' | 'turrets'>('hulls');
  /** Local selection mirrors GameApi so UI re-renders without remounting the grid. */
  const [selectedHullId, setSelectedHullId] = useState<HullId>(() => game?.currentHull ?? 'hunter');
  const [selectedTurretId, setSelectedTurretId] = useState<TurretId>(() => game?.currentTurret ?? 'railgun');
  const ready = Boolean(game);

  useEffect(() => {
    if (!game) return;
    setSelectedHullId(game.currentHull);
    setSelectedTurretId(game.currentTurret);
  }, [game]);

  const selectHull = (id: HullId) => {
    if (!game) return;
    game.setGarageSelection(id, selectedTurretId);
    setSelectedHullId(id);
  };

  const selectTurret = (id: TurretId) => {
    if (!game) return;
    game.setGarageSelection(selectedHullId, id);
    setSelectedTurretId(id);
  };

  const currHull = HULLS[selectedHullId];
  const currTurret = TURRETS[selectedTurretId];

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-4 md:p-8 pointer-events-none select-none">
      {/* Шапка гаража */}
      <div className="garage-header">
        <div className="garage-header-actions anim-left" style={{ '--d': '0.05s' } as React.CSSProperties}>
          <button
            type="button"
            onClick={onBack}
            className="btn-game btn-ghost px-5 py-2.5 text-xs"
          >
            <ArrowLeft size={16} className="bicon" aria-hidden />
            <span>В МЕНЮ</span>
          </button>
        </div>

        <div
          className="anim-up hud-panel garage-tabs"
          style={{ '--d': '0.12s' } as React.CSSProperties}
          role="tablist"
          aria-label="Разделы гаража"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'hulls'}
            id="garage-tab-hulls"
            onClick={() => setActiveTab('hulls')}
            className={`garage-tab tab-hull${activeTab === 'hulls' ? ' is-active' : ''}`}
          >
            <Shield size={14} aria-hidden /> КОРПУС
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'turrets'}
            id="garage-tab-turrets"
            onClick={() => setActiveTab('turrets')}
            className={`garage-tab tab-turret${activeTab === 'turrets' ? ' is-active' : ''}`}
          >
            <Target size={14} aria-hidden /> БАШНЯ
          </button>
        </div>

        <div className="garage-header-actions anim-left" style={{ '--d': '0.05s' } as React.CSSProperties}>
          <button
            type="button"
            onClick={onStart}
            disabled={!ready}
            aria-disabled={!ready}
            className={`btn-game btn-primary px-8 py-3 text-sm${!ready ? ' garage-disabled' : ''}`}
          >
            <Play size={17} className="bicon" aria-hidden />
            <span>В БОЙ</span>
          </button>
        </div>
      </div>

      {!ready && (
        <div className="garage-loading pointer-events-none" role="status">
          ЗАГРУЗКА ГАРАЖА…
        </div>
      )}

      {/* Нижняя зона: карточки + паспорт */}
      <div className="garage-bottom pointer-events-auto">
        <div className="garage-cards-col flex flex-col gap-3">
          <div className="anim-up hud-label text-cyan-300/80 mb-1 flex items-center gap-2" style={{ '--d': '0.1s' } as React.CSSProperties}>
            <MoveUp size={12} aria-hidden />
            {activeTab === 'hulls' ? 'ВЫБЕРИТЕ КОРПУС — ОПРЕДЕЛЯЕТ ЗДОРОВЬЕ И СКОРОСТЬ' : 'ВЫБЕРИТЕ БАШНЮ — ОПРЕДЕЛЯЕТ ТИП ОРУЖИЯ И УРОН'}
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            role="tabpanel"
            aria-labelledby={activeTab === 'hulls' ? 'garage-tab-hulls' : 'garage-tab-turrets'}
          >
            {activeTab === 'hulls'
              ? Object.values(HULLS).map((h, i) => (
                  <HullCard
                    key={h.id}
                    hull={h}
                    isSelected={h.id === selectedHullId}
                    delay={`${0.15 + i * 0.09}s`}
                    onSelect={selectHull}
                    disabled={!ready}
                  />
                ))
              : Object.values(TURRETS).map((t, i) => (
                  <TurretCard
                    key={t.id}
                    turret={t}
                    isSelected={t.id === selectedTurretId}
                    delay={`${0.15 + i * 0.09}s`}
                    onSelect={selectTurret}
                    disabled={!ready}
                  />
                ))}
          </div>

          <div className="anim-up flex pointer-events-none" style={{ '--d': '0.25s' } as React.CSSProperties}>
            <span className="text-[11px] tracking-wider text-white/55 border border-white/10 rounded px-2 py-1 bg-white/5">
              ЗАЖМИТЕ ЛКМ — ВРАЩЕНИЕ · КОЛЕСО — ПРИБЛИЖЕНИЕ
            </span>
          </div>
        </div>

        <div className="garage-passport">
          <div className="anim-up hud-panel p-5" style={{ '--d': '0.3s' } as React.CSSProperties}>
            <div className="hud-label text-cyan-300/90 mb-3 flex items-center gap-1.5">
              <HardDrive size={14} aria-hidden /> СБОРОЧНЫЙ ПАСПОРТ
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-xs text-white/60">КОРПУС</span>
                <span className="font-display text-sm text-cyan-300">{currHull.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-xs text-white/60">БАШНЯ</span>
                <span className="font-display text-sm text-amber-300">{currTurret.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <div className="text-[10px] tracking-widest text-white/55 mb-0.5">ПРОЧНОСТЬ</div>
                  <div className="font-display text-lg text-emerald-400">{currHull.maxHealth}</div>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <div className="text-[10px] tracking-widest text-white/55 mb-0.5">СКОРОСТЬ</div>
                  <div className="font-display text-lg text-cyan-300">{currHull.speed}</div>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <div className="text-[10px] tracking-widest text-white/55 mb-0.5">УРОН / ВЫСТРЕЛ</div>
                  <div className="font-display text-lg text-amber-300">{currTurret.damage}</div>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <div className="text-[10px] tracking-widest text-white/55 mb-0.5">МАГАЗИН</div>
                  <div className="font-display text-lg text-white">{currTurret.magazine}</div>
                </div>
              </div>
              <div key={currTurret.weaponType} className="anim-pop" style={{ '--d': '0s' } as React.CSSProperties}>
                {currTurret.weaponType === 'cannon' && (
                  <div className="text-[10px] text-amber-200/70 bg-amber-500/10 border border-amber-500/20 rounded p-2 text-center tracking-wider">
                    ФУГАСНЫЙ УРОН · РАДИУС ВЗРЫВА 5 М
                  </div>
                )}
                {currTurret.weaponType === 'flamethrower' && (
                  <div className="text-[10px] text-orange-200/70 bg-orange-500/10 border border-orange-500/20 rounded p-2 text-center tracking-wider">
                    НЕПРЕРЫВНЫЙ КОНУС ПЛАМЕНИ
                  </div>
                )}
                {currTurret.weaponType === 'railgun' && (
                  <div className="text-[10px] text-cyan-200/70 bg-cyan-500/10 border border-cyan-500/20 rounded p-2 text-center tracking-wider">
                    ТОЧНЫЙ ЭНЕРГЕТИЧЕСКИЙ ЛУЧ · {currTurret.damage} ЕД.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
