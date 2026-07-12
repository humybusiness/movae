import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { Exercise } from "../data/exercises";
import {
  applyBreak,
  applyExerciseFeedback,
  applyProgramDone,
  applyTick,
  emptyInsights,
  emptyStrain,
} from "../engine/engine";
import { useAuth } from "../auth/AuthProvider";
import { db } from "../../lib/firebase";
import { dayKey } from "../../lib/time";
import { accessoryById, isAdditiveSlot, CLAY_PER_BREAK, CLAY_PER_PROGRAM } from "../data/accessories";
import {
  DEFAULT_AVATAR_COLORS,
  type AvatarColors,
  type AvatarState,
  type HairId,
  type IndexStyleId,
  type MovaeState,
  type ThemeId,
  type WorkStyle,
} from "../types";

const STORAGE_KEY = "movae:v1";

// Clé de stockage local : partagée pour l'invité, préfixée par uid si connecté.
function keyFor(uid: string | null): string {
  return uid ? `${STORAGE_KEY}:${uid}` : STORAGE_KEY;
}

export function defaultState(): MovaeState {
  return {
    version: 1,
    onboarded: false,
    profile: { name: "", style: "mixte", cadenceMin: 45, goal: 6 },
    prefs: {
      theme: "sauge",
      indexStyle: "anneau",
      notifications: false,
      eyeRule: true,
      smartMode: true,
    },
    session: {
      status: "off",
      startedAt: null,
      lastBreakAt: null,
      lastEyeAt: null,
      lastTickAt: null,
      lastNotifyAt: null,
      snoozedUntil: null,
    },
    avatar: {
      hair: "court",
      colors: { ...DEFAULT_AVATAR_COLORS },
      clay: 0,
      owned: [],
      equipped: [],
    },
    strain: emptyStrain(),
    insights: emptyInsights(),
    history: [],
    days: {},
    streak: { current: 0, best: 0, lastDay: null },
    unlocked: [],
    totals: { breaks: 0, minutes: 0, programs: 0 },
  };
}

// Fusionne un état partiel (localStorage ou cloud) avec l'état par défaut.
function hydrateState(parsed: Partial<MovaeState>): MovaeState {
  const base = defaultState();
  const state: MovaeState = {
    ...base,
    ...parsed,
    profile: { ...base.profile, ...parsed.profile },
    prefs: { ...base.prefs, ...parsed.prefs },
    session: { ...base.session, ...parsed.session },
    avatar: {
      ...base.avatar,
      ...parsed.avatar,
      // migration depuis l'ancien choix féminin/masculin
      hair:
        parsed.avatar?.hair ??
        ((parsed.avatar as { body?: string } | undefined)?.body === "f" ? "chignon" : base.avatar.hair),
      colors: { ...base.avatar.colors, ...parsed.avatar?.colors },
    },
    strain: { ...base.strain, ...parsed.strain },
    insights: {
      ...base.insights,
      ...parsed.insights,
      hourly: { ...base.insights.hourly, ...parsed.insights?.hourly },
      exFeedback: { ...base.insights.exFeedback, ...parsed.insights?.exFeedback },
    },
    streak: { ...base.streak, ...parsed.streak },
    totals: { ...base.totals, ...parsed.totals },
  };
  // Si la série a été rompue (dernier jour actif avant hier), remettre à zéro.
  if (state.streak.lastDay) {
    const today = dayKey(Date.now());
    const yesterday = dayKey(Date.now() - 86400000);
    if (state.streak.lastDay !== today && state.streak.lastDay !== yesterday) {
      state.streak = { ...state.streak, current: 0 };
    }
  }
  return state;
}

function readRaw(key: string): Partial<MovaeState> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<MovaeState>) : null;
  } catch {
    return null;
  }
}

// Chargement initial : données de l'utilisateur, sinon migration des données
// invité au premier login, sinon état par défaut.
function loadInitial(uid: string | null): MovaeState {
  const own = readRaw(keyFor(uid));
  if (own) return hydrateState(own);
  if (uid) {
    const guest = readRaw(STORAGE_KEY);
    if (guest) return hydrateState(guest);
  }
  return defaultState();
}

export type Action =
  | {
      type: "onboard";
      name: string;
      style: WorkStyle;
      cadenceMin: number;
      goal: number;
      notifications: boolean;
      smartMode: boolean;
    }
  | { type: "set-profile"; patch: Partial<MovaeState["profile"]> }
  | { type: "set-prefs"; patch: Partial<MovaeState["prefs"]> }
  | { type: "set-theme"; theme: ThemeId }
  | { type: "set-index-style"; style: IndexStyleId }
  | { type: "start-day"; now: number }
  | { type: "toggle-away"; now: number }
  | { type: "end-day"; now: number }
  | { type: "tick"; now: number; idle: boolean }
  | { type: "complete-break"; exercise: Exercise; now: number; actualSec: number }
  | { type: "snooze"; until: number }
  | { type: "notified"; now: number }
  | { type: "exercise-feedback"; exerciseId: string; up: boolean }
  | { type: "program-done" }
  | { type: "avatar-hair"; hair: HairId }
  | { type: "avatar-color"; part: keyof AvatarColors; color: string }
  | { type: "avatar-buy"; id: string }
  | { type: "avatar-toggle"; id: string }
  | { type: "clear-insights" }
  | { type: "hydrate"; state: MovaeState }
  | { type: "reset" };

function reducer(state: MovaeState, action: Action): MovaeState {
  switch (action.type) {
    case "onboard":
      return {
        ...state,
        onboarded: true,
        profile: {
          ...state.profile,
          name: action.name,
          style: action.style,
          cadenceMin: action.cadenceMin,
          goal: action.goal,
        },
        prefs: {
          ...state.prefs,
          notifications: action.notifications,
          smartMode: action.smartMode,
        },
      };
    case "set-profile":
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case "set-prefs":
      return { ...state, prefs: { ...state.prefs, ...action.patch } };
    case "set-theme":
      return { ...state, prefs: { ...state.prefs, theme: action.theme } };
    case "set-index-style":
      return { ...state, prefs: { ...state.prefs, indexStyle: action.style } };
    case "start-day":
      return {
        ...state,
        session: {
          ...state.session,
          status: "working",
          startedAt: action.now,
          lastBreakAt: null,
          lastEyeAt: null,
          lastTickAt: action.now,
          snoozedUntil: null,
        },
      };
    case "toggle-away":
      return {
        ...state,
        session: {
          ...state.session,
          status: state.session.status === "away" ? "working" : "away",
          lastTickAt: action.now,
        },
      };
    case "end-day":
      return {
        ...state,
        strain: emptyStrain(),
        session: { ...state.session, status: "off", lastTickAt: action.now },
      };
    case "tick":
      return applyTick(state, action.now, action.idle);
    case "complete-break": {
      const next = applyBreak(state, action.exercise, action.now, action.actualSec);
      return { ...next, avatar: { ...next.avatar, clay: next.avatar.clay + CLAY_PER_BREAK } };
    }
    case "snooze":
      return { ...state, session: { ...state.session, snoozedUntil: action.until } };
    case "notified":
      return { ...state, session: { ...state.session, lastNotifyAt: action.now } };
    case "exercise-feedback":
      return applyExerciseFeedback(state, action.exerciseId, action.up);
    case "program-done": {
      const next = applyProgramDone(state);
      return { ...next, avatar: { ...next.avatar, clay: next.avatar.clay + CLAY_PER_PROGRAM } };
    }
    case "avatar-hair":
      return { ...state, avatar: { ...state.avatar, hair: action.hair } };
    case "avatar-color":
      return {
        ...state,
        avatar: {
          ...state.avatar,
          colors: { ...state.avatar.colors, [action.part]: action.color },
        },
      };
    case "avatar-buy": {
      const acc = accessoryById(action.id);
      if (!acc || state.avatar.owned.includes(acc.id) || state.avatar.clay < acc.price) return state;
      // Achat = équipé/installé directement. Le jardin et les animaux se
      // cumulent ; les emplacements portés (tête, visage...) se remplacent.
      const equipped = isAdditiveSlot(acc.slot)
        ? state.avatar.equipped
        : state.avatar.equipped.filter((id) => accessoryById(id)?.slot !== acc.slot);
      return {
        ...state,
        avatar: {
          ...state.avatar,
          clay: state.avatar.clay - acc.price,
          owned: [...state.avatar.owned, acc.id],
          equipped: [...equipped, acc.id],
        },
      };
    }
    case "avatar-toggle": {
      const acc = accessoryById(action.id);
      if (!acc || !state.avatar.owned.includes(acc.id)) return state;
      if (state.avatar.equipped.includes(acc.id)) {
        return {
          ...state,
          avatar: { ...state.avatar, equipped: state.avatar.equipped.filter((id) => id !== acc.id) },
        };
      }
      const equipped = isAdditiveSlot(acc.slot)
        ? state.avatar.equipped
        : state.avatar.equipped.filter((id) => accessoryById(id)?.slot !== acc.slot);
      return { ...state, avatar: { ...state.avatar, equipped: [...equipped, acc.id] } };
    }
    case "clear-insights":
      return { ...state, insights: emptyInsights() };
    case "hydrate":
      return action.state;
    case "reset":
      return defaultState();
  }
}

interface Store {
  state: MovaeState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<Store | null>(null);

const CLOUD_DEBOUNCE_MS = 1500;

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, dispatch] = useReducer(reducer, uid, loadInitial);
  const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudEnabled = db !== null && uid !== null;

  // Hydratation depuis le cloud (une fois par utilisateur connecté).
  useEffect(() => {
    if (!cloudEnabled || !db || !uid) return;
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, "movae", uid);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists() && snap.data().state) {
          dispatch({ type: "hydrate", state: hydrateState(snap.data().state as Partial<MovaeState>) });
        } else {
          // Premier login : on pousse l'état local courant vers le cloud.
          await setDoc(ref, { state, updatedAt: serverTimestamp() });
        }
      } catch (err) {
        console.warn("[Movaé] Synchronisation cloud (lecture) impossible :", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // On ne veut relancer qu'au changement d'utilisateur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Écriture : localStorage immédiat + cloud débounce.
  useEffect(() => {
    try {
      localStorage.setItem(keyFor(uid), JSON.stringify(state));
    } catch {
      // stockage plein ou indisponible : l'app reste fonctionnelle en mémoire
    }
    if (!cloudEnabled || !db || !uid) return;
    const database = db;
    const userId = uid;
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(() => {
      setDoc(
        doc(database, "movae", userId),
        { state, updatedAt: serverTimestamp() },
        { merge: true },
      ).catch((err) =>
        console.warn("[Movaé] Synchronisation cloud (écriture) impossible :", err),
      );
    }, CLOUD_DEBOUNCE_MS);
  }, [state, uid, cloudEnabled]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useMovae(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useMovae doit être utilisé sous <StoreProvider>");
  return store;
}

// Variante tolérante pour les composants réutilisables (ex. figures 3D)
// qui peuvent vivre hors du provider : rend null au lieu de jeter.
export function useMovaeMaybe(): Store | null {
  return useContext(StoreContext);
}

export function defaultAvatar(): AvatarState {
  return defaultState().avatar;
}

export function exportStateAsJson(state: MovaeState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `movae-export-${dayKey(Date.now())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
