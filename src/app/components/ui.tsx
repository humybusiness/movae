import type { ButtonHTMLAttributes, ReactNode } from "react";

export function MCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--m-line)] bg-[var(--m-card)] ${className}`}
      style={{ boxShadow: "var(--m-shadow)" }}
    >
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function MButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--m-strong)] text-[var(--m-bg)] hover:opacity-90 active:scale-[0.98]",
    secondary:
      "border border-[var(--m-line)] bg-[var(--m-card)] text-[var(--m-ink)] hover:bg-[var(--m-soft)]",
    ghost: "text-[var(--m-ink2)] hover:bg-[var(--m-soft)] hover:text-[var(--m-ink)]",
  };
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "warm";
  className?: string;
}) {
  const tones = {
    neutral: "border-[var(--m-line)] bg-[var(--m-bg2)] text-[var(--m-ink2)]",
    accent: "border-transparent bg-[var(--m-soft)] text-[var(--m-strong)]",
    warm: "border-transparent bg-[#C9A86A]/15 text-[#8F7443]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  className = "",
  tone = "accent",
}: {
  value: number;
  max: number;
  className?: string;
  tone?: "accent" | "warm";
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`h-2 w-full overflow-hidden rounded-full bg-[var(--m-bg2)] ${className}`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${pct}%`,
          background: tone === "warm" ? "#C9A86A" : "var(--m-accent)",
        }}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${
        checked ? "bg-[var(--m-strong)]" : "bg-[var(--m-line)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[var(--m-ink2)]">{subtitle}</p>}
    </div>
  );
}
