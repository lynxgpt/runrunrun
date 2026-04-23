// Everything here is derived from the real GPX files under public/gpx/.
// No cloned template numbers, no placeholder history. Add more .gpx files
// and run `node scripts/process-gpx.mjs` — the page updates automatically.

export {
  streakStats,
  notableRuns,
  annualMileage,
  monthlyMileage,
  workoutByTime,
  avgByWeekday,
  runDistances,
  runDistanceFlow,
  treadmillVsOutdoor,
  paceDistribution,
  filteredPaceDistribution,
  heartRateZones,
  temperatureBuckets,
  temperatureRanges,
  weatherConditions,
  equipment,
  countriesVisited,
  usStatesVisited,
  nycBoroughsVisited,
  streakYears,
} from "./gpx-stats";
