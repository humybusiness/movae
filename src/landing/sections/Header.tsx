import { Container, Logo, useInstall } from "../shared";

const LINKS = [
  { href: "#probleme", label: "Problème" },
  { href: "#fonctionnement", label: "Fonctionnement" },
  { href: "#kines", label: "L’équipe" },
  { href: "#entreprises", label: "Entreprises" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const { requestInstall } = useInstall();
  return (
    <header className="sticky top-0 z-40 border-b border-ligne/70 bg-fond/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <a href="#" className="flex items-center gap-2.5" aria-label="Movaé — retour en haut">
          <Logo size={30} />
          <span className="font-display text-xl font-semibold tracking-tight">Movaé</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation du site">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-encre-2 transition hover:text-encre"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <button
          onClick={requestInstall}
          className="cursor-pointer rounded-xl bg-sauge-fonce px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Télécharger
        </button>
      </Container>
    </header>
  );
}
