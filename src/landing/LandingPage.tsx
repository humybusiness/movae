import { InstallProvider } from "./shared";
import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { Solution } from "./sections/Solution";
import { Kine } from "./sections/Kine";
import { InstallTeams } from "./sections/InstallTeams";
import { FaqEnd } from "./sections/FaqEnd";
import { Footer } from "./sections/Footer";

export default function LandingPage() {
  return (
    <InstallProvider>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Aller au contenu
      </a>
      <Header />
      <main id="contenu">
        <Hero />
        <Problem />
        <Solution />
        <Kine />
        <InstallTeams />
        <FaqEnd />
      </main>
      <Footer />
    </InstallProvider>
  );
}
