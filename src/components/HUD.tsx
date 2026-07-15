// ===== HUD: здоровье, патроны, прицел, очки, миникарта, лента =====
import { useEffect, useReducer, useRef, useState } from 'react';
import {
  Crosshair, Gauge, Heart, Radio, Shield, Skull,
  Trophy, Volume2, VolumeX, Zap,
} from 'lucide-react';
import type { Game, GameEvent, MinimapDynamic } from '../game/Game';

interface HudProps {
  game: Game | null;
  active: boolean;
}

interface FeedEntry { id: number; victim: string; byPlayer: boolean }

const MAP_SIZE = 172;
const MAP_HALF = 80;

export default function HUD({ game, active }: HudProps) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const snap = useRef({ ammo: -1, reloading: false, isCharging: false, score: -1, wave: -1, bots: -1, alive: true, sec: -1, paused: false, muted: false, healthId: -1, hudMode: '', turretId: 'railgun' as string, showScore: false });
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [banner, setBanner] = useState<{ n: number; key: number } | null>(null);
  const [vignette, setVignette] = useState(0);
  const [dmgArc, setDmgArc] = useState<{ dir: number; key: number } | null>(null);
  const [hitmark, setHitmark] = useState<{ kill: boolean; key: number } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [frag, setFrag] = useState<{ victim: string; key: number } | null>(null);

  const healthRef = useRef<HTMLDivElement>(null);
  const healthNumRef = useRef<HTMLSpanElement>(null);
  const boostRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const mmBuf = useRef<MinimapDynamic[]>([]);
  const feedId = useRef(0);

  // ---- события игры ----
  useEffect(() => {
    if (!game) return;
    const onEvent = (e: GameEvent) => {
      if (e.type === 'playerHit') {
        setVignette((v) => v + 1);
        setDmgArc({ dir: e.dir, key: performance.now() });
      } else if (e.type === 'enemyHit') {
        setHitmark({ kill: e.killed, key: performance.now() });
      } else if (e.type === 'kill') {
        const id = ++feedId.current;
        setFeed((f) => [...f.slice(-4), { id, victim: e.victim, byPlayer: e.byPlayer }]);
        setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 4200);
        if (e.byPlayer) {
          setFrag({ victim: e.victim, key: performance.now() });
        }
      } else if (e.type === 'wave') {
        setBanner({ n: e.n, key: performance.now() });
      } else if (e.type === 'shotFired') {
        const el = crossRef.current?.querySelector('.cross-core');
        if (el) {
          el.classList.remove('shot-pulse');
          void (el as HTMLElement).offsetWidth;
          el.classList.add('shot-pulse');
        }
      }
    };
    game.addListener(onEvent);
    return () => game.removeListener(onEvent);
  }, [game]);

  useEffect(() => {
    if (!active) return;
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 11000);
    return () => clearTimeout(t);
  }, [active]);

  // ---- главный цикл HUD ----
  useEffect(() => {
    if (!game) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const s = game.getHud();
      const c = snap.current;

      // быстрые элементы — через refs
      if (healthRef.current) {
        const pct = Math.max(0, (s.health / s.maxHealth) * 100);
        healthRef.current.style.width = `${pct}%`;
        healthRef.current.classList.toggle('danger', pct < 32);
      }
      if (healthNumRef.current) healthNumRef.current.textContent = `${Math.ceil(s.health)}`;
      if (boostRef.current) {
        const b = Math.max(0, Math.min(100, s.boost * 100));
        boostRef.current.style.width = `${b}%`;
        boostRef.current.classList.toggle('low', b < 15);
      }
      if (reloadRef.current) {
        const p = s.reloading ? Math.round(s.reloadProgress * 360) : 360;
        reloadRef.current.style.background =
          s.reloading
            ? `conic-gradient(#ffd24a ${p}deg, rgba(255,255,255,0.07) ${p}deg)`
            : `conic-gradient(#2ee6c0 360deg, rgba(0,0,0,0) 0deg)`;
      }
      // миникарта
      drawMinimap(game, mapRef.current, mmBuf.current);

      // дискретное состояние
      if (
        c.ammo !== s.ammo || c.reloading !== s.reloading || c.isCharging !== s.isCharging ||
        c.score !== s.score || c.wave !== s.wave || c.bots !== s.botsAlive || c.alive !== s.alive ||
        c.paused !== s.paused || c.muted !== s.muted || c.hudMode !== s.mode ||
        c.showScore !== s.showScore ||
        Math.floor(s.timeSec) !== c.sec
      ) {
        snap.current = {
          ammo: s.ammo, reloading: s.reloading, isCharging: s.isCharging ?? false, score: s.score, wave: s.wave,
          bots: s.botsAlive, alive: s.alive, sec: Math.floor(s.timeSec),
          paused: s.paused, muted: s.muted, healthId: 0, hudMode: s.mode,
          turretId: s.turretId, showScore: s.showScore,
        };
        force();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  if (!game) return null;
  const s = game.getHud();
  const st = snap.current;
  const time = `${String(Math.floor(st.sec / 60)).padStart(2, '0')}:${String(st.sec % 60).padStart(2, '0')}`;
  const inGame = st.hudMode === 'playing';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden">
      {/* прицел — двигается за мышью */}
      {inGame && !st.paused && (
        <div ref={crossRef} className="crosshair" style={{ left: '50%', top: '50%' }}>
          <div className="cross-core">
            <span className="ch-dot" />
            <span className="ch-ring" />
            <span className="ch-tick t" /><span className="ch-tick b" />
            <span className="ch-tick l" /><span className="ch-tick r" />
          </div>
          {hitmark && (
            <div key={hitmark.key} className={`hitmarker ${hitmark.kill ? 'kill' : ''}`}>
              <span /><span /><span /><span />
            </div>
          )}
        </div>
      )}

      {/* виньетка урона */}
      {vignette > 0 && <div key={vignette} className="damage-vignette" />}

      {/* направленный индикатор урона — указывает на атакующего */}
      {inGame && !st.paused && dmgArc && (
        <div
          key={dmgArc.key}
          className="damage-arc"
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
          {/* === Левый верх: миникарта === */}
          <div className="hud-panel anim-left absolute left-5 top-5 p-3" style={{ width: MAP_SIZE + 24, '--d': '0.05s' } as React.CSSProperties}>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="hud-label flex items-center gap-1.5"><Radio size={12} /> РАДАР</span>
              <span className="hud-label text-cyan-300/90">ВОЛНА {st.wave}</span>
            </div>
            <div className="minimap-frame">
              <canvas ref={mapRef} width={MAP_SIZE} height={MAP_SIZE} />
              <span className="corner tl" /><span className="corner tr" />
              <span className="corner bl" /><span className="corner br" />
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="hud-label flex items-center gap-1.5"><Skull size={12} /> ЦЕЛИ</span>
              <div className="flex gap-1">
                {Array.from({ length: Math.max(0, st.bots) }).map((_, i) => (
                  <span key={i} className="bot-dot" />
                ))}
                {st.bots === 0 && <span className="hud-label text-emerald-300">ЧИСТО</span>}
              </div>
            </div>
          </div>

          {/* === Центр верх: счёт и время === */}
          <div className="anim-up absolute left-1/2 top-5 -translate-x-1/2" style={{ '--d': '0.15s' } as React.CSSProperties}>
            <div className="hud-panel score-panel px-8 py-2.5 text-center">
              <div className="flex items-center justify-center gap-2 text-[10px] tracking-[0.35em] text-cyan-200/60">
                <Trophy size={11} /> СЧЁТ
              </div>
              <div className="score-num">{String(st.score).padStart(6, '0')}</div>
              <div className="mt-0.5 text-[10px] tracking-[0.3em] text-white/40">
                {time} · ФРАГИ {game.getHud().kills}
              </div>
            </div>
          </div>

          {/* === Правый верх: лента + звук === */}
          <div className="anim-up absolute right-5 top-5 flex flex-col items-end gap-2" style={{ '--d': '0.2s' } as React.CSSProperties}>
            <div className="pointer-events-auto anim-up" style={{ '--d': '0.1s' } as React.CSSProperties}>
              <button
                onClick={() => { game.toggleMute(); }}
                className="btn-game btn-ghost h-9 w-9 px-0 py-0"
                title="Звук [M]"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                {st.muted ? <VolumeX size={16} className="bicon" /> : <Volume2 size={16} className="bicon" />}
              </button>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {feed.map((f) => (
                <div key={f.id} className="feed-item">
                  {f.byPlayer ? (
                    <><Zap size={11} className="text-emerald-300" /> ВЫ <span className="text-white/30">▸</span> <span className="text-red-300">{f.victim}</span></>
                  ) : (
                    <><Skull size={11} className="text-red-400" /> {f.victim} <span className="text-white/30">уничтожен</span></>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* === Левый низ: здоровье === */}
          <div className="anim-up absolute bottom-6 left-6 w-80" style={{ '--d': '0.25s' } as React.CSSProperties}>
            <div className="hud-panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="hud-label flex items-center gap-1.5"><Shield size={12} /> БРОНЯ</span>
                <span className="flex items-center gap-1 font-display text-lg text-cyan-100">
                  <Heart size={14} className="text-cyan-300" />
                  <span ref={healthNumRef}>100</span>
                  <span className="text-xs text-white/30">/ {s.maxHealth}</span>
                </span>
              </div>
              <div className="hp-shell">
                <div ref={healthRef} className="hp-fill" style={{ width: '100%' }} />
                <div className="hp-segments" />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="hud-label flex items-center gap-1.5"><Gauge size={12} /> НИТРО</span>
                <span className="text-[10px] tracking-[0.2em] text-white/35">SHIFT</span>
              </div>
              <div className="boost-shell">
                <div ref={boostRef} className="boost-fill" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* === Правый низ: оружие === */}
          <div className="anim-up absolute bottom-6 right-6" style={{ '--d': '0.3s' } as React.CSSProperties}>
            <div className="hud-panel flex items-center gap-4 p-4">
              <div className="relative">
                <div ref={reloadRef} className="reload-ring">
                  <Crosshair size={20} className={st.turretId === 'flamethrower' ? 'text-orange-300' : 'text-cyan-200'} />
                </div>
                {st.isCharging ? (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] tracking-[0.25em] text-cyan-300 font-display animate-pulse">
                    ⚡ ЗАРЯДКА
                  </span>
                ) : st.reloading ? (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] tracking-[0.25em] text-amber-300">
                    ПЕРЕЗАРЯДКА
                  </span>
                ) : null}
              </div>
              <div>
                <div className={`hud-label mb-1.5 ${st.turretId === 'flamethrower' ? 'text-orange-300/80' : st.turretId === 'cannon' ? 'text-amber-300/80' : 'text-cyan-300/80'}`}>
                  {st.turretId === 'flamethrower' ? 'FIREBIRD · ОГНЕМЁТ' : st.turretId === 'cannon' ? 'СМОКИ · ПУШКА' : 'RAILGUN · РЕЛЬСОТРОН'}
                </div>
                {st.turretId === 'flamethrower' ? (
                  <div className="w-36 h-3.5 bg-white/10 rounded-sm overflow-hidden border border-amber-500/40 relative">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 transition-all duration-75"
                      style={{ width: `${Math.max(0, Math.min(100, st.ammo))}%` }}
                    />
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {Array.from({ length: s.magazine }).map((_, i) => (
                      <span key={i} className={`ammo-pip ${i < st.ammo ? st.turretId === 'cannon' ? 'cannon' : 'full' : ''}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === Подсказка управления === */}
          {showHint && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <div className="hud-panel hint-panel flex items-center gap-5 px-5 py-2 text-[10px] tracking-[0.18em] text-white/55">
                <span><b className="text-cyan-300">WASD</b> ДВИЖЕНИЕ</span>
                <span><b className="text-cyan-300">SHIFT</b> НИТРО</span>
                <span><b className="text-cyan-300">МЫШЬ</b> ОБЗОР/ПРИЦЕЛ</span>
                <span><b className="text-cyan-300">ЛКМ</b> ОГОНЬ · ЗАХВАТ МЫШИ</span>
                <span><b className="text-cyan-300">R</b> МАГАЗИН</span>
                <span><b className="text-cyan-300">ESC</b> ПАУЗА</span>
              </div>
            </div>
          )}

          {/* === Баннер волны === */}
          {banner && (
            <div key={banner.key} className="wave-banner">
              <div className="wave-banner-sub">ЗАФИКСИРОВАНО ПРИБЫТИЕ</div>
              <div className="wave-banner-text">ВОЛНА {banner.n}</div>
            </div>
          )}

          {/* === Popup «+ ФРАГ» === */}
          {frag && (
            <div key={frag.key} className="frag-popup">
              <span className="frag-plus">+ ФРАГ</span>
              <span className="frag-victim">{frag.victim}</span>
            </div>
          )}

          {/* === Табло счёта (TAB) === */}
          {st.showScore && (
            <div className="scoreboard-overlay">
              <div className="scoreboard-panel hud-panel">
                <div className="hud-label flex items-center gap-2 mb-3"><Trophy size={14} /> ТАБЛО БОЯ</div>
                <table className="scoreboard-table">
                  <thead>
                    <tr><th>ИМЯ</th><th>КОРПУС</th><th>БАШНЯ</th><th>ОРУЖИЕ</th><th>БРОНЯ</th></tr>
                  </thead>
                  <tbody>
                    {s.scoreboard.map((r, i) => (
                      <tr key={i} className={r.isPlayer ? 'row-player' : ''}>
                        <td className={r.alive ? '' : 'dead'}>{r.name}</td>
                        <td>{r.hull}</td>
                        <td>{r.turret}</td>
                        <td>{r.weapon === 'railgun' ? 'РЕЛЬСОТРОН' : r.weapon === 'flamethrower' ? 'ОГНЕМЁТ' : 'ПУШКА'}</td>
                        <td>
                          <div className="sb-hp">
                            <div style={{ width: `${Math.round(Math.max(0, Math.min(1, r.hpFrac)) * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== отрисовка миникарты =====
function drawMinimap(game: Game, cv: HTMLCanvasElement | null, buf: MinimapDynamic[]) {
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const S = cv.width;
  const scale = S / (MAP_HALF * 2);
  const toX = (x: number) => (x + MAP_HALF) * scale;
  const toY = (z: number) => (z + MAP_HALF) * scale;

  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(5,12,18,0.72)';
  ctx.fillRect(0, 0, S, S);

  // радарная развертка
  const t = performance.now() * 0.0012;
  const grad = ctx.createConicGradient ? ctx.createConicGradient(t, S / 2, S / 2) : null;
  if (grad) {
    grad.addColorStop(0, 'rgba(46,230,192,0.10)');
    grad.addColorStop(0.15, 'rgba(46,230,192,0)');
    grad.addColorStop(1, 'rgba(46,230,192,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
  }

  // статика
  for (const m of game.getMinimapStatic()) {
    if (m.kind === 'wall') {
      ctx.fillStyle = 'rgba(120,160,200,0.30)';
    } else if (m.kind === 'ramp') {
      ctx.fillStyle = 'rgba(130,170,220,0.35)';
    } else {
      ctx.fillStyle = m.alive ? 'rgba(255,176,46,0.55)' : 'rgba(90,80,70,0.18)';
    }
    ctx.fillRect(toX(m.x - m.w / 2), toY(m.z - m.d / 2), m.w * scale, m.d * scale);
  }

  // динамика
  game.fillMinimapDynamics(buf);
  for (const d of buf) {
    const x = toX(d.x);
    const y = toY(d.z);
    ctx.save();
    ctx.translate(x, y);
    // башня (линия прицела)
    ctx.strokeStyle = d.isPlayer ? 'rgba(46,230,192,0.8)' : 'rgba(255,80,60,0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(d.turret) * 7, -Math.cos(d.turret) * 7);
    ctx.stroke();
    // корпус (треугольник)
    ctx.rotate(Math.PI - d.yaw);
    ctx.fillStyle = d.isPlayer ? '#2ee6c0' : '#ff4d3d';
    ctx.shadowColor = ctx.fillStyle as string;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, -4.5);
    ctx.lineTo(3.4, 3.6);
    ctx.lineTo(-3.4, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
