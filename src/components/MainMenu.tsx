import {
  Coins, Flame, Gamepad2, MousePointer2, Play, RotateCw, Shield, Shuffle, Target, Trophy, Wrench, Zap,
} from 'lucide-react';
import type { HullDef, TurretDef } from '../core/catalog';

interface MainMenuProps {
  hull: HullDef;
  turret: TurretDef;
  credits?: number;
  claimableQuestsCount?: number;
  onStart: () => void;
  onQuickGame: () => void;
  onGarage: () => void;
  onQuests?: () => void;
}

export default function MainMenu({
  hull, turret, credits = 0, claimableQuestsCount = 0,
  onStart, onQuickGame, onGarage, onQuests,
}: MainMenuProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-between p-8 md:p-14 bg-gradient-to-r from-[#04060bf2] via-[#04060ba8] to-transparent">
      <div className="menu-stripes pointer-events-none absolute inset-x-0 top-0 h-2" />
      <div className="menu-stripes pointer-events-none absolute inset-x-0 bottom-0 h-2" />

      {/* Top right currency & quests bar */}
      <div className="absolute top-6 right-8 md:right-14 z-20 flex items-center gap-3">
        {onQuests && (
          <button
            type="button"
            onClick={onQuests}
            className="btn-game btn-ghost px-4 py-2 text-xs flex items-center gap-2"
            aria-label="Боевые задачи"
          >
            <Trophy size={15} className="text-amber-400" aria-hidden />
            <span>ЗАДАЧИ</span>
            {claimableQuestsCount > 0 && (
              <span className="cut-chip bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 text-[9px]">
                +{claimableQuestsCount}
              </span>
            )}
          </button>
        )}

        <div className="hud-panel flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 border border-amber-500/20">
          <Coins size={15} className="text-amber-400" aria-hidden />
          <span className="font-display text-sm text-amber-300">{credits}</span>
          <span className="text-[10px] tracking-wider text-amber-400/80">CR</span>
        </div>
      </div>

      <div className="relative z-10 flex max-w-xl flex-col items-start text-left">
        <div className="anim-left flex items-center gap-3 text-[11px] tracking-hero text-cyan-300/70" style={{ '--d': '0.05s' } as React.CSSProperties}>
          <span className="h-px w-10 bg-cyan-300/40" />
          3D ТАНКОВЫЙ СИМУЛЯТОР
        </div>

        <div className="anim-left" style={{ '--d': '0.15s' } as React.CSSProperties}>
          <h1 className="title-glitch font-display text-5xl leading-none tracking-wider md:text-7xl">
            ARMOR
            <span className="block bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              STRIKE
            </span>
          </h1>
        </div>

        <p className="anim-left mt-4 max-w-lg text-xs leading-relaxed text-white/60 md:text-sm" style={{ '--d': '0.28s' } as React.CSSProperties}>
          Разрушаемые укрытия, матчи DM / TDM с ботами и сборка бронетехники.
          Соедини корпус и орудие в Гараже — выбери режим — и выходи в бой.
        </p>

        {/* S1: главное действие — сразу под лидом. Рядом — быстрый вход:
            случайный режим + карта без двух экранов подготовки. */}
        <div className="anim-left mt-8" style={{ '--d': '0.4s' } as React.CSSProperties}>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onStart} className="btn-game btn-primary px-12 py-4 text-lg" aria-label="Начать игру — выбор режима и карты">
              <Play size={22} className="bicon" aria-hidden />
              <span>ИГРАТЬ</span>
            </button>
            <button
              type="button"
              onClick={onQuickGame}
              className="btn-game btn-ghost px-6 py-4 text-base"
              aria-label="Быстрая игра: случайный режим и случайная карта"
            >
              <Shuffle size={18} className="bicon" aria-hidden />
              <span>БЫСТРАЯ ИГРА</span>
            </button>
          </div>
          <p className="mt-2.5 text-[11px] tracking-wider text-white/45">
            БЫСТРАЯ ИГРА — случайный режим · случайная карта
          </p>
        </div>

        {/* Сборка сжата до одной строки-чипа: вторичный вход, а не блок-препятствие.
            Побочно снимает коллизию двух подписей (U1) — их просто больше нет. */}
        <button
          type="button"
          onClick={onGarage}
          className="anim-left hud-panel build-chip mt-5 flex w-full max-w-md items-center gap-3 px-4 py-2.5 text-left"
          style={{ '--d': '0.52s' } as React.CSSProperties}
          aria-label={`Сборка: ${hull.name} и ${turret.name}. Открыть гараж`}
        >
          <Shield size={16} className="shrink-0 text-cyan-300" aria-hidden />
          <span className="font-display text-sm text-cyan-200">{hull.name}</span>
          <span className="text-white/45" aria-hidden>+</span>
          <Zap size={16} className="shrink-0 text-amber-300" aria-hidden />
          <span className="font-display text-sm text-amber-200">{turret.name}</span>
          <span className="ml-auto flex items-center gap-1 text-[11px] tracking-wider text-white/60">
            <Wrench size={13} aria-hidden /> ГАРАЖ
          </span>
        </button>

        <div className="anim-left mt-8 grid w-full max-w-md grid-cols-2 gap-2 text-left" style={{ '--d': '0.64s' } as React.CSSProperties}>
          <ControlCard icon={<Gamepad2 size={16} />} k="WASD" label="Корпус" />
          <ControlCard icon={<MousePointer2 size={16} />} k="МЫШЬ" label="Башня" />
          <ControlCard icon={<Target size={16} />} k="ЛКМ" label="Огонь" />
          <ControlCard icon={<RotateCw size={16} />} k="ESC" label="Пауза" />
        </div>
      </div>

      <div className="pointer-events-none z-10 hidden flex-col items-end justify-center lg:flex">
        <div className="anim-up hud-panel max-w-xs bg-black/30 p-3 text-right" style={{ '--d': '0.7s' } as React.CSSProperties}>
          <div className="hud-label mb-1 flex items-center justify-end gap-1.5 text-cyan-300/90">
            <Flame size={12} /> 3D ПРЕДПРОСМОТР
          </div>
          <p className="text-[11px] leading-relaxed tracking-widest text-white/60">
            Модель рендерится в реальном времени.
            Смена корпуса или башни в Гараже мгновенно обновляет модель.
          </p>
        </div>
      </div>
    </div>
  );
}

function ControlCard({ icon, k, label }: { icon: React.ReactNode; k: string; label: string }) {
  return (
    <div className="hud-panel flex items-center gap-2.5 bg-black/40 px-3 py-2">
      <span className="text-cyan-300" aria-hidden>{icon}</span>
      <div className="min-w-0">
        {/* Тот же чип клавиши, что в боевой подсказке (S1). */}
        <span className="key-chip">{k}</span>
        <div className="mt-1 text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}
