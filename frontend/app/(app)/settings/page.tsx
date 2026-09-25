"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { UserAvatar } from "@/components/UserAvatar";
import { LabelWithTooltip } from "@/components/ui/InfoTooltip";
import { metricTip } from "@/lib/metricGlossary";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [maxHr, setMaxHr] = useState("");
  const [restHr, setRestHr] = useState("");
  const [lthr, setLthr] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setMaxHr(String(user.max_heart_rate ?? ""));
    setRestHr(String(user.resting_heart_rate ?? ""));
    setLthr(user.lthr != null ? String(user.lthr) : "");
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const body: Record<string, number> = {
        max_heart_rate: parseInt(maxHr, 10),
        resting_heart_rate: parseInt(restHr, 10),
      };
      if (lthr.trim()) {
        body.lthr = parseInt(lthr, 10);
      }
      await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await refresh();
      setMessage("Profile saved. Zone targets on your plan use these values.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const syncProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/strava/sync", { method: "POST" });
      await refresh();
      setMessage("Synced with Strava — photo and activities updated.");
    } catch {
      setError("Strava sync failed. Check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const reserve =
    user && maxHr && restHr
      ? Math.max(0, parseInt(maxHr, 10) - parseInt(restHr, 10))
      : null;

  return (
    <div className="page-shell-scroll page-narrow">
      <PageHeader title="Settings" subtitle="Heart rate zones and your Strava profile" />

      <div className="surface p-6 mb-6 flex items-center gap-4">
        <UserAvatar
          size="lg"
          photoUrl={user?.profile_photo_url}
          label={user?.display_name || user?.email || "?"}
        />
        <div className="min-w-0">
          <p className="font-semibold text-lg truncate">
            {user?.display_name || user?.email?.split("@")[0]}
          </p>
          <p className="text-sm text-[var(--text-muted)] truncate">{user?.email}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {user?.strava_connected ? "Strava connected" : "Connect Strava from the dashboard"}
          </p>
          {user?.strava_connected && (
            <button
              type="button"
              onClick={syncProfile}
              disabled={saving}
              className="text-xs font-medium text-[var(--accent)] mt-2 hover:underline"
            >
              Refresh photo from Strava
            </button>
          )}
        </div>
      </div>

      <form onSubmit={save} className="surface p-6 space-y-5">
        <p className="text-sm text-[var(--text-secondary)]">
          We use heart rate reserve (max − resting) for Zone 2 targets on planned sessions and
          analytics. Update these if your lab or field test numbers differ from defaults.
        </p>

        <label className="block">
          <span className="kpi-label">
            <LabelWithTooltip label="Max heart rate (bpm)" tip={metricTip("max_hr")} />
          </span>
          <input
            type="number"
            min={100}
            max={230}
            required
            value={maxHr}
            onChange={(e) => setMaxHr(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="kpi-label">
            <LabelWithTooltip label="Resting heart rate (bpm)" tip={metricTip("resting_hr")} />
          </span>
          <input
            type="number"
            min={30}
            max={120}
            required
            value={restHr}
            onChange={(e) => setRestHr(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="kpi-label">
            <LabelWithTooltip label="Lactate threshold HR (optional)" tip={metricTip("lthr")} />
          </span>
          <input
            type="number"
            min={120}
            max={220}
            value={lthr}
            onChange={(e) => setLthr(e.target.value)}
            placeholder="e.g. 168"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
          />
        </label>

        {reserve != null && !Number.isNaN(reserve) && (
          <p className="text-xs text-[var(--text-muted)] rounded-lg bg-[var(--bg-muted)] px-3 py-2">
            <LabelWithTooltip label="Heart rate reserve" tip={metricTip("hr_reserve")} />:{" "}
            <strong>{reserve} bpm</strong>. Typical Zone 2 band:{" "}
            <strong>
              {Math.round(parseInt(restHr, 10) + reserve * 0.65)}–
              {Math.round(parseInt(restHr, 10) + reserve * 0.75)} bpm
            </strong>
            .
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-[var(--success)]">{message}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          {saving ? "Saving…" : "Save heart rate profile"}
        </button>
      </form>
    </div>
  );
}
