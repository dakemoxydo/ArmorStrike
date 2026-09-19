// ===== Процедурный звук на WebAudio =====
import type { WeaponType } from '../core/catalog';
import type { AudioPort, RailgunChargeHandle } from './ports/AudioPort';

/** Per-charge voice state — one session per RailgunWeapon, never shared. */
interface ChargeSession {
  oscs: OscillatorNode[];
  gains: GainNode[];
  /** Base f0/f1 per layer — captured at spawn so pitch rescale stays stable. */
  baseFreqs: Array<{ f0: number; f1: number }>;
  tickTimers: number[];
}

const MUTE_LS_KEY = 'as2_muted';

/** Загрузить сохранённый mute (как graphicsQuality.loadQuality: тихо при битой схеме). */
export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_LS_KEY) === '1';
  } catch { /* ignore */ }
  return false;
}

function saveMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_LS_KEY, m ? '1' : '0');
  } catch { /* ignore */ }
}

export class AudioFX implements AudioPort {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private flameSource: AudioBufferSourceNode | null = null;
  private flameGain: GainNode | null = null;
  /**
   * Live railgun charge sessions keyed by handle id. Each RailgunWeapon owns
   * its session: a second charge starting never cuts the first one, and a
   * fire/cancel only stops the voice its owner started (shared arrays used to
   * mute sibling railguns charging in the same frame).
   */
  private chargeSessions = new Map<number, ChargeSession>();
  private nextChargeId = 1;
  /**
   * Engine voice state. The oscillator is created once and NEVER stopped —
   * stop/start just ramps its gain, so rapid transitions can't spawn a second
   * overlapping voice (H-5) and setEngine can't creep volume back up behind a
   * stopEngine (death-cam hum).
   */
  private engineOn = false;
  /** Persisted across sessions via localStorage (BACKLOG G2). */
  muted = loadMuted();
  private paused = false;
  /** Позиция и ориентация слушателя (игрок/камера) для пространственного 3D-звука (G1). */
  private listenerPos = { x: 0, z: 0, yaw: 0 };
  private hasListener = false;
  /** Кросс-таб синк mute: соседняя вкладка пишет as2_muted — этот инстанс
   * обязан подхватить флаг, иначе kill-feed иконка (HudModel.muted) врёт. */
  private storageHandler: ((e: StorageEvent) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this.storageHandler = (e: StorageEvent) => {
        if (e.key !== MUTE_LS_KEY) return;
        const m = e.newValue === '1';
        if (this.muted === m) return;
        this.muted = m;
        if (this.master && this.ctx) {
          this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
        }
      };
      window.addEventListener('storage', this.storageHandler);
    }
  }

  setListener(x: number, z: number, yaw: number) {
    this.listenerPos.x = x;
    this.listenerPos.z = z;
    this.listenerPos.yaw = yaw;
    this.hasListener = true;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      // Компрессор/лимитер — защита от клиппинга при одновременных залпах
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 24;
      comp.ratio.value = 8;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended' && !this.paused) void this.ctx.resume();
  }

  /**
   * Mirror the game pause: suspend the WebAudio clock so scheduled voices
   * (the railgun charge hum) freeze mid-envelope rather than running to their
   * scheduled end behind the pause scrim, and stop charge ticks from playing.
   * No-op before a context exists; idempotent.
   */
  setPaused(p: boolean) {
    if (this.paused === p) return;
    this.paused = p;
    if (!this.ctx) return;
    if (p) {
      void this.ctx.suspend().catch(() => undefined);
    } else {
      void this.ctx.resume().catch(() => undefined);
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    saveMuted(m);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  /** Full teardown (L-5): stop voices, clear timers, close the context. */
  dispose() {
    if (this.storageHandler && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
    for (const handle of this.liveChargeHandles()) this.stopChargeRailgun(handle, false);
    this.flameUsers = 0; // force-stop the shared flame voice below
    this.stopFlameLoop();
    this.stopEngine();
    this.engineOn = false;
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      this.master = null;
      this.noiseBuf = null;
      this.engineOsc = null;
      this.engineGain = null;
      this.engineFilter = null;
      this.flameSource = null;
      this.flameGain = null;
      this.chargeSessions.clear();
      void ctx.close().catch(() => undefined);
    }
  }

  private env(gain: GainNode, t0: number, peak: number, attack: number, decay: number) {
    const g = gain.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  private noise(t0: number, dur: number, filterType: BiquadFilterType, f0: number, f1: number, peak: number, dest?: AudioNode) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = this.ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.setValueAtTime(f0, t0);
    flt.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t0 + dur);
    const g = this.ctx.createGain();
    this.env(g, t0, peak, 0.005, dur);
    src.connect(flt).connect(g).connect(dest ?? this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.1);
  }

  private osc(type: OscillatorType, t0: number, dur: number, f0: number, f1: number, peak: number, dest?: AudioNode) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t0 + dur);
    const g = this.ctx.createGain();
    this.env(g, t0, peak, 0.004, dur);
    o.connect(g).connect(dest ?? this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.1);
  }

  /**
   * Вычисляет пространственную шину (spatial bus) для звука в мировых координатах (G1):
   * - Затухание громкости с расстоянием (квадратичное падение от 8 м до 90 м, отсечка свыше 90 м)
   * - Стерео-панорамирование через StereoPannerNode относительно курса слушателя (lookYaw)
   * - Заднее приглушение (head shadow / lowpass filter 3800 Гц), если источник за спиной
   * - Если pos не указан (выстрел игрока, UI) — возвращает master-шину без задержек и затухания
   */
  private getSpatialBus(pos?: { x: number; z: number }): AudioNode | null {
    if (!this.ctx || !this.master) return null;
    if (!pos || !this.hasListener) return this.master;

    const dx = pos.x - this.listenerPos.x;
    const dz = pos.z - this.listenerPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 90) return null; // Отсечка звуков свыше 90 м

    const normDist = Math.max(0, (dist - 8) / (90 - 8));
    let volume = Math.max(0, (1 - normDist) * (1 - normDist));
    if (volume < 0.005) return null;

    const yaw = this.listenerPos.yaw;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const relX = dx * cosYaw - dz * sinYaw;
    const relZ = dx * sinYaw + dz * cosYaw;
    const pan = Math.max(-1, Math.min(1, relX / Math.max(dist, 1)));

    const isBehind = relZ < -2;
    if (isBehind) {
      volume *= 0.82;
    }

    const busGain = this.ctx.createGain();
    busGain.gain.value = volume;
    let lastNode: AudioNode = busGain;

    if (isBehind) {
      const rearFilter = this.ctx.createBiquadFilter();
      rearFilter.type = 'lowpass';
      rearFilter.frequency.value = 3800;
      lastNode.connect(rearFilter);
      lastNode = rearFilter;
    }

    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      lastNode.connect(panner);
      lastNode = panner;
    }

    lastNode.connect(this.master);
    return busGain;
  }

  /** Rising charge hum + accelerating ticks. Cancel with stopChargeRailgun(handle). */
  chargeRailgun(duration = 1.0): RailgunChargeHandle {
    const handle: RailgunChargeHandle = { id: this.nextChargeId++ };
    if (!this.ctx || !this.master) return handle;
    const session: ChargeSession = { oscs: [], gains: [], baseFreqs: [], tickTimers: [] };
    const t0 = this.ctx.currentTime;
    const dur = Math.max(0.2, duration);

    // Controllable layers so we can cut them on fire
    this.spawnChargeOsc(session, 'sine', t0, dur, 110, 980, 0.3);
    this.spawnChargeOsc(session, 'sawtooth', t0, dur, 55, 380, 0.18);
    this.spawnChargeOsc(session, 'triangle', t0, dur * 0.95, 220, 1400, 0.12);

    // Overcharge whine in final stretch
    const whineStart = t0 + dur * 0.72;
    this.spawnChargeOsc(session, 'sine', whineStart, dur * 0.28, 700, 1600, 0.24);
    this.spawnChargeOsc(session, 'square', whineStart, dur * 0.22, 180, 90, 0.09);

    // Accelerating capacitor ticks (scheduled; cleared if fire early)
    const tickCount = 14;
    for (let i = 0; i < tickCount; i++) {
      const u = (i + 1) / (tickCount + 1);
      // ease-in: more ticks near the end
      const when = t0 + dur * (u * u);
      const delayMs = Math.max(0, (when - this.ctx.currentTime) * 1000);
      const id = window.setTimeout(() => {
        const s = this.chargeSessions.get(handle.id);
        if (!s || !this.ctx || !this.master) return;
        // Paused: the hum is frozen via ctx.suspend and the accelerating tick
        // cadence is meaningless against a stopped clock — skip (don't stack a
        // burst of deferred blips on resume).
        if (this.paused) return;
        // Only play while this session is still charging.
        const tt = this.ctx.currentTime;
        this.osc('square', tt, 0.028, 880 + i * 40, 640, 0.07 + u * 0.06);
      }, delayMs);
      session.tickTimers.push(id);
    }
    this.chargeSessions.set(handle.id, session);
    return handle;
  }

  /** Hard-cut charge (on fire) or soft fade (dispose/interrupt). */
  stopChargeRailgun(handle: RailgunChargeHandle, hard = true) {
    const session = this.chargeSessions.get(handle.id);
    if (!session) return;
    this.chargeSessions.delete(handle.id);
    for (const id of session.tickTimers) window.clearTimeout(id);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const fade = hard ? 0.012 : 0.06;
    for (let i = 0; i < session.oscs.length; i++) {
      const g = session.gains[i];
      const o = session.oscs[i];
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        o.stop(t + fade + 0.02);
      } catch { /* already stopped */ }
    }
  }

  /** Snapshot of live charge handles (teardown iterates it). */
  private liveChargeHandles(): RailgunChargeHandle[] {
    return [...this.chargeSessions.keys()].map((id) => ({ id }));
  }

  /**
   * Live pitch boost for that charge voice. progress ∈ [0,1].
   * Ramps target frequency by up to 35% at full charge using a squared curve
   * so the whine rises sharply in the last ~30% — matches the visual "overcharge" feel.
   * No-op for an unknown/finished handle (cancel / death / fire safety).
   */
  setChargeRailgunPitch(handle: RailgunChargeHandle, progress: number): void {
    const session = this.chargeSessions.get(handle.id);
    if (!session || !this.ctx) return;
    const p2 = Math.min(1, Math.max(0, progress)) ** 2;
    const mul = 1 + p2 * 0.35; // 1.0 → 1.35× at full charge
    const t = this.ctx.currentTime;
    for (let i = 0; i < session.oscs.length; i++) {
      const base = session.baseFreqs[i];
      if (!base) continue;
      const o = session.oscs[i];
      try {
        // Rescale the ramp's endpoint; current value follows naturally via WebAudio interpolation.
        o.frequency.cancelScheduledValues(t);
        o.frequency.setValueAtTime(o.frequency.value, t);
        o.frequency.linearRampToValueAtTime(base.f1 * mul, t + 0.04);
      } catch { /* already stopped */ }
    }
  }

  /** Per-pierce ping: crunchy armor penetration crunch + electric sizzle. */
  railgunPierce(index: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Metallic punch: descending low-end strike + upper bite
    const f0 = Math.max(280, 950 - index * 200);
    const f1 = Math.max(90, f0 * 0.32);
    const peak = Math.max(0.09, 0.32 - index * 0.06);
    this.osc('square', t, 0.07, f0, f1, peak * 0.85);
    this.osc('triangle', t, 0.11, f0 * 1.6, f1, peak);
    // Heavy armor crunch noise layer
    this.noise(t, 0.065, 'bandpass', 1800 - index * 300, 450, peak * 1.05);
    this.noise(t, 0.035, 'highpass', 3200 - index * 400, 1400, peak * 0.85);
  }

  private spawnChargeOsc(
    session: ChargeSession,
    type: OscillatorType, t0: number, dur: number, f0: number, f1: number, peak: number,
  ) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + 0.04);
    // Pre-fire anticipation gap: swell up to ~0.07s before end, then plunge into vacuum
    const gapStart = t0 + Math.max(0.05, dur - 0.07);
    g.gain.linearRampToValueAtTime(peak * 1.25, gapStart);
    g.gain.exponentialRampToValueAtTime(0.0001, Math.min(gapStart + 0.05, t0 + dur));
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.12);
    session.oscs.push(o);
    session.gains.push(g);
    session.baseFreqs.push({ f0, f1 });
  }

  /**
   * Firebird weapons currently firing. The flame loop is ONE shared voice for
   * the whole match (constant node budget), so it is ref-counted: it must
   * fade out only when the LAST weapon stops — the first weapon's stop used
   * to mute a still-firing sibling.
   */
  private flameUsers = 0;

  startFlameLoop() {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    this.flameUsers += 1;
    // Voice already running for another firebird — keep it (single shared loop).
    if (this.flameSource) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 950;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.32, this.ctx.currentTime + 0.08);
    src.connect(flt).connect(g).connect(this.master);
    src.start();
    this.flameSource = src;
    this.flameGain = g;
  }

  stopFlameLoop() {
    // Ref-counted shared voice: only the last stop actually fades it out.
    if (this.flameUsers > 0) this.flameUsers -= 1;
    if (this.flameUsers > 0) return;
    if (!this.ctx || !this.flameSource || !this.flameGain) return;
    const src = this.flameSource;
    this.flameGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    this.flameSource = null;
    this.flameGain = null;
    setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } }, 100);
  }

  shoot(weaponType: WeaponType = 'railgun', pos?: { x: number; z: number }) {
    if (!this.ctx) return;
    const dest = this.getSpatialBus(pos);
    if (!dest) return;
    const t = this.ctx.currentTime;

    if (weaponType === 'flamethrower') {
      this.noise(t, 0.12, 'bandpass', 1200, 400, 0.28, dest);
      this.osc('sawtooth', t, 0.08, 180, 50, 0.18, dest);
    } else if (weaponType === 'cannon') {
      // Sub-bass thump (тяжёлый калибр Смоки)
      this.osc('sine', t, 0.20, 65, 24, 0.65, dest);
      // Механический толчок каморы
      this.osc('square', t, 0.14, 220, 35, 0.45, dest);
      // Взрывное расширение газов
      this.noise(t, 0.18, 'lowpass', 1400, 120, 0.5, dest);
    } else if (weaponType === 'gauss') {
      // Gauss discharge: heavy electromagnetic crack, supersonic slug sonic-boom
      this.osc('sine', t, 0.35, 72, 16, 1.0, dest); // Sub-bass pressure
      this.osc('sawtooth', t, 0.18, 380, 42, 0.75, dest); // Magnetic acceleration thump
      this.osc('triangle', t, 0.09, 1800, 160, 0.65, dest); // High metallic rip
      this.noise(t, 0.055, 'highpass', 5800, 1400, 0.95, dest); // Ionized air crack
      this.noise(t + 0.02, 0.28, 'bandpass', 1100, 320, 0.35, dest); // Shockwave dissipation
    } else if (weaponType === 'isida') {
      // Isida nano-beam discharge: futuristic high-frequency plasma sizzle + harmonic pulse
      this.osc('sawtooth', t, 0.09, 920, 420, 0.26, dest);
      this.osc('triangle', t, 0.07, 1600, 780, 0.18, dest);
      this.osc('sine', t, 0.08, 160, 55, 0.32, dest);
      this.noise(t, 0.07, 'bandpass', 2900, 1100, 0.24, dest);
    } else {
      // Railgun snap: cinematic layered crack & sub-bass thump.
      // Layer 1: Sub-bass boom (56 -> 20 Hz, solid chest impact)
      this.osc('sine', t, 0.28, 56, 20, 0.95, dest);
      // Layer 2: Mechanical slug punch / magnetic kick
      this.osc('square', t, 0.14, 180, 28, 0.6, dest);
      // Layer 3: High supersonic transient crack (air rip)
      this.noise(t, 0.045, 'highpass', 4500, 1100, 0.85, dest);
      this.osc('sawtooth', t, 0.06, 2600, 380, 0.45, dest);
      // Layer 4: Plasma sizzle & acoustic dissipation tail
      this.noise(t + 0.015, 0.32, 'bandpass', 1600, 420, 0.28, dest);
      this.osc('sine', t + 0.02, 0.22, 680, 180, 0.16, dest);
    }
  }

  explosion(pos?: { x: number; z: number }) {
    if (!this.ctx) return;
    const dest = this.getSpatialBus(pos);
    if (!dest) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.7, 'lowpass', 950, 70, 0.9, dest);
    this.osc('sine', t, 0.45, 62, 26, 0.8, dest);
  }

  hitEnemy() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('triangle', t, 0.09, 820, 320, 0.28);
    this.noise(t, 0.06, 'highpass', 2200, 1200, 0.16);
  }

  hitPlayer() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('sawtooth', t, 0.18, 210, 70, 0.3);
    this.noise(t, 0.16, 'lowpass', 600, 150, 0.35);
  }

  /**
   * Акцент критического попадания: звонкий верх (1500→820 Гц) + короткая
   * металлическая стружка. Крит должен читаться на слух, даже когда числа
   * урона выключены в настройках.
   */
  critHit() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('triangle', t, 0.12, 1500, 820, 0.3);
    this.osc('sine', t + 0.02, 0.16, 2300, 1500, 0.14);
    this.noise(t, 0.045, 'highpass', 5200, 2600, 0.2);
  }

  reload() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('square', t, 0.045, 480, 420, 0.14);
    this.osc('square', t + 0.14, 0.05, 640, 560, 0.16);
  }

  click() {
    if (!this.ctx) return;
    this.osc('triangle', this.ctx.currentTime, 0.05, 900, 620, 0.14);
  }

  lockWarning() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Двухтональный тревожный зуммер захвата цели
    this.osc('square', t, 0.065, 880, 880, 0.22);
    this.osc('square', t + 0.08, 0.065, 1175, 1175, 0.25);
  }

  death() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.explosion();
    this.osc('sawtooth', t, 1.3, 220, 38, 0.4);
  }

  startEngine() {
    if (!this.ctx || !this.master) return;
    if (this.engineOn) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 42;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 260;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
      this.engineOsc.start();
    }
    // Cancel any pending fade-out from a previous stopEngine.
    this.engineGain!.gain.cancelScheduledValues(this.ctx.currentTime);
    this.engineOn = true;
  }

  setEngine(ratio: number, boost = false) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || !this.engineOn) return;
    const t = this.ctx.currentTime;
    const b = boost ? 1 : 0;
    this.engineOsc.frequency.setTargetAtTime(42 + ratio * 46 + b * 30, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.018 + ratio * 0.04 + b * 0.022, t, 0.08);
  }

  stopEngine() {
    if (!this.ctx || !this.engineGain || !this.engineOn) return;
    // Fade to silence; the oscillator keeps running muted — restarting later
    // just ramps the same voice back up (no overlapping engines, H-5).
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    this.engineOn = false;
  }
}
