import { Container, Logo } from "../shared";
import { CONTACT_EMAIL, DISCLAIMER } from "../../lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-ligne bg-fond py-12">
      <Container>
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={26} />
              <span className="font-display text-lg font-semibold">Movaé</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-encre-2">
              La pause active créée par de futurs kinés pour les journées devant l’écran.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm" aria-label="Liens de pied de page">
            <a href="#probleme" className="text-encre-2 transition hover:text-encre">Problème</a>
            <a href="#fonctionnement" className="text-encre-2 transition hover:text-encre">Fonctionnement</a>
            <a href="#kines" className="text-encre-2 transition hover:text-encre">Kinés</a>
            <a href="#entreprises" className="text-encre-2 transition hover:text-encre">Entreprises</a>
            <a href="#faq" className="text-encre-2 transition hover:text-encre">FAQ</a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-encre-2 transition hover:text-encre">
              Contact
            </a>
          </nav>
        </div>
        <p className="mt-10 border-t border-ligne pt-6 text-xs leading-relaxed text-encre-2">
          {DISCLAIMER}
        </p>
        <p className="mt-3 text-xs text-encre-2">
          © {new Date().getFullYear()} Movaé. Uniquement des statistiques de mouvement, jamais de caméra.
        </p>
      </Container>
    </footer>
  );
}
