// Accessoires 3D du personnage argile — achetés avec les boulettes d'argile
// gagnées à chaque pause terminée. Un seul accessoire porté par emplacement.

export type AccessorySlot = "tete" | "visage" | "cou" | "epaule" | "sol";

export const SLOT_LABELS: Record<AccessorySlot, string> = {
  tete: "Tête",
  visage: "Visage",
  cou: "Cou",
  epaule: "Épaule",
  sol: "Décor",
};

export interface Accessory {
  id: string;
  name: string;
  desc: string;
  emoji: string; // vignette de boutique
  price: number; // en boulettes d'argile
  slot: AccessorySlot;
}

export const ACCESSORIES: Accessory[] = [
  {
    id: "lunettes-rondes",
    name: "Lunettes rondes",
    desc: "Petites lunettes d'argile sombre, très studieux.",
    emoji: "👓",
    price: 40,
    slot: "visage",
  },
  {
    id: "tasse-tisane",
    name: "Tisane fumante",
    desc: "Une tasse posée à côté, pour les pauses toutes douces.",
    emoji: "🍵",
    price: 35,
    slot: "sol",
  },
  {
    id: "echarpe-terracotta",
    name: "Écharpe terracotta",
    desc: "Un boudin d'argile chaude autour du cou.",
    emoji: "🧣",
    price: 45,
    slot: "cou",
  },
  {
    id: "bob-sable",
    name: "Bob sable",
    desc: "Le chapeau des télétravailleurs qui prennent l'air.",
    emoji: "👒",
    price: 55,
    slot: "tete",
  },
  {
    id: "casque-audio",
    name: "Casque audio",
    desc: "Pour les sessions deep work bien au calme.",
    emoji: "🎧",
    price: 70,
    slot: "tete",
  },
  {
    id: "plante-pot",
    name: "Plante compagnon",
    desc: "Une petite plante en pot qui pousse à ses côtés.",
    emoji: "🪴",
    price: 80,
    slot: "sol",
  },
  {
    id: "couronne-feuilles",
    name: "Couronne de feuilles",
    desc: "Récolte de la forêt, tressée en argile verte.",
    emoji: "🌿",
    price: 100,
    slot: "tete",
  },
  {
    id: "oiseau-mesange",
    name: "Mésange d'épaule",
    desc: "Elle se pose là quand on bouge régulièrement.",
    emoji: "🐦",
    price: 130,
    slot: "epaule",
  },
];

export function accessoryById(id: string): Accessory | undefined {
  return ACCESSORIES.find((a) => a.id === id);
}

// Récompense d'argile par action.
export const CLAY_PER_BREAK = 5;
export const CLAY_PER_PROGRAM = 10;
