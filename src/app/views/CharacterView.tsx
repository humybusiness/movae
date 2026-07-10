import { Check, Lock, Sparkles } from "lucide-react";
import { useMovae } from "../state/store";
import { ACCESSORIES, CLAY_PER_BREAK, CLAY_PER_PROGRAM, SLOT_LABELS } from "../data/accessories";
import { CharacterStage } from "../components/ExerciseFigure3D";
import { Chip, MButton, MCard, SectionTitle } from "../components/ui";

// Menu Personnage : choix du corps (féminin/masculin), solde d'argile et
// boutique d'accessoires 3D. L'argile se gagne uniquement en bougeant —
// c'est la même philosophie que le reste de Movaé : la récompense suit
// le mouvement, jamais l'inverse.

function ClayBadge({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--m-soft)] px-3.5 py-1.5 text-sm font-bold text-[var(--m-strong)]">
      <span
        className="inline-block h-3.5 w-3.5 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, #D89974, #B06A45)" }}
        aria-hidden
      />
      {amount} d’argile
    </span>
  );
}

export function CharacterView() {
  const { state, dispatch } = useMovae();
  const { avatar } = state;

  return (
    <div className="mx-auto max-w-5xl">
      <SectionTitle
        title="Votre personnage"
        subtitle="Il fait chaque exercice avec vous. Gagnez de l’argile en bougeant, façonnez-le à votre image."
      />

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        {/* Aperçu + choix du corps */}
        <MCard className="flex flex-col items-center gap-4 p-6">
          <CharacterStage body={avatar.body} equipped={avatar.equipped} size={280} />
          <div className="flex gap-2" role="group" aria-label="Choix du personnage">
            <MButton
              variant={avatar.body === "f" ? "primary" : "secondary"}
              onClick={() => dispatch({ type: "avatar-body", body: "f" })}
              aria-pressed={avatar.body === "f"}
            >
              Féminin
            </MButton>
            <MButton
              variant={avatar.body === "m" ? "primary" : "secondary"}
              onClick={() => dispatch({ type: "avatar-body", body: "m" })}
              aria-pressed={avatar.body === "m"}
            >
              Masculin
            </MButton>
          </div>
          <ClayBadge amount={avatar.clay} />
          <p className="max-w-64 text-center text-xs leading-relaxed text-[var(--m-ink2)]">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[var(--m-accent)]" aria-hidden />
            +{CLAY_PER_BREAK} d’argile par pause terminée, +{CLAY_PER_PROGRAM} par programme complet.
          </p>
        </MCard>

        {/* Boutique */}
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold">Atelier d’accessoires</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACCESSORIES.map((acc) => {
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
                      {owned ? (equipped ? "Porté" : "Possédé") : `${acc.price} argile`}
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
                            Porter
                          </>
                        )}
                      </MButton>
                    ) : (
                      <MButton
                        className="w-full !py-2"
                        disabled={!affordable}
                        onClick={() => dispatch({ type: "avatar-buy", id: acc.id })}
                        title={affordable ? undefined : "Terminez des pauses pour gagner de l’argile"}
                      >
                        {affordable ? (
                          "Façonner"
                        ) : (
                          <>
                            <Lock className="h-4 w-4" aria-hidden />
                            Encore {acc.price - avatar.clay} d’argile
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
