import { ChartCard } from "@/components/primitives/chart-card";
import { BarChart } from "@/components/charts/bar-chart";
import { PolarClock } from "@/components/charts/polar-clock";
import { RadarChart } from "@/components/charts/radar-chart";
import { DensityChart } from "@/components/charts/density-chart";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import {
  annualMileage,
  avgByWeekday,
  heartRateZones,
  paceDistribution,
  runDistances,
  workoutByTime,
} from "@/lib/mock-data";
import { formatPace } from "@/lib/format";

export function Statistics() {
  return (
    <section className="mb-16">
      <h2 className="text-center font-sans text-xl font-medium uppercase tracking-wide text-neutral-100 mb-8">
        STATISTICS
      </h2>

      <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-4 mb-16">
        <ChartCard title="ANNUAL DISTANCE">
          <BarChart
            data={annualMileage.map((a) => ({ label: String(a.year), value: a.km }))}
            xAxisLabel="year"
            yAxisLabel="km"
          />
        </ChartCard>

        <ChartCard title="WORKOUT ACTIVITY BY TIME">
          <PolarClock data={workoutByTime} />
        </ChartCard>

        <ChartCard title="AVERAGE DAILY DISTANCE BY DAY">
          <RadarChart
            data={avgByWeekday}
            labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          />
        </ChartCard>

        <ChartCard title="RUN DISTANCES">
          {/* No hardcoded yTicks — auto-normalises to the largest bucket */}
          <BarChart
            data={runDistances.map((b) => ({ label: b.label, value: b.count }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-2 mb-16">
        <ChartCard title="PACE DISTRIBUTION">
          <DensityChart
            bins={paceDistribution.bins}
            axisLabels={paceDistribution.axisLabels}
            meanBin={Math.round(paceDistribution.bins.length * 0.55)}
            medianBin={Math.round(paceDistribution.bins.length * 0.5)}
            meanLabel={`mean: ${formatPace(paceDistribution.meanSec)}`}
            medianLabel={`median: ${formatPace(paceDistribution.medianSec)}`}
          />
        </ChartCard>

        <ChartCard title="HEART RATE ZONES">
          <HorizontalBars data={heartRateZones.map((z) => ({ label: z.label, sub: z.bpm, value: z.count }))} />
        </ChartCard>

        {/* EQUIPMENT: hidden — no shoe data in GPX files. */}
        {/* TEMPERATURE + WEATHER CONDITIONS: hidden — GPX has no ambient
            temp or sky cover. Would need a weather-API join at pull time. */}
      </div>
    </section>
  );
}
