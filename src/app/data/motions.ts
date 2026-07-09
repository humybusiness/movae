// Archétypes de mouvement pour les figures d'exercice.
//
// Quatre vues complémentaires :
//  - "side"  : personnage assis/debout de profil (squelette articulé)
//  - "front" : personnage de face (inclinaisons, rotations, épaules)
//  - "face"  : gros plan visage (exercices oculaires)
//  - "hands" : gros plan mains/avant-bras (poignets, doigts)
//
// Chaque archétype décrit 2-3 poses clés interpolées + des flèches de
// mouvement + la zone du corps mise en évidence. En mode statique, la figure
// affiche la pose de départ en fantôme et la pose finale en plein : le
// mouvement se comprend sans lire ni attendre une animation.

export type HighlightZone =
  | "tete"
  | "nuque"
  | "epaules"
  | "haut-dos"
  | "bas-dos"
  | "poitrine"
  | "poignets"
  | "hanches"
  | "jambes"
  | "yeux"
  | "ventre"
  | "corps";

export interface SidePose {
  torso?: number; // inclinaison du buste depuis la verticale, + = vers l'avant
  head?: number; // flexion de la tête relative au buste, + = menton vers le bas
  headX?: number; // translation avant/arrière (rétraction du menton)
  shoulderLift?: number; // élévation de l'épaule (roulements)
  shoulderShift?: number; // avancée/recul de l'épaule
  armNear?: { sh: number; el: number } | null; // épaule (0 = bras le long, + = vers l'avant/haut), coude (flexion)
  armFar?: { sh: number; el: number } | null;
  thigh?: number; // cuisse depuis l'horizontale, + = genou levé
  shin?: number; // tibia depuis la verticale, + = pied vers l'avant
  foot?: number; // pointe du pied, + = pointe levée
  thighFar?: number;
  shinFar?: number;
  footFar?: number;
  pelvisY?: number; // élévation du bassin (assis-debout)
  belly?: number; // 0..1 respiration ventrale
  gaze?: number; // 0 = proche, 1 = lointain (cible visuelle)
}

export interface FrontPose {
  tilt?: number; // inclinaison latérale de la tête, + = vers la droite
  turn?: number; // rotation de la tête -1..1
  nod?: number; // tête vers le bas
  twist?: number; // rotation du buste -1..1
  bend?: number; // inclinaison latérale du buste, + = vers la droite
  shrug?: number; // 0..1 élévation des épaules
  grow?: number; // 0..1 auto-grandissement
  hipShift?: number; // -1..1 translation latérale du bassin
  knees?: number; // 0..1 ouverture des genoux
  armL?: { sh: number; el: number } | null; // 0 = le long du corps, + = s'écarte, négatif = croise le corps
  armR?: { sh: number; el: number } | null;
}

export type FaceKind = "palming" | "eye-circles" | "eye-eight" | "eye-sweep" | "blink" | "rest-closed";
export type HandsKind =
  | "wrist-flex"
  | "wrist-ext"
  | "wrist-circles"
  | "finger-fan"
  | "prayer"
  | "prayer-inv"
  | "fist"
  | "thumb"
  | "flip"
  | "forearm-massage"
  | "shake";

interface MotionBase {
  highlight: HighlightZone;
  arrows?: string[]; // chemins SVG (viewBox 0 0 120 120)
  hold?: boolean; // étirement tenu : aller lent puis pause
}

export type Motion =
  | (MotionBase & { view: "side"; frames: SidePose[]; stand?: boolean; desk?: boolean; target?: boolean })
  | (MotionBase & { view: "front"; frames: FrontPose[] })
  | (MotionBase & { view: "face"; kind: FaceKind })
  | (MotionBase & { view: "hands"; kind: HandsKind });

const up = { sh: 168, el: 6 };

export const MOTIONS = {
  // ================= NUQUE =================
  "chin-tuck": {
    view: "side",
    frames: [{}, { headX: -7, head: -3 }],
    arrows: ["M76 29 L64 29"],
    highlight: "nuque",
  },
  "neck-yes": {
    view: "side",
    frames: [{ head: -14 }, { head: 26 }],
    arrows: ["M72 22 A 14 14 0 0 1 76 40"],
    highlight: "nuque",
  },
  "neck-stretch-hand": {
    view: "side",
    frames: [{}, { head: 30, armNear: { sh: 152, el: 122 } }],
    arrows: ["M70 24 A 12 12 0 0 1 74 38"],
    highlight: "nuque",
    hold: true,
  },
  "iso-front": {
    view: "side",
    frames: [{ armNear: { sh: 122, el: 58 } }, { armNear: { sh: 122, el: 58 } }],
    arrows: ["M76 30 L68 30", "M56 30 L64 30"],
    highlight: "nuque",
    hold: true,
  },
  "neck-massage": {
    view: "side",
    frames: [{ armNear: { sh: 145, el: 128 } }, { armNear: { sh: 150, el: 122 }, head: 8 }],
    arrows: ["M66 38 A 5 5 0 1 1 65 39"],
    highlight: "nuque",
  },
  "head-turn": {
    view: "front",
    frames: [{ turn: -1 }, { turn: 1 }],
    arrows: ["M44 20 A 22 22 0 0 1 76 20"],
    highlight: "nuque",
  },
  "head-tilt": {
    view: "front",
    frames: [{ tilt: -22 }, { tilt: 22 }],
    arrows: ["M46 18 A 20 20 0 0 1 74 18"],
    highlight: "nuque",
  },
  "head-half-circle": {
    view: "front",
    frames: [{ tilt: -24 }, { nod: 16 }, { tilt: 24 }],
    arrows: ["M44 26 A 24 24 0 0 0 76 26"],
    highlight: "nuque",
  },
  "head-tilt-hand": {
    view: "front",
    frames: [{}, { tilt: 24, armR: { sh: 172, el: 118 } }],
    arrows: ["M50 16 A 18 18 0 0 1 72 18"],
    highlight: "nuque",
    hold: true,
  },
  "iso-side": {
    view: "front",
    frames: [{ armR: { sh: 148, el: 96 } }, { armR: { sh: 148, el: 96 } }],
    arrows: ["M80 26 L72 28", "M52 30 L60 29"],
    highlight: "nuque",
    hold: true,
  },
  "head-diagonal": {
    view: "front",
    frames: [{ turn: -0.7, nod: 12 }, { turn: 0.7, nod: 12 }],
    arrows: ["M46 24 A 20 20 0 0 1 74 24"],
    highlight: "nuque",
  },
  "trap-massage": {
    view: "front",
    frames: [{ armR: { sh: -58, el: 116 } }, { armR: { sh: -52, el: 122 } }],
    arrows: ["M50 42 A 5 5 0 1 1 49 43"],
    highlight: "epaules",
  },

  // ================= ÉPAULES =================
  "shoulder-roll": {
    view: "side",
    frames: [
      { shoulderLift: 0, shoulderShift: 2 },
      { shoulderLift: -6, shoulderShift: 0 },
      { shoulderLift: 0, shoulderShift: -3 },
    ],
    arrows: ["M50 40 A 9 9 0 1 1 64 44"],
    highlight: "epaules",
  },
  "arms-back-open": {
    view: "side",
    frames: [{}, { armNear: { sh: -38, el: 6 }, armFar: { sh: -38, el: 6 }, torso: -7 }],
    arrows: ["M66 50 A 16 16 0 0 1 78 42"],
    highlight: "poitrine",
    hold: true,
  },
  "elbows-back": {
    view: "side",
    frames: [{ armNear: { sh: 28, el: 96 } }, { armNear: { sh: -16, el: 100 }, torso: -4 }],
    arrows: ["M64 58 L48 56"],
    highlight: "haut-dos",
  },
  shrug: {
    view: "front",
    frames: [{}, { shrug: 1 }],
    arrows: ["M36 42 L36 32", "M84 42 L84 32"],
    highlight: "epaules",
  },
  "cross-arm": {
    view: "front",
    frames: [{}, { armR: { sh: -78, el: 8 }, armL: { sh: -18, el: 108 } }],
    arrows: ["M74 52 L50 52"],
    highlight: "epaules",
    hold: true,
  },
  triceps: {
    view: "front",
    frames: [{}, { armR: { sh: 178, el: 148 }, armL: { sh: 150, el: 70 } }],
    arrows: ["M76 18 L64 18"],
    highlight: "epaules",
    hold: true,
  },
  "wall-angel": {
    view: "front",
    frames: [
      { armL: { sh: 102, el: 82 }, armR: { sh: 102, el: 82 } },
      { armL: { sh: 162, el: 8 }, armR: { sh: 162, el: 8 } },
    ],
    arrows: ["M30 34 L34 20", "M90 34 L86 20"],
    highlight: "haut-dos",
  },
  "arm-circles": {
    view: "front",
    frames: [
      { armL: { sh: 95, el: 4 }, armR: { sh: 95, el: 4 } },
      { armL: { sh: 112, el: 10 }, armR: { sh: 112, el: 10 } },
      { armL: { sh: 82, el: 10 }, armR: { sh: 82, el: 10 } },
    ],
    arrows: ["M22 42 A 7 7 0 1 1 32 48", "M98 42 A 7 7 0 1 0 88 48"],
    highlight: "epaules",
  },
  "ext-rotation": {
    view: "front",
    frames: [
      { armL: { sh: 14, el: 74 }, armR: { sh: 14, el: 74 } },
      { armL: { sh: 38, el: 74 }, armR: { sh: 38, el: 74 } },
    ],
    arrows: ["M34 66 L24 62", "M86 66 L96 62"],
    highlight: "epaules",
  },
  "arm-pendulum": {
    view: "side",
    frames: [
      { torso: 24, armNear: { sh: 58, el: 4 } },
      { torso: 24, armNear: { sh: 100, el: 4 } },
    ],
    arrows: ["M66 84 A 18 18 0 0 0 86 76"],
    highlight: "epaules",
  },
  "pec-stretch": {
    view: "front",
    frames: [
      { armL: { sh: 96, el: 88 }, armR: { sh: 96, el: 88 } },
      { armL: { sh: 104, el: 96 }, armR: { sh: 104, el: 96 } },
    ],
    arrows: ["M26 50 L18 50", "M94 50 L102 50"],
    highlight: "poitrine",
    hold: true,
  },

  // ================= DOS =================
  twist: {
    view: "front",
    frames: [{ twist: -1 }, { twist: 1 }],
    arrows: ["M40 14 A 26 26 0 0 1 80 14"],
    highlight: "haut-dos",
  },
  "open-book": {
    view: "front",
    frames: [
      { twist: -0.9, armL: { sh: 86, el: 4 }, armR: { sh: 86, el: 4 } },
      { twist: 0.9, armL: { sh: 86, el: 4 }, armR: { sh: 86, el: 4 } },
    ],
    arrows: ["M40 14 A 26 26 0 0 1 80 14"],
    highlight: "haut-dos",
  },
  "cat-cow": {
    view: "side",
    frames: [
      { torso: 16, head: 24 },
      { torso: -12, head: -14 },
    ],
    arrows: ["M40 44 A 22 22 0 0 1 44 70"],
    highlight: "haut-dos",
  },
  "forward-fold": {
    view: "side",
    frames: [{}, { torso: 48, head: 28, armNear: { sh: 74, el: 6 }, armFar: { sh: 74, el: 6 } }],
    arrows: ["M74 34 A 30 30 0 0 1 88 62"],
    highlight: "bas-dos",
    hold: true,
  },
  "hands-behind-head-ext": {
    view: "side",
    frames: [
      { armNear: { sh: 150, el: 134 }, armFar: { sh: 150, el: 134 } },
      { armNear: { sh: 150, el: 134 }, armFar: { sh: 150, el: 134 }, torso: -15, head: -8 },
    ],
    arrows: ["M72 34 A 18 18 0 0 0 62 20"],
    highlight: "poitrine",
  },
  "pelvis-tilt": {
    view: "side",
    frames: [{ torso: 7 }, { torso: -7 }],
    arrows: ["M40 70 A 10 10 0 0 1 44 84"],
    highlight: "bas-dos",
  },
  "desk-cobra": {
    view: "side",
    frames: [
      { torso: 18, armNear: { sh: 66, el: 18 } },
      { torso: -10, head: -8, armNear: { sh: 48, el: 4 } },
    ],
    arrows: ["M70 40 A 16 16 0 0 0 64 24"],
    highlight: "poitrine",
    desk: true,
  },
  "side-bend": {
    view: "front",
    frames: [{}, { bend: -18, armR: { sh: 172, el: 12 } }],
    arrows: ["M78 16 A 20 20 0 0 1 54 12"],
    highlight: "haut-dos",
    hold: true,
  },
  "side-bend-clasp": {
    view: "front",
    frames: [
      { armL: { sh: 165, el: 8 }, armR: { sh: 165, el: 8 } },
      { bend: -16, armL: { sh: 168, el: 8 }, armR: { sh: 168, el: 8 } },
    ],
    arrows: ["M80 14 A 22 22 0 0 1 56 10"],
    highlight: "haut-dos",
    hold: true,
  },
  "grow-tall": {
    view: "front",
    frames: [{ nod: 6 }, { grow: 1 }],
    arrows: ["M60 14 L60 4"],
    highlight: "corps",
  },
  "arms-forward-round": {
    view: "side",
    frames: [
      { armNear: { sh: 84, el: 6 }, armFar: { sh: 84, el: 6 } },
      { armNear: { sh: 96, el: 4 }, armFar: { sh: 96, el: 4 }, torso: 11, head: 15 },
    ],
    arrows: ["M88 52 L100 54"],
    highlight: "haut-dos",
    hold: true,
  },
  "stand-backbend": {
    view: "side",
    stand: true,
    frames: [
      { armNear: { sh: -24, el: 78 }, armFar: { sh: -24, el: 78 } },
      { armNear: { sh: -24, el: 78 }, armFar: { sh: -24, el: 78 }, torso: -17, head: -10 },
    ],
    arrows: ["M72 30 A 18 18 0 0 0 60 18"],
    highlight: "bas-dos",
    hold: true,
  },

  // ================= YEUX =================
  "gaze-far": {
    view: "side",
    frames: [{ gaze: 0 }, { gaze: 1 }],
    highlight: "yeux",
    target: true,
  },
  "focus-shift": {
    view: "side",
    frames: [{ gaze: 0 }, { gaze: 1 }],
    highlight: "yeux",
    target: true,
  },
  "gaze-breath": {
    view: "side",
    frames: [{ gaze: 1, belly: 0 }, { gaze: 1, belly: 1 }],
    highlight: "yeux",
    target: true,
    hold: true,
  },
  palming: { view: "face", kind: "palming", highlight: "yeux", hold: true },
  "eye-circles": { view: "face", kind: "eye-circles", highlight: "yeux" },
  "eye-eight": { view: "face", kind: "eye-eight", highlight: "yeux" },
  "eye-sweep": { view: "face", kind: "eye-sweep", highlight: "yeux" },
  blink: { view: "face", kind: "blink", highlight: "yeux" },
  "rest-closed": { view: "face", kind: "rest-closed", highlight: "yeux", hold: true },

  // ================= POIGNETS / MAINS =================
  "wrist-flex": { view: "hands", kind: "wrist-flex", highlight: "poignets", hold: true },
  "wrist-ext": { view: "hands", kind: "wrist-ext", highlight: "poignets", hold: true },
  "wrist-circles": { view: "hands", kind: "wrist-circles", highlight: "poignets" },
  "finger-fan": { view: "hands", kind: "finger-fan", highlight: "poignets" },
  prayer: { view: "hands", kind: "prayer", highlight: "poignets", hold: true },
  "prayer-inv": { view: "hands", kind: "prayer-inv", highlight: "poignets", hold: true },
  fist: { view: "hands", kind: "fist", highlight: "poignets" },
  thumb: { view: "hands", kind: "thumb", highlight: "poignets" },
  flip: { view: "hands", kind: "flip", highlight: "poignets" },
  "forearm-massage": { view: "hands", kind: "forearm-massage", highlight: "poignets" },
  shake: { view: "hands", kind: "shake", highlight: "poignets" },

  // ================= HANCHES =================
  "figure-four": {
    view: "side",
    frames: [
      { thighFar: 14, shinFar: -66 },
      { thighFar: 14, shinFar: -66, torso: 20, head: 6 },
    ],
    arrows: ["M66 40 A 20 20 0 0 1 76 56"],
    highlight: "hanches",
    hold: true,
  },
  "knee-hug": {
    view: "side",
    frames: [{}, { thigh: 36, shin: 28, armNear: { sh: 64, el: 58 } }],
    arrows: ["M84 62 A 16 16 0 0 0 70 52"],
    highlight: "hanches",
    hold: true,
  },
  "hips-shift": {
    view: "front",
    frames: [{ hipShift: -1 }, { hipShift: 1 }],
    arrows: ["M42 84 L78 84"],
    highlight: "hanches",
  },
  "hips-circle": {
    view: "front",
    frames: [{ hipShift: -1 }, { hipShift: 0, grow: 0.2 }, { hipShift: 1 }],
    arrows: ["M46 88 A 14 8 0 1 0 74 88"],
    highlight: "hanches",
  },
  "knees-open": {
    view: "front",
    frames: [{ knees: 0 }, { knees: 1 }],
    arrows: ["M42 92 L30 96", "M78 92 L90 96"],
    highlight: "hanches",
  },
  "stand-lunge": {
    view: "side",
    stand: true,
    frames: [
      { thigh: -58, shin: 6, thighFar: -102, shinFar: -12, pelvisY: 4 },
      { thigh: -52, shin: 12, thighFar: -108, shinFar: -16, pelvisY: 8, torso: -4 },
    ],
    arrows: ["M46 78 L46 88"],
    highlight: "hanches",
    hold: true,
  },
  "chair-squat": {
    view: "side",
    frames: [
      { torso: 20, armNear: { sh: 78, el: 6 }, armFar: { sh: 78, el: 6 } },
      { torso: 4, pelvisY: -21, thigh: -68, shin: 4, thighFar: -68, shinFar: 4, armNear: { sh: 40, el: 8 }, armFar: { sh: 40, el: 8 } },
    ],
    arrows: ["M40 66 L40 46"],
    highlight: "jambes",
  },
  "stand-pelvis": {
    view: "side",
    stand: true,
    frames: [{ torso: 6 }, { torso: -6 }],
    arrows: ["M42 62 A 10 10 0 0 1 46 76"],
    highlight: "hanches",
  },

  // ================= JAMBES =================
  "leg-extension": {
    view: "side",
    frames: [{}, { shin: -80, foot: 12 }],
    arrows: ["M88 96 A 26 26 0 0 0 100 72"],
    highlight: "jambes",
  },
  "heel-toe": {
    view: "side",
    frames: [{ foot: 16 }, { foot: -14 }],
    arrows: ["M86 108 L94 102"],
    highlight: "jambes",
  },
  "heel-toe-fast": {
    view: "side",
    frames: [{ foot: 14 }, { foot: -10 }],
    arrows: ["M86 108 L94 102"],
    highlight: "jambes",
  },
  "ankle-circles": {
    view: "side",
    frames: [
      { shin: -34, foot: 0 },
      { shin: -34, foot: 24 },
      { shin: -34, foot: -22 },
    ],
    arrows: ["M92 90 A 8 8 0 1 1 100 96"],
    highlight: "jambes",
  },
  "hamstring-reach": {
    view: "side",
    frames: [
      { shin: -54, foot: -16 },
      { shin: -54, foot: -16, torso: 28, head: 8, armNear: { sh: 82, el: 4 } },
    ],
    arrows: ["M74 44 A 24 24 0 0 1 86 62"],
    highlight: "jambes",
    hold: true,
  },
  "seated-march": {
    view: "side",
    frames: [
      { thigh: 26, shin: 14, thighFar: -2 },
      { thigh: -2, thighFar: 26, shinFar: 14 },
    ],
    arrows: ["M82 58 L82 48"],
    highlight: "jambes",
  },
  "legs-hold": {
    view: "side",
    frames: [
      { shin: -78, shinFar: -78, foot: 10, footFar: 10 },
      { shin: -78, shinFar: -78, foot: 10, footFar: 10 },
    ],
    arrows: ["M96 74 L104 74"],
    highlight: "jambes",
    hold: true,
  },
  "stand-calf": {
    view: "side",
    stand: true,
    frames: [{}, { pelvisY: -5, foot: 20, footFar: 20 }],
    arrows: ["M64 108 L64 98"],
    highlight: "jambes",
  },
  "stand-march": {
    view: "side",
    stand: true,
    frames: [
      { thigh: -20, shin: 20 },
      { thigh: -95, shin: 8 },
    ],
    arrows: ["M76 70 L76 58"],
    highlight: "jambes",
  },
  "stand-quad": {
    view: "side",
    stand: true,
    frames: [
      { thigh: -80, shin: -142, armNear: { sh: -46, el: 26 } },
      { thigh: -84, shin: -150, armNear: { sh: -50, el: 28 } },
    ],
    arrows: ["M44 84 L38 76"],
    highlight: "jambes",
    hold: true,
  },

  // ================= ÉNERGIE / RESPIRATION =================
  "breath-belly": {
    view: "side",
    frames: [
      { belly: 0, armNear: { sh: 54, el: 92 } },
      { belly: 1, armNear: { sh: 56, el: 88 } },
    ],
    arrows: ["M78 62 L88 62"],
    highlight: "ventre",
  },
  "breath-446": {
    view: "side",
    frames: [{ belly: 0 }, { belly: 1 }],
    arrows: ["M76 62 L86 62", "M86 70 L76 70"],
    highlight: "ventre",
  },
  sigh: {
    view: "side",
    frames: [{ belly: 0 }, { belly: 0.65 }, { belly: 1 }],
    arrows: ["M76 60 L84 60", "M78 66 L86 66", "M88 74 L74 74"],
    highlight: "ventre",
  },
  "reach-up": {
    view: "side",
    frames: [{}, { armNear: up, armFar: { sh: 162, el: 8 }, torso: -5, head: -6 }],
    arrows: ["M64 18 L64 6"],
    highlight: "corps",
  },
  "tap-energy": {
    view: "front",
    frames: [
      { armL: { sh: 26, el: 92 }, armR: { sh: 26, el: 92 } },
      { armL: { sh: 20, el: 104 }, armR: { sh: 20, el: 104 } },
    ],
    arrows: ["M40 76 L40 84", "M80 76 L80 84"],
    highlight: "jambes",
  },
} as const satisfies Record<string, Motion>;

export type MotionId = keyof typeof MOTIONS;

export function motionById(id: MotionId): Motion {
  return MOTIONS[id];
}
