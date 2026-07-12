// Boutique du personnage : accessoires portés, jardin et compagnons, achetés
// avec les élans gagnés à chaque pause. Les emplacements portés (tête,
// visage, cou, épaule) sont exclusifs ; le jardin et les animaux se CUMULENT
// — l'univers du personnage grandit pause après pause, comme un petit jeu.

export type AccessorySlot = "tete" | "visage" | "cou" | "epaule" | "jardin" | "animal";

export const SLOT_LABELS: Record<AccessorySlot, string> = {
  tete: "Tête",
  visage: "Visage",
  cou: "Cou",
  epaule: "Épaule",
  jardin: "Jardin",
  animal: "Compagnon",
};

// Emplacements cumulables : on peut tout installer en même temps.
export function isAdditiveSlot(slot: AccessorySlot): boolean {
  return slot === "jardin" || slot === "animal";
}

export type AccessoryCategory = "style" | "jardin" | "animaux";

export const CATEGORY_LABELS: Record<AccessoryCategory, string> = {
  style: "Style",
  jardin: "Jardin",
  animaux: "Compagnons",
};

export interface Accessory {
  id: string;
  name: string;
  desc: string;
  emoji: string; // vignette de boutique
  price: number; // en élans
  slot: AccessorySlot;
  category: AccessoryCategory;
}

export const ACCESSORIES: Accessory[] = [
  // ---------- Style (portés) ----------
  {
    id: "lunettes-rondes",
    name: "Lunettes rondes",
    desc: "Petites lunettes d'argile sombre, très studieux.",
    emoji: "👓",
    price: 40,
    slot: "visage",
    category: "style",
  },
  {
    id: "echarpe-terracotta",
    name: "Écharpe terracotta",
    desc: "Un boudin d'argile chaude autour du cou.",
    emoji: "🧣",
    price: 45,
    slot: "cou",
    category: "style",
  },
  {
    id: "bob-sable",
    name: "Bob sable",
    desc: "Le chapeau des télétravailleurs qui prennent l'air.",
    emoji: "👒",
    price: 55,
    slot: "tete",
    category: "style",
  },
  {
    id: "casque-audio",
    name: "Casque audio",
    desc: "Pour les sessions deep work bien au calme.",
    emoji: "🎧",
    price: 70,
    slot: "tete",
    category: "style",
  },
  {
    id: "couronne-feuilles",
    name: "Couronne de feuilles",
    desc: "Récolte de la forêt, tressée en argile verte.",
    emoji: "🌿",
    price: 100,
    slot: "tete",
    category: "style",
  },

  // ---------- Jardin (cumulable) ----------
  {
    id: "parterre-fleurs",
    name: "Parterre de fleurs",
    desc: "Des fleurs d'argile qui ne fanent jamais.",
    emoji: "🌸",
    price: 45,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "lanterne",
    name: "Lanterne douce",
    desc: "Une lueur chaude pour les pauses du soir.",
    emoji: "🏮",
    price: 55,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "banc-bois",
    name: "Banc de jardin",
    desc: "Pour s'asseoir et regarder le temps passer.",
    emoji: "🪑",
    price: 70,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "tasse-tisane",
    name: "Tisane fumante",
    desc: "Une tasse posée là, pour les pauses toutes douces.",
    emoji: "🍵",
    price: 35,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "plante-pot",
    name: "Plante compagnon",
    desc: "Une petite plante en pot qui pousse à ses côtés.",
    emoji: "🪴",
    price: 60,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "parasol",
    name: "Parasol crème",
    desc: "De l'ombre pour les étirements du plein midi.",
    emoji: "⛱️",
    price: 75,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "potager",
    name: "Carré potager",
    desc: "Trois salades d'argile, fierté du jardinier.",
    emoji: "🥬",
    price: 85,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "arbre",
    name: "Arbre à sieste",
    desc: "Un feuillage rond qui respire avec vous.",
    emoji: "🌳",
    price: 100,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "ruche",
    name: "Ruche paisible",
    desc: "Le doux bourdonnement du travail bien fait.",
    emoji: "🐝",
    price: 120,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "hamac",
    name: "Hamac",
    desc: "Tendu entre deux poteaux, il appelle la pause.",
    emoji: "🛖",
    price: 140,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "balancoire",
    name: "Balançoire",
    desc: "Elle se balance doucement, même sans personne.",
    emoji: "🎠",
    price: 150,
    slot: "jardin",
    category: "jardin",
  },
  {
    id: "fontaine",
    name: "Fontaine de pierre",
    desc: "L'eau d'argile coule sans fin au cœur du jardin.",
    emoji: "⛲",
    price: 160,
    slot: "jardin",
    category: "jardin",
  },

  // ---------- Compagnons (cumulables) ----------
  {
    id: "papillons",
    name: "Papillons",
    desc: "Deux papillons qui voltigent autour du jardin.",
    emoji: "🦋",
    price: 65,
    slot: "animal",
    category: "animaux",
  },
  {
    id: "oiseau-mesange",
    name: "Mésange d'épaule",
    desc: "Elle se pose là quand on bouge régulièrement.",
    emoji: "🐦",
    price: 90,
    slot: "animal",
    category: "animaux",
  },
  {
    id: "lapin",
    name: "Lapin des herbes",
    desc: "Il grignote au bord du socle, imperturbable.",
    emoji: "🐰",
    price: 120,
    slot: "animal",
    category: "animaux",
  },
  {
    id: "chat",
    name: "Chat de bureau",
    desc: "Il dort en rond, expert mondial de la pause.",
    emoji: "🐱",
    price: 180,
    slot: "animal",
    category: "animaux",
  },
  {
    id: "chien",
    name: "Chien fidèle",
    desc: "Assis bien droit, il attend la prochaine pause active.",
    emoji: "🐶",
    price: 180,
    slot: "animal",
    category: "animaux",
  },
];

export function accessoryById(id: string): Accessory | undefined {
  return ACCESSORIES.find((a) => a.id === id);
}

// Récompense d'élans par action.
export const CLAY_PER_BREAK = 5;
export const CLAY_PER_PROGRAM = 10;
