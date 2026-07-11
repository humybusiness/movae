import * as THREE from "three";
import { addStudioLights, buildCharacter, buildHand, disposeObject } from "./clayParts";
import { applyPose, pelvisBaseY, restPose, type RigRefs } from "./ClayCharacter";
import type { HighlightZone } from "../data/motions";

// ============================================================================
// Vignettes de zone : gros plan 3D STATIQUE de la partie du corps ciblée par
// un exercice (main seule pour les poignets, visage avec pupilles pour les
// yeux, nuque de profil...). Un unique renderer WebGL hors écran produit des
// images (dataURL) mises en cache — la bibliothèque des 100 exercices reste
// légère : de simples <img>, aucun contexte 3D vivant par carte.
// ============================================================================

const SIZE = 384;

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

// Cadrages par zone — personnage debout, sol à y = 0, tête vers y ≈ 1.6.
const FRAMES: Record<Exclude<HighlightZone, "poignets">, Framing> = {
  yeux: { pos: [0, 1.56, 0.72], look: [0, 1.53, 0], fov: 22 },
  tete: { pos: [0.4, 1.66, 0.75], look: [0, 1.52, 0], fov: 26 },
  nuque: { pos: [0.85, 1.6, 0.3], look: [0, 1.45, 0], fov: 24 },
  epaules: { pos: [0, 1.52, 1.1], look: [0, 1.38, 0], fov: 30 },
  poitrine: { pos: [0, 1.38, 1.1], look: [0, 1.3, 0], fov: 30 },
  "haut-dos": { pos: [0.55, 1.55, -1.1], look: [0, 1.32, 0], fov: 30 },
  "bas-dos": { pos: [0.5, 1.2, -1.05], look: [0, 1.02, 0], fov: 28 },
  ventre: { pos: [0, 1.18, 1.0], look: [0, 1.1, 0], fov: 26 },
  hanches: { pos: [0.5, 0.98, 1.1], look: [0, 0.84, 0], fov: 30 },
  jambes: { pos: [0.5, 0.62, 1.5], look: [0, 0.45, 0], fov: 34 },
  corps: { pos: [0, 1.08, 3.3], look: [0, 0.9, 0], fov: 30 },
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

function characterSnapshot(zone: Exclude<HighlightZone, "poignets">, body: "f" | "m"): string {
  const scene = new THREE.Scene();
  const built = buildCharacter(body, []);
  const refs: RigRefs = { joints: { current: built.joints } };
  applyPose(refs, restPose(true), pelvisBaseY(true), 1);
  // met à jour les matrices pour un rendu unique sans boucle d'animation
  built.root.updateMatrixWorld(true);
  scene.add(built.root);
  const url = renderScene(scene, FRAMES[zone]);
  disposeObject(built.root);
  return url;
}

function handSnapshot(): string {
  const scene = new THREE.Scene();
  const hand = buildHand(1);
  // doigts vers le haut, léger 3/4 pour lire le volume
  hand.root.rotation.set(Math.PI, 0.45, 0.08);
  hand.root.position.set(0, -0.02, 0);
  for (const f of hand.joints.fingers) f.rotation.x = 0.14;
  for (const t of hand.joints.tips) t.rotation.x = 0.22;
  const holder = new THREE.Group();
  holder.add(hand.root);
  // avant-bras esquissé sous le poignet
  const forearm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.052, 0.22, 8, 20),
    new THREE.MeshStandardMaterial({ color: "#F0DCC3", roughness: 0.94 }),
  );
  forearm.position.set(0, -0.19, 0);
  holder.add(forearm);
  holder.updateMatrixWorld(true);
  scene.add(holder);
  const url = renderScene(scene, { pos: [0, 0.02, 0.62], look: [0, -0.02, 0], fov: 30 });
  disposeObject(holder);
  return url;
}

// Image (dataURL PNG transparent) du gros plan de la zone. Peut jeter si le
// WebGL est indisponible — l'appelant retombe alors sur la figure 2D.
export function zoneSnapshot(zone: HighlightZone, body: "f" | "m"): string {
  const key = `${zone}|${zone === "poignets" ? "-" : body}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url = zone === "poignets" ? handSnapshot() : characterSnapshot(zone, body);
  cache.set(key, url);
  return url;
}
