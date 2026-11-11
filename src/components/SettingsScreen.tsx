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
  Info,
  Languages,
  Laptop,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
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
import { LocaleMeta } from '../i18n/useTranslation';

interface SettingsScreenProps {
  settings: AppSettings;
  isLight: boolean;
  lastSyncLabel: string;
  nextSyncLabel: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLanguages: LocaleMeta[];
  onSyncLanguagesFromGitHub: () => Promise<number>;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onOpenWebLogin: () => void;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  isLight,
  lastSyncLabel,
  nextSyncLabel,
  t,
  availableLanguages,
  onSyncLanguagesFromGitHub,
  onUpdateSettings,
  onOpenWebLogin,
  onLogout,
}) => {
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [showLanguageInfo, setShowLanguageInfo] = useState<boolean>(false);

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
    flashSaved(`${t(`sport.${sport}`)} ${isChecked ? '−' : '+'}`);
  };

  const cardClass = isLight
    ? 'rounded-2xl bg-white border border-slate-200 p-4 space-y-3.5 shadow-sm'
    : 'rounded-2xl bg-[#161923] border border-slate-800/90 p-4 space-y-3.5';

  const labelClass = isLight
    ? 'text-xs font-bold uppercase tracking-wider text-slate-500 font-mono'
    : 'text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono';

  const subTextClass = isLight ? 'text-xs text-slate-600' : 'text-xs text-slate-400';

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Section: Settings Title & Subtitle Only */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
            {t('settings.title')}
          </h1>
          <p className={subTextClass}>{t('settings.subtitle')}</p>
        </div>

        {savedFeedback && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{savedFeedback}</span>
          </div>
        )}
      </div>

      {/* 1. Intervals.icu Account — Web Browser Login (No Sync Calendar Now button) */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-500" />
            <span className={labelClass}>{t('settings.account.title')}</span>
          </div>
          <span
            className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold ${
              settings.isLoggedIn
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}
          >
            {settings.isLoggedIn
              ? t('settings.account.connected')
              : t('settings.account.not_signed_in')}
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

            <div className="flex items-center justify-end gap-2">
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
                <span>{t('settings.account.switch')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onLogout();
                  flashSaved(t('settings.account.not_signed_in'));
                }}
                className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('settings.account.logout')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className={subTextClass}>{t('settings.account.login_desc')}</p>
            <button
              type="button"
              onClick={onOpenWebLogin}
              className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>{t('settings.account.login_btn')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. App Language — Compact Dropdown (Auto-fetches from GitHub on tap) + Info Hint Icon */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Languages className="w-4 h-4 text-cyan-500 shrink-0" />
            <span className={labelClass}>{t('settings.language.title')}</span>
            <button
              type="button"
              onClick={() => setShowLanguageInfo((prev) => !prev)}
              aria-label="Language info"
              title="Language info"
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                showLanguageInfo
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : isLight
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          <select
            value={settings.language}
            onMouseDown={() => {
              onSyncLanguagesFromGitHub().catch(() => {});
            }}
            onTouchStart={() => {
              onSyncLanguagesFromGitHub().catch(() => {});
            }}
            onChange={(e) => {
              const nextCode = e.target.value;
              onUpdateSettings({ language: nextCode });
              const found = availableLanguages.find((l) => l.code === nextCode);
              if (found) {
                flashSaved(`${found.flag} ${found.nativeName}`);
              }
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:border-cyan-500 ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-[#10131b] border-slate-700 text-slate-100'
            }`}
          >
            {availableLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.nativeName} ({lang.code.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {showLanguageInfo && (
          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed ${
              isLight
                ? 'bg-cyan-50/60 border-cyan-200 text-slate-700'
                : 'bg-[#10131b] border-cyan-500/30 text-slate-300'
            }`}
          >
            {t('settings.language.desc')}
          </div>
        )}
      </div>

      {/* 3. Activity Types to Upload & Display in Calendar */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            <span className={labelClass}>{t('settings.sports.title')}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {t('settings.sports.enabled_count', {
              enabled: settings.enabledSports.length,
              total: CONFIGURABLE_SPORT_TYPES.length,
            })}
          </span>
        </div>

        <p className={subTextClass}>{t('settings.sports.desc')}</p>

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
                    <div className="text-xs font-bold truncate">
                      {t(`sport.${item.sport}`)}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {t(`sport.${item.sport}.desc`)}
                    </div>
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

      {/* 4. Auto-Sync Interval in Hours */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-500" />
            <span className={labelClass}>{t('settings.autosync.title')}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {t('settings.autosync.last', { time: lastSyncLabel })}
          </span>
        </div>

        <p className={subTextClass}>{t('settings.autosync.desc')}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              {
                hours: 6,
                label: t('settings.autosync.6h'),
                sub: t('settings.autosync.6h_sub'),
              },
              {
                hours: 12,
                label: t('settings.autosync.12h'),
                sub: t('settings.autosync.12h_sub'),
              },
              {
                hours: 24,
                label: t('settings.autosync.24h'),
                sub: t('settings.autosync.24h_sub'),
              },
              {
                hours: 0,
                label: t('settings.autosync.manual'),
                sub: t('settings.autosync.manual_sub'),
              },
            ] as { hours: 6 | 12 | 24 | 0; label: string; sub: string }[]
          ).map((item) => {
            const active = settings.autoSyncHours === item.hours;
            return (
              <button
                key={item.hours}
                type="button"
                onClick={() => {
                  onUpdateSettings({ autoSyncHours: item.hours });
                  flashSaved(item.label);
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
            {settings.autoSyncHours === 0
              ? t('settings.autosync.manual')
              : `PeriodicWorkRequest (${settings.autoSyncHours}h)`}
          </span>
          {settings.autoSyncHours > 0 && <span>{nextSyncLabel}</span>}
        </div>
      </div>

      {/* 5. Theme Selector: System, Dark, Light Mode */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-cyan-500" />
          <span className={labelClass}>{t('settings.theme.title')}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'system', label: t('settings.theme.system'), icon: Laptop },
              { id: 'dark', label: t('settings.theme.dark'), icon: Moon },
              { id: 'light', label: t('settings.theme.light'), icon: Sun },
            ] as { id: ThemeMode; label: string; icon: React.FC<{ className?: string }> }[]
          ).map((themeOpt) => {
            const Icon = themeOpt.icon;
            const active = settings.themeMode === themeOpt.id;
            return (
              <button
                key={themeOpt.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({ themeMode: themeOpt.id });
                  flashSaved(themeOpt.label);
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
                <span>{themeOpt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Running Preferences & Background Options (Reset Cache dropped) */}
      <div className={cardClass}>
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-500" />
          <span className={labelClass}>{t('settings.prefs.title')}</span>
        </div>

        {/* Distance & Pace Units */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold">{t('settings.prefs.units')}</div>
            <div className={subTextClass}>{t('settings.prefs.units_sub')}</div>
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
                  flashSaved(u.label);
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

        {/* Calendar Lookahead Window */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/40">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs font-semibold">{t('settings.prefs.lookahead')}</div>
              <div className={subTextClass}>{t('settings.prefs.lookahead_sub')}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {([14, 28] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  onUpdateSettings({ lookaheadDays: days });
                  flashSaved(t('settings.prefs.days', { days }));
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold cursor-pointer ${
                  settings.lookaheadDays === days
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-[#10131b] border-slate-800 text-slate-300'
                }`}
              >
                {t('settings.prefs.days', { days })}
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
                <div className="text-xs font-semibold">{t('settings.prefs.wifi_only')}</div>
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
                <div className="text-xs font-semibold">
                  {t('settings.prefs.morning_digest')}
                </div>
                <div className="text-[11px] text-slate-400">07:00</div>
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
      </div>
    </div>
  );
};


