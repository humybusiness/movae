import * as THREE from "three";
import { CLAY, MatSet } from "./clayParts";

// ============================================================================
// Le jardin Movaé — les objets et compagnons achetés avec les élans.
//
// Chaque élément est un petit diorama d'argile posé sur l'île du personnage,
// et beaucoup sont VIVANTS : l'eau de la fontaine ondule, la balançoire se
// balance, les papillons voltigent, le chat respire, la queue du chien remue.
// L'animation passe par userData.anim, lue par animateGarden(root, t).
// ============================================================================

type Anim =
  | { type: "sway"; axis: "x" | "z"; amp: number; speed: number; base?: number }
  | { type: "bob"; amp: number; speed: number; baseY: number }
  | { type: "scale-pulse"; amp: number; speed: number }
  | { type: "orbit"; radius: number; speed: number; baseY: number; height?: number }
  | { type: "flap"; amp: number; speed: number };

function setAnim(node: THREE.Object3D, anim: Anim): void {
  node.userData.anim = anim;
}

// À appeler chaque frame : anime tous les nœuds tagués du sous-arbre.
export function animateGarden(root: THREE.Object3D, t: number): void {
  root.traverse((o) => {
    const anim = o.userData.anim as Anim | undefined;
    if (!anim) return;
    switch (anim.type) {
      case "sway":
        o.rotation[anim.axis] = (anim.base ?? 0) + Math.sin(t * anim.speed) * anim.amp;
        break;
      case "bob":
        o.position.y = anim.baseY + Math.sin(t * anim.speed) * anim.amp;
        break;
      case "scale-pulse": {
        const s = 1 + Math.sin(t * anim.speed) * anim.amp;
        o.scale.set(s, s, s);
        break;
      }
      case "orbit": {
        const a = t * anim.speed;
        o.position.set(
          Math.cos(a) * anim.radius,
          anim.baseY + Math.sin(t * 2.3) * (anim.height ?? 0.06),
          Math.sin(a) * anim.radius,
        );
        o.rotation.y = -a;
        break;
      }
      case "flap":
        o.rotation.y = Math.sin(t * anim.speed) * anim.amp;
        break;
    }
  });
}

// ---------- Fabriques ----------

interface G {
  ms: MatSet;
}

function sphere(g: G, r: number, color: string, w = 20, h = 14): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), g.ms.mat(color));
  m.castShadow = true;
  return m;
}

function cyl(g: G, rTop: number, rBot: number, h: number, color: string, seg = 20): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), g.ms.mat(color));
  m.castShadow = true;
  return m;
}

function box(g: G, w: number, h: number, d: number, color: string): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), g.ms.mat(color));
  m.castShadow = true;
  return m;
}

const WOOD = "#B99772";
const WOOD_DARK = "#96784F";
const STONE = "#CFC6B3";
const WATER = "#9EC7D8";

function fontaine(g: G): THREE.Group {
  const root = new THREE.Group();
  const basin = cyl(g, 0.3, 0.34, 0.12, STONE, 28);
  basin.position.y = 0.06;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 12, 32), g.ms.mat(STONE));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.13;
  const water = cyl(g, 0.26, 0.26, 0.03, WATER, 28);
  water.position.y = 0.11;
  setAnim(water, { type: "bob", amp: 0.008, speed: 2.2, baseY: 0.11 });
  const column = cyl(g, 0.05, 0.07, 0.28, STONE, 16);
  column.position.y = 0.26;
  const cup = cyl(g, 0.13, 0.1, 0.05, STONE, 20);
  cup.position.y = 0.41;
  const jet = sphere(g, 0.045, WATER, 14, 10);
  jet.scale.set(0.7, 1.5, 0.7);
  setAnim(jet, { type: "bob", amp: 0.02, speed: 4.5, baseY: 0.5 });
  jet.position.y = 0.5;
  // gouttes
  for (const [x, z, ph] of [[0.15, 0.05, 0.36], [-0.13, 0.1, 0.3], [0.02, -0.16, 0.33]] as const) {
    const drop = sphere(g, 0.016, WATER, 8, 6);
    drop.position.set(x, ph, z);
    setAnim(drop, { type: "bob", amp: 0.05, speed: 3 + x * 4, baseY: ph });
    root.add(drop);
  }
  root.add(basin, rim, water, column, cup, jet);
  return root;
}

function balancoire(g: G): THREE.Group {
  const root = new THREE.Group();
  // portique en A
  for (const s of [-1, 1] as const) {
    const leg1 = cyl(g, 0.02, 0.024, 0.62, WOOD, 10);
    leg1.position.set(0.24 * s, 0.3, 0.1);
    leg1.rotation.x = 0.25;
    const leg2 = cyl(g, 0.02, 0.024, 0.62, WOOD, 10);
    leg2.position.set(0.24 * s, 0.3, -0.1);
    leg2.rotation.x = -0.25;
    root.add(leg1, leg2);
  }
  const beam = cyl(g, 0.022, 0.022, 0.56, WOOD_DARK, 10);
  beam.rotation.z = Math.PI / 2;
  beam.position.y = 0.58;
  root.add(beam);
  // balancelle qui oscille toute seule
  const swing = new THREE.Group();
  swing.position.y = 0.58;
  setAnim(swing, { type: "sway", axis: "x", amp: 0.28, speed: 1.1 });
  for (const s of [-1, 1] as const) {
    const rope = cyl(g, 0.006, 0.006, 0.4, CLAY.cream, 6);
    rope.position.set(0.1 * s, -0.2, 0);
    swing.add(rope);
  }
  const seat = box(g, 0.26, 0.025, 0.1, WOOD_DARK);
  seat.position.y = -0.41;
  swing.add(seat);
  root.add(swing);
  return root;
}

function hamac(g: G): THREE.Group {
  const root = new THREE.Group();
  for (const s of [-1, 1] as const) {
    const post = cyl(g, 0.025, 0.03, 0.5, WOOD, 10);
    post.position.set(0.42 * s, 0.25, 0);
    root.add(post);
    const foot = sphere(g, 0.05, WOOD_DARK, 12, 8);
    foot.scale.y = 0.4;
    foot.position.set(0.42 * s, 0.02, 0);
    root.add(foot);
  }
  // toile : arc de tore aplati, respire doucement
  const cloth = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.085, 10, 30, Math.PI * 0.75),
    g.ms.mat(CLAY.accent),
  );
  cloth.scale.set(1, 0.55, 0.6);
  cloth.rotation.z = Math.PI + Math.PI * 0.125;
  cloth.position.y = 0.42;
  setAnim(cloth, { type: "bob", amp: 0.012, speed: 1.4, baseY: 0.42 });
  cloth.castShadow = true;
  root.add(cloth);
  return root;
}

function banc(g: G): THREE.Group {
  const root = new THREE.Group();
  const seat = box(g, 0.4, 0.03, 0.14, WOOD);
  seat.position.y = 0.16;
  const back = box(g, 0.4, 0.12, 0.025, WOOD);
  back.position.set(0, 0.26, -0.06);
  back.rotation.x = -0.15;
  root.add(seat, back);
  for (const [x, z] of [[-0.16, 0.05], [0.16, 0.05], [-0.16, -0.05], [0.16, -0.05]] as const) {
    const leg = cyl(g, 0.014, 0.016, 0.16, WOOD_DARK, 8);
    leg.position.set(x, 0.08, z);
    root.add(leg);
  }
  return root;
}

function lanterne(g: G): THREE.Group {
  const root = new THREE.Group();
  const post = cyl(g, 0.014, 0.018, 0.5, CLAY.dark, 10);
  post.position.y = 0.25;
  const cage = box(g, 0.09, 0.11, 0.09, CLAY.dark);
  cage.position.y = 0.55;
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 14, 10),
    new THREE.MeshStandardMaterial({ color: "#FFD9A0", emissive: "#FFB55C", emissiveIntensity: 0.9, roughness: 0.6 }),
  );
  light.position.y = 0.55;
  setAnim(light, { type: "scale-pulse", amp: 0.08, speed: 2.6 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.06, 4), g.ms.mat(CLAY.dark));
  roof.position.y = 0.63;
  roof.rotation.y = Math.PI / 4;
  root.add(post, cage, light, roof);
  return root;
}

function arbre(g: G): THREE.Group {
  const root = new THREE.Group();
  const trunk = cyl(g, 0.05, 0.075, 0.42, WOOD_DARK, 12);
  trunk.position.y = 0.21;
  root.add(trunk);
  const crown = new THREE.Group();
  crown.position.y = 0.56;
  setAnim(crown, { type: "scale-pulse", amp: 0.02, speed: 1.1 });
  for (const [r, x, y, z, c] of [
    [0.2, 0, 0.02, 0, CLAY.leaf],
    [0.14, -0.15, 0.1, 0.04, CLAY.leafDark],
    [0.13, 0.15, 0.1, -0.03, CLAY.leaf],
    [0.12, 0.02, 0.2, 0.05, CLAY.leafDark],
  ] as const) {
    const blob = sphere(g, r, c, 24, 18);
    blob.position.set(x, y, z);
    crown.add(blob);
  }
  root.add(crown);
  return root;
}

function parterreFleurs(g: G): THREE.Group {
  const root = new THREE.Group();
  const colors = ["#D98A9C", "#E0B85C", "#B48BC6", CLAY.accent, "#8FB7C9"];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const f = new THREE.Group();
    f.position.set(Math.cos(a) * 0.11, 0, Math.sin(a) * 0.11);
    const stem = cyl(g, 0.007, 0.009, 0.12 + (i % 2) * 0.04, CLAY.leafDark, 6);
    stem.position.y = 0.07;
    const bloom = new THREE.Group();
    bloom.position.y = 0.15 + (i % 2) * 0.04;
    setAnim(bloom, { type: "sway", axis: "z", amp: 0.12, speed: 1.3 + i * 0.2 });
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2;
      const petal = sphere(g, 0.022, colors[i], 10, 8);
      petal.position.set(Math.cos(pa) * 0.028, 0, Math.sin(pa) * 0.028);
      petal.scale.set(1, 0.55, 1);
      bloom.add(petal);
    }
    const heart = sphere(g, 0.018, "#F2D06B", 10, 8);
    bloom.add(heart);
    f.add(stem, bloom);
    root.add(f);
  }
  return root;
}

function potager(g: G): THREE.Group {
  const root = new THREE.Group();
  const frame = box(g, 0.34, 0.08, 0.22, WOOD);
  frame.position.y = 0.04;
  const soil = box(g, 0.3, 0.03, 0.18, "#7A5C43");
  soil.position.y = 0.08;
  root.add(frame, soil);
  for (let i = 0; i < 3; i++) {
    const salad = new THREE.Group();
    salad.position.set(-0.09 + i * 0.09, 0.11, 0);
    for (let l = 0; l < 5; l++) {
      const a = (l / 5) * Math.PI * 2;
      const leaf = sphere(g, 0.026, l % 2 ? CLAY.leaf : CLAY.leafDark, 10, 8);
      leaf.position.set(Math.cos(a) * 0.02, 0.008, Math.sin(a) * 0.02);
      leaf.scale.set(1, 0.8, 1);
      salad.add(leaf);
    }
    root.add(salad);
  }
  return root;
}

function ruche(g: G): THREE.Group {
  const root = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.12 - i * 0.02, 0.045 - i * 0.004, 12, 26),
      g.ms.mat("#E0B85C"),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05 + i * 0.062;
    ring.castShadow = true;
    root.add(ring);
  }
  const door = sphere(g, 0.025, CLAY.dark, 10, 8);
  door.scale.set(1, 1.2, 0.5);
  door.position.set(0, 0.07, 0.135);
  root.add(door);
  // deux abeilles en orbite
  for (const [r, sp, y] of [[0.24, 2.1, 0.28], [0.3, -1.6, 0.18]] as const) {
    const bee = new THREE.Group();
    setAnim(bee, { type: "orbit", radius: r, speed: sp, baseY: y, height: 0.05 });
    const beeBody = sphere(g, 0.018, "#E0B85C", 10, 8);
    beeBody.scale.set(1, 0.85, 1.25);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.005, 8, 12), g.ms.mat(CLAY.dark));
    stripe.rotation.x = Math.PI / 2;
    const wing = sphere(g, 0.012, CLAY.white, 8, 6);
    wing.scale.set(1.4, 0.3, 0.8);
    wing.position.y = 0.018;
    bee.add(beeBody, stripe, wing);
    root.add(bee);
  }
  return root;
}

function parasol(g: G): THREE.Group {
  const root = new THREE.Group();
  const pole = cyl(g, 0.015, 0.018, 0.66, WOOD, 10);
  pole.position.y = 0.33;
  root.add(pole);
  const canopy = new THREE.Group();
  canopy.position.y = 0.64;
  setAnim(canopy, { type: "sway", axis: "z", amp: 0.03, speed: 0.9, base: 0.08 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.14, 10), g.ms.mat(CLAY.cream));
  cone.castShadow = true;
  canopy.add(cone);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const stripe = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.141, 2), g.ms.mat(CLAY.accent));
    stripe.rotation.y = a;
    stripe.scale.set(0.16, 1, 1);
    canopy.add(stripe);
  }
  const tip = sphere(g, 0.025, CLAY.accent, 10, 8);
  tip.position.y = 0.09;
  canopy.add(tip);
  root.add(canopy);
  return root;
}

function planteEnPot(g: G): THREE.Group {
  const root = new THREE.Group();
  const pot = cyl(g, 0.1, 0.08, 0.18, CLAY.pot, 16);
  pot.position.y = 0.1;
  root.add(pot);
  const leaves = new THREE.Group();
  leaves.position.y = 0.28;
  setAnim(leaves, { type: "scale-pulse", amp: 0.025, speed: 1.2 });
  for (const [r, x, y, z, c] of [
    [0.09, 0, 0, 0, CLAY.leaf],
    [0.06, -0.06, 0.07, 0.02, CLAY.leafDark],
    [0.05, 0.07, 0.06, -0.02, CLAY.leaf],
  ] as const) {
    const b = sphere(g, r, c, 14, 10);
    b.position.set(x, y, z);
    leaves.add(b);
  }
  root.add(leaves);
  return root;
}

function tasseTisane(g: G): THREE.Group {
  const root = new THREE.Group();
  const cup = cyl(g, 0.07, 0.055, 0.12, CLAY.cream, 16);
  cup.position.y = 0.07;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 8, 14), g.ms.mat(CLAY.cream));
  handle.position.set(0.085, 0.07, 0);
  const tea = cyl(g, 0.06, 0.06, 0.01, "#C9A86A", 14);
  tea.position.y = 0.125;
  const steam = sphere(g, 0.018, "#FFFFFF", 10, 8);
  steam.scale.set(1, 1.6, 1);
  (steam.material as THREE.MeshStandardMaterial) = new THREE.MeshStandardMaterial({
    color: "#FFFFFF",
    roughness: 1,
    transparent: true,
    opacity: 0.35,
  });
  setAnim(steam, { type: "bob", amp: 0.03, speed: 1.8, baseY: 0.19 });
  steam.position.y = 0.19;
  root.add(cup, handle, tea, steam);
  return root;
}

// ---------- Compagnons ----------

function chat(g: G): THREE.Group {
  const root = new THREE.Group();
  // chat roulé en boule qui respire
  const body = new THREE.Group();
  setAnim(body, { type: "scale-pulse", amp: 0.02, speed: 1.6 });
  const torso = sphere(g, 0.11, "#C98F5F", 24, 18);
  torso.scale.set(1.25, 0.8, 1.1);
  torso.position.y = 0.085;
  body.add(torso);
  const head = sphere(g, 0.065, "#C98F5F", 20, 14);
  head.position.set(0.1, 0.1, 0.05);
  body.add(head);
  for (const s of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.035, 8), g.ms.mat("#B57C4C"));
    ear.position.set(0.1 + 0.028 * s, 0.16, 0.05);
    body.add(ear);
    const eye = sphere(g, 0.007, CLAY.dark, 8, 6);
    eye.position.set(0.135, 0.11, 0.05 + 0.022 * s);
    body.add(eye);
  }
  const muzzle = sphere(g, 0.02, CLAY.cream, 10, 8);
  muzzle.position.set(0.155, 0.085, 0.05);
  body.add(muzzle);
  // queue enroulée qui remue au bout
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 10, 22, Math.PI * 1.3), g.ms.mat("#B57C4C"));
  tail.rotation.set(Math.PI / 2, 0, 0.6);
  tail.position.set(-0.08, 0.045, 0.06);
  body.add(tail);
  const tailTip = sphere(g, 0.022, CLAY.dark, 10, 8);
  tailTip.position.set(-0.15, 0.06, 0.12);
  setAnim(tailTip, { type: "bob", amp: 0.02, speed: 3.2, baseY: 0.06 });
  body.add(tailTip);
  root.add(body);
  return root;
}

function chien(g: G): THREE.Group {
  const root = new THREE.Group();
  // assis bien droit
  const body = sphere(g, 0.095, "#A98457", 24, 18);
  body.scale.set(0.95, 1.25, 1);
  body.position.y = 0.12;
  const chestP = sphere(g, 0.05, CLAY.cream, 14, 10);
  chestP.scale.set(0.8, 1.2, 0.6);
  chestP.position.set(0, 0.12, 0.075);
  const head = sphere(g, 0.07, "#A98457", 20, 14);
  head.position.set(0, 0.28, 0.02);
  const muzzle = sphere(g, 0.032, CLAY.cream, 12, 8);
  muzzle.scale.set(0.9, 0.7, 1.1);
  muzzle.position.set(0, 0.26, 0.075);
  const nose = sphere(g, 0.012, CLAY.dark, 8, 6);
  nose.position.set(0, 0.27, 0.105);
  root.add(body, chestP, head, muzzle, nose);
  for (const s of [-1, 1] as const) {
    // oreilles tombantes
    const ear = sphere(g, 0.028, "#8A6A42", 12, 8);
    ear.scale.set(0.55, 1.2, 0.7);
    ear.position.set(0.065 * s, 0.31, 0);
    root.add(ear);
    const eye = sphere(g, 0.008, CLAY.dark, 8, 6);
    eye.position.set(0.028 * s, 0.3, 0.062);
    root.add(eye);
    // pattes avant
    const paw = cyl(g, 0.018, 0.022, 0.12, "#A98457", 10);
    paw.position.set(0.04 * s, 0.06, 0.06);
    root.add(paw);
  }
  // queue qui remue
  const tail = new THREE.Group();
  tail.position.set(0, 0.08, -0.09);
  setAnim(tail, { type: "flap", amp: 0.5, speed: 6 });
  const tailMesh = cyl(g, 0.012, 0.02, 0.11, "#8A6A42", 8);
  tailMesh.rotation.x = -1;
  tailMesh.position.set(0, 0.02, -0.04);
  tail.add(tailMesh);
  root.add(tail);
  return root;
}

function lapin(g: G): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Group();
  setAnim(body, { type: "bob", amp: 0.006, speed: 5, baseY: 0 });
  const torso = sphere(g, 0.07, "#D9CBB8", 20, 14);
  torso.scale.set(0.95, 0.9, 1.2);
  torso.position.y = 0.065;
  const head = sphere(g, 0.048, "#D9CBB8", 18, 12);
  head.position.set(0, 0.12, 0.055);
  const tail = sphere(g, 0.022, CLAY.white, 10, 8);
  tail.position.set(0, 0.07, -0.08);
  body.add(torso, head, tail);
  for (const s of [-1, 1] as const) {
    const ear = sphere(g, 0.016, "#D9CBB8", 10, 8);
    ear.scale.set(0.7, 2.6, 0.6);
    ear.position.set(0.022 * s, 0.19, 0.03);
    ear.rotation.x = -0.15;
    body.add(ear);
    const inner = sphere(g, 0.009, CLAY.blush, 8, 6);
    inner.scale.set(0.6, 2.2, 0.5);
    inner.position.set(0.022 * s, 0.19, 0.038);
    body.add(inner);
    const eye = sphere(g, 0.006, CLAY.dark, 8, 6);
    eye.position.set(0.026 * s, 0.125, 0.09);
    body.add(eye);
  }
  const muzzle = sphere(g, 0.012, CLAY.blush, 8, 6);
  muzzle.position.set(0, 0.11, 0.1);
  body.add(muzzle);
  root.add(body);
  return root;
}

function papillons(g: G): THREE.Group {
  const root = new THREE.Group();
  for (const [r, sp, y, c] of [
    [0.5, 0.9, 1.1, "#D98A9C"],
    [0.65, -0.7, 0.75, "#8FB7C9"],
  ] as const) {
    const fly = new THREE.Group();
    setAnim(fly, { type: "orbit", radius: r, speed: sp, baseY: y, height: 0.12 });
    const bodyB = sphere(g, 0.012, CLAY.dark, 8, 6);
    bodyB.scale.set(0.6, 1, 1.6);
    fly.add(bodyB);
    for (const s of [-1, 1] as const) {
      const wing = sphere(g, 0.028, c, 10, 8);
      wing.scale.set(1.2, 0.15, 0.9);
      wing.position.set(0.026 * s, 0.008, 0);
      setAnim(wing, { type: "sway", axis: "z", amp: 0.6, speed: 12, base: 0.25 * s });
      fly.add(wing);
    }
    root.add(fly);
  }
  return root;
}

// ---------- Assemblage du jardin ----------

// Position (x, z) et orientation de chaque élément sur l'île.
const LAYOUT: Record<string, { pos: [number, number]; rotY?: number; scale?: number }> = {
  fontaine: { pos: [0, -1.05] },
  arbre: { pos: [1.0, -0.55] },
  balancoire: { pos: [-1.05, -0.5], rotY: 0.5 },
  hamac: { pos: [1.05, 0.45], rotY: -0.6 },
  banc: { pos: [-0.9, 0.42], rotY: 0.7 },
  lanterne: { pos: [0.55, 0.85] },
  "parterre-fleurs": { pos: [-0.45, 0.85] },
  potager: { pos: [-1.25, -0.05], rotY: 1.2 },
  ruche: { pos: [1.3, -0.05] },
  parasol: { pos: [0.6, -0.75] },
  "plante-pot": { pos: [-0.62, -0.78] },
  "tasse-tisane": { pos: [0.3, 0.68] },
  chat: { pos: [0.72, 0.2], rotY: -0.9 },
  chien: { pos: [-0.68, 0.05], rotY: 0.8 },
  lapin: { pos: [-0.25, 0.72], rotY: 0.3 },
  papillons: { pos: [0, 0] },
};

const BUILDERS: Record<string, (g: G) => THREE.Group> = {
  fontaine,
  arbre,
  balancoire,
  hamac,
  banc,
  lanterne,
  "parterre-fleurs": parterreFleurs,
  potager,
  ruche,
  parasol,
  "plante-pot": planteEnPot,
  "tasse-tisane": tasseTisane,
  chat,
  chien,
  lapin,
  papillons,
};

export function gardenItemIds(equipped: string[]): string[] {
  return equipped.filter((id) => BUILDERS[id] !== undefined);
}

// Construit l'île + les éléments installés. `ms` : matériaux partagés du propriétaire.
export function buildGarden(equipped: string[], ms: MatSet, opts?: { seated?: boolean; desk?: boolean }): THREE.Group {
  const g: G = { ms };
  const root = new THREE.Group();
  const items = gardenItemIds(equipped);
  const radius = items.length >= 3 ? 1.55 : items.length >= 1 ? 1.25 : 0.98;

  // île d'argile
  const island = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.07, 0.09, 56), ms.mat(CLAY.pedestal));
  island.position.y = -0.045;
  island.receiveShadow = true;
  root.add(island);
  // herbe clairsemée
  const grassCount = Math.min(10, 3 + items.length * 2);
  for (let i = 0; i < grassCount; i++) {
    const a = (i / grassCount) * Math.PI * 2 + 0.7;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.11, 6), ms.mat(i % 2 ? CLAY.leaf : CLAY.leafDark));
    blade.position.set(Math.cos(a) * radius * 0.82, 0.05, Math.sin(a) * radius * 0.82);
    blade.rotation.z = Math.sin(i * 3.1) * 0.25;
    root.add(blade);
  }
  // galets
  for (const [x, z, r] of [[-0.72, 0.4, 0.06], [-0.6, 0.52, 0.04]] as const) {
    const pebble = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), ms.mat("#D8CDB6"));
    pebble.scale.y = 0.55;
    pebble.position.set(x, 0.02, z);
    root.add(pebble);
  }

  // tabouret quand assis
  if (opts?.seated) {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.23, 0.09, 24), ms.mat(CLAY.stool));
    seat.position.set(0, 0.42, -0.05);
    seat.castShadow = true;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.38, 14), ms.mat(CLAY.stool));
    leg.position.set(0, 0.2, -0.05);
    root.add(seat, leg);
  }
  // bureau esquissé
  if (opts?.desk) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.42), ms.mat(CLAY.stool));
    top.position.set(0.62, 0.62, 0.15);
    top.castShadow = true;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.6, 10), ms.mat(CLAY.stool));
    leg.position.set(0.82, 0.3, 0.15);
    root.add(top, leg);
  }

  for (const id of items) {
    const spot = LAYOUT[id];
    const item = BUILDERS[id](g);
    if (spot) {
      item.position.set(spot.pos[0], 0, spot.pos[1]);
      if (spot.rotY) item.rotation.y = spot.rotY;
      if (spot.scale) item.scale.setScalar(spot.scale);
      // resserre sur la petite île
      const d = Math.hypot(spot.pos[0], spot.pos[1]);
      const maxD = radius * 0.8;
      if (d > maxD && d > 0) {
        item.position.x *= maxD / d;
        item.position.z *= maxD / d;
      }
    }
    root.add(item);
  }

  return root;
}
