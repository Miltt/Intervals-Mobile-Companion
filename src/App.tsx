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
} from './types/settings';
import {
  buildWeekForOffset,
  formatRelativeSyncTime,
  getMondayOfWeek,
  LiveIntervalsPayload,
  toLocalIsoDate,
} from './utils/formatters';
import { CompletedActivityCard, PlannedWorkoutCard } from './components/CalendarCards';
import { PlannedWorkoutDetail } from './components/PlannedWorkoutDetail';
import { CompletedActivityDetail } from './components/CompletedActivityDetail';
import { OfflineIndicator } from './components/PWAInstallButton';
import { KotlinExportModal } from './components/KotlinExportModal';
import { AndroidEmulatorFrame } from './components/AndroidEmulatorFrame';
import { SettingsScreen, SettingsSubMenu } from './components/SettingsScreen';
import { IntervalsWebLoginSheet } from './components/IntervalsWebLoginSheet';
import { useLocalization } from './i18n/useTranslation';

const LIVE_CACHE_STORAGE_KEY = 'intervals_icu_companion_live_payload_v5';
const OAUTH_TOKEN_STORAGE_KEY = 'intervals_icu_oauth_token_v5';
const SETTINGS_STORAGE_KEY = 'intervals_icu_companion_settings_v4';
const PULL_REFRESH_THRESHOLD = 62;

type NavSection = 'calendar' | 'incoming' | 'settings';
type FeedFilter = 'all' | 'scheduled' | 'completed';

type SelectedItem =
  | { type: 'planned'; workout: PlannedWorkout }
  | { type: 'completed'; activity: CompletedActivity }
  | null;

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
        const isLegacyMock =
          parsed.athleteEmail === 'athlete@example.com' ||
          parsed.athleteName === 'Intervals.icu Athlete';

        return {
          ...DEFAULT_APP_SETTINGS,
          ...parsed,
          isLoggedIn: hasOAuth ? true : isLegacyMock ? false : Boolean(parsed.isLoggedIn),
          athleteName: hasOAuth
            ? oauthData.athleteName || parsed.athleteName || 'Intervals.icu Athlete'
            : isLegacyMock
              ? ''
              : parsed.athleteName || '',
          athleteEmail: hasOAuth
            ? oauthData.athleteId
              ? `ID: ${oauthData.athleteId} (OAuth 2.0)`
              : parsed.athleteEmail || 'OAuth 2.0 Connected'
            : isLegacyMock
              ? ''
              : parsed.athleteEmail || '',
          enabledSports:
            Array.isArray(parsed.enabledSports) && parsed.enabledSports.length > 0
              ? parsed.enabledSports
              : DEFAULT_APP_SETTINGS.enabledSports,
        };
      }

      if (hasOAuth) {
        return {
          ...DEFAULT_APP_SETTINGS,
          isLoggedIn: true,
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
  // Default selection is 'ALL' so the user sees the full Current Week (with Today highlighted)
  const [selectedDayDate, setSelectedDayDate] = useState<string | 'ALL'>('ALL');
  const [activeSection, setActiveSection] = useState<NavSection>('calendar');
  const [settingsSubMenu, setSettingsSubMenu] = useState<SettingsSubMenu>(null);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  // Active workout type filter inside the bottom-right Filter popup.
  // Only sports enabled in Settings are visible in the filter UI.
  const [selectedFilterSports, setSelectedFilterSports] = useState<SportType[]>(
    () => settings.enabledSports
  );
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false);

  // Keep selectedFilterSports synchronized when user checks/unchecks activity types in Settings
  const handleUpdateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (partial.enabledSports) {
        const newlyAdded = partial.enabledSports.filter(
          (s) => !prev.enabledSports.includes(s)
        );
        setSelectedFilterSports((prevFilter) => {
          const kept = prevFilter.filter((s) => partial.enabledSports!.includes(s));
          const combined = Array.from(new Set([...kept, ...newlyAdded]));
          return combined.length > 0 ? combined : partial.enabledSports!;
        });
      }
      return next;
    });
  }, []);

  // Effective sports shown on the calendar after applying the bottom-right Filter button
  const activeSportSet = useMemo(() => {
    const valid = selectedFilterSports.filter((s) => settings.enabledSports.includes(s));
    return new Set<SportType>(valid.length > 0 ? valid : settings.enabledSports);
  }, [selectedFilterSports, settings.enabledSports]);

  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [showKotlinModal, setShowKotlinModal] = useState<boolean>(false);
  const [showWebLoginSheet, setShowWebLoginSheet] = useState<boolean>(false);
  const [isEmulatorActive, setIsEmulatorActive] = useState<boolean>(true);

  // Scroll & Floating Bottom Bar state
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
    const nextAuto = new Date(baseTime + 12 * 60 * 60 * 1000).toISOString();
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
    () => buildWeekForOffset(weekOffset, livePayload, settings.enabledSports),
    [weekOffset, livePayload, settings.enabledSports]
  );

  // Build multi-week range around current week for Incoming Workouts tab & activity stepping
  const multiWeeksRange: WeekSummary[] = useMemo(() => {
    const list: WeekSummary[] = [];
    for (let offset = -4; offset <= 4; offset++) {
      list.push(buildWeekForOffset(offset, livePayload, settings.enabledSports));
    }
    return list;
  }, [livePayload, settings.enabledSports]);

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

        const response = await fetch('/api/intervals/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${storedToken}`,
          },
          body: JSON.stringify({
            oldest: toLocalIsoDate(oldestDate),
            newest: toLocalIsoDate(newestDate),
            enabledSports: settings.enabledSports,
          }),
        });

        const data = await response.json().catch(() => ({}));
        const nowIso = new Date().toISOString();
        const intervalMs = autoSyncIntervalMs || 12 * 60 * 60 * 1000;
        const nextIso = new Date(Date.now() + intervalMs).toISOString();

        if (response.ok && data.mode === 'live') {
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
              data.error
                ? `Sync notice: ${data.error}`
                : 'Sign in with Intervals.icu in Settings → Account to sync live workouts.'
            );
          }
        }
      } catch {
        const intervalMs = autoSyncIntervalMs || 12 * 60 * 60 * 1000;
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
    [settings.lookaheadDays, settings.enabledSports, autoSyncIntervalMs, handleUpdateSettings]
  );

  // Listen for OAuth 2.0 Web Browser Login popup completion (Trigger #1: First Login)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const name = event.data?.athleteName || 'Intervals.icu Athlete';
        const athleteId = event.data?.athleteId || '0';
        const accessToken = event.data?.accessToken || '';
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
          athleteName: name,
          athleteEmail: `Athlete #${athleteId}`,
        });
        setShowWebLoginSheet(false);
        setWeekOffset(0);
        setSelectedDayDate('ALL');
        setSyncToast(`Signed in as ${name} via Intervals.icu OAuth`);
        performSync(true, accessToken);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleUpdateSettings, performSync]);

  useEffect(() => {
    if (!syncToast) return;
    const t = setTimeout(() => setSyncToast(null), 3200);
    return () => clearTimeout(t);
  }, [syncToast]);

  const syncTiming = useMemo(
    () => formatRelativeSyncTime(syncState.lastSyncedAt),
    [syncState.lastSyncedAt]
  );

  const allCompletedFiltered = useMemo(
    () =>
      multiWeeksRange.flatMap((w) =>
        w.days.flatMap((d) =>
          d.completedActivities.filter((a) => activeSportSet.has(a.sport))
        )
      ),
    [multiWeeksRange, activeSportSet]
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

  // Pull-down gesture handlers (disabled inside Settings)
  const beginPull = (clientY: number) => {
    const scroller = scrollContainerRef.current;
    if (
      !scroller ||
      scroller.scrollTop > 2 ||
      syncState.isSyncing ||
      activeSection === 'settings'
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

  const handleToggleWorkoutComplete = (workoutId: string) => {
    if (selectedItem?.type === 'planned' && selectedItem.workout.id === workoutId) {
      setSelectedItem((prev) =>
        prev && prev.type === 'planned'
          ? {
              type: 'planned',
              workout: {
                ...prev.workout,
                complianceStatus:
                  prev.workout.complianceStatus === 'completed' ? 'upcoming' : 'completed',
              },
            }
          : prev
      );
    }
  };

  const handleSelectPlanned = (workout: PlannedWorkout) => {
    setIsFilterPopoverOpen(false);
    setSelectedItem({ type: 'planned', workout });
    scrollToTop();
  };

  const handleSelectCompleted = (activity: CompletedActivity) => {
    setIsFilterPopoverOpen(false);
    setSelectedItem({ type: 'completed', activity });
    scrollToTop();
  };

  const handleStepCompletedActivity = (direction: -1 | 1) => {
    if (selectedItem?.type !== 'completed' || allCompletedFiltered.length === 0) return;
    const idx = allCompletedFiltered.findIndex((a) => a.id === selectedItem.activity.id);
    if (idx === -1) return;
    const nextIdx =
      (idx + direction + allCompletedFiltered.length) % allCompletedFiltered.length;
    setSelectedItem({ type: 'completed', activity: allCompletedFiltered[nextIdx] });
  };

  const handleToggleFilterSport = (sport: SportType) => {
    setSelectedFilterSports((prev) => {
      const validPrev = prev.filter((s) => settings.enabledSports.includes(s));
      const exists = validPrev.includes(sport);
      if (exists) {
        if (validPrev.length <= 1) return validPrev; // Keep at least 1 checked
        return validPrev.filter((s) => s !== sport);
      }
      return [...validPrev, sport];
    });
  };

  const showPullIndicator =
    activeSection !== 'settings' && (pullDistance > 6 || syncState.isSyncing);
  const isReadyToRelease = pullDistance >= PULL_REFRESH_THRESHOLD;

  const formatDist = (km?: number, fallback?: string) => {
    if (!km) return fallback || '';
    if (settings.units === 'imperial') {
      return `${(km * 0.621371).toFixed(1)} mi`;
    }
    return `${km} km`;
  };

  // Only show workout types in the bottom-right Filter popup that the user checked in Settings
  const availableFilterSportOptions = useMemo(
    () =>
      CONFIGURABLE_SPORT_TYPES.filter((meta) =>
        settings.enabledSports.includes(meta.sport)
      ),
    [settings.enabledSports]
  );

  const hasCustomFilterActive =
    feedFilter !== 'all' || activeSportSet.size < settings.enabledSports.length;

  return (
    <AndroidEmulatorFrame
      isEmulatorActive={isEmulatorActive}
      onToggleEmulator={() => setIsEmulatorActive((prev) => !prev)}
      onBackGesture={() => {
        if (isFilterPopoverOpen) {
          setIsFilterPopoverOpen(false);
        } else if (selectedItem) {
          setSelectedItem(null);
          setShowFloatingBottomBar(true);
        } else if (activeSection === 'settings' && settingsSubMenu !== null) {
          setSettingsSubMenu(null);
          scrollToTop();
        } else if (activeSection !== 'calendar') {
          setSettingsSubMenu(null);
          setActiveSection('calendar');
          setShowFloatingBottomBar(true);
        }
      }}
      onHomeGesture={() => {
        setIsFilterPopoverOpen(false);
        setSelectedItem(null);
        setSettingsSubMenu(null);
        setActiveSection('calendar');
        setShowFloatingBottomBar(true);
      }}
      onForceCollect={() => performSync(true)}
      onOpenKotlinCode={() => setShowKotlinModal(true)}
      isSyncing={syncState.isSyncing}
      lastSyncLabel={syncTiming.lastSyncLabel}
    >
      <div
        className={`relative flex-1 min-h-0 flex flex-col overflow-hidden transition-colors duration-200 ${
          isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f1117] text-slate-100'
        }`}
      >
        {/* Android Pull-Down to Force Collect Indicator (Hidden in Settings) */}
        <div
          style={{
            height:
              activeSection === 'settings'
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

            {/* Detailed View when a Scheduled Workout or Completed Activity is clicked */}
            {selectedItem ? (
              <section className="animate-in fade-in duration-150">
                {selectedItem.type === 'planned' ? (
                  <PlannedWorkoutDetail
                    workout={selectedItem.workout}
                    t={t}
                    onClose={() => {
                      setSelectedItem(null);
                      setShowFloatingBottomBar(true);
                    }}
                    onToggleComplete={handleToggleWorkoutComplete}
                  />
                ) : (
                  <CompletedActivityDetail
                    activity={selectedItem.activity}
                    t={t}
                    onClose={() => {
                      setSelectedItem(null);
                      setShowFloatingBottomBar(true);
                    }}
                    onPrevActivity={() => handleStepCompletedActivity(-1)}
                    onNextActivity={() => handleStepCompletedActivity(1)}
                  />
                )}
              </section>
            ) : activeSection === 'settings' ? (
              /* Dedicated Android Settings Menu */
              <SettingsScreen
                settings={settings}
                isLight={isLight}
                lastSyncLabel={syncTiming.lastSyncLabel}
                nextSyncLabel={syncTiming.nextSyncLabel}
                t={t}
                availableLanguages={availableLanguages}
                activeSubMenu={settingsSubMenu}
                onSelectSubMenu={(sub) => {
                  setSettingsSubMenu(sub);
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
                  handleUpdateSettings({
                    isLoggedIn: false,
                    athleteName: '',
                    athleteEmail: '',
                  });
                }}
              />
            ) : activeSection === 'incoming' ? (
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
                          .map((s) => t(`sport.${s}`))
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

                    return (
                      <button
                        key={workout.id}
                        type="button"
                        onClick={() => handleSelectPlanned(workout)}
                        className={`w-full text-left rounded-2xl border p-3.5 space-y-2.5 transition-all cursor-pointer group ${
                          isLight
                            ? 'bg-white border-slate-200 hover:border-cyan-500 shadow-xs'
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
                              setSelectedDayDate('ALL');
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
                          .map((s) => t(`sport.${s}`))
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
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                    <button
                      type="button"
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
          </main>
        </div>

        {/* Floating Filter Sheet (Opened by the Google Photos-style bottom-right Circular Filter Button) */}
        {isFilterPopoverOpen && !selectedItem && activeSection !== 'settings' && (
          <div
            className={`absolute bottom-22 left-4 right-4 z-40 rounded-3xl border p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-150 ${
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

            {/* 2. Workout Types Filter (Only shows types checked in Settings!) */}
            <div className="pt-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  {t('filter.types_label')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFeedFilter('all');
                    setSelectedFilterSports(settings.enabledSports);
                  }}
                  className="text-[11px] font-semibold text-indigo-400 hover:underline cursor-pointer"
                >
                  {t('filter.select_all')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                          {t(`sport.${item.sport}`)}
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

        {/* Google Photos-Style Floating Bottom Dock + Detached Circular Filter Button (Hidden in Settings) */}
        {activeSection !== 'settings' && (
        <div
          aria-label="App navigation and filter"
          className={`absolute bottom-4 left-4 right-4 z-30 flex items-center justify-center gap-3 pointer-events-none transition-all duration-300 ${
            showFloatingBottomBar && !selectedItem
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
                athleteName,
                athleteEmail: email,
              });
              setShowWebLoginSheet(false);
              setWeekOffset(0);
              setSelectedDayDate('ALL');
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
