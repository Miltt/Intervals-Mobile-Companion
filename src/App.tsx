import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Footprints,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import {
  CalendarDay,
  CompletedActivity,
  PlannedWorkout,
  SportType,
  SyncState,
  WeekSummary,
} from './types/intervals';
import {
  AppSettings,
  CONFIGURABLE_SPORT_TYPES,
  DEFAULT_APP_SETTINGS,
  formatSportLabel,
  getSportBadgeColor,
} from './types/settings';
import {
  buildWeekForOffset,
  formatRelativeSyncTime,
  getMondayOfWeek,
  LiveIntervalsPayload,
  normalizeSport,
  toLocalIsoDate,
} from './utils/formatters';
import { CompletedActivityCard, PlannedWorkoutCard } from './components/CalendarCards';
import { PlannedWorkoutDetail } from './components/PlannedWorkoutDetail';
import { CompletedActivityDetail } from './components/CompletedActivityDetail';
import { OfflineIndicator } from './components/PWAInstallButton';
import { KotlinExportModal } from './components/KotlinExportModal';
import {
  AndroidEmulatorFrame,
  DeviceViewportMode,
} from './components/AndroidEmulatorFrame';
import { SettingsScreen, SettingsSubMenu } from './components/SettingsScreen';
import { IntervalsWebLoginSheet } from './components/IntervalsWebLoginSheet';
import { OnboardingFlow, OnboardingStep } from './components/OnboardingFlow';
import { useLocalization } from './i18n/useTranslation';
import {
  exchangeNativePkceCode,
  isStandaloneCapacitorApk,
  syncIntervalsDirect,
} from './utils/intervalsClient';

const LIVE_CACHE_STORAGE_KEY = 'intervals_icu_companion_live_payload_v5';
const OAUTH_TOKEN_STORAGE_KEY = 'intervals_icu_oauth_token_v5';
const SETTINGS_STORAGE_KEY = 'intervals_icu_companion_settings_v5';
const PULL_REFRESH_THRESHOLD = 62;

type NavSection = 'calendar' | 'incoming' | 'settings';
type FeedFilter = 'all' | 'scheduled' | 'completed';

type SelectedItem =
  | { type: 'planned'; workout: PlannedWorkout }
  | { type: 'completed'; activity: CompletedActivity }
  | null;

function detectViewportDeviceMode(): DeviceViewportMode {
  if (typeof window === 'undefined') return 'phone-portrait';
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isTouchOrStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(pointer: coarse)').matches;
  if (!isTouchOrStandalone) return 'phone-portrait';
  const minDim = Math.min(w, h);
  if (minDim < 600) return 'phone-portrait'; // Phone is always locked to Portrait
  return w > h ? 'tablet-landscape' : 'tablet-portrait';
}

function mergePayloads(
  prev: LiveIntervalsPayload,
  incoming: LiveIntervalsPayload
): LiveIntervalsPayload {
  const eventMap = new Map<string, Record<string, unknown>>();
  for (const ev of prev.events || []) {
    const key = String(ev.id || `${ev.start_date_local}-${ev.name}`);
    eventMap.set(key, ev);
  }
  for (const ev of incoming.events || []) {
    const key = String(ev.id || `${ev.start_date_local}-${ev.name}`);
    eventMap.set(key, ev);
  }

  const activityMap = new Map<string, Record<string, unknown>>();
  for (const act of prev.activities || []) {
    const key = String(act.id || `${act.start_date_local}-${act.name}`);
    activityMap.set(key, act);
  }
  for (const act of incoming.activities || []) {
    const key = String(act.id || `${act.start_date_local}-${act.name}`);
    activityMap.set(key, act);
  }

  return {
    athlete: incoming.athlete || prev.athlete || null,
    events: Array.from(eventMap.values()),
    activities: Array.from(activityMap.values()),
    wellness: incoming.wellness || prev.wellness || [],
  };
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const oauthRaw = localStorage.getItem(OAUTH_TOKEN_STORAGE_KEY);
      const oauthData = oauthRaw ? JSON.parse(oauthRaw) : null;
      const hasOAuth = Boolean(oauthData?.accessToken);

      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const effectiveLoggedIn = hasOAuth ? true : Boolean(parsed.isLoggedIn);

        return {
          ...DEFAULT_APP_SETTINGS,
          ...parsed,
          isLoggedIn: effectiveLoggedIn,
          hasAcceptedTerms: effectiveLoggedIn
            ? true
            : Boolean(parsed.hasAcceptedTerms),
          hasCompletedOnboarding: effectiveLoggedIn
            ? true
            : Boolean(parsed.hasCompletedOnboarding),
          athleteName: hasOAuth
            ? oauthData.athleteName || parsed.athleteName || 'Intervals.icu Athlete'
            : parsed.athleteName || '',
          athleteEmail: hasOAuth
            ? oauthData.athleteId
              ? `ID: ${oauthData.athleteId} (OAuth 2.0)`
              : parsed.athleteEmail || 'OAuth 2.0 Connected'
            : parsed.athleteEmail || '',
        };
      }

      if (hasOAuth) {
        return {
          ...DEFAULT_APP_SETTINGS,
          isLoggedIn: true,
          hasAcceptedTerms: true,
          hasCompletedOnboarding: true,
          athleteName: oauthData.athleteName || 'Intervals.icu Athlete',
          athleteEmail: oauthData.athleteId
            ? `ID: ${oauthData.athleteId} (OAuth 2.0)`
            : 'OAuth 2.0 Connected',
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_APP_SETTINGS;
  });

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(() =>
    settings.hasAcceptedTerms ? 3 : 1
  );
  const isOnboardingActive = !settings.isLoggedIn || !settings.hasCompletedOnboarding;

  const {
    t,
    availableLanguages,
    syncLanguagesFromGitHub,
  } = useLocalization(settings.language || 'en');

  const [systemPrefersLight, setSystemPrefersLight] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersLight(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isLight = useMemo(() => {
    if (settings.themeMode === 'light') return true;
    if (settings.themeMode === 'dark') return false;
    return systemPrefersLight;
  }, [settings.themeMode, systemPrefersLight]);

  const [livePayload, setLivePayload] = useState<LiveIntervalsPayload>(() => {
    try {
      const saved = localStorage.getItem(LIVE_CACHE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.payload) {
          return parsed.payload;
        }
      }
    } catch {
      // ignore
    }
    return { athlete: null, events: [], activities: [], wellness: [] };
  });

  // 0 = Current Week (always opens on the current week!), -1 = Previous Week, +1 = Next Week
  const [weekOffset, setWeekOffset] = useState<number>(0);
  // Default selection is Today's ISO date so the calendar feed filters to Today on launch & after login
  const [selectedDayDate, setSelectedDayDate] = useState<string | 'ALL'>(() =>
    toLocalIsoDate(new Date())
  );
  const [activeSection, setActiveSection] = useState<NavSection>('calendar');
  const [settingsSubMenu, setSettingsSubMenu] = useState<SettingsSubMenu>(null);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  // Dynamic workout type filter inside the bottom-right Filter popup.
  // By default excludedFilterSports is empty so 100% of all synced sports are shown unconditionally.
  const [excludedFilterSports, setExcludedFilterSports] = useState<SportType[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false);

  const handleUpdateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [showKotlinModal, setShowKotlinModal] = useState<boolean>(false);
  const [showWebLoginSheet, setShowWebLoginSheet] = useState<boolean>(false);
  const [isEmulatorActive, setIsEmulatorActive] = useState<boolean>(
    () => !isStandaloneCapacitorApk()
  );
  const [deviceMode, setDeviceMode] = useState<DeviceViewportMode>(() =>
    detectViewportDeviceMode()
  );
  const manualDeviceModeRef = useRef<boolean>(false);
  const isTabletLandscape = deviceMode === 'tablet-landscape';

  // Automatically adapt between Tablet Portrait and Tablet Landscape on physical tablets while keeping Phones locked to Portrait
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (manualDeviceModeRef.current) return;
      const detected = detectViewportDeviceMode();
      setDeviceMode((prev) => (prev !== detected ? detected : prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll & Floating Bottom Bar state
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dayStripRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const [showFloatingBottomBar, setShowFloatingBottomBar] = useState<boolean>(true);

  // Pull-down gesture state (touch + mouse drag) for Force Collect
  const pullStartYRef = useRef<number | null>(null);
  const isPullingRef = useRef<boolean>(false);
  const [pullDistance, setPullDistance] = useState<number>(0);

  const autoSyncIntervalMs = useMemo(() => {
    if (settings.autoSyncHours === 0) return 0;
    return settings.autoSyncHours * 60 * 60 * 1000;
  }, [settings.autoSyncHours]);

  const [syncState, setSyncState] = useState<SyncState>(() => {
    let lastSyncedAt = '';
    try {
      const saved = localStorage.getItem(LIVE_CACHE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lastSyncedAt) lastSyncedAt = parsed.lastSyncedAt;
      }
    } catch {
      // ignore
    }
    const baseTime = lastSyncedAt ? new Date(lastSyncedAt).getTime() : Date.now();
    const defaultHours = settings.autoSyncHours || 24;
    const nextAuto = new Date(baseTime + defaultHours * 60 * 60 * 1000).toISOString();
    return {
      lastSyncedAt,
      nextAutoSyncAt: nextAuto,
      isSyncing: false,
      mode: 'live',
      athleteName: settings.athleteName || 'Intervals.icu Athlete',
      athleteDevice: 'Intervals.icu',
      syncError: null,
    };
  });

  // Build the currently viewed week (0 = Current Week, -1 = Last Week, +1 = Next Week, etc.)
  const activeWeek: WeekSummary = useMemo(
    () => buildWeekForOffset(weekOffset, livePayload),
    [weekOffset, livePayload]
  );

  // Build multi-week range around current week for Incoming Workouts tab & activity stepping
  const multiWeeksRange: WeekSummary[] = useMemo(() => {
    const list: WeekSummary[] = [];
    for (let offset = -4; offset <= 4; offset++) {
      list.push(buildWeekForOffset(offset, livePayload));
    }
    return list;
  }, [livePayload]);

  // Dynamically discover all sport types actually present in the athlete's synced Intervals.icu account
  const discoveredSports: SportType[] = useMemo(() => {
    const found = new Set<SportType>();
    for (const ev of livePayload.events || []) {
      const cat = String(ev.category || 'WORKOUT').toUpperCase();
      if (cat === 'NOTE' || cat === 'HOLIDAY' || cat === 'SICK') continue;
      const s = normalizeSport(String(ev.type || 'Run'));
      if (s) found.add(s);
    }
    for (const act of livePayload.activities || []) {
      const s = normalizeSport(String(act.type || 'Run'));
      if (s) found.add(s);
    }
    for (const d of activeWeek.days) {
      for (const w of d.scheduledWorkouts) found.add(w.sport);
      for (const a of d.completedActivities) found.add(a.sport);
    }
    if (found.size === 0) {
      return CONFIGURABLE_SPORT_TYPES.map((m) => m.sport);
    }
    const knownOrder = CONFIGURABLE_SPORT_TYPES.map((m) => m.sport);
    return Array.from(found).sort((a, b) => {
      const idxA = knownOrder.indexOf(a);
      const idxB = knownOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return String(a).localeCompare(String(b));
    });
  }, [livePayload.events, livePayload.activities, activeWeek.days]);

  // Effective sports shown on the calendar after applying the bottom-right Filter button
  const activeSportSet = useMemo(() => {
    const enabled = discoveredSports.filter((s) => !excludedFilterSports.includes(s));
    return new Set<SportType>(enabled.length > 0 ? enabled : discoveredSports);
  }, [discoveredSports, excludedFilterSports]);

  const performSync = useCallback(
    async (isManualForceCollect: boolean, explicitToken?: string) => {
      let storedToken = explicitToken || '';
      if (!storedToken) {
        try {
          const tokenRaw = localStorage.getItem(OAUTH_TOKEN_STORAGE_KEY);
          if (tokenRaw) {
            const parsedToken = JSON.parse(tokenRaw);
            if (parsedToken?.accessToken) {
              storedToken = String(parsedToken.accessToken);
            }
          }
        } catch {
          // ignore
        }
      }

      // Never sync or auto-login if the user has logged out (no OAuth token)
      if (!storedToken) {
        setSyncState((prev) => ({ ...prev, isSyncing: false }));
        if (isManualForceCollect) {
          setSyncToast('Please sign in with Intervals.icu in Settings → Account first.');
        }
        return;
      }

      setSyncState((prev) => ({ ...prev, isSyncing: true, syncError: null }));

      try {
        // Fetch a wide window around today (56 days back + lookahead days forward)
        // so walking < and > across weeks in the calendar uses local data without network requests
        const currentMonday = getMondayOfWeek(new Date(), 0);
        const oldestDate = new Date(currentMonday.getTime() - 56 * 86400000);
        const lookahead = Math.max(14, settings.lookaheadDays || 14);
        const newestDate = new Date(currentMonday.getTime() + (lookahead + 14) * 86400000);

        const oldestIso = toLocalIsoDate(oldestDate);
        const newestIso = toLocalIsoDate(newestDate);
        const nowIso = new Date().toISOString();
        const intervalMs = autoSyncIntervalMs || 24 * 60 * 60 * 1000;
        const nextIso = new Date(Date.now() + intervalMs).toISOString();

        let liveResult: LiveIntervalsPayload | null = null;
        let syncErrorMsg = '';

        if (isStandaloneCapacitorApk()) {
          liveResult = await syncIntervalsDirect(storedToken, oldestIso, newestIso);
        } else {
          const response = await fetch('/api/intervals/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${storedToken}`,
            },
            body: JSON.stringify({
              oldest: oldestIso,
              newest: newestIso,
            }),
          }).catch(() => null);

          if (response && response.ok) {
            const data = await response.json().catch(() => ({}));
            if (data.mode === 'live') {
              liveResult = {
                athlete: data.athlete,
                events: data.events,
                activities: data.activities,
                wellness: data.wellness,
              };
            } else if (data.error) {
              syncErrorMsg = String(data.error);
            }
          } else {
            // Fallback to direct Intervals.icu REST API if backend proxy is unavailable
            liveResult = await syncIntervalsDirect(storedToken, oldestIso, newestIso);
          }
        }

        if (liveResult) {
          const data = liveResult;
          setLivePayload((prev) => {
            const merged = mergePayloads(prev, {
              athlete: data.athlete,
              events: data.events,
              activities: data.activities,
              wellness: data.wellness,
            });
            try {
              localStorage.setItem(
                LIVE_CACHE_STORAGE_KEY,
                JSON.stringify({ payload: merged, lastSyncedAt: nowIso })
              );
            } catch {
              // ignore
            }
            return merged;
          });

          if (data.athlete?.name) {
            handleUpdateSettings({
              isLoggedIn: true,
              athleteName: String(data.athlete.name),
              athleteEmail: data.athlete.email
                ? String(data.athlete.email)
                : `Athlete #${data.athlete.id || '0'}`,
            });
          }

          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncedAt: nowIso,
            nextAutoSyncAt: nextIso,
            mode: 'live',
            athleteName: data.athlete?.name ? String(data.athlete.name) : prev.athleteName,
          }));

          if (isManualForceCollect) {
            const evCount = Array.isArray(data.events) ? data.events.length : 0;
            const actCount = Array.isArray(data.activities) ? data.activities.length : 0;
            setSyncToast(
              `Synced ${evCount} planned workouts & ${actCount} activities from Intervals.icu.`
            );
          }
        } else {
          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncedAt: prev.lastSyncedAt || nowIso,
            nextAutoSyncAt: nextIso,
          }));
          if (isManualForceCollect) {
            setSyncToast(
              syncErrorMsg
                ? `Sync notice: ${syncErrorMsg}`
                : 'Sign in with Intervals.icu in Settings → Account to sync live workouts.'
            );
          }
        }
      } catch {
        const intervalMs = autoSyncIntervalMs || 24 * 60 * 60 * 1000;
        const nextIso = new Date(Date.now() + intervalMs).toISOString();
        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          nextAutoSyncAt: nextIso,
        }));
        if (isManualForceCollect) {
          setSyncToast('Offline — showing locally cached calendar.');
        }
      }
    },
    [settings.lookaheadDays, autoSyncIntervalMs, handleUpdateSettings]
  );

  const handledOAuthCodeRef = useRef<string | null>(null);

  // Listen for OAuth 2.0 Web Browser Login popup completion OR Android APK Deep-Link (`intervalscompanion://oauth/callback?code=...`)
  useEffect(() => {
    const completeOAuthLogin = (name: string, athleteId: string, accessToken: string) => {
      if (!accessToken) return;
      try {
        localStorage.setItem(
          OAUTH_TOKEN_STORAGE_KEY,
          JSON.stringify({
            accessToken,
            athleteName: name,
            athleteId,
            savedAt: new Date().toISOString(),
          })
        );
      } catch {
        // ignore
      }

      handleUpdateSettings({
        isLoggedIn: true,
        hasAcceptedTerms: true,
        hasCompletedOnboarding: true,
        athleteName: name,
        athleteEmail: `Athlete #${athleteId}`,
      });
      setShowWebLoginSheet(false);
      setActiveSection('calendar');
      setWeekOffset(0);
      setSelectedDayDate(toLocalIsoDate(new Date()));
      setSyncToast(`Signed in as ${name} via Intervals.icu OAuth`);
      performSync(true, accessToken);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const name = event.data?.athleteName || 'Intervals.icu Athlete';
        const athleteId = event.data?.athleteId || '0';
        const accessToken = event.data?.accessToken || '';
        completeOAuthLogin(name, athleteId, accessToken);
      }
    };

    const handleDeepLinkCode = async (code: string) => {
      if (!code || handledOAuthCodeRef.current === code) return;
      handledOAuthCodeRef.current = code;

      // Immediately clean `?code=` from URL bar so re-renders never re-trigger exchange
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      try {
        setSyncToast('Completing Intervals.icu sign-in...');
        const exchanged = await exchangeNativePkceCode(code);
        completeOAuthLogin(exchanged.athleteName, exchanged.athleteId, exchanged.accessToken);
      } catch (err) {
        setSyncToast(
          err instanceof Error ? err.message : 'OAuth token exchange failed.'
        );
      }
    };

    // Check if the page/WebView was launched with ?code=...
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlCode = searchParams.get('code');
      if (urlCode) {
        handleDeepLinkCode(urlCode);
      }
    }

    const handleNativeOAuthEvent = (e: Event) => {
      const custom = e as CustomEvent<{ code?: string }>;
      if (custom.detail?.code) {
        handleDeepLinkCode(custom.detail.code);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('native-oauth-callback', handleNativeOAuthEvent);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('native-oauth-callback', handleNativeOAuthEvent);
    };
  }, [handleUpdateSettings, performSync]);

  useEffect(() => {
    if (!syncToast) return;
    const t = setTimeout(() => setSyncToast(null), 3200);
    return () => clearTimeout(t);
  }, [syncToast]);

  const syncTiming = useMemo(
    () => formatRelativeSyncTime(syncState.lastSyncedAt, settings.autoSyncHours),
    [syncState.lastSyncedAt, settings.autoSyncHours]
  );

  const todayIso = useMemo(() => toLocalIsoDate(new Date()), []);

  const allIncomingFiltered = useMemo(
    () =>
      multiWeeksRange.flatMap((w) =>
        w.days
          .filter((d) => d.date >= todayIso)
          .flatMap((d) =>
            d.scheduledWorkouts.filter((wo) => activeSportSet.has(wo.sport))
          )
      ),
    [multiWeeksRange, activeSportSet, todayIso]
  );

  const visibleDays: CalendarDay[] = useMemo(() => {
    if (selectedDayDate === 'ALL') return activeWeek.days;
    return activeWeek.days.filter((d) => d.date === selectedDayDate);
  }, [activeWeek.days, selectedDayDate]);

  // Unified ordered feed of cards in the active view (Incoming or Calendar) for Left/Right Swipe & Tablet Landscape Auto-Select
  const activeFeedItems: Exclude<SelectedItem, null>[] = useMemo(() => {
    if (activeSection === 'incoming') {
      return allIncomingFiltered.map((workout) => ({
        type: 'planned' as const,
        workout,
      }));
    }
    if (activeSection === 'calendar') {
      const showCompleted = feedFilter === 'all' || feedFilter === 'completed';
      const showScheduled = feedFilter === 'all' || feedFilter === 'scheduled';
      const list: Exclude<SelectedItem, null>[] = [];
      for (const day of visibleDays) {
        if (showScheduled) {
          for (const workout of day.scheduledWorkouts) {
            if (activeSportSet.has(workout.sport)) {
              list.push({ type: 'planned', workout });
            }
          }
        }
        if (showCompleted) {
          for (const activity of day.completedActivities) {
            if (activeSportSet.has(activity.sport)) {
              list.push({ type: 'completed', activity });
            }
          }
        }
      }
      return list;
    }
    return [];
  }, [activeSection, allIncomingFiltered, feedFilter, visibleDays, activeSportSet]);

  const selectedItemFeedIndex = useMemo(() => {
    if (!selectedItem) return -1;
    return activeFeedItems.findIndex((item) =>
      item.type === 'planned' && selectedItem.type === 'planned'
        ? item.workout.id === selectedItem.workout.id
        : item.type === 'completed' && selectedItem.type === 'completed'
        ? item.activity.id === selectedItem.activity.id
        : false
    );
  }, [activeFeedItems, selectedItem]);

  const activeSwipeIndexLabel =
    activeFeedItems.length > 1 && selectedItemFeedIndex !== -1
      ? `${selectedItemFeedIndex + 1} / ${activeFeedItems.length}`
      : undefined;

  // In Tablet Landscape, automatically select the first workout/activity of the active day or Incoming list
  useEffect(() => {
    if (
      !isTabletLandscape ||
      isOnboardingActive ||
      activeSection === 'settings'
    ) {
      return;
    }
    if (activeFeedItems.length === 0) {
      setSelectedItem(null);
      return;
    }
    setSelectedItem((prev) => {
      if (prev) {
        const stillInFeed = activeFeedItems.some((item) =>
          item.type === 'planned' && prev.type === 'planned'
            ? item.workout.id === prev.workout.id
            : item.type === 'completed' && prev.type === 'completed'
            ? item.activity.id === prev.activity.id
            : false
        );
        if (stillInFeed) return prev;
      }
      return activeFeedItems[0];
    });
  }, [
    isTabletLandscape,
    isOnboardingActive,
    activeSection,
    selectedDayDate,
    weekOffset,
    feedFilter,
    activeFeedItems,
  ]);

  // Automatically center the chosen day button inside the horizontal week navigator strip
  useEffect(() => {
    if (
      isOnboardingActive ||
      activeSection !== 'calendar' ||
      (selectedItem && !isTabletLandscape)
    ) {
      return;
    }
    const timer = setTimeout(() => {
      const container = dayStripRef.current;
      if (!container) return;
      const target = container.querySelector<HTMLElement>(
        `[data-day-pill="${selectedDayDate}"]`
      );
      if (target) {
        const scrollLeft =
          target.offsetLeft - container.clientWidth / 2 + target.offsetWidth / 2;
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: 'smooth',
        });
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [
    selectedDayDate,
    weekOffset,
    activeSection,
    selectedItem,
    isTabletLandscape,
    isOnboardingActive,
  ]);

  // Scroll direction handler: hides floating bottom bar on scroll down, shows on scroll up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    const delta = currentScrollTop - lastScrollTopRef.current;

    if (currentScrollTop <= 10) {
      setShowFloatingBottomBar(true);
    } else if (delta > 6) {
      setShowFloatingBottomBar(false);
      setIsFilterPopoverOpen(false);
    } else if (delta < -6) {
      setShowFloatingBottomBar(true);
    }

    lastScrollTopRef.current = currentScrollTop;
  }, []);

  // Pull-down gesture handlers (disabled inside Settings or Onboarding)
  const beginPull = (clientY: number) => {
    const scroller = scrollContainerRef.current;
    if (
      !scroller ||
      scroller.scrollTop > 2 ||
      syncState.isSyncing ||
      activeSection === 'settings' ||
      isOnboardingActive
    ) {
      pullStartYRef.current = null;
      isPullingRef.current = false;
      return;
    }
    pullStartYRef.current = clientY;
    isPullingRef.current = true;
  };

  const movePull = (clientY: number) => {
    if (!isPullingRef.current || pullStartYRef.current === null) return;
    const scroller = scrollContainerRef.current;
    if (scroller && scroller.scrollTop > 2) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }
    const rawDelta = clientY - pullStartYRef.current;
    if (rawDelta > 0) {
      const damped = Math.min(110, rawDelta * 0.52);
      setPullDistance(damped);
    } else {
      setPullDistance(0);
    }
  };

  const endPull = () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    pullStartYRef.current = null;

    if (pullDistance >= PULL_REFRESH_THRESHOLD && !syncState.isSyncing) {
      setPullDistance(0);
      performSync(true);
    } else {
      setPullDistance(0);
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setShowFloatingBottomBar(true);
  };

  const handleSelectPlanned = (workout: PlannedWorkout) => {
    setIsFilterPopoverOpen(false);
    setSelectedItem({ type: 'planned', workout });
    if (!isTabletLandscape) scrollToTop();
  };

  const handleSelectCompleted = (activity: CompletedActivity) => {
    setIsFilterPopoverOpen(false);
    setSelectedItem({ type: 'completed', activity });
    if (!isTabletLandscape) scrollToTop();
  };

  const handleStepActiveItem = (direction: -1 | 1) => {
    if (
      !selectedItem ||
      activeFeedItems.length <= 1 ||
      selectedItemFeedIndex === -1
    ) {
      return;
    }
    const nextIdx =
      (selectedItemFeedIndex + direction + activeFeedItems.length) %
      activeFeedItems.length;
    setSelectedItem(activeFeedItems[nextIdx]);
    if (!isTabletLandscape) scrollToTop();
  };

  const handleToggleFilterSport = (sport: SportType) => {
    setExcludedFilterSports((prev) => {
      const currentlyActive = discoveredSports.filter((s) => !prev.includes(s));
      const isCurrentlyChecked = currentlyActive.includes(sport);
      if (isCurrentlyChecked) {
        if (currentlyActive.length <= 1) return prev; // Keep at least 1 checked
        return [...prev, sport];
      }
      return prev.filter((s) => s !== sport);
    });
  };

  const showPullIndicator =
    !isOnboardingActive &&
    activeSection !== 'settings' &&
    (pullDistance > 6 || syncState.isSyncing);
  const isReadyToRelease = pullDistance >= PULL_REFRESH_THRESHOLD;

  const formatDist = (km?: number, fallback?: string) => {
    if (!km) return fallback || '';
    if (settings.units === 'imperial') {
      return `${(km * 0.621371).toFixed(1)} mi`;
    }
    return `${km} km`;
  };

  // Show all sport types discovered in the user's Intervals.icu account inside the bottom-right Filter popup
  const availableFilterSportOptions = useMemo(
    () =>
      discoveredSports.map((sport) => ({
        sport,
        label: formatSportLabel(sport, t),
        badgeColor: getSportBadgeColor(sport),
      })),
    [discoveredSports, t]
  );

  const hasCustomFilterActive =
    feedFilter !== 'all' || activeSportSet.size < discoveredSports.length;

  return (
    <AndroidEmulatorFrame
      isEmulatorActive={isEmulatorActive}
      onToggleEmulator={() => setIsEmulatorActive((prev) => !prev)}
      deviceMode={deviceMode}
      onChangeDeviceMode={(nextMode) => {
        manualDeviceModeRef.current = true;
        setDeviceMode(nextMode);
      }}
      onBackGesture={() => {
        if (isOnboardingActive) {
          if (onboardingStep > 1) {
            setOnboardingStep((prev) => (prev - 1) as OnboardingStep);
            scrollToTop();
          }
          return;
        }
        if (isFilterPopoverOpen) {
          setIsFilterPopoverOpen(false);
        } else if (selectedItem && !isTabletLandscape) {
          setSelectedItem(null);
          setShowFloatingBottomBar(true);
        } else if (
          activeSection === 'settings' &&
          settingsSubMenu !== null &&
          !isTabletLandscape
        ) {
          setSettingsSubMenu(null);
          scrollToTop();
        } else if (activeSection !== 'calendar') {
          setSettingsSubMenu(null);
          setActiveSection('calendar');
          setShowFloatingBottomBar(true);
        } else if (selectedItem && isTabletLandscape) {
          setSelectedItem(null);
        }
      }}
      onHomeGesture={() => {
        if (isOnboardingActive) return;
        setIsFilterPopoverOpen(false);
        setSelectedItem(null);
        setSettingsSubMenu(null);
        setActiveSection('calendar');
        setShowFloatingBottomBar(true);
      }}
      onForceCollect={() => {
        if (!isOnboardingActive) performSync(true);
      }}
      onOpenKotlinCode={() => setShowKotlinModal(true)}
      isSyncing={syncState.isSyncing}
      lastSyncLabel={syncTiming.lastSyncLabel}
    >
      <div
        className={`relative flex-1 min-h-0 flex flex-col overflow-hidden transition-colors duration-200 ${
          isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f1117] text-slate-100'
        }`}
      >
        {/* Android Pull-Down to Force Collect Indicator (Hidden in Settings & Onboarding) */}
        <div
          style={{
            height:
              isOnboardingActive || activeSection === 'settings'
                ? 0
                : syncState.isSyncing
                ? 48
                : pullDistance > 0
                ? Math.min(68, pullDistance)
                : 0,
            opacity: showPullIndicator ? 1 : 0,
          }}
          className={`w-full overflow-hidden flex items-center justify-center border-b transition-all duration-150 shrink-0 z-20 ${
            isLight
              ? 'bg-slate-100/95 border-slate-200'
              : 'bg-[#0c0e14]/90 border-slate-800/50'
          }`}
        >
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-lg text-xs font-medium ${
              isLight
                ? 'bg-white border-slate-200 text-cyan-700'
                : 'bg-[#161b26] border-slate-700/80 text-cyan-300'
            }`}
          >
            {syncState.isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                <span>{t('pull.syncing')}</span>
              </>
            ) : isReadyToRelease ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500 rotate-180 transition-transform" />
                <span className="text-emerald-500">{t('pull.release')}</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-cyan-500" />
                <span>{t('pull.pull_down')}</span>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Main Content Viewport (No Static Top Bar) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onTouchStart={(e) => beginPull(e.touches[0].clientY)}
          onTouchMove={(e) => movePull(e.touches[0].clientY)}
          onTouchEnd={endPull}
          onMouseDown={(e) => beginPull(e.clientY)}
          onMouseMove={(e) => movePull(e.clientY)}
          onMouseUp={endPull}
          onMouseLeave={() => {
            if (isPullingRef.current) endPull();
          }}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-28"
        >
          {/* Sync Toast Notification */}
          {syncToast && (
            <div className="max-w-5xl mx-auto px-3.5 pt-3">
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3.5 py-2 text-xs text-emerald-400 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{syncToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncToast(null)}
                  className="text-emerald-400 hover:underline text-xs font-medium cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {isOnboardingActive ? (
            <OnboardingFlow
              step={onboardingStep}
              onStepChange={(nextStep) => {
                setOnboardingStep(nextStep);
                scrollToTop();
              }}
              settings={settings}
              isLight={isLight}
              t={t}
              availableLanguages={availableLanguages}
              onSyncLanguagesFromGitHub={syncLanguagesFromGitHub}
              onUpdateSettings={handleUpdateSettings}
              onSuccessLogin={(athleteName, email, accessToken) => {
                handleUpdateSettings({
                  isLoggedIn: true,
                  hasAcceptedTerms: true,
                  hasCompletedOnboarding: true,
                  athleteName,
                  athleteEmail: email,
                });
                setActiveSection('calendar');
                setWeekOffset(0);
                setSelectedDayDate(toLocalIsoDate(new Date()));
                setSyncToast(`Signed in as ${athleteName} via Intervals.icu OAuth`);
                performSync(true, accessToken);
              }}
            />
          ) : (
          <main className="max-w-5xl mx-auto px-3.5 sm:px-5 pt-3.5 space-y-3.5">
            {/* Scrollable "Intervals Companion" header + Icon-only Settings button (Hidden in Settings) */}
            {activeSection !== 'settings' && (
              <div className="flex items-center justify-between gap-2 pt-0.5 px-0.5">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(null);
                      setActiveSection('calendar');
                    }}
                    className={`text-xl font-extrabold tracking-tight cursor-pointer ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    Intervals Companion
                  </button>
                  <div className="text-[11px] font-mono tabular-nums text-slate-400">
                    {t('app.subtitle.pull_to_sync')} · {syncTiming.lastSyncLabel} ·{' '}
                    {settings.autoSyncHours === 0
                      ? t('app.subtitle.manual_sync')
                      : t('app.subtitle.auto_hours', { hours: settings.autoSyncHours })}
                  </div>
                </div>

                {/* Icon-Only Settings Button in Top-Right Corner */}
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterPopoverOpen(false);
                    setSelectedItem(null);
                    setSettingsSubMenu(null);
                    setActiveSection('settings');
                    scrollToTop();
                  }}
                  aria-label={t('nav.settings')}
                  title={t('nav.settings')}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                      : 'bg-[#161923] border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Detailed View when a Scheduled Workout or Completed Activity is clicked (Full-view in Phone/Tablet Portrait) */}
            {selectedItem && !isTabletLandscape ? (
              <section className="animate-in fade-in duration-150">
                {selectedItem.type === 'planned' ? (
                  <PlannedWorkoutDetail
                    workout={selectedItem.workout}
                    isLight={isLight}
                    t={t}
                    onClose={() => {
                      setSelectedItem(null);
                      setShowFloatingBottomBar(true);
                    }}
                    onSwipePrev={
                      activeFeedItems.length > 1
                        ? () => handleStepActiveItem(-1)
                        : undefined
                    }
                    onSwipeNext={
                      activeFeedItems.length > 1
                        ? () => handleStepActiveItem(1)
                        : undefined
                    }
                    swipeIndexLabel={activeSwipeIndexLabel}
                  />
                ) : (
                  <CompletedActivityDetail
                    activity={selectedItem.activity}
                    isLight={isLight}
                    t={t}
                    onClose={() => {
                      setSelectedItem(null);
                      setShowFloatingBottomBar(true);
                    }}
                    onSwipePrev={
                      activeFeedItems.length > 1
                        ? () => handleStepActiveItem(-1)
                        : undefined
                    }
                    onSwipeNext={
                      activeFeedItems.length > 1
                        ? () => handleStepActiveItem(1)
                        : undefined
                    }
                    swipeIndexLabel={activeSwipeIndexLabel}
                  />
                )}
              </section>
            ) : activeSection === 'settings' ? (
              /* Dedicated Android Settings Menu */
              <SettingsScreen
                settings={settings}
                isLight={isLight}
                isTabletLandscape={isTabletLandscape}
                lastSyncLabel={syncTiming.lastSyncLabel}
                nextSyncLabel={syncTiming.nextSyncLabel}
                t={t}
                availableLanguages={availableLanguages}
                activeSubMenu={settingsSubMenu}
                onSelectSubMenu={(sub) => {
                  setSettingsSubMenu(sub);
                  if (!isTabletLandscape) scrollToTop();
                }}
                onExitSettings={() => {
                  setSettingsSubMenu(null);
                  setActiveSection('calendar');
                  setShowFloatingBottomBar(true);
                  scrollToTop();
                }}
                onSyncLanguagesFromGitHub={syncLanguagesFromGitHub}
                onUpdateSettings={handleUpdateSettings}
                onOpenWebLogin={() => setShowWebLoginSheet(true)}
                onLogout={() => {
                  fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
                  try {
                    localStorage.removeItem(OAUTH_TOKEN_STORAGE_KEY);
                    localStorage.removeItem(LIVE_CACHE_STORAGE_KEY);
                  } catch {
                    // ignore
                  }
                  setLivePayload({ athlete: null, events: [], activities: [], wellness: [] });
                  setSyncState((prev) => ({
                    ...prev,
                    lastSyncedAt: '',
                    isSyncing: false,
                    athleteName: '',
                  }));
                  setOnboardingStep(3);
                  setSettingsSubMenu(null);
                  setActiveSection('calendar');
                  handleUpdateSettings({
                    isLoggedIn: false,
                    hasAcceptedTerms: true,
                    hasCompletedOnboarding: false,
                    athleteName: '',
                    athleteEmail: '',
                  });
                  scrollToTop();
                }}
              />
            ) : (
              /* Calendar & Incoming Views: Single-Column in Phone/Tablet Portrait, Minimal 2-Pane Split in Tablet Landscape */
              <div
                className={
                  isTabletLandscape
                    ? 'grid grid-cols-12 gap-4 items-start'
                    : 'block'
                }
              >
                <div className={isTabletLandscape ? 'col-span-5 min-w-0' : 'w-full'}>
                  {activeSection === 'incoming' ? (
              /* Dedicated Clean Incoming Coach Workouts View (Install App link removed) */
              <section className="space-y-3.5">
                <div
                  className={`rounded-2xl border p-3.5 flex flex-wrap items-center justify-between gap-2 ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-[#161923] border-slate-800/80'
                  }`}
                >
                  <div>
                    <h1 className="text-sm sm:text-base font-bold">
                      {t('incoming.title')}
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('incoming.subtitle', {
                        sports: Array.from(activeSportSet)
                          .map((s) => formatSportLabel(s, t))
                          .join(', '),
                      })}
                    </p>
                  </div>
                </div>

                <div
                  className={
                    isEmulatorActive
                      ? 'grid grid-cols-1 gap-3'
                      : 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
                  }
                >
                  {allIncomingFiltered.map((workout) => {
                    const parsedDate = new Date(`${workout.date}T12:00:00`);
                    const dateLabel = parsedDate.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    });
                    const totalSec = Math.max(
                      workout.durationSec,
                      workout.steps.reduce((acc, s) => Math.max(acc, s.endSec), 0) || 1800
                    );

                    const isCardSelected =
                      selectedItem?.type === 'planned' &&
                      selectedItem.workout.id === workout.id;

                    return (
                      <button
                        key={workout.id}
                        type="button"
                        onClick={() => handleSelectPlanned(workout)}
                        className={`w-full text-left rounded-2xl border p-3.5 space-y-2.5 transition-all cursor-pointer group ${
                          isLight
                            ? isCardSelected
                              ? 'bg-white border-cyan-500 ring-1 ring-cyan-500/40 shadow-md'
                              : 'bg-white border-slate-200 hover:border-cyan-500 shadow-xs'
                            : isCardSelected
                            ? 'bg-[#161923] border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg'
                            : 'bg-[#161923] border-slate-800/90 hover:border-cyan-500/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                                workout.sport === 'Swim'
                                  ? 'bg-sky-500/15 border-sky-500/30'
                                  : workout.sport === 'Strength'
                                  ? 'bg-purple-500/15 border-purple-500/30'
                                  : workout.sport === 'Mobility' ||
                                    workout.sport === 'Pilates' ||
                                    workout.sport === 'Yoga'
                                  ? 'bg-emerald-500/15 border-emerald-500/30'
                                  : 'bg-orange-500/15 border-orange-500/30'
                              }`}
                            >
                              {workout.sport === 'Swim' ? (
                                <Waves className="w-4 h-4 text-sky-400" />
                              ) : workout.sport === 'Strength' ? (
                                <Dumbbell className="w-4 h-4 text-purple-400" />
                              ) : workout.sport === 'Mobility' ||
                                workout.sport === 'Pilates' ||
                                workout.sport === 'Yoga' ? (
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                              ) : workout.sport === 'Run' ? (
                                <Footprints className="w-4 h-4 text-orange-400" />
                              ) : (
                                <Activity className="w-4 h-4 text-cyan-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold group-hover:text-cyan-500 transition-colors truncate">
                                {workout.name}
                              </div>
                              <div className="text-xs text-slate-400 font-mono tabular-nums">
                                {workout.sport} · {dateLabel} · {workout.startTime || '08:00 AM'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono tabular-nums shrink-0">
                            <div className="text-sm font-bold">
                              {formatDist(workout.distanceKm, workout.durationLabel)}
                            </div>
                            <div className="text-xs text-slate-400">
                              {workout.durationLabel} · Load {workout.load}
                            </div>
                          </div>
                        </div>

                        {/* Mini Pace-Time Preview Diagram — Shown ONLY for Running workouts */}
                        {workout.sport === 'Run' && workout.steps.length > 0 && (
                          <div
                            className={`w-full h-9 rounded-lg px-1 pt-1 flex items-end gap-[1px] overflow-hidden border ${
                              isLight
                                ? 'bg-slate-100 border-slate-200'
                                : 'bg-[#10131b] border-slate-800/80'
                            }`}
                          >
                            {workout.steps.map((step) => {
                              const widthPct = (step.durationSec / totalSec) * 100;
                              const isFast = step.zone === 'Z4' || step.zone === 'Z5';
                              const isMod = step.zone === 'Z2' || step.zone === 'Z3';
                              const heightPct = isFast ? 94 : isMod ? 70 : 50;
                              return (
                                <div
                                  key={step.id}
                                  style={{
                                    width: `${Math.max(1.2, widthPct)}%`,
                                    height: `${heightPct}%`,
                                    backgroundColor: step.color,
                                  }}
                                  className="rounded-t-[1px]"
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Brief Coach Instruction Summary */}
                        <div className="space-y-0.5 text-xs font-mono tabular-nums text-slate-400">
                          {workout.instructionGroups.slice(0, 2).map((grp) => (
                            <div key={grp.id} className="truncate">
                              {grp.repeatCount ? `${grp.repeatCount}x ` : ''}
                              {grp.items.map((i) => i.text).join(' + ')}
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                  {allIncomingFiltered.length === 0 && (
                    <div
                      className={`rounded-2xl border p-8 text-center text-xs text-slate-400 ${
                        isLight
                          ? 'bg-white border-slate-200 shadow-xs'
                          : 'bg-[#161923] border-slate-800/80'
                      }`}
                    >
                      {t('calendar.rest_empty')}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              /* Clean Calendar View */
              <section className="space-y-3.5">
                {/* Compact Week Header with Unlimited < and > Week Navigation */}
                <div
                  className={`rounded-2xl border p-3 space-y-2.5 ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-[#161923] border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWeekOffset((prev) => prev - 1);
                        setSelectedDayDate('ALL');
                      }}
                      className={`min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200'
                      }`}
                      aria-label="Previous week"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs sm:text-sm font-bold">
                          {t('calendar.week', { num: activeWeek.weekNumber })} · {activeWeek.dateRangeLabel}
                        </span>
                        {weekOffset !== 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setWeekOffset(0);
                              setSelectedDayDate(toLocalIsoDate(new Date()));
                            }}
                            className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/40 text-sky-400 text-[10px] font-mono font-bold hover:bg-sky-500/25 cursor-pointer"
                          >
                            {t('calendar.today')}
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {feedFilter === 'all'
                          ? t('calendar.status.all')
                          : feedFilter === 'scheduled'
                          ? t('calendar.status.incoming')
                          : t('calendar.status.done')}{' '}
                        ·{' '}
                        {Array.from(activeSportSet)
                          .map((s) => formatSportLabel(s, t))
                          .join(', ')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setWeekOffset((prev) => prev + 1);
                        setSelectedDayDate('ALL');
                      }}
                      className={`min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200'
                      }`}
                      aria-label="Next week"
                      title="Next week"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Compact 7-Day Selector Strip */}
                  <div
                    ref={dayStripRef}
                    className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 scroll-smooth"
                  >
                    <button
                      type="button"
                      data-day-pill="ALL"
                      onClick={() => setSelectedDayDate('ALL')}
                      className={`min-h-[44px] px-3 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                        selectedDayDate === 'ALL'
                          ? 'bg-[#3b388f] text-white border-indigo-400/60 font-bold'
                          : isLight
                          ? 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          : 'bg-[#11141d] text-slate-300 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {t('calendar.all_week')}
                    </button>

                    {activeWeek.days.map((day) => {
                      const isSelected = selectedDayDate === day.date;
                      const dayCompletedCount = day.completedActivities.filter((a) =>
                        activeSportSet.has(a.sport)
                      ).length;
                      const dayPlannedCount = day.scheduledWorkouts.filter((w) =>
                        activeSportSet.has(w.sport)
                      ).length;

                      return (
                        <button
                          key={day.date}
                          type="button"
                          data-day-pill={day.date}
                          onClick={() => setSelectedDayDate(isSelected ? 'ALL' : day.date)}
                          className={`min-h-[44px] min-w-[60px] px-2.5 py-1 rounded-xl flex flex-col items-center justify-center transition-colors shrink-0 cursor-pointer border ${
                            isSelected
                              ? 'bg-[#3b388f] text-white border-indigo-400/60 font-bold'
                              : day.isToday
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/60'
                              : isLight
                              ? 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                              : 'bg-[#11141d] text-slate-300 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-wider opacity-80">
                            {day.dayShort}
                          </span>
                          <span className="text-xs font-mono tabular-nums font-bold">
                            {day.dayNumber}
                          </span>
                          <div className="flex items-center gap-1 text-[9px] font-mono">
                            {dayCompletedCount > 0 && (
                              <span className={isSelected ? 'text-emerald-200' : 'text-emerald-400'}>
                                {dayCompletedCount}✓
                              </span>
                            )}
                            {dayPlannedCount > 0 && (
                              <span className={isSelected ? 'text-amber-200' : 'text-orange-400'}>
                                {dayPlannedCount}P
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Day-by-Day Schedule Filtered by Status & Checked Workout Types */}
                <div
                  className={
                    isEmulatorActive || selectedDayDate !== 'ALL'
                      ? 'grid grid-cols-1 gap-3'
                      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-start'
                  }
                >
                  {visibleDays.map((day) => {
                    const showCompleted = feedFilter === 'all' || feedFilter === 'completed';
                    const showScheduled = feedFilter === 'all' || feedFilter === 'scheduled';

                    const completedList = showCompleted
                      ? day.completedActivities.filter((a) => activeSportSet.has(a.sport))
                      : [];
                    const scheduledList = showScheduled
                      ? day.scheduledWorkouts.filter((w) => activeSportSet.has(w.sport))
                      : [];

                    return (
                      <div
                        key={day.date}
                        className={`rounded-2xl border p-3 space-y-2.5 ${
                          day.isToday
                            ? isLight
                              ? 'bg-white border-sky-500 ring-1 ring-sky-500/30 shadow-xs'
                              : 'bg-[#151821] border-sky-500/80 ring-1 ring-sky-500/30'
                            : isLight
                            ? 'bg-white border-slate-200 shadow-xs'
                            : 'bg-[#151821] border-slate-800/80'
                        }`}
                      >
                        {/* Simple Day Header */}
                        <div
                          className={`pb-1.5 border-b flex items-center justify-between ${
                            isLight ? 'border-slate-100' : 'border-slate-800/80'
                          }`}
                        >
                          <span
                            className={`text-xs font-bold ${
                              day.isToday
                                ? 'text-sky-500'
                                : isLight
                                ? 'text-slate-800'
                                : 'text-slate-200'
                            }`}
                          >
                            {day.dayShort} {day.dayNumber} {day.monthShort}
                          </span>
                          {day.isToday && (
                            <span className="text-[11px] font-medium text-sky-500">
                              {t('calendar.today')}
                            </span>
                          )}
                        </div>

                        {/* Incoming Scheduled Workouts */}
                        {scheduledList.length > 0 && (
                          <div className="space-y-2">
                            {scheduledList.map((workout) => (
                              <PlannedWorkoutCard
                                key={workout.id}
                                workout={workout}
                                isSelected={
                                  selectedItem?.type === 'planned' &&
                                  selectedItem.workout.id === workout.id
                                }
                                isLight={isLight}
                                t={t}
                                onSelect={handleSelectPlanned}
                              />
                            ))}
                          </div>
                        )}

                        {/* Completed Activities */}
                        {completedList.length > 0 && (
                          <div className="space-y-2">
                            {completedList.map((activity) => (
                              <CompletedActivityCard
                                key={activity.id}
                                activity={activity}
                                isSelected={
                                  selectedItem?.type === 'completed' &&
                                  selectedItem.activity.id === activity.id
                                }
                                isLight={isLight}
                                t={t}
                                onSelect={handleSelectCompleted}
                              />
                            ))}
                          </div>
                        )}

                        {scheduledList.length === 0 && completedList.length === 0 && (
                          <div className="py-3 text-center text-[11px] text-slate-400">
                            {t('calendar.rest_empty')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
                  )}
                </div>

                {/* Right Detail Pane for Tablet Landscape (Minimal 2-Pane Master-Detail Support) */}
                {isTabletLandscape && (
                  <div className="col-span-7 min-w-0 sticky top-2">
                    {selectedItem ? (
                      selectedItem.type === 'planned' ? (
                        <PlannedWorkoutDetail
                          workout={selectedItem.workout}
                          isLight={isLight}
                          t={t}
                          onClose={() => {
                            setSelectedItem(null);
                            setShowFloatingBottomBar(true);
                          }}
                          onSwipePrev={
                            activeFeedItems.length > 1
                              ? () => handleStepActiveItem(-1)
                              : undefined
                          }
                          onSwipeNext={
                            activeFeedItems.length > 1
                              ? () => handleStepActiveItem(1)
                              : undefined
                          }
                          swipeIndexLabel={activeSwipeIndexLabel}
                        />
                      ) : (
                        <CompletedActivityDetail
                          activity={selectedItem.activity}
                          isLight={isLight}
                          t={t}
                          onClose={() => {
                            setSelectedItem(null);
                            setShowFloatingBottomBar(true);
                          }}
                          onSwipePrev={
                            activeFeedItems.length > 1
                              ? () => handleStepActiveItem(-1)
                              : undefined
                          }
                          onSwipeNext={
                            activeFeedItems.length > 1
                              ? () => handleStepActiveItem(1)
                              : undefined
                          }
                          swipeIndexLabel={activeSwipeIndexLabel}
                        />
                      )
                    ) : (
                      <div
                        className={`rounded-2xl border p-8 text-center space-y-2 ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-600 shadow-xs'
                            : 'bg-[#161923] border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-500">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            isLight ? 'text-slate-800' : 'text-slate-200'
                          }`}
                        >
                          Tablet Landscape Split View
                        </div>
                        <p className="text-xs max-w-sm mx-auto leading-relaxed">
                          Select any workout or completed activity card on the left to inspect its pace diagram, intervals, and telemetry side-by-side.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
          )}
        </div>

        {/* Floating Filter Sheet (Opened by the Google Photos-style bottom-right Circular Filter Button) */}
        {!isOnboardingActive && isFilterPopoverOpen && (!selectedItem || isTabletLandscape) && activeSection !== 'settings' && (
          <div
            className={`absolute bottom-22 z-40 rounded-3xl border p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-150 ${
              isTabletLandscape
                ? 'w-[360px] left-1/2 -translate-x-1/2'
                : 'left-4 right-4 max-w-md mx-auto'
            } ${
              isLight
                ? 'bg-white/95 border-slate-200 text-slate-900'
                : 'bg-[#151829]/96 border-white/15 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/40">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  {t('filter.title')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterPopoverOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close filter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Status Filter Slider: All, Incoming, Done */}
            <div className="pt-3 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                {t('filter.status_label')}
              </div>
              <div
                className={`grid grid-cols-3 gap-1 p-1 rounded-2xl border ${
                  isLight
                    ? 'bg-slate-100 border-slate-200'
                    : 'bg-[#0d101b] border-slate-800'
                }`}
              >
                {(
                  [
                    { id: 'all', label: t('filter.status.all') },
                    { id: 'scheduled', label: t('filter.status.incoming') },
                    { id: 'completed', label: t('filter.status.done') },
                  ] as { id: FeedFilter; label: string }[]
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFeedFilter(f.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      feedFilter === f.id
                        ? 'bg-[#3b388f] text-white shadow-sm'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Dynamic Workout Types Filter (Populated from all sports in the athlete's account) */}
            <div className="pt-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  {t('filter.types_label')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFeedFilter('all');
                    setExcludedFilterSports([]);
                  }}
                  className="text-[11px] font-semibold text-indigo-400 hover:underline cursor-pointer"
                >
                  {t('filter.select_all')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                {availableFilterSportOptions.map((item) => {
                  const isChecked = activeSportSet.has(item.sport);
                  return (
                    <button
                      key={item.sport}
                      type="button"
                      onClick={() => handleToggleFilterSport(item.sport)}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#3b388f]/25 border-indigo-400/70 text-white font-semibold'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-500'
                          : 'bg-[#0d101b] border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          style={{ backgroundColor: item.badgeColor }}
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                        />
                        <span
                          className={`text-xs truncate ${
                            isLight && isChecked ? 'text-slate-900' : ''
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                          isChecked
                            ? 'bg-[#3b388f] border-indigo-400 text-white'
                            : 'border-slate-600'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Google Photos-Style Floating Bottom Dock + Detached Circular Filter Button (Hidden in Settings & Onboarding) */}
        {!isOnboardingActive && activeSection !== 'settings' && (
        <div
          aria-label="App navigation and filter"
          className={`absolute bottom-4 left-4 right-4 z-30 flex items-center justify-center gap-3 pointer-events-none transition-all duration-300 ${
            showFloatingBottomBar && (!selectedItem || isTabletLandscape)
              ? 'translate-y-0 opacity-100'
              : 'translate-y-24 opacity-0'
          }`}
        >
          {/* Left/Center Floating Pill Capsule (Calendar & Incoming) */}
          <div
            className={`pointer-events-auto h-14 p-1.5 rounded-full border shadow-2xl backdrop-blur-xl flex items-center gap-1 ${
              isLight
                ? 'bg-white/95 border-slate-200/90 text-slate-800'
                : 'bg-[#151829]/95 border-white/10 text-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActiveSection('calendar');
                setSelectedItem(null);
              }}
              className={`h-full px-5 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSection === 'calendar'
                  ? 'bg-[#3b388f] text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-200/90 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{t('nav.calendar')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('incoming');
                setSelectedItem(null);
              }}
              className={`h-full px-5 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSection === 'incoming'
                  ? 'bg-[#3b388f] text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-200/90 hover:text-white'
              }`}
            >
              <CalendarClock className="w-4 h-4 shrink-0" />
              <span>{t('nav.incoming')}</span>
            </button>
          </div>

          {/* Right Detached Circular Filter Button (Matches Google Photos Circular Search Button) */}
          <button
            type="button"
            onClick={() => setIsFilterPopoverOpen((prev) => !prev)}
            aria-label={t('nav.filter')}
            title={t('nav.filter')}
            className={`pointer-events-auto relative w-14 h-14 rounded-full border shadow-2xl backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isFilterPopoverOpen || hasCustomFilterActive
                ? 'bg-[#3b388f] border-indigo-400/70 text-white'
                : isLight
                ? 'bg-white/95 border-slate-200/90 text-slate-800 hover:bg-slate-100'
                : 'bg-[#151829]/95 border-white/10 text-slate-100 hover:border-white/25'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {hasCustomFilterActive && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-[#151829]" />
            )}
          </button>
        </div>
        )}

        {showWebLoginSheet && (
          <IntervalsWebLoginSheet
            defaultEmail={settings.athleteEmail}
            onSuccessLogin={(athleteName, email, accessToken) => {
              handleUpdateSettings({
                isLoggedIn: true,
                hasAcceptedTerms: true,
                hasCompletedOnboarding: true,
                athleteName,
                athleteEmail: email,
              });
              setShowWebLoginSheet(false);
              setWeekOffset(0);
              setSelectedDayDate(toLocalIsoDate(new Date()));
              setSyncToast(`Signed in as ${athleteName} via Intervals.icu OAuth`);
              performSync(true, accessToken);
            }}
            onClose={() => setShowWebLoginSheet(false)}
          />
        )}

        {showKotlinModal && (
          <KotlinExportModal onClose={() => setShowKotlinModal(false)} />
        )}

        <OfflineIndicator />
      </div>
    </AndroidEmulatorFrame>
  );
}
