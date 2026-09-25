"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, Bike, ChevronRight, Dumbbell, Footprints, Mountain, Waves } from "lucide-react";

export type ActivityRow = {
  id: string;
  name: string;
  sport_type: string;
  date: string;
  distance_km: number;
  duration_min: number;
  avg_hr?: number | null;
  pace_min_per_km?: number | null;
};

function formatPace(paceMin: number | null | undefined) {
  if (!paceMin) return "—";
  const m = Math.floor(paceMin);
  const s = Math.round((paceMin - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h${m.toString().padStart(2, "0")}` : `${m}m`;
}

const SPORT_STYLE: Record<string, { icon: typeof Activity; bg: string; fg: string }> = {
  Run: { icon: Footprints, bg: "bg-[#ff5a1f]/12", fg: "text-[#e84d15]" },
  VirtualRun: { icon: Footprints, bg: "bg-[#ff5a1f]/12", fg: "text-[#e84d15]" },
  TrailRun: { icon: Mountain, bg: "bg-[#1f6f5c]/12", fg: "text-[#1f6f5c]" },
  Hike: { icon: Mountain, bg: "bg-[#1f6f5c]/12", fg: "text-[#1f6f5c]" },
  Walk: { icon: Footprints, bg: "bg-[#ff5a1f]/14", fg: "text-[#c2410c]" },
  Ride: { icon: Bike, bg: "bg-[#2b5fa8]/12", fg: "text-[#2b5fa8]" },
  VirtualRide: { icon: Bike, bg: "bg-[#2b5fa8]/12", fg: "text-[#2b5fa8]" },
  Swim: { icon: Waves, bg: "bg-[#0e8fa3]/12", fg: "text-[#0e8fa3]" },
  WeightTraining: { icon: Dumbbell, bg: "bg-[#15191c]/8", fg: "text-[#15191c]" },
};

export function sportStyle(sport: string) {
  return SPORT_STYLE[sport] ?? { icon: Activity, bg: "bg-[#15191c]/8", fg: "text-[#15191c]" };
}

export function ActivityFeed({ activities }: { activities: ActivityRow[] }) {
  const reduce = useReducedMotion();

  if (!activities?.length) {
    return (
      <p className="text-sm text-[var(--text-muted)] py-8 text-center">
        No activities synced yet.
      </p>
    );
  }

  return (
    <div>
      <div className="hidden sm:flex items-center gap-4 px-2 pb-2 border-b border-[var(--border)] eyebrow text-[9.5px]">
        <span className="w-10" />
        <span className="flex-1">Activity</span>
        <span className="w-16 text-right">Dist</span>
        <span className="w-14 text-right">Time</span>
        <span className="w-14 text-right hidden md:inline">Pace</span>
        <span className="w-10 text-right hidden lg:inline">HR</span>
        <span className="w-4" />
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {activities.map((a, i) => {
          const s = sportStyle(a.sport_type);
          const Icon = s.icon;
          return (
            <motion.li
              key={a.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.035, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={`/activities/${a.id}`}
                className="group flex items-center gap-4 py-3 px-2 rounded-xl transition-colors duration-200 hover:bg-[var(--bg-muted)]"
              >
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${s.bg}`}
                >
                  <Icon className={`w-[18px] h-[18px] ${s.fg}`} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">{a.name}</p>
                  <p className="font-mono text-[11px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wide">
                    {new Date(a.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    <span className="sm:hidden"> · {formatDuration(a.duration_min)}</span>
                  </p>
                </div>
                <span className="mono-stat text-sm font-semibold text-[var(--text-primary)] w-16 text-right shrink-0">
                  {a.distance_km}
                  <span className="text-[var(--text-muted)] font-normal text-xs ml-0.5">km</span>
                </span>
                <span className="mono-stat text-sm text-[var(--text-secondary)] w-14 text-right hidden sm:inline">
                  {formatDuration(a.duration_min)}
                </span>
                <span className="mono-stat text-sm text-[var(--text-secondary)] w-14 text-right hidden md:inline">
                  {formatPace(a.pace_min_per_km)}
                </span>
                <span className="mono-stat text-sm text-[var(--text-secondary)] w-10 text-right hidden lg:inline">
                  {a.avg_hr ? Math.round(a.avg_hr) : "—"}
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--signal)]" />
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
