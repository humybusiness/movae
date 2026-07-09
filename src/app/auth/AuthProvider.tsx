import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../../lib/firebase";

export interface AppUser {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
}

export type AuthResult = { ok: true } | { ok: false; message: string };

interface AuthContextValue {
  ready: boolean;
  authEnabled: boolean;
  user: AppUser | null;
  guest: boolean;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<AuthResult>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
}

const GUEST_KEY = "movae:guest";

const AuthContext = createContext<AuthContextValue | null>(null);

function toAppUser(u: User): AppUser {
  return {
    uid: u.uid,
    name: u.displayName ?? u.email?.split("@")[0] ?? "Vous",
    email: u.email,
    photoURL: u.photoURL,
  };
}

// Messages Firebase → français lisible.
function frMessage(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-email": "Adresse e-mail invalide.",
    "auth/user-not-found": "Aucun compte ne correspond à cet e-mail.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
    "auth/email-already-in-use": "Un compte existe déjà avec cet e-mail.",
    "auth/weak-password": "Le mot de passe doit contenir au moins 6 caractères.",
    "auth/popup-closed-by-user": "Fenêtre de connexion fermée avant la fin.",
    "auth/popup-blocked": "La fenêtre de connexion a été bloquée par le navigateur.",
    "auth/unauthorized-domain":
      "Ce domaine n’est pas encore autorisé dans Firebase (Authentication → Settings → Authorized domains).",
    "auth/network-request-failed": "Problème de réseau. Réessayez.",
  };
  return map[code] ?? "Une erreur est survenue. Réessayez.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const authEnabled = isFirebaseConfigured && auth !== null;
  const [ready, setReady] = useState(!authEnabled);
  const [user, setUser] = useState<AppUser | null>(null);
  const [guest, setGuest] = useState<boolean>(() => {
    if (!authEnabled) return true; // sans Firebase, on est toujours en mode local
    try {
      return sessionStorage.getItem(GUEST_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!authEnabled || !auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? toAppUser(u) : null);
      setReady(true);
    });
    return unsub;
  }, [authEnabled]);

  const value = useMemo<AuthContextValue>(() => {
    async function guard<T>(fn: () => Promise<T>): Promise<AuthResult> {
      if (!auth) return { ok: false, message: "Connexion indisponible." };
      try {
        await fn();
        try {
          sessionStorage.removeItem(GUEST_KEY);
        } catch {
          /* ignore */
        }
        setGuest(false);
        return { ok: true };
      } catch (err) {
        const code = (err as { code?: string }).code ?? "";
        return { ok: false, message: frMessage(code) };
      }
    }

    return {
      ready,
      authEnabled,
      user,
      guest,
      signInWithGoogle: () =>
        guard(async () => {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          await signInWithPopup(auth!, provider);
        }),
      signInWithEmail: (email, password) =>
        guard(() => signInWithEmailAndPassword(auth!, email.trim(), password)),
      registerWithEmail: (name, email, password) =>
        guard(async () => {
          const cred = await createUserWithEmailAndPassword(auth!, email.trim(), password);
          if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
          setUser(toAppUser({ ...cred.user, displayName: name.trim() || cred.user.displayName } as User));
        }),
      continueAsGuest: () => {
        try {
          sessionStorage.setItem(GUEST_KEY, "1");
        } catch {
          /* ignore */
        }
        setGuest(true);
      },
      logout: async () => {
        try {
          sessionStorage.removeItem(GUEST_KEY);
        } catch {
          /* ignore */
        }
        setGuest(false);
        if (auth) await signOut(auth);
      },
    };
  }, [ready, authEnabled, user, guest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>");
  return ctx;
}
