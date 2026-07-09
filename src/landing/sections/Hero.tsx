import { ArrowDown } from "lucide-react";
import { BrowserMockup } from "../BrowserMockup";
import { Container, Pill, PrimaryCta, Reveal, SecondaryCta } from "../shared";

const PILLS = [
  "Créé par 3 étudiants kinés",
  "100 exercices assis",
  "Sans matériel",
  "Application Windows",
  "Gratuit au lancement",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-16 sm:pt-24">
      {/* décor discret */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-sauge-claire/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[-8%] h-80 w-80 rounded-full bg-sable/30 blur-3xl"
      />
      <Container className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <Reveal>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl xl:text-[3.4rem]">
            La pause active créée par de futurs kinés pour vos journées devant l’écran.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-encre-2">
            Movaé aide les télétravailleurs à bouger régulièrement grâce à des exercices
            assis, des rappels doux et un Indice de progression simple.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {PILLS.map((p) => (
              <Pill key={p}>{p}</Pill>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PrimaryCta>Télécharger Movaé</PrimaryCta>
            <SecondaryCta href="#fonctionnement">
              Voir comment ça marche
              <ArrowDown className="h-4 w-4" aria-hidden />
            </SecondaryCta>
          </div>
          <p className="mt-4 text-sm text-encre-2">
            Application de bureau pour Windows. Installation en un clic, compte optionnel.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <BrowserMockup />
        </Reveal>
      </Container>
    </section>
  );
}
