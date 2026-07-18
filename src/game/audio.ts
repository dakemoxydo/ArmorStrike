// ===== Процедурный звук на WebAudio =====
import type { WeaponType } from '../core/catalog';
import type { AudioPort } from './ports/AudioPort';

export type { AudioPort } from './ports/AudioPort';

export class AudioFX implements AudioPort {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private flameSource: AudioBufferSourceNode | null = null;
  private flameGain: GainNode | null = null;
  /** Active railgun charge oscillators (stopped hard on fire). */
  private chargeOscs: OscillatorNode[] = [];
  private chargeGains: GainNode[] = [];
  private chargeTickTimers: number[] = [];
  muted = false;

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
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  private env(gain: GainNode, t0: number, peak: number, attack: number, decay: number) {
    const g = gain.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  private noise(t0: number, dur: number, filterType: BiquadFilterType, f0: number, f1: number, peak: number) {
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
    src.connect(flt).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.1);
  }

  private osc(type: OscillatorType, t0: number, dur: number, f0: number, f1: number, peak: number) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t0 + dur);
    const g = this.ctx.createGain();
    this.env(g, t0, peak, 0.004, dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.1);
  }

  /** Rising charge hum + accelerating ticks. Cancel with stopChargeRailgun(). */
  chargeRailgun(duration = 1.1) {
    if (!this.ctx || !this.master) return;
    this.stopChargeRailgun(false);
    const t0 = this.ctx.currentTime;
    const dur = Math.max(0.2, duration);

    // Controllable layers so we can cut them on fire
    this.spawnChargeOsc('sine', t0, dur, 140, 980, 0.28);
    this.spawnChargeOsc('sawtooth', t0, dur, 68, 380, 0.16);
    this.spawnChargeOsc('triangle', t0, dur * 0.95, 220, 1400, 0.1);

    // Overcharge whine in final stretch
    const whineStart = t0 + dur * 0.78;
    this.spawnChargeOsc('sine', whineStart, dur * 0.28, 700, 1600, 0.22);
    this.spawnChargeOsc('square', whineStart, dur * 0.22, 180, 90, 0.08);

    // Accelerating capacitor ticks (scheduled; cleared if fire early)
    const tickCount = 14;
    for (let i = 0; i < tickCount; i++) {
      const u = (i + 1) / (tickCount + 1);
      // ease-in: more ticks near the end
      const when = t0 + dur * (u * u);
      const delayMs = Math.max(0, (when - this.ctx.currentTime) * 1000);
      const id = window.setTimeout(() => {
        if (!this.ctx || !this.master) return;
        // Only play if still charging (nodes still tracked)
        if (this.chargeOscs.length === 0) return;
        const tt = this.ctx.currentTime;
        this.osc('square', tt, 0.028, 880 + i * 40, 640, 0.07 + u * 0.06);
      }, delayMs);
      this.chargeTickTimers.push(id);
    }
  }

  /** Hard-cut charge (on fire) or soft fade (dispose/interrupt). */
  stopChargeRailgun(hard = true) {
    for (const id of this.chargeTickTimers) window.clearTimeout(id);
    this.chargeTickTimers = [];
    if (!this.ctx) {
      this.chargeOscs = [];
      this.chargeGains = [];
      return;
    }
    const t = this.ctx.currentTime;
    const fade = hard ? 0.012 : 0.06;
    for (let i = 0; i < this.chargeOscs.length; i++) {
      const g = this.chargeGains[i];
      const o = this.chargeOscs[i];
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        o.stop(t + fade + 0.02);
      } catch { /* already stopped */ }
    }
    this.chargeOscs = [];
    this.chargeGains = [];
  }

  private spawnChargeOsc(
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
    // Hold then slight swell into end
    g.gain.linearRampToValueAtTime(peak * 1.15, t0 + dur * 0.92);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.05);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.12);
    this.chargeOscs.push(o);
    this.chargeGains.push(g);
  }

  startFlameLoop() {
    if (!this.ctx || !this.master || this.flameSource || !this.noiseBuf) return;
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
    if (!this.ctx || !this.flameSource || !this.flameGain) return;
    const src = this.flameSource;
    this.flameGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    this.flameSource = null;
    this.flameGain = null;
    setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } }, 100);
  }

  shoot(weaponType: WeaponType = 'railgun') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (weaponType === 'flamethrower') {
      this.noise(t, 0.12, 'bandpass', 1200, 400, 0.28);
    } else if (weaponType === 'cannon') {
      this.osc('square', t, 0.14, 220, 35, 0.45);
      this.noise(t, 0.18, 'lowpass', 1400, 120, 0.5);
    } else {
      // Railgun snap: cut charge, then compact layered crack (fewer nodes = less main-thread spike)
      this.stopChargeRailgun(true);
      this.osc('sine', t, 0.16, 78, 26, 0.85);
      this.osc('square', t, 0.18, 240, 32, 0.5);
      this.noise(t, 0.06, 'highpass', 3800, 800, 0.65);
      this.osc('sine', t, 0.1, 2000, 320, 0.28);
      this.osc('sine', t + 0.03, 0.22, 900, 500, 0.12);
    }
  }

  explosion() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.7, 'lowpass', 950, 70, 0.9);
    this.osc('sine', t, 0.45, 62, 26, 0.8);
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

  waveHorn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.osc('sawtooth', t, 0.5, 140, 144, 0.2);
    this.osc('sawtooth', t + 0.24, 0.6, 187, 190, 0.2);
  }

  death() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.explosion();
    this.osc('sawtooth', t, 1.3, 220, 38, 0.4);
  }

  startEngine() {
    if (!this.ctx || !this.master || this.engineOsc) return;
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

  setEngine(ratio: number, boost = false) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const b = boost ? 1 : 0;
    this.engineOsc.frequency.setTargetAtTime(42 + ratio * 46 + b * 30, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.018 + ratio * 0.04 + b * 0.022, t, 0.08);
  }

  stopEngine() {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const osc = this.engineOsc;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    osc.stop(this.ctx.currentTime + 0.5);
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
  }
}
