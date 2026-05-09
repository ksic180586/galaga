// ============================================================
// audio.js — Web Audio API synthesized sound effects
// ============================================================

class AudioManager {
  constructor() {
    this.enabled = true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  _tone(freq, dur, { type = 'square', vol = 0.12, freqEnd, detune = 0 } = {}) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t + dur);
    if (detune)  osc.detune.setValueAtTime(detune, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  _noise(dur, vol = 0.3, cutoff = 1200) {
    if (!this.enabled) return;
    const sr  = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.ceil(sr * dur), sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.3));
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start();
    src.stop(this.ctx.currentTime + dur);
  }

  shoot()       { this._tone(900, 0.09, { type: 'square', vol: 0.08, freqEnd: 400 }); }
  enemyShoot()  { this._tone(260, 0.12, { type: 'sawtooth', vol: 0.06, freqEnd: 130 }); }
  playerHit()   { this._tone(160, 0.25, { type: 'sawtooth', vol: 0.18, freqEnd: 60 }); this._noise(0.3, 0.2, 600); }

  explode(big = false) {
    const vol = big ? 0.45 : 0.25;
    const cut = big ? 600 : 1000;
    this._noise(big ? 0.6 : 0.35, vol, cut);
    if (big) this._tone(80, 0.6, { type: 'sine', vol: 0.15, freqEnd: 30 });
  }

  powerup() {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.14, { type: 'sine', vol: 0.12 }), i * 75);
    });
  }

  levelUp() {
    if (!this.enabled) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.18, { type: 'sine', vol: 0.14 }), i * 90);
    });
  }

  bossIntro() {
    if (!this.enabled) return;
    this._tone(110, 0.8,  { type: 'sawtooth', vol: 0.2 });
    setTimeout(() => this._tone(80, 1.2, { type: 'sawtooth', vol: 0.2, freqEnd: 55 }), 700);
    this._noise(1.5, 0.15, 400);
  }

  victory() {
    if (!this.enabled) return;
    [784, 880, 1047, 880, 1047, 1319].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.2, { type: 'sine', vol: 0.14 }), i * 110);
    });
  }
}
