"use client";

type Brief = {
  snapshot_7d?: {
    total_run_km?: number;
    run_count?: number;
    longest_run_km?: number;
  };
  adherence_pct?: number | null;
  days_to_race?: number | null;
  risk?: { flags?: string[] };
};

const chipClass =
  "rounded-xl bg-[var(--ink)]/88 border border-white/12 px-3.5 py-2.5 min-w-[7.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.25)]";

export function WeeklyBriefStrip({ brief }: { brief?: Brief | null }) {
  const snap = brief?.snapshot_7d;
  if (!snap) {
    return (
      <p className="text-sm text-white/90 mt-5 max-w-md leading-relaxed drop-shadow-sm">
        Sync Strava to see your week at a glance.
      </p>
    );
  }

  const activities = snap.run_count ?? 0;
  const items: { label: string; value: string; sub?: string }[] = [
    {
      label: "Past 7 days",
      value: `${snap.total_run_km ?? 0} km`,
      sub: activities === 1 ? "1 activity" : `${activities} activities`,
    },
    {
      label: "Longest session",
      value: `${snap.longest_run_km ?? 0} km`,
      sub: "in that window",
    },
  ];

  if (brief.adherence_pct != null) {
    items.push({
      label: "Plan this week",
      value: `${brief.adherence_pct}%`,
      sub: "sessions on track",
    });
  }

  if (brief.days_to_race != null && brief.days_to_race >= 0) {
    items.push({
      label: "Race day",
      value: `${brief.days_to_race}d`,
      sub: "countdown",
    });
  }

  const loadFlag = brief.risk?.flags?.includes("acwr_elevated");

  return (
    <div className="mt-5 space-y-3 max-w-xl">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div key={item.label} className={chipClass}>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/75">{item.label}</p>
            <p className="display-num text-2xl text-white mt-0.5">{item.value}</p>
            {item.sub && <p className="text-xs text-white/80 mt-0.5">{item.sub}</p>}
          </div>
        ))}
      </div>
      {loadFlag && (
        <p className="text-sm text-white rounded-lg bg-[var(--signal)] px-3 py-2 shadow-md">
          Training load is elevated — favor easy days until the ratio comes down.
        </p>
      )}
    </div>
  );
}
