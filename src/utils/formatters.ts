import {
  ActivityStreamPoint,
  CompletedActivity,
  PlannedWorkout,
  SportType,
  TrainingZone,
  WeekSummary,
  WorkoutStepBlock,
} from '../types/intervals';

export function formatSecondsToClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export function formatDurationCompact(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.round((s % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function formatPaceSecPerKm(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return '—';
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')}/km`;
}

export function formatPaceShort(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return '—';
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatRelativeSyncTime(isoString: string): {
  lastSyncLabel: string;
  nextSyncLabel: string;
  isStale12h: boolean;
} {
  const syncedMs = new Date(isoString).getTime();
  const nowMs = Date.now();
  const diffMin = Math.max(0, Math.floor((nowMs - syncedMs) / 60000));
  const twelveHoursMin = 12 * 60;

  let lastSyncLabel = 'Just now';
  if (diffMin >= 60) {
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    lastSyncLabel = m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  } else if (diffMin >= 1) {
    lastSyncLabel = `${diffMin}m ago`;
  }

  const remainingMin = Math.max(0, twelveHoursMin - diffMin);
  const remH = Math.floor(remainingMin / 60);
  const remM = remainingMin % 60;
  const nextSyncLabel =
    remainingMin === 0
      ? 'Due now'
      : remH > 0
      ? `in ${remH}h ${remM}m`
      : `in ${remM}m`;

  return {
    lastSyncLabel,
    nextSyncLabel,
    isStale12h: diffMin >= twelveHoursMin,
  };
}

function normalizeSport(rawType?: string): SportType {
  if (!rawType) return 'Run';
  const lower = rawType.toLowerCase();
  if (lower.includes('run')) return 'Run';
  if (lower.includes('swim')) return 'Swim';
  if (lower.includes('ride') || lower.includes('cycling') || lower.includes('bike')) return 'Ride';
  if (lower.includes('pilates')) return 'Pilates';
  if (lower.includes('yoga')) return 'Yoga';
  if (lower.includes('weight') || lower.includes('strength')) return 'Strength';
  if (lower.includes('mobility') || lower.includes('stretch')) return 'Mobility';
  return 'Run';
}

// Extracts the athlete's Running Threshold Pace (100% reference pace) directly from Intervals.icu API payloads.
// Intervals.icu stores threshold_pace in meters/second inside athlete.sportSettings (for Run), workout_doc, or activity.icu_threshold_pace.
export function extractIntervalsThresholdPaceSecPerKm(payload: {
  athlete?: Record<string, unknown> | null;
  events?: Array<Record<string, unknown>>;
  activities?: Array<Record<string, unknown>>;
}): number {
  // 1. Check athlete.sportSettings for Run threshold_pace (m/s)
  const sportSettings = payload.athlete?.sportSettings;
  if (Array.isArray(sportSettings)) {
    for (const s of sportSettings) {
      const setting = s as Record<string, unknown>;
      const types = Array.isArray(setting.types) ? setting.types.map(String) : [];
      const tpMs = Number(setting.threshold_pace || 0);
      if (types.some((t) => t.toLowerCase().includes('run')) && tpMs > 0) {
        return Math.round(1000 / tpMs);
      }
    }
  }

  // 2. Check resolved events workout_doc.threshold_pace (m/s)
  if (Array.isArray(payload.events)) {
    for (const ev of payload.events) {
      const doc = ev.workout_doc as Record<string, unknown> | undefined;
      const tpMs = Number(doc?.threshold_pace || ev.threshold_pace || 0);
      if (tpMs > 0) {
        return Math.round(1000 / tpMs);
      }
    }
  }

  // 3. Check activities icu_threshold_pace (m/s)
  if (Array.isArray(payload.activities)) {
    for (const act of payload.activities) {
      const tpMs = Number(act.icu_threshold_pace || 0);
      if (tpMs > 0) {
        return Math.round(1000 / tpMs);
      }
    }
  }

  // Fallback to 200 sec/km (3:20/km) when in offline demo mode
  return 200;
}

// Merges live API events, activities, and wellness into our WeekSummary list when live sync returns data
export function mergeLiveIntervalsPayload(
  baseWeeks: WeekSummary[],
  payload: {
    athlete?: Record<string, unknown> | null;
    events?: Array<Record<string, unknown>>;
    activities?: Array<Record<string, unknown>>;
    wellness?: Array<Record<string, unknown>>;
  },
  enabledSports: SportType[] = ['Run', 'Swim', 'Strength', 'Mobility', 'Pilates', 'Yoga', 'Ride']
): WeekSummary[] {
  if (
    (!payload.events || payload.events.length === 0) &&
    (!payload.activities || payload.activities.length === 0)
  ) {
    return baseWeeks;
  }

  const thresholdSecPerKm = extractIntervalsThresholdPaceSecPerKm(payload);
  const thresholdFormatted = formatPaceSecPerKm(thresholdSecPerKm);

  // Deep clone base weeks so we can overlay live dates or populate matching dates
  const cloned: WeekSummary[] = JSON.parse(JSON.stringify(baseWeeks));

  const dayMap = new Map<string, WeekSummary['days'][number]>();
  for (const w of cloned) {
    for (const d of w.days) {
      dayMap.set(d.date, d);
    }
  }

  if (Array.isArray(payload.events)) {
    for (const ev of payload.events) {
      const sport = normalizeSport(String(ev.type || 'Run'));
      if (!enabledSports.includes(sport)) continue;

      const startDateLocal = String(ev.start_date_local || '');
      const dateKey = startDateLocal.slice(0, 10);
      const targetDay = dayMap.get(dateKey);
      if (!targetDay) continue;

      const durationSec = Number(ev.moving_time || (ev.workout_doc as Record<string, unknown>)?.duration || 2700);
      const distMeters = Number(ev.distance || (ev.workout_doc as Record<string, unknown>)?.distance || 0);
      const distanceKm = distMeters > 0 ? Number((distMeters / 1000).toFixed(1)) : undefined;
      const load = Number(ev.icu_training_load || 45);
      const intensity = Number(ev.icu_intensity || 70);
      const name = String(ev.name || `Scheduled ${sport}`);

      const pctMin = Math.max(60, intensity - 4);
      const pctMax = Math.min(105, intensity + 4);
      const paceFastSec = Math.round(thresholdSecPerKm / (pctMax / 100));
      const paceSlowSec = Math.round(thresholdSecPerKm / (pctMin / 100));
      const paceMidSec = Math.round((paceFastSec + paceSlowSec) / 2);

      const steps: WorkoutStepBlock[] = [
        {
          id: `live-step-${ev.id || Math.random()}`,
          label: `${name} · ${formatDurationCompact(durationSec)}`,
          durationSec,
          startSec: 0,
          endSec: durationSec,
          distanceKm: distanceKm || 0,
          pctPaceMin: pctMin,
          pctPaceMax: pctMax,
          paceMinFormatted: formatPaceShort(paceFastSec),
          paceMaxFormatted: formatPaceShort(paceSlowSec),
          paceMidSecPerKm: paceMidSec,
          zone: (intensity >= 85 ? 'Z4' : intensity >= 76 ? 'Z2' : 'Z1') as TrainingZone,
          color: intensity >= 85 ? '#ea580c' : '#0d9488',
        },
      ];

      const planned: PlannedWorkout = {
        id: `live-ev-${ev.id || Date.now()}`,
        date: dateKey,
        startTime: startDateLocal.slice(11, 16) || '08:00 AM',
        name,
        sport,
        durationSec,
        durationLabel: formatDurationCompact(durationSec),
        distanceKm,
        load,
        intensityPct: Math.round(intensity),
        complianceStatus: 'upcoming',
        coachNotes: String(ev.description || ''),
        instructionGroups: [
          {
            id: `grp-${ev.id}`,
            items: [
              {
                text: String(ev.description || `${formatDurationCompact(durationSec)} @ ${Math.round(intensity)}% Intensity`),
                durationLabel: formatDurationCompact(durationSec),
                pctRangeLabel: `${Math.round(intensity)}%`,
                paceRangeLabel: `${formatPaceShort(paceFastSec)}-${formatPaceSecPerKm(paceSlowSec)}`,
                distanceLabel: distanceKm ? `${distanceKm}km` : '—',
                zone: 'Z1',
              },
            ],
          },
        ],
        steps,
        zoneDistribution: [
          { zone: 'Z1', durationSec, durationLabel: formatDurationCompact(durationSec), percentage: 100, color: '#0d9488' },
          { zone: 'Z2', durationSec: 0, durationLabel: '0m', percentage: 0, color: '#16a34a' },
          { zone: 'Z3', durationSec: 0, durationLabel: '0m', percentage: 0, color: '#eab308' },
          { zone: 'Z4', durationSec: 0, durationLabel: '0m', percentage: 0, color: '#ea580c' },
          { zone: 'Z5', durationSec: 0, durationLabel: '0m', percentage: 0, color: '#ef4444' },
        ],
      };

      targetDay.scheduledWorkouts.push(planned);
    }
  }

  if (Array.isArray(payload.activities)) {
    for (const act of payload.activities) {
      const sport = normalizeSport(String(act.type || 'Run'));
      if (!enabledSports.includes(sport)) continue;

      const startDateLocal = String(act.start_date_local || '');
      const dateKey = startDateLocal.slice(0, 10);
      const targetDay = dayMap.get(dateKey);
      if (!targetDay) continue;

      const movingTimeSec = Number(act.moving_time || 3600);
      const distMeters = Number(act.distance || 0);
      const distanceKm = distMeters > 0 ? Number((distMeters / 1000).toFixed(1)) : undefined;
      const avgSpeedMs = Number(act.average_speed || 3.1);
      const paceSec = avgSpeedMs > 0 ? Math.round(1000 / avgSpeedMs) : 320;
      const avgHr = Number(act.average_heartrate || 130);
      const avgWatts = Number(act.icu_average_watts || act.average_watts || 270);
      const actTpMs = Number(act.icu_threshold_pace || 0);
      const actThresholdFormatted =
        actTpMs > 0 ? formatPaceSecPerKm(Math.round(1000 / actTpMs)) : thresholdFormatted;

      const streams: ActivityStreamPoint[] = Array.from({ length: 40 }, (_, idx) => ({
        timeSec: Math.round((idx / 39) * movingTimeSec),
        distanceKm: distanceKm ? Number(((idx / 39) * distanceKm).toFixed(2)) : 0,
        paceSecPerKm: paceSec + Math.round(Math.sin(idx * 0.4) * 5),
        powerWatts: avgWatts + Math.round(Math.cos(idx * 0.4) * 8),
        heartRateBpm: avgHr + Math.round(Math.sin(idx * 0.3) * 4),
        cadenceSpm: 76,
        altitudeMeters: 35,
        zone: 'Z1',
      }));

      const completed: CompletedActivity = {
        id: String(act.id || `live-act-${Date.now()}`),
        date: dateKey,
        startTime: startDateLocal.slice(11, 16) || '07:30 AM',
        name: String(act.name || `Recorded ${sport}`),
        sport,
        deviceName: String(act.device_name || 'Garmin Forerunner 965'),
        sourcePlatform: String(act.source || 'Garmin Connect'),
        distanceKm,
        movingTimeSec,
        movingTimeLabel: formatDurationCompact(movingTimeSec),
        paceFormatted: distanceKm && sport === 'Run' ? formatPaceSecPerKm(paceSec) : undefined,
        gapFormatted: distanceKm && sport === 'Run' ? formatPaceSecPerKm(paceSec) : undefined,
        thresholdPaceFormatted: sport === 'Run' ? actThresholdFormatted : undefined,
        load: Number(act.icu_training_load || 40),
        avgHr,
        maxHr: Number(act.max_heartrate || avgHr + 14),
        normPower: Number(act.icu_weighted_avg_watts || avgWatts),
        avgPower: avgWatts,
        fitness: Number(act.icu_ctl || 55),
        fatigue: Number(act.icu_atl || 65),
        form: Number(act.icu_ctl || 55) - Number(act.icu_atl || 65),
        streams,
        intervals: [],
      };

      targetDay.completedActivities.push(completed);
    }
  }

  return cloned;
}

