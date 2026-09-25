"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { label: string; km: number };

export function VolumeChart({ data }: { data: Point[] }) {
  if (!data?.length) {
    return (
      <p className="text-sm text-[var(--text-muted)] py-12 text-center">
        No training volume yet — connect Strava and sync.
      </p>
    );
  }

  const maxKm = Math.max(...data.map((d) => d.km), 1);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff7a45" />
            <stop offset="100%" stopColor="#ff5a1f" />
          </linearGradient>
          <linearGradient id="volGradAlt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a4249" />
            <stop offset="100%" stopColor="#15191c" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10.5, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10.5, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          unit=" km"
        />
        <Tooltip
          cursor={{ fill: "var(--accent-muted)" }}
          contentStyle={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            fontSize: 12,
            background: "#fff",
          }}
          formatter={(value) => [`${value ?? 0} km`, "Volume"]}
        />
        <Bar dataKey="km" radius={[10, 10, 4, 4]} maxBarSize={48} animationDuration={900}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.km === maxKm && entry.km > 0
                  ? "url(#volGrad)"
                  : entry.km > 0
                    ? "url(#volGradAlt)"
                    : "var(--chart-bar-dim)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
