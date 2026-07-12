import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  applyPose,
  ClayLights,
  ClayRig,
  GardenStage,
  pelvisBaseY,
  restPose,
  swayHair,
  useRigRefs,
  rad,
  type Pose3D,
} from "./ClayCharacter";
import { poseHand } from "./clayParts";
import { avatarConfig } from "./ExerciseFigure3D";
import { defaultAvatar, useMovaeMaybe } from "../state/store";

// L'avatar à son poste de travail — scène vivante du dashboard.
//
// Assis à un bureau devant un ordinateur, il tape doucement au clavier et,
// de temps en temps, boit une gorgée. Son jardin l'entoure. La scène est en
// gros plan : c'est lui la vedette de la première page.

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function DeskProps() {
  // bureau en bois clair + ordinateur portable + tasse
  return (
    <group>
      {/* plateau */}
      <mesh position={[0, 0.92, 0.46]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.05, 0.62]} />
        <meshStandardMaterial color="#B99772" roughness={0.5} metalness={0.04} />
      </mesh>
      {/* pieds */}
      {[
        [-0.68, 0.62],
        [0.68, 0.62],
        [-0.68, 0.28],
        [0.68, 0.28],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.45, z]}>
          <cylinderGeometry args={[0.028, 0.032, 0.92, 10]} />
          <meshStandardMaterial color="#96784F" roughness={0.5} />
        </mesh>
      ))}
      {/* ordinateur portable : base + écran incliné face à l'avatar */}
      <group position={[0, 0.95, 0.5]}>
        <mesh position={[0, 0.006, 0]} castShadow>
          <boxGeometry args={[0.5, 0.02, 0.34]} />
          <meshStandardMaterial color="#3A342C" roughness={0.35} metalness={0.1} />
        </mesh>
        {/* clavier clair */}
        <mesh position={[0, 0.018, 0.02]}>
          <boxGeometry args={[0.44, 0.004, 0.24]} />
          <meshStandardMaterial color="#5E564D" roughness={0.6} />
        </mesh>
        {/* écran */}
        <group position={[0, 0.02, -0.17]} rotation={[rad(-102), 0, 0]}>
          <mesh position={[0, 0.17, 0]} castShadow>
            <boxGeometry args={[0.5, 0.34, 0.02]} />
            <meshStandardMaterial color="#3A342C" roughness={0.35} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.17, 0.012]}>
            <planeGeometry args={[0.44, 0.28]} />
            <meshStandardMaterial color="#8FB7C9" emissive="#8FB7C9" emissiveIntensity={0.35} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Mug({ mugRef }: { mugRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={mugRef} position={[0.42, 0.99, 0.42]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.1, 16]} />
        <meshStandardMaterial color="#C4795A" roughness={0.45} metalness={0.04} />
      </mesh>
      <mesh position={[0.066, 0, 0]}>
        <torusGeometry args={[0.026, 0.01, 8, 14]} />
        <meshStandardMaterial color="#C4795A" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.052, 0]}>
        <cylinderGeometry args={[0.046, 0.046, 0.006, 16]} />
        <meshStandardMaterial color="#5E4433" roughness={0.6} />
      </mesh>
    </group>
  );
}

function DeskScene() {
  const store = useMovaeMaybe();
  const avatar = store?.state.avatar ?? defaultAvatar();
  const config = avatarConfig(avatar);
  const refs = useRigRefs();
  const mugRef = useRef<THREE.Group>(null);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const baseY = pelvisBaseY(false);

  // pose assise « au travail » : penché vers l'écran, avant-bras vers le bureau
  const work = useMemo<Pose3D>(() => {
    const b = restPose(false);
    return {
      ...b,
      torsoTilt: 7,
      headTilt: 9,
      armL: { fwd: 60, abd: 9, elbowFwd: 84, elbowAbd: 0 },
      armR: { fwd: 60, abd: 9, elbowFwd: 84, elbowAbd: 0 },
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const joints = refs.joints.current;

    // cycle de 15 s : ~11 s de frappe, ~4 s pour boire
    const cyc = t % 15;
    const drinking = cyc > 11 && !reduced.current;
    // 0→1→0 sur la fenêtre de boisson (approche, gorgée, retour)
    const dRaw = drinking ? (cyc - 11) / 4 : 0;
    const drink = smooth(dRaw < 0.5 ? dRaw * 2 : (1 - dRaw) * 2);

    const pose: Pose3D = { ...work };
    // regard qui balaie légèrement l'écran
    pose.gazeX = Math.sin(t * 0.7) * 0.25;

    if (drink > 0) {
      // bras droit porte la tasse à la bouche, tête qui bascule un peu
      pose.armR = {
        fwd: lerp(60, 116, drink),
        abd: lerp(9, 4, drink),
        elbowFwd: lerp(84, 138, drink),
        elbowAbd: 0,
      };
      pose.headTilt = lerp(9, -6, drink);
      pose.torsoTilt = lerp(7, 2, drink);
    }

    // clignements
    let blink = 1;
    if (!reduced.current) {
      const b = (t + 0.6) % 4.2;
      if (b < 0.13) blink = 0.1;
    }

    applyPose(refs, pose, baseY, blink);
    if (!reduced.current) swayHair(refs, t);

    // frappe clavier : les doigts pianotent quand on ne boit pas
    if (joints && !reduced.current) {
      if (drink < 0.05) {
        const tapL = 0.12 + Math.abs(Math.sin(t * 7.0)) * 0.5;
        const tapR = 0.12 + Math.abs(Math.sin(t * 7.0 + 1.7)) * 0.5;
        poseHand(joints.handL, tapL);
        poseHand(joints.handR, tapR);
      } else {
        poseHand(joints.handL, 0.15);
        poseHand(joints.handR, 0.55); // main qui tient la tasse
      }
    }

    // la tasse suit la main droite quand il boit, sinon reste sur le bureau
    if (mugRef.current && joints) {
      if (drink > 0.15) {
        const hand = joints.handR;
        const p = new THREE.Vector3();
        hand.wrist.getWorldPosition(p);
        mugRef.current.position.lerp(p, 0.5);
        mugRef.current.rotation.z = -drink * 0.6;
      } else {
        mugRef.current.position.lerp(new THREE.Vector3(0.42, 0.99, 0.42), 0.2);
        mugRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group position={[0, -0.62, 0]}>
      <ClayLights />
      <group rotation={[0, rad(-8), 0]}>
        <ClayRig refs={refs} config={config} />
        <GardenStage equipped={avatar.equipped} seated />
        <DeskProps />
        <Mug mugRef={mugRef} />
      </group>
    </group>
  );
}

export function AvatarDesk({ height = 300 }: { height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0.15, 0.75, 2.55], fov: 32 }}
        dpr={[1, 2]}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <DeskScene />
      </Canvas>
    </div>
  );
}
