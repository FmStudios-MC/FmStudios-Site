/* Opt-in audio for the farm (idea #14). Off by default; ships muted. A single
   WebAudio graph: a low fan-hum bed whose pitch + level ride the farm's heat
   load, plus a few short cues (buy blip, success chime, overheat klaxon). No
   files — everything is synthesised, so it adds nothing to the bundle.

   The AudioContext is created lazily on the first enable, which is always a
   user gesture (the toggle), satisfying the autoplay policy. Preference lives
   in its own localStorage key, not GameState — it's a device setting, not save
   data, so it never churns SAVE_VERSION. */

const KEY = "fmi.sft.sound";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

// Persistent fan-hum bed.
let humOsc: OscillatorNode | null = null;
let humSub: OscillatorNode | null = null;
let humFilter: BiquadFilterNode | null = null;
let humGain: GainNode | null = null;

let enabled = readPref();
let targetLoad = 0;

function readPref(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

function writePref(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable — keep the in-memory preference. */
  }
}

/** Build the audio graph once. Returns false if WebAudio is unavailable. */
function ensureContext(): boolean {
  if (ctx) return true;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return false;
  try {
    ctx = new AC();
  } catch {
    return false;
  }

  master = ctx.createGain();
  master.gain.value = 0; // faded in by setEnabled
  master.connect(ctx.destination);

  // Fan-hum bed: a detuned pair through a gentle low-pass, so it reads as
  // moving air rather than a tone. Level + cutoff track the heat load.
  humGain = ctx.createGain();
  humGain.gain.value = 0.0001;
  humFilter = ctx.createBiquadFilter();
  humFilter.type = "lowpass";
  humFilter.frequency.value = 220;
  humFilter.Q.value = 0.7;

  humOsc = ctx.createOscillator();
  humOsc.type = "sawtooth";
  humOsc.frequency.value = 70;
  humSub = ctx.createOscillator();
  humSub.type = "sine";
  humSub.frequency.value = 46;

  humOsc.connect(humFilter);
  humSub.connect(humFilter);
  humFilter.connect(humGain);
  humGain.connect(master);
  humOsc.start();
  humSub.start();

  return true;
}

/** Play a short enveloped tone. No-op unless enabled + context is live. */
function blip(
  freq: number,
  durSec: number,
  type: OscillatorType,
  peak: number,
  delaySec = 0,
): void {
  if (!enabled || !ctx || !master) return;
  const t0 = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.02);
}

function applyHum(): void {
  if (!ctx || !humGain || !humFilter || !humOsc) return;
  const t = ctx.currentTime;
  const load = Math.min(1.5, Math.max(0, targetLoad));
  // Stays a quiet bed even at full tilt — restraint over presence.
  const level = enabled ? 0.006 + load * 0.02 : 0.0001;
  humGain.gain.setTargetAtTime(level, t, 0.4);
  humFilter.frequency.setTargetAtTime(180 + load * 320, t, 0.4);
  humOsc.frequency.setTargetAtTime(66 + load * 26, t, 0.5);
}

export const sound = {
  isEnabled(): boolean {
    return enabled;
  },

  /** Toggle audio on/off. Creates/resumes the context on enable (a gesture).
      Returns the resulting state so the caller can reflect it. */
  setEnabled(on: boolean): boolean {
    enabled = on;
    writePref(on);
    if (on) {
      if (!ensureContext()) {
        enabled = false;
        writePref(false);
        return false;
      }
      ctx!.resume?.();
      master!.gain.setTargetAtTime(0.9, ctx!.currentTime, 0.05);
      applyHum();
    } else if (ctx && master) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    }
    return enabled;
  },

  /** Heat load (0..~1.5) drives the hum's level + pitch. Cheap; call freely. */
  setLoad(load: number): void {
    targetLoad = load;
    if (enabled) applyHum();
  },

  /** A small confirming click on purchase. */
  buy(): void {
    blip(440, 0.08, "triangle", 0.05);
  },

  /** A warm two-note chime on a win (contract, scripted op, milestone). */
  chime(): void {
    blip(660, 0.18, "sine", 0.06);
    blip(990, 0.22, "sine", 0.05, 0.09);
  },

  /** A soft two-tone klaxon on overheat onset; also a haptic buzz on mobile. */
  klaxon(): void {
    blip(330, 0.2, "square", 0.045);
    blip(247, 0.24, "square", 0.045, 0.18);
    this.haptic(40);
  },

  /** Optional haptic pulse (mobile), gated by the same opt-in. */
  haptic(ms: number): void {
    if (enabled && typeof navigator !== "undefined") navigator.vibrate?.(ms);
  },
};
