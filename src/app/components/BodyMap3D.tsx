import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { buildCharacter, disposeObject, type BuiltCharacter } from "./clayParts";
import { ClayLights, pelvisBaseY } from "./ClayCharacter";
import { avatarConfig } from "./ExerciseFigure3D";
import { defaultAvatar, useMovaeMaybe } from "../state/store";
import type { Zone } from "../types";

// ============================================================================
// BodyMap 3D — le cœur du dashboard.
//
// Le personnage argy debout, en vrai 3D : chaque partie du corps se teinte
// selon sa sollicitation (sauge → sable → terracotta) et se clique pour
// ouvrir les exercices de la zone. Survol = surbrillance ; clic = raycast qui
// remonte la userData.zone du mesh touché.
// ============================================================================

const FRESH = new THREE.Color("#7FA68A");
const MID = new THREE.Color("#D9C7A7");
const HIGH = new THREE.Color("#C9855C");

function statusColor(strain: number): THREE.Color {
  const t = Math.max(0, Math.min(1, strain / 100));
  const out = new THREE.Color();
  if (t < 0.5) out.lerpColors(FRESH, MID, t * 2);
  else out.lerpColors(MID, HIGH, (t - 0.5) * 2);
  return out;
}

// Les zones de la BodyMap sont les 8 zones Movaé. Les parties d'argile
// portent une userData.zone plus fine ; on la mappe vers la zone cliquable.
function mapZone(raw: string): Zone | null {
  switch (raw) {
    case "yeux":
      return "yeux";
    case "nuque":
      return "nuque";
    case "epaules":
      return "epaules";
    case "dos":
      return "dos";
    case "poignets":
      return "poignets";
    case "hanches":
      return "hanches";
    case "jambes":
      return "jambes";
    case "energie":
      return "energie";
    default:
      return null;
  }
}

function Character({
  strain,
  hovered,
  onHover,
  onPick,
}: {
  strain: Record<Zone, number>;
  hovered: Zone | null;
  onHover: (z: Zone | null) => void;
  onPick: (z: Zone) => void;
}) {
  const store = useMovaeMaybe();
  const config = avatarConfig(store?.state.avatar ?? defaultAvatar());
  const rig = useRef<THREE.Group>(null);

  const key = `${config.hair}|${Object.values(config.colors).join(",")}|${[...config.equipped].sort().join(",")}`;
  const built = useMemo<BuiltCharacter>(
    () => buildCharacter(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  // Remplace les matériaux des meshes « zone » par des clones colorables,
  // regroupés par zone pour la teinte temps réel et la surbrillance.
  const zoneMeshes = useMemo(() => {
    const map = new Map<Zone, THREE.Mesh[]>();
    built.root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const z = o.userData.zone ? mapZone(o.userData.zone) : null;
      if (!z) return;
      const mat = (o.material as THREE.MeshStandardMaterial).clone();
      o.material = mat;
      o.userData.pickZone = z;
      const arr = map.get(z) ?? [];
      arr.push(o);
      map.set(z, arr);
    });
    built.joints.pelvis.position.y = pelvisBaseY(true);
    return map;
  }, [built]);

  useEffect(() => {
    return () => {
      zoneMeshes.forEach((meshes) => meshes.forEach((m) => (m.material as THREE.Material).dispose()));
      disposeObject(built.root);
      built.materials.dispose();
    };
  }, [built, zoneMeshes]);

  // Teinte + surbrillance à chaque frame + légère respiration.
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (rig.current) rig.current.rotation.y = Math.sin(t * 0.25) * 0.12;
    zoneMeshes.forEach((meshes, zone) => {
      const target = statusColor(strain[zone] ?? 0);
      const lift = zone === hovered ? 1.18 : 1;
      for (const m of meshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.color.lerp(target, 0.1);
        mat.emissive.setRGB(0, 0, 0);
        if (zone === hovered) {
          mat.emissive.copy(target).multiplyScalar(0.18);
        }
        void lift;
      }
    });
    // respiration ventrale douce
    const s = 1 + (Math.sin(t * 1.3) * 0.5 + 0.5) * 0.14;
    built.joints.belly.scale.set(s, s, s);
  });

  const pick = (e: ThreeEvent<MouseEvent>, cb: (z: Zone) => void) => {
    e.stopPropagation();
    let obj: THREE.Object3D | null = e.object;
    while (obj) {
      if (obj.userData.pickZone) {
        cb(obj.userData.pickZone as Zone);
        return;
      }
      obj = obj.parent;
    }
  };

  return (
    <group position={[0, -0.86, 0]}>
      <ClayLights />
      <group
        ref={rig}
        onPointerMove={(e) => pick(e, onHover)}
        onPointerOut={() => onHover(null)}
        onClick={(e) => pick(e, onPick)}
      >
        <primitive object={built.root} />
      </group>
    </group>
  );
}

export function BodyMap3D({
  strain,
  onZoneClick,
  hovered,
  onHover,
  size = 260,
}: {
  strain: Record<Zone, number>;
  onZoneClick?: (zone: Zone) => void;
  hovered: Zone | null;
  onHover: (z: Zone | null) => void;
  size?: number;
}) {
  const [ready, setReady] = useState(true);
  if (!ready) return null;

  return (
    <div
      style={{ width: size, height: size * 1.15 }}
      className="shrink-0 cursor-pointer select-none"
      aria-hidden
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0.35, 3.9], fov: 30 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () => setReady(false));
        }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <Character strain={strain} hovered={hovered} onHover={onHover} onPick={(z) => onZoneClick?.(z)} />
      </Canvas>
    </div>
  );
}
