import { SportType } from './intervals';

export type ThemeMode = 'system' | 'dark' | 'light';
export type AuthMethod = 'oauth2' | 'server_env';
export type UnitSystem = 'metric' | 'imperial';

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
    sport: 'Swim',
    label: 'Swimming',
    description: 'Pool & open-water swim workouts from Intervals.icu',
    badgeColor: '#0ea5e9',
  },
  {
    sport: 'Strength',
    label: 'Strength',
    description: 'Runner strength, gym, core & calf/pogo sessions',
    badgeColor: '#a855f7',
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
  {
    sport: 'Ride',
    label: 'Cycling',
    description: 'Cross-training outdoor & indoor rides',
    badgeColor: '#3b82f6',
  },
];

export interface AppSettings {
  isLoggedIn: boolean;
  athleteName: string;
  athleteEmail: string;
  language: string; // e.g. 'en' | 'de' | 'ru' | 'fr' | 'it' or any language from /public/locales/index.json
  autoSyncHours: 6 | 12 | 24 | 0; // 0 = Manual pull-to-refresh only
  themeMode: ThemeMode;
  units: UnitSystem;
  lookaheadDays: 7 | 14 | 28;
  wifiOnlySync: boolean;
  morningWorkoutNotification: boolean;
  workoutNotificationTime: string; // e.g. '07:00' (24-hour HH:mm)
  enabledSports: SportType[]; // Activity types checked in Settings to upload & show
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  isLoggedIn: true,
  athleteName: 'Intervals.icu Athlete',
  athleteEmail: 'athlete@example.com',
  language:
    typeof navigator !== 'undefined' &&
    ['en', 'de', 'ru', 'fr', 'it'].includes(navigator.language.slice(0, 2).toLowerCase())
      ? navigator.language.slice(0, 2).toLowerCase()
      : 'en',
  autoSyncHours: 12,
  themeMode: 'dark',
  units: 'metric',
  lookaheadDays: 14,
  wifiOnlySync: false,
  morningWorkoutNotification: true,
  workoutNotificationTime: '07:00',
  enabledSports: ['Run', 'Swim', 'Strength', 'Mobility'],
};


