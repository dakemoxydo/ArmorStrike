import type { RefObject } from 'react';
import { Crosshair, Wrench, Zap } from 'lucide-react';
import { weaponStatusKind } from '../../ui/hudPresentation';
import type { BeamMode } from '../../game/weapons/types';

interface HudWeaponProps {
  reloadRef: RefObject<HTMLDivElement | null>;
  /** Flame energy fill — width painted every frame via ref (no React force). */
  flameFillRef?: RefObject<HTMLDivElement | null>;
  /**
   * Панель принимает ПРИМИТИВЫ, а не объект снапшота. `HUD` передаёт
   * `snap.current` — объект, который мутируется на месте каждый кадр, поэтому
   * `memo` со ссылкой на него не перерисовывал бы панель никогда (патроны и
   * статус перезарядки замирали бы после маунта). Регресс-тест:
   * `src/__tests__/hudLiveUpdates.test.tsx`.
   */
  turretId: string;
  weaponLabel: string;
  weaponName: string;
  weaponAccentClass: string;
  isCharging?: boolean;
  reloading: boolean;
  ammo: number;
  magazine: number;
  /** Дискретный режим нано-луча «Изиды» (undefined у остального оружия). */
  beamMode?: BeamMode;
}

/** Лейбл/класс статуса и тейнт оболочки по режиму луча («Изида»). */
const BEAM_LABEL: Record<BeamMode, { text: string; statusClass: string; shellClass: string } | null> = {
  none: null,
  idle: { text: 'ХОЛОСТОЙ ХОД', statusClass: ' is-beam-idle', shellClass: ' beam-idle' },
  acquire: { text: 'ЗАХВАТ ЦЕЛИ', statusClass: ' is-beam-acq', shellClass: ' beam-acquire' },
  attack: { text: '▼ ПОГЛОЩЕНИЕ', statusClass: ' is-beam-dmg', shellClass: ' beam-attack' },
  heal: { text: '✚ РЕМОНТ', statusClass: ' is-beam-heal', shellClass: ' beam-heal' },
};

export default function HudWeapon({
  reloadRef,
  flameFillRef,
  turretId,
  weaponLabel,
  weaponName,
  weaponAccentClass,
  isCharging,
  reloading,
  ammo,
  magazine,
  beamMode,
}: HudWeaponProps) {
  const status = weaponStatusKind({ isCharging, reloading, turretId, ammo, magazine });
  const emptyMag = status === 'empty';
  const isFlame = turretId === 'flamethrower';
  const isIsida = turretId === 'isida';
  const isShell = isFlame || isIsida;
  const flamePct = Math.max(0, Math.min(100, ammo));

  // «Изида»: активный режим луча перекрывает базовый статус (кроме пустого баллона).
  const beam = isIsida ? BEAM_LABEL[beamMode ?? 'none'] : null;
  const beamShown = beam && status !== 'reloading' ? beam : null;
  const statusText = beamShown
    ? beamShown.text
    : status === 'charging'
      ? '⚡ ЗАРЯДКА'
      : status === 'reloading'
        ? 'ПЕРЕЗАРЯДКА'
        : status === 'empty'
          ? 'ПУСТО · R'
          : '\u00a0';
  const statusClass = beamShown
    ? beamShown.statusClass
    : status === 'charging'
      ? ' is-charging'
      : status === 'reloading'
        ? ' is-reloading'
        : status === 'empty'
          ? ' is-empty'
          : '';
  const iconClass = isIsida
    ? 'text-emerald-300'
    : isFlame ? 'text-orange-300' : 'text-cyan-200';

  return (
    <div className="anim-up absolute bottom-[var(--hud-inset)] right-[var(--hud-inset)]" style={{ '--d': '0.3s' } as React.CSSProperties}>
      <div
        className={`hud-panel weapon-panel flex items-center gap-4 p-4${emptyMag ? ' is-empty' : ''}`}
        aria-label={`Оружие: ${weaponName}`}
      >
        <span className="panel-inset" aria-hidden />
        <div className="weapon-ring-col">
          <div ref={reloadRef} className="reload-ring">
            {isIsida
              ? (beamMode === 'heal'
                ? <Wrench size={20} className={iconClass} aria-hidden />
                : <Zap size={20} className={iconClass} aria-hidden />)
              : <Crosshair size={20} className={iconClass} aria-hidden />}
          </div>
          <span className={`weapon-status${statusClass}`}>
            {statusText}
          </span>
        </div>
        <div>
          <div className={`weapon-title ${weaponAccentClass}`}>
            <span>{weaponLabel}</span>
            <span className="weapon-sep" aria-hidden>·</span>
            <span className="weapon-name">{weaponName}</span>
          </div>
          {isShell ? (
            <div className={`flame-shell${isIsida ? ` beam-shell${beamShown ? beamShown.shellClass : ''}` : ''}`}>
              <div
                ref={flameFillRef}
                className="flame-fill"
                style={{ width: `${flamePct}%` }}
              />
              <div className="boost-segments" aria-hidden />
            </div>
          ) : (
            <div className="ammo-rack" aria-label={`Патроны ${ammo} из ${magazine}`}>
              <div className="ammo-strip" aria-hidden>
                {Array.from({ length: magazine }).map((_, i) => (
                  <span
                    key={i}
                    className={`ammo-pip ${
                      i < ammo
                        ? turretId === 'cannon'
                          ? 'cannon'
                          : 'full'
                        : emptyMag
                          ? 'is-empty-mag'
                          : ''
                    }`}
                  />
                ))}
              </div>
              <span className="ammo-count">
                {ammo}
                <i> / {magazine}</i>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
