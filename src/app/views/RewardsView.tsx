import {
  Activity,
  BarChart3,
  CalendarCheck,
  Crown,
  Eye,
  Flame,
  Footprints,
  Hash,
  Lock,
  Medal,
  Moon,
  PersonStanding,
  Shell,
  Sparkles,
  Sun,
  Sunrise,
  Trees,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useMovae } from "../state/store";
import { REWARDS, type Reward } from "../data/rewards";
import { THEMES } from "../data/themes";
import { Chip, MButton, MCard, ProgressBar, SectionTitle } from "../components/ui";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, Activity, Medal, Trophy, Flame, CalendarCheck, Crown, PersonStanding,
  Sunrise, Footprints, Eye, Moon, Shell, Trees, Sun, Hash, BarChart3,
};

function RewardCard({ reward }: { reward: Reward }) {
  const { state, dispatch } = useMovae();
  const unlocked = state.unlocked.includes(reward.id) || reward.check(state);
  const Icon = ICONS[reward.icon] ?? Sparkles;
  const progress = reward.progress?.(state);
  const grantedTheme = reward.grants?.theme;
  const grantedStyle = reward.grants?.style;
  const isActive =
    (grantedTheme && state.prefs.theme === grantedTheme) ||
    (grantedStyle && state.prefs.indexStyle === grantedStyle);
  const themeDef = grantedTheme ? THEMES.find((t) => t.id === grantedTheme) : undefined;

  return (
    <MCard className={`flex flex-col p-5 ${unlocked ? "" : "opacity-75"}`}>
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            unlocked ? "bg-[var(--m-soft)] text-[var(--m-strong)]" : "bg-[var(--m-bg2)] text-[var(--m-ink2)]"
          }`}
        >
          {unlocked ? <Icon className="h-5 w-5" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
        </div>
        {themeDef && (
          <div className="flex gap-1" aria-hidden>
            {themeDef.preview.map((c, i) => (
              <span key={i} className="h-4 w-4 rounded-full border border-[var(--m-line)]" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
      <h3 className="mt-3 font-semibold leading-snug">{reward.name}</h3>
      <p className="mt-1 flex-1 text-sm text-[var(--m-ink2)]">{reward.desc}</p>
      {!unlocked && (
        <div className="mt-3">
          <Chip>{reward.hint}</Chip>
          {progress && (
            <ProgressBar
              className="mt-2.5"
              value={Math.min(progress.current, progress.target)}
              max={progress.target}
            />
          )}
        </div>
      )}
      {unlocked && (grantedTheme || grantedStyle) && (
        <MButton
          variant={isActive ? "secondary" : "primary"}
          className="mt-4"
          disabled={Boolean(isActive)}
          onClick={() => {
            if (grantedTheme) dispatch({ type: "set-theme", theme: grantedTheme });
            if (grantedStyle) dispatch({ type: "set-index-style", style: grantedStyle });
          }}
        >
          {isActive ? "Activé" : "Activer"}
        </MButton>
      )}
    </MCard>
  );
}

export function RewardsView() {
  const { state, dispatch } = useMovae();
  const badges = REWARDS.filter((r) => r.kind === "badge");
  const themes = REWARDS.filter((r) => r.kind === "theme");
  const styles = REWARDS.filter((r) => r.kind === "style");
  const unlockedCount = REWARDS.filter((r) => state.unlocked.includes(r.id)).length;

  return (
    <div>
      <SectionTitle
        title="Récompenses"
        subtitle={`Plus vous bougez, plus l’app devient à vous. ${unlockedCount}/${REWARDS.length} débloquées — sans pièces, sans classement.`}
      />

      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--m-ink2)]">Badges</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {badges.map((r) => (
          <RewardCard key={r.id} reward={r} />
        ))}
      </div>

      <h3 className="mb-3 mt-8 text-xs font-bold uppercase tracking-widest text-[var(--m-ink2)]">Thèmes</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MCard className="flex flex-col p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--m-soft)] text-[var(--m-strong)]">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="flex gap-1" aria-hidden>
              {THEMES[0].preview.map((c, i) => (
                <span key={i} className="h-4 w-4 rounded-full border border-[var(--m-line)]" style={{ background: c }} />
              ))}
            </div>
          </div>
          <h3 className="mt-3 font-semibold">Thème Sauge</h3>
          <p className="mt-1 flex-1 text-sm text-[var(--m-ink2)]">{THEMES[0].description}</p>
          <MButton
            variant={state.prefs.theme === "sauge" ? "secondary" : "primary"}
            className="mt-4"
            disabled={state.prefs.theme === "sauge"}
            onClick={() => dispatch({ type: "set-theme", theme: "sauge" })}
          >
            {state.prefs.theme === "sauge" ? "Activé" : "Activer"}
          </MButton>
        </MCard>
        {themes.map((r) => (
          <RewardCard key={r.id} reward={r} />
        ))}
      </div>

      <h3 className="mb-3 mt-8 text-xs font-bold uppercase tracking-widest text-[var(--m-ink2)]">
        Styles d’Indice
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MCard className="flex flex-col p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--m-soft)] text-[var(--m-strong)]">
            <Activity className="h-5 w-5" aria-hidden />
          </div>
          <h3 className="mt-3 font-semibold">Indice « Anneau doux »</h3>
          <p className="mt-1 flex-1 text-sm text-[var(--m-ink2)]">Le style d’origine, un anneau qui se remplit avec votre régularité.</p>
          <MButton
            variant={state.prefs.indexStyle === "anneau" ? "secondary" : "primary"}
            className="mt-4"
            disabled={state.prefs.indexStyle === "anneau"}
            onClick={() => dispatch({ type: "set-index-style", style: "anneau" })}
          >
            {state.prefs.indexStyle === "anneau" ? "Activé" : "Activer"}
          </MButton>
        </MCard>
        {styles.map((r) => (
          <RewardCard key={r.id} reward={r} />
        ))}
      </div>
    </div>
  );
}
