import {
  ActivityStreamPoint,
  CalendarDay,
  CompletedActivity,
  PlannedWorkout,
  SportType,
  TrainingZone,
  WeekSummary,
  WorkoutInstructionGroup,
  WorkoutStepBlock,
  ZoneAllocation,
} from '../types/intervals';

type WorkoutInstructionItem = WorkoutInstructionGroup['items'][number];

export interface LiveIntervalsPayload {
  athlete?: Record<string, unknown> | null;
  events?: Array<Record<string, unknown>>;
  activities?: Array<Record<string, unknown>>;
  wellness?: Array<Record<string, unknown>>;
}

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
  if (!isoString) {
    return {
      lastSyncLabel: 'Never',
      nextSyncLabel: 'Due now',
      isStale12h: true,
    };
  }
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

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMondayOfWeek(baseDate: Date, weekOffset = 0): Date {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0);
  const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diffToMonday + weekOffset * 7);
  return d;
}

export function getIsoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function normalizeSport(rawType?: string): SportType | null {
  if (!rawType) return null;
  const lower = rawType.toLowerCase();
  if (lower.includes('run') || lower.includes('trail') || lower.includes('virtualrun')) return 'Run';
  if (lower.includes('swim')) return 'Swim';
  if (lower.includes('ride') || lower.includes('cycling') || lower.includes('bike') || lower.includes('virtualride')) return 'Ride';
  if (lower.includes('pilates')) return 'Pilates';
  if (lower.includes('yoga')) return 'Yoga';
  if (lower.includes('weight') || lower.includes('strength') || lower.includes('gym') || lower.includes('workout')) return 'Strength';
  if (lower.includes('mobility') || lower.includes('stretch')) return 'Mobility';
  return 'Run';
}

function zoneColor(zone: TrainingZone): string {
  switch (zone) {
    case 'Z1':
      return '#0d9488';
    case 'Z2':
      return '#16a34a';
    case 'Z3':
      return '#eab308';
    case 'Z4':
      return '#ea580c';
    case 'Z5':
      return '#ef4444';
    default:
      return '#0d9488';
  }
}

function inferZoneFromPct(pct: number): TrainingZone {
  if (pct >= 103) return 'Z5';
  if (pct >= 94) return 'Z4';
  if (pct >= 86) return 'Z3';
  if (pct >= 76) return 'Z2';
  return 'Z1';
}

export function extractIntervalsThresholdPaceSecPerKm(payload: LiveIntervalsPayload): number {
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

  if (Array.isArray(payload.events)) {
    for (const ev of payload.events) {
      const doc = ev.workout_doc as Record<string, unknown> | undefined;
      const tpMs = Number(doc?.threshold_pace || ev.threshold_pace || 0);
      if (tpMs > 0) {
        return Math.round(1000 / tpMs);
      }
    }
  }

  if (Array.isArray(payload.activities)) {
    for (const act of payload.activities) {
      const tpMs = Number(act.icu_threshold_pace || 0);
      if (tpMs > 0) {
        return Math.round(1000 / tpMs);
      }
    }
  }

  return 240; // 4:00/km fallback if athlete has not configured threshold pace in Intervals.icu
}

function parseWorkoutDocSteps(
  rawSteps: unknown[],
  thresholdSecPerKm: number,
  defaultDurationSec: number,
  defaultIntensityPct: number,
  workoutName: string
): {
  steps: WorkoutStepBlock[];
  instructionGroups: WorkoutInstructionGroup[];
  zoneDistribution: ZoneAllocation[];
} {
  const flatBlocks: WorkoutStepBlock[] = [];
  const instructionGroups: WorkoutInstructionGroup[] = [];
  let cursorSec = 0;

  const createStepItem = (
    rawStep: Record<string, unknown>,
    idxLabel: string
  ): { block: WorkoutStepBlock; item: WorkoutInstructionItem } => {
    const dur = Math.max(30, Number(rawStep.duration || rawStep.moving_time || 300));
    const distMeters = Number(rawStep.distance || 0);
    const distKm = distMeters > 0 ? Number((distMeters / 1000).toFixed(2)) : Number(((dur / thresholdSecPerKm) * 0.85).toFixed(2));

    // Extract target intensity % from pace, power, or hr object if available
    const paceObj = rawStep.pace as Record<string, unknown> | undefined;
    const powerObj = rawStep.power as Record<string, unknown> | undefined;
    const hrObj = rawStep.hr as Record<string, unknown> | undefined;

    let pctMin = Number(paceObj?.start || powerObj?.start || hrObj?.start || paceObj?.value || powerObj?.value || 0);
    let pctMax = Number(paceObj?.end || powerObj?.end || hrObj?.end || paceObj?.value || powerObj?.value || 0);

    if (pctMin <= 0 && pctMax <= 0) {
      const isWarmupOrCooldown = Boolean(rawStep.warmup || rawStep.cooldown);
      const basePct = isWarmupOrCooldown ? 72 : defaultIntensityPct || 80;
      pctMin = Math.max(60, basePct - 3);
      pctMax = Math.min(115, basePct + 3);
    } else if (pctMax <= 0) {
      pctMax = pctMin;
    } else if (pctMin <= 0) {
      pctMin = pctMax;
    }

    const avgPct = (pctMin + pctMax) / 2;
    const zone = inferZoneFromPct(avgPct);
    const color = zoneColor(zone);

    const paceFastSec = Math.round(thresholdSecPerKm / (Math.max(50, pctMax) / 100));
    const paceSlowSec = Math.round(thresholdSecPerKm / (Math.max(50, pctMin) / 100));
    const paceMidSec = Math.round((paceFastSec + paceSlowSec) / 2);

    const stepText = String(
      rawStep.text ||
        (rawStep.warmup
          ? 'Warmup'
          : rawStep.cooldown
          ? 'Cooldown'
          : `${formatDurationCompact(dur)} @ ${Math.round(avgPct)}%`)
    );

    const startSec = cursorSec;
    const endSec = cursorSec + dur;
    cursorSec = endSec;

    const block: WorkoutStepBlock = {
      id: `step-${idxLabel}-${startSec}`,
      label: stepText,
      durationSec: dur,
      startSec,
      endSec,
      distanceKm: distKm,
      pctPaceMin: Math.round(pctMin),
      pctPaceMax: Math.round(pctMax),
      paceMinFormatted: formatPaceShort(paceFastSec),
      paceMaxFormatted: formatPaceShort(paceSlowSec),
      paceMidSecPerKm: paceMidSec,
      zone,
      color,
    };

    const item: WorkoutInstructionItem = {
      text: stepText,
      durationLabel: formatDurationCompact(dur),
      pctRangeLabel:
        Math.round(pctMin) === Math.round(pctMax)
          ? `${Math.round(pctMin)}%`
          : `${Math.round(pctMin)}-${Math.round(pctMax)}%`,
      paceRangeLabel: `${formatPaceShort(paceFastSec)}-${formatPaceSecPerKm(paceSlowSec)}`,
      distanceLabel: distKm > 0 ? `${distKm}km` : '—',
      zone,
    };

    return { block, item };
  };

  rawSteps.forEach((entry, index) => {
    const stepObj = (entry || {}) as Record<string, unknown>;
    const reps = Number(stepObj.reps || 0);
    const nestedSteps = Array.isArray(stepObj.steps) ? stepObj.steps : null;

    if (reps > 0 && nestedSteps && nestedSteps.length > 0) {
      const groupItems: WorkoutInstructionItem[] = [];
      for (let r = 0; r < reps; r++) {
        nestedSteps.forEach((nested, nIdx) => {
          const { block, item } = createStepItem(
            (nested || {}) as Record<string, unknown>,
            `${index}-${r}-${nIdx}`
          );
          flatBlocks.push(block);
          if (r === 0) {
            groupItems.push(item);
          }
        });
      }
      instructionGroups.push({
        id: `grp-${index}`,
        repeatCount: reps,
        items: groupItems,
      });
    } else {
      const { block, item } = createStepItem(stepObj, `${index}`);
      flatBlocks.push(block);
      instructionGroups.push({
        id: `grp-${index}`,
        items: [item],
      });
    }
  });

  if (flatBlocks.length === 0) {
    const dur = Math.max(600, defaultDurationSec);
    const pct = Math.max(65, defaultIntensityPct || 75);
    const zone = inferZoneFromPct(pct);
    const paceSec = Math.round(thresholdSecPerKm / (pct / 100));
    flatBlocks.push({
      id: 'step-fallback-0',
      label: workoutName,
      durationSec: dur,
      startSec: 0,
      endSec: dur,
      distanceKm: Number(((dur / paceSec) || 0).toFixed(1)),
      pctPaceMin: Math.max(60, pct - 3),
      pctPaceMax: Math.min(110, pct + 3),
      paceMinFormatted: formatPaceShort(paceSec - 5),
      paceMaxFormatted: formatPaceShort(paceSec + 5),
      paceMidSecPerKm: paceSec,
      zone,
      color: zoneColor(zone),
    });
    instructionGroups.push({
      id: 'grp-fallback-0',
      items: [
        {
          text: workoutName,
          durationLabel: formatDurationCompact(dur),
          pctRangeLabel: `${Math.round(pct)}%`,
          paceRangeLabel: formatPaceSecPerKm(paceSec),
          distanceLabel: '—',
          zone,
        },
      ],
    });
  }

  const totalSec = Math.max(
    1,
    flatBlocks.reduce((acc, b) => acc + b.durationSec, 0)
  );
  const zoneTotals: Record<TrainingZone, number> = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
  for (const b of flatBlocks) {
    zoneTotals[b.zone] = (zoneTotals[b.zone] || 0) + b.durationSec;
  }

  const zoneDistribution: ZoneAllocation[] = (['Z1', 'Z2', 'Z3', 'Z4', 'Z5'] as TrainingZone[]).map(
    (z) => {
      const sec = zoneTotals[z] || 0;
      return {
        zone: z,
        durationSec: sec,
        durationLabel: formatDurationCompact(sec),
        percentage: Math.round((sec / totalSec) * 100),
        color: zoneColor(z),
      };
    }
  );

  return { steps: flatBlocks, instructionGroups, zoneDistribution };
}

/**
 * Builds a single Monday–Sunday WeekSummary for `weekOffset` (0 = Current Week, -1 = Previous Week, +1 = Next Week)
 * populated ONLY with real Intervals.icu events and activities. Zero mock data.
 */
export function buildWeekForOffset(
  weekOffset: number,
  payload: LiveIntervalsPayload,
  enabledSports: SportType[] = ['Run', 'Swim', 'Strength', 'Mobility', 'Pilates', 'Yoga', 'Ride']
): WeekSummary {
  const now = new Date();
  const todayIso = toLocalIsoDate(now);
  const monday = getMondayOfWeek(now, weekOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0);

  const fmtDayMonth = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  const weekNumber = getIsoWeekNumber(monday);
  const dateRangeLabel = `${fmtDayMonth(monday)} – ${fmtDayMonth(sunday)}`;

  const days: CalendarDay[] = [];
  const dayMap = new Map<string, CalendarDay>();

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
    const iso = toLocalIsoDate(d);
    const dayShort = d.toLocaleDateString('en-GB', { weekday: 'short' });
    const monthShort = d.toLocaleDateString('en-GB', { month: 'short' });
    const calDay: CalendarDay = {
      date: iso,
      dayShort,
      dayNumber: String(d.getDate()),
      monthShort,
      isToday: iso === todayIso,
      completedActivities: [],
      scheduledWorkouts: [],
    };
    days.push(calDay);
    dayMap.set(iso, calDay);
  }

  const thresholdSecPerKm = extractIntervalsThresholdPaceSecPerKm(payload);
  const thresholdFormatted = formatPaceSecPerKm(thresholdSecPerKm);

  if (Array.isArray(payload.events)) {
    for (const ev of payload.events) {
      const category = String(ev.category || 'WORKOUT').toUpperCase();
      if (category === 'NOTE' || category === 'HOLIDAY' || category === 'SICK') continue;

      const sport = normalizeSport(String(ev.type || 'Run'));
      if (!sport || !enabledSports.includes(sport)) continue;

      const startDateLocal = String(ev.start_date_local || '');
      const dateKey = startDateLocal.slice(0, 10);
      const targetDay = dayMap.get(dateKey);
      if (!targetDay) continue;

      const workoutDoc = (ev.workout_doc || {}) as Record<string, unknown>;
      const durationSec = Number(ev.moving_time || workoutDoc.duration || 2700);
      const distMeters = Number(ev.distance || workoutDoc.distance || 0);
      const distanceKm = distMeters > 0 ? Number((distMeters / 1000).toFixed(1)) : undefined;
      const load = Number(ev.icu_training_load || workoutDoc.icu_training_load || 0);
      const intensity = Number(ev.icu_intensity || workoutDoc.icu_intensity || 75);
      const name = String(ev.name || `Scheduled ${sport}`);
      const rawSteps = Array.isArray(workoutDoc.steps) ? workoutDoc.steps : [];

      const { steps, instructionGroups, zoneDistribution } = parseWorkoutDocSteps(
        rawSteps,
        thresholdSecPerKm,
        durationSec,
        intensity,
        name
      );

      const planned: PlannedWorkout = {
        id: `ev-${ev.id || `${dateKey}-${name}`}`,
        date: dateKey,
        startTime: startDateLocal.length >= 16 ? startDateLocal.slice(11, 16) : '',
        name,
        sport,
        durationSec,
        durationLabel: formatDurationCompact(durationSec),
        distanceKm,
        load,
        intensityPct: Math.round(intensity),
        complianceStatus: ev.paired_activity_id ? 'completed' : 'upcoming',
        coachNotes: String(ev.description || ''),
        instructionGroups,
        steps,
        zoneDistribution,
      };

      targetDay.scheduledWorkouts.push(planned);
    }
  }

  if (Array.isArray(payload.activities)) {
    for (const act of payload.activities) {
      const sport = normalizeSport(String(act.type || 'Run'));
      if (!sport || !enabledSports.includes(sport)) continue;

      const startDateLocal = String(act.start_date_local || '');
      const dateKey = startDateLocal.slice(0, 10);
      const targetDay = dayMap.get(dateKey);
      if (!targetDay) continue;

      const movingTimeSec = Number(act.moving_time || act.elapsed_time || 0);
      if (movingTimeSec <= 0) continue;

      const distMeters = Number(act.distance || 0);
      const distanceKm = distMeters > 0 ? Number((distMeters / 1000).toFixed(2)) : undefined;
      const avgSpeedMs = Number(act.average_speed || 0);
      const paceSec =
        avgSpeedMs > 0
          ? Math.round(1000 / avgSpeedMs)
          : distanceKm && distanceKm > 0
          ? Math.round(movingTimeSec / distanceKm)
          : 0;
      const gapSpeedMs = Number(act.gap || avgSpeedMs || 0);
      const gapPaceSec = gapSpeedMs > 0 ? Math.round(1000 / gapSpeedMs) : paceSec;

      const avgHr = Number(act.average_heartrate || 0);
      const maxHr = Number(act.max_heartrate || 0);
      const avgWatts = Number(act.icu_average_watts || act.average_watts || 0);
      const normWatts = Number(act.icu_weighted_avg_watts || avgWatts || 0);
      const actTpMs = Number(act.icu_threshold_pace || 0);
      const actThresholdFormatted =
        actTpMs > 0 ? formatPaceSecPerKm(Math.round(1000 / actTpMs)) : thresholdFormatted;

      const ctl = act.icu_ctl !== undefined ? Math.round(Number(act.icu_ctl)) : 0;
      const atl = act.icu_atl !== undefined ? Math.round(Number(act.icu_atl)) : 0;

      const completed: CompletedActivity = {
        id: String(act.id || `act-${dateKey}-${movingTimeSec}`),
        date: dateKey,
        startTime: startDateLocal.length >= 16 ? startDateLocal.slice(11, 16) : '',
        name: String(act.name || `${sport} Activity`),
        sport,
        deviceName: String(act.device_name || 'Intervals.icu'),
        sourcePlatform: String(act.source || 'Intervals.icu'),
        distanceKm,
        movingTimeSec,
        movingTimeLabel: formatDurationCompact(movingTimeSec),
        paceFormatted:
          distanceKm && sport === 'Run' && paceSec > 0
            ? formatPaceSecPerKm(paceSec)
            : undefined,
        gapFormatted:
          distanceKm && sport === 'Run' && gapPaceSec > 0
            ? formatPaceSecPerKm(gapPaceSec)
            : undefined,
        thresholdPaceFormatted: sport === 'Run' && actTpMs > 0 ? actThresholdFormatted : undefined,
        intensityPct:
          act.icu_intensity !== undefined && act.icu_intensity !== null
            ? Math.round(Number(act.icu_intensity))
            : undefined,
        load: Number(act.icu_training_load || 0),
        rpe: act.icu_rpe !== undefined && act.icu_rpe !== null ? Number(act.icu_rpe) : undefined,
        trimp: act.trimp !== undefined && act.trimp !== null ? Math.round(Number(act.trimp)) : undefined,
        variabilityIndex:
          act.icu_variability_index !== undefined && act.icu_variability_index !== null
            ? Number(Number(act.icu_variability_index).toFixed(2))
            : undefined,
        efficiencyFactor:
          act.icu_efficiency_factor !== undefined && act.icu_efficiency_factor !== null
            ? Number(Number(act.icu_efficiency_factor).toFixed(2))
            : undefined,
        powerHrRatio:
          act.icu_power_hr !== undefined && act.icu_power_hr !== null
            ? Number(Number(act.icu_power_hr).toFixed(2))
            : undefined,
        compliancePct:
          act.icu_workout_compliance !== undefined && act.icu_workout_compliance !== null
            ? Math.round(Number(act.icu_workout_compliance))
            : undefined,
        avgHr: avgHr > 0 ? Math.round(avgHr) : 0,
        maxHr: maxHr > 0 ? Math.round(maxHr) : undefined,
        cadence: act.average_cadence ? Math.round(Number(act.average_cadence)) : undefined,
        normPower: normWatts > 0 ? Math.round(normWatts) : undefined,
        avgPower: avgWatts > 0 ? Math.round(avgWatts) : undefined,
        fitness: ctl,
        fatigue: atl,
        form: ctl - atl,
        calories: act.calories ? Math.round(Number(act.calories)) : undefined,
        streams: [],
        intervals: [],
      };

      targetDay.completedActivities.push(completed);
    }
  }

  let totalMovingTimeSec = 0;
  let totalLoad = 0;
  let runTimeActualSec = 0;
  let runTimePlannedSec = 0;
  let runDistActualKm = 0;
  let runDistPlannedKm = 0;
  let runLoadActual = 0;
  let runLoadPlanned = 0;

  for (const d of days) {
    for (const a of d.completedActivities) {
      totalMovingTimeSec += a.movingTimeSec || 0;
      totalLoad += a.load || 0;
      if (a.sport === 'Run') {
        runTimeActualSec += a.movingTimeSec || 0;
        runDistActualKm += a.distanceKm || 0;
        runLoadActual += a.load || 0;
      }
    }
    for (const w of d.scheduledWorkouts) {
      if (w.sport === 'Run') {
        runTimePlannedSec += w.durationSec || 0;
        runDistPlannedKm += w.distanceKm || 0;
        runLoadPlanned += w.load || 0;
      }
    }
  }

  return {
    weekNumber,
    dateRangeLabel,
    startDate: toLocalIsoDate(monday),
    endDate: toLocalIsoDate(sunday),
    totalTimeLabel: formatDurationCompact(totalMovingTimeSec),
    totalLoad,
    kcal: 0,
    climbingMeters: 0,
    fitness: 0,
    fatigue: 0,
    form: 0,
    ramp: 0,
    runTimeActualLabel: formatDurationCompact(runTimeActualSec),
    runTimePlannedLabel: formatDurationCompact(runTimePlannedSec),
    runTimePct: runTimePlannedSec > 0 ? Math.round((runTimeActualSec / runTimePlannedSec) * 100) : 0,
    runDistActualKm: Number(runDistActualKm.toFixed(1)),
    runDistPlannedKm: Number(runDistPlannedKm.toFixed(1)),
    runDistPct: runDistPlannedKm > 0 ? Math.round((runDistActualKm / runDistPlannedKm) * 100) : 0,
    runLoadActual,
    runLoadPlanned,
    runLoadPct: runLoadPlanned > 0 ? Math.round((runLoadActual / runLoadPlanned) * 100) : 0,
    otherSportsSummary: [],
    zoneFocusLabel: 'Real Intervals.icu Sync',
    days,
  };
}
