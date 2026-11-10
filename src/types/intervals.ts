export type SportType = 'Run' | 'Ride' | 'Swim' | 'Pilates' | 'Yoga' | 'Strength' | 'Mobility' | 'Note';

export type TrainingZone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';

export interface WeatherInfo {
  tempMinC: number;
  tempMaxC: number;
  windMinKmh: number;
  windMaxKmh: number;
  condition: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain';
}

export interface WellnessMetrics {
  date: string;
  sleepDuration: string;
  sleepSeconds: number;
  sleepScore: number;
  sleepQualityLabel: string; // e.g. "Q3", "Q2"
  weightKg: number;
  restingHrBpm: number;
  hrvMs: number;
  vo2Max?: number;
  steps: number;
}

export interface WorkoutStepBlock {
  id: string;
  label: string;
  durationSec: number;
  startSec: number;
  endSec: number;
  distanceKm: number;
  pctPaceMin: number;
  pctPaceMax: number;
  paceMinFormatted: string; // e.g. "3:20"
  paceMaxFormatted: string; // e.g. "3:42"
  paceMidSecPerKm: number;  // e.g. 211 for 3:31/km
  zone: TrainingZone;
  color: string;
}

export interface WorkoutInstructionGroup {
  id: string;
  repeatCount?: number;
  items: {
    text: string;
    durationLabel: string;
    pctRangeLabel: string;
    paceRangeLabel: string;
    distanceLabel: string;
    zone: TrainingZone;
  }[];
}

export interface ZoneAllocation {
  zone: TrainingZone;
  durationSec: number;
  durationLabel: string;
  percentage: number;
  color: string;
}

export interface PlannedWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // e.g. "08:00 AM"
  name: string;
  sport: SportType;
  durationSec: number;
  durationLabel: string; // e.g. "1h5m"
  distanceKm?: number;
  load?: number;
  intensityPct?: number;
  polarizationIndex?: number;
  complianceStatus: 'upcoming' | 'completed' | 'missed';
  compliancePct?: number;
  coachNotes?: string;
  instructionGroups: WorkoutInstructionGroup[];
  steps: WorkoutStepBlock[];
  zoneDistribution: ZoneAllocation[];
}

export interface ActivityStreamPoint {
  timeSec: number;
  distanceKm: number;
  paceSecPerKm: number; // e.g. 322 = 5:22/km
  powerWatts: number;
  heartRateBpm: number;
  cadenceSpm: number;
  altitudeMeters: number;
  zone: TrainingZone;
}

export interface ActivityIntervalSplit {
  id: string;
  name: string;
  type: 'WORK' | 'RECOVERY';
  elapsedTimeLabel: string;
  durationSec: number;
  distanceKm: number;
  paceFormatted: string;
  avgCadence: number;
  avgHr: number;
  maxHr: number;
  avgPower: number;
  avgGradientPct: number;
  intensityPct: number;
  zone: TrainingZone;
}

export interface CompletedActivity {
  id: string;
  date: string;
  startTime: string; // e.g. "07:20 AM"
  name: string;
  sport: SportType;
  deviceName: string; // e.g. "Garmin Forerunner 965"
  sourcePlatform: string; // e.g. "Garmin Connect"
  distanceKm?: number;
  movingTimeSec: number;
  movingTimeLabel: string; // e.g. "1:28:02" or "1h28m"
  coastingLabel?: string;
  avgSpeedKmh?: number;
  climbingMeters?: number;
  paceFormatted?: string; // e.g. "5:22/km"
  gapFormatted?: string;  // e.g. "5:22/km"
  thresholdPaceFormatted?: string; // e.g. "3:20/km"
  intensityPct?: number;
  load: number;
  rpe?: number;
  feel?: 'Great' | 'Good' | 'Normal' | 'Tired' | 'Weak';
  compliancePct?: number;
  trainingClass?: string; // e.g. "Base"
  avgHr: number;
  avgHrPct?: number;
  maxHr?: number;
  maxHrPct?: number;
  trimp?: number;
  normPower?: number;
  avgPower?: number;
  variabilityIndex?: number;
  powerHrRatio?: number;
  efficiencyFactor?: number;
  fitness: number;
  fatigue: number;
  form: number;
  sRpe?: number;
  cadence?: number;
  strideMeters?: number;
  ftpWatts?: number;
  eFtpWatts?: number;
  activityEFtpWatts?: number;
  weightKg?: number;
  workKj?: number;
  calories?: number;
  plannedWorkoutSummary?: {
    name: string;
    durationLabel: string;
    load: number;
    intensityPct: number;
    paceTopFormatted: string;
    paceMidFormatted: string;
    paceBotFormatted: string;
    steps: WorkoutStepBlock[];
  };
  streams: ActivityStreamPoint[];
  intervals: ActivityIntervalSplit[];
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayShort: string; // "Mon", "Tue", etc.
  dayNumber: string; // "26", "27", etc.
  monthShort: string; // "Oct", "Nov"
  isToday?: boolean;
  weather?: WeatherInfo;
  wellness?: WellnessMetrics;
  completedActivities: CompletedActivity[];
  scheduledWorkouts: PlannedWorkout[];
}

export interface WeekSummary {
  weekNumber: number;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  totalTimeLabel: string;
  totalLoad: number;
  kcal: number;
  climbingMeters: number;
  fitness: number;
  fatigue: number;
  form: number;
  ramp: number;
  runTimeActualLabel: string;
  runTimePlannedLabel: string;
  runTimePct: number;
  runDistActualKm: number;
  runDistPlannedKm: number;
  runDistPct: number;
  runLoadActual: number;
  runLoadPlanned: number;
  runLoadPct: number;
  otherSportsSummary: {
    sport: SportType;
    timeLabel: string;
    load: number;
  }[];
  zoneFocusLabel: string; // e.g. "Base 0.74"
  days: CalendarDay[];
}

export interface SyncState {
  lastSyncedAt: string; // ISO string
  nextAutoSyncAt: string; // ISO string (lastSyncedAt + 12 hours)
  isSyncing: boolean;
  mode: 'demo' | 'live';
  athleteName: string;
  athleteDevice: string;
  syncError: string | null;
}
