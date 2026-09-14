// ===== HUD: оркестрация панелей, событий и ref-обновлений =====
import { memo, useCallback } from 'react';
import { Skull, Timer, Trophy } from 'lucide-react';
import type { GameApi } from '../game/GameApi';
import { useGameHud } from '../hooks/useGameHud';
import { configForMode } from '../game/match/matchConfig';
import HudCrosshair from './hud/HudCrosshair';
import HudRadar from './hud/HudRadar';
import HudVitals from './hud/HudVitals';
import HudWeapon from './hud/HudWeapon';
import HudScoreboard from './hud/HudScoreboard';
import HudFeed from './hud/HudFeed';
import type { CrosshairStyle } from '../ui/crosshairStyle';

interface HudProps {
  game: GameApi | null;
  active: boolean;
  /** Пресет прицела из настроек (значение по умолчанию задан в HudCrosshair). */
  crosshair?: CrosshairStyle;
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

/** Доля выполнения порога победы, 0…100. */
function winPct(value: number, target: number): number {
  return Math.max(0, Math.min(100, (value / Math.max(1, target)) * 100));
}

export default function HUD({ game, active, crosshair }: HudProps) {
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
  /** Прогресс до порога: DM — личные фраги, командные — «перетяжка» по доле. */
  const dmProgress = winPct(st.kills, st.winTarget);
  const teamTotal = teamLeft + teamRight;
  const alphaShare = teamTotal > 0 ? (teamLeft / teamTotal) * 100 : 50;
  /** Полоса респауна в оверлее смерти. Total берётся из того же конфига матча,
      что и сам отсчёт, — иначе полоса разошлась бы с цифрой при смене баланса. */
  const respawnFrac = st.alive
    ? 0
    : Math.max(0, Math.min(1, st.respawnInSec / configForMode(st.matchMode).respawnDelaySec));

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
        <MemoCrosshair crossRef={crossRef} hitmark={hitmark} crosshair={crosshair} />
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
              <span className="panel-inset" aria-hidden />
              {st.matchMode === 'deathmatch' ? (
                <>
                  <div className="score-mode justify-center">
                    <Trophy size={11} aria-hidden /> СЧЁТ
                  </div>
                  <div className="score-num">{String(st.score).padStart(6, '0')}</div>
                  {/* Прогресс до порога победы: видно, сколько осталось, без чтения цифр. */}
                  <div className="score-progress" aria-hidden>
                    <i className="sp-fill" style={{ width: `${dmProgress}%` }} />
                  </div>
                  <div className="hud-meta mt-1">
                    ФРАГИ {st.kills}/{st.winTarget}
                  </div>
                </>
              ) : (
                <>
                  <div className="score-mode justify-center">
                    <Trophy size={11} aria-hidden />{' '}
                    {st.matchMode === 'team_deathmatch' ? 'КОМАНДНЫЙ БОЙ' : 'ЗАХВАТ ТОЧКИ'}
                  </div>
                  <div className="team-score-line mt-0.5">
                    <span className="team-alpha">ALPHA {teamLeft}</span>
                    <span className="team-score-sep">—</span>
                    <span className="team-bravo">{teamRight} BRAVO</span>
                  </div>
                  {/* «Перетяжка» Alpha ↔ Bravo: ширина сторон — доля от суммы. */}
                  <div className="score-progress" aria-hidden>
                    <i className="sp-alpha" style={{ width: `${alphaShare}%` }} />
                    <i className="sp-bravo" style={{ width: `${100 - alphaShare}%` }} />
                  </div>
                  {cpMode && st.capturePoints.length > 0 && (
                    <div className="cp-points mt-1.5" aria-label="Точки захвата">
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
                  <div className="hud-meta mt-1">
                    вы {st.kills}/{st.deaths} · цель {st.winTarget}
                  </div>
                </>
              )}
              {/* Единственная шкала времени в панели: раньше рядом стояли двое
                  часов разного смысла (прошедшее 00:00 и остаток 11:59) без
                  подписи — читалось как дубль (U3). */}
              <div
                className={`hud-timer${lowTime ? ' is-low' : ''}`}
                aria-label={`До конца матча ${clock(remainSec)}`}
              >
                <Timer size={11} aria-hidden /> ДО КОНЦА {clock(remainSec)}
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
                <Skull size={30} className="death-icon skull-pulse" />
                <div className="death-title">УНИЧТОЖЕН</div>
                <div className="death-sub">
                  Возрождение через <b>{Math.ceil(st.respawnInSec)}</b> с
                </div>
                {/* Ширина обновляется раз в секунду (квант `respawnInSec` в
                    hudRenderGate), CSS-переход 1s линейно сглаживает шаги. */}
                <div className="death-bar">
                  <i style={{ width: `${respawnFrac * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Подсказка живёт в DOM постоянно и гаснет классом: выход по
              состоянию (`showHint`) проигрывает переход, а не обрывает его. */}
          <div className={`hud-hint-wrap${showHint ? '' : ' is-hidden'}`} aria-hidden>
            <div className="hud-panel hint-panel">
              <span><b className="key-chip">WASD</b> ДВИЖЕНИЕ</span>
              <span><b className="key-chip">SHIFT</b> НИТРО</span>
              <span><b className="key-chip">МЫШЬ</b> ОБЗОР/ПРИЦЕЛ</span>
              <span><b className="key-chip">ЛКМ</b> ОГОНЬ</span>
              <span><b className="key-chip">R</b> МАГАЗИН</span>
              <span><b className="key-chip">TAB</b> ТАБЛО</span>
              <span><b className="key-chip">M</b> ЗВУК</span>
              <span><b className="key-chip">ESC</b> ПАУЗА</span>
            </div>
          </div>

          {/* Одна полоса на оба тоста (U16): серия сверху, фраг под ней. Раньше
              это были два независимых `top: %`, и при серии они накладывались. */}
          {(frag || streak) && (
            <div className="toast-lane" aria-hidden>
              {streak && (
                <div key={streak.key} className="streak-banner">
                  <span className="streak-label">{streak.label}</span>
                  <span className="streak-count">×{streak.count}</span>
                </div>
              )}
              {frag && (
                <div key={frag.key} className="frag-popup">
                  <span className="frag-plus">+ ФРАГ</span>
                  <span className="frag-victim">{frag.victim}</span>
                </div>
              )}
            </div>
          )}

          {st.showScore && <MemoScoreboard rows={st.scoreboard} />}
        </>
      )}
    </div>
  );
}
