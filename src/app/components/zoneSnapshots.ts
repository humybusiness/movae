import * as THREE from "three";
import {
  addStudioLights,
  buildLooseHand,
  disposeObject,
  poseHand,
  type AvatarConfig,
} from "./clayParts";
import { buildCharacter } from "./skinnedAvatar";
import type { HighlightZone } from "../data/motions";

// ============================================================================
// Vignettes de zone : gros plan 3D STATIQUE de la partie du corps ciblée par
// un exercice (main seule pour les poignets, visage avec pupilles pour les
// yeux, nuque de profil...). Un unique renderer WebGL hors écran produit des
// images (dataURL) mises en cache — la bibliothèque des 100 exercices reste
// légère : de simples <img>, aucun contexte 3D vivant par carte.
// ============================================================================

const SIZE = 448;

let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<string, string>();

function getRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      canvas: document.createElement("canvas"),
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(SIZE, SIZE);
    renderer.setClearColor(0x000000, 0);
  }
  return renderer;
}

interface Framing {
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
}

// Cadrages par zone — personnage debout reconnaissable, sol à y = 0, tête
// vers y ≈ 1.55. On ne fait PAS de macro-crop illisible : on garde le
// personnage entier ou en buste, filmé en léger 3/4, avec la zone ciblée
// mise en valeur (les autres parties sont légèrement désaturées).
const FULL: Framing = { pos: [0.5, 1.05, 3.35], look: [0, 0.86, 0], fov: 32 };
const BUST: Framing = { pos: [0.55, 1.4, 2.3], look: [0, 1.22, 0], fov: 32 };

const FRAMES: Record<Exclude<HighlightZone, "poignets">, Framing> = {
  yeux: { pos: [0.32, 1.55, 1.35], look: [0, 1.47, 0], fov: 30 },
  tete: { pos: [0.4, 1.58, 1.4], look: [0, 1.46, 0], fov: 30 },
  nuque: { pos: [0.75, 1.5, 1.2], look: [0, 1.36, 0], fov: 30 },
  epaules: BUST,
  poitrine: BUST,
  "haut-dos": { pos: [0.7, 1.42, -2.1], look: [0, 1.2, 0], fov: 32 },
  "bas-dos": { pos: [0.6, 1.0, -2.4], look: [0, 0.95, 0], fov: 34 },
  ventre: { pos: [0.3, 1.2, 2.0], look: [0, 1.08, 0], fov: 32 },
  hanches: { pos: [0.5, 0.9, 2.4], look: [0, 0.82, 0], fov: 34 },
  jambes: { pos: [0.5, 0.6, 2.7], look: [0, 0.5, 0], fov: 36 },
  corps: FULL,
};

// Met en valeur la zone ciblée sans ternir le personnage : couleurs
// naturelles conservées partout, la zone travaillée reçoit un halo terracotta
// émissif (elle « s'allume »), les autres sont à peine estompées.
const HALO = new THREE.Color("#C4795A");
function highlightZone(built: ReturnType<typeof buildCharacter>, zone: HighlightZone): void {
  const mute = new THREE.Color("#EDE7DA");
  built.root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.userData.zone) return;
    const m = o.material as THREE.MeshStandardMaterial;
    const c = m.clone();
    if (o.userData.zone === zone) {
      c.emissive = HALO.clone().multiplyScalar(0.45);
    } else {
      c.color.lerp(mute, 0.22);
    }
    o.material = c;
    o.userData.tintClone = true;
  });
}

const BASE_CONFIG: AvatarConfig = {
  hair: "court",
  colors: {
    skin: "#F0DCC3",
    hair: "#4A3F35",
    top: "#8FAE97",
    trousers: "#6F665C",
    shoes: "#4C443B",
  },
  equipped: [],
};

function renderScene(scene: THREE.Scene, framing: Framing): string {
  const r = getRenderer();
  const camera = new THREE.PerspectiveCamera(framing.fov, 1, 0.05, 20);
  camera.position.set(...framing.pos);
  camera.lookAt(new THREE.Vector3(...framing.look));
  addStudioLights(scene);
  r.render(scene, camera);
  return r.domElement.toDataURL("image/png");
}

function characterSnapshot(zone: Exclude<HighlightZone, "poignets">, config: AvatarConfig): string {
  const scene = new THREE.Scene();
  const built = buildCharacter(config);
  // pose debout, mains le long du corps
  built.joints.pelvis.position.y = 0.76;
  highlightZone(built, zone);
  built.root.updateMatrixWorld(true);
  scene.add(built.root);
  const url = renderScene(scene, FRAMES[zone]);
  // libère les clones de teinte + géométries + matériaux
  built.root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.userData.tintClone) (o.material as THREE.Material).dispose();
  });
  disposeObject(built.root);
  built.materials.dispose();
  return url;
}

function handSnapshot(skin: string): string {
  const scene = new THREE.Scene();
  const hand = buildLooseHand(1, skin);
  poseHand(hand.joints, 0.12);
  hand.root.rotation.set(Math.PI, 0.4, 0.06);
  hand.root.position.set(0, 0.02, 0);
  const holder = new THREE.Group();
  holder.add(hand.root);
  // avant-bras esquissé sous le poignet
  const forearm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.052, 0.22, 8, 20),
    hand.ms.mat(skin),
  );
  forearm.position.set(0, -0.2, 0);
  holder.add(forearm);
  holder.updateMatrixWorld(true);
  scene.add(holder);
  const url = renderScene(scene, { pos: [0, 0.02, 0.6], look: [0, -0.02, 0], fov: 30 });
  disposeObject(holder);
  hand.ms.dispose();
  return url;
}

// Image (dataURL PNG transparent) du gros plan de la zone. Peut jeter si le
// WebGL est indisponible — l'appelant retombe alors sur la figure 2D.
export function zoneSnapshot(zone: HighlightZone, config?: AvatarConfig): string {
  const cfg = config ?? BASE_CONFIG;
  const key = `${zone}|${zone === "poignets" ? cfg.colors.skin : cfg.hair + Object.values(cfg.colors).join("")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url = zone === "poignets" ? handSnapshot(cfg.colors.skin) : characterSnapshot(zone, cfg);
  cache.set(key, url);
  return url;
}
