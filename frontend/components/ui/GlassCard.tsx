"use client";

import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
};

const pad = { sm: "p-4", md: "p-5", lg: "p-6" };

export function GlassCard({ children, className, hover = false, padding = "md" }: Props) {
  return (
    <div className={cn("surface", pad[padding], hover && "surface-interactive", className)}>
      {children}
    </div>
  );
}
