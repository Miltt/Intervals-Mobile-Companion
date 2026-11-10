import React, { useState } from 'react';
import {
  Activity,
  Bell,
  CalendarRange,
  Check,
  CheckCircle2,
  Clock,
  Gauge,
  Globe,
  Laptop,
  LogOut,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash2,
  User,
  Wifi,
} from 'lucide-react';
import { SportType } from '../types/intervals';
import {
  AppSettings,
  CONFIGURABLE_SPORT_TYPES,
  ThemeMode,
  UnitSystem,
} from '../types/settings';

interface SettingsScreenProps {
  settings: AppSettings;
  isLight: boolean;
  isSyncing: boolean;
  lastSyncLabel: string;
  nextSyncLabel: string;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onTriggerSync: () => void;
  onOpenWebLogin: () => void;
  onLogout: () => void;
  onClearCache: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  isLight,
  isSyncing,
  lastSyncLabel,
  nextSyncLabel,
  onUpdateSettings,
  onTriggerSync,
  onOpenWebLogin,
  onLogout,
  onClearCache,
}) => {
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const flashSaved = (msg: string) => {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(null), 2400);
  };

  const handleToggleEnabledSport = (sport: SportType) => {
    const current = settings.enabledSports || ['Run'];
    const isChecked = current.includes(sport);
    let next: SportType[];

    if (isChecked) {
      if (current.length <= 1) {
        flashSaved('Keep at least one activity type enabled');
        return;
      }
      next = current.filter((s) => s !== sport);
    } else {
      next = [...current, sport];
    }

    onUpdateSettings({ enabledSports: next });
    flashSaved(
      `${sport} ${isChecked ? 'excluded from' : 'added to'} Calendar & Sync`
    );
  };

  const cardClass = isLight
    ? 'rounded-2xl bg-white border border-slate-200 p-4 space-y-3.5 shadow-sm'
    : 'rounded-2xl bg-[#161923] border border-slate-800/90 p-4 space-y-3.5';

  const labelClass = isLight
    ? 'text-xs font-bold uppercase tracking-wider text-slate-500 font-mono'
    : 'text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono';

  const subTextClass = isLight ? 'text-xs text-slate-600' : 'text-xs text-slate-400';

  return (
    <div className="space-y-3.5 pb-8">
      {/* Header Row (No return/back button) */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight">Settings</h1>
          <p className={subTextClass}>
            Intervals.icu web login, activity types, sync schedule &amp; appearance
          </p>
        </div>

        {savedFeedback && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{savedFeedback}</span>
          </div>
        )}
      </div>

      {/* 1. Intervals.icu Account — Simple & Transparent Web Browser Login (No Athlete ID or API Key needed) */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-500" />
            <span className={labelClass}>Intervals.icu Account</span>
          </div>
          <span
            className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold ${
              settings.isLoggedIn
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}
          >
            {settings.isLoggedIn ? 'Connected' : 'Not Signed In'}
          </span>
        </div>

        {settings.isLoggedIn ? (
          <div className="space-y-3">
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#10131b] border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {settings.athleteName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold truncate">
                    {settings.athleteName}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {settings.athleteEmail} · Web OAuth 2.0
                  </div>
                </div>
              </div>

              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onTriggerSync();
                  flashSaved('Syncing calendar with Intervals.icu...');
                }}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Calendar Now'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenWebLogin}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      : 'bg-[#10131b] border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Switch Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    flashSaved('Signed out of Intervals.icu');
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className={subTextClass}>
              Sign in directly through the official Intervals.icu web login form in your browser. Your profile and workouts are linked automatically — no Athlete ID or API key needed.
            </p>
            <button
              type="button"
              onClick={onOpenWebLogin}
              className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>Log in with Intervals.icu (Web Browser)</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Activity Types to Upload & Display in Calendar */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            <span className={labelClass}>Activity Types to Upload &amp; Show in Calendar</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {settings.enabledSports.length} of {CONFIGURABLE_SPORT_TYPES.length} enabled
          </span>
        </div>

        <p className={subTextClass}>
          Check the activity types you want to upload from Intervals.icu and display on the main screen. Checked types will also appear in the bottom-right Calendar Filter button.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CONFIGURABLE_SPORT_TYPES.map((item) => {
            const isChecked = settings.enabledSports.includes(item.sport);
            return (
              <button
                key={item.sport}
                type="button"
                onClick={() => handleToggleEnabledSport(item.sport)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isChecked
                    ? isLight
                      ? 'bg-cyan-50/80 border-cyan-500 text-slate-900'
                      : 'bg-cyan-500/12 border-cyan-500/70 text-slate-100'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                    : 'bg-[#10131b] border-slate-800/90 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    style={{ backgroundColor: item.badgeColor }}
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{item.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">{item.description}</div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                    isChecked
                      ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                      : isLight
                      ? 'bg-white border-slate-300'
                      : 'bg-[#161b26] border-slate-700'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Auto-Sync Interval in Hours */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-500" />
            <span className={labelClass}>Auto-Sync Interval (WorkManager)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Last: {lastSyncLabel}
          </span>
        </div>

        <p className={subTextClass}>
          Choose how frequently Android <code>PeriodicWorkRequest</code> collects incoming workouts in the background. You can always pull down on the calendar to Force Collect.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { hours: 6, label: 'Every 6h', sub: '4x per day' },
              { hours: 12, label: 'Every 12h', sub: '2x/day (Default)' },
              { hours: 24, label: 'Every 24h', sub: 'Once daily' },
              { hours: 0, label: 'Manual Only', sub: 'Pull-to-refresh' },
            ] as { hours: 6 | 12 | 24 | 0; label: string; sub: string }[]
          ).map((item) => {
            const active = settings.autoSyncHours === item.hours;
            return (
              <button
                key={item.hours}
                type="button"
                onClick={() => {
                  onUpdateSettings({ autoSyncHours: item.hours });
                  flashSaved(
                    item.hours === 0
                      ? 'Auto-sync disabled (Manual pull-down only)'
                      : `Auto-sync set to every ${item.hours} hours`
                  );
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 font-bold'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    : 'bg-[#10131b] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-mono font-bold">{item.label}</div>
                <div className={`text-[10px] mt-0.5 ${subTextClass}`}>{item.sub}</div>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-0.5">
          <span>
            Status:{' '}
            {settings.autoSyncHours === 0
              ? 'Manual pull-down gesture only'
              : `Active (${settings.autoSyncHours}h PeriodicWorkRequest)`}
          </span>
          {settings.autoSyncHours > 0 && <span>Next auto-sync: {nextSyncLabel}</span>}
        </div>
      </div>

      {/* 4. Theme Selector: System, Dark, Light Mode */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-cyan-500" />
          <span className={labelClass}>Appearance (System / Dark / Light)</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'system', label: 'System', icon: Laptop },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'light', label: 'Light', icon: Sun },
            ] as { id: ThemeMode; label: string; icon: React.FC<{ className?: string }> }[]
          ).map((t) => {
            const Icon = t.icon;
            const active = settings.themeMode === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({ themeMode: t.id });
                  flashSaved(`Theme set to ${t.label}`);
                }}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    : 'bg-[#10131b] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Running Preferences & Background Options */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-500" />
          <span className={labelClass}>Running Preferences &amp; Background Options</span>
        </div>

        {/* Distance & Pace Units */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold">Pace &amp; Distance Units</div>
            <div className={subTextClass}>Used for workout cards and pace step diagrams</div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/20 border border-slate-700/40">
            {(
              [
                { id: 'metric', label: 'km · min/km' },
                { id: 'imperial', label: 'mi · min/mi' },
              ] as { id: UnitSystem; label: string }[]
            ).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({ units: u.id });
                  flashSaved(`Units set to ${u.label}`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  settings.units === u.id
                    ? 'bg-cyan-600 text-white'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        {/* 100% Threshold Pace Reference */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/40">
          <div>
            <div className="text-xs font-semibold">100% Threshold Pace Reference</div>
            <div className={subTextClass}>
              Converts coach % pace targets (e.g. 90-100% Pace) into min/km
            </div>
          </div>
          <select
            value={settings.thresholdPaceFormatted}
            onChange={(e) => {
              onUpdateSettings({ thresholdPaceFormatted: e.target.value });
              flashSaved(`Threshold pace updated to ${e.target.value}`);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-[#10131b] border-slate-700 text-slate-100'
            }`}
          >
            <option value="3:10/km">3:10/km (Elite)</option>
            <option value="3:20/km">3:20/km (Default)</option>
            <option value="3:35/km">3:35/km (Sub-2:35 Mara)</option>
            <option value="3:50/km">3:50/km (Sub-2:45 Mara)</option>
            <option value="4:15/km">4:15/km (Sub-3:00 Mara)</option>
          </select>
        </div>

        {/* Calendar Lookahead Window */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/40">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs font-semibold">Incoming Workouts Lookahead</div>
              <div className={subTextClass}>How many days ahead to fetch from Intervals.icu</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {([14, 28] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  onUpdateSettings({ lookaheadDays: days });
                  flashSaved(`Lookahead window set to ${days} days`);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold cursor-pointer ${
                  settings.lookaheadDays === days
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-[#10131b] border-slate-800 text-slate-300'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* Wi-Fi Only & Morning Notification Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/40">
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ wifiOnlySync: !settings.wifiOnlySync })
            }
            className={`p-3 rounded-xl border flex items-center justify-between text-left cursor-pointer ${
              settings.wifiOnlySync
                ? 'bg-cyan-500/10 border-cyan-500/50'
                : isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-[#10131b] border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Auto-Sync on Wi-Fi Only</div>
                <div className="text-[11px] text-slate-400">WorkManager UNMETERED</div>
              </div>
            </div>
            <span
              className={`text-xs font-mono font-bold ${
                settings.wifiOnlySync ? 'text-cyan-400' : 'text-slate-500'
              }`}
            >
              {settings.wifiOnlySync ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                morningWorkoutNotification: !settings.morningWorkoutNotification,
              })
            }
            className={`p-3 rounded-xl border flex items-center justify-between text-left cursor-pointer ${
              settings.morningWorkoutNotification
                ? 'bg-emerald-500/10 border-emerald-500/50'
                : isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-[#10131b] border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold">Morning Workout Digest</div>
                <div className="text-[11px] text-slate-400">07:00 summary notification</div>
              </div>
            </div>
            <span
              className={`text-xs font-mono font-bold ${
                settings.morningWorkoutNotification ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {settings.morningWorkoutNotification ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* Clear Local Cache */}
        <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between">
          <span className={subTextClass}>
            Reset cached workouts and restore default schedule
          </span>
          <button
            type="button"
            onClick={() => {
              onClearCache();
              flashSaved('Local workout cache cleared');
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Cache</span>
          </button>
        </div>
      </div>
    </div>
  );
};
