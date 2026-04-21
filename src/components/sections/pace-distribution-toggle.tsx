"use client";

import { useState } from "react";

import { DensityChart } from "@/components/charts/density-chart";
import { formatPace } from "@/lib/format";
import type { PaceDistributionResult } from "@/lib/pace-distribution";

interface PaceDistributionToggleProps {
  original: PaceDistributionResult;
  filtered: PaceDistributionResult;
}

export function PaceDistributionToggle({
  original,
  filtered,
}: PaceDistributionToggleProps) {
  const [mode, setMode] = useState<"original" | "filtered">("original");
  const active = mode === "filtered" ? filtered : original;

  return (
    <div className="w-full">
      <div className="mb-3 flex justify-center gap-2 font-mono-tamzen text-xs uppercase tracking-wide">
        <button
          type="button"
          onClick={() => setMode("original")}
          className={
            mode === "original"
              ? "border border-neutral-200 px-3 py-1 text-neutral-100"
              : "border border-neutral-700 px-3 py-1 text-neutral-500"
          }
        >
          Original
        </button>
        <button
          type="button"
          onClick={() => setMode("filtered")}
          className={
            mode === "filtered"
              ? "border border-neutral-200 px-3 py-1 text-neutral-100"
              : "border border-neutral-700 px-3 py-1 text-neutral-500"
          }
        >
          Filtered
        </button>
      </div>
      <DensityChart
        bins={active.bins}
        axisLabels={active.axisLabels}
        meanBin={active.meanBin ?? undefined}
        medianBin={active.medianBin ?? undefined}
        meanLabel={`mean: ${formatPace(active.meanSec)}`}
        medianLabel={`median: ${formatPace(active.medianSec)}`}
      />
    </div>
  );
}
