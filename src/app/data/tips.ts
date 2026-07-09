// Le conseil kiné du jour — un repère concret, jamais culpabilisant,
// écrit avec l'approche terrain des étudiants kinés.

export interface Tip {
  title: string;
  text: string;
}

export const TIPS: Tip[] = [
  { title: "La meilleure posture", text: "C'est la prochaine. Aucune position n'est mauvaise en soi — c'est l'immobilité prolongée qui pèse. Variez, tout simplement." },
  { title: "Écran à hauteur d'yeux", text: "Le haut de votre écran devrait arriver à la hauteur de vos yeux. Quelques livres sous l'ordinateur portable changent une journée entière." },
  { title: "Les pieds au sol", text: "Deux pieds à plat stabilisent le bassin et soulagent le bas du dos. Si vos pieds pendent, baissez la chaise ou improvisez un repose-pieds." },
  { title: "Le téléphone debout", text: "Chaque appel est une occasion de vous lever. Votre dos ne fait pas la différence entre une pause et une conversation debout." },
  { title: "Coudes à 90 degrés", text: "Avant-bras posés, épaules relâchées : si vos épaules remontent vers les oreilles en tapant, votre bureau est trop haut ou votre chaise trop basse." },
  { title: "Boire = bouger", text: "Un petit verre plutôt qu'une grande gourde : vous vous lèverez plus souvent pour le remplir. C'est voulu." },
  { title: "La règle des 50 minutes", text: "Au-delà de 50 minutes assis sans bouger, la sensation de raideur s'installe. Une pause de 45 secondes suffit à relancer la machine." },
  { title: "Clignez des yeux", text: "Devant un écran, on cligne trois fois moins. Pensez-y pendant la lecture d'un long document : trois clignements complets, lentement." },
  { title: "Respirez par le ventre", text: "Penché vers l'écran, on respire court et haut. Une main sur le ventre, trois respirations profondes : le système nerveux suit." },
  { title: "La lumière du matin", text: "Dix minutes de lumière naturelle avant midi aident à réguler énergie et sommeil. Café à la fenêtre plutôt qu'au bureau." },
  { title: "Le poignet neutre", text: "En tapant, le poignet devrait rester dans l'axe de l'avant-bras, ni cassé vers le haut ni vers le bas. Regardez les vôtres, là, maintenant." },
  { title: "Marchez vos réunions", text: "Une réunion audio sans partage d'écran ? Écouteurs et marche. Les idées circulent mieux quand le corps circule." },
  { title: "L'étirement du réveil", text: "Ce grand étirement instinctif du matin, bras au ciel ? Votre corps sait ce qu'il fait. Offrez-le-lui aussi à 15 h." },
  { title: "Chaud ou froid ?", text: "Une nuque raide en fin de journée apprécie la chaleur (douche chaude, bouillotte). Le mouvement doux reste le meilleur des remèdes." },
  { title: "Alternez la souris", text: "Les journées à forte dose de souris fatiguent toujours le même côté. Les raccourcis clavier sont vos alliés anti-monotonie gestuelle." },
  { title: "Le dossier, votre allié", text: "S'adosser n'est pas de la paresse : le dossier reprend une partie du travail des muscles du dos. Utilisez-le, puis changez." },
  { title: "Micro-pauses fréquentes", text: "Trois pauses de 1 minute battent une pause de 20 minutes en fin de journée. La régularité gagne toujours sur l'intensité." },
  { title: "Les jambes croisées", text: "Croiser les jambes n'est pas dangereux — y rester une heure, si. Décroisez, recroisez de l'autre côté, bougez." },
  { title: "Après le déjeuner", text: "Le creux de 14 h est physiologique. Dix minutes de marche digestive le raccourcissent nettement — et vos après-midis changent." },
  { title: "Un appui à la fois", text: "Debout en visio ? Transférez le poids d'une jambe sur l'autre, prenez appui sur le bureau. Debout ne veut pas dire figé." },
  { title: "Le soir, on décharge", text: "Deux minutes d'étirements doux avant de fermer l'ordinateur signalent au corps que la journée de travail est finie. Un vrai rituel de sortie." },
];

// Conseil déterministe du jour (même conseil toute la journée, change chaque jour).
export function tipOfDay(dayKey: string): Tip {
  let h = 0;
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0;
  return TIPS[h % TIPS.length];
}
