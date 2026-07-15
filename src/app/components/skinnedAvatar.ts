import * as THREE from "three";
import {
  buildAccessory,
  buildFoot,
  buildHand,
  buildHead,
  limb,
  reg,
  sphere,
  torus,
  CLAY,
  MatSet,
  type AvatarConfig,
  type BuiltCharacter,
  type Ctx,
  type Registry,
} from "./clayParts";
import type { Zone } from "../types";

// ============================================================================
// Avatar « jeu vidéo » : UN maillage de peau continu déformé par un squelette
// (THREE.SkinnedMesh + THREE.Bone). Contrairement à un assemblage de pièces
// rigides, la peau se PLIE aux articulations — coudes, genoux, colonne, cou —
// sans aucune couture visible, avec pondérations lissées (smoothstep) autour
// de chaque pivot et torsion progressive de l'avant-bras.
//
// Le squelette reprend EXACTEMENT les positions/noms d'articulations de
// l'ancien rig : applyPose (ClayCharacter.tsx) et les 100 mouvements de
// motions.ts fonctionnent sans changement.
// ============================================================================

// ---------- Pondérations le long d'une chaîne d'os ----------

interface WEntry {
  i: number;
  w: number;
}
type WeightFn = (x: number, y: number, z: number) => WEntry[];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

// chain : os du plus HAUT au plus BAS ; `pivot` = hauteur de l'articulation
// où l'os prend le relais de celui du dessus (absent pour le premier).
interface ChainBone {
  idx: number;
  pivot?: number;
}

function chainWeights(chain: ChainBone[], blend = 0.05): WeightFn {
  return (_x, y) => {
    for (let k = 1; k < chain.length; k++) {
      const p = chain[k].pivot!;
      if (y >= p + blend) return [{ i: chain[k - 1].idx, w: 1 }];
      if (y > p - blend) {
        const t = smooth((p + blend - y) / (2 * blend));
        return [
          { i: chain[k - 1].idx, w: 1 - t },
          { i: chain[k].idx, w: t },
        ];
      }
    }
    return [{ i: chain[chain.length - 1].idx, w: 1 }];
  };
}

// ---------- Tube de peau skinné (profil de rayons + pondérations) ----------

interface TubeSpec {
  cx: number;
  profile: [number, number][]; // [y, rayon], y croissant
  weights: WeightFn;
  material: THREE.Material;
  zone?: Zone;
  capTop?: boolean;
  capBottom?: boolean;
  radial?: number;
  step?: number;
}

function radiusAt(profile: [number, number][], y: number): number {
  if (y <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++) {
    if (y <= profile[i][0]) {
      const [y0, r0] = profile[i - 1];
      const [y1, r1] = profile[i];
      const t = (y - y0) / (y1 - y0);
      return r0 + (r1 - r0) * t;
    }
  }
  return profile[profile.length - 1][1];
}

function skinnedTube(spec: TubeSpec): THREE.SkinnedMesh {
  const radial = spec.radial ?? 22;
  const step = spec.step ?? 0.022;
  const yMin = spec.profile[0][0];
  const yMax = spec.profile[spec.profile.length - 1][0];

  // anneaux : calotte basse → fût → calotte haute
  const rings: { y: number; r: number }[] = [];
  const CAP = [75, 55, 35, 15].map((d) => (d * Math.PI) / 180);
  if (spec.capBottom) {
    const r0 = radiusAt(spec.profile, yMin);
    for (const phi of CAP) rings.push({ y: yMin - r0 * Math.sin(phi) * 0.95, r: r0 * Math.cos(phi) });
  }
  for (let y = yMin; y < yMax - 1e-6; y += step) rings.push({ y, r: radiusAt(spec.profile, y) });
  rings.push({ y: yMax, r: radiusAt(spec.profile, yMax) });
  if (spec.capTop) {
    const rT = radiusAt(spec.profile, yMax);
    for (const phi of [...CAP].reverse()) rings.push({ y: yMax + rT * Math.sin(phi) * 0.95, r: rT * Math.cos(phi) });
  }

  const nRings = rings.length;
  const positions = new Float32Array(nRings * radial * 3);
  const skinIndex = new Uint16Array(nRings * radial * 4);
  const skinWeight = new Float32Array(nRings * radial * 4);

  for (let i = 0; i < nRings; i++) {
    const { y, r } = rings[i];
    const wy = Math.max(yMin, Math.min(yMax, y)); // les calottes suivent l'os d'extrémité
    for (let j = 0; j < radial; j++) {
      const th = (j / radial) * Math.PI * 2;
      const x = spec.cx + r * Math.cos(th);
      const z = r * Math.sin(th);
      const v = (i * radial + j) * 3;
      positions[v] = x;
      positions[v + 1] = y;
      positions[v + 2] = z;

      // pondérations (max 4, normalisées)
      const entries = spec.weights(x, wy, z).slice();
      entries.sort((a, b) => b.w - a.w);
      const top = entries.slice(0, 4);
      const sum = top.reduce((s, e) => s + e.w, 0) || 1;
      const o = (i * radial + j) * 4;
      for (let k = 0; k < 4; k++) {
        skinIndex[o + k] = top[k]?.i ?? 0;
        skinWeight[o + k] = (top[k]?.w ?? 0) / sum;
      }
    }
  }

  const index: number[] = [];
  for (let i = 0; i < nRings - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      index.push(a, d, b, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("skinIndex", new THREE.BufferAttribute(skinIndex, 4));
  geo.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeight, 4));
  geo.setIndex(index);
  geo.computeVertexNormals();

  const mesh = new THREE.SkinnedMesh(geo, spec.material);
  mesh.castShadow = true;
  mesh.frustumCulled = false; // la pose déborde de la boîte du bind
  if (spec.zone) mesh.userData.zone = spec.zone;
  return mesh;
}

// ---------- Le personnage ----------

export function buildCharacter(cfg: AvatarConfig): BuiltCharacter {
  const ms = new MatSet();
  const registry: Registry = new Map();
  const ctx: Ctx = { ms, registry };
  const root = reg(registry, "racine", new THREE.Group());

  // ---- squelette (mêmes positions/noms que l'ancien rig) ----
  const bones: THREE.Bone[] = [];
  const B = (name: string, parent: THREE.Bone | null, x: number, y: number, z: number): THREE.Bone => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    if (parent) parent.add(b);
    registry.set(name, b);
    bones.push(b);
    return b;
  };

  const hips = B("bassin", null, 0, 0.76, 0);
  root.add(hips);
  const spine1 = B("colonne.lombaires", hips, 0, 0.06, 0);
  const spine2 = B("colonne.dorsales", spine1, 0, 0.14, 0);
  const chest = B("colonne.poitrine", spine2, 0, 0.15, 0);
  const belly = B("souffle.ventre", spine1, 0, 0.06, 0.13);
  const chestBreath = B("souffle.poitrine", chest, 0, 0.12, 0.14);
  const neck1 = B("cou.bas", chest, 0, 0.3, 0);
  const neck2 = B("cou.haut", neck1, 0, 0.09, 0);
  const headBone = B("tete.os", neck2, 0, 0.22, 0);

  const side = (s: 1 | -1) => {
    const n = s === -1 ? "g" : "d";
    const clav = B(`clavicule.${n}`, chest, 0.1 * s, 0.24, 0);
    const sh = B(`epaule.${n}`, clav, 0.17 * s, 0, 0);
    const el = B(`coude.${n}`, sh, 0, -0.32, 0);
    const forearm = B(`avant-bras.${n}`, el, 0, 0, 0);
    const handB = B(`main.${n}.os`, forearm, 0, -0.28, 0);
    const hip = B(`hanche.${n}`, hips, 0.13 * s, -0.02, 0);
    const knee = B(`genou.${n}`, hip, 0, -0.36, 0);
    const ank = B(`cheville.${n}`, knee, 0, -0.34, 0);
    return { clav, sh, el, forearm, handB, hip, knee, ank };
  };
  const L = side(-1);
  const R = side(1);

  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const bi = new Map<THREE.Bone, number>(bones.map((b, i) => [b, i]));
  const idx = (b: THREE.Bone) => bi.get(b)!;

  const bind = (mesh: THREE.SkinnedMesh) => {
    root.add(mesh);
    mesh.bind(skeleton, new THREE.Matrix4());
    return mesh;
  };

  // ---- peau : tubes skinnés ----

  // pull (torse) + respiration ventre/poitrine côté face
  const torsoChain = chainWeights(
    [
      { idx: idx(chest) },
      { idx: idx(spine2), pivot: 1.11 },
      { idx: idx(spine1), pivot: 0.96 },
      { idx: idx(hips), pivot: 0.82 },
    ],
    0.05,
  );
  const bump = (y: number, c: number, h: number) => Math.max(0, 1 - Math.abs(y - c) / h);
  const torsoW: WeightFn = (x, y, z) => {
    const e = torsoChain(x, y, z);
    const front = z > 0.02 ? clamp01(z / 0.14) : 0;
    if (front > 0) {
      const wB = 0.45 * front * bump(y, 0.92, 0.12);
      const wC = 0.32 * front * bump(y, 1.2, 0.12);
      if (wB > 0.02) e.push({ i: idx(belly), w: wB });
      if (wC > 0.02) e.push({ i: idx(chestBreath), w: wC });
    }
    return e;
  };
  bind(
    skinnedTube({
      cx: 0,
      profile: [
        [0.8, 0.185],
        [0.9, 0.176],
        [1.0, 0.166],
        [1.11, 0.178],
        [1.24, 0.184],
        [1.32, 0.152],
        [1.38, 0.095],
      ],
      weights: torsoW,
      material: ms.mat(cfg.colors.top),
      zone: "dos",
      capTop: true,
      capBottom: true,
    }),
  );

  // bassin (pantalon)
  const hipsOnly: WeightFn = () => [{ i: idx(hips), w: 1 }];
  bind(
    skinnedTube({
      cx: 0,
      profile: [
        [0.64, 0.15],
        [0.7, 0.176],
        [0.76, 0.186],
        [0.82, 0.186],
      ],
      weights: hipsOnly,
      material: ms.mat(cfg.colors.trousers),
      zone: "hanches",
      capBottom: true,
    }),
  );

  // jambes (pantalon), pli lissé au genou et à la cheville
  for (const S of [L, R]) {
    const cx = S === L ? -0.13 : 0.13;
    const legW = chainWeights(
      [
        { idx: idx(S.hip) },
        { idx: idx(S.knee), pivot: 0.38 },
        { idx: idx(S.ank), pivot: 0.1 },
      ],
      0.05,
    );
    bind(
      skinnedTube({
        cx,
        profile: [
          [0.06, 0.062],
          [0.14, 0.07],
          [0.3, 0.078],
          [0.38, 0.086],
          [0.55, 0.098],
          [0.72, 0.105],
          [0.78, 0.104],
        ],
        weights: legW,
        material: ms.mat(cfg.colors.trousers),
        zone: "jambes",
        capTop: true,
        capBottom: true,
      }),
    );
  }

  // bras (manches) : pli au coude + torsion progressive de l'avant-bras
  for (const S of [L, R]) {
    const cx = S === L ? -0.27 : 0.27;
    const base = chainWeights([{ idx: idx(S.sh) }, { idx: idx(S.el), pivot: 1.03 }], 0.055);
    const armW: WeightFn = (x, y, z) => {
      const e = base(x, y, z);
      const f = clamp01((1.0 - y) / 0.22) * 0.9;
      if (f <= 0) return e;
      const out: WEntry[] = [];
      for (const en of e) {
        if (en.i === idx(S.el)) {
          out.push({ i: en.i, w: en.w * (1 - f) });
          out.push({ i: idx(S.forearm), w: en.w * f });
        } else out.push(en);
      }
      return out;
    };
    bind(
      skinnedTube({
        cx,
        profile: [
          [0.77, 0.055],
          [0.9, 0.06],
          [1.03, 0.064],
          [1.2, 0.07],
          [1.35, 0.075],
        ],
        weights: armW,
        material: ms.mat(cfg.colors.top),
        zone: "epaules",
        capTop: true,
        capBottom: true,
        radial: 18,
      }),
    );
  }

  // cou (peau)
  const neckW = chainWeights(
    [
      { idx: idx(neck2) },
      { idx: idx(neck1), pivot: 1.5 },
      { idx: idx(chest), pivot: 1.41 },
    ],
    0.04,
  );
  bind(
    skinnedTube({
      cx: 0,
      profile: [
        [1.36, 0.086],
        [1.44, 0.072],
        [1.52, 0.068],
        [1.58, 0.066],
      ],
      weights: neckW,
      material: ms.mat(cfg.colors.skin),
      zone: "nuque",
      radial: 18,
    }),
  );

  // ---- éléments rigides portés par les os ----
  let handJointsL: ReturnType<typeof buildHand>["joints"] | undefined;
  let handJointsR: ReturnType<typeof buildHand>["joints"] | undefined;
  let toeL: THREE.Group | undefined;
  let toeR: THREE.Group | undefined;

  // ourlet du pull (terracotta)
  const hem = torus(ctx, 0.19, 0.028, CLAY.accent);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = -0.02;
  spine1.add(hem);
  // col ras-du-cou
  const collar = torus(ctx, 0.088, 0.028, cfg.colors.top);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.28;
  chest.add(collar);

  for (const S of [L, R]) {
    // poignet terracotta + main
    const cuff = torus(ctx, 0.057, 0.022, CLAY.accent);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.21;
    S.forearm.add(cuff);
    const wrist = sphere(ctx, 0.05, cfg.colors.skin, "poignets", 18, 12);
    wrist.position.y = -0.25;
    S.forearm.add(wrist);
    const hand = buildHand(ctx, S === L ? -1 : 1, cfg.colors.skin, `main.${S === L ? "g" : "d"}`);
    hand.root.scale.setScalar(1.15);
    S.handB.add(hand.root);
    if (S === L) handJointsL = hand.joints;
    else handJointsR = hand.joints;

    // bas de pantalon terracotta + chaussure
    const hemCuff = torus(ctx, 0.072, 0.024, CLAY.accent);
    hemCuff.rotation.x = Math.PI / 2;
    hemCuff.position.y = -0.3;
    S.knee.add(hemCuff);
    const foot = buildFoot(ctx, cfg.colors.shoes, `pied.${S === L ? "g" : "d"}`);
    S.ank.add(foot.root);
    if (S === L) toeL = foot.toe;
    else toeR = foot.toe;
  }

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

  // ---- tête (visage complet : yeux, paupières, sourcils, cheveux) ----
  const headBuilt = buildHead(ctx, cfg);
  headBone.add(headBuilt.root);
  for (const id of cfg.equipped) {
    const acc = buildAccessory(ctx, id);
    if (acc) headBuilt.root.add(acc);
  }

  return {
    root,
    registry,
    materials: ms,
    joints: {
      root,
      pelvis: hips,
      spine1,
      spine2,
      chest,
      belly,
      chestBreath,
      clavL: L.clav,
      clavR: R.clav,
      neck1,
      neck2,
      head: headBone,
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
      shL: L.sh,
      elL: L.el,
      forearmL: L.forearm,
      handL: handJointsL!,
      shR: R.sh,
      elR: R.el,
      forearmR: R.forearm,
      handR: handJointsR!,
      hipL: L.hip,
      kneeL: L.knee,
      ankL: L.ank,
      toeL: toeL!,
      hipR: R.hip,
      kneeR: R.knee,
      ankR: R.ank,
      toeR: toeR!,
    },
  };
}
