import * as THREE from "three";
import type { AvatarColors, HairId, Zone } from "../types";

// ============================================================================
// Personnage argile Movaé v3 — squelette complet, qualité « jeu vidéo ».
//
// ~100 points d'articulation nommés dans un registre : colonne vertébrale en
// 3 segments, clavicules, cou en 2 segments, mâchoire, sourcils, paupières
// (hautes et basses), pupilles, joues, doigts à 3 phalanges (38 articulations
// pour les deux mains), orteils, mèches de cheveux en chaîne… Chaque mesh
// porte la zone du corps correspondante (userData.zone) pour la BodyMap
// cliquable, et toutes les couleurs viennent de la config utilisateur.
// ============================================================================

export const CLAY = {
  blush: "#DFA184",
  accent: "#C4795A",
  iris: "#5E7160",
  pedestal: "#E9E0CE",
  stool: "#D9C6A5",
  leaf: "#5F8B6D",
  leafDark: "#4F755D",
  pot: "#C08552",
  dark: "#3A342C",
  cream: "#F7F2E6",
  white: "#FBF8F1",
  sole: "#EAE2D2",
  bird: "#8FB7C9",
  wood: "#B9977269",
} as const;

export interface AvatarConfig {
  hair: HairId;
  colors: AvatarColors;
  equipped: string[];
}

// ---------- Matériaux ----------
// Un jeu de matériaux PAR personnage (les couleurs sont libres, et la BodyMap
// teinte les zones sans polluer les autres instances).

export class MatSet {
  private map = new Map<string, THREE.MeshStandardMaterial>();

  // Rendu lisse (galet poli / vinyle doux), pas mat comme la pâte à modeler.
  mat(color: string, roughness = 0.42): THREE.MeshStandardMaterial {
    const key = `${color}:${roughness}`;
    let m = this.map.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });
      this.map.set(key, m);
    }
    return m;
  }

  dispose(): void {
    for (const m of this.map.values()) m.dispose();
    this.map.clear();
  }
}

// ---------- Registre d'articulations ----------

export type Registry = Map<string, THREE.Object3D>;

function reg(registry: Registry, name: string, node: THREE.Object3D): THREE.Group {
  registry.set(name, node);
  return node as THREE.Group;
}

// ---------- Primitives ----------

interface Ctx {
  ms: MatSet;
  registry: Registry;
}

function sphere(ctx: Ctx, r: number, color: string, zone?: Zone, w = 32, h = 24): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), ctx.ms.mat(color));
  mesh.castShadow = true;
  if (zone) mesh.userData.zone = zone;
  return mesh;
}

// Capsule orientée vers le bas depuis l'origine (articulation en haut).
function limb(ctx: Ctx, length: number, radius: number, color: string, zone?: Zone): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 8, 24),
    ctx.ms.mat(color),
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  if (zone) mesh.userData.zone = zone;
  return mesh;
}

function torus(ctx: Ctx, r: number, tube: number, color: string, arc = Math.PI * 2): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 32, arc), ctx.ms.mat(color));
  mesh.castShadow = true;
  return mesh;
}

// Libère les géométries d'un sous-arbre (les matériaux vivent dans MatSet).
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}

// ---------- Main : 4 doigts × 3 phalanges + pouce × 3 ----------

export interface FingerChain {
  p1: THREE.Group;
  p2: THREE.Group;
  p3: THREE.Group;
}

export interface HandJoints {
  wrist: THREE.Group;
  fingers: FingerChain[]; // index, majeur, annulaire, auriculaire
  thumb: FingerChain;
}

export function buildHand(ctx: Ctx, side: 1 | -1, skin: string, prefix: string): { root: THREE.Group; joints: HandJoints } {
  const wrist = reg(ctx.registry, `${prefix}.poignet`, new THREE.Group());

  // paume : galet aplati + bombé côté pouce
  const palm = sphere(ctx, 0.072, skin, "poignets");
  palm.scale.set(0.9, 1.18, 0.5);
  palm.position.set(0, -0.06, 0);
  wrist.add(palm);
  const heel = sphere(ctx, 0.04, skin, "poignets", 16, 12);
  heel.position.set(-0.03 * side, -0.03, 0.012);
  heel.scale.set(1, 1, 0.6);
  wrist.add(heel);

  const fingers: FingerChain[] = [];
  const xs = [-0.045, -0.0155, 0.0145, 0.0445];
  const lens = [0.05, 0.058, 0.054, 0.042];
  const names = ["index", "majeur", "annulaire", "auriculaire"];
  for (let i = 0; i < 4; i++) {
    const L = lens[i];
    const seg = (n: 1 | 2 | 3, len: number, r: number) => {
      const g = reg(ctx.registry, `${prefix}.${names[i]}.p${n}`, new THREE.Group());
      g.add(limb(ctx, len, r, skin, "poignets"));
      return g;
    };
    const p1 = seg(1, L, 0.0155);
    p1.position.set(xs[i] * side, -0.12, 0.004);
    p1.rotation.x = 0.1;
    const p2 = seg(2, L * 0.82, 0.0145);
    p2.position.y = -L;
    p2.rotation.x = 0.16;
    const p3 = seg(3, L * 0.62, 0.0135);
    p3.position.y = -L * 0.82;
    p3.rotation.x = 0.14;
    p2.add(p3);
    p1.add(p2);
    wrist.add(p1);
    fingers.push({ p1, p2, p3 });
  }

  // pouce en 3 segments, opposé
  const t1 = reg(ctx.registry, `${prefix}.pouce.p1`, new THREE.Group());
  t1.position.set(-0.05 * side, -0.075, 0.018);
  t1.rotation.set(0.45, 0, 0.75 * side);
  t1.add(limb(ctx, 0.042, 0.018, skin, "poignets"));
  const t2 = reg(ctx.registry, `${prefix}.pouce.p2`, new THREE.Group());
  t2.position.y = -0.042;
  t2.rotation.x = 0.2;
  t2.add(limb(ctx, 0.036, 0.0165, skin, "poignets"));
  const t3 = reg(ctx.registry, `${prefix}.pouce.p3`, new THREE.Group());
  t3.position.y = -0.036;
  t3.rotation.x = 0.18;
  t3.add(limb(ctx, 0.03, 0.0155, skin, "poignets"));
  t2.add(t3);
  t1.add(t2);
  wrist.add(t1);

  return { root: wrist, joints: { wrist, fingers, thumb: { p1: t1, p2: t2, p3: t3 } } };
}

// Main autonome (gros plans d'exercices de poignets, vignettes...).
export function buildLooseHand(
  side: 1 | -1,
  skin = "#F0DCC3",
): { root: THREE.Group; joints: HandJoints; ms: MatSet } {
  const ms = new MatSet();
  const registry: Registry = new Map();
  const h = buildHand({ ms, registry }, side, skin, side === 1 ? "main.d" : "main.g");
  return { root: h.root, joints: h.joints, ms };
}

// Flexion/écartement d'une main entière (curl 0..1, spread 0..1).
export function poseHand(hand: HandJoints, curl: number, spread = 0): void {
  for (let i = 0; i < hand.fingers.length; i++) {
    const f = hand.fingers[i];
    f.p1.rotation.x = 0.1 + curl * 1.15;
    f.p1.rotation.z = spread * (i - 1.5) * 0.16;
    f.p2.rotation.x = 0.16 + curl * 1.05;
    f.p3.rotation.x = 0.14 + curl * 0.8;
  }
  hand.thumb.p1.rotation.x = 0.45 + curl * 0.55;
  hand.thumb.p2.rotation.x = 0.2 + curl * 0.6;
  hand.thumb.p3.rotation.x = 0.18 + curl * 0.4;
}

// ---------- Pied : chaussure + orteils articulés ----------

function buildFoot(ctx: Ctx, shoes: string, prefix: string): { root: THREE.Group; toe: THREE.Group } {
  const g = new THREE.Group();
  // chaussette
  const sock = torus(ctx, 0.052, 0.02, CLAY.cream);
  sock.rotation.x = Math.PI / 2;
  sock.position.y = 0.005;
  sock.userData.zone = "jambes";
  g.add(sock);
  // corps de la chaussure
  const body = sphere(ctx, 0.062, shoes, "jambes");
  body.scale.set(0.95, 0.72, 1.5);
  body.position.set(0, -0.045, 0.03);
  g.add(body);
  // bout articulé (orteils)
  const toe = reg(ctx.registry, `${prefix}.orteils`, new THREE.Group());
  toe.position.set(0, -0.05, 0.09);
  const toeCap = sphere(ctx, 0.05, shoes, "jambes");
  toeCap.scale.set(0.88, 0.6, 1.1);
  toeCap.position.set(0, 0, 0.03);
  toe.add(toeCap);
  g.add(toe);
  // semelle crème
  const sole = sphere(ctx, 0.062, CLAY.sole, "jambes");
  sole.scale.set(0.98, 0.22, 1.9);
  sole.position.set(0, -0.082, 0.045);
  g.add(sole);
  // lacet
  const lace = torus(ctx, 0.028, 0.008, CLAY.cream);
  lace.position.set(0, -0.01, 0.065);
  lace.rotation.x = -0.9;
  g.add(lace);
  return { root: g, toe };
}

// ---------- Tête : yeux complets, paupières x2, sourcils, mâchoire ----------

export interface HeadJoints {
  head: THREE.Group;
  jaw: THREE.Group;
  eyeL: THREE.Group;
  eyeR: THREE.Group;
  pupilL: THREE.Group;
  pupilR: THREE.Group;
  lidL: THREE.Mesh;
  lidR: THREE.Mesh;
  lidLowL: THREE.Mesh;
  lidLowR: THREE.Mesh;
  browL: THREE.Group;
  browR: THREE.Group;
  hairChain: THREE.Group[]; // mèches animées (queue de cheval...)
}

function buildEye(ctx: Ctx, skin: string, x: number, prefix: string) {
  const eye = reg(ctx.registry, `${prefix}`, new THREE.Group());
  eye.position.set(x, 0.03, 0.152);

  const ball = sphere(ctx, 0.052, CLAY.white, "yeux", 24, 18);
  ball.scale.set(1, 1, 0.62);
  eye.add(ball);

  const pupil = reg(ctx.registry, `${prefix}.pupille`, new THREE.Group());
  const iris = sphere(ctx, 0.026, CLAY.iris, "yeux", 18, 14);
  iris.position.z = 0.027;
  iris.scale.z = 0.5;
  const dot = sphere(ctx, 0.0135, CLAY.dark, "yeux", 14, 10);
  dot.position.z = 0.039;
  dot.scale.z = 0.5;
  const glint = sphere(ctx, 0.0052, CLAY.white, undefined, 8, 6);
  glint.position.set(0.009, 0.01, 0.048);
  pupil.add(iris, dot, glint);
  eye.add(pupil);

  const mkLid = (upper: boolean) => {
    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(0.056, 20, 14, 0, Math.PI * 2, 0, Math.PI * (upper ? 0.55 : 0.4)),
      ctx.ms.mat(skin),
    );
    lid.scale.set(1, upper ? 1 : -1, 0.68);
    lid.rotation.x = upper ? -1.35 : -1.45;
    ctx.registry.set(`${prefix}.paupiere-${upper ? "haute" : "basse"}`, lid);
    eye.add(lid);
    return lid;
  };
  return { eye, pupil, lid: mkLid(true), lidLow: mkLid(false) };
}

function buildHair(ctx: Ctx, hairId: HairId, color: string): { group: THREE.Group; chain: THREE.Group[] } {
  const g = new THREE.Group();
  const chain: THREE.Group[] = [];
  // Calotte : hémisphère centré sur le crâne. theta bas = ligne de cheveux
  // haute (le front reste dégagé, jamais sur les yeux qui sont à y≈0.03).
  const cap = (theta = 0.42, r = 0.216, y = 0.02) => {
    const c = new THREE.Mesh(
      new THREE.SphereGeometry(r, 40, 26, 0, Math.PI * 2, 0, Math.PI * theta),
      ctx.ms.mat(color),
    );
    c.position.y = y;
    c.castShadow = true;
    c.userData.zone = "yeux";
    g.add(c);
    return c;
  };
  const blob = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
    const b = sphere(ctx, r, color, "yeux", 20, 14);
    b.position.set(x, y, z);
    b.scale.set(sx, sy, sz);
    g.add(b);
    return b;
  };
  // Couvre l'arrière du crâne et la nuque (le cap dégage le front mais laisse
  // l'occiput nu) — placé derrière, jamais visible de face.
  const backPatch = (down = -0.02, r = 0.2) => {
    const b = sphere(ctx, r, color, "yeux", 24, 18);
    b.position.set(0, down, -0.055);
    b.scale.set(1, 1.05, 0.9);
    g.add(b);
    return b;
  };

  if (hairId === "ras") {
    cap(0.4, 0.212, 0.02);
    backPatch(-0.01, 0.19);
  } else if (hairId === "court") {
    cap(0.42);
    backPatch();
    // légère houppe au sommet, bien au-dessus du front
    blob(0.07, 0.03, 0.16, 0.075, 1.4, 0.6, 1.1);
  } else if (hairId === "mi-long") {
    cap(0.44);
    backPatch(-0.08, 0.205);
    // rideau qui descend le long des joues (derrière les oreilles)
    blob(0.075, -0.185, -0.05, -0.02, 0.8, 1.5, 0.95);
    blob(0.075, 0.185, -0.05, -0.02, 0.8, 1.5, 0.95);
    blob(0.11, 0, -0.12, -0.11, 1.35, 1.35, 0.85);
  } else if (hairId === "chignon") {
    cap(0.42);
    backPatch(-0.02, 0.19);
    const bun = blob(0.095, 0, 0.14, -0.19);
    void bun;
    const tie = torus(ctx, 0.05, 0.014, CLAY.accent);
    tie.position.set(0, 0.15, -0.145);
    tie.rotation.x = 0.5;
    g.add(tie);
  } else if (hairId === "queue") {
    cap(0.42);
    backPatch(-0.03, 0.19);
    const tie = torus(ctx, 0.045, 0.013, CLAY.accent);
    tie.position.set(0, 0.13, -0.17);
    tie.rotation.x = 1.0;
    g.add(tie);
    let parent: THREE.Object3D = g;
    const lens = [0.14, 0.12, 0.1];
    for (let i = 0; i < 3; i++) {
      const seg = reg(ctx.registry, `cheveux.queue.${i + 1}`, new THREE.Group());
      seg.position.set(0, i === 0 ? 0.12 : -lens[i - 1], i === 0 ? -0.19 : 0);
      if (i === 0) seg.rotation.x = 0.55;
      const m = limb(ctx, lens[i], 0.05 - i * 0.011, color, "yeux");
      seg.add(m);
      parent.add(seg);
      parent = seg;
      chain.push(seg);
    }
  } else if (hairId === "boucles") {
    cap(0.4);
    backPatch(-0.03, 0.2);
    // couronne de boucles, toutes au-dessus de la ligne de front
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      blob(0.072, Math.cos(a) * 0.16, 0.15 + Math.sin(i * 2.7) * 0.02, Math.sin(a) * 0.15 - 0.02, 0.95, 0.85, 0.95);
    }
    blob(0.07, 0, 0.22, 0.0);
  }
  return { group: g, chain };
}

function buildHead(ctx: Ctx, cfg: AvatarConfig): { root: THREE.Group; joints: HeadJoints } {
  const skin = cfg.colors.skin;
  const head = reg(ctx.registry, "tete", new THREE.Group());

  const skull = sphere(ctx, 0.21, skin, "yeux", 48, 36);
  head.add(skull);

  // mâchoire douce (sourire animable)
  const jaw = reg(ctx.registry, "machoire", new THREE.Group());
  jaw.position.set(0, -0.1, 0.02);
  const chin = sphere(ctx, 0.14, skin, "yeux", 28, 20);
  chin.scale.set(0.95, 0.72, 0.9);
  chin.position.set(0, -0.01, 0.04);
  jaw.add(chin);
  head.add(jaw);

  // oreilles
  for (const s of [-1, 1] as const) {
    const ear = reg(ctx.registry, `oreille.${s === -1 ? "g" : "d"}`, new THREE.Group());
    ear.position.set(0.205 * s, 0.005, -0.01);
    const shell = sphere(ctx, 0.046, skin, "yeux", 18, 14);
    shell.scale.set(0.5, 1, 0.75);
    ear.add(shell);
    head.add(ear);
  }

  // nez
  const nose = sphere(ctx, 0.027, skin, "yeux", 16, 12);
  nose.scale.set(0.85, 0.78, 0.9);
  nose.position.set(0, -0.022, 0.206);
  head.add(nose);

  // yeux (globe + pupille + 2 paupières chacun)
  const L = buildEye(ctx, skin, -0.078, "oeil.g");
  const R = buildEye(ctx, skin, 0.078, "oeil.d");
  head.add(L.eye, R.eye);

  // sourcils articulés
  const brows: THREE.Group[] = [];
  for (const s of [-1, 1] as const) {
    const holder = reg(ctx.registry, `sourcil.${s === -1 ? "g" : "d"}`, new THREE.Group());
    holder.position.set(0.078 * s, 0.108, 0.176);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.052, 6, 12), ctx.ms.mat(cfg.colors.hair));
    brow.rotation.z = Math.PI / 2 + 0.12 * s;
    holder.add(brow);
    head.add(holder);
    brows.push(holder);
  }

  // bouche : sourire sur la mâchoire
  const smile = torus(ctx, 0.05, 0.0095, CLAY.dark, Math.PI * 0.75);
  smile.position.set(0, 0.052, 0.145);
  smile.rotation.set(0.35, 0, Math.PI + Math.PI * 0.125);
  jaw.add(smile);
  // commissures
  for (const s of [-1, 1] as const) {
    const corner = sphere(ctx, 0.008, CLAY.dark, undefined, 8, 6);
    corner.position.set(0.047 * s, 0.062, 0.148);
    ctx.registry.set(`bouche.commissure.${s === -1 ? "g" : "d"}`, corner);
    jaw.add(corner);
  }

  // joues (blush)
  for (const s of [-1, 1] as const) {
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.031, 14, 10),
      new THREE.MeshStandardMaterial({ color: CLAY.blush, roughness: 1, transparent: true, opacity: 0.5 }),
    );
    cheek.scale.set(1, 0.75, 0.5);
    cheek.position.set(0.124 * s, -0.045, 0.157);
    ctx.registry.set(`joue.${s === -1 ? "g" : "d"}`, cheek);
    head.add(cheek);
  }

  const hair = buildHair(ctx, cfg.hair, cfg.colors.hair);
  head.add(hair.group);

  return {
    root: head,
    joints: {
      head,
      jaw,
      eyeL: L.eye,
      eyeR: R.eye,
      pupilL: L.pupil,
      pupilR: R.pupil,
      lidL: L.lid,
      lidR: R.lid,
      lidLowL: L.lidLow,
      lidLowR: R.lidLow,
      browL: brows[0],
      browR: brows[1],
      hairChain: hair.chain,
    },
  };
}

// ---------- Accessoires portés ----------

function buildAccessory(ctx: Ctx, id: string): THREE.Object3D | null {
  if (id === "lunettes-rondes") {
    const g = new THREE.Group();
    for (const s of [-1, 1] as const) {
      const ring = torus(ctx, 0.058, 0.011, CLAY.dark);
      ring.position.set(0.078 * s, 0.03, 0.195);
      g.add(ring);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.13, 4, 8), ctx.ms.mat(CLAY.dark));
      arm.position.set(0.155 * s, 0.032, 0.11);
      arm.rotation.set(Math.PI / 2, 0, 0.35 * s);
      g.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.03, 4, 8), ctx.ms.mat(CLAY.dark));
    bridge.position.set(0, 0.035, 0.2);
    bridge.rotation.z = Math.PI / 2;
    g.add(bridge);
    return g;
  }
  if (id === "casque-audio") {
    const g = new THREE.Group();
    const band = torus(ctx, 0.235, 0.025, CLAY.dark, Math.PI);
    band.position.y = 0.03;
    g.add(band);
    for (const s of [-1, 1] as const) {
      const shell = sphere(ctx, 0.075, CLAY.accent);
      shell.scale.set(0.6, 1, 1);
      shell.position.set(0.225 * s, 0, 0);
      g.add(shell);
      const pad = torus(ctx, 0.052, 0.018, CLAY.dark);
      pad.rotation.y = Math.PI / 2;
      pad.position.set(0.198 * s, 0, 0);
      g.add(pad);
    }
    return g;
  }
  if (id === "bob-sable") {
    const g = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.2, 0.13, 32), ctx.ms.mat(CLAY.pedestal));
    crown.position.y = 0.21;
    crown.castShadow = true;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.03, 32), ctx.ms.mat(CLAY.pedestal));
    brim.position.y = 0.145;
    brim.rotation.x = 0.06;
    const ribbon = torus(ctx, 0.185, 0.016, CLAY.accent);
    ribbon.rotation.x = Math.PI / 2;
    ribbon.position.y = 0.165;
    g.add(crown, brim, ribbon);
    return g;
  }
  if (id === "couronne-feuilles") {
    const g = new THREE.Group();
    g.position.y = 0.135;
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const leaf = sphere(ctx, 0.042, i % 3 === 0 ? CLAY.leafDark : CLAY.leaf, undefined, 12, 8);
      leaf.scale.set(0.6, 0.95, 1.5);
      leaf.position.set(Math.cos(a) * 0.195, Math.sin(i * 2.1) * 0.012, Math.sin(a) * 0.195);
      leaf.rotation.y = -a;
      leaf.rotation.x = 0.25;
      g.add(leaf);
    }
    return g;
  }
  return null;
}

// ---------- Le personnage complet ----------

export interface CharacterJoints {
  root: THREE.Group;
  pelvis: THREE.Group;
  spine1: THREE.Group;
  spine2: THREE.Group;
  chest: THREE.Group;
  belly: THREE.Group;
  chestBreath: THREE.Group;
  clavL: THREE.Group;
  clavR: THREE.Group;
  neck1: THREE.Group;
  neck2: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Group;
  eyeL: THREE.Group;
  eyeR: THREE.Group;
  pupilL: THREE.Group;
  pupilR: THREE.Group;
  lidL: THREE.Mesh;
  lidR: THREE.Mesh;
  lidLowL: THREE.Mesh;
  lidLowR: THREE.Mesh;
  browL: THREE.Group;
  browR: THREE.Group;
  hairChain: THREE.Group[];
  shL: THREE.Group;
  elL: THREE.Group;
  forearmL: THREE.Group;
  handL: HandJoints;
  shR: THREE.Group;
  elR: THREE.Group;
  forearmR: THREE.Group;
  handR: HandJoints;
  hipL: THREE.Group;
  kneeL: THREE.Group;
  ankL: THREE.Group;
  toeL: THREE.Group;
  hipR: THREE.Group;
  kneeR: THREE.Group;
  ankR: THREE.Group;
  toeR: THREE.Group;
}

export interface BuiltCharacter {
  root: THREE.Group;
  joints: CharacterJoints;
  registry: Registry;
  materials: MatSet;
}

const SHOULDER_Y = 0.24; // relatif au segment poitrine

function buildArm(ctx: Ctx, side: 1 | -1, cfg: AvatarConfig) {
  const sideName = side === -1 ? "g" : "d";
  const R = 0.066; // rayon du bras (constant → tube lisse)
  const clav = reg(ctx.registry, `clavicule.${sideName}`, new THREE.Group());
  clav.position.set(0.1 * side, SHOULDER_Y, 0);

  const sh = reg(ctx.registry, `epaule.${sideName}`, new THREE.Group());
  sh.position.set(0.17 * side, 0, 0);
  // épaule : sphère au rayon exact du bras → la jonction disparaît
  sh.add(sphere(ctx, R, cfg.colors.top, "epaules"));
  sh.add(limb(ctx, 0.32, R, cfg.colors.top, "epaules"));

  const el = reg(ctx.registry, `coude.${sideName}`, new THREE.Group());
  el.position.y = -0.32;
  // coude : même rayon, même couleur → pli lisse invisible
  el.add(sphere(ctx, R, cfg.colors.top, "epaules", 20, 16));
  const forearm = reg(ctx.registry, `avant-bras.${sideName}`, new THREE.Group());
  // manche puis poignet (léger fuselage vers la main)
  forearm.add(limb(ctx, 0.24, R * 0.92, cfg.colors.top, "poignets"));
  const wrist = sphere(ctx, 0.05, cfg.colors.skin, "poignets", 18, 12);
  wrist.position.y = -0.25;
  forearm.add(wrist);
  const hand = buildHand(ctx, side, cfg.colors.skin, `main.${sideName}`);
  hand.root.position.y = -0.28;
  forearm.add(hand.root);
  el.add(forearm);
  sh.add(el);
  clav.add(sh);

  return { clav, sh, el, forearm, hand: hand.joints };
}

function buildLeg(ctx: Ctx, side: 1 | -1, cfg: AvatarConfig) {
  const sideName = side === -1 ? "g" : "d";
  const RT = 0.088; // cuisse
  const RS = 0.078; // mollet
  const hip = reg(ctx.registry, `hanche.${sideName}`, new THREE.Group());
  hip.position.set(0.13 * side, -0.02, 0);
  hip.add(sphere(ctx, RT, cfg.colors.trousers, "hanches", 20, 16));
  hip.add(limb(ctx, 0.36, RT, cfg.colors.trousers, "hanches"));

  const knee = reg(ctx.registry, `genou.${sideName}`, new THREE.Group());
  knee.position.y = -0.36;
  // genou : sphère au rayon du mollet → jonction lisse
  knee.add(sphere(ctx, RS, cfg.colors.trousers, "jambes", 20, 16));
  knee.add(limb(ctx, 0.32, RS, cfg.colors.trousers, "jambes"));

  const ank = reg(ctx.registry, `cheville.${sideName}`, new THREE.Group());
  ank.position.y = -0.34;
  const foot = buildFoot(ctx, cfg.colors.shoes, `pied.${sideName}`);
  ank.add(foot.root);
  knee.add(ank);
  hip.add(knee);

  return { hip, knee, ank, toe: foot.toe };
}

export function buildCharacter(cfg: AvatarConfig): BuiltCharacter {
  const ms = new MatSet();
  const registry: Registry = new Map();
  const ctx: Ctx = { ms, registry };

  const root = reg(registry, "racine", new THREE.Group());
  const pelvis = reg(registry, "bassin", new THREE.Group());

  // bassin
  const hips = sphere(ctx, 0.205, cfg.colors.trousers, "hanches");
  hips.scale.set(1.05, 0.85, 0.9);
  pelvis.add(hips);

  const legL = buildLeg(ctx, -1, cfg);
  const legR = buildLeg(ctx, 1, cfg);
  pelvis.add(legL.hip, legR.hip);

  // ---- colonne vertébrale en 3 segments ----
  const spine1 = reg(registry, "colonne.lombaires", new THREE.Group());
  spine1.position.y = 0.06;
  const lower = sphere(ctx, 0.195, cfg.colors.top, "dos", 32, 22);
  lower.scale.set(1.02, 0.8, 0.88);
  lower.position.y = 0.05;
  spine1.add(lower);
  // ceinture
  const belt = torus(ctx, 0.198, 0.028, cfg.colors.shoes);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = -0.02;
  spine1.add(belt);

  const spine2 = reg(registry, "colonne.dorsales", new THREE.Group());
  spine2.position.y = 0.14;
  const mid = sphere(ctx, 0.2, cfg.colors.top, "dos", 32, 22);
  mid.scale.set(1, 0.85, 0.9);
  mid.position.y = 0.05;
  spine2.add(mid);
  spine1.add(spine2);

  const chest = reg(registry, "colonne.poitrine", new THREE.Group());
  chest.position.y = 0.15;
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.205, 0.16, 10, 32), ms.mat(cfg.colors.top));
  upper.position.y = 0.09;
  upper.castShadow = true;
  upper.userData.zone = "dos";
  chest.add(upper);
  spine2.add(chest);

  // respiration thoracique + ventre
  const chestBreath = reg(registry, "souffle.poitrine", new THREE.Group());
  chestBreath.position.set(0, 0.12, 0.16);
  const chestBall = sphere(ctx, 0.09, cfg.colors.top, "dos");
  chestBreath.add(chestBall);
  chest.add(chestBreath);

  const belly = reg(registry, "souffle.ventre", new THREE.Group());
  belly.position.set(0, 0.06, 0.16);
  const bellyBall = sphere(ctx, 0.105, cfg.colors.top, "energie");
  belly.add(bellyBall);
  spine1.add(belly);

  // col roulé
  const collar = torus(ctx, 0.092, 0.026, cfg.colors.trousers);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.27;
  chest.add(collar);

  // écharpe
  if (cfg.equipped.includes("echarpe-terracotta")) {
    const scarf = torus(ctx, 0.13, 0.05, CLAY.accent);
    scarf.rotation.x = Math.PI / 2 + 0.12;
    scarf.position.y = 0.24;
    chest.add(scarf);
    const end = limb(ctx, 0.2, 0.045, CLAY.accent);
    end.position.set(0.08, 0.06, 0.17);
    chest.add(end);
  }

  // mésange sur l'épaule gauche
  if (cfg.equipped.includes("oiseau-mesange")) {
    const bird = new THREE.Group();
    bird.position.set(-0.29, 0.31, 0.02);
    const bodyB = sphere(ctx, 0.055, CLAY.bird);
    bodyB.scale.set(0.9, 0.85, 1.15);
    const headB = sphere(ctx, 0.038, CLAY.bird);
    headB.position.set(0, 0.055, 0.035);
    const bib = sphere(ctx, 0.03, CLAY.cream);
    bib.position.set(0, 0.035, 0.05);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.03, 8), ms.mat(CLAY.accent));
    beak.position.set(0, 0.055, 0.075);
    beak.rotation.x = Math.PI / 2;
    const tail = sphere(ctx, 0.02, CLAY.dark);
    tail.scale.set(0.7, 0.5, 1.8);
    tail.position.set(0, 0.02, -0.07);
    bird.add(bodyB, headB, bib, beak, tail);
    for (const s of [-1, 1] as const) {
      const e = sphere(ctx, 0.006, CLAY.dark, undefined, 8, 6);
      e.position.set(0.02 * s, 0.065, 0.06);
      bird.add(e);
    }
    registry.set("compagnon.mesange", bird);
    chest.add(bird);
  }

  // ---- bras (clavicule → épaule → coude → main) ----
  const armL = buildArm(ctx, -1, cfg);
  const armR = buildArm(ctx, 1, cfg);
  chest.add(armL.clav, armR.clav);

  // ---- cou en 2 segments ----
  const neck1 = reg(registry, "cou.bas", new THREE.Group());
  neck1.position.y = 0.3;
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.085, 0.1, 20), ms.mat(cfg.colors.skin));
  neckMesh.position.y = 0.03;
  neckMesh.userData.zone = "nuque";
  neck1.add(neckMesh);
  const neck2 = reg(registry, "cou.haut", new THREE.Group());
  neck2.position.y = 0.09;
  const neckMesh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.068, 0.07, 20), ms.mat(cfg.colors.skin));
  neckMesh2.position.y = 0.02;
  neckMesh2.userData.zone = "nuque";
  neck2.add(neckMesh2);
  neck1.add(neck2);
  chest.add(neck1);

  // ---- tête ----
  const headBuilt = buildHead(ctx, cfg);
  headBuilt.root.position.y = 0.22;
  neck2.add(headBuilt.root);

  for (const id of cfg.equipped) {
    const acc = buildAccessory(ctx, id);
    if (acc) headBuilt.root.add(acc);
  }

  pelvis.add(spine1);
  root.add(pelvis);

  return {
    root,
    registry,
    materials: ms,
    joints: {
      root,
      pelvis,
      spine1,
      spine2,
      chest,
      belly,
      chestBreath,
      clavL: armL.clav,
      clavR: armR.clav,
      neck1,
      neck2,
      head: headBuilt.root,
      jaw: headBuilt.joints.jaw,
      eyeL: headBuilt.joints.eyeL,
      eyeR: headBuilt.joints.eyeR,
      pupilL: headBuilt.joints.pupilL,
      pupilR: headBuilt.joints.pupilR,
      lidL: headBuilt.joints.lidL,
      lidR: headBuilt.joints.lidR,
      lidLowL: headBuilt.joints.lidLowL,
      lidLowR: headBuilt.joints.lidLowR,
      browL: headBuilt.joints.browL,
      browR: headBuilt.joints.browR,
      hairChain: headBuilt.joints.hairChain,
      shL: armL.sh,
      elL: armL.el,
      forearmL: armL.forearm,
      handL: armL.hand,
      shR: armR.sh,
      elR: armR.el,
      forearmR: armR.forearm,
      handR: armR.hand,
      hipL: legL.hip,
      kneeL: legL.knee,
      ankL: legL.ank,
      toeL: legL.toe,
      hipR: legR.hip,
      kneeR: legR.knee,
      ankR: legR.ank,
      toeR: legR.toe,
    },
  };
}

// Nombre d'articulations du squelette courant (affiché dans le menu).
export function jointCount(built: BuiltCharacter): number {
  return built.registry.size;
}

// ---------- Lumières studio (imperatif, pour le générateur de vignettes) ----------

export function addStudioLights(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight("#FFF6E8", 0.85);
  const key = new THREE.DirectionalLight("#FFF3E0", 1.25);
  key.position.set(-2.2, 3.4, 2.6);
  const fill = new THREE.DirectionalLight("#DCEAE0", 0.35);
  fill.position.set(2.4, 1.2, -1.6);
  scene.add(ambient, key, fill);
}
