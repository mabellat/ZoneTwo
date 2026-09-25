"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

export type PlanWeek = {
  week_start: string | null;
  week_end?: string;
  phase?: string;
  days: Array<{
    date: string;
    sessions: Array<{
      id: string;
      session_type: string;
      target_distance_km?: number;
      status: string;
    }>;
    activities: Array<{ id: string; name: string; distance_km: number }>;
  }>;
};

const SESSION_STYLE: Record<string, { bg: string; label: string }> = {
  rest: { bg: "bg-[#9aa1a6]", label: "Rest" },
  easy: { bg: "bg-emerald-500/90", label: "Easy" },
  zone2: { bg: "bg-emerald-500/90", label: "Z2" },
  long_run: { bg: "bg-sky-500/90", label: "Long" },
  tempo: { bg: "bg-amber-500/90", label: "Tempo" },
  intervals: { bg: "bg-rose-500/90", label: "Int" },
  recovery: { bg: "bg-teal-500/70", label: "Rec" },
};

function sessionChip(session_type: string) {
  const key = session_type.toLowerCase().replace(/\s+/g, "_");
  return SESSION_STYLE[key] ?? { bg: "bg-[var(--sidebar)]", label: session_type.slice(0, 4) };
}

type Props = {
  /** Initial week data from dashboard (offset 0) — avoids extra fetch on home */
  initialWeek?: PlanWeek | null;
  compact?: boolean;
  showNav?: boolean;
  linkToPlan?: boolean;
  refreshKey?: number;
  onWeekChange?: (week: PlanWeek | null) => void;
};

export function WeekCalendarStrip({
  initialWeek,
  compact = false,
  showNav = true,
  linkToPlan = false,
  refreshKey = 0,
  onWeekChange,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [week, setWeek] = useState<PlanWeek | null>(initialWeek ?? null);
  const [loading, setLoading] = useState(!initialWeek);

  useEffect(() => {
    if (offset === 0 && initialWeek) {
      setWeek(initialWeek);
      onWeekChange?.(initialWeek);
      return;
    }
    setLoading(true);
    apiFetch<PlanWeek>(`/api/plan/week?offset=${offset}`)
      .then((w) => {
        setWeek(w);
        if (onWeekChange) onWeekChange(w);
      })
      .catch(() => setWeek(null))
      .finally(() => setLoading(false));
  }, [offset, initialWeek, refreshKey]);

  if (!week?.days?.length) {
    return (
      <div className="surface p-4 text-sm text-[var(--text-secondary)]">
        No plan this week.{" "}
        <Link href="/coach" className="text-[var(--accent)] font-medium hover:underline">
          Set up a race build
        </Link>
      </div>
    );
  }

  const weekLabel = week.week_start
    ? new Date(week.week_start + "T12:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <section className="surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">This week</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {weekLabel}
            {week.phase ? ` · ${week.phase.replace("_", " ")}` : ""}
          </p>
        </div>
        {showNav && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOffset((o) => o - 1)}
              className="btn-ghost p-2"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => (o === 0 ? 0 : o + 1))}
              disabled={offset >= 0}
              className="btn-ghost p-2 disabled:opacity-40"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {linkToPlan && (
              <Link href="/plan" className="btn-ghost text-xs ml-1 hidden sm:inline-flex">
                Full plan
              </Link>
            )}
          </div>
        )}
      </div>

      <div
        className={`grid grid-cols-7 gap-1.5 sm:gap-2 ${loading ? "opacity-60 pointer-events-none" : ""}`}
      >
        {week.days.map((day) => {
          const d = new Date(day.date + "T12:00:00");
          const isToday = new Date().toDateString() === d.toDateString();
          const session = day.sessions[0];
          const done =
            session?.status === "DONE" ||
            (day.activities.length > 0 && (!session || session.status === "PENDING"));
          const chip = session ? sessionChip(session.session_type) : null;

          return (
            <div
              key={day.date}
              className={`flex flex-col items-center rounded-xl border px-1 py-2 sm:py-3 min-w-0 transition ${
                isToday
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]/30"
                  : "border-[var(--border)] bg-[var(--bg-elevated)]"
              }`}
            >
              <span className="text-[10px] sm:text-xs font-medium text-[var(--text-muted)] uppercase">
                {d.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
              <span
                className={`text-sm sm:text-base font-semibold tabular-nums my-0.5 ${
                  isToday ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                }`}
              >
                {d.getDate()}
              </span>
              {session ? (
                <div className="w-full flex flex-col items-center gap-0.5 mt-1">
                  <span
                    className={`text-[9px] sm:text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-md truncate max-w-full ${chip?.bg}`}
                    title={session.session_type}
                  >
                    {compact ? chip?.label : session.session_type.replace("_", " ")}
                  </span>
                  {!compact && session.target_distance_km != null && (
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                      {session.target_distance_km} km
                    </span>
                  )}
                  {done && (
                    <span className="text-[10px] text-[var(--success)] font-medium">✓</span>
                  )}
                </div>
              ) : day.activities.length > 0 ? (
                <span className="text-[10px] text-[var(--success)] mt-1 font-medium">✓</span>
              ) : (
                <span className="text-[10px] text-[var(--text-muted)] mt-1">—</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
