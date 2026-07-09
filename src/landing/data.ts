// Contenus éditoriaux de la landing : chiffres sourcés, fonctionnalités, FAQ.

export interface Stat {
  figure: string;
  text: string;
  source: string;
}

export const STATS: Stat[] = [
  {
    figure: "1 sur 5",
    text: "Plus d’un salarié du privé sur cinq télétravaille au moins une fois par mois en France.",
    source: "INSEE, 2025",
  },
  {
    figure: "≈ 90 %",
    text: "des maladies professionnelles reconnues en France sont des troubles musculosquelettiques.",
    source: "INRS / Cnam, données 2024",
  },
  {
    figure: "Pauses actives",
    text: "L’INRS recommande d’inciter les salariés sur écran à des pauses actives et régulières.",
    source: "INRS — Travail sur écran",
  },
  {
    figure: "20-20-20",
    text: "Toutes les 20 minutes, regarder à 20 pieds (6 m) pendant 20 secondes pour reposer les yeux.",
    source: "American Optometric Association",
  },
];

export interface Feature {
  icon: string;
  title: string;
  text: string;
}

export const FEATURES: Feature[] = [
  {
    icon: "Armchair",
    title: "Exercices assis",
    text: "22 micro-exercices sur chaise, sans matériel, discrets au bureau.",
  },
  {
    icon: "LayoutList",
    title: "Programmes guidés",
    text: "Des enchaînements courts pour les moments clés : matin, visios, fin de journée.",
  },
  {
    icon: "Gauge",
    title: "Indice Movaé",
    text: "Un score simple qui reflète votre régularité, votre équilibre et votre constance.",
  },
  {
    icon: "BellRing",
    title: "Rappels doux",
    text: "Le moteur analyse votre journée et ne vous prévient que quand c’est utile.",
  },
  {
    icon: "TrendingUp",
    title: "Progression visible",
    text: "Semaines, séries et zones mobilisées : votre rythme devient concret.",
  },
  {
    icon: "Gift",
    title: "Récompenses premium",
    text: "Thèmes et styles d’interface à débloquer. Pas de pièces, pas de classement.",
  },
  {
    icon: "Palette",
    title: "Personnalisation",
    text: "Thèmes Sauge, Nuit calme, Sable… l’app devient la vôtre.",
  },
  {
    icon: "MonitorDown",
    title: "PWA installable",
    text: "S’installe depuis le navigateur, comme une vraie app de bureau.",
  },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Movaé est-elle une application médicale ?",
    a: "Non. Movaé accompagne les pauses actives et l’hygiène de mouvement au travail. Elle ne pose aucun diagnostic et ne remplace pas un avis médical.",
  },
  {
    q: "Faut-il du matériel ?",
    a: "Non. Tous les exercices se font assis, sur votre chaise de bureau, sans aucun matériel.",
  },
  {
    q: "Est-ce que ça marche au bureau, devant des collègues ?",
    a: "Oui. Les exercices sont courts et classés par niveau de discrétion — beaucoup sont totalement invisibles pour vos voisins d’open space.",
  },
  {
    q: "Comment télécharger Movaé ?",
    a: "Movaé s’installe directement depuis le navigateur (PWA) : cliquez sur « Télécharger Movaé », ou utilisez l’icône d’installation de Chrome/Edge. Aucun store, aucun fichier à exécuter.",
  },
  {
    q: "Est-ce gratuit ?",
    a: "Oui, la V1 est gratuite au lancement, sans compte ni carte bancaire.",
  },
  {
    q: "Les rappels fonctionnent-ils quand l’app est fermée ?",
    a: "Les rappels dépendent du navigateur : ils fonctionnent tant que Movaé est ouvert (onglet ou fenêtre installée, même en arrière-plan). Si vous fermez complètement l’app, les rappels s’arrêtent — c’est une limite assumée et documentée de la V1.",
  },
  {
    q: "Est-ce que mon entreprise voit mon score ?",
    a: "Non. La V1 est 100 % locale : vos données restent dans votre navigateur. Une future version entreprise ne devra utiliser que des statistiques anonymisées et agrégées.",
  },
];

export interface Source {
  name: string;
  detail: string;
}

export const SOURCES: Source[] = [
  {
    name: "INSEE, 2025",
    detail: "Télétravail et présentiel : le travail hybride, une pratique désormais ancrée.",
  },
  {
    name: "INRS / Cnam, données 2024",
    detail: "Les TMS représentent près de 90 % des maladies professionnelles reconnues en France.",
  },
  {
    name: "INRS",
    detail: "Travail sur écran : risques et prévention — recommandation de pauses actives et régulières.",
  },
  {
    name: "American Optometric Association",
    detail: "Computer Vision Syndrome et règle 20-20-20.",
  },
];
