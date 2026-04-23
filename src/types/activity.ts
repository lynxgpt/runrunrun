// Domain types. METRIC UNITS ONLY:
//   - distance in kilometers
//   - elevation in meters
//   - pace as seconds per kilometer
//   - duration as MOVING seconds (stops excluded, per GPX auto-pause logic)

export interface ActivityLocation {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  county?: string;
  lat?: number;
  lon?: number;
}

export type WeatherCondition =
  | "clear"
  | "clouds"
  | "rain"
  | "snow"
  | "fog"
  | "thunderstorm";

export interface Activity {
  id: string;
  date: string; // ISO YYYY-MM-DD
  distanceKm: number;
  movingSec: number;
  elevationM?: number;
  paceSecPerKm?: number;
  avgHeartRate?: number;
  tempC?: number;
  weather?: WeatherCondition;
  shoe?: string;
  location: ActivityLocation;
  gpxPath?: string;
  photoPaths?: string[];
  notes?: string;
  treadmill?: boolean;
}

export interface NotableRun {
  rank: number;
  displayRank?: string;
  date: string;
  dateMonth?: string;
  distanceKm: number;
  movingSec: number;
  paceSecPerKm: number;
  elevationM: number;
  tempC?: number;
  weather: WeatherCondition;
  title?: string;
  location: ActivityLocation;
  displayLocationPrimary?: string;
  displayLocationSecondary?: string;
  gpxPath?: string;
  /** Key into `gpxTracks` when this run has a real GPS trace. */
  gpxId?: string;
  /** Relative path to the activity photo, e.g. "/photos/afternoon-run-123.jpg" */
  photoPath?: string;
  /** Wind speed in km/h (future: from weather API) */
  windKph?: number;
  // Small elevation+pace profile series (sampled every ~0.5 km)
  profile?: { km: number; m: number; paceSecPerKm: number }[];
}

export type NotableRunCategory =
  | "longest"
  | "personal-bests"
  | "elevation"
  | "races"
  | "bus-run-bus"
  | "weekly-half";

export interface StreakStats {
  startDate: string;
  endDate: string;
  totalDays: number;
  totalKm: number;
  totalHours: number;
  totalElevationM: number;
  years: number;
  months: number;
  days: number;
}

export interface AnnualMileage {
  year: number;
  km: number;
}

export interface MonthlyMileage {
  month: string; // YYYY-MM
  label: string;
  km: number;
  monthIndex: number;
  marker?: "half-star" | "star";
}

export interface HistogramBucket {
  label: string;
  count: number;
}

export interface DistanceFrequencyPoint {
  km: number;
  frequency: number;
}

export interface GeoRow {
  name: string;
  code?: string;
  days: number;
  km: number;
}

export interface HeatmapCell {
  date: string;
  km: number;
}

export interface StreakYearHeatmap {
  yearNumber: number;
  label: string;
  totalKm: number;
  avgPerDay: number;
  inProgress?: boolean;
  cells: HeatmapCell[];
}
