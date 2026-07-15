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

export function reg<T extends THREE.Object3D>(registry: Registry, name: string, node: T): T {
  registry.set(name, node);
  return node;
}

// ---------- Primitives ----------

export interface Ctx {
  ms: MatSet;
  registry: Registry;
}

export function sphere(ctx: Ctx, r: number, color: string, zone?: Zone, w = 32, h = 24): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), ctx.ms.mat(color));
  mesh.castShadow = true;
  if (zone) mesh.userData.zone = zone;
  return mesh;
}

// Capsule orientée vers le bas depuis l'origine (articulation en haut).
export function limb(ctx: Ctx, length: number, radius: number, color: string, zone?: Zone): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 8, 24),
    ctx.ms.mat(color),
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  if (zone) mesh.userData.zone = zone;
  return mesh;
}

export function torus(ctx: Ctx, r: number, tube: number, color: string, arc = Math.PI * 2): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 32, arc), ctx.ms.mat(color));
  mesh.castShadow = true;
  return mesh;
}

// Libère les géométries d'un sous-arbre (les matériaux vivent dans MatSet).
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) (o as THREE.SkinnedMesh).skeleton.dispose();
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

export function buildFoot(ctx: Ctx, shoes: string, prefix: string): { root: THREE.Group; toe: THREE.Group } {
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
  eye.position.set(x, 0.028, 0.156);

  // œil sombre en amande (comme la référence) — pas de blanc visible à distance
  const ball = sphere(ctx, 0.041, CLAY.dark, "yeux", 20, 16);
  ball.scale.set(0.82, 1.18, 0.52);
  eye.add(ball);

  // iris + reflet subtils, groupés pour suivre le regard (gros plans yeux)
  const pupil = reg(ctx.registry, `${prefix}.pupille`, new THREE.Group());
  const iris = sphere(ctx, 0.016, CLAY.iris, "yeux", 14, 10);
  iris.position.z = 0.02;
  iris.scale.z = 0.5;
  const glint = sphere(ctx, 0.0085, CLAY.white, undefined, 10, 8);
  glint.position.set(0.012, 0.016, 0.028);
  pupil.add(iris, glint);
  eye.add(pupil);

  const mkLid = (upper: boolean) => {
    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 20, 14, 0, Math.PI * 2, 0, Math.PI * (upper ? 0.55 : 0.4)),
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

export function buildHead(ctx: Ctx, cfg: AvatarConfig): { root: THREE.Group; joints: HeadJoints } {
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

  // nez : rond et bien présent (comme la référence)
  const nose = sphere(ctx, 0.036, skin, "yeux", 18, 14);
  nose.scale.set(0.92, 0.86, 1.05);
  nose.position.set(0, -0.012, 0.207);
  head.add(nose);

  // yeux (globe + pupille + 2 paupières chacun)
  const L = buildEye(ctx, skin, -0.068, "oeil.g");
  const R = buildEye(ctx, skin, 0.068, "oeil.d");
  head.add(L.eye, R.eye);

  // sourcils articulés
  const brows: THREE.Group[] = [];
  for (const s of [-1, 1] as const) {
    const holder = reg(ctx.registry, `sourcil.${s === -1 ? "g" : "d"}`, new THREE.Group());
    holder.position.set(0.068 * s, 0.1, 0.184);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.05, 6, 12), ctx.ms.mat(cfg.colors.hair));
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

export function buildAccessory(ctx: Ctx, id: string): THREE.Object3D | null {
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

// Les articulations sont des Object3D : des Bone (squelette du skinned mesh)
// pour le corps, des Group pour les éléments rigides (doigts, paupières...).
export interface CharacterJoints {
  root: THREE.Object3D;
  pelvis: THREE.Object3D;
  spine1: THREE.Object3D;
  spine2: THREE.Object3D;
  chest: THREE.Object3D;
  belly: THREE.Object3D;
  chestBreath: THREE.Object3D;
  clavL: THREE.Object3D;
  clavR: THREE.Object3D;
  neck1: THREE.Object3D;
  neck2: THREE.Object3D;
  head: THREE.Object3D;
  jaw: THREE.Object3D;
  eyeL: THREE.Object3D;
  eyeR: THREE.Object3D;
  pupilL: THREE.Object3D;
  pupilR: THREE.Object3D;
  lidL: THREE.Mesh;
  lidR: THREE.Mesh;
  lidLowL: THREE.Mesh;
  lidLowR: THREE.Mesh;
  browL: THREE.Object3D;
  browR: THREE.Object3D;
  hairChain: THREE.Group[];
  shL: THREE.Object3D;
  elL: THREE.Object3D;
  forearmL: THREE.Object3D;
  handL: HandJoints;
  shR: THREE.Object3D;
  elR: THREE.Object3D;
  forearmR: THREE.Object3D;
  handR: HandJoints;
  hipL: THREE.Object3D;
  kneeL: THREE.Object3D;
  ankL: THREE.Object3D;
  toeL: THREE.Object3D;
  hipR: THREE.Object3D;
  kneeR: THREE.Object3D;
  ankR: THREE.Object3D;
  toeR: THREE.Object3D;
}

export interface BuiltCharacter {
  root: THREE.Group;
  joints: CharacterJoints;
  registry: Registry;
  materials: MatSet;
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
