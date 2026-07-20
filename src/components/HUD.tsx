// ===== HUD: оркестрация панелей, событий и ref-обновлений =====
import { memo } from 'react';
import { Trophy } from 'lucide-react';
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

export default function HUD({ game, active }: HudProps) {
  const {
    snap, feed, vignette, dmgArc, hitmark, showHint, frag,
    healthRef, healthNumRef, boostRef, reloadRef, crossRef, mapRef, liveRef,
    flameFillRef,
  } = useGameHud(game, active);

  if (!game) return null;
  const st = snap.current;
  const time = `${String(Math.floor(st.timeSec / 60)).padStart(2, '0')}:${String(Math.floor(st.timeSec) % 60).padStart(2, '0')}`;
  const inGame = st.mode === 'playing';

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

      {inGame && !st.paused && <MemoCrosshair crossRef={crossRef} hitmark={hitmark} />}

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
          <MemoRadar mapRef={mapRef} botsAlive={st.botsAlive} />

          <div className="anim-up absolute left-1/2 top-5 -translate-x-1/2" style={{ '--d': '0.15s' } as React.CSSProperties}>
            <div className="hud-panel score-panel px-8 py-2.5 text-center" aria-label={`Счёт ${st.score}`}>
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
                  {(() => {
                    const left = st.matchMode === 'capture_point'
                      ? Math.floor(st.teamScoreAlpha)
                      : st.teamKillsAlpha;
                    const right = st.matchMode === 'capture_point'
                      ? Math.floor(st.teamScoreBravo)
                      : st.teamKillsBravo;
                    return (
                      <div
                        className="team-score-line mt-0.5"
                        aria-label={`Alpha ${left}, Bravo ${right}, цель ${st.winTarget}`}
                      >
                        <span className="team-alpha">ALPHA {left}</span>
                        <span className="team-score-sep">—</span>
                        <span className="team-bravo">{right} BRAVO</span>
                      </div>
                    );
                  })()}
                  {st.matchMode === 'capture_point' && st.capturePoints.length > 0 && (
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
                          {cp.progress > 0.02 && !cp.contested && (
                            <i style={{ width: `${Math.round(cp.progress * 100)}%` }} />
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
            </div>
          </div>

          <MemoFeed feed={feed} muted={st.muted} onToggleMute={() => game.toggleMute()} />
          <MemoVitals healthRef={healthRef} healthNumRef={healthNumRef} boostRef={boostRef} maxHealth={st.maxHealth} />
          <MemoWeapon
            reloadRef={reloadRef}
            flameFillRef={flameFillRef}
            st={st}
          />

          {showHint && (
            <div className="hud-hint-wrap" aria-hidden>
              <div className="hud-panel hint-panel">
                <span><b>WASD</b> ДВИЖЕНИЕ</span>
                <span><b>SHIFT</b> НИТРО</span>
                <span><b>МЫШЬ</b> ОБЗОР/ПРИЦЕЛ</span>
                <span><b>ЛКМ</b> ОГОНЬ</span>
                <span><b>R</b> МАГАЗИН</span>
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

          {st.showScore && <MemoScoreboard rows={st.scoreboard} />}
        </>
      )}
    </div>
  );
}
