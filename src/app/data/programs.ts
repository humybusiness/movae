import type { Zone } from "../types";

export interface Program {
  id: string;
  name: string;
  tagline: string;
  exerciseIds: string[];
  zones: Zone[];
}

export const PROGRAMS: Program[] = [
  {
    id: "lancement",
    name: "Lancement de journée",
    tagline: "Réveillez le corps avant la première visio.",
    exerciseIds: ["demi-cercles-tete", "roulements-epaules", "extensions-jambes"],
    zones: ["nuque", "epaules", "jambes"],
  },
  {
    id: "nuque-epaules",
    name: "Nuque & épaules",
    tagline: "Le combo anti-tensions du haut du corps.",
    exerciseIds: ["rotation-nuque", "etirement-trapezes", "ouverture-poitrine"],
    zones: ["nuque", "epaules"],
  },
  {
    id: "entre-visios",
    name: "Entre deux visios",
    tagline: "Trois minutes discrètes entre deux réunions.",
    exerciseIds: ["menton-rentre", "rotation-assise", "respiration-446"],
    zones: ["nuque", "dos", "energie"],
  },
  {
    id: "special-clavier",
    name: "Spécial clavier",
    tagline: "Pour les mains qui tapent toute la journée.",
    exerciseIds: ["cercles-poignets", "etirement-flechisseurs", "etirement-extenseurs"],
    zones: ["poignets"],
  },
  {
    id: "ecran-yeux",
    name: "Écran & yeux",
    tagline: "Une vraie coupure visuelle en moins de 2 minutes.",
    exerciseIds: ["regle-20-20-20", "focus-proche-loin", "palming"],
    zones: ["yeux"],
  },
  {
    id: "fin-journee",
    name: "Fin de journée",
    tagline: "Relâchez tout avant de fermer l’ordinateur.",
    exerciseIds: ["deroule-avant", "figure-quatre", "respiration-446"],
    zones: ["dos", "hanches", "energie"],
  },
];
