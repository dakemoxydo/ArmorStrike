// ===== МЕНЮ ПАУЗЫ: продолжить, рестарт, гараж, выход, звук, качество, прицел =====
import { useState } from 'react';
import {
  ArrowLeft, ArrowUpDown, Clock3, Hash, Home, Monitor, Pause, Play, RefreshCcw,
  Skull, Trophy, Volume2, VolumeX, Wrench,
} from 'lucide-react';
import { HULLS, TURRETS } from '../core/catalog';
import type { GameApi } from '../game/GameApi';
import { QUALITY_PRESETS, type QualityLevel } from '../game/graphicsQuality';
import { CROSSHAIR_STYLES, type CrosshairStyle } from '../ui/crosshairStyle';
import {
  loadMouseSettings, saveMouseSettings,
  MIN_MOUSE_SENSITIVITY, MAX_MOUSE_SENSITIVITY, MOUSE_SENSITIVITY_STEP,
} from '../ui/mouseSettings';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface PauseMenuProps {
  game: GameApi;
  muted: boolean;
  stats: { score: number; kills: number; timeSec: number };
  /** Активный пресет прицела (настройка хранится в App + localStorage). */
  crosshair: CrosshairStyle;
  onCrosshair: (style: CrosshairStyle) => void;
  /** Показывать числа урона/лечения (п.1); persist — as2_damage_numbers. */
  damageNumbers: boolean;
  onDamageNumbers: (on: boolean) => void;
  onResume: () => void;
  onRestart: () => void;
  onGarage: () => void;
  onMenu: () => void;
  onToggleMute: () => void;
}

export default function PauseMenu({
  game, muted, stats, crosshair, onCrosshair, damageNumbers, onDamageNumbers,
  onResume, onRestart, onGarage, onMenu, onToggleMute,
}: PauseMenuProps) {
  const hull = HULLS[game.currentHull];
  const turret = TURRETS[game.currentTurret];
  const mm = String(Math.floor(stats.timeSec / 60)).padStart(2, '0');
  const ss = String(Math.floor(stats.timeSec % 60)).padStart(2, '0');
  const [quality, setQuality] = useState<QualityLevel>(() => game.getQuality());
  const [mouseSettings, setMouseSettingsState] = useState(() => loadMouseSettings());
  const trapRef = useFocusTrap(true);

  const cycleQuality = () => {
    setQuality(game.cycleQuality());
  };

  const updateSens = (delta: number) => {
    const next = Math.min(MAX_MOUSE_SENSITIVITY, Math.max(MIN_MOUSE_SENSITIVITY, Math.round((mouseSettings.sensitivity + delta) * 10) / 10));
    saveMouseSettings({ sensitivity: next });
    game.setMouseSettings({ sensitivity: next });
    setMouseSettingsState((prev) => ({ ...prev, sensitivity: next }));
  };

  const toggleInvertY = () => {
    const next = !mouseSettings.invertY;
    saveMouseSettings({ invertY: next });
    game.setMouseSettings({ invertY: next });
    setMouseSettingsState((prev) => ({ ...prev, invertY: next }));
  };

  return (
    <div
      ref={trapRef}
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="scrim-pause absolute inset-0" />
      <div className="fx-scanlines absolute inset-0" />

      <div className="relative flex w-full max-w-md flex-col items-center px-6">
        <div className="anim-pop flex flex-col items-center" style={{ '--d': '0s' } as React.CSSProperties}>
          <Pause size={38} className="pause-breathe text-amber-300" aria-hidden />
          <h2 id="pause-title" className="font-display mt-3 text-4xl tracking-hero text-white md:text-5xl">
            ПАУЗА
          </h2>
          <div className="head-rule mt-3 w-52" style={{ '--d': '0.15s' } as React.CSSProperties} />
        </div>

        <div className="anim-up mt-6 grid w-full grid-cols-3 gap-2 text-center" style={{ '--d': '0.18s' } as React.CSSProperties}>
          <div className="hud-panel p-2.5">
            <div className="flex justify-center text-amber-300"><Trophy size={13} aria-hidden /></div>
            <div className="font-display mt-1 text-sm text-white">{stats.score}</div>
            <div className="text-[11px] tracking-wider text-white/60">СЧЁТ</div>
          </div>
          <div className="hud-panel p-2.5">
            <div className="flex justify-center text-red-300"><Skull size={13} aria-hidden /></div>
            <div className="font-display mt-1 text-sm text-white">{stats.kills}</div>
            <div className="text-[11px] tracking-wider text-white/60">ФРАГИ</div>
          </div>
          <div className="hud-panel p-2.5">
            <div className="flex justify-center text-emerald-300"><Clock3 size={13} aria-hidden /></div>
            <div className="font-display mt-1 text-sm text-white">{mm}:{ss}</div>
            <div className="text-[11px] tracking-wider text-white/60">ВРЕМЯ</div>
          </div>
        </div>

        <div className="anim-up hud-panel mt-3 w-full p-3" style={{ '--d': '0.26s' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-[11px]">
            <span className="tracking-widest text-white/55">СБОРКА</span>
            <span className="font-display text-amber-300">{hull.name}</span>
            <span className="text-white/60">+</span>
            <span className="font-display text-amber-300">{turret.name}</span>
          </div>
        </div>

        <div className="mt-7 flex w-full flex-col gap-2.5">
          {/* Секция 1 — действия. Primary без enter-анимации: на неё встаёт
              фокус-трап, а `.anim-up` стартует с `opacity: 0` (M1). */}
          <div className="pause-section">
            <button type="button" data-autofocus onClick={onResume} className="btn-game btn-primary w-full px-8 py-3.5 text-base">
              <Play size={17} className="bicon" aria-hidden />
              <span>ПРОДОЛЖИТЬ БОЙ</span>
            </button>
            <div className="anim-up mt-2.5 grid grid-cols-2 gap-2.5" style={{ '--d': '0.42s' } as React.CSSProperties}>
              <button type="button" onClick={onRestart} className="btn-game btn-ghost px-4 py-3 text-sm">
                <RefreshCcw size={15} className="bicon-spin" aria-hidden />
                <span>ЗАНОВО</span>
              </button>
              <button type="button" onClick={onGarage} className="btn-game btn-ghost px-4 py-3 text-sm">
                <Wrench size={15} className="bicon" aria-hidden />
                <span>В ГАРАЖ</span>
              </button>
            </div>
          </div>

          {/* Секция 2 — настройки: звук, графика и прицел одной ступенью размера. */}
          <div className="pause-section anim-up flex flex-col gap-2.5" style={{ '--d': '0.5s' } as React.CSSProperties}>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Включить звук' : 'Выключить звук'}
                className="btn-game btn-ghost px-4 py-2.5 text-[11px] tracking-wider"
              >
                {muted ? <VolumeX size={14} className="bicon" aria-hidden /> : <Volume2 size={14} className="bicon" aria-hidden />}
                <span>{muted ? 'ЗВУК ВЫКЛ' : 'ЗВУК ВКЛ'}</span>
              </button>
              <button
                type="button"
                onClick={cycleQuality}
                aria-label={`Качество графики: ${QUALITY_PRESETS[quality].label}. Нажмите для смены`}
                title="Графика: низкое / среднее / высокое"
                className="btn-game btn-ghost px-4 py-2.5 text-[11px] tracking-wider"
              >
                <Monitor size={14} className="bicon" aria-hidden />
                <span>ГРАФ. {QUALITY_PRESETS[quality].label}</span>
              </button>
            </div>
            <div className="ch-picker" role="group" aria-label="Настройка прицела">
              {CROSSHAIR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onCrosshair(style.id)}
                  aria-pressed={crosshair === style.id}
                  className={`ch-pick${crosshair === style.id ? ' is-active' : ''}`}
                  title={`Прицел: ${style.label}`}
                >
                  <span className={`ch-prev ch-prev-${style.id}`} aria-hidden />
                  <span className="ch-pick-label">{style.label}</span>
                </button>
              ))}
            </div>
            {/* Настройки мыши: чувствительность и инверсия оси Y */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="hud-panel flex items-center justify-between px-3 py-1.5 text-[11px] tracking-wider">
                <span className="text-white/60">МЫШЬ:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateSens(-MOUSE_SENSITIVITY_STEP)}
                    disabled={mouseSettings.sensitivity <= MIN_MOUSE_SENSITIVITY}
                    aria-label="Уменьшить чувствительность мыши"
                    className="btn-game btn-ghost h-6 w-6 p-0 text-xs font-bold disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="font-display w-9 text-center text-amber-300">
                    {mouseSettings.sensitivity.toFixed(1)}x
                  </span>
                  <button
                    type="button"
                    onClick={() => updateSens(MOUSE_SENSITIVITY_STEP)}
                    disabled={mouseSettings.sensitivity >= MAX_MOUSE_SENSITIVITY}
                    aria-label="Увеличить чувствительность мыши"
                    className="btn-game btn-ghost h-6 w-6 p-0 text-xs font-bold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleInvertY}
                aria-pressed={mouseSettings.invertY}
                className="btn-game btn-ghost px-3 py-2 text-[11px] tracking-wider"
                title="Инвертировать вертикальную ось прицела (Y)"
              >
                <ArrowUpDown size={13} className="bicon" aria-hidden />
                <span>ИНВЕРТ Y: {mouseSettings.invertY ? 'ВКЛ' : 'ВЫКЛ'}</span>
              </button>
            </div>
            {/* Числа урона/лечения (п.1). Настройка только презентационная:
                расчёт урона её не видит, отключается для «чистого» боя. */}
            <button
              type="button"
              onClick={() => onDamageNumbers(!damageNumbers)}
              aria-pressed={damageNumbers}
              className="btn-game btn-ghost w-full px-4 py-2.5 text-[11px] tracking-wider"
              title="Всплывающие числа урона и лечения над целями"
            >
              <Hash size={14} className="bicon" aria-hidden />
              <span>{damageNumbers ? 'ЧИСЛА УРОНА ВКЛ' : 'ЧИСЛА УРОНА ВЫКЛ'}</span>
            </button>
          </div>

          {/* Секция 3 — выход. Единственное деструктивное действие, поэтому
              danger и отдельной строкой (U11, S5). */}
          <div className="pause-section anim-up" style={{ '--d': '0.58s' } as React.CSSProperties}>
            <button type="button" onClick={onMenu} className="btn-game btn-danger w-full px-4 py-3 text-[11px]">
              <ArrowLeft size={15} className="bicon" aria-hidden />
              <span>В МЕНЮ</span>
            </button>
          </div>
        </div>

        <div className="anim-up mt-5 flex items-center gap-2 text-[11px] tracking-widest text-white/60" style={{ '--d': '0.66s' } as React.CSSProperties}>
          <Home size={11} aria-hidden />
          <span className="esc-blink">ESC — ВЕРНУТЬСЯ В БОЙ</span>
        </div>
      </div>
    </div>
  );
}
