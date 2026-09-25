"use client";

import { MonthTrainingLog } from "@/components/dashboard/MonthTrainingLog";
import { cn } from "@/lib/utils";

const ZONE_ORDER = ["z1", "z2", "z3", "z4", "z5"] as const;

const ZONE_META: Record<
  string,
  { short: string; plain: string; color: string }
> = {
  z1: { short: "Z1", plain: "Very easy", color: "#c9c2b4" },
  z2: { short: "Z2", plain: "Easy aerobic", color: "#1f6f5c" },
  z3: { short: "Z3", plain: "Moderate", color: "#e0a526" },
  z4: { short: "Z4", plain: "Threshold", color: "#ff5a1f" },
  z5: { short: "Z5", plain: "Max effort", color: "#e84d15" },
};

function zoneInsight(zones: Record<string, number>) {
  const easy = (zones.z1 ?? 0) + (zones.z2 ?? 0);
  const moderate = zones.z3 ?? 0;
  const hard = (zones.z4 ?? 0) + (zones.z5 ?? 0);

  if (hard >= 50) {
    return {
      title: "Mostly hard efforts",
      body: `${Math.round(hard)}% of your time was at threshold or higher. Add easy days if you feel flat.`,
      tone: "warn" as const,
    };
  }
  if (easy >= 50) {
    return {
      title: "Mostly easy aerobic work",
      body: `${Math.round(easy)}% in easy zones — solid for building your endurance base.`,
      tone: "good" as const,
    };
  }
  if (moderate >= 40) {
    return {
      title: "Mixed intensity",
      body: `A blend of moderate and harder work (${Math.round(moderate)}% moderate).`,
      tone: "neutral" as const,
    };
  }
  return {
    title: "Varied intensity",
    body: "Time is spread across several zones. Check the breakdown below.",
    tone: "neutral" as const,
  };
}

export function ZoneDonut({
  zones,
  showSessionLog = true,
  logDays = 28,
}: {
  zones: Record<string, number>;
  showSessionLog?: boolean;
  logDays?: number;
}) {
  const segments = ZONE_ORDER
    .map((key) => ({
      key,
      value: zones?.[key] ?? 0,
      ...ZONE_META[key],
    }))
    .filter((s) => s.value > 0);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (!total || !segments.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)] py-4 text-center leading-relaxed">
          No heart-rate data on recent workouts yet.
          <br />
          <span className="text-xs">Wear a monitor or connect a watch on Strava.</span>
        </p>
        {showSessionLog && <MonthTrainingLog days={logDays} />}
      </div>
    );
  }

  const insight = zoneInsight(zones);
  const top = [...segments].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-xl px-4 py-3 border",
          insight.tone === "warn" && "bg-[#fff4ee] border-[#ff5a1f]/25",
          insight.tone === "good" && "bg-[#eef6f3] border-[#1f6f5c]/25",
          insight.tone === "neutral" && "bg-[var(--bg-muted)] border-[var(--border)]"
        )}
      >
        <p className="font-medium text-[var(--text-primary)] text-sm">{insight.title}</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{insight.body}</p>
      </div>

      <div>
        <div className="flex h-3 rounded-full overflow-hidden gap-px bg-[var(--bg-muted)]">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className="h-full min-w-[4px] transition-all duration-500"
              style={{ width: `${seg.value}%`, background: seg.color }}
              title={`${seg.plain} ${seg.value}%`}
            />
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Heart rate on workouts in the last{" "}
          <strong className="text-[var(--text-secondary)]">28 days</strong>
          {top ? ` · mostly ${top.plain.toLowerCase()}` : ""}.
        </p>
      </div>

      <ul className="space-y-2">
        {segments.map((seg) => (
          <li key={seg.key} className="flex items-center gap-3 text-sm">
            <span className="w-2 h-8 rounded-sm shrink-0" style={{ background: seg.color }} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--text-primary)]">{seg.plain}</p>
              <p className="text-xs text-[var(--text-muted)]">{seg.short} · intensity band</p>
            </div>
            <span className="display-num text-xl tabular-nums shrink-0">{seg.value}%</span>
          </li>
        ))}
      </ul>

      {showSessionLog && <MonthTrainingLog days={logDays} />}
    </div>
  );
}
