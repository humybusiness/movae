import { useState } from "react";
import {
  Camera,
  Database,
  Link2,
  Lock,
  Mail,
  RotateCcw,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { Container, PrimaryCta, Reveal, SecondaryCta } from "../shared";
import { CONTACT_EMAIL } from "../../lib/constants";

const TEAM_CARDS = [
  {
    icon: Link2,
    title: "Déploiement simple",
    text: "Une URL, une app installable. Aucune infrastructure à gérer.",
  },
  {
    icon: Camera,
    title: "Non intrusif",
    text: "Pas de caméra. Pas de tracking clavier.",
  },
  {
    icon: Database,
    title: "Données respectueuses",
    text: "Des statistiques anonymisées en future version entreprise.",
  },
];

const TRUST_POINTS = [
  { icon: Camera, label: "Aucune caméra" },
  { icon: UserX, label: "Aucun compte requis en V1" },
  { icon: ShieldCheck, label: "Aucune donnée médicale partagée" },
  { icon: RotateCcw, label: "Remise à zéro possible" },
  { icon: Lock, label: "Export local de vos données" },
];

export function InstallTeams() {
  const [demoAsked, setDemoAsked] = useState(false);

  return (
    <section className="border-y border-ligne bg-white py-20 sm:py-24">
      <Container>
        {/* Installation */}
        <Reveal className="mx-auto max-w-2xl text-center" >
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Installez Movaé comme une vraie app.
          </h2>
          <p className="mt-4 text-lg text-encre-2">
            Ouvrez le site, cliquez sur Télécharger, puis lancez Movaé depuis votre
            ordinateur. Pas de store, pas de fichier à exécuter.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <PrimaryCta>Télécharger Movaé</PrimaryCta>
            <SecondaryCta href="/app">Essayer dans le navigateur</SecondaryCta>
          </div>
        </Reveal>

        {/* Entreprises */}
        <div id="entreprises" className="mt-24 scroll-mt-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Pensé pour les équipes hybrides.
            </h2>
            <p className="mt-4 text-lg text-encre-2">
              Movaé peut devenir une solution QVT simple pour encourager les pauses
              actives, sans caméra, sans surveillance et sans données médicales
              individuelles.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TEAM_CARDS.map((c, i) => (
              <Reveal key={c.title} delay={i * 100}>
                <div className="h-full rounded-2xl border border-ligne bg-fond p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sauge-fonce shadow-sm">
                    <c.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-semibold">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-encre-2">{c.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Movaé — demande de démo entreprise")}`}
              onClick={() => setDemoAsked(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-ligne bg-white px-6 py-3 text-sm font-semibold transition hover:border-sauge hover:bg-sauge-claire/40"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Demander une démo
            </a>
            {demoAsked && (
              <p className="mt-3 text-sm text-encre-2">
                La version entreprise arrive bientôt — merci de votre intérêt.
              </p>
            )}
          </Reveal>
        </div>

        {/* Confidentialité */}
        <div className="mt-24 rounded-3xl border border-ligne bg-fond p-8 sm:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                Pas de surveillance. Pas de données médicales.
              </h2>
              <p className="mt-4 leading-relaxed text-encre-2">
                En V1, Movaé fonctionne localement dans votre navigateur. Vos données
                servent uniquement à afficher votre progression et à personnaliser votre
                expérience. Elles ne quittent jamais votre machine.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <ul className="space-y-3">
                {TRUST_POINTS.map((p) => (
                  <li key={p.label} className="flex items-center gap-3 text-sm font-semibold">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sauge-fonce shadow-sm">
                      <p.icon className="h-4 w-4" aria-hidden />
                    </span>
                    {p.label}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
