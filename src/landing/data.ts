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
    title: "Votre reflet",
    text: "Une silhouette vivante qui se tasse quand vous vous tassez — et se redresse quand vous bougez.",
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
    title: "Vraie app de bureau",
    text: "S’installe sur votre PC et veille depuis la barre des tâches, même fenêtre fermée.",
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
    a: "Cliquez sur « Télécharger Movaé » : vous recevez l’installeur Windows (Movae-Setup.exe). Double-cliquez dessus : l’installation se fait en un clic et Movaé apparaît dans votre menu Démarrer. macOS et Linux arrivent ensuite.",
  },
  {
    q: "Est-ce gratuit ?",
    a: "Oui, la V1 est gratuite au lancement, sans carte bancaire.",
  },
  {
    q: "Faut-il créer un compte ?",
    a: "Non, c’est optionnel. Sans compte, vos données restent sur votre ordinateur. Avec un compte (e-mail, ou Google sur le web), votre progression est synchronisée et vous la retrouvez sur tous vos appareils.",
  },
  {
    q: "Les rappels fonctionnent-ils quand la fenêtre est fermée ?",
    a: "Oui. L’application de bureau veille depuis la zone de notification Windows : fermer la fenêtre ne l’arrête pas, le moteur continue d’analyser votre rythme et les rappels natifs continuent d’arriver. Pour l’arrêter complètement : clic droit sur l’icône Movaé > Quitter.",
  },
  {
    q: "Est-ce que mon entreprise voit mon score ?",
    a: "Non. Vos données restent privées : dans votre navigateur sans compte, ou dans votre espace personnel sécurisé avec un compte. Une future version entreprise ne pourra utiliser que des statistiques anonymisées et agrégées.",
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
