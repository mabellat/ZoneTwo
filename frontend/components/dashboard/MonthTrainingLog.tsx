"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { sportStyle } from "@/components/dashboard/ActivityFeed";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

type LogActivity = {
  id: string;
  name: string;
  sport_type: string;
  date: string;
  distance_km: number;
  duration_min: number;
  moving_time_seconds: number;
  avg_hr?: number | null;
  max_heartrate?: number | null;
  pace_min_per_km?: number | null;
  elevation_gain_m?: number | null;
  hr_zone?: string | null;
  hr_zone_label?: string | null;
};

type LogResponse = {
  window_days: number;
  activity_count: number;
  total_km: number;
  with_hr_count: number;
  activities: LogActivity[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

const ZONE_COLOR: Record<string, string> = {
  z1: "#c9c2b4",
  z2: "#1f6f5c",
  z3: "#e0a526",
  z4: "#ff5a1f",
  z5: "#e84d15",
};

function formatPace(paceMin: number | null | undefined) {
  if (!paceMin) return "—";
  const m = Math.floor(paceMin);
  const s = Math.round((paceMin - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

function formatMoving(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function weekKey(iso: string) {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

const LOG_PAGE_SIZE = 8;

export function MonthTrainingLog({ days = 28 }: { days?: number }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LogResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setPage(1);
  }, [days, open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<LogResponse>(
      `/api/activities/training-log?days=${days}&page=${page}&page_size=${LOG_PAGE_SIZE}`
    )
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, days, page]);

  const grouped = useMemo(() => {
    if (!data?.activities?.length) return [];
    const map = new Map<string, LogActivity[]>();
    for (const a of data.activities) {
      const key = weekKey(a.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-3 -mx-1 text-left transition-colors hover:bg-[var(--bg-muted)]"
        aria-expanded={open}
      >
        <div>
          <p className="font-medium text-[var(--text-primary)] text-sm">
            Session log · last {days} days
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Tap to see every activity, heart-rate zone, and full stats
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-[var(--text-muted)] shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-4 animate-fade-in-up">
          {loading && (
            <p className="text-sm text-[var(--text-muted)] py-6 text-center">Loading sessions…</p>
          )}
          {!loading && data && (
            <>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-md bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                  {data.activity_count} activities
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                  {data.total_km} km total
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                  {data.with_hr_count} with HR
                </span>
              </div>

              {data.activity_count === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No activities in this window.</p>
              ) : (
                grouped.map(([weekStart, acts]) => (
                  <div key={weekStart}>
                    <p className="eyebrow mb-2">
                      Week of{" "}
                      {new Date(weekStart + "T12:00:00").toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <ul className="space-y-2">
                      {acts.map((a) => {
                        const s = sportStyle(a.sport_type);
                        const Icon = s.icon;
                        const zoneColor = a.hr_zone ? ZONE_COLOR[a.hr_zone] : undefined;
                        const sport = a.sport_type.replace(/([a-z])([A-Z])/g, "$1 $2");
                        const dateLabel = new Date(a.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });

                        return (
                          <li key={a.id}>
                            <Link
                              href={`/activities/${a.id}`}
                              className="group block rounded-xl border border-[var(--border)] p-3 sm:p-4 transition-colors hover:bg-[var(--bg-muted)] hover:border-[var(--ink)]/15"
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                    s.bg
                                  )}
                                >
                                  <Icon className={cn("w-[18px] h-[18px]", s.fg)} />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--signal)] transition-colors">
                                    {a.name}
                                  </p>
                                  <p className="font-mono text-[11px] text-[var(--text-muted)] mt-1">
                                    {dateLabel} · {sport}
                                  </p>
                                </div>
                                <ChevronRight
                                  className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform"
                                />
                              </div>

                              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
                                <div>
                                  <dt className="text-[10px] font-mono uppercase tracking-wide text-[var(--text-muted)]">
                                    Distance
                                  </dt>
                                  <dd className="mono-stat font-semibold text-[var(--text-primary)]">
                                    {a.distance_km}
                                    <span className="text-xs font-normal text-[var(--text-muted)] ml-0.5">
                                      km
                                    </span>
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] font-mono uppercase tracking-wide text-[var(--text-muted)]">
                                    Time
                                  </dt>
                                  <dd className="mono-stat text-[var(--text-secondary)]">
                                    {formatMoving(a.moving_time_seconds)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] font-mono uppercase tracking-wide text-[var(--text-muted)]">
                                    Pace
                                  </dt>
                                  <dd className="mono-stat text-[var(--text-secondary)]">
                                    {formatPace(a.pace_min_per_km)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] font-mono uppercase tracking-wide text-[var(--text-muted)]">
                                    Heart rate
                                  </dt>
                                  <dd className="mono-stat text-[var(--text-secondary)]">
                                    {a.avg_hr ? (
                                      <>
                                        {Math.round(a.avg_hr)} bpm
                                        {a.max_heartrate ? (
                                          <span className="block text-[10px] text-[var(--text-muted)] font-normal">
                                            max {Math.round(a.max_heartrate)}
                                          </span>
                                        ) : null}
                                      </>
                                    ) : (
                                      <span className="text-xs text-[var(--text-muted)]">—</span>
                                    )}
                                  </dd>
                                </div>
                              </dl>

                              {a.hr_zone_label && zoneColor && (
                                <span
                                  className="inline-block mt-3 font-mono text-[10px] uppercase tracking-wide px-2 py-1 rounded-md text-white"
                                  style={{ background: zoneColor }}
                                >
                                  {a.hr_zone_label}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}

              {data.total_pages > 1 && (
                <Pagination
                  meta={{
                    page: data.page,
                    page_size: data.page_size,
                    total: data.activity_count,
                    total_pages: data.total_pages,
                  }}
                  onPageChange={setPage}
                  compact
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
