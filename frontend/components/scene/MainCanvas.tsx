"use client";

import { cn } from "@/lib/utils";
import type { PageBackdropVariant } from "@/lib/pageBackdrop";
import { CoverPhoto } from "@/components/scene/CoverPhoto";

type Props = {
  variant?: PageBackdropVariant;
  imageUrl?: string;
  ambientImageUrl?: string;
  children: React.ReactNode;
  className?: string;
};

/** Tall enough for dashboard greeting + weekly chips before fade to paper. */
const HERO_ZONE_CLASS =
  "h-[min(62vh,520px)] sm:h-[min(58vh,560px)] lg:h-[min(54vh,600px)]";

/**
 * Scrollable page shell: studio paper, optional hero photo band, optional ambient wash.
 */
export function MainCanvas({
  variant = "hero",
  imageUrl,
  ambientImageUrl,
  children,
  className,
}: Props) {
  const showHero = variant === "hero" && Boolean(imageUrl);
  const showAmbient = variant === "studio" && Boolean(ambientImageUrl);

  return (
    <div className={cn("relative min-h-full flex-1 flex flex-col app-bg", className)}>
      {showAmbient && ambientImageUrl && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <CoverPhoto
            src={ambientImageUrl}
            position="center 40%"
            imgClassName="scale-105 opacity-[0.22] saturate-[1.15]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--paper)]/75 via-[var(--paper)]/88 to-[var(--paper)]" />
        </div>
      )}

      {showHero && imageUrl && (
        <div
          className={cn("absolute inset-x-0 top-0 pointer-events-none overflow-hidden", HERO_ZONE_CLASS)}
          aria-hidden
        >
          <CoverPhoto src={imageUrl} priority position="center 42%" imgClassName="scale-[1.05]" />
          <div className="absolute inset-0 grain opacity-80" />
          {/* Light scrim — photo stays visible; text uses shadow + dark chips */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/65" />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 h-28 sm:h-36",
              "bg-gradient-to-b from-transparent via-[var(--paper)]/40 to-[var(--paper)]"
            )}
          />
        </div>
      )}

      {variant === "studio" && !showAmbient && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 sm:h-48 bg-gradient-to-b from-[var(--sand)]/30 to-transparent"
          aria-hidden
        />
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
