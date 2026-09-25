"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ExternalLink, Gauge, Mountain, Timer } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { sportStyle } from "@/components/dashboard/ActivityFeed";
import { BackLink } from "@/components/ui/BackLink";
import { LabelWithTooltip } from "@/components/ui/InfoTooltip";
import { Reveal } from "@/components/motion/Reveal";
import { GlassCard } from "@/components/ui/GlassCard";
import { metricTip } from "@/lib/metricGlossary";
import { cn } from "@/lib/utils";

type ActivityDetail = {
  id: string;
  name: string;
  sport_type: string;
  date: string;
  distance_km: number;
  duration_min: number;
  moving_time_seconds: number;
  pace_min_per_km?: number | null;
  avg_hr?: number | null;
  max_heartrate?: number | null;
  elevation_gain_m?: number | null;
  average_watts?: number | null;
  strava_url?: string;
};

function formatPace(paceMin: number | null | undefined) {
  if (!paceMin) return null;
  const m = Math.floor(paceMin);
  const s = Math.round((paceMin - m) * 60);
  return { main: `${m}:${s.toString().padStart(2, "0")}`, unit: "/km" };
}

function formatMovingTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return { main: `${h}h ${m}m`, sub: s > 0 ? `${s}s moving` : "moving time" };
  }
  if (m >= 1) {
    return { main: `${m} min`, sub: s > 0 ? `${s} sec moving` : "moving time" };
  }
  return { main: `${s} sec`, sub: "moving time" };
}

function sportLabel(sport: string) {
  return sport.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function sessionSummary(a: ActivityDetail) {
  const dist = a.distance_km;
  const sport = sportLabel(a.sport_type).toLowerCase();
  const mins = Math.round(a.moving_time_seconds / 60);
  if (dist < 0.1) {
    return `Short ${sport} — about ${mins} minutes on the clock.`;
  }
  if (a.avg_hr && a.avg_hr < 115) {
    return `Easy ${sport} — ${dist} km at a relaxed effort (avg HR ${Math.round(a.avg_hr)}).`;
  }
  if (a.avg_hr && a.avg_hr >= 150) {
    return `Harder ${sport} — ${dist} km with elevated heart rate (avg ${Math.round(a.avg_hr)} bpm).`;
  }
  return `${dist} km ${sport} in about ${mins} minutes of moving time.`;
}

function hrIntensityLabel(avg: number) {
  if (avg < 100) return "Very light";
  if (avg < 120) return "Easy";
  if (avg < 140) return "Moderate";
  if (avg < 160) return "Hard";
  return "Very hard";
}

export default function ActivityDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<ActivityDetail>(`/api/activities/${id}`)
      .then(setActivity)
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="page-shell">
        <p className="text-[var(--text-secondary)]">Activity not found.</p>
        <BackLink href="/home" className="mt-4" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="page-shell-scroll page-medium">
        <motion.div
          className="h-40 rounded-[var(--radius-card)] surface animate-pulse"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      </div>
    );
  }

  const date = new Date(activity.date);
  const style = sportStyle(activity.sport_type);
  const SportIcon = style.icon;
  const pace = formatPace(activity.pace_min_per_km);
  const moving = formatMovingTime(activity.moving_time_seconds);
  const showPace =
    activity.pace_min_per_km &&
    ["Run", "TrailRun", "VirtualRun", "Walk", "Hike"].some((t) =>
      activity.sport_type.toLowerCase().includes(t.toLowerCase())
    );

  const avgHr = activity.avg_hr ? Math.round(activity.avg_hr) : null;
  const maxHr = activity.max_heartrate ? Math.round(activity.max_heartrate) : null;
  const hrBarPct = avgHr && maxHr ? Math.min(100, Math.round((avgHr / maxHr) * 100)) : null;

  const extras: { label: string; value: string }[] = [];
  if (activity.elevation_gain_m != null && activity.elevation_gain_m > 0) {
    extras.push({ label: "Elevation gain", value: `${Math.round(activity.elevation_gain_m)} m` });
  }
  if (activity.average_watts != null) {
    extras.push({ label: "Average power", value: `${Math.round(activity.average_watts)} W` });
  }
  const elapsedDiff =
    activity.duration_min > 0 &&
    Math.abs(activity.duration_min - activity.moving_time_seconds / 60) > 1;
  if (elapsedDiff) {
    extras.push({ label: "Total elapsed", value: `${activity.duration_min} min` });
  }

  return (
    <div className="page-shell-scroll page-medium space-y-5 lg:space-y-6 pt-4 sm:pt-6">
      <BackLink href="/home" className="text-[var(--text-secondary)]" />

      <header
        className={cn(
          "rounded-[var(--radius-card)] border border-[var(--border)] shadow-[var(--shadow-card)]",
          "bg-[var(--card)] px-5 sm:px-6 py-5 sm:py-6"
        )}
      >
        <div className="flex gap-4 sm:gap-5">
          <span
            className={cn(
              "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0",
              "border border-[var(--border)] shadow-sm",
              style.bg
            )}
          >
            <SportIcon className={cn("w-7 h-7 sm:w-8 sm:h-8", style.fg)} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)] leading-snug">
              {date.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              <span className="text-[var(--text-muted)]/60"> · </span>
              {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
            <h1 className="headline text-3xl sm:text-4xl text-[var(--text-primary)] max-w-3xl break-words mt-2 leading-tight">
              {activity.name}
            </h1>
            <p className="text-[var(--text-secondary)] mt-2 text-sm font-semibold">
              {sportLabel(activity.sport_type)}
            </p>
          </div>
        </div>
      </header>

      <motion.section
        className="scoreboard relative overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--signal)]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-white/10">
          <MetricCell
            label="Distance"
            value={String(activity.distance_km)}
            unit="km"
            className="lg:border-r border-white/10"
          />
          <MetricCell
            label="Moving time"
            tip={metricTip("moving_time")}
            value={moving.main}
            sub={moving.sub}
            className="border-l border-white/10 lg:border-r"
          />
          {showPace && pace ? (
            <MetricCell
              label="Avg pace"
              tip={metricTip("avg_pace")}
              value={pace.main}
              unit={pace.unit}
              className="border-l border-white/10 lg:border-r max-lg:border-t"
            />
          ) : (
            <MetricCell
              label="Sport"
              value={sportLabel(activity.sport_type)}
              className="border-l border-white/10 lg:border-r max-lg:border-t"
            />
          )}
          <MetricCell
            label="Avg heart rate"
            tip={metricTip("activity_avg_hr")}
            value={avgHr != null ? String(avgHr) : "—"}
            unit={avgHr != null ? "bpm" : undefined}
            sub={avgHr != null ? hrIntensityLabel(avgHr) : "No HR data"}
            className="border-l border-white/10 max-lg:border-t"
          />
        </div>
      </motion.section>

      <Reveal>
        <GlassCard padding="lg" className="space-y-6">
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{sessionSummary(activity)}</p>

          {avgHr != null && (
            <div className="rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                  <p className="eyebrow mb-1">
                    <LabelWithTooltip label="Heart rate" tip={metricTip("activity_avg_hr")} />
                  </p>
                  <p className="display-num text-4xl">
                    {avgHr}
                    <span className="serif-accent text-xl text-[var(--text-muted)] ml-1">bpm avg</span>
                  </p>
                </div>
                {maxHr != null && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Peak{" "}
                    <span className="mono-stat font-semibold text-[var(--text-primary)]">{maxHr}</span> bpm
                    <span className="block text-xs text-[var(--text-muted)] mt-0.5">Highest on this activity</span>
                  </p>
                )}
              </div>
              {hrBarPct != null && maxHr != null && (
                <div>
                  <div className="h-2.5 rounded-full bg-[var(--card)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1f6f5c] to-[#ff5a1f]"
                      style={{ width: `${hrBarPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Average was {hrBarPct}% of this session&apos;s peak — {hrIntensityLabel(avgHr).toLowerCase()}{" "}
                    effort for you on this day.
                  </p>
                </div>
              )}
            </div>
          )}

          {extras.length > 0 && (
            <ul className="grid sm:grid-cols-2 gap-3">
              {extras.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-4 py-3 text-sm"
                >
                  <span className="text-[var(--text-muted)] flex items-center gap-2">
                    {row.label === "Elevation gain" && <Mountain className="w-4 h-4" />}
                    {row.label === "Average power" && <Gauge className="w-4 h-4" />}
                    {row.label === "Total elapsed" && <Timer className="w-4 h-4" />}
                    {row.label}
                  </span>
                  <span className="mono-stat font-medium text-[var(--text-primary)]">{row.value}</span>
                </li>
              ))}
            </ul>
          )}

          {activity.strava_url && (
            <a
              href={activity.strava_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex"
            >
              View on Strava
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </GlassCard>
      </Reveal>
    </div>
  );
}

function MetricCell({
  label,
  tip,
  value,
  unit,
  sub,
  className = "",
}: {
  label: string;
  tip?: string;
  value: string;
  unit?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("p-5 sm:p-6", className)}>
      <p className="font-mono text-[10px] sm:text-[10.5px] uppercase tracking-[0.14em] text-white/55">
        <LabelWithTooltip label={label} tip={tip} variant="onDark" />
      </p>
      <p className="display-num text-[40px] sm:text-[48px] mt-2 text-white leading-none break-words">
        {value}
        {unit && <span className="serif-accent text-xl sm:text-2xl text-white/55 ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-white/60 mt-2">{sub}</p>}
    </div>
  );
}
