// Porto Lumen — suara yang disintesis (WebAudio, tanpa berkas audio).
// Mesin, tembakan, sirene, dan bunyi misi semuanya dibuat dari osilator dan
// noise di sini. AudioContext baru dibuat saat interaksi pertama pemain.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenTimer = 0;
    this.sirenOn = false;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.engineGain) this.engineGain.gain.value = 0;
  }

  // Derau singkat (tembakan, tabrakan): buffer noise + filter + envelope.
  burst(dur, freq, vol) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t);
  }

  // Nada pendek (ambil barang, klik menu, misi selesai).
  blip(freq, dur, vol, type = 'sine') {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  shot() {
    this.burst(0.09, 1800, 0.25);
  }

  enemyShot() {
    this.burst(0.07, 1200, 0.12);
  }

  crash() {
    this.burst(0.25, 500, 0.35);
  }

  pickup() {
    this.blip(880, 0.12, 0.2);
    setTimeout(() => this.blip(1320, 0.15, 0.2), 90);
  }

  missionDone() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 0.22), i * 110));
  }

  // Dengung mesin mobil: satu osilator yang nadanya mengikuti kecepatan.
  engine(speedRatio) {
    if (this.muted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      return;
    }
    this.ensure();
    if (!this.ctx) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      this.engineOsc.connect(filter).connect(this.engineGain).connect(this.ctx.destination);
      this.engineOsc.start();
    }
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(50 + speedRatio * 140, t, 0.08);
    this.engineGain.gain.setTargetAtTime(speedRatio > 0.02 ? 0.05 + speedRatio * 0.05 : 0, t, 0.1);
  }

  // Sirene polisi: dua nada bergantian, dipanggil tiap frame saat wanted >= 1.
  siren(dt, wanted) {
    if (this.muted || wanted < 1) return;
    this.ensure();
    if (!this.ctx) return;
    this.sirenTimer -= dt;
    if (this.sirenTimer > 0) return;
    this.sirenTimer = 0.45;
    this.sirenOn = !this.sirenOn;
    this.blip(this.sirenOn ? 950 : 700, 0.4, 0.05, 'triangle');
  }
}
