"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { PageTransition } from "@/components/motion/PageTransition";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-[var(--accent)] border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-sm text-[var(--text-muted)]">Loading your studio…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
