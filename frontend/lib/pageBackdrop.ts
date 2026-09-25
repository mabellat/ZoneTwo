import { ambientImageForPath, canvasImageForPath } from "@/lib/imagery";

export type PageBackdropVariant = "hero" | "studio";

export type PageBackdropConfig = {
  variant: PageBackdropVariant;
  /** Hero band or ambient wash */
  imageUrl?: string;
  ambientImageUrl?: string;
};

/**
 * - `hero`: large endurance photo under page titles (home, plan, analytics, settings)
 * - `studio`: paper texture + optional subtle ambient photo (coach, activity detail)
 */
export function pageBackdropForPath(pathname: string): PageBackdropConfig {
  const ambient = ambientImageForPath(pathname);
  if (ambient) {
    return { variant: "studio", ambientImageUrl: ambient };
  }
  return {
    variant: "hero",
    imageUrl: canvasImageForPath(pathname),
  };
}
