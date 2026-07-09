// Souffle sonore Movaé — un guide respiratoire 100 % synthétisé (Web Audio),
// aucun fichier audio : une onde douce qui monte à l'inspiration et descend à
// l'expiration. Permet de suivre les exercices de respiration yeux fermés.

let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

export interface BreathPattern {
  inhale: number; // secondes
  hold?: number;
  exhale: number;
  holdOut?: number;
}

// Motifs par exercice (mêmes tempos que les étapes affichées).
export const BREATH_PATTERNS: Record<string, BreathPattern> = {
  "respiration-446": { inhale: 4, hold: 4, exhale: 6 },
  "coherence-55": { inhale: 5, exhale: 5 },
  "respiration-ventrale": { inhale: 4, exhale: 6 },
  "respiration-carree": { inhale: 4, hold: 4, exhale: 4, holdOut: 4 },
  "expiration-longue": { inhale: 4, exhale: 8 },
  "soupir-physiologique": { inhale: 1.5, hold: 1, exhale: 6 },
  "micro-repos-yeux": { inhale: 4, exhale: 6 },
  "horizon-respire": { inhale: 4, exhale: 6 },
  "pause-lumiere": { inhale: 4, exhale: 6 },
  "vague-respiration": { inhale: 4, exhale: 5 },
};

export function hasBreathGuide(exerciseId: string): boolean {
  return exerciseId in BREATH_PATTERNS;
}

function cycle(pattern: BreathPattern) {
  if (!ctx || !osc || !gain) return;
  const now = ctx.currentTime;
  const g = gain.gain;
  const f = osc.frequency;
  g.cancelScheduledValues(now);
  f.cancelScheduledValues(now);
  let t = now;
  // Inspiration : le son monte (220 → 330 Hz) et s'ouvre.
  g.setValueAtTime(0.001, t);
  g.linearRampToValueAtTime(0.05, t + pattern.inhale);
  f.setValueAtTime(220, t);
  f.linearRampToValueAtTime(330, t + pattern.inhale);
  t += pattern.inhale;
  if (pattern.hold) {
    g.setValueAtTime(0.05, t + pattern.hold);
    f.setValueAtTime(330, t + pattern.hold);
    t += pattern.hold;
  }
  // Expiration : redescend et se referme.
  g.linearRampToValueAtTime(0.001, t + pattern.exhale);
  f.linearRampToValueAtTime(200, t + pattern.exhale);
  t += pattern.exhale;
  if (pattern.holdOut) t += pattern.holdOut;
}

export function startBreathGuide(exerciseId: string): boolean {
  const pattern = BREATH_PATTERNS[exerciseId];
  if (!pattern || typeof window === "undefined") return false;
  try {
    stopBreathGuide();
    ctx = new AudioContext();
    osc = ctx.createOscillator();
    gain = ctx.createGain();
    const soft = ctx.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 600;
    osc.type = "sine";
    gain.gain.value = 0.001;
    osc.connect(soft).connect(gain).connect(ctx.destination);
    osc.start();
    const total =
      (pattern.inhale + (pattern.hold ?? 0) + pattern.exhale + (pattern.holdOut ?? 0)) * 1000;
    cycle(pattern);
    timer = setInterval(() => cycle(pattern), total);
    return true;
  } catch {
    return false;
  }
}

export function stopBreathGuide(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (gain && ctx) {
    try {
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    } catch {
      /* ignore */
    }
  }
  const oldCtx = ctx;
  osc = null;
  gain = null;
  ctx = null;
  if (oldCtx) setTimeout(() => oldCtx.close().catch(() => {}), 400);
}
