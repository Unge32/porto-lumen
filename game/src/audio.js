// All sound is synthesized with WebAudio: no audio files, no network.
// An engine hum follows the car's speed, a siren wails when the police
// are close, and short blips mark shots, pickups and paydays.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  function noiseBuffer(duration) {
    const c = ensure();
    const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function blip(freq, duration, type, volume, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      if (sirenGain) sirenGain.gain.value = 0;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(0.14);
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2400;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.5, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start();
      blip(160, 0.08, 'square', 0.18, 60);
    },
    hit() {
      blip(320, 0.07, 'triangle', 0.2, 180);
    },
    pickup() {
      blip(660, 0.09, 'sine', 0.25, 990);
    },
    crash() {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(0.25);
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.6, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start();
    },
    explosion() {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(0.7);
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, c.currentTime);
      filter.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.7);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.8, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.7);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start();
    },
    missionDone() {
      blip(523, 0.12, 'sine', 0.25);
      setTimeout(() => blip(659, 0.12, 'sine', 0.25), 110);
      setTimeout(() => blip(784, 0.22, 'sine', 0.28), 220);
    },
    busted() {
      blip(220, 0.3, 'sawtooth', 0.2, 110);
    },
    // Continuous layers, driven every frame from the game state.
    engine(speed01, on) {
      const c = ensure();
      if (!c) return;
      if (!engineOsc) {
        engineOsc = c.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = c.createGain();
        engineGain.gain.value = 0;
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(c.destination);
        engineOsc.start();
      }
      const target = on && !muted ? 0.05 + speed01 * 0.06 : 0;
      engineGain.gain.setTargetAtTime(target, c.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, c.currentTime, 0.08);
    },
    siren(on) {
      const c = ensure();
      if (!c) return;
      if (!sirenOsc) {
        sirenOsc = c.createOscillator();
        sirenOsc.type = 'sine';
        sirenGain = c.createGain();
        sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(c.destination);
        sirenOsc.start();
        sirenOsc.frequency.value = 700;
      }
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.035 : 0, c.currentTime, 0.2);
      if (on) {
        const t = c.currentTime % 1.2;
        sirenOsc.frequency.setTargetAtTime(t < 0.6 ? 720 : 540, c.currentTime, 0.05);
      }
    },
  };
}
