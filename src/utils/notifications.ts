import { CalendarDay, PlannedWorkout, WeekSummary } from '../types/intervals';
import { UnitSystem } from '../types/settings';
import { toLocalIsoDate } from './formatters';
import { isStandaloneCapacitorApk } from './intervalsClient';

const DIGEST_CHANNEL_ID = 'morning-workout-digest';
const DIGEST_BASE_ID = 10000;
const DIGEST_MAX_DAYS = 21;

interface CapacitorLocalNotificationsPlugin {
  checkPermissions?: () => Promise<{ display?: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' }>;
  requestPermissions?: () => Promise<{ display?: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' }>;
  createChannel?: (channel: {
    id: string;
    name: string;
    description: string;
    importance: number;
    visibility?: number;
    vibration?: boolean;
  }) => Promise<void>;
  schedule?: (options: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      channelId?: string;
      smallIcon?: string;
      iconColor?: string;
      schedule?: {
        at: Date;
        allowWhileIdle?: boolean;
      };
      extra?: Record<string, unknown>;
    }>;
  }) => Promise<void>;
  cancel?: (options: { notifications: Array<{ id: number }> }) => Promise<void>;
  getPending?: () => Promise<{ notifications?: Array<{ id: number }> }>;
}

function getNativeLocalNotifications(): CapacitorLocalNotificationsPlugin | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as {
    Capacitor?: {
      Plugins?: {
        LocalNotifications?: CapacitorLocalNotificationsPlugin;
      };
    };
  }).Capacitor;
  return cap?.Plugins?.LocalNotifications || null;
}

export async function ensureNotificationChannel(): Promise<void> {
  const plugin = getNativeLocalNotifications();
  if (!plugin?.createChannel) return;
  try {
    await plugin.createChannel({
      id: DIGEST_CHANNEL_ID,
      name: 'Morning Workout Digest',
      description: 'Daily morning summary of your planned Intervals.icu workouts',
      importance: 4, // IMPORTANCE_HIGH
      visibility: 1, // VISIBILITY_PUBLIC
      vibration: true,
    });
  } catch {
    // ignore if channel already exists
  }
}

export async function getNotificationPermissionState(): Promise<'granted' | 'denied' | 'prompt'> {
  const plugin = getNativeLocalNotifications();
  if (plugin?.checkPermissions) {
    try {
      const status = await plugin.checkPermissions();
      if (status?.display === 'granted') return 'granted';
      if (status?.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  return isStandaloneCapacitorApk() ? 'prompt' : 'granted';
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  await ensureNotificationChannel();

  const plugin = getNativeLocalNotifications();
  if (plugin?.requestPermissions) {
    try {
      const status = await plugin.requestPermissions();
      if (status?.display === 'granted') return 'granted';
      if (status?.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const res = await Notification.requestPermission();
      if (res === 'granted') return 'granted';
      if (res === 'denied') return 'denied';
    } catch {
      // ignore
    }
  }

  return 'granted';
}

function formatWorkoutLine(w: PlannedWorkout, units: UnitSystem): string {
  const parts: string[] = [];
  if (w.durationLabel && w.durationLabel !== '0m') {
    parts.push(w.durationLabel);
  }
  if (w.distanceKm && w.distanceKm > 0) {
    const dist =
      units === 'imperial'
        ? `${(w.distanceKm * 0.621371).toFixed(1)} mi`
        : `${w.distanceKm} km`;
    parts.push(dist);
  }
  if (w.load && w.load > 0) {
    parts.push(`Load ${w.load}`);
  }
  const meta = parts.length > 0 ? ` (${parts.join(' · ')})` : '';
  return `${w.name}${meta}`;
}

export function buildDayDigestMessage(
  day: CalendarDay | undefined,
  units: UnitSystem
): { title: string; body: string; workoutCount: number } {
  const workouts = day?.scheduledWorkouts || [];
  if (workouts.length === 0) {
    return {
      title: 'Intervals Companion · Rest Day',
      body: 'No planned workouts scheduled for today. Recovery & mobility day!',
      workoutCount: 0,
    };
  }

  if (workouts.length === 1) {
    const w = workouts[0];
    const details: string[] = [];
    if (w.durationLabel && w.durationLabel !== '0m') {
      details.push(w.durationLabel);
    }
    if (w.distanceKm && w.distanceKm > 0) {
      details.push(
        units === 'imperial'
          ? `${(w.distanceKm * 0.621371).toFixed(1)} mi`
          : `${w.distanceKm} km`
      );
    }
    if (w.intensityPct && w.intensityPct > 0) {
      details.push(`${w.intensityPct}% Int`);
    }
    if (w.load && w.load > 0) {
      details.push(`Load ${w.load}`);
    }
    return {
      title: `Today's Workout · ${w.name}`,
      body: details.length > 0 ? details.join(' · ') : w.sport,
      workoutCount: 1,
    };
  }

  const summaryLines = workouts.map((w) => formatWorkoutLine(w, units));
  return {
    title: `Today's Training · ${workouts.length} Planned Workouts`,
    body: summaryLines.join(' • '),
    workoutCount: workouts.length,
  };
}

export async function scheduleUpcomingWorkoutNotifications(params: {
  enabled: boolean;
  timeStr: string;
  weeks: WeekSummary[];
  units: UnitSystem;
}): Promise<number> {
  const { enabled, timeStr, weeks, units } = params;
  const plugin = getNativeLocalNotifications();

  // Always clear previously scheduled digest IDs (10000..10025) first
  if (plugin?.cancel) {
    const idsToCancel = Array.from({ length: DIGEST_MAX_DAYS }, (_, i) => ({
      id: DIGEST_BASE_ID + i,
    }));
    await plugin.cancel({ notifications: idsToCancel }).catch(() => {});
  }

  if (!enabled) return 0;

  await ensureNotificationChannel();
  const perm = await getNotificationPermissionState();
  if (perm === 'denied') return 0;

  const [rawH, rawM] = (timeStr || '07:00').split(':').map((n) => parseInt(n, 10));
  const hour = Number.isFinite(rawH) ? rawH : 7;
  const minute = Number.isFinite(rawM) ? rawM : 0;

  const now = Date.now();
  const todayIso = toLocalIsoDate(new Date());

  // Collect distinct upcoming days across the provided weeks
  const dayMap = new Map<string, CalendarDay>();
  for (const w of weeks) {
    for (const d of w.days) {
      if (d.date >= todayIso && !dayMap.has(d.date)) {
        dayMap.set(d.date, d);
      }
    }
  }

  const sortedDays = Array.from(dayMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, DIGEST_MAX_DAYS);

  const notificationsToSchedule: Array<{
    id: number;
    title: string;
    body: string;
    channelId: string;
    smallIcon: string;
    iconColor: string;
    schedule: { at: Date; allowWhileIdle: boolean };
  }> = [];

  sortedDays.forEach((day, idx) => {
    if (!day.scheduledWorkouts || day.scheduledWorkouts.length === 0) return;

    const [y, m, d] = day.date.split('-').map((n) => parseInt(n, 10));
    if (!y || !m || !d) return;

    const triggerDate = new Date(y, m - 1, d, hour, minute, 0, 0);
    if (triggerDate.getTime() <= now + 5000) {
      return; // Already passed for today
    }

    const { title, body } = buildDayDigestMessage(day, units);
    notificationsToSchedule.push({
      id: DIGEST_BASE_ID + idx,
      title,
      body,
      channelId: DIGEST_CHANNEL_ID,
      smallIcon: 'ic_stat_sync',
      iconColor: '#2554C7',
      schedule: {
        at: triggerDate,
        allowWhileIdle: true,
      },
    });
  });

  if (plugin?.schedule && notificationsToSchedule.length > 0) {
    try {
      await plugin.schedule({ notifications: notificationsToSchedule });
    } catch {
      // ignore
    }
  }

  return notificationsToSchedule.length;
}
