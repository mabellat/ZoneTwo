"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { IMAGES } from "@/lib/imagery";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex app-bg">
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <motion.img
          src={IMAGES.login}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
        <div className="absolute inset-0 grain opacity-70" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-white max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/70 mb-5">
              Aerobic base · Built slowly
            </p>
            <p className="headline text-8xl">
              Easy miles.
              <br />
              <span className="serif-accent font-normal text-[var(--signal)]">big engine.</span>
            </p>
            <p className="text-white/80 text-base leading-relaxed mt-5 max-w-md">
              Your Strava history, a periodized plan, and a coach that reads your numbers.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.form
          onSubmit={submit}
          className="w-full max-w-sm space-y-5 surface p-8 sm:p-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-8 h-8 rounded-lg bg-[var(--signal)] text-white flex items-center justify-center headline text-base">
                Z2
              </span>
              <span className="headline text-2xl">
                zone<span className="serif-accent font-normal text-[var(--signal)] ml-0.5">two</span>
              </span>
            </div>
            <h1 className="section-title text-3xl">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {mode === "login" ? "Sign in to see your training." : "Takes a few seconds."}
            </p>
          </div>

          <div className="space-y-3">
            <input
              className="input-field"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              className="input-field"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
