import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ============================================================================
// Avatar riggé (skinned GLB) — rendu lisse, déformation de peau réelle.
//
// Charge un modèle .glb (maillage unique + squelette) déposé dans
// public/avatar/{id}.glb. Détecte automatiquement les os du squelette (noms
// Mixamo / RPM / Meshy) pour pouvoir, ensuite, y rejouer les 100 mouvements.
// Tant qu'aucun .glb n'est présent, l'app utilise l'avatar procédural : ce
// module ne s'active que si le fichier existe (probe HEAD), et retombe
// proprement en cas d'erreur de chargement.
// ============================================================================

// ---------- Détection d'existence du fichier ----------

export function useGlbUrl(id: "male" | "female"): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const candidate = `${import.meta.env.BASE_URL}avatar/${id}.glb`;
    fetch(candidate, { method: "HEAD" })
      .then((r) => {
        if (!cancelled && r.ok) setUrl(candidate);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);
  return url;
}

// ---------- Cartographie des os (best-effort, multi-conventions) ----------

export interface BoneMap {
  hips?: THREE.Bone;
  spine: THREE.Bone[];
  neck?: THREE.Bone;
  head?: THREE.Bone;
  armL?: THREE.Bone;
  foreArmL?: THREE.Bone;
  handL?: THREE.Bone;
  armR?: THREE.Bone;
  foreArmR?: THREE.Bone;
  handR?: THREE.Bone;
  thighL?: THREE.Bone;
  shinL?: THREE.Bone;
  footL?: THREE.Bone;
  thighR?: THREE.Bone;
  shinR?: THREE.Bone;
  footR?: THREE.Bone;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_.:-]/g, "");
const isLeft = (n: string) => /left|(^|[^a-z])l($|[^a-z])|_l\b|\.l\b|l$/.test(n) && !/right/.test(n);
const isRight = (n: string) => /right|(^|[^a-z])r($|[^a-z])|_r\b|\.r\b|r$/.test(n) && !/left/.test(n);

export function mapBones(root: THREE.Object3D): BoneMap {
  const bones: THREE.Bone[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone);
  });
  const map: BoneMap = { spine: [] };
  for (const b of bones) {
    const n = norm(b.name);
    const raw = b.name.toLowerCase();
    if (!map.hips && (n.includes("hips") || n.includes("pelvis") || n === "root")) map.hips = b;
    else if ((n.includes("spine") || n.includes("chest")) && !n.includes("sub")) map.spine.push(b);
    else if (!map.neck && n.includes("neck")) map.neck = b;
    else if (!map.head && n.includes("head") && !n.includes("headtop")) map.head = b;
    else if (n.includes("forearm") || n.includes("lowerarm")) {
      if (isLeft(raw)) map.foreArmL = b;
      else if (isRight(raw)) map.foreArmR = b;
    } else if ((n.includes("upperarm") || n.includes("arm")) && !n.includes("fore")) {
      if (isLeft(raw)) map.armL = b;
      else if (isRight(raw)) map.armR = b;
    } else if (n.includes("hand") && !n.includes("finger") && !n.includes("thumb")) {
      if (isLeft(raw)) map.handL = b;
      else if (isRight(raw)) map.handR = b;
    } else if (n.includes("upleg") || n.includes("thigh") || n.includes("upperleg")) {
      if (isLeft(raw)) map.thighL = b;
      else if (isRight(raw)) map.thighR = b;
    } else if ((n.includes("leg") || n.includes("calf") || n.includes("shin")) && !n.includes("upleg") && !n.includes("upperleg")) {
      if (isLeft(raw)) map.shinL = b;
      else if (isRight(raw)) map.shinR = b;
    } else if (n.includes("foot")) {
      if (isLeft(raw)) map.footL = b;
      else if (isRight(raw)) map.footR = b;
    }
  }
  return map;
}

// ---------- Modèle chargé ----------

function GlbModel({ url, targetHeight = 1.7, onBones }: { url: string; targetHeight?: number; onBones?: (m: BoneMap) => void }) {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // clone pour instances multiples + normalise position/échelle
  const model = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = size.y > 0.001 ? targetHeight / size.y : 1;
    root.scale.setScalar(s);
    // recentre au sol (pieds à y=0)
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;
    root.position.x -= (box2.min.x + box2.max.x) / 2;
    root.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    return root;
  }, [scene, targetHeight]);

  useEffect(() => {
    const m = mapBones(model);
    // trace unique des os détectés (aide au calage des mouvements)
    const names: string[] = [];
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) names.push(o.name);
    });
    // eslint-disable-next-line no-console
    console.info("[Movaé] Avatar GLB — os détectés :", names);
    onBones?.(m);
  }, [model, onBones]);

  useFrame((state) => {
    if (reduced.current || !group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.position.y = Math.sin(t * 1.2) * 0.01; // respiration douce
    group.current.rotation.y = Math.sin(t * 0.3) * 0.12;
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

// ---------- Garde-fou d'erreur ----------

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// Avatar riggé si le .glb existe ; sinon `fallback` (avatar procédural).
export function RiggedAvatar({
  id,
  fallback,
  targetHeight,
  onBones,
}: {
  id: "male" | "female";
  fallback: ReactNode;
  targetHeight?: number;
  onBones?: (m: BoneMap) => void;
}) {
  const url = useGlbUrl(id);
  if (!url) return <>{fallback}</>;
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GlbModel url={url} targetHeight={targetHeight} onBones={onBones} />
      </Suspense>
    </Boundary>
  );
}
