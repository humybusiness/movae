import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Container, Logo } from "./shared";
import { CONTACT_EMAIL, DISCLAIMER } from "../lib/constants";

// Mentions légales & politique de confidentialité.
// ⚠️ À COMPLÉTER avant lancement commercial : identité de l'éditeur
// (noms ou société, SIREN si société créée) — champs marqués [À compléter].

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-encre-2">{children}</div>
    </section>
  );
}

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-fond">
      <header className="border-b border-ligne bg-fond/80 backdrop-blur-md">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Retour à l'accueil Movaé">
            <Logo size={30} />
            <span className="font-display text-xl font-semibold tracking-tight">Movaé</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-sauge-fonce transition hover:opacity-75"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour au site
          </Link>
        </Container>
      </header>

      <main>
        <Container className="max-w-3xl py-14">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Mentions légales & confidentialité
          </h1>
          <p className="mt-2 text-sm text-encre-2">Dernière mise à jour : juillet 2026.</p>

          <Section title="Éditeur">
            <p>
              Movaé est un projet édité par Hugo Barthélemy, étudiant en kinésithérapie
              [À compléter&nbsp;: ou raison sociale et SIREN une fois une société créée].
            </p>
            <p>
              Contact&nbsp;: <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-sauge-fonce">{CONTACT_EMAIL}</a>
            </p>
            <p>Directeur de la publication&nbsp;: Hugo Barthélemy.</p>
          </Section>

          <Section title="Hébergement">
            <p>
              Site web hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723,
              États-Unis (vercel.com). L’installeur de l’application de bureau est distribué
              via GitHub (GitHub Inc., 88 Colin P. Kelly Jr. St, San Francisco, CA 94107,
              États-Unis).
            </p>
          </Section>

          <Section title="Nature du service — pas une application de santé">
            <p>{DISCLAIMER}</p>
            <p>
              Movaé est un outil de bien-être au travail et de productivité&nbsp;: il propose
              des micro-pauses actives et des repères d’hygiène de mouvement. Il ne pose
              aucun diagnostic, ne délivre aucun soin, ne collecte aucune donnée de santé et
              n’est pas un dispositif médical au sens du règlement (UE) 2017/745.
            </p>
          </Section>

          <Section title="Données personnelles (RGPD)">
            <p>
              <strong className="text-encre">Sans compte</strong> — toutes les données
              (réglages, historique de pauses, apprentissages du moteur) sont stockées
              localement sur votre appareil. Rien n’est transmis à nos serveurs&nbsp;; nous
              n’y avons pas accès.
            </p>
            <p>
              <strong className="text-encre">Avec un compte (optionnel)</strong> — si vous
              créez un compte, votre adresse e-mail et vos données de progression (nombre
              de pauses, exercices réalisés, préférences d’interface) sont synchronisées via
              Google Firebase (Google Ireland Ltd), sur la base de l’exécution du service
              que vous demandez (art. 6.1.b RGPD). Elles ne servent qu’à retrouver votre
              progression d’un appareil à l’autre — jamais de publicité, jamais de revente,
              jamais de données médicales.
            </p>
            <p>
              Vous pouvez à tout moment&nbsp;: exporter vos données (Réglages → Exporter),
              les effacer (Réglages → Tout remettre à zéro), ou demander la suppression de
              votre compte et des données associées en écrivant à {CONTACT_EMAIL}. Vous
              disposez des droits d’accès, de rectification, d’effacement, de portabilité et
              d’opposition, et du droit d’introduire une réclamation auprès de la CNIL
              (cnil.fr).
            </p>
            <p>
              L’application détecte l’inactivité clavier/souris uniquement pour estimer vos
              temps de travail&nbsp;: elle ne lit jamais ce que vous tapez, n’enregistre
              aucune frappe, n’accède ni à votre caméra ni à votre micro ni au contenu de
              vos écrans.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Le site et l’application n’utilisent aucun cookie publicitaire ni traceur
              d’audience tiers. Seul un stockage local technique (localStorage) est utilisé
              pour faire fonctionner l’application — il est exempté de consentement au sens
              des lignes directrices CNIL.
            </p>
          </Section>

          <Section title="Propriété intellectuelle">
            <p>
              La marque Movaé, l’interface, les illustrations et les contenus (exercices,
              programmes, conseils) sont la propriété de leurs auteurs. Toute reproduction
              non autorisée est interdite.
            </p>
          </Section>

          <Section title="Responsabilité">
            <p>
              Les exercices proposés sont doux et conçus pour un public en bonne santé
              générale, dans les limites d’une amplitude confortable. Chaque utilisateur
              reste seul juge de sa capacité à les réaliser. En cas de doute, de grossesse,
              de blessure récente ou de condition particulière, demandez l’avis d’un
              professionnel de santé avant utilisation.
            </p>
          </Section>
        </Container>
      </main>

      <footer className="border-t border-ligne py-8">
        <Container>
          <p className="text-xs text-encre-2">© {new Date().getFullYear()} Movaé.</p>
        </Container>
      </footer>
    </div>
  );
}
