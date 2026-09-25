"use client";

import { cn } from "@/lib/utils";

type Props = {
  src: string;
  className?: string;
  imgClassName?: string;
  /** CSS object-position, e.g. `center 30%` */
  position?: string;
  priority?: boolean;
};

/** Full-bleed cover image — sharper than CSS background on large screens. */
export function CoverPhoto({
  src,
  className,
  imgClassName,
  position = "center center",
  priority = false,
}: Props) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      <img
        src={src}
        alt=""
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={cn("h-full w-full object-cover", imgClassName)}
        style={{ objectPosition: position }}
        draggable={false}
      />
    </div>
  );
}
