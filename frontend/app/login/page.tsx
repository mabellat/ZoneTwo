"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { IMAGES } from "@/lib/imagery";

const GENERIC_SIGN_IN_ERROR =
  "We couldn't sign you in. Try again with Strava, or check your email and password.";

const AUTH_ERRORS: Record<string, string> = {
  cancelled: GENERIC_SIGN_IN_ERROR,
  token_failed: GENERIC_SIGN_IN_ERROR,
  user_not_found: GENERIC_SIGN_IN_ERROR,
};

function LoginForm() {
  const { login, register, acceptAccessToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (authError) {
      setError(AUTH_ERRORS[authError] ?? "Sign-in failed. Try again.");
    }

    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const token = new URLSearchParams(hash).get("access_token");
    if (!token) return;

    setSubmitting(true);
    acceptAccessToken(token)
      .then(() => {
        window.history.replaceState(null, "", "/login");
        router.replace("/home");
      })
      .catch(() => setError(GENERIC_SIGN_IN_ERROR))
      .finally(() => setSubmitting(false));
  }, [searchParams, acceptAccessToken, router]);

  const signInWithStrava = async () => {
    setError("");
    setStravaLoading(true);
    try {
      const data = await apiFetch<{ url: string }>("/api/strava/login");
      window.location.href = data.url;
    } catch {
      setError(GENERIC_SIGN_IN_ERROR);
      setStravaLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      router.push("/home");
    } catch (err) {
      const msg = err instanceof Error ? err.message : GENERIC_SIGN_IN_ERROR;
      setError(msg.includes("{") ? GENERIC_SIGN_IN_ERROR : msg);
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
          className="relative w-full max-w-sm space-y-5 surface p-8 sm:p-10 overflow-hidden"
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
              {mode === "login" ? "Sign in with Strava or email." : "Takes a few seconds."}
            </p>
          </div>

          {error && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-8 bg-[var(--card)]/92 backdrop-blur-md"
              role="alert"
              aria-live="assertive"
            >
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-700 font-semibold text-lg">
                !
              </div>
              <p className="text-center text-sm text-[var(--text-primary)] leading-relaxed max-w-[16rem]">
                {error.includes("{") ? GENERIC_SIGN_IN_ERROR : error}
              </p>
              <button
                type="button"
                className="btn-primary w-full max-w-[12rem] !py-2.5"
                onClick={() => setError("")}
              >
                Try again
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={submitting || stravaLoading}
            onClick={signInWithStrava}
            className="btn-strava w-full !py-3"
          >
            {stravaLoading ? "Redirecting to Strava…" : "Continue with Strava"}
          </button>

          <div className="flex items-center gap-3 py-0.5" role="separator" aria-label="Or sign in with email">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] shrink-0">
              or use email
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
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
            <button
              type="submit"
              disabled={submitting || stravaLoading}
              className="btn-primary w-full !py-3"
            >
              {submitting ? "Please wait…" : mode === "login" ? "Sign in with email" : "Create account"}
            </button>
          </div>

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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center app-bg">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
