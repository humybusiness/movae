import { useState } from "react";
import { Bell, Download, RotateCcw } from "lucide-react";
import { exportStateAsJson, useMovae } from "../state/store";
import { themeUnlocked } from "../data/rewards";
import { THEMES } from "../data/themes";
import { MButton, MCard, SectionTitle, Toggle } from "../components/ui";
import {
  notificationPermission,
  requestNotificationPermission,
  showNotification,
} from "../../lib/notify";
import { DISCLAIMER } from "../../lib/constants";
import { WORK_STYLE_LABELS, type WorkStyle } from "../types";

export function SettingsView() {
  const { state, dispatch } = useMovae();
  const [confirmReset, setConfirmReset] = useState(false);
  const [notifTested, setNotifTested] = useState(false);
  const permission = notificationPermission();

  return (
    <div className="max-w-3xl">
      <SectionTitle title="Réglages" subtitle="Votre rythme, vos rappels, vos données." />

      <MCard className="p-6">
        <h3 className="font-display text-lg font-semibold">Profil de travail</h3>
        <label className="mt-4 block text-sm font-semibold" htmlFor="set-name">
          Prénom
        </label>
        <input
          id="set-name"
          value={state.profile.name}
          onChange={(e) => dispatch({ type: "set-profile", patch: { name: e.target.value } })}
          placeholder="Optionnel"
          className="mt-2 w-full max-w-xs rounded-xl border border-[var(--m-line)] bg-[var(--m-bg)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--m-accent)]"
        />

        <p className="mt-5 text-sm font-semibold">Style de travail</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(WORK_STYLE_LABELS) as WorkStyle[]).map((s) => (
            <button
              key={s}
              onClick={() => dispatch({ type: "set-profile", patch: { style: s } })}
              aria-pressed={state.profile.style === s}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                state.profile.style === s
                  ? "bg-[var(--m-strong)] text-[var(--m-bg)]"
                  : "border border-[var(--m-line)] text-[var(--m-ink2)] hover:bg-[var(--m-soft)]"
              }`}
            >
              {WORK_STYLE_LABELS[s]}
            </button>
          ))}
        </div>

        <label className="mt-5 flex items-center justify-between text-sm font-semibold" htmlFor="set-cadence">
          Rythme cible entre deux pauses
          <span className="text-[var(--m-strong)]">{state.profile.cadenceMin} min</span>
        </label>
        <input
          id="set-cadence"
          type="range"
          min={30}
          max={90}
          step={5}
          value={state.profile.cadenceMin}
          onChange={(e) =>
            dispatch({ type: "set-profile", patch: { cadenceMin: Number(e.target.value) } })
          }
          className="mt-2 w-full accent-[var(--m-strong)]"
        />

        <label className="mt-4 flex items-center justify-between text-sm font-semibold" htmlFor="set-goal">
          Objectif de pauses par jour
          <span className="text-[var(--m-strong)]">{state.profile.goal}</span>
        </label>
        <input
          id="set-goal"
          type="range"
          min={3}
          max={10}
          value={state.profile.goal}
          onChange={(e) =>
            dispatch({ type: "set-profile", patch: { goal: Number(e.target.value) } })
          }
          className="mt-2 w-full accent-[var(--m-strong)]"
        />
      </MCard>

      <MCard className="mt-5 p-6">
        <h3 className="font-display text-lg font-semibold">Rappels</h3>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Notifications de pause</p>
            <p className="mt-0.5 text-xs text-[var(--m-ink2)]">
              Un rappel discret quand une pause devient vraiment utile (10 min minimum entre deux).
            </p>
          </div>
          <Toggle
            checked={state.prefs.notifications && permission === "granted"}
            label="Notifications de pause"
            onChange={async (v) => {
              if (v) {
                const perm = await requestNotificationPermission();
                dispatch({ type: "set-prefs", patch: { notifications: perm === "granted" } });
              } else {
                dispatch({ type: "set-prefs", patch: { notifications: false } });
              }
            }}
          />
        </div>
        {permission === "denied" && (
          <p className="mt-2 text-xs text-[#8F7443]">
            Les notifications sont bloquées par le navigateur. Réautorisez-les dans les
            paramètres du site pour les activer.
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--m-line)] pt-4">
          <div>
            <p className="text-sm font-semibold">Règle 20-20-20 (yeux)</p>
            <p className="mt-0.5 text-xs text-[var(--m-ink2)]">
              Une suggestion de regard au loin toutes les 20 minutes d’écran.
            </p>
          </div>
          <Toggle
            checked={state.prefs.eyeRule}
            label="Règle 20-20-20"
            onChange={(v) => dispatch({ type: "set-prefs", patch: { eyeRule: v } })}
          />
        </div>
        <MButton
          variant="secondary"
          className="mt-5"
          onClick={() => {
            const ok = showNotification(
              "Movaé — test de rappel",
              "Parfait, les rappels fonctionnent. À tout à l’heure pour une vraie pause.",
            );
            setNotifTested(ok);
          }}
        >
          <Bell className="h-4 w-4" aria-hidden />
          Tester une notification
        </MButton>
        {notifTested && (
          <p className="mt-2 text-xs text-[var(--m-strong)]">Notification envoyée.</p>
        )}
        <p className="mt-4 text-xs text-[var(--m-ink2)]">
          Limite connue : les rappels dépendent du navigateur et ne se déclenchent que
          lorsque Movaé est ouvert (onglet ou fenêtre installée). Gardez l’app installée
          ouverte en arrière-plan pendant vos journées.
        </p>
      </MCard>

      <MCard className="mt-5 p-6">
        <h3 className="font-display text-lg font-semibold">Apparence</h3>
        <p className="mt-1 text-xs text-[var(--m-ink2)]">
          Les thèmes se débloquent avec la régularité — voir l’onglet Récompenses.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {THEMES.map((t) => {
            const unlocked = themeUnlocked(state, t.id);
            const active = state.prefs.theme === t.id;
            return (
              <button
                key={t.id}
                disabled={!unlocked}
                onClick={() => dispatch({ type: "set-theme", theme: t.id })}
                aria-pressed={active}
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "border-[var(--m-accent)] bg-[var(--m-soft)]"
                    : "border-[var(--m-line)] hover:border-[var(--m-accent)]/50"
                }`}
              >
                <span className="flex gap-1" aria-hidden>
                  {t.preview.map((c, i) => (
                    <span key={i} className="h-3.5 w-3.5 rounded-full border border-[var(--m-line)]" style={{ background: c }} />
                  ))}
                </span>
                {t.name}
                {!unlocked && <span className="text-xs font-normal text-[var(--m-ink2)]">verrouillé</span>}
              </button>
            );
          })}
        </div>
      </MCard>

      <MCard className="mt-5 p-6">
        <h3 className="font-display text-lg font-semibold">Vos données</h3>
        <p className="mt-1 text-sm text-[var(--m-ink2)]">
          Tout est stocké localement dans ce navigateur. Aucun compte, aucun serveur,
          aucune donnée médicale.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <MButton variant="secondary" onClick={() => exportStateAsJson(state)}>
            <Download className="h-4 w-4" aria-hidden />
            Exporter (JSON)
          </MButton>
          {confirmReset ? (
            <>
              <MButton
                className="!bg-[#8F5B4A]"
                onClick={() => {
                  dispatch({ type: "reset" });
                  setConfirmReset(false);
                }}
              >
                Confirmer la remise à zéro
              </MButton>
              <MButton variant="ghost" onClick={() => setConfirmReset(false)}>
                Annuler
              </MButton>
            </>
          ) : (
            <MButton variant="secondary" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Tout remettre à zéro
            </MButton>
          )}
        </div>
      </MCard>

      <p className="mt-6 text-xs leading-relaxed text-[var(--m-ink2)]">{DISCLAIMER}</p>
    </div>
  );
}
