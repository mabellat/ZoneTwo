"use client";

import NumberFlow from "@number-flow/react";

export function AnimatedValue({
  value,
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  return (
    <span className={className}>
      <NumberFlow
        value={value}
        format={{ maximumFractionDigits: decimals, minimumFractionDigits: decimals }}
        suffix={suffix}
        transformTiming={{ duration: 800, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </span>
  );
}
