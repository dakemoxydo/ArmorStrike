// ===== HUD: оркестрация панелей, событий и ref-обновлений =====
import { memo, useCallback } from 'react';
import { Skull, Timer, Trophy } from 'lucide-react';
import type { GameApi } from '../game/GameApi';
import { useGameHud } from '../hooks/useGameHud';
import HudCrosshair from './hud/HudCrosshair';
import HudRadar from './hud/HudRadar';
import HudVitals from './hud/HudVitals';
import HudWeapon from './hud/HudWeapon';
import HudScoreboard from './hud/HudScoreboard';
import HudFeed from './hud/HudFeed';

interface HudProps {
  game: GameApi | null;
  active: boolean;
}

const MemoRadar = memo(HudRadar);
const MemoVitals = memo(HudVitals);
const MemoWeapon = memo(HudWeapon);
const MemoFeed = memo(HudFeed);
const MemoScoreboard = memo(HudScoreboard);
const MemoCrosshair = memo(HudCrosshair);

/** мм:сс для игровых часов (прошедшее и оставшееся время). */
function clock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function HUD({ game, active }: HudProps) {
  const {
    snap, feed, vignette, dmgArc, hitmark, showHint, frag, streak,
    healthRef, healthNumRef, boostRef, reloadRef, crossRef, mapRef, liveRef,
    flameFillRef, ghostRef,
  } = useGameHud(game, active);

  // Стабильная ссылка: инлайн-стрелка обнуляла бы memo(HudFeed) на каждом кадре.
  // Хук обязан идти до раннего return — порядок хуков не должен меняться.
  const toggleMute = useCallback(() => { game?.toggleMute(); }, [game]);

  if (!game) return null;
  const st = snap.current;
  const time = clock(st.timeSec);
  const inGame = st.mode === 'playing';
  /** Оставшееся время матча: матч может закончиться по лимиту (reason: 'time'). */
  const remainSec = Math.max(0, st.timeLimitSec - st.timeSec);
  const lowTime = remainSec <= 60;
  const cpMode = st.matchMode === 'capture_point';
  const teamLeft = Math.floor(cpMode ? st.teamScoreAlpha : st.teamKillsAlpha);
  const teamRight = Math.floor(cpMode ? st.teamScoreBravo : st.teamKillsBravo);
  const scoreLabel =
    st.matchMode === 'deathmatch'
      ? `Счёт ${st.score}`
      : `Alpha ${teamLeft}, Bravo ${teamRight}, цель ${st.winTarget}`;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden">
      {/* Assistive threshold announcements for ref-driven vitals/ammo (M15) */}
      <div
        ref={liveRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Прицел прячется под открытым табло (оверлей с backdrop-blur иначе
          размывает его) и в состоянии смерти. */}
      {inGame && !st.paused && st.alive && !st.showScore && (
        <MemoCrosshair crossRef={crossRef} hitmark={hitmark} />
      )}

      {vignette > 0 && <div key={vignette} className="damage-vignette" aria-hidden />}

      {inGame && !st.paused && dmgArc && (
        <div
          key={dmgArc.key}
          className="damage-arc"
          aria-hidden
          style={{ transform: `translate(-50%, -50%) rotate(${(dmgArc.dir * 180) / Math.PI + 243}deg)` }}
        >
          <svg width="190" height="190" viewBox="0 0 190 190">
            <circle
              cx="95" cy="95" r="78"
              fill="none"
              stroke="rgba(255,45,60,0.95)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="72 1000"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255,45,60,0.9))' }}
            />
          </svg>
        </div>
      )}

      {inGame && (
        <>
          <MemoRadar mapRef={mapRef} enemiesAlive={st.enemiesAlive} />

          <div className="anim-up absolute left-1/2 top-5 -translate-x-1/2" style={{ '--d': '0.15s' } as React.CSSProperties}>
            <div className="hud-panel score-panel px-8 py-2.5 text-center" aria-label={scoreLabel}>
              {st.matchMode === 'deathmatch' ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-[11px] tracking-[0.28em] text-cyan-200/75">
                    <Trophy size={11} aria-hidden /> СЧЁТ
                  </div>
                  <div className="score-num">{String(st.score).padStart(6, '0')}</div>
                  <div className="hud-meta mt-0.5">
                    {time} · {st.kills}/{st.winTarget}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-[11px] tracking-[0.28em] text-cyan-200/75">
                    <Trophy size={11} aria-hidden />{' '}
                    {st.matchMode === 'team_deathmatch' ? 'КОМАНДНЫЙ БОЙ' : 'ЗАХВАТ ТОЧКИ'}
                  </div>
                  <div className="team-score-line mt-0.5">
                    <span className="team-alpha">ALPHA {teamLeft}</span>
                    <span className="team-score-sep">—</span>
                    <span className="team-bravo">{teamRight} BRAVO</span>
                  </div>
                  {cpMode && st.capturePoints.length > 0 && (
                    <div className="cp-points mt-1" aria-label="Точки захвата">
                      {st.capturePoints.map((cp) => (
                        <span
                          key={cp.id}
                          className={[
                            'cp-point',
                            cp.contested
                              ? 'cp-contested'
                              : cp.owner === 'alpha'
                                ? 'cp-alpha'
                                : cp.owner === 'bravo'
                                  ? 'cp-bravo'
                                  : 'cp-neutral',
                          ].join(' ')}
                          title={`${cp.id}: ${cp.contested ? 'спор' : cp.owner ?? 'нейтраль'}`}
                        >
                          {cp.id}
                          {/* Шаг 10% — ровно та же квантованность, что у гейта
                              ре-рендера (hudRenderGate.captureStripKey). */}
                          {!cp.contested && Math.floor(cp.progress * 10) > 0 && (
                            <i style={{ width: `${Math.floor(cp.progress * 10) * 10}%` }} />
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="hud-meta mt-0.5">
                    {time} · вы {st.kills}/{st.deaths} · до {st.winTarget}
                  </div>
                </>
              )}
              <div
                className={`hud-timer mt-1${lowTime ? ' is-low' : ''}`}
                aria-label={`До конца матча ${clock(remainSec)}`}
              >
                <Timer size={11} aria-hidden /> {clock(remainSec)}
              </div>
            </div>
          </div>

          <MemoFeed feed={feed} muted={st.muted} onToggleMute={toggleMute} />
          <MemoVitals healthRef={healthRef} healthNumRef={healthNumRef} boostRef={boostRef} ghostRef={ghostRef} maxHealth={st.maxHealth} />
          <MemoWeapon
            reloadRef={reloadRef}
            flameFillRef={flameFillRef}
            turretId={st.turretId}
            weaponLabel={st.weaponLabel}
            weaponName={st.weaponName}
            weaponAccentClass={st.weaponAccentClass}
            isCharging={st.isCharging}
            reloading={st.reloading}
            ammo={st.ammo}
            magazine={st.magazine}
          />

          {/* Смерть/респаун: текст дублируется в live-region (M15), поэтому сам
              оверлей помечен aria-hidden — иначе отсчёт читался бы каждую секунду. */}
          {!st.alive && (
            <div className="death-overlay" aria-hidden>
              <div className="hud-panel death-panel">
                <Skull size={30} className="death-icon" />
                <div className="death-title">УНИЧТОЖЕН</div>
                <div className="death-sub">
                  Возрождение через <b>{Math.ceil(st.respawnInSec)}</b> с
                </div>
              </div>
            </div>
          )}

          {showHint && (
            <div className="hud-hint-wrap" aria-hidden>
              <div className="hud-panel hint-panel">
                <span><b>WASD</b> ДВИЖЕНИЕ</span>
                <span><b>SHIFT</b> НИТРО</span>
                <span><b>МЫШЬ</b> ОБЗОР/ПРИЦЕЛ</span>
                <span><b>ЛКМ</b> ОГОНЬ</span>
                <span><b>R</b> МАГАЗИН</span>
                <span><b>TAB</b> ТАБЛО</span>
                <span><b>M</b> ЗВУК</span>
                <span><b>ESC</b> ПАУЗА</span>
              </div>
            </div>
          )}

          {frag && (
            <div key={frag.key} className="frag-popup" aria-hidden>
              <span className="frag-plus">+ ФРАГ</span>
              <span className="frag-victim">{frag.victim}</span>
            </div>
          )}

          {streak && (
            <div key={streak.key} className="streak-banner" aria-hidden>
              <span className="streak-label">{streak.label}</span>
              <span className="streak-count">×{streak.count}</span>
            </div>
          )}

          {st.showScore && <MemoScoreboard rows={st.scoreboard} />}
        </>
      )}
    </div>
  );
}
