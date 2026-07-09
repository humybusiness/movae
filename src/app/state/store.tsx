import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Exercise } from "../data/exercises";
import { applyBreak, applyTick, emptyStrain } from "../engine/engine";
import { dayKey } from "../../lib/time";
import type { IndexStyleId, MovaeState, ThemeId, WorkStyle } from "../types";

const STORAGE_KEY = "movae:v1";

export function defaultState(): MovaeState {
  return {
    version: 1,
    onboarded: false,
    profile: { name: "", style: "mixte", cadenceMin: 45, goal: 6 },
    prefs: { theme: "sauge", indexStyle: "anneau", notifications: false, eyeRule: true },
    session: {
      status: "off",
      startedAt: null,
      lastBreakAt: null,
      lastEyeAt: null,
      lastTickAt: null,
      lastNotifyAt: null,
      snoozedUntil: null,
    },
    strain: emptyStrain(),
    history: [],
    days: {},
    streak: { current: 0, best: 0, lastDay: null },
    unlocked: [],
    totals: { breaks: 0, minutes: 0 },
  };
}

function load(): MovaeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<MovaeState>;
    const base = defaultState();
    const state: MovaeState = {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...parsed.profile },
      prefs: { ...base.prefs, ...parsed.prefs },
      session: { ...base.session, ...parsed.session },
      strain: { ...base.strain, ...parsed.strain },
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
  } catch {
    return defaultState();
  }
}

export type Action =
  | {
      type: "onboard";
      name: string;
      style: WorkStyle;
      cadenceMin: number;
      goal: number;
      notifications: boolean;
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
        prefs: { ...state.prefs, notifications: action.notifications },
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
    case "complete-break":
      return applyBreak(state, action.exercise, action.now, action.actualSec);
    case "snooze":
      return { ...state, session: { ...state.session, snoozedUntil: action.until } };
    case "notified":
      return { ...state, session: { ...state.session, lastNotifyAt: action.now } };
    case "reset":
      return defaultState();
  }
}

interface Store {
  state: MovaeState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // stockage plein ou indisponible : l'app reste fonctionnelle en mémoire
    }
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useMovae(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useMovae doit être utilisé sous <StoreProvider>");
  return store;
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
