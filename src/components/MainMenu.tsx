import {
  Flame, Gamepad2, MousePointer2, Play, RotateCw, Shield, Target, Wrench, Zap,
} from 'lucide-react';
import type { HullDef, TurretDef } from '../core/catalog';

interface MainMenuProps {
  hull: HullDef;
  turret: TurretDef;
  onStart: () => void;
  onGarage: () => void;
}

export default function MainMenu({ hull, turret, onStart, onGarage }: MainMenuProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-between p-8 md:p-14 bg-gradient-to-r from-[#04060bf2] via-[#04060ba8] to-transparent">
      <div className="menu-stripes pointer-events-none absolute inset-x-0 top-0 h-2" />
      <div className="menu-stripes pointer-events-none absolute inset-x-0 bottom-0 h-2" />

      <div className="relative z-10 flex max-w-xl flex-col items-start text-left">
        <div className="anim-left flex items-center gap-3 text-[11px] tracking-[0.4em] text-cyan-300/70" style={{ '--d': '0.05s' } as React.CSSProperties}>
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
          Разрушаемые укрытия, динамические волны ботов и сборка бронетехники.
          Соедини корпус и орудие в Гараже — и выходи в бой.
        </p>

        <div className="anim-left hud-panel mt-6 w-full max-w-md border border-cyan-500/30 bg-black/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/60 hover:shadow-[0_0_28px_rgba(46,230,192,0.25)]" style={{ '--d': '0.4s' } as React.CSSProperties}>
          <div className="hud-label mb-2 flex items-center justify-between text-cyan-300/80">
            <span>ТЕКУЩАЯ СБОРКА ТАНКА</span>
            <span className="font-display text-[9px] text-emerald-400">ГОТОВ К БОЮ</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="floaty flex h-10 w-10 items-center justify-center rounded border border-cyan-400/40 bg-cyan-950/50 text-cyan-300">
                <Shield size={20} />
              </div>
              <div>
                <div className="text-[11px] tracking-widest text-white/60">КОРПУС</div>
                <div className="font-display text-sm text-cyan-200">{hull.name}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="floaty flex h-10 w-10 items-center justify-center rounded border border-amber-400/40 bg-amber-950/50 text-amber-300" style={{ animationDelay: '-2.2s' }}>
                <Zap size={20} />
              </div>
              <div>
                <div className="text-[11px] tracking-widest text-white/60">БАШНЯ</div>
                <div className="font-display text-sm text-amber-200">{turret.name}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="anim-left mt-8 flex flex-wrap items-center gap-4" style={{ '--d': '0.52s' } as React.CSSProperties}>
          <button type="button" onClick={onStart} className="btn-game btn-primary px-12 py-4 text-lg" aria-label="Начать игру">
            <Play size={22} className="bicon" />
            <span>ИГРАТЬ</span>
          </button>
          <button type="button" onClick={onGarage} className="btn-game btn-ghost px-8 py-4 text-sm" aria-label="Открыть гараж">
            <Wrench size={18} className="bicon" />
            <span>ГАРАЖ ТАНКА</span>
          </button>
        </div>

        <div className="anim-left mt-8 grid w-full max-w-md grid-cols-2 gap-2 text-left" style={{ '--d': '0.64s' } as React.CSSProperties}>
          <ControlCard icon={<Gamepad2 size={16} />} k="WASD" label="Корпус" />
          <ControlCard icon={<MousePointer2 size={16} />} k="МЫШЬ" label="Башня" />
          <ControlCard icon={<Target size={16} />} k="ЛКМ" label="Огонь" />
          <ControlCard icon={<RotateCw size={16} />} k="ESC — ПАУЗА" label="Меню в бою" />
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
      <div>
        <div className="font-display text-xs tracking-wider text-white">{k}</div>
        <div className="text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}
