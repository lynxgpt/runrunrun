import { streakYears } from "@/lib/mock-data";
import { HeatmapYear } from "@/components/primitives/heatmap-year";

export function DailyLog() {
  return (
    <section className="mb-16">
      <h3 className="text-center font-sans text-lg font-bold uppercase tracking-wide text-neutral-100">
        DAILY LOG
      </h3>
      <p className="text-center text-xs italic text-neutral-500 font-mono-tamzen mb-8">
        every. single. day.
      </p>
      <div className="mx-auto max-w-5xl space-y-8">
        {streakYears.map((y) => (
          <HeatmapYear key={y.yearNumber} data={y} />
        ))}
      </div>
    </section>
  );
}
