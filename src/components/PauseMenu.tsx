// ===== МЕНЮ ПАУЗЫ: продолжить, рестарт, гараж, выход, звук, качество =====
import { useState } from 'react';
import {
  ArrowLeft, Home, Monitor, Pause, Play, RefreshCcw, Shield,
  Skull, Trophy, Volume2, VolumeX, Waves, Wrench,
} from 'lucide-react';
import { HULLS, TURRETS } from '../core/catalog';
import type { Game } from '../game/Game';
import { QUALITY_PRESETS, type QualityLevel } from '../game/graphicsQuality';

interface PauseMenuProps {
  game: Game;
  muted: boolean;
  stats: { score: number; kills: number; wave: number; timeSec: number };
  onResume: () => void;
  onRestart: () => void;
  onGarage: () => void;
  onMenu: () => void;
  onToggleMute: () => void;
}

export default function PauseMenu({
  game, muted, stats, onResume, onRestart, onGarage, onMenu, onToggleMute,
}: PauseMenuProps) {
  const hull = HULLS[game.currentHull];
  const turret = TURRETS[game.currentTurret];
  const mm = String(Math.floor(stats.timeSec / 60)).padStart(2, '0');
  const ss = String(Math.floor(stats.timeSec % 60)).padStart(2, '0');
  const [quality, setQuality] = useState<QualityLevel>(() => game.getQuality());

  const cycleQuality = () => {
    setQuality(game.cycleQuality());
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="absolute inset-0 bg-[#03070cf0] backdrop-blur-md" />
      <div className="fx-scanlines absolute inset-0" />

      <div className="relative flex w-full max-w-md flex-col items-center px-6">
        <div className="anim-pop flex flex-col items-center" style={{ '--d': '0s' } as React.CSSProperties}>
          <Pause size={38} className="pause-breathe text-cyan-300" />
          <h2 id="pause-title" className="font-display mt-3 text-4xl tracking-[0.3em] text-white md:text-5xl">
            ПАУЗА
          </h2>
          <div className="head-rule mt-3 w-52" style={{ '--d': '0.15s' } as React.CSSProperties} />
        </div>

        <div className="anim-up mt-6 grid w-full grid-cols-4 gap-2 text-center" style={{ '--d': '0.18s' } as React.CSSProperties}>
          <div className="hud-panel p-2.5">
            <div className="flex justify-center text-amber-300"><Trophy size={13} /></div>
            <div className="font-display mt-1 text-sm text-white">{stats.score}</div>
            <div className="text-[8px] tracking-[0.2em] text-white/40">СЧЁТ</div>
          </div>
          <div className="hud-panel p-2.5">
            <div className="flex justify-center text-red-300"><Skull size={13} /></div>
            <div className="font-display mt-1 text-sm text-white">{stats.kills}</div>
            <div className="text-[8px] tracking-[0.2em] text-white/40">ФРАГИ</div>
          </div>
          <div className="hud-panel p-2.5">
            <div className="flex justify-center text-cyan-300"><Waves size={13} /></div>
            <div className="font-display mt-1 text-sm text-white">{stats.wave}</div>
            <div className="text-[8px] tracking-[0.2em] text-white/40">ВОЛНА</div>
          </div>
          <div className="hud-panel p-2.5">
            <div className="flex justify-center text-emerald-300"><Shield size={13} /></div>
            <div className="font-display mt-1 text-sm text-white">{mm}:{ss}</div>
            <div className="text-[8px] tracking-[0.2em] text-white/40">ВРЕМЯ</div>
          </div>
        </div>

        <div className="anim-up hud-panel mt-3 w-full p-3" style={{ '--d': '0.26s' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-[11px]">
            <span className="tracking-[0.25em] text-white/40">СБОРКА</span>
            <span className="font-display text-cyan-300">{hull.name}</span>
            <span className="text-white/30">+</span>
            <span className="font-display text-amber-300">{turret.name}</span>
          </div>
        </div>

        <div className="mt-7 flex w-full flex-col gap-2.5">
          <div className="anim-up" style={{ '--d': '0.34s' } as React.CSSProperties}>
            <button type="button" onClick={onResume} className="btn-game btn-primary w-full px-8 py-3.5 text-base">
              <Play size={17} className="bicon" />
              <span>ПРОДОЛЖИТЬ БОЙ</span>
            </button>
          </div>

          <div className="anim-up" style={{ '--d': '0.42s' } as React.CSSProperties}>
            <button type="button" onClick={onRestart} className="btn-game btn-ghost w-full px-8 py-3 text-sm">
              <RefreshCcw size={15} className="bicon-spin" />
              <span>НАЧАТЬ ЗАНОВО</span>
            </button>
          </div>

          <div className="anim-up grid grid-cols-2 gap-2.5" style={{ '--d': '0.5s' } as React.CSSProperties}>
            <button type="button" onClick={onGarage} className="btn-game btn-ghost px-4 py-3 text-[11px]">
              <Wrench size={15} className="bicon" />
              <span>В ГАРАЖ</span>
            </button>
            <button type="button" onClick={onMenu} className="btn-game btn-danger px-4 py-3 text-[11px]">
              <ArrowLeft size={15} className="bicon" />
              <span>В МЕНЮ</span>
            </button>
          </div>

          <div className="anim-up grid grid-cols-2 gap-2.5" style={{ '--d': '0.58s' } as React.CSSProperties}>
            <button
              type="button"
              onClick={onToggleMute}
              className="btn-game btn-ghost px-4 py-2 text-[10px]"
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
              style={{ letterSpacing: '0.12em' }}
            >
              {muted ? <VolumeX size={14} className="bicon" /> : <Volume2 size={14} className="bicon" />}
              <span>{muted ? 'ЗВУК ВЫКЛ' : 'ЗВУК ВКЛ'}</span>
            </button>
            <button
              type="button"
              onClick={cycleQuality}
              className="btn-game btn-ghost px-4 py-2 text-[10px]"
              aria-label={`Качество графики: ${QUALITY_PRESETS[quality].label}. Нажмите для смены`}
              title="Графика: low / medium / high"
              style={{ letterSpacing: '0.12em' }}
            >
              <Monitor size={14} className="bicon" />
              <span>ГРАФ. {QUALITY_PRESETS[quality].label}</span>
            </button>
          </div>
        </div>

        <div className="anim-up mt-6 flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/35" style={{ '--d': '0.66s' } as React.CSSProperties}>
          <Home size={11} />
          <span className="esc-blink">ESC — ВЕРНУТЬСЯ В БОЙ</span>
        </div>
      </div>
    </div>
  );
}
