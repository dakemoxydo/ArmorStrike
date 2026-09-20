import { useEffect, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Monitor,
  MousePointer2,
  Settings,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { GameApi } from '../game/GameApi';
import { QUALITY_PRESETS, type QualityLevel } from '../game/graphicsQuality';
import { CROSSHAIR_STYLES, type CrosshairStyle } from '../ui/crosshairStyle';
import {
  loadMouseSettings,
  saveMouseSettings,
  MIN_MOUSE_SENSITIVITY,
  MAX_MOUSE_SENSITIVITY,
  MOUSE_SENSITIVITY_STEP,
} from '../ui/mouseSettings';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SettingsModalProps {
  game: GameApi | null;
  muted: boolean;
  onToggleMute: () => void;
  crosshair: CrosshairStyle;
  onCrosshair: (style: CrosshairStyle) => void;
  damageNumbers: boolean;
  onDamageNumbers: (on: boolean) => void;
  onClose: () => void;
}

export default function SettingsModal({
  game,
  muted,
  onToggleMute,
  crosshair,
  onCrosshair,
  damageNumbers,
  onDamageNumbers,
  onClose,
}: SettingsModalProps) {
  const trapRef = useFocusTrap(true);
  const [quality, setQuality] = useState<QualityLevel>(() => game?.getQuality() ?? 'medium');
  const [mouseSettings, setMouseSettingsState] = useState(() => loadMouseSettings());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cycleQuality = () => {
    if (!game) return;
    setQuality(game.cycleQuality());
  };

  const updateSens = (delta: number) => {
    const next = Math.min(
      MAX_MOUSE_SENSITIVITY,
      Math.max(MIN_MOUSE_SENSITIVITY, Math.round((mouseSettings.sensitivity + delta) * 10) / 10),
    );
    saveMouseSettings({ sensitivity: next });
    game?.setMouseSettings({ sensitivity: next });
    setMouseSettingsState((prev) => ({ ...prev, sensitivity: next }));
  };

  const toggleInvertY = () => {
    const next = !mouseSettings.invertY;
    saveMouseSettings({ invertY: next });
    game?.setMouseSettings({ invertY: next });
    setMouseSettingsState((prev) => ({ ...prev, invertY: next }));
  };

  return (
    <div
      ref={trapRef}
      className="scrim-over fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="hud-panel relative flex w-full max-w-xl flex-col gap-5 p-6 md:p-8 bg-[#070d14]/95 border border-amber-500/35 shadow-2xl">
        {/* Шапка модального окна */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-amber-400" aria-hidden />
            <div>
              <h2 id="settings-modal-title" className="font-display text-xl md:text-2xl tracking-wide text-white">
                НАСТРОЙКИ
              </h2>
              <p className="text-[11px] tracking-wider text-white/50">
                Конфигурация графики, звука, управления и прицела
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-game btn-ghost btn-icon"
            aria-label="Закрыть настройки"
          >
            <X size={18} className="bicon" aria-hidden />
          </button>
        </div>

        {/* Секция 1: Звук и Графика */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold tracking-widest text-amber-400/90 flex items-center gap-2">
            <Sliders size={13} aria-hidden />
            <span>ОСНОВНЫЕ ПАРАМЕТРЫ</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
              className="btn-game btn-ghost px-4 py-3 text-xs tracking-wider flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {muted ? (
                  <VolumeX size={16} className="text-red-400" aria-hidden />
                ) : (
                  <Volume2 size={16} className="text-emerald-400" aria-hidden />
                )}
                <span>ЗВУК</span>
              </div>
              <span className={`cut-chip text-[10px] font-bold px-2 py-0.5 ${muted ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {muted ? 'ВЫКЛ' : 'ВКЛ'}
              </span>
            </button>

            <button
              type="button"
              onClick={cycleQuality}
              aria-label={`Качество графики: ${QUALITY_PRESETS[quality].label}. Нажмите для смены`}
              className="btn-game btn-ghost px-4 py-3 text-xs tracking-wider flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Monitor size={16} className="text-amber-400" aria-hidden />
                <span>ГРАФИКА</span>
              </div>
              <span className="cut-chip bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5">
                {QUALITY_PRESETS[quality].label}
              </span>
            </button>
          </div>
        </div>

        {/* Секция 2: Мышь и Управление */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold tracking-widest text-amber-400/90 flex items-center gap-2">
            <MousePointer2 size={13} aria-hidden />
            <span>УПРАВЛЕНИЕ МЫШЬЮ</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="hud-panel flex items-center justify-between px-3.5 py-2.5 text-xs tracking-wider bg-black/30">
              <span className="text-white/70">ЧУВСТВИТЕЛЬНОСТЬ:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSens(-MOUSE_SENSITIVITY_STEP)}
                  disabled={mouseSettings.sensitivity <= MIN_MOUSE_SENSITIVITY}
                  aria-label="Уменьшить чувствительность"
                  className="btn-game btn-ghost cut-chip h-6 w-6 p-0 text-xs font-bold border border-[#0b0e14] shadow-[0_1px_0_#0b0e14] disabled:opacity-30"
                >
                  -
                </button>
                <span className="font-display w-9 text-center text-amber-300 text-xs">
                  {mouseSettings.sensitivity.toFixed(1)}x
                </span>
                <button
                  type="button"
                  onClick={() => updateSens(MOUSE_SENSITIVITY_STEP)}
                  disabled={mouseSettings.sensitivity >= MAX_MOUSE_SENSITIVITY}
                  aria-label="Увеличить чувствительность"
                  className="btn-game btn-ghost cut-chip h-6 w-6 p-0 text-xs font-bold border border-[#0b0e14] shadow-[0_1px_0_#0b0e14] disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleInvertY}
              aria-label={`Инверсия оси Y: ${mouseSettings.invertY ? 'Включена' : 'Выключена'}`}
              className="btn-game btn-ghost px-3.5 py-2.5 text-xs tracking-wider flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ArrowUpDown size={15} className="text-amber-400" aria-hidden />
                <span>ИНВЕРСИЯ Y</span>
              </div>
              <span className={`cut-chip text-[10px] font-bold px-2 py-0.5 ${mouseSettings.invertY ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-white/50'}`}>
                {mouseSettings.invertY ? 'ВКЛ' : 'ВЫКЛ'}
              </span>
            </button>
          </div>
        </div>

        {/* Секция 3: Прицел и Индикация */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold tracking-widest text-amber-400/90 flex items-center gap-2">
              <Sparkles size={13} aria-hidden />
              <span>СТИЛЬ ПРИЦЕЛА</span>
            </div>

            <button
              type="button"
              onClick={() => onDamageNumbers(!damageNumbers)}
              className="text-[11px] tracking-wider flex items-center gap-1.5 text-white/70 hover:text-white"
            >
              <span>ЧИСЛА УРОНА:</span>
              <span className={`font-bold ${damageNumbers ? 'text-emerald-400' : 'text-white/50'}`}>
                {damageNumbers ? 'ВКЛ' : 'ВЫКЛ'}
              </span>
            </button>
          </div>

          <div className="ch-picker" role="group" aria-label="Выбор прицела">
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
        </div>

        {/* Секция 4: Справка по клавишам */}
        <div className="border-t border-white/10 pt-3">
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] tracking-wider text-white/60">
            <div className="bg-black/30 p-1.5 cut-chip"><span className="text-amber-300 font-bold">WASD</span> Корпус</div>
            <div className="bg-black/30 p-1.5 cut-chip"><span className="text-amber-300 font-bold">МЫШЬ</span> Башня</div>
            <div className="bg-black/30 p-1.5 cut-chip"><span className="text-amber-300 font-bold">ЛКМ</span> Огонь</div>
            <div className="bg-black/30 p-1.5 cut-chip"><span className="text-amber-300 font-bold">SHIFT</span> Нитро</div>
            <div className="bg-black/30 p-1.5 cut-chip"><span className="text-amber-300 font-bold">C</span> Башня прямо</div>
            <div className="bg-black/30 p-1.5 cut-chip"><span className="text-amber-300 font-bold">ESC</span> Пауза</div>
          </div>
        </div>

        {/* Кнопка закрытия */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-game btn-primary w-full py-3 text-sm"
          >
            <Check size={16} className="bicon" aria-hidden />
            <span>ГОТОВО</span>
          </button>
        </div>
      </div>
    </div>
  );
}
