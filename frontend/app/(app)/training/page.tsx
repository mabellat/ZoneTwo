"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { MonthTrainingLog } from "@/components/dashboard/MonthTrainingLog";
import { ZoneDonut } from "@/components/dashboard/ZoneDonut";
import { sportStyle } from "@/components/dashboard/ActivityFeed";
import { PaginatedActivitiesSection } from "@/components/dashboard/PaginatedActivitiesSection";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { LoadGauge } from "@/components/dashboard/LoadGauge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LabelWithTooltip } from "@/components/ui/InfoTooltip";
import { TextLink } from "@/components/ui/TextLink";
import { metricTip } from "@/lib/metricGlossary";
import { AnimatedValue } from "@/components/motion/AnimatedValue";
import { Reveal } from "@/components/motion/Reveal";

export default function TrainingPage() {
  const [dash, setDash] = useState<any>(null);

  useEffect(() => {
    apiFetch<Record<string, unknown>>("/api/dashboard")
      .then(setDash)
      .catch(console.error);
  }, []);

  if (!dash) {
    return (
      <div className="page-shell-scroll">
        <PageHeader kicker="Last 28 days" title="Analytics" subtitle="loading your numbers…" />
      </div>
    );
  }

  const m = dash.metrics;
  const explainers = (m?.metric_explainers || {}) as Record<string, string>;
  const tip = (key: string) => metricTip(key, explainers);
  const weekly: { label: string; km: number }[] = dash.weekly_volume_chart ?? [];
  const sports = Object.entries((m.sport_breakdown_km ?? {}) as Record<string, number>).sort(
    (a, b) => b[1] - a[1]
  );
  const sportTotal = sports.reduce((s, [, km]) => s + km, 0) || 1;

  return (
    <div className="page-shell-scroll space-y-5 lg:space-y-6">
      <PageHeader kicker="Last 28 days" title="Analytics" subtitle="load, zones and every session" />

      <section className="scoreboard relative overflow-hidden grid grid-cols-2 lg:grid-cols-4">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--signal)]" />
        {[
          {
            label: "Total volume",
            tipKey: "volume28",
            value: m.total_run_km,
            foot: `${m.activity_count ?? m.run_count} activities`,
            spark: true,
            cls: "",
          },
          {
            label: "Weekly average",
            tipKey: "weekly_average",
            value: m.avg_weekly_run_km,
            foot: "4-week mean",
            cls: "border-l",
          },
          {
            label: "Longest session",
            tipKey: "longest_run",
            value: m.longest_run_km,
            foot: "single session",
            cls: "border-t lg:border-t-0 lg:border-l",
          },
          {
            label: "HR coverage",
            tipKey: "hr_coverage",
            value: m.data_quality?.hr_coverage_pct ?? 0,
            unit: "%",
            foot: "runs with heart rate",
            cls: "border-l border-t lg:border-t-0",
          },
        ].map((k) => (
          <div key={k.label} className={`p-5 sm:p-6 border-white/10 ${k.cls}`}>
            <p className="font-mono text-[10px] sm:text-[10.5px] uppercase tracking-[0.16em] text-white/55">
              <LabelWithTooltip label={k.label} tip={tip(k.tipKey)} variant="onDark" />
            </p>
            <p className="display-num text-[44px] sm:text-[56px] mt-3">
              <AnimatedValue value={k.value ?? 0} decimals={(k.value ?? 0) % 1 !== 0 ? 1 : 0} />
              <span className="serif-accent text-xl sm:text-2xl text-white/55 ml-1.5">{k.unit ?? "km"}</span>
            </p>
            <p className="font-mono text-[11px] mt-2 text-white/55">{k.foot}</p>
            {k.spark && (
              <Sparkline values={weekly.map((w) => w.km)} width={120} height={34} className="mt-3 w-full max-w-[140px]" />
            )}
          </div>
        ))}
      </section>

      <div className="grid xl:grid-cols-12 gap-4 lg:gap-5">
        <Reveal className="xl:col-span-8">
          <section className="surface p-5 sm:p-6 h-full">
            <SectionHeading
              kicker="Last 8 weeks"
              title="Weekly volume"
              tooltip={tip("weekly_volume")}
            />
            <VolumeChart data={weekly} />
          </section>
        </Reveal>
        <Reveal className="xl:col-span-4" delay={0.05}>
          <section className="surface p-5 sm:p-6 h-full">
            <SectionHeading
              kicker="Load balance"
              title="Training load"
              tooltip="Compares this week's training stress to your usual four-week average."
            />
            <LoadGauge ratio={m.acwr?.ratio} />
            <TextLink href="/coach?context=acwr" className="mt-4 inline-block">
              Ask coach about load →
            </TextLink>
          </section>
        </Reveal>
      </div>

      <div className="grid xl:grid-cols-12 gap-4 lg:gap-5 items-start">
        <Reveal className="xl:col-span-5">
          <section className="surface p-5 sm:p-6">
            <SectionHeading
              kicker="Last 28 days"
              title="Training intensity"
              tooltip="Share of workout time in each heart-rate band, from your max and resting HR."
            />
            <ZoneDonut zones={m.zone_distribution_pct} showSessionLog={false} />
          </section>
        </Reveal>
        <Reveal className="xl:col-span-7" delay={0.05}>
          <section className="surface p-5 sm:p-6">
            <SectionHeading kicker="Distance share" title="By sport" tooltip={tip("by_sport")} />
            {sports.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No activities in this window.</p>
            ) : (
              <ul className="space-y-4">
                {sports.map(([sport, km]) => {
                  const s = sportStyle(sport);
                  const Icon = s.icon;
                  const pct = Math.round((km / sportTotal) * 100);
                  return (
                    <li key={sport} className="flex items-center gap-4">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                        <Icon className={`w-[18px] h-[18px] ${s.fg}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                          <span className="font-medium truncate">{sport.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>
                          <span className="mono-stat text-sm">
                            {km} <span className="text-[var(--text-muted)] text-xs">km · {pct}%</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </Reveal>
      </div>

      <Reveal>
        <section className="surface p-5 sm:p-6">
          <MonthTrainingLog days={28} />
        </section>
      </Reveal>

      <Reveal>
        <section className="surface p-5 sm:p-6">
          <SectionHeading kicker="From Strava" title="All activities" />
          <PaginatedActivitiesSection pageSize={15} />
        </section>
      </Reveal>
    </div>
  );
}
