import {
  Armchair,
  BellRing,
  EyeOff,
  Gauge,
  Gift,
  LayoutList,
  MonitorDown,
  MousePointerClick,
  Palette,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { FEATURES } from "../data";
import { Container, Reveal } from "../shared";

const KINE_CARDS = [
  {
    icon: Armchair,
    title: "Assis",
    text: "Tous les exercices se font sur une chaise.",
  },
  {
    icon: EyeOff,
    title: "Discret",
    text: "Rien de ridicule à faire devant des collègues.",
  },
  {
    icon: MousePointerClick,
    title: "Simple",
    text: "Peu de texte, une action claire.",
  },
];

const FEATURE_ICONS: Record<string, LucideIcon> = {
  Armchair,
  LayoutList,
  Gauge,
  BellRing,
  TrendingUp,
  Gift,
  Palette,
  MonitorDown,
};

export function Kine() {
  return (
    <section id="kines" className="py-20 sm:py-24">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-sauge-fonce">
            L’approche terrain
          </p>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Créé par 3 étudiants en kinésithérapie.
          </h2>
          <p className="mt-4 text-lg text-encre-2">
            Movaé est né sur les bancs de l’école de kiné, avec une approche terrain :
            des exercices simples, assis, courts, sans matériel et adaptés aux vraies
            journées de travail devant écran.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {KINE_CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 100}>
              <div className="h-full rounded-2xl border border-ligne bg-white p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sauge-claire text-sauge-fonce">
                  <c.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-sm text-encre-2">{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mt-8 text-center text-sm text-encre-2">
            Movaé accompagne les pauses actives. L’application ne remplace pas une
            consultation.
          </p>
        </Reveal>

        {/* Fonctionnalités */}
        <Reveal className="mt-24 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Tout ce qu’il faut pour bouger sans y penser.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = FEATURE_ICONS[f.icon] ?? Gauge;
            return (
              <Reveal key={f.title} delay={(i % 4) * 80}>
                <div className="h-full rounded-2xl border border-ligne bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-encre/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sauge-claire text-sauge-fonce">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </div>
                  <h3 className="mt-3 text-sm font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm text-encre-2">{f.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Récompenses / personnalisation */}
        <div className="mt-24 grid items-center gap-10 rounded-3xl border border-nuit-ligne bg-nuit p-8 sm:p-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-nuit-texte">
              Plus vous bougez, plus l’app devient à vous.
            </h2>
            <p className="mt-4 leading-relaxed text-nuit-texte/70">
              Movaé récompense la régularité avec des thèmes, des styles d’Indice et des
              badges sobres. Pas de pièces, pas de classement, pas de gamification
              enfantine.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-wrap gap-2.5">
              {[
                "Thème Sauge",
                "Thème Nuit calme",
                "Thème Sable",
                "Indice « Score dominant »",
                "Indice « Anneaux doux »",
                "Badge Série 7 jours",
                "Badge Corps complet",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-nuit-ligne bg-nuit-carte px-4 py-2 text-sm font-semibold text-sauge-nuit"
                >
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
