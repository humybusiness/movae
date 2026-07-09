import type { Zone } from "../types";

export type ProgramMoment = "matin" | "midi" | "apres-midi" | "soir" | "tous";

export interface Program {
  id: string;
  name: string;
  tagline: string;
  exerciseIds: string[];
  zones: Zone[];
  moment: ProgramMoment;
  discret?: boolean; // réalisable sans se faire remarquer
}

export const PROGRAMS: Program[] = [
  // ---------- Moments de la journée ----------
  {
    id: "lancement",
    name: "Lancement de journée",
    tagline: "Réveillez le corps avant la première visio.",
    exerciseIds: ["demi-cercles-tete", "roulements-epaules", "grandissement-axial", "extensions-jambes"],
    zones: ["nuque", "epaules", "dos", "jambes"],
    moment: "matin",
  },
  {
    id: "reveil-complet",
    name: "Réveil complet",
    tagline: "Quatre minutes pour arriver vraiment au bureau.",
    exerciseIds: ["chat-vache-assis", "cercles-bras", "assis-debout", "respiration-ventrale"],
    zones: ["dos", "epaules", "jambes", "energie"],
    moment: "matin",
  },
  {
    id: "avant-deep-work",
    name: "Avant deep work",
    tagline: "Posture, souffle, regard : prêt à plonger.",
    exerciseIds: ["coherence-55", "grandissement-axial", "regle-20-20-20"],
    zones: ["energie", "dos", "yeux"],
    moment: "tous",
    discret: true,
  },
  {
    id: "post-dejeuner",
    name: "Post-déjeuner",
    tagline: "Court-circuitez le coup de barre de 14 h.",
    exerciseIds: ["assis-debout", "marche-2-min", "soupir-physiologique"],
    zones: ["jambes", "energie"],
    moment: "midi",
  },
  {
    id: "anti-coup-de-barre",
    name: "Anti coup de barre",
    tagline: "Trois minutes pour relancer la machine.",
    exerciseIds: ["tapotements-reveil", "moulinets-energie", "marche-assise", "etirement-vertical"],
    zones: ["energie", "epaules", "jambes"],
    moment: "apres-midi",
  },
  {
    id: "fin-journee",
    name: "Fin de journée",
    tagline: "Relâchez tout avant de fermer l'ordinateur.",
    exerciseIds: ["deroule-avant", "etirement-quadriceps", "auto-massage-nuque", "coherence-55"],
    zones: ["dos", "jambes", "nuque", "energie"],
    moment: "soir",
  },

  // ---------- Zones SOS ----------
  {
    id: "nuque-sos",
    name: "Nuque SOS",
    tagline: "Quand la nuque tire après trop d'écran.",
    exerciseIds: ["oui-lent", "inclinaison-nuque", "etirement-trapezes", "menton-rentre"],
    zones: ["nuque"],
    moment: "tous",
  },
  {
    id: "epaules-legeres",
    name: "Épaules légères",
    tagline: "Défaites le nœud entre cou et épaules.",
    exerciseIds: ["haussements-relaches", "bras-croise", "ouverture-poitrine"],
    zones: ["epaules"],
    moment: "tous",
  },
  {
    id: "dos-sos",
    name: "Dos SOS",
    tagline: "Trois mouvements clés pour un dos qui proteste.",
    exerciseIds: ["chat-vache-assis", "rotation-assise", "cobra-bureau"],
    zones: ["dos"],
    moment: "tous",
  },
  {
    id: "bas-du-dos",
    name: "Bas du dos",
    tagline: "La zone lombaire, traitée en douceur.",
    exerciseIds: ["bascule-bassin", "genou-poitrine", "deroule-avant"],
    zones: ["dos", "hanches"],
    moment: "tous",
  },
  {
    id: "special-clavier",
    name: "Spécial clavier",
    tagline: "Pour les mains qui tapent toute la journée.",
    exerciseIds: ["cercles-poignets", "etirement-flechisseurs", "etirement-extenseurs", "eventail-doigts"],
    zones: ["poignets"],
    moment: "tous",
    discret: true,
  },
  {
    id: "clavier-intense",
    name: "Clavier intense",
    tagline: "La version complète pour les grosses journées de frappe.",
    exerciseIds: ["priere", "glisse-tendons", "massage-avant-bras", "secouer-mains"],
    zones: ["poignets"],
    moment: "tous",
  },
  {
    id: "ecran-yeux",
    name: "Écran & yeux",
    tagline: "Une vraie coupure visuelle en moins de 2 minutes.",
    exerciseIds: ["regle-20-20-20", "focus-proche-loin", "palming"],
    zones: ["yeux"],
    moment: "tous",
    discret: true,
  },
  {
    id: "yeux-marathon",
    name: "Yeux marathon",
    tagline: "Pour les journées à 8 h d'écran et plus.",
    exerciseIds: ["cercles-oculaires", "balayage-lateral", "clignements-conscients", "palming"],
    zones: ["yeux"],
    moment: "tous",
    discret: true,
  },
  {
    id: "jambes-lourdes",
    name: "Jambes légères",
    tagline: "Relancez la circulation après des heures assises.",
    exerciseIds: ["talons-pointes", "cercles-chevilles", "releve-mollets-debout", "etirement-ischios"],
    zones: ["jambes"],
    moment: "apres-midi",
  },
  {
    id: "hanches-ouvertes",
    name: "Hanches ouvertes",
    tagline: "L'antidote aux heures de chaise.",
    exerciseIds: ["figure-quatre", "cercles-bassin", "fente-debout"],
    zones: ["hanches"],
    moment: "tous",
  },

  // ---------- Situations ----------
  {
    id: "entre-visios",
    name: "Entre deux visios",
    tagline: "Trois minutes discrètes entre deux réunions.",
    exerciseIds: ["menton-rentre", "serrage-omoplates", "respiration-446"],
    zones: ["nuque", "epaules", "energie"],
    moment: "tous",
    discret: true,
  },
  {
    id: "discret-open-space",
    name: "Invisible en open space",
    tagline: "Personne ne remarquera rien. Votre corps, si.",
    exerciseIds: ["iso-front", "poing-eclair", "talons-pointes", "respiration-ventrale"],
    zones: ["nuque", "poignets", "jambes", "energie"],
    moment: "tous",
    discret: true,
  },
  {
    id: "express-90",
    name: "Express 90 secondes",
    tagline: "Le strict nécessaire quand tout s'enchaîne.",
    exerciseIds: ["soupir-physiologique", "oui-lent", "secouer-mains"],
    zones: ["energie", "nuque", "poignets"],
    moment: "tous",
    discret: true,
  },
  {
    id: "reunion-longue",
    name: "Récup' après réunion longue",
    tagline: "Décompressez après 2 h de visio d'affilée.",
    exerciseIds: ["deroule-avant", "flexion-laterale", "genou-poitrine", "pause-lumiere"],
    zones: ["dos", "hanches", "energie"],
    moment: "tous",
  },
  {
    id: "calme-focus",
    name: "Calme & focus",
    tagline: "Faire redescendre la pression avant de reprendre.",
    exerciseIds: ["respiration-ventrale", "palming", "micro-repos-yeux"],
    zones: ["energie", "yeux"],
    moment: "tous",
    discret: true,
  },
];
