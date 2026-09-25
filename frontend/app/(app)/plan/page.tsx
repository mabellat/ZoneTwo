"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { apiFetch, API_URL, getToken } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { WeekCalendarStrip, type PlanWeek } from "@/components/plan/WeekCalendarStrip";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { metricTip } from "@/lib/metricGlossary";

const QUICK = [
  { intent: "missed_week", label: "Missed week" },
  { intent: "travel_week", label: "Travel week" },
  { intent: "injured", label: "Injured" },
  { intent: "move_long_run", label: "Move long run" },
];

const STATUS_STYLES: Record<string, string> = {
  DONE: "text-[var(--success)]",
  SKIPPED: "text-[var(--text-muted)]",
  PENDING: "text-[var(--text-secondary)]",
  PARTIAL: "text-[var(--warning)]",
};

export default function PlanPage() {
  const [week, setWeek] = useState<PlanWeek | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const adapt = async (intent: string) => {
    await apiFetch("/api/plan/adapt", {
      method: "POST",
      body: JSON.stringify({ intent }),
    });
    setRefreshKey((k) => k + 1);
  };

  const exportIcs = async () => {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/plan/ics`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "training_plan.ics";
    a.click();
  };

  const weekLabel = week?.week_start
    ? `Week of ${new Date(week.week_start + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : "";

  return (
    <div className="page-shell-scroll space-y-6">
      <PageHeader
        title="Your plan"
        subtitle={weekLabel || "Sync a plan from Coach"}
        action={
          <button onClick={exportIcs} className="btn-ghost-on-dark">
            <Download className="w-4 h-4" />
            Calendar export
          </button>
        }
      />

      <WeekCalendarStrip showNav refreshKey={refreshKey} onWeekChange={setWeek} />

      <div>
        <SectionHeading
          title="Quick adapt"
          tooltip={metricTip("adapt_plan")}
          className="mb-3"
        />
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q.intent}
              onClick={() => adapt(q.intent)}
              className="btn-ghost text-xs inline-flex items-center gap-1"
            >
              {q.label}
              <InfoTooltip content={metricTip(q.intent)} label={`About ${q.label}`} />
            </button>
          ))}
        </div>
      </div>

      {!week?.days?.length && (
        <div className="surface p-10 text-center text-[var(--text-secondary)] text-sm">
          No active plan yet. Tell your coach your race date and weekly availability.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
        {week?.days?.map((day) => {
          const d = new Date(day.date + "T12:00:00");
          const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
          const dayNum = d.getDate();
          const isToday = new Date().toDateString() === d.toDateString();

          return (
            <div
              key={day.date}
              className={`surface p-4 min-h-[140px] flex flex-col ${
                isToday ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-base)]" : ""
              }`}
            >
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs font-medium text-[var(--text-muted)]">{dayName}</span>
                <span
                  className={`text-lg font-semibold tabular-nums ${
                    isToday ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {dayNum}
                </span>
              </div>
              <div className="flex-1 space-y-2 text-sm">
                {day.sessions.map((s) => (
                  <div key={s.id}>
                    <p className="capitalize text-[var(--text-primary)] font-medium">
                      {s.session_type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {s.target_distance_km ? `${s.target_distance_km} km · ` : ""}
                      <span className={STATUS_STYLES[s.status] ?? ""}>{s.status}</span>
                    </p>
                  </div>
                ))}
                {day.activities.map((a) => (
                  <p key={a.id} className="text-xs text-[var(--success)] truncate">
                    ✓ {a.distance_km} km · {a.name}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
