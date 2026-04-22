import { ChartCard } from "@/components/primitives/chart-card";
import { BarChart } from "@/components/charts/bar-chart";
import { MonthlyDistanceChart } from "@/components/charts/monthly-distance-chart";
import { PolarClock } from "@/components/charts/polar-clock";
import { RadarChart } from "@/components/charts/radar-chart";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { PaceDistributionToggle } from "@/components/sections/pace-distribution-toggle";
import {
  avgByWeekday,
  filteredPaceDistribution,
  heartRateZones,
  monthlyMileage,
  paceDistribution,
  runDistances,
  workoutByTime,
} from "@/lib/mock-data";

export function Statistics() {
  return (
    <section className="mb-16">
      <h2 className="text-center font-sans text-xl font-medium uppercase tracking-wide text-neutral-100 mb-8">
        STATISTICS
      </h2>

      <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-4 mb-16">
        <ChartCard title="MONTHLY DISTANCE">
          <MonthlyDistanceChart data={monthlyMileage} />
        </ChartCard>

        <ChartCard title="WHAT TIME">
          <PolarClock data={workoutByTime} />
        </ChartCard>

        <ChartCard title="DAILY DISTANCE">
          <RadarChart
            data={avgByWeekday}
            labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          />
        </ChartCard>

        <ChartCard title="RUN DISTANCES">
          {/* No hardcoded yTicks — auto-normalises to the largest bucket */}
          <BarChart
            data={runDistances.map((b, i) => ({
              label: b.label,
              value: b.count,
              opacity: 0.8 + (i / Math.max(runDistances.length - 1, 1)) * 0.2,
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-2 mb-16">
        <ChartCard title="PACE DISTRIBUTION">
          <PaceDistributionToggle
            original={paceDistribution}
            filtered={filteredPaceDistribution}
          />
        </ChartCard>

        <ChartCard title="HEART RATE ZONES">
          <HorizontalBars data={heartRateZones.map((z) => ({ label: z.label, sub: z.bpm, value: z.pct ?? 0 }))} unit="%" />
        </ChartCard>

        {/* EQUIPMENT: hidden — no shoe data in GPX files. */}
        {/* TEMPERATURE + WEATHER CONDITIONS: hidden — GPX has no ambient
            temp or sky cover. Would need a weather-API join at pull time. */}
      </div>
    </section>
  );
}
