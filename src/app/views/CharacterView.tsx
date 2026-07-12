import { useState } from "react";
import { Check, Lock, Sparkles } from "lucide-react";
import { useMovae } from "../state/store";
import {
  ACCESSORIES,
  CATEGORY_LABELS,
  CLAY_PER_BREAK,
  CLAY_PER_PROGRAM,
  SLOT_LABELS,
  type AccessoryCategory,
} from "../data/accessories";
import { CharacterStage, avatarConfig } from "../components/ExerciseFigure3D";
import { Chip, MButton, MCard, SectionTitle } from "../components/ui";
import { HAIR_LABELS, type AvatarColors, type HairId } from "../types";

// Menu Personnage : coupe de cheveux (gratuites), couleur libre pour chaque
// élément, solde d'élans et boutique (style, jardin, compagnons). Les élans se
// gagnent uniquement en bougeant — la récompense suit le mouvement.

function ElanBadge({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--m-soft)] px-3.5 py-1.5 text-sm font-bold text-[var(--m-strong)]">
      <span
        className="inline-block h-3.5 w-3.5 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, #D89974, #B06A45)" }}
        aria-hidden
      />
      {amount} élan{amount > 1 ? "s" : ""}
    </span>
  );
}

const COLOR_PARTS: { key: keyof AvatarColors; label: string; swatches: string[] }[] = [
  { key: "skin", label: "Peau", swatches: ["#F0DCC3", "#E8C9A6", "#D2A578", "#B07A4E", "#8A5A34", "#5E3B22"] },
  { key: "hair", label: "Cheveux", swatches: ["#4A3F35", "#2A2622", "#8A6A42", "#C7913E", "#B0532E", "#9A9188", "#D9C7A7", "#6C4E7B"] },
  { key: "top", label: "Haut", swatches: ["#8FAE97", "#C4795A", "#5B7FA8", "#B0607A", "#8E6FB0", "#D6B45C", "#4F755D", "#E8E2D4"] },
  { key: "trousers", label: "Pantalon", swatches: ["#6F665C", "#3A342C", "#4E5D6C", "#7A5C43", "#5B6B57", "#2C3E4C", "#9A8C7A"] },
  { key: "shoes", label: "Chaussures", swatches: ["#4C443B", "#2A2622", "#C4795A", "#E8E2D4", "#5B7FA8", "#8A6A42"] },
];

function ColorRow({
  label,
  value,
  swatches,
  onPick,
}: {
  label: string;
  value: string;
  swatches: string[];
  onPick: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-semibold text-[var(--m-ink2)]">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            aria-label={`${label} : ${c}`}
            aria-pressed={value.toLowerCase() === c.toLowerCase()}
            className={`h-6 w-6 rounded-full border transition ${
              value.toLowerCase() === c.toLowerCase()
                ? "border-[var(--m-strong)] ring-2 ring-[var(--m-accent)]/40"
                : "border-[var(--m-line)]"
            }`}
            style={{ background: c }}
          />
        ))}
        <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-[var(--m-line)]" title="Couleur libre">
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: "conic-gradient(#e66,#ee6,#6e6,#6ee,#66e,#e6e,#e66)" }}
            aria-hidden
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onPick(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} — couleur personnalisée`}
          />
        </label>
      </div>
    </div>
  );
}

export function CharacterView() {
  const { state, dispatch } = useMovae();
  const { avatar } = state;
  const [cat, setCat] = useState<AccessoryCategory>("style");

  const list = ACCESSORIES.filter((a) => a.category === cat);

  return (
    <div className="mx-auto max-w-5xl">
      <SectionTitle
        title="Votre avatar"
        subtitle="Il fait chaque exercice avec vous. Gagnez des élans en bougeant, façonnez-le à votre image."
      />

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        {/* Aperçu + personnalisation */}
        <MCard className="flex flex-col items-center gap-4 p-6">
          <CharacterStage config={avatarConfig(avatar)} size={300} />
          <ElanBadge amount={avatar.clay} />

          {/* Coupes de cheveux (gratuites) */}
          <div className="w-full">
            <p className="mb-2 text-xs font-semibold text-[var(--m-ink2)]">Coupe de cheveux</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(HAIR_LABELS) as HairId[]).map((h) => (
                <button
                  key={h}
                  onClick={() => dispatch({ type: "avatar-hair", hair: h })}
                  aria-pressed={avatar.hair === h}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    avatar.hair === h
                      ? "bg-[var(--m-strong)] text-white"
                      : "bg-[var(--m-bg2)] text-[var(--m-ink2)] hover:text-[var(--m-ink)]"
                  }`}
                >
                  {HAIR_LABELS[h]}
                </button>
              ))}
            </div>
          </div>

          {/* Couleurs (libre par élément) */}
          <div className="w-full space-y-2">
            <p className="text-xs font-semibold text-[var(--m-ink2)]">Couleurs</p>
            {COLOR_PARTS.map((p) => (
              <ColorRow
                key={p.key}
                label={p.label}
                value={avatar.colors[p.key]}
                swatches={p.swatches}
                onPick={(c) => dispatch({ type: "avatar-color", part: p.key, color: c })}
              />
            ))}
          </div>

          <p className="max-w-72 text-center text-xs leading-relaxed text-[var(--m-ink2)]">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[var(--m-accent)]" aria-hidden />
            +{CLAY_PER_BREAK} élans par pause terminée, +{CLAY_PER_PROGRAM} par programme complet.
          </p>
        </MCard>

        {/* Boutique */}
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_LABELS) as AccessoryCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                aria-pressed={cat === c}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  cat === c
                    ? "bg-[var(--m-strong)] text-white"
                    : "bg-[var(--m-bg2)] text-[var(--m-ink2)] hover:text-[var(--m-ink)]"
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((acc) => {
              const owned = avatar.owned.includes(acc.id);
              const equipped = avatar.equipped.includes(acc.id);
              const affordable = avatar.clay >= acc.price;
              return (
                <MCard key={acc.id} className={`flex flex-col gap-2 p-4 ${equipped ? "ring-2 ring-[var(--m-accent)]/40" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--m-bg2)] text-xl" aria-hidden>
                        {acc.emoji}
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{acc.name}</p>
                        <p className="text-[11px] text-[var(--m-ink2)]">{SLOT_LABELS[acc.slot]}</p>
                      </div>
                    </div>
                    <Chip tone={owned ? "accent" : "neutral"}>
                      {owned ? (equipped ? "Installé" : "Possédé") : `${acc.price} élans`}
                    </Chip>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--m-ink2)]">{acc.desc}</p>
                  <div className="mt-auto">
                    {owned ? (
                      <MButton
                        variant={equipped ? "secondary" : "primary"}
                        className="w-full !py-2"
                        onClick={() => dispatch({ type: "avatar-toggle", id: acc.id })}
                      >
                        {equipped ? (
                          "Retirer"
                        ) : (
                          <>
                            <Check className="h-4 w-4" aria-hidden />
                            Installer
                          </>
                        )}
                      </MButton>
                    ) : (
                      <MButton
                        className="w-full !py-2"
                        disabled={!affordable}
                        onClick={() => dispatch({ type: "avatar-buy", id: acc.id })}
                        title={affordable ? undefined : "Terminez des pauses pour gagner des élans"}
                      >
                        {affordable ? (
                          "Acquérir"
                        ) : (
                          <>
                            <Lock className="h-4 w-4" aria-hidden />
                            Encore {acc.price - avatar.clay} élans
                          </>
                        )}
                      </MButton>
                    )}
                  </div>
                </MCard>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
