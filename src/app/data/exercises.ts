import type { Zone } from "../types";

export type Visual =
  | "headTurn"
  | "headTilt"
  | "chinTuck"
  | "shoulderRoll"
  | "chestOpen"
  | "twist"
  | "forwardFold"
  | "backExtend"
  | "pelvis"
  | "wristFlex"
  | "wristCircles"
  | "legExtend"
  | "heelToe"
  | "figureFour"
  | "seatedMarch"
  | "gaze"
  | "palming"
  | "focusShift"
  | "breath"
  | "reachUp";

export interface Exercise {
  id: string;
  name: string;
  zones: Zone[];
  durationSec: number;
  steps: string[];
  why: string;
  discretion: 1 | 2 | 3; // 1 = invisible, 2 = discret, 3 = visible
  visual: Visual;
}

export const EXERCISES: Exercise[] = [
  // ---------- Nuque ----------
  {
    id: "rotation-nuque",
    name: "Rotations lentes de la nuque",
    zones: ["nuque"],
    durationSec: 45,
    steps: [
      "Asseyez-vous grand, épaules relâchées.",
      "Tournez lentement la tête vers la droite, revenez au centre.",
      "Même chose vers la gauche. Alternez sans forcer.",
    ],
    why: "Relance la mobilité de la nuque après une longue période face à l’écran.",
    discretion: 2,
    visual: "headTurn",
  },
  {
    id: "inclinaison-nuque",
    name: "Inclinaisons latérales tenues",
    zones: ["nuque", "epaules"],
    durationSec: 50,
    steps: [
      "Laissez tomber l’oreille droite vers l’épaule droite.",
      "Gardez l’épaule gauche basse, respirez 3 fois.",
      "Changez de côté.",
    ],
    why: "Détend les muscles latéraux du cou, souvent sollicités en position statique.",
    discretion: 2,
    visual: "headTilt",
  },
  {
    id: "menton-rentre",
    name: "Rétractions du menton",
    zones: ["nuque", "dos"],
    durationSec: 40,
    steps: [
      "Regard à l’horizontale, reculez doucement le menton.",
      "Imaginez grandir par le sommet du crâne.",
      "Tenez 3 secondes, relâchez. Répétez.",
    ],
    why: "Contrebalance la position tête en avant typique du travail sur écran.",
    discretion: 1,
    visual: "chinTuck",
  },
  // ---------- Épaules ----------
  {
    id: "roulements-epaules",
    name: "Roulements d’épaules",
    zones: ["epaules", "nuque"],
    durationSec: 40,
    steps: [
      "Montez les épaules vers les oreilles.",
      "Roulez-les vers l’arrière puis vers le bas.",
      "Gardez un rythme lent et ample.",
    ],
    why: "Relâche les trapèzes et rouvre le haut du dos.",
    discretion: 2,
    visual: "shoulderRoll",
  },
  {
    id: "ouverture-poitrine",
    name: "Ouverture de poitrine",
    zones: ["epaules", "dos"],
    durationSec: 45,
    steps: [
      "Croisez les mains derrière le dos, bras tendus.",
      "Ouvrez la poitrine en rapprochant les omoplates.",
      "Respirez profondément, relâchez, recommencez.",
    ],
    why: "Compense la fermeture des épaules devant le clavier.",
    discretion: 2,
    visual: "chestOpen",
  },
  {
    id: "etirement-trapezes",
    name: "Étirement des trapèzes",
    zones: ["nuque", "epaules"],
    durationSec: 50,
    steps: [
      "Main droite posée délicatement sur le côté gauche de la tête.",
      "Inclinez la tête vers la droite, sans tirer.",
      "Tenez 15 secondes puis changez de côté.",
    ],
    why: "Cible les tensions entre le cou et les épaules.",
    discretion: 2,
    visual: "headTilt",
  },
  // ---------- Dos ----------
  {
    id: "rotation-assise",
    name: "Rotation du buste",
    zones: ["dos"],
    durationSec: 45,
    steps: [
      "Posez la main droite sur le dossier ou l’accoudoir.",
      "Tournez lentement le buste vers la droite en expirant.",
      "Revenez au centre, puis tournez à gauche.",
    ],
    why: "Mobilise la colonne en rotation, un mouvement absent des journées écran.",
    discretion: 2,
    visual: "twist",
  },
  {
    id: "deroule-avant",
    name: "Déroulé du dos vers l’avant",
    zones: ["dos", "hanches"],
    durationSec: 45,
    steps: [
      "Laissez tomber le menton puis déroulez le dos vers l’avant.",
      "Laissez les bras pendre vers le sol, relâchez tout.",
      "Remontez vertèbre par vertèbre, lentement.",
    ],
    why: "Relâche toute la chaîne postérieure et change la pression sur le bas du dos.",
    discretion: 3,
    visual: "forwardFold",
  },
  {
    id: "extension-thoracique",
    name: "Extension du haut du dos",
    zones: ["dos", "epaules"],
    durationSec: 35,
    steps: [
      "Mains croisées derrière la tête, coudes ouverts.",
      "Ouvrez la poitrine vers le plafond en inspirant.",
      "Revenez doucement. Répétez 5 fois.",
    ],
    why: "Redonne de l’extension au dos, arrondi par la position assise.",
    discretion: 3,
    visual: "backExtend",
  },
  {
    id: "bascule-bassin",
    name: "Bascules du bassin",
    zones: ["dos", "hanches"],
    durationSec: 40,
    steps: [
      "Assis au milieu de la chaise, mains sur les cuisses.",
      "Creusez légèrement le bas du dos, puis arrondissez-le.",
      "Alternez lentement, en suivant votre respiration.",
    ],
    why: "Réveille le bas du dos et le bassin sans quitter la chaise.",
    discretion: 1,
    visual: "pelvis",
  },
  // ---------- Poignets ----------
  {
    id: "etirement-flechisseurs",
    name: "Étirement des fléchisseurs",
    zones: ["poignets"],
    durationSec: 40,
    steps: [
      "Bras tendu devant vous, paume vers le haut.",
      "Avec l’autre main, tirez doucement les doigts vers le bas.",
      "Tenez 15 secondes, changez de main.",
    ],
    why: "Détend l’avant-bras après de longues sessions de frappe.",
    discretion: 2,
    visual: "wristFlex",
  },
  {
    id: "etirement-extenseurs",
    name: "Étirement des extenseurs",
    zones: ["poignets"],
    durationSec: 40,
    steps: [
      "Bras tendu, paume vers le bas, doigts vers le sol.",
      "Attirez doucement le dos de la main vers vous.",
      "Tenez 15 secondes, changez de main.",
    ],
    why: "Cible la face externe de l’avant-bras, sollicitée par la souris.",
    discretion: 2,
    visual: "wristFlex",
  },
  {
    id: "cercles-poignets",
    name: "Cercles de poignets et éventail",
    zones: ["poignets"],
    durationSec: 30,
    steps: [
      "Décollez les mains du clavier.",
      "Dessinez des cercles lents avec les poignets, dans les deux sens.",
      "Terminez en ouvrant grand les doigts, puis en les relâchant.",
    ],
    why: "Relance la circulation dans les mains entre deux sessions de frappe.",
    discretion: 1,
    visual: "wristCircles",
  },
  // ---------- Jambes & hanches ----------
  {
    id: "extensions-jambes",
    name: "Extensions de jambes",
    zones: ["jambes"],
    durationSec: 45,
    steps: [
      "Tendez la jambe droite à l’horizontale, pointe de pied vers vous.",
      "Tenez 3 secondes puis reposez.",
      "Alternez droite / gauche à un rythme calme.",
    ],
    why: "Réveille les cuisses et relance la circulation après une longue assise.",
    discretion: 1,
    visual: "legExtend",
  },
  {
    id: "talons-pointes",
    name: "Relevés talons-pointes",
    zones: ["jambes"],
    durationSec: 40,
    steps: [
      "Pieds à plat sous le bureau.",
      "Décollez les talons, reposez, puis décollez les pointes.",
      "Alternez à un rythme régulier.",
    ],
    why: "Active les mollets, la « pompe » circulatoire des jambes.",
    discretion: 1,
    visual: "heelToe",
  },
  {
    id: "figure-quatre",
    name: "Étirement en figure 4",
    zones: ["hanches"],
    durationSec: 60,
    steps: [
      "Posez la cheville droite sur le genou gauche.",
      "Dos long, penchez-vous légèrement vers l’avant.",
      "Respirez 4 fois, puis changez de côté.",
    ],
    why: "Ouvre les hanches, raccourcies par des heures en position assise.",
    discretion: 3,
    visual: "figureFour",
  },
  {
    id: "marche-assise",
    name: "Marche assise",
    zones: ["jambes", "energie"],
    durationSec: 30,
    steps: [
      "Montez un genou, reposez, montez l’autre.",
      "Accélérez légèrement le rythme, comme une marche.",
      "Gardez le buste droit et respirez.",
    ],
    why: "Un mini-cardio discret pour relancer l’énergie sans se lever.",
    discretion: 2,
    visual: "seatedMarch",
  },
  // ---------- Yeux ----------
  {
    id: "regle-20-20-20",
    name: "Regard au loin (20-20-20)",
    zones: ["yeux"],
    durationSec: 20,
    steps: [
      "Détournez le regard de l’écran.",
      "Fixez un point à plus de 6 mètres (fenêtre, couloir).",
      "Clignez des yeux plusieurs fois, tranquillement.",
    ],
    why: "La règle 20-20-20 aide à reposer la focalisation de près.",
    discretion: 1,
    visual: "gaze",
  },
  {
    id: "palming",
    name: "Palming",
    zones: ["yeux", "energie"],
    durationSec: 30,
    steps: [
      "Frottez les paumes l’une contre l’autre pour les réchauffer.",
      "Posez-les en coque sur les yeux fermés, sans appuyer.",
      "Respirez calmement dans le noir complet.",
    ],
    why: "Une vraie coupure sensorielle de 30 secondes pour les yeux.",
    discretion: 2,
    visual: "palming",
  },
  {
    id: "focus-proche-loin",
    name: "Focus proche / lointain",
    zones: ["yeux"],
    durationSec: 40,
    steps: [
      "Tenez un pouce à 25 cm devant vous, fixez-le 3 secondes.",
      "Fixez ensuite un objet lointain 3 secondes.",
      "Alternez, sans bouger la tête.",
    ],
    why: "Fait travailler l’accommodation dans les deux sens, comme un étirement visuel.",
    discretion: 1,
    visual: "focusShift",
  },
  // ---------- Énergie ----------
  {
    id: "respiration-446",
    name: "Respiration 4-4-6",
    zones: ["energie"],
    durationSec: 60,
    steps: [
      "Inspirez par le nez pendant 4 secondes.",
      "Retenez 4 secondes, sans crisper.",
      "Expirez lentement pendant 6 secondes. Répétez.",
    ],
    why: "Une respiration allongée aide à faire redescendre la pression entre deux tâches.",
    discretion: 1,
    visual: "breath",
  },
  {
    id: "etirement-vertical",
    name: "Grand étirement vertical",
    zones: ["energie", "dos", "epaules"],
    durationSec: 30,
    steps: [
      "Entrecroisez les doigts, paumes vers le plafond.",
      "Poussez les mains vers le haut en inspirant.",
      "Relâchez d’un coup en expirant. Répétez 3 fois.",
    ],
    why: "Le réflexe le plus naturel du corps pour se relancer, version guidée.",
    discretion: 3,
    visual: "reachUp",
  },
  {
    id: "demi-cercles-tete",
    name: "Demi-cercles de tête",
    zones: ["nuque", "energie"],
    durationSec: 40,
    steps: [
      "Menton vers la poitrine, roulez la tête vers la droite.",
      "Revenez au centre par le même chemin, puis vers la gauche.",
      "Restez sur l’avant : pas de cercle complet.",
    ],
    why: "Une variante douce et sûre pour délier la nuque en fin de journée.",
    discretion: 2,
    visual: "headTurn",
  },
];

export const exerciseById = (id: string): Exercise | undefined =>
  EXERCISES.find((e) => e.id === id);

export const EYE_EXERCISE_ID = "regle-20-20-20";
