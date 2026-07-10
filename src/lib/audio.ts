// Souffle sonore Movaé — un guide respiratoire 100 % synthétisé (Web Audio),
// aucun fichier audio : une onde douce qui monte à l'inspiration et descend à
// l'expiration. Permet de suivre les exercices de respiration yeux fermés.

let ctx: AudioContext | null = null;
let noise: AudioBufferSourceNode | null = null;
let filter: BiquadFilterNode | null = null;
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

// Un cycle de souffle : de l'air, pas une note. Le bruit s'ouvre et devient
// plus « clair » à l'inspiration, puis se referme lentement à l'expiration.
function cycle(pattern: BreathPattern) {
  if (!ctx || !filter || !gain) return;
  const now = ctx.currentTime;
  const g = gain.gain;
  const f = filter.frequency;
  g.cancelScheduledValues(now);
  f.cancelScheduledValues(now);
  let t = now;
  // Inspiration : le souffle s'ouvre (grave → clair).
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(0.16, t + pattern.inhale);
  f.setValueAtTime(320, t);
  f.exponentialRampToValueAtTime(1100, t + pattern.inhale);
  t += pattern.inhale;
  if (pattern.hold) {
    g.setValueAtTime(0.1, t);
    g.linearRampToValueAtTime(0.09, t + pattern.hold);
    f.setValueAtTime(900, t + pattern.hold);
    t += pattern.hold;
  }
  // Expiration : long soupir qui redescend et s'éteint.
  g.setValueAtTime(0.14, t);
  g.exponentialRampToValueAtTime(0.0001, t + pattern.exhale);
  f.exponentialRampToValueAtTime(240, t + pattern.exhale);
  t += pattern.exhale;
  if (pattern.holdOut) g.setValueAtTime(0.0001, t + pattern.holdOut);
}

export function startBreathGuide(exerciseId: string): boolean {
  const pattern = BREATH_PATTERNS[exerciseId];
  if (!pattern || typeof window === "undefined") return false;
  try {
    stopBreathGuide();
    ctx = new AudioContext();
    // Souffle = bruit rose approximé (bruit blanc lissé), en boucle.
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.94 + white * 0.06; // lissage : moins agressif qu'un bruit blanc
      data[i] = last * 6;
    }
    noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 320;
    filter.Q.value = 0.7;
    gain = ctx.createGain();
    gain.gain.value = 0.0001;
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
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
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    } catch {
      /* ignore */
    }
  }
  const oldCtx = ctx;
  noise = null;
  filter = null;
  gain = null;
  ctx = null;
  if (oldCtx) setTimeout(() => oldCtx.close().catch(() => {}), 400);
}
