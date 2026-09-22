import {
  BarChart3,
  ChevronsRight,
  Globe,
  Play,
  Settings,
  Shuffle,
  Trophy,
  Wrench,
} from 'lucide-react';
import type { HullDef, TurretDef } from '../core/catalog';
import type { GameApi } from '../game/GameApi';
import MilitaryPassBadge from './auth/MilitaryPassBadge';

interface MainMenuProps {
  hull: HullDef;
  turret: TurretDef;
  credits?: number;
  claimableQuestsCount?: number;
  game?: GameApi | null;
  onStart: () => void;
  onQuickGame: () => void;
  onServerBrowser?: () => void;
  onGarage: () => void;
  onQuests?: () => void;
  onLeaderboard?: () => void;
  onSettings?: () => void;
  onOpenAuth?: () => void;
}

export default function MainMenu({
  hull,
  turret,
  credits = 0,
  claimableQuestsCount = 0,
  game,
  onStart,
  onQuickGame,
  onServerBrowser,
  onGarage,
  onQuests,
  onLeaderboard,
  onSettings,
  onOpenAuth,
}: MainMenuProps) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-6 md:p-10 pointer-events-none select-none">
      {/* Декоративные полосы сверху и снизу */}
      <div className="menu-stripes absolute inset-x-0 top-0 h-2" aria-hidden />
      <div className="menu-stripes absolute inset-x-0 bottom-0 h-2" aria-hidden />

      {/* Верхний ряд: Логотип слева, Живой угол статуса (HUD Header) справа */}
      <header className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-4 w-full">
        {/* Логотип ARMOR STRIKE */}
        <div className="pointer-events-auto flex flex-col items-start">
          <div className="anim-left flex items-center gap-2 text-[10px] tracking-widest text-amber-400 font-mono">
            <span className="h-1.5 w-1.5 bg-amber-400 cut-chip animate-pulse" aria-hidden />
            <span>ARMOR STRIKE // ИГРОВОЕ ЛОББИ</span>
          </div>

          <h1
            className="anim-left title-glitch font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-none tracking-wider text-white"
            style={{ '--d': '0.1s' } as React.CSSProperties}
          >
            ARMOR
            <span className="block bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
              STRIKE
            </span>
          </h1>
        </div>

        {/* Живой угол статуса: армейский жетон / пропуск */}
        <div
          className="pointer-events-auto anim-down self-end sm:self-auto"
          style={{ '--d': '0.15s' } as React.CSSProperties}
        >
          <MilitaryPassBadge
            game={game ?? null}
            credits={credits}
            onOpenAuth={onOpenAuth ?? (() => {})}
          />
        </div>
      </header>

      {/* Нижняя / левая зона: Вертикальный командный стек (Game Lobby Stack) */}
      <nav
        className="pointer-events-auto relative z-10 flex flex-col gap-2.5 w-full max-w-[320px] md:max-w-[360px] mt-auto"
        aria-label="Главное меню игры"
      >
        {/* 1. ДОМИНИРУЮЩАЯ КНОПКА «В БОЙ!» (Big Play Button) */}
        <div className="anim-left flex flex-col gap-1.5" style={{ '--d': '0.25s' } as React.CSSProperties}>
          <button
            type="button"
            onClick={onStart}
            className="btn-game btn-big-battle w-full py-4 md:py-5 px-6 text-left flex items-center justify-between"
            aria-label="В бой: начать игру"
          >
            <div className="flex items-center gap-3">
              <Play size={22} className="bicon" aria-hidden />
              <div className="flex flex-col items-start leading-none">
                <span className="font-display font-black tracking-widest text-slate-950 text-2xl md:text-3xl">
                  В БОЙ!
                </span>
                <span className="text-[10px] font-mono tracking-wider text-slate-900/80 mt-1 font-bold">
                  ВЫБОР РЕЖИМА И КАРТЫ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="key-chip bg-slate-900/20 text-slate-950 border-slate-900/40 text-[9px]">
                ENTER
              </span>
              <ChevronsRight size={24} className="pulse-chevron text-slate-950 stroke-[3]" aria-hidden />
            </div>
          </button>

          {/* Быстрый старт на открытый сервер */}
          <button
            type="button"
            onClick={onQuickGame}
            className="btn-game btn-ghost w-full py-2 px-3 text-xs tracking-wider flex items-center justify-center gap-2 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
            aria-label="Быстрая игра: мгновенный вход в открытый бой"
          >
            <Shuffle size={18} className="bicon" aria-hidden />
            <span>БЫСТРАЯ ИГРА (МГНОВЕННЫЙ БОЙ)</span>
          </button>
        </div>

        {/* 2. ГАРАЖ */}
        <button
          type="button"
          onClick={onGarage}
          className="anim-left lobby-nav-btn build-chip group"
          style={{ '--d': '0.35s' } as React.CSSProperties}
          aria-label={`Гараж: сборка ${hull.name} и ${turret.name}`}
        >
          <Wrench size={18} className="text-amber-400 group-hover:scale-110 transition-transform shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm tracking-wider text-white">ГАРАЖ</div>
            <div className="text-[10px] text-amber-300/80 tracking-wider font-mono truncate">
              {hull.name} + {turret.name}
            </div>
          </div>
          <span className="text-[10px] text-white/50 tracking-wider font-mono uppercase">
            НАСТРОИТЬ
          </span>
        </button>

        {/* 3. СПИСОК СЕРВЕРОВ */}
        {onServerBrowser && (
          <button
            type="button"
            onClick={onServerBrowser}
            className="anim-left lobby-nav-btn group"
            style={{ '--d': '0.45s' } as React.CSSProperties}
            aria-label="Список серверов и комнат мультиплеера"
          >
            <Globe size={18} className="text-sky-400 group-hover:scale-110 transition-transform shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm tracking-wider text-white">СПИСОК СЕРВЕРОВ</div>
              <div className="text-[10px] text-sky-300/70 tracking-wider font-mono">
                МУЛЬТИПЛЕЕР И КОМНАТЫ
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 tracking-wider font-mono font-bold">
              ОНЛАЙН
            </span>
          </button>
        )}

        {/* 4. ЗАДАЧИ */}
        {onQuests && (
          <button
            type="button"
            onClick={onQuests}
            className="anim-left lobby-nav-btn group"
            style={{ '--d': '0.55s' } as React.CSSProperties}
            aria-label="Боевые задачи и награды"
          >
            <Trophy size={18} className="text-amber-400 group-hover:scale-110 transition-transform shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm tracking-wider text-white">ЗАДАЧИ</div>
              <div className="text-[10px] text-amber-300/70 tracking-wider font-mono">
                БОЕВЫЕ ВЫПЛАТЫ И КВЕСТЫ
              </div>
            </div>
            {claimableQuestsCount > 0 ? (
              <span className="cut-chip bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 text-[10px]">
                +{claimableQuestsCount}
              </span>
            ) : (
              <span className="text-[10px] text-white/50 tracking-wider font-mono">
                3 СЛОТА
              </span>
            )}
          </button>
        )}

        {/* 5. ЛИДЕРБОРД (L3) */}
        {onLeaderboard && (
          <button
            type="button"
            onClick={onLeaderboard}
            className="anim-left lobby-nav-btn group"
            style={{ '--d': '0.6s' } as React.CSSProperties}
            aria-label="Глобальный лидерборд рекордов"
          >
            <BarChart3 size={18} className="text-amber-400 group-hover:scale-110 transition-transform shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm tracking-wider text-white">ЛИДЕРБОРД</div>
              <div className="text-[10px] text-amber-300/70 tracking-wider font-mono">
                ГЛОБАЛЬНЫЙ РЕЙТИНГ
              </div>
            </div>
            <span className="text-[10px] text-white/50 tracking-wider font-mono uppercase">
              ТОП
            </span>
          </button>
        )}

        {/* 6. НАСТРОЙКИ */}
        {onSettings && (
          <button
            type="button"
            onClick={onSettings}
            className="anim-left lobby-nav-btn group"
            style={{ '--d': '0.7s' } as React.CSSProperties}
            aria-label="Настройки звука, графики и управления"
          >
            <Settings size={18} className="text-slate-300 group-hover:rotate-45 transition-transform shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm tracking-wider text-white">НАСТРОЙКИ</div>
              <div className="text-[10px] text-white/50 tracking-wider font-mono">
                ЗВУК, ГРАФИКА, МЫШЬ
              </div>
            </div>
          </button>
        )}
      </nav>
    </div>
  );
}
