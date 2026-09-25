"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const SCALE_MAX = 2;

type Band = {
  from: number;
  to: number;
  color: string;
  label: string;
  range: string;
  detail: string;
};

const BANDS: Band[] = [
  {
    from: 0,
    to: 0.8,
    color: "#d9d3c7",
    label: "Below usual",
    range: "0 – 0.8",
    detail: "Less than your recent average — fine for recovery, but overall volume has dipped.",
  },
  {
    from: 0.8,
    to: 1.3,
    color: "#1f6f5c",
    label: "Steady build",
    range: "0.8 – 1.3",
    detail: "A healthy progression — this week is in line with how you've been training.",
  },
  {
    from: 1.3,
    to: 1.5,
    color: "#e0a526",
    label: "Ramping fast",
    range: "1.3 – 1.5",
    detail: "You're adding load quicker than usual. Keep easy days truly easy.",
  },
  {
    from: 1.5,
    to: SCALE_MAX,
    color: "#ff5a1f",
    label: "High spike",
    range: "1.5+",
    detail: "A sharp jump in stress. Consider easing this week to lower injury risk.",
  },
];

export function bandFor(ratio: number) {
  return BANDS.find((b) => ratio <= b.to) ?? BANDS[BANDS.length - 1];
}

function bandLabelAtPointer(clientX: number, bar: HTMLElement): string {
  const rect = bar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return bandFor(pct * SCALE_MAX).label;
}

export function LoadGauge({ ratio }: { ratio: number | null | undefined }) {
  const reduce = useReducedMotion();
  const barRef = useRef<HTMLDivElement>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [markerReady, setMarkerReady] = useState(reduce);

  const bandsWithWidth = useMemo(
    () =>
      BANDS.map((b) => ({
        ...b,
        leftPct: (b.from / SCALE_MAX) * 100,
        widthPct: ((b.to - b.from) / SCALE_MAX) * 100,
      })),
    []
  );

  useEffect(() => {
    if (reduce) return;
    const id = requestAnimationFrame(() => setMarkerReady(true));
    return () => cancelAnimationFrame(id);
  }, [reduce]);

  const setHoverFromEvent = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const next = bandLabelAtPointer(clientX, bar);
    setHoveredLabel((prev) => (prev === next ? prev : next));
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setHoverFromEvent(e.clientX);
    },
    [setHoverFromEvent]
  );

  const onPointerLeave = useCallback(() => {
    setHoveredLabel(null);
  }, []);

  if (ratio == null) {
    return (
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
        Need a few more weeks of training before we can compare this week to your usual load.
      </p>
    );
  }

  const pos = Math.min(ratio / SCALE_MAX, 1) * 100;
  const current = bandFor(ratio);
  const focus = BANDS.find((b) => b.label === hoveredLabel) ?? current;
  const isPreview = hoveredLabel != null && hoveredLabel !== current.label;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="display-num text-6xl leading-none">{ratio.toFixed(2)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">This week ÷ 4-week average</p>
        </div>
        <span
          className="font-mono text-[11px] uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg text-white mb-1"
          style={{ background: current.color }}
        >
          {current.label}
        </span>
      </div>

      <div className="rounded-xl bg-[var(--bg-muted)] px-4 py-3 min-h-[5.25rem]">
        <p className="text-sm leading-relaxed">
          <span className="font-medium text-[var(--text-primary)]">{focus.label}</span>
          <span className="font-mono text-xs text-[var(--text-muted)] ml-2">{focus.range}</span>
          {isPreview && (
            <span className="ml-2 text-[10px] font-mono uppercase tracking-wide text-[var(--signal)]">
              preview
            </span>
          )}
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{focus.detail}</p>
      </div>

      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2">
          Hover a zone to compare
        </p>

        <div
          ref={barRef}
          className="relative h-5 rounded-full overflow-hidden shadow-inner touch-none select-none cursor-crosshair"
          onPointerEnter={(e) => setHoverFromEvent(e.clientX)}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          role="img"
          aria-label="Training load zones. Hover to explore each range."
        >
          {bandsWithWidth.map((b) => (
            <div
              key={b.label}
              className="absolute top-0 bottom-0"
              style={{
                left: `${b.leftPct}%`,
                width: `${b.widthPct}%`,
                background: b.color,
              }}
              aria-hidden
            />
          ))}

          {bandsWithWidth.map((b) =>
            b.label === current.label ? (
              <div
                key="current-ring"
                className="pointer-events-none absolute top-0 bottom-0 ring-2 ring-[var(--ink)] ring-inset"
                style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
              />
            ) : null
          )}

          {hoveredLabel &&
            bandsWithWidth.map((b) =>
              b.label === hoveredLabel ? (
                <div
                  key="hover-ring"
                  className="pointer-events-none absolute top-0 bottom-0 ring-2 ring-white/90 ring-inset"
                  style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
                />
              ) : null
            )}
        </div>

        <div className="relative h-8 mt-1 pointer-events-none">
          <div
            className="absolute top-0 flex flex-col items-center -translate-x-1/2"
            style={{
              left: markerReady ? `${pos}%` : "0%",
              transition: reduce ? undefined : "left 1s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <span className="w-3 h-3 rounded-full bg-[var(--ink)] shadow-md" />
            <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--ink)]">
              You
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-[var(--text-muted)] mt-1 pointer-events-none">
          {BANDS.map((b) => (
            <span
              key={b.label}
              className={cn(
                "text-center leading-tight",
                b.label === current.label && !hoveredLabel && "text-[var(--text-primary)] font-medium",
                hoveredLabel === b.label && "text-[var(--signal)] font-medium"
              )}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
