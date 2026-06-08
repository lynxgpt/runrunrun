import { streakStats } from "@/lib/mock-data";
import { siteContent } from "@/lib/content";

export function Header() {
  const start = new Date(streakStats.startDate + "T00:00:00Z");
  const year = start.getUTCFullYear();
  const month = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = String(start.getUTCDate()).padStart(2, "0");
  return (
    <div className="text-center mb-8">
      <h1 className="font-sans text-5xl md:text-6xl font-bold tracking-tight text-neutral-100">
        {siteContent.header.name}
      </h1>
      <p className="mt-2 text-sm font-mono-tamzen text-neutral-400 uppercase">
        EST {year} {month} {day}
      </p>
    </div>
  );
}
