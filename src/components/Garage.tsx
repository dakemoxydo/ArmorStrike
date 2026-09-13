// ===== ГАРАЖ: сборка танка из корпуса и башни с 3D предпросмотром =====
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, HardDrive, MoveUp,
  Play, Shield, Target,
} from 'lucide-react';
import { HULLS, TURRETS } from '../core/catalog';
import type { HullId, TurretId } from '../core/catalog';
import type { GameApi } from '../game/GameApi';
import type { GameEvent } from '../game/types';
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
  /** Peek-осмотр: док скрыт, пока игрок вращает танк (drag). */
  const [peeking, setPeeking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const ready = Boolean(game);

  useEffect(() => {
    if (!game) return;
    setSelectedHullId(game.currentHull);
    setSelectedTurretId(game.currentTurret);
  }, [game]);

  // Peek: GarageInput включает осмотр на drag и выключает на pointerup.
  useEffect(() => {
    if (!game) return;
    const onEvent = (e: GameEvent) => {
      if (e.type === 'garagePeek') setPeeking(e.value);
    };
    game.addListener(onEvent);
    return () => game.removeListener(onEvent);
  }, [game]);

  /**
   * Safe-zone: измеряем фактический след UI (шапка, док, паспорт) и сообщаем
   * его камере — предпросмотр танка центрируется в свободном прямоугольнике.
   * ResizeObserver переживает смену раскладок (5↔3 карточек, паспорт-док lg+).
   */
  useEffect(() => {
    if (!ready || !game) return;
    const root = rootRef.current;
    if (!root) return;
    const header = root.querySelector<HTMLElement>('.garage-header');
    const dock = root.querySelector<HTMLElement>('.garage-bottom');
    const passport = root.querySelector<HTMLElement>('.garage-passport');
    if (!dock) return;

    let last = '';
    const measure = () => {
      // Peek сдвигает док трансформом, а getBoundingClientRect его учитывает —
      // замер во время осмотра даст неверный след; камера уже гасит покрытие.
      if (root.classList.contains('garage-peek')) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const hr = header?.getBoundingClientRect();
      const br = dock.getBoundingClientRect();
      const pr = passport?.getBoundingClientRect();
      // Паспорт занимает правую зону только когда он в ряд с доком (lg+);
      // в стеке он внутри дока и правую зону не трогает.
      const sideDocked = pr !== undefined && pr.top <= br.top + 2;
      const inset = {
        top: Math.round(hr ? Math.max(0, hr.bottom) : 0),
        bottom: Math.round(vh - br.top),
        right: sideDocked ? Math.round(vw - pr.left) : 0,
        left: 0,
      };
      const key = `${inset.top},${inset.right},${inset.bottom},${inset.left}`;
      if (key === last) return;
      last = key;
      game.setGarageViewportInset(inset);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(dock);
    if (header) ro.observe(header);
    if (passport) ro.observe(passport);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      game.setGarageViewportInset(null);
    };
  }, [ready, game]);

  const selectHull = (id: HullId) => {
    if (!game) return;
    setSelectedHullId(id);
    // Revert the optimistic pick when the preview rebuild fails — the
    // committed loadout stayed at the previous hull (see GarageBinding).
    game.setGarageSelection(id, selectedTurretId).catch(() => {
      setSelectedHullId((cur) => (cur === id ? game.currentHull : cur));
    });
  };

  const selectTurret = (id: TurretId) => {
    if (!game) return;
    setSelectedTurretId(id);
    game.setGarageSelection(selectedHullId, id).catch(() => {
      setSelectedTurretId((cur) => (cur === id ? game.currentTurret : cur));
    });
  };

  const currHull = HULLS[selectedHullId];
  const currTurret = TURRETS[selectedTurretId];

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 z-40 flex flex-col justify-between p-4 md:p-8 pointer-events-none select-none${peeking ? ' garage-peek' : ''}`}
    >
      {/* Шапка — только навигация: назад слева, табы по центру (S2/U10). */}
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
      </div>

      {!ready && (
        <div className="garage-loading pointer-events-none" role="status">
          ЗАГРУЗКА ГАРАЖА…
        </div>
      )}

      {/* Нижняя зона: карточки + паспорт. Высоту дока исторически задавала
          колонка паспорта — под рядом карточек оставался пустой тёмный пояс,
          а на низких окнах танк не влезал в свободную зону. Панель паспорта
          ужата до высоты карточного ряда, остаток высоты разбирает
          cards-col (justify-between: чип управления прижат к низу дока). */}
      <div className="garage-bottom pointer-events-auto">
        <div className="garage-cards-col flex flex-col justify-between gap-3">
          <div className="anim-up hud-label garage-hint-label mb-1 flex items-center gap-2" style={{ '--d': '0.1s' } as React.CSSProperties}>
            <MoveUp size={12} aria-hidden />
            {activeTab === 'hulls' ? 'ВЫБЕРИТЕ КОРПУС — ОПРЕДЕЛЯЕТ ЗДОРОВЬЕ И СКОРОСТЬ' : 'ВЫБЕРИТЕ БАШНЮ — ОПРЕДЕЛЯЕТ ТИП ОРУЖИЯ И УРОН'}
          </div>

          <div
            className={
              // 5 hulls vs 3 turrets: the hull row only goes to five across on
              // very wide screens, where a single row still fits the dock.
              activeTab === 'hulls'
                ? 'grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3'
                : 'grid grid-cols-2 lg:grid-cols-3 gap-3'
            }
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
            <span className="cut-chip text-[11px] tracking-wider text-white/55 border border-white/10 px-2 py-1 bg-white/5">
              ЗАЖМИТЕ ЛКМ — ВРАЩЕНИЕ · КОЛЕСО — ПРИБЛИЖЕНИЕ
            </span>
          </div>
        </div>

        <div className="garage-passport flex flex-col gap-2">
          <div className="anim-up hud-panel p-3" style={{ '--d': '0.3s' } as React.CSSProperties}>
            <div className="hud-label text-cyan-300/90 mb-1.5 flex items-center gap-1.5">
              <HardDrive size={14} aria-hidden /> СБОРОЧНЫЙ ПАСПОРТ
            </div>
            <div className="space-y-2">
              {/* Эхо выбора одной строкой: цвета несут таксономию (циан — корпус,
                  янтарь — башня), как в чипе сборки главного меню. */}
              <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-white/10">
                <span className="text-[10px] tracking-widest text-white/60 whitespace-nowrap">КОРПУС · БАШНЯ</span>
                <span className="font-display text-sm whitespace-nowrap">
                  <span className="text-cyan-300">{currHull.name}</span>
                  <span className="text-white/45"> · </span>
                  <span className="text-amber-300">{currTurret.name}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="cut-chip bg-white/5 px-2 py-1.5 border border-white/10">
                  <div className="text-[10px] tracking-widest text-white/55 mb-0.5">ПРОЧНОСТЬ</div>
                  <div className="font-display text-lg text-emerald-400">{currHull.maxHealth}</div>
                </div>
                <div className="cut-chip bg-white/5 px-2 py-1.5 border border-white/10">
                  <div className="text-[10px] tracking-widest text-white/55 mb-0.5">СКОРОСТЬ</div>
                  <div className="font-display text-lg text-cyan-300">{currHull.speed}</div>
                </div>
                <div className="cut-chip bg-white/5 px-2 py-1.5 border border-white/10">
                  <div className="text-[10px] tracking-widest text-white/55 mb-0.5">УРОН / ВЫСТРЕЛ</div>
                  <div className="font-display text-lg text-amber-300">{currTurret.damage}</div>
                </div>
                <div className="cut-chip bg-white/5 px-2 py-1.5 border border-white/10">
                  <div className="text-[10px] tracking-widest text-white/55 mb-0.5">МАГАЗИН</div>
                  <div className="font-display text-lg text-white">{currTurret.magazine}</div>
                </div>
              </div>
              <div key={currTurret.weaponType} className="anim-pop" style={{ '--d': '0s' } as React.CSSProperties}>
                {currTurret.weaponType === 'cannon' && (
                  <div className="garage-weapon-tip text-[10px] text-amber-200/70 bg-amber-500/10 border border-amber-500/20 cut-chip px-2 py-1.5 text-center tracking-wider">
                    ФУГАСНЫЙ УРОН · РАДИУС ВЗРЫВА 5 М
                  </div>
                )}
                {currTurret.weaponType === 'flamethrower' && (
                  <div className="garage-weapon-tip text-[10px] text-orange-200/70 bg-orange-500/10 border border-orange-500/20 cut-chip px-2 py-1.5 text-center tracking-wider">
                    НЕПРЕРЫВНЫЙ КОНУС ПЛАМЕНИ
                  </div>
                )}
                {currTurret.weaponType === 'railgun' && (
                  <div className="garage-weapon-tip text-[10px] text-cyan-200/70 bg-cyan-500/10 border border-cyan-500/20 cut-chip px-2 py-1.5 text-center tracking-wider">
                    ТОЧНЫЙ ЭНЕРГЕТИЧЕСКИЙ ЛУЧ · {currTurret.damage} ЕД.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTA в конце того же движения, что и выбор: игрок только что кликал
              по карточкам внизу, а кнопка была в правом верхнем углу — ~1000 px
              хода курсора на 1080p (S2, закон Фиттса). `:disabled` вместо
              класса — состояние кнопки теперь одно на всё приложение (U13).
              Вход анимирует ОБЁРТКА: `.btn-primary` задаёт собственный
              `animation: gradient-drift`, который перебил бы `anim-up` и
              оставил кнопку с `opacity: 0` навсегда. */}
          <div className="anim-up mt-auto" style={{ '--d': '0.4s' } as React.CSSProperties}>
            <button
              type="button"
              onClick={onStart}
              disabled={!ready}
              className="btn-game btn-primary w-full px-8 py-3 text-base"
            >
              <Play size={18} className="bicon" aria-hidden />
              <span>В БОЙ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
