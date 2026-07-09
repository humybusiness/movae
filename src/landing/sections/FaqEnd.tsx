import { ChevronDown } from "lucide-react";
import { FAQ_ITEMS, SOURCES } from "../data";
import { Container, PrimaryCta, Reveal } from "../shared";

export function FaqEnd() {
  return (
    <>
      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-24">
        <Container className="max-w-3xl">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions fréquentes
            </h2>
          </Reveal>
          <div className="mt-10 space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <Reveal key={item.q} delay={i * 50}>
                <details className="group rounded-2xl border border-ligne bg-white px-5 open:pb-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-encre-2 transition group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="text-sm leading-relaxed text-encre-2">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Sources */}
      <section className="border-t border-ligne bg-white py-16">
        <Container>
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Sources</h2>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOURCES.map((s, i) => (
              <Reveal key={s.name} delay={i * 60}>
                <div className="h-full rounded-xl border border-ligne bg-fond p-4">
                  <p className="text-sm font-bold">{s.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-encre-2">{s.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA final */}
      <section className="bg-nuit py-20 sm:py-24">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-nuit-texte sm:text-4xl">
              Prêt à bouger sans y penser ?
            </h2>
            <p className="mt-4 text-lg text-nuit-texte/70">
              Essayez Movaé gratuitement et installez votre routine de pauses actives.
            </p>
            <div className="mt-8 flex justify-center">
              <PrimaryCta className="!bg-sauge-nuit !text-nuit !shadow-none">
                Télécharger Movaé
              </PrimaryCta>
            </div>
            <p className="mt-4 text-sm text-nuit-texte/60">
              Créé par 3 kinés. Exercices assis. Compte optionnel.
            </p>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
