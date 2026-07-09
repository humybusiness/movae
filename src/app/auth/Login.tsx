import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { DISCLAIMER } from "../../lib/constants";
import { isDesktop } from "../../lib/desktop";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" width={18} height={18} aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function Login() {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: "google" | "email", fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    setBusy(kind);
    const res = await fn();
    if (!res.ok) {
      setError(res.message ?? "Une erreur est survenue.");
      setBusy(null);
    }
    // en cas de succès, l'écran est remplacé par l'app (pas besoin de reset)
  };

  return (
    <div className="m-app flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5" aria-label="Accueil Movaé">
          <svg viewBox="0 0 64 64" width={34} height={34} aria-hidden>
            <defs>
              <linearGradient id="login-logo" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7FA68A" />
                <stop offset="1" stopColor="#4F755D" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="url(#login-logo)" />
            <rect x="14" y="34" width="8" height="16" rx="4" fill="#F4F1E8" opacity="0.8" />
            <rect x="28" y="26" width="8" height="24" rx="4" fill="#F4F1E8" opacity="0.9" />
            <rect x="42" y="16" width="8" height="34" rx="4" fill="#F4F1E8" />
          </svg>
          <span className="font-display text-2xl font-semibold tracking-tight text-[var(--m-ink)]">
            Movaé
          </span>
        </Link>

        <div
          className="rounded-3xl border border-[var(--m-line)] bg-[var(--m-card)] p-7 sm:p-8"
          style={{ boxShadow: "var(--m-shadow)" }}
        >
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--m-ink)]">
            {mode === "signin" ? "Connexion à Movaé" : "Créer un compte"}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--m-ink2)]">
            {mode === "signin"
              ? "Retrouvez votre progression sur tous vos appareils."
              : "Sauvegardez votre progression et synchronisez vos appareils."}
          </p>

          {/* La connexion Google par popup n'est pas autorisée par Google dans
              les applications de bureau : on la propose sur le web uniquement. */}
          {!isDesktop() && (
            <>
              <button
                onClick={() => run("google", signInWithGoogle)}
                disabled={busy !== null}
                className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--m-line)] bg-white px-4 py-3 text-sm font-semibold text-[#1E2420] transition hover:bg-[var(--m-bg2)] disabled:opacity-60"
              >
                {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <GoogleGlyph />}
                Continuer avec Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs font-medium text-[var(--m-ink2)]">
                <span className="h-px flex-1 bg-[var(--m-line)]" />
                ou par e-mail
                <span className="h-px flex-1 bg-[var(--m-line)]" />
              </div>
            </>
          )}
          {isDesktop() && <div className="mt-6" />}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "signin") {
                run("email", () => signInWithEmail(email, password));
              } else {
                run("email", () => registerWithEmail(name, email, password));
              }
            }}
            className="space-y-3"
          >
            {mode === "register" && (
              <label className="flex items-center gap-2.5 rounded-xl border border-[var(--m-line)] bg-[var(--m-bg)] px-3.5 py-3">
                <User className="h-4 w-4 shrink-0 text-[var(--m-ink2)]" aria-hidden />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prénom"
                  autoComplete="name"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--m-ink2)]"
                  aria-label="Prénom"
                />
              </label>
            )}
            <label className="flex items-center gap-2.5 rounded-xl border border-[var(--m-line)] bg-[var(--m-bg)] px-3.5 py-3">
              <Mail className="h-4 w-4 shrink-0 text-[var(--m-ink2)]" aria-hidden />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse e-mail"
                autoComplete="email"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--m-ink2)]"
                aria-label="Adresse e-mail"
              />
            </label>
            <label className="flex items-center gap-2.5 rounded-xl border border-[var(--m-line)] bg-[var(--m-bg)] px-3.5 py-3">
              <Lock className="h-4 w-4 shrink-0 text-[var(--m-ink2)]" aria-hidden />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe (6 caractères min.)"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--m-ink2)]"
                aria-label="Mot de passe"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-[#C9A86A]/15 px-3 py-2 text-xs font-medium text-[#8F7443]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy !== null}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--m-strong)] px-4 py-3 text-sm font-semibold text-[var(--m-bg)] transition hover:opacity-90 disabled:opacity-60"
            >
              {busy === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden />
              )}
              {mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--m-ink2)]">
            {mode === "signin" ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "register" : "signin");
                setError(null);
              }}
              className="font-semibold text-[var(--m-strong)] hover:underline"
            >
              {mode === "signin" ? "Créer un compte" : "Se connecter"}
            </button>
          </p>
        </div>

        <button
          onClick={continueAsGuest}
          className="mt-4 w-full text-center text-sm font-medium text-[var(--m-ink2)] transition hover:text-[var(--m-ink)]"
        >
          Continuer sans compte (données locales)
        </button>

        <p className="mt-6 px-2 text-center text-[11px] leading-relaxed text-[var(--m-ink2)]">
          {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
