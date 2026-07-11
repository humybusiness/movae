import * as THREE from "three";

// ============================================================================
// Fabriques 3D du personnage argile Movaé — niveau de détail « héros ».
//
// Tout est construit en three.js impératif pour être réutilisable :
//  - par le rig React (ExerciseFigure3D / menu Personnage) via <primitive>,
//  - par le générateur de vignettes de zone (un seul contexte WebGL partagé).
//
// DA pâte à modeler : formes rondes et lissées (segments élevés), matériaux
// mats très rugueux, palette sauge/crème/terracotta, détails sculptés à la
// main : doigts, chaussures, nez, oreilles, sourcils, iris + pupilles,
// mèches de cheveux, col, ourlets.
// ============================================================================

export const CLAY = {
  top: "#8FAE97",
  topDark: "#7A9C86",
  trousers: "#6F665C",
  trousersDark: "#5E564D",
  skin: "#F0DCC3",
  hair: "#4A3F35",
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
  shoe: "#4C443B",
  sole: "#EAE2D2",
  bird: "#8FB7C9",
} as const;

// Matériaux partagés (jamais disposés) : un par couleur.
const MATS = new Map<string, THREE.MeshStandardMaterial>();
export function clayMat(color: string, roughness = 0.94): THREE.MeshStandardMaterial {
  const key = `${color}:${roughness}`;
  let m = MATS.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    MATS.set(key, m);
  }
  return m;
}

function sphere(r: number, color: string, w = 32, h = 24): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), clayMat(color));
  mesh.castShadow = true;
  return mesh;
}

// Capsule orientée vers le bas depuis l'origine (articulation en haut).
function limb(length: number, radius: number, color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 8, 24),
    clayMat(color),
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  return mesh;
}

function torus(r: number, tube: number, color: string, arc = Math.PI * 2): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 32, arc), clayMat(color));
  mesh.castShadow = true;
  return mesh;
}

// Libère les géométries d'un sous-arbre (les matériaux sont partagés).
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}

// ---------- Main détaillée (5 doigts articulables) ----------

export interface HandJoints {
  wrist: THREE.Group;
  fingers: THREE.Group[]; // racines des 4 doigts (flexion = rotation.x)
  tips: THREE.Group[]; // secondes phalanges
  thumb: THREE.Group;
}

// La main pend depuis le poignet (origine), paume vers le corps.
// side = 1 : main droite ; -1 : main gauche.
export function buildHand(side: 1 | -1): { root: THREE.Group; joints: HandJoints } {
  const wrist = new THREE.Group();

  // paume : galet aplati
  const palm = sphere(0.072, CLAY.skin);
  palm.scale.set(0.9, 1.15, 0.5);
  palm.position.set(0, -0.055, 0);
  wrist.add(palm);

  const fingers: THREE.Group[] = [];
  const tips: THREE.Group[] = [];
  const xs = [-0.042, -0.014, 0.014, 0.042];
  const lens = [0.052, 0.062, 0.058, 0.046];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    f.position.set(xs[i], -0.115, 0.004);
    f.rotation.x = 0.12; // légère courbure naturelle
    const p1 = limb(lens[i], 0.0155, CLAY.skin);
    f.add(p1);
    const tip = new THREE.Group();
    tip.position.y = -lens[i];
    tip.rotation.x = 0.22;
    tip.add(limb(lens[i] * 0.8, 0.0145, CLAY.skin));
    f.add(tip);
    wrist.add(f);
    fingers.push(f);
    tips.push(tip);
  }

  // pouce : part du bord de la paume, vers l'avant (le corps)
  const thumb = new THREE.Group();
  thumb.position.set(-0.052 * side, -0.07, 0.02);
  thumb.rotation.set(0.5, 0, 0.7 * side);
  thumb.add(limb(0.055, 0.017, CLAY.skin));
  wrist.add(thumb);

  return { root: wrist, joints: { wrist, fingers, tips, thumb } };
}

// ---------- Pied / chaussure ----------

function buildFoot(): THREE.Group {
  const g = new THREE.Group();
  // chaussette
  const sock = torus(0.052, 0.02, CLAY.cream);
  sock.rotation.x = Math.PI / 2;
  sock.position.y = 0.005;
  g.add(sock);
  // corps de la chaussure
  const body = sphere(0.062, CLAY.shoe);
  body.scale.set(0.95, 0.7, 1.7);
  body.position.set(0, -0.045, 0.045);
  g.add(body);
  // bout arrondi
  const toe = sphere(0.05, CLAY.shoe);
  toe.scale.set(0.85, 0.62, 0.9);
  toe.position.set(0, -0.055, 0.125);
  g.add(toe);
  // semelle crème
  const sole = sphere(0.062, CLAY.sole);
  sole.scale.set(0.98, 0.22, 1.85);
  sole.position.set(0, -0.082, 0.05);
  g.add(sole);
  return g;
}

// ---------- Tête détaillée ----------

export interface HeadJoints {
  head: THREE.Group;
  eyeL: THREE.Group;
  eyeR: THREE.Group;
  pupilL: THREE.Group;
  pupilR: THREE.Group;
  lidL: THREE.Mesh;
  lidR: THREE.Mesh;
}

function buildEye(x: number): { eye: THREE.Group; pupil: THREE.Group; lid: THREE.Mesh } {
  const eye = new THREE.Group();
  eye.position.set(x, 0.03, 0.155);

  const ball = sphere(0.05, CLAY.white, 24, 18);
  ball.scale.set(1, 1, 0.6);
  eye.add(ball);

  // iris + pupille + reflet, groupés pour suivre le regard
  const pupil = new THREE.Group();
  const iris = sphere(0.024, CLAY.iris, 18, 14);
  iris.position.z = 0.026;
  iris.scale.z = 0.5;
  const dot = sphere(0.0125, CLAY.dark, 14, 10);
  dot.position.z = 0.038;
  dot.scale.z = 0.5;
  const glint = sphere(0.005, CLAY.white, 8, 6);
  glint.position.set(0.008, 0.009, 0.047);
  pupil.add(iris, dot, glint);
  eye.add(pupil);

  // paupière : coquille couleur peau qui descend pour fermer l'œil
  const lid = new THREE.Mesh(
    new THREE.SphereGeometry(0.054, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    clayMat(CLAY.skin),
  );
  lid.scale.set(1, 1, 0.66);
  lid.rotation.x = -1.35; // relevée (œil ouvert)
  eye.add(lid);

  return { eye, pupil, lid };
}

function buildHair(body: "f" | "m"): THREE.Group {
  const g = new THREE.Group();
  if (body === "m") {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.218, 32, 22, 0, Math.PI * 2, 0, Math.PI * 0.52),
      clayMat(CLAY.hair),
    );
    cap.position.y = 0.055;
    cap.castShadow = true;
    g.add(cap);
    // mèche frontale décalée
    const fringe = sphere(0.06, CLAY.hair);
    fringe.scale.set(1.5, 0.55, 0.8);
    fringe.position.set(0.045, 0.155, 0.15);
    fringe.rotation.z = -0.15;
    g.add(fringe);
    // pattes au-dessus des oreilles
    for (const s of [-1, 1] as const) {
      const patch = sphere(0.045, CLAY.hair);
      patch.scale.set(0.5, 0.9, 0.8);
      patch.position.set(0.198 * s, 0.045, 0.005);
      g.add(patch);
    }
  } else {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.222, 32, 22, 0, Math.PI * 2, 0, Math.PI * 0.6),
      clayMat(CLAY.hair),
    );
    cap.position.y = 0.045;
    cap.castShadow = true;
    g.add(cap);
    // raie et mèches de front
    const fringe = sphere(0.07, CLAY.hair);
    fringe.scale.set(1.35, 0.5, 0.75);
    fringe.position.set(-0.05, 0.15, 0.152);
    fringe.rotation.z = 0.22;
    g.add(fringe);
    // mèches latérales le long des joues
    for (const s of [-1, 1] as const) {
      const strand = limb(0.22, 0.05, CLAY.hair);
      const holder = new THREE.Group();
      holder.position.set(0.175 * s, 0.06, 0.045);
      holder.rotation.z = -0.16 * s;
      holder.add(strand);
      g.add(holder);
    }
    // chignon bas + attache
    const bun = sphere(0.095, CLAY.hair);
    bun.position.set(0, 0.1, -0.21);
    g.add(bun);
    const tie = torus(0.05, 0.014, CLAY.accent);
    tie.position.set(0, 0.12, -0.16);
    tie.rotation.x = 0.5;
    g.add(tie);
  }
  return g;
}

function buildHead(body: "f" | "m"): { root: THREE.Group; joints: HeadJoints } {
  const head = new THREE.Group();

  const skull = sphere(0.21, CLAY.skin, 48, 36);
  head.add(skull);

  // oreilles
  for (const s of [-1, 1] as const) {
    const ear = sphere(0.046, CLAY.skin, 18, 14);
    ear.scale.set(0.5, 1, 0.75);
    ear.position.set(0.205 * s, 0.005, -0.01);
    head.add(ear);
  }

  // nez
  const nose = sphere(0.026, CLAY.skin, 16, 12);
  nose.scale.set(0.85, 0.75, 0.9);
  nose.position.set(0, -0.02, 0.205);
  head.add(nose);

  // yeux
  const L = buildEye(-0.078);
  const R = buildEye(0.078);
  head.add(L.eye, R.eye);

  // sourcils
  for (const s of [-1, 1] as const) {
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.05, 6, 10), clayMat(CLAY.hair));
    brow.position.set(0.078 * s, 0.105, 0.178);
    brow.rotation.z = Math.PI / 2 + 0.12 * s;
    head.add(brow);
  }

  // sourire
  const smile = torus(0.05, 0.0095, CLAY.dark, Math.PI * 0.75);
  smile.position.set(0, -0.052, 0.182);
  smile.rotation.set(0.35, 0, Math.PI + Math.PI * 0.125);
  head.add(smile);

  // joues
  for (const s of [-1, 1] as const) {
    const cheek = sphere(0.03, CLAY.blush, 14, 10);
    const m = cheek.material as THREE.MeshStandardMaterial;
    cheek.material = m.clone();
    (cheek.material as THREE.MeshStandardMaterial).transparent = true;
    (cheek.material as THREE.MeshStandardMaterial).opacity = 0.5;
    cheek.scale.set(1, 0.75, 0.5);
    cheek.position.set(0.122 * s, -0.045, 0.158);
    head.add(cheek);
  }

  head.add(buildHair(body));

  return {
    root: head,
    joints: { head, eyeL: L.eye, eyeR: R.eye, pupilL: L.pupil, pupilR: R.pupil, lidL: L.lid, lidR: R.lid },
  };
}

// ---------- Accessoires portés ----------

function buildAccessory(id: string): THREE.Object3D | null {
  if (id === "lunettes-rondes") {
    const g = new THREE.Group();
    for (const s of [-1, 1] as const) {
      const ring = torus(0.058, 0.011, CLAY.dark);
      ring.position.set(0.078 * s, 0.03, 0.195);
      g.add(ring);
      // branches vers les oreilles
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.13, 4, 8), clayMat(CLAY.dark));
      arm.position.set(0.155 * s, 0.032, 0.11);
      arm.rotation.set(Math.PI / 2, 0, 0.35 * s);
      g.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.03, 4, 8), clayMat(CLAY.dark));
    bridge.position.set(0, 0.035, 0.2);
    bridge.rotation.z = Math.PI / 2;
    g.add(bridge);
    return g;
  }
  if (id === "casque-audio") {
    const g = new THREE.Group();
    const band = torus(0.235, 0.025, CLAY.dark, Math.PI);
    band.position.y = 0.03;
    g.add(band);
    for (const s of [-1, 1] as const) {
      const shell = sphere(0.075, CLAY.accent);
      shell.scale.set(0.6, 1, 1);
      shell.position.set(0.225 * s, 0.0, 0);
      g.add(shell);
      const pad = torus(0.052, 0.018, CLAY.dark);
      pad.rotation.y = Math.PI / 2;
      pad.position.set(0.198 * s, 0, 0);
      g.add(pad);
    }
    return g;
  }
  if (id === "bob-sable") {
    const g = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.2, 0.13, 28), clayMat(CLAY.pedestal));
    crown.position.y = 0.21;
    crown.castShadow = true;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.03, 28), clayMat(CLAY.pedestal));
    brim.position.y = 0.145;
    brim.rotation.x = 0.06;
    const ribbon = torus(0.185, 0.016, CLAY.accent);
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
      const leaf = sphere(0.042, i % 3 === 0 ? CLAY.leafDark : CLAY.leaf, 12, 8);
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
  torso: THREE.Group;
  belly: THREE.Group;
  head: THREE.Group;
  eyeL: THREE.Group;
  eyeR: THREE.Group;
  pupilL: THREE.Group;
  pupilR: THREE.Group;
  lidL: THREE.Mesh;
  lidR: THREE.Mesh;
  shL: THREE.Group;
  elL: THREE.Group;
  handL: HandJoints;
  shR: THREE.Group;
  elR: THREE.Group;
  handR: HandJoints;
  hipL: THREE.Group;
  kneeL: THREE.Group;
  ankL: THREE.Group;
  hipR: THREE.Group;
  kneeR: THREE.Group;
  ankR: THREE.Group;
}

const SHOULDER_Y = 0.5;

function buildArm(side: 1 | -1): { root: THREE.Group; sh: THREE.Group; el: THREE.Group; hand: HandJoints } {
  const sh = new THREE.Group();
  sh.position.set(0.27 * side, SHOULDER_Y, 0);

  // épaule ronde (manche)
  const cap = sphere(0.088, CLAY.top);
  sh.add(cap);
  // bras (manche)
  sh.add(limb(0.3, 0.066, CLAY.top));
  // ourlet de manche au coude
  const cuff = torus(0.06, 0.014, CLAY.topDark);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.y = -0.29;
  sh.add(cuff);

  const el = new THREE.Group();
  el.position.y = -0.32;
  el.add(limb(0.26, 0.054, CLAY.skin));
  const hand = buildHand(side);
  hand.root.position.y = -0.28;
  el.add(hand.root);
  sh.add(el);

  return { root: sh, sh, el, hand: hand.joints };
}

function buildLeg(side: 1 | -1): { root: THREE.Group; hip: THREE.Group; knee: THREE.Group; ank: THREE.Group } {
  const hip = new THREE.Group();
  hip.position.set(0.13 * side, -0.02, 0);
  hip.add(limb(0.36, 0.096, CLAY.trousers));

  const knee = new THREE.Group();
  knee.position.y = -0.36;
  knee.add(limb(0.32, 0.078, CLAY.trousers));
  // ourlet de pantalon
  const hem = torus(0.072, 0.016, CLAY.trousersDark);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = -0.3;
  knee.add(hem);

  const ank = new THREE.Group();
  ank.position.y = -0.34;
  ank.add(buildFoot());
  knee.add(ank);
  hip.add(knee);

  return { root: hip, hip, knee, ank };
}

export function buildCharacter(
  body: "f" | "m",
  equipped: string[],
): { root: THREE.Group; joints: CharacterJoints } {
  const pelvis = new THREE.Group();

  // bassin
  const hips = sphere(0.205, CLAY.trousers);
  hips.scale.set(1.05, 0.85, 0.9);
  pelvis.add(hips);

  const legL = buildLeg(-1);
  const legR = buildLeg(1);
  pelvis.add(legL.root, legR.root);

  // buste
  const torso = new THREE.Group();
  torso.position.y = 0.06;
  if (body === "f") torso.scale.x = 0.94;

  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.225, 0.28, 10, 28), clayMat(CLAY.top));
  chest.position.y = 0.3;
  chest.castShadow = true;
  torso.add(chest);

  // ceinture
  const belt = torus(0.205, 0.028, CLAY.trousersDark);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.03;
  torso.add(belt);

  // col roulé
  const collar = torus(0.095, 0.026, CLAY.topDark);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.53;
  torso.add(collar);

  // ventre respirant
  const belly = new THREE.Group();
  belly.position.set(0, 0.17, 0.15);
  const bellyBall = sphere(0.105, CLAY.top);
  belly.add(bellyBall);
  torso.add(belly);

  // écharpe
  if (equipped.includes("echarpe-terracotta")) {
    const scarf = torus(0.135, 0.05, CLAY.accent);
    scarf.rotation.x = Math.PI / 2 + 0.12;
    scarf.position.y = 0.5;
    torso.add(scarf);
    const end = limb(0.2, 0.045, CLAY.accent);
    end.position.set(0.08, 0.32, 0.16);
    torso.add(end);
  }

  // mésange sur l'épaule gauche
  if (equipped.includes("oiseau-mesange")) {
    const bird = new THREE.Group();
    bird.position.set(-0.31, 0.585, 0.02);
    const bodyB = sphere(0.055, CLAY.bird);
    bodyB.scale.set(0.9, 0.85, 1.15);
    const headB = sphere(0.038, CLAY.bird);
    headB.position.set(0, 0.055, 0.035);
    const bib = sphere(0.03, CLAY.cream);
    bib.position.set(0, 0.035, 0.05);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.03, 8), clayMat(CLAY.accent));
    beak.position.set(0, 0.055, 0.075);
    beak.rotation.x = Math.PI / 2;
    const tail = sphere(0.02, CLAY.dark);
    tail.scale.set(0.7, 0.5, 1.8);
    tail.position.set(0, 0.02, -0.07);
    const eye1 = sphere(0.006, CLAY.dark, 8, 6);
    eye1.position.set(-0.02, 0.065, 0.06);
    const eye2 = sphere(0.006, CLAY.dark, 8, 6);
    eye2.position.set(0.02, 0.065, 0.06);
    bird.add(bodyB, headB, bib, beak, tail, eye1, eye2);
    torso.add(bird);
  }

  const armL = buildArm(-1);
  const armR = buildArm(1);
  torso.add(armL.root, armR.root);

  // cou
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.085, 0.15, 20), clayMat(CLAY.skin));
  neck.position.y = 0.57;
  torso.add(neck);

  // tête
  const headBuilt = buildHead(body);
  headBuilt.root.position.y = 0.72;
  torso.add(headBuilt.root);

  // accessoires de tête / visage
  for (const id of equipped) {
    const acc = buildAccessory(id);
    if (acc) headBuilt.root.add(acc);
  }

  pelvis.add(torso);

  const root = new THREE.Group();
  root.add(pelvis);

  return {
    root,
    joints: {
      root,
      pelvis,
      torso,
      belly,
      head: headBuilt.root,
      eyeL: headBuilt.joints.eyeL,
      eyeR: headBuilt.joints.eyeR,
      pupilL: headBuilt.joints.pupilL,
      pupilR: headBuilt.joints.pupilR,
      lidL: headBuilt.joints.lidL,
      lidR: headBuilt.joints.lidR,
      shL: armL.sh,
      elL: armL.el,
      handL: armL.hand,
      shR: armR.sh,
      elR: armR.el,
      handR: armR.hand,
      hipL: legL.hip,
      kneeL: legL.knee,
      ankL: legL.ank,
      hipR: legR.hip,
      kneeR: legR.knee,
      ankR: legR.ank,
    },
  };
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
