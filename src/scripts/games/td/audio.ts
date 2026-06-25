/* Synthesized SFX via the Web Audio API — no asset files. Diegetic and quiet:
   this is a workshop, not an arcade. Everything is procedural envelopes on a
   couple of oscillators / a noise burst, routed through one master gain that
   the mute toggle zeroes. The context is created lazily on the first sound and
   resumed on the first user gesture (autoplay policy). Lives outside the engine
   (an output layer, like the renderer) so engine.ts stays pure. */

export type Sfx =
  | "place"
  | "upgrade"
  | "sell"
  | "fire"
  | "wave"
  | "clear"
  | "leak"
  | "boss"
  | "ability"
  | "surge"
  | "over"
  | "deny";

export interface AudioKit {
  setMuted(m: boolean): void;
  resume(): void;
  play(s: Sfx): void;
}

export function createAudio(initialMuted: boolean): AudioKit {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = initialMuted;
  let lastFire = 0; // throttle the per-shot tick so swarms don't roar

  const AC: typeof AudioContext | undefined =
    typeof window !== "undefined"
      ? (window.AudioContext ?? (window as any).webkitAudioContext)
      : undefined;

  function ensure(): boolean {
    if (muted) return false;
    if (!ctx) {
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return true;
  }

  /** One enveloped oscillator. */
  function tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    when = 0,
    glideTo?: number,
  ) {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A short filtered-noise burst (thuds, EMP wash). */
  function noise(dur: number, gain: number, cutoff: number, when = 0) {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  function play(s: Sfx) {
    if (!ensure() || !ctx) return;
    switch (s) {
      case "fire": {
        const now = ctx.currentTime;
        if (now - lastFire < 0.05) return;
        lastFire = now;
        tone(620, 0.05, "triangle", 0.05);
        break;
      }
      case "place":
        tone(330, 0.08, "triangle", 0.14);
        tone(495, 0.1, "sine", 0.1, 0.04);
        break;
      case "upgrade":
        tone(440, 0.1, "triangle", 0.12);
        tone(660, 0.12, "sine", 0.12, 0.06);
        tone(880, 0.14, "sine", 0.09, 0.12);
        break;
      case "sell":
        tone(360, 0.12, "sine", 0.12, 0, 200);
        break;
      case "wave":
        tone(196, 0.18, "sawtooth", 0.08, 0, 261);
        tone(392, 0.2, "sine", 0.06, 0.02);
        break;
      case "clear":
        tone(523, 0.14, "sine", 0.12);
        tone(659, 0.16, "sine", 0.12, 0.08);
        tone(784, 0.22, "sine", 0.11, 0.16);
        break;
      case "leak":
        tone(120, 0.22, "sine", 0.18, 0, 60);
        noise(0.16, 0.12, 600);
        break;
      case "boss":
        tone(70, 0.7, "sawtooth", 0.12, 0, 110);
        tone(110, 0.7, "sine", 0.08, 0.05);
        noise(0.5, 0.06, 400);
        break;
      case "ability":
        tone(523, 0.16, "triangle", 0.12, 0, 1046);
        tone(784, 0.18, "sine", 0.08, 0.05);
        break;
      case "surge":
        tone(880, 0.2, "sine", 0.12, 0, 220);
        noise(0.22, 0.14, 1800);
        break;
      case "over":
        tone(220, 0.6, "sawtooth", 0.12, 0, 90);
        tone(146, 0.7, "sine", 0.1, 0.08, 70);
        noise(0.5, 0.08, 500);
        break;
      case "deny":
        tone(180, 0.08, "square", 0.06, 0, 120);
        break;
    }
  }

  return {
    setMuted(m: boolean) {
      muted = m;
      if (master && ctx) master.gain.value = m ? 0 : 0.5;
    },
    resume() {
      if (!muted) ensure();
    },
    play,
  };
}
