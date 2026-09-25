"use client";

import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
  side?: "top" | "bottom";
  align?: "center" | "start";
  /** Lighter control on dark headers / scoreboard */
  variant?: "default" | "onDark";
  label?: string;
};

export function InfoTooltip({
  content,
  className,
  side = "bottom",
  variant = "default",
  align = "start",
  label = "More info",
}: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!content) return null;

  const position =
    side === "top"
      ? align === "start"
        ? "bottom-full mb-2 left-0"
        : "bottom-full mb-2 left-1/2 -translate-x-1/2"
      : align === "start"
        ? "top-full mt-2 left-0"
        : "top-full mt-2 left-1/2 -translate-x-1/2";

  return (
    <span className={cn("relative inline-flex shrink-0 align-middle", className)}>
      <button
        type="button"
        className={cn(
          "rounded-full p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-1",
          variant === "onDark"
            ? "text-white/55 hover:text-white/90"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <CircleHelp className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-[100] w-[min(17rem,calc(100vw-2rem))] rounded-xl border px-3 py-2.5 text-left text-xs leading-relaxed shadow-lg",
            "border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)]",
            position
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export function LabelWithTooltip({
  label,
  tip,
  variant = "default",
  className,
}: {
  label: React.ReactNode;
  tip?: string;
  variant?: "default" | "onDark";
  className?: string;
}) {
  if (!tip) {
    return <span className={className}>{label}</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {label}
      <InfoTooltip content={tip} variant={variant} />
    </span>
  );
}
