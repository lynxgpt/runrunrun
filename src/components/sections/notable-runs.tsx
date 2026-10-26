import { notableRuns, streakStats } from "@/lib/mock-data";
import { NotableRunsView } from "@/components/sections/notable-runs-view";

// Server half: runs at build time, so only the finished rows are serialized
// into the page — not gpx-processed.ts or the geo atlases behind them.
export function NotableRuns() {
  return <NotableRunsView notableRuns={notableRuns} streakStartDate={streakStats.startDate} />;
}
