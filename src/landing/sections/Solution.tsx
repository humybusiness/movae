import { BellRing, Armchair, TrendingUp, Brain, Gauge, Sparkles } from "lucide-react";
import { BrowserMockup } from "../BrowserMockup";
import { Container, Reveal } from "../shared";

const STEPS = [
  {
    icon: BellRing,
    n: "1",
    title: "Recevez un rappel doux",
    text: "Le moteur Movaé estime la sollicitation de chaque zone de votre corps selon votre style de travail, et ne vous prévient que quand une pause devient vraiment utile.",
  },
  {
    icon: Armchair,
    n: "2",
    title: "Faites un exercice assis",
    text: "30 secondes à 2 minutes, sans matériel, guidé pas à pas. L’exercice proposé cible précisément les zones les plus sollicitées à ce moment-là.",
  },
  {
    icon: TrendingUp,
    n: "3",
    title: "Progressez avec l’Indice Movaé",
    text: "Régularité, équilibre, constance : votre rythme de mouvement devient un score simple, visible, qui évolue avec vous.",
  },
];

const POINTS = [
  { icon: Gauge, label: "Indice clair" },
  { icon: Brain, label: "Exercice recommandé au bon moment" },
  { icon: TrendingUp, label: "Progression visible" },
  { icon: Sparkles, label: "Récompenses premium" },
];

export function Solution() {
  return (
    <section id="fonctionnement" className="border-y border-ligne bg-white py-20 sm:py-24">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Movaé transforme les pauses en rituel simple.
          </h2>
          <p className="mt-4 text-lg text-encre-2">
            Une pause proposée, un exercice assis, un Indice qui progresse.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="relative h-full rounded-2xl border border-ligne bg-fond p-6">
                <span className="font-display absolute right-5 top-4 text-5xl font-semibold text-sauge-claire" aria-hidden>
                  {s.n}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sauge-fonce shadow-sm">
                  <s.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-encre-2">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Aperçu produit */}
        <div className="mt-24 grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Un cockpit clair pour votre rythme de mouvement.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-encre-2">
              Movaé ne vous noie pas dans les conseils. L’app vous montre quoi faire
              maintenant : un Indice, une pause recommandée, un bouton Commencer.
            </p>
            <ul className="mt-6 space-y-3">
              {POINTS.map((p) => (
                <li key={p.label} className="flex items-center gap-3 text-sm font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sauge-claire text-sauge-fonce">
                    <p.icon className="h-4 w-4" aria-hidden />
                  </span>
                  {p.label}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <BrowserMockup />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
