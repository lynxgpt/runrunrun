import { streakStats } from "@/lib/mock-data";
import { StatCell } from "@/components/primitives/stat-cell";
import { formatNumber, formatThousands } from "@/lib/format";

export function StreakHero() {
  return (
    <div className="mb-16 flex flex-col items-center gap-6">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <StatCell inline value={streakStats.years} label="years" />
        <StatCell inline value={streakStats.months} label="months" />
        <StatCell inline value={streakStats.days} label="days" />
      </div>
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
        <StatCell size="lg" value={formatNumber(streakStats.totalDays)} label="runs" />
        <StatCell size="lg" value={formatNumber(streakStats.totalKm)} label="km" />
        <StatCell size="lg" value={formatNumber(streakStats.totalHours)} label="hours" />
        <StatCell
          size="lg"
          value={String(Math.round(streakStats.totalElevationM / 1000))}
          label="km climbed"
        />
      </div>
    </div>
  );
}
