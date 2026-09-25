"use client";

import { motion } from "framer-motion";

export function DashboardSkeleton() {
  return (
    <div className="page-shell-scroll space-y-6">
      <motion.div
        className="h-[200px] sm:h-[260px] rounded-2xl bg-white/15 border border-white/20 backdrop-blur-[2px]"
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="h-28 rounded-[22px] bg-white/50 border border-[var(--border)]"
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}
