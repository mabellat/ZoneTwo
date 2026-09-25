"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Heart, RefreshCw, SkipForward } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { MonthTrainingLog } from "@/components/dashboard/MonthTrainingLog";
import { ZoneDonut } from "@/components/dashboard/ZoneDonut";
import { PaginatedActivitiesSection } from "@/components/dashboard/PaginatedActivitiesSection";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { WeeklyBriefStrip } from "@/components/dashboard/WeeklyBriefStrip";
import { LoadGauge } from "@/components/dashboard/LoadGauge";
import { WeekCalendarStrip } from "@/components/plan/WeekCalendarStrip";
import { UserAvatar } from "@/components/UserAvatar";
import { IMAGES } from "@/lib/imagery";
import { Reveal, RevealHero, staggerContainer, staggerItem } from "@/components/motion/Reveal";
import { AnimatedValue } from "@/components/motion/AnimatedValue";
import { GlassCard } from "@/components/ui/GlassCard";
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LabelWithTooltip } from "@/components/ui/InfoTooltip";
import { TextLink } from "@/components/ui/TextLink";
import { metricTip } from "@/lib/metricGlossary";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night,";
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

export default function HomePage() {
  const { user, refresh } = useAuth();
  const [dash, setDash] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () =>
    apiFetch("/api/dashboard")
      .then(setDash)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const connectStrava = async () => {
    const data = await apiFetch<{ url: string }>("/api/strava/authorize");
    window.location.href = data.url;
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await apiFetch("/api/strava/sync", { method: "POST" });
      await refresh();
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const markSession = async (id: string, status: string) => {
    await apiFetch(`/api/sessions/${id}/status?status=${status}`, { method: "POST" });
    await load();
  };

  const firstName =
    dash?.athlete?.display_name?.split(" ")?.[0] ||
    user?.display_name?.split(" ")?.[0] ||
    user?.email?.split("@")[0]?.replace(/[._]/g, " ")?.split(" ")?.[0] ||
    "Athlete";

  if (loading) return <DashboardSkeleton />;

  const m = dash?.metrics;
  const session = dash?.today?.session;
  const goal = dash?.goal;
  const weekly: { label: string; km: number }[] = dash?.weekly_volume_chart ?? [];
  const weeklyKm = weekly.map((w) => w.km);
  const thisWeek = weeklyKm[weeklyKm.length - 1] ?? 0;
  const lastWeek = weeklyKm[weeklyKm.length - 2] ?? 0;
  const weekDelta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const explainers = m?.metric_explainers as Record<string, string> | undefined;
  const tip = (key: string) => metricTip(key, explainers);

  const syncedAt = dash?.athlete?.last_sync_at
    ? new Date(dash.athlete.last_sync_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="page-shell-scroll space-y-5 lg:space-y-6">
      {/* Hero */}
      <RevealHero>
        <div className="pt-6 sm:pt-12 pb-4 text-white [text-shadow:0_1px_18px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <UserAvatar
                  size="sm"
                  photoUrl={dash?.athlete?.profile_photo_url ?? user?.profile_photo_url}
                  label={dash?.athlete?.display_name || user?.email || firstName}
                  className="ring-2 ring-white/80 shadow-md"
                />
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/90">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {syncedAt && <span className="text-white/70"> · synced {syncedAt}</span>}
                </p>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl break-words">
                <span className="serif-accent block text-[0.62em] text-white mb-1">{greeting()}</span>
                <span className="headline text-white">{firstName}</span>
              </h1>
              <WeeklyBriefStrip brief={dash?.weekly_brief} />
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {dash?.athlete?.strava_connected ? (
                <button onClick={syncNow} disabled={syncing} className="btn-ghost-on-dark">
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing…" : "Sync Strava"}
                </button>
              ) : (
                <button onClick={connectStrava} className="btn-signal">
                  Connect Strava
                </button>
              )}
              <Link href="/coach" className="btn-signal">
                Ask coach <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </RevealHero>

      {/* Scoreboard */}
      <motion.section
        className="scoreboard relative overflow-hidden grid grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--signal)]" />
        <ScoreCell
          label="Last 28 days"
          tip={tip("volume28")}
          value={m?.total_run_km ?? 0}
          unit="km"
          foot={`${m?.activity_count ?? m?.run_count ?? 0} activities`}
        >
          <Sparkline values={weeklyKm} width={120} height={34} className="mt-3 w-full max-w-[140px]" />
        </ScoreCell>
        <ScoreCell
          className="border-l"
          label="This week"
          tip={tip("this_week")}
          value={thisWeek}
          unit="km"
          foot={
            weekDelta == null ? "vs last week —" : `${weekDelta >= 0 ? "+" : ""}${weekDelta}% vs last week`
          }
          footTone={weekDelta != null && weekDelta > 15 ? "warn" : undefined}
        />
        <ScoreCell
          className="border-t lg:border-t-0 lg:border-l"
          label="Weekly average"
          tip={tip("weekly_average")}
          value={m?.avg_weekly_run_km ?? 0}
          unit="km"
          foot="4-week mean"
        />
        <ScoreCell
          className="border-l border-t lg:border-t-0"
          label="Longest session"
          tip={tip("longest_run")}
          value={m?.longest_run_km ?? 0}
          unit="km"
          foot={`${m?.data_quality?.hr_coverage_pct ?? 0}% runs with HR`}
        />
      </motion.section>

      <Reveal delay={0.05}>
        <WeekCalendarStrip initialWeek={dash?.plan_week} compact linkToPlan />
      </Reveal>

      {/* Volume + load */}
      <div className="grid xl:grid-cols-12 gap-4 lg:gap-5">
        <Reveal className="xl:col-span-8" delay={0.05}>
          <GlassCard padding="lg" className="h-full">
            <SectionHeading
              kicker="Last 8 weeks"
              title="Weekly volume"
              tooltip={tip("weekly_volume")}
              action={<TextLink href="/training">Analytics →</TextLink>}
            />
            <VolumeChart data={weekly} />
          </GlassCard>
        </Reveal>
        <Reveal className="xl:col-span-4" delay={0.1}>
          <GlassCard padding="lg" className="h-full flex flex-col">
            <SectionHeading
              kicker="Load balance"
              title="Training load"
              tooltip="Compares this week's training stress to your usual four-week average."
            />
            <LoadGauge ratio={m?.acwr?.ratio} />
          </GlassCard>
        </Reveal>
      </div>

      {/* Today + race */}
      <div className="grid xl:grid-cols-12 gap-4 lg:gap-5">
        <Reveal className="xl:col-span-8" delay={0.05}>
          <GlassCard padding="lg" className="h-full">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <p className="eyebrow mb-2">Today&apos;s session</p>
                <h2 className="section-title text-3xl capitalize">
                  {session ? session.session_type.replace("_", " ") : "Rest day"}
                </h2>
              </div>
              {dash?.adherence_pct != null && (
                <div className="text-right">
                  <p className="eyebrow">
                    <LabelWithTooltip label="Plan adherence" tip={tip("adherence")} />
                  </p>
                  <p className="display-num text-4xl mt-1">
                    <AnimatedValue value={dash.adherence_pct} suffix="%" />
                  </p>
                </div>
              )}
            </div>
            {session ? (
              <>
                <div className="flex flex-wrap items-end gap-x-10 gap-y-5 mb-8">
                  <div>
                    <p className="display-num text-7xl sm:text-8xl">
                      {session.target_distance_km ?? 0}
                      <span className="serif-accent text-3xl text-[var(--text-muted)] ml-2">km</span>
                    </p>
                  </div>
                  <div className="space-y-3 pb-2">
                    {session.target_hr_min && (
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[var(--pine)]/10 flex items-center justify-center">
                          <Heart className="w-4 h-4 text-[var(--pine)]" />
                        </span>
                        <span className="mono-stat text-lg font-medium">
                          {session.target_hr_min}–{session.target_hr_max}
                          <span className="text-xs text-[var(--text-muted)] ml-1">bpm</span>
                        </span>
                      </div>
                    )}
                    <p className="eyebrow">
                      Status · <span className="text-[var(--text-primary)]">{session.status}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => markSession(session.id, "DONE")} className="btn-primary">
                    <Check className="w-4 h-4" /> Complete
                  </button>
                  <button onClick={() => markSession(session.id, "SKIPPED")} className="btn-ghost">
                    <SkipForward className="w-4 h-4" /> Skip
                  </button>
                  <Link href="/plan" className="btn-ghost sm:ml-auto">
                    View plan
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-[var(--text-secondary)] leading-relaxed max-w-lg">
                Nothing scheduled. Recovery is training too — or set up a race build in{" "}
                <TextLink href="/plan">Plan</TextLink>.
              </p>
            )}
          </GlassCard>
        </Reveal>

        <Reveal className="xl:col-span-4" delay={0.12}>
          <div className="grain relative overflow-hidden rounded-[var(--radius-card)] p-6 sm:p-7 h-full min-h-[300px] flex flex-col justify-end text-white shadow-[var(--shadow-card)]">
            <motion.img
              src={IMAGES.raceCountdown}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              decoding="async"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
            {goal ? (
              <div className="relative z-10">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/70 mb-3">
                  Race countdown
                </p>
                <p className="display-num text-[96px] leading-[0.85] text-white">
                  <AnimatedValue value={goal.days_to_race} />
                </p>
                <p className="serif-accent text-2xl text-white/85 mt-1">days to go</p>
                <div className="mt-5 pt-4 border-t border-white/20 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize">{goal.event_type?.replace("_", " ")}</p>
                    <p className="font-mono text-xs text-white/60 mt-1">
                      {new Date(goal.race_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {dash?.plan?.phase && (
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-md bg-[var(--signal)]">
                      {dash.plan.phase.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative z-10">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/70 mb-3">
                  No race on file
                </p>
                <p className="headline text-4xl mb-2">Pick a start line.</p>
                <p className="text-sm text-white/70 mb-5 leading-relaxed">
                  A goal unlocks the countdown and a periodized build.
                </p>
                <Link href="/coach" className="btn-signal inline-flex">
                  Plan a race <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Zones + activities */}
      <div className="grid xl:grid-cols-12 gap-4 lg:gap-5 items-start">
        <Reveal className="xl:col-span-4" delay={0.05}>
          <GlassCard padding="lg">
            <SectionHeading
              kicker="Last 28 days"
              title="Training intensity"
              tooltip="Share of workout time in each heart-rate band, from your max and resting HR."
            />
            <ZoneDonut zones={m?.zone_distribution_pct ?? {}} showSessionLog={false} />
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span>
                Zones use max <strong className="text-[var(--text-secondary)]">{dash?.athlete?.max_heart_rate}</strong>{" "}
                and rest <strong className="text-[var(--text-secondary)]">{dash?.athlete?.resting_heart_rate}</strong> bpm
              </span>
              <TextLink href="/settings">Update HR profile</TextLink>
            </div>
          </GlassCard>
        </Reveal>
        <Reveal className="xl:col-span-8" delay={0.1}>
          <GlassCard padding="lg">
            <SectionHeading
              kicker="From Strava"
              title="Recent activities"
              action={<TextLink href="/training">See all →</TextLink>}
            />
            <PaginatedActivitiesSection pageSize={8} />
          </GlassCard>
        </Reveal>
      </div>

      <Reveal delay={0.08}>
        <GlassCard padding="lg">
          <MonthTrainingLog days={28} />
        </GlassCard>
      </Reveal>

      {dash?.nudges?.length > 0 && (
        <Reveal delay={0.1} className="grid md:grid-cols-2 gap-3">
          {dash.nudges.map((n: { message: string }, i: number) => (
            <div
              key={i}
              className="surface p-4 flex gap-3 items-start text-sm text-[var(--text-primary)] leading-relaxed"
            >
              <span className="font-mono text-[10.5px] text-[var(--signal)] pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              {n.message}
            </div>
          ))}
        </Reveal>
      )}
    </div>
  );
}

function ScoreCell({
  label,
  tip,
  value,
  unit,
  foot,
  footTone,
  className = "",
  children,
}: {
  className?: string;
  label: string;
  tip?: string;
  value: number;
  unit?: string;
  foot: string;
  footTone?: "warn";
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className={`p-5 sm:p-6 border-white/10 ${className}`}
    >
      <p className="font-mono text-[10px] sm:text-[10.5px] uppercase tracking-[0.16em] text-white/55">
        <LabelWithTooltip label={label} tip={tip ?? ""} variant="onDark" />
      </p>
      <p className="display-num text-[44px] sm:text-[56px] mt-3 text-white">
        <AnimatedValue value={value} decimals={value % 1 !== 0 ? 1 : 0} />
        {unit && <span className="serif-accent text-xl sm:text-2xl text-white/55 ml-1.5">{unit}</span>}
      </p>
      <p
        className={`font-mono text-[11px] mt-2 ${
          footTone === "warn" ? "text-[var(--signal)]" : "text-white/55"
        }`}
      >
        {foot}
      </p>
      {children}
    </motion.div>
  );
}
