import { AlarmClockOff, Armchair, BellOff } from "lucide-react";
import { STATS } from "../data";
import { Container, Reveal } from "../shared";

const CARDS = [
  {
    icon: Armchair,
    title: "Assis trop longtemps",
    text: "Les journées écran réduisent naturellement les occasions de bouger.",
  },
  {
    icon: AlarmClockOff,
    title: "Pauses oubliées",
    text: "Même quand on sait que c’est utile, on repousse souvent.",
  },
  {
    icon: BellOff,
    title: "Rappels agaçants",
    text: "Une alarme ne suffit pas. Il faut une action claire.",
  },
];

export function Problem() {
  return (
    <section id="probleme" className="py-20 sm:py-24">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Le problème n’est pas de savoir bouger. C’est d’y penser.
          </h2>
          <p className="mt-4 text-lg text-encre-2">
            Quand la journée s’enchaîne entre écran, visios et concentration, les pauses
            passent souvent après tout le reste. Movaé rend le mouvement simple, visible
            et guidé.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 100}>
              <div className="h-full rounded-2xl border border-ligne bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-encre/5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sauge-claire text-sauge-fonce">
                  <c.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-sm text-encre-2">{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Chiffres sourcés */}
        <Reveal className="mt-24 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Un vrai sujet de travail sur écran.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-encre-2">
            Quelques repères publics — un contexte, pas une promesse.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.source} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-ligne bg-white p-6">
                <p className="font-display text-3xl font-semibold tracking-tight text-sauge-fonce">
                  {s.figure}
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-encre">{s.text}</p>
                <p className="mt-4 text-xs font-medium text-encre-2">Source : {s.source}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
