"use client";

import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className="flex flex-1 flex-col min-h-0 h-full w-full">{children}</div>;
  }

  return (
    <motion.div
      className="flex flex-1 flex-col min-h-0 h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease }}
    >
      {children}
    </motion.div>
  );
}
