import { SportType } from './intervals';

export type ThemeMode = 'system' | 'dark' | 'light';
export type AuthMethod = 'oauth2' | 'server_env';
export type UnitSystem = 'metric' | 'imperial';
export type AppIconStyle = 'default' | 'minimal';
export type AppIconPalette = 'cyan' | 'indigo' | 'emerald' | 'amber';

export interface SportOptionMeta {
  sport: SportType;
  label: string;
  description: string;
  badgeColor: string;
}

export const CONFIGURABLE_SPORT_TYPES: SportOptionMeta[] = [
  {
    sport: 'Run',
    label: 'Running',
    description: 'Road, trail, track workouts & pace diagrams',
    badgeColor: '#06b6d4',
  },
  {
    sport: 'Ride',
    label: 'Cycling',
    description: 'Road, gravel, MTB & indoor trainer rides',
    badgeColor: '#3b82f6',
  },
  {
    sport: 'Swim',
    label: 'Swimming',
    description: 'Pool & open-water swim workouts',
    badgeColor: '#0ea5e9',
  },
  {
    sport: 'Walk',
    label: 'Walking',
    description: 'Outdoor & treadmill walks',
    badgeColor: '#10b981',
  },
  {
    sport: 'Hike',
    label: 'Hiking',
    description: 'Mountain, trail & trekking hikes',
    badgeColor: '#22c55e',
  },
  {
    sport: 'Rowing',
    label: 'Rowing & Paddling',
    description: 'Rowing, ergometer, kayak & SUP sessions',
    badgeColor: '#0284c7',
  },
  {
    sport: 'NordicSki',
    label: 'Ski & Snow',
    description: 'Nordic, alpine, backcountry & roller ski',
    badgeColor: '#38bdf8',
  },
  {
    sport: 'Strength',
    label: 'Strength',
    description: 'Gym, weight training, CrossFit & core',
    badgeColor: '#a855f7',
  },
  {
    sport: 'HIIT',
    label: 'HIIT & Cardio',
    description: 'HIIT, elliptical, stair stepper & circuit',
    badgeColor: '#f43f5e',
  },
  {
    sport: 'Mobility',
    label: 'Mobility',
    description: 'Recovery mobility, hip/ankle & stretching routines',
    badgeColor: '#84cc16',
  },
  {
    sport: 'Pilates',
    label: 'Pilates',
    description: 'Mat & reformer Pilates stability workouts',
    badgeColor: '#14b8a6',
  },
  {
    sport: 'Yoga',
    label: 'Yoga',
    description: 'Yoga flow & flexibility sessions',
    badgeColor: '#f59e0b',
  },
];

const SPORT_FALLBACK_LABELS: Record<string, string> = {
  Run: 'Running',
  Ride: 'Cycling',
  Swim: 'Swimming',
  Walk: 'Walking',
  Hike: 'Hiking',
  Rowing: 'Rowing',
  NordicSki: 'Skiing',
  Strength: 'Strength',
  HIIT: 'HIIT & Cardio',
  Mobility: 'Mobility',
  Pilates: 'Pilates',
  Yoga: 'Yoga',
};

const SPORT_BADGE_COLORS: Record<string, string> = {
  Run: '#06b6d4',
  Ride: '#3b82f6',
  Swim: '#0ea5e9',
  Walk: '#10b981',
  Hike: '#22c55e',
  Rowing: '#0284c7',
  NordicSki: '#38bdf8',
  Strength: '#a855f7',
  HIIT: '#f43f5e',
  Mobility: '#84cc16',
  Pilates: '#14b8a6',
  Yoga: '#f59e0b',
};

export function getSportBadgeColor(sport: SportType): string {
  return SPORT_BADGE_COLORS[sport] || '#6366f1';
}

export function formatSportLabel(
  sport: SportType,
  t?: (key: string, params?: Record<string, string | number>) => string
): string {
  if (t) {
    const key = `sport.${sport}`;
    const translated = t(key);
    if (translated && translated !== key) {
      return translated;
    }
  }
  if (SPORT_FALLBACK_LABELS[sport]) {
    return SPORT_FALLBACK_LABELS[sport];
  }
  return String(sport)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
}

export interface AppSettings {
  isLoggedIn: boolean;
  hasAcceptedTerms: boolean;
  hasCompletedOnboarding: boolean;
  athleteName: string;
  athleteEmail: string;
  language: string; // e.g. 'en' | 'de' | 'ru' | 'fr' | 'it' or any language from /public/locales/index.json
  autoSyncHours: 6 | 12 | 24 | 0; // 0 = Manual pull-to-refresh only
  themeMode: ThemeMode;
  appIconStyle?: AppIconStyle;
  appIconPalette?: AppIconPalette;
  units: UnitSystem;
  lookaheadDays: 7 | 14 | 28;
  wifiOnlySync: boolean;
  morningWorkoutNotification: boolean;
  workoutNotificationTime: string; // e.g. '07:00' (24-hour HH:mm)
}

export function getSystemDefaultLanguage(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const code = navigator.language.slice(0, 2).toLowerCase();
    if (['en', 'es', 'de', 'ru', 'fr', 'it'].includes(code)) {
      return code;
    }
  }
  return 'en';
}

export function getSystemDefaultUnits(): UnitSystem {
  try {
    const locales: string[] = [];
    if (typeof navigator !== 'undefined') {
      if (Array.isArray(navigator.languages)) {
        locales.push(...navigator.languages);
      }
      if (navigator.language) {
        locales.push(navigator.language);
      }
    }
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
      if (resolved) locales.push(resolved);
    }

    for (const loc of locales) {
      const normalized = loc.replace('_', '-').toUpperCase();
      const parts = normalized.split('-');
      const region = parts.length > 1 ? parts[parts.length - 1] : '';
      if (region === 'US' || region === 'LR' || region === 'MM' || region === 'GB' || region === 'UK') {
        return 'imperial';
      }
    }
  } catch {
    // ignore
  }
  return 'metric';
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  isLoggedIn: false,
  hasAcceptedTerms: false,
  hasCompletedOnboarding: false,
  athleteName: '',
  athleteEmail: '',
  language: getSystemDefaultLanguage(),
  autoSyncHours: 24,
  themeMode: 'system',
  appIconStyle: 'default',
  appIconPalette: 'cyan',
  units: getSystemDefaultUnits(),
  lookaheadDays: 14,
  wifiOnlySync: false,
  morningWorkoutNotification: true,
  workoutNotificationTime: '07:00',
};


