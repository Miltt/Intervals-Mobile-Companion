import React, { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Bell,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  Info,
  Languages,
  Laptop,
  LogOut,
  Moon,
  RefreshCw,
  Shield,
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

export type SettingsSubMenu =
  | null
  | 'account'
  | 'notifications'
  | 'language'
  | 'appearance'
  | 'sync'
  | 'terms';

const PRIVACY_POLICY_REPO_URL =
  'https://github.com/Miltt/Intervals-Mobile-Companion/blob/main/PRIVACY.md';
const TERMS_REPO_URL =
  'https://github.com/Miltt/Intervals-Mobile-Companion/blob/main/TERMS.md';
const APP_BUILD_VERSION = 'v1.2.0 (Build 2026.11)';

interface SettingsScreenProps {
  settings: AppSettings;
  isLight: boolean;
  lastSyncLabel: string;
  nextSyncLabel: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLanguages: LocaleMeta[];
  activeSubMenu: SettingsSubMenu;
  onSelectSubMenu: (subMenu: SettingsSubMenu) => void;
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
  activeSubMenu,
  onSelectSubMenu,
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

  const menuItemClass = isLight
    ? 'w-full rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 px-4 py-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer shadow-xs text-left'
    : 'w-full rounded-2xl bg-[#161923] hover:bg-[#1b2030] border border-slate-800/90 px-4 py-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer text-left';

  const labelClass = isLight
    ? 'text-xs font-bold uppercase tracking-wider text-slate-500 font-mono'
    : 'text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono';

  const subTextClass = isLight ? 'text-xs text-slate-600' : 'text-xs text-slate-400';

  const currentLangMeta =
    availableLanguages.find((l) => l.code === settings.language) ||
    availableLanguages[0];

  const subMenuTitleMap: Record<Exclude<SettingsSubMenu, null>, string> = {
    account: t('settings.menu.account'),
    notifications: t('settings.menu.notifications'),
    language: t('settings.menu.language'),
    appearance: t('settings.menu.appearance'),
    sync: t('settings.menu.sync'),
    terms: t('settings.menu.terms'),
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Section: Settings Title & Subtitle (or Sub-Menu Header when inside a sub-menu) */}
      <div className="flex items-center justify-between gap-2">
        {activeSubMenu === null ? (
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
              {t('settings.title')}
            </h1>
            <p className={subTextClass}>{t('settings.subtitle')}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectSubMenu(null)}
              aria-label="Back to Settings"
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#161923] border-slate-800 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                {t('settings.title')}
              </div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
                {subMenuTitleMap[activeSubMenu]}
              </h1>
            </div>
          </div>
        )}

        {savedFeedback && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{savedFeedback}</span>
          </div>
        )}
      </div>

      {/* MAIN SETTINGS SUB-MENU LIST */}
      {activeSubMenu === null && (
        <div className="space-y-2.5">
          {/* 1. Account */}
          <button
            type="button"
            onClick={() => onSelectSubMenu('account')}
            className={menuItemClass}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {t('settings.menu.account')}
                </div>
                <div className={subTextClass}>
                  {settings.isLoggedIn
                    ? `${settings.athleteName} · ${t('settings.account.connected')}`
                    : t('settings.account.not_signed_in')}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 2. Notifications */}
          <button
            type="button"
            onClick={() => onSelectSubMenu('notifications')}
            className={menuItemClass}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {t('settings.menu.notifications')}
                </div>
                <div className={subTextClass}>
                  {t('settings.prefs.morning_digest')} ·{' '}
                  {settings.morningWorkoutNotification
                    ? settings.workoutNotificationTime || '07:00'
                    : 'OFF'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 3. Language */}
          <button
            type="button"
            onClick={() => onSelectSubMenu('language')}
            className={menuItemClass}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Languages className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {t('settings.menu.language')}
                </div>
                <div className={subTextClass}>
                  {currentLangMeta
                    ? `${currentLangMeta.flag} ${currentLangMeta.nativeName}`
                    : settings.language.toUpperCase()}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 4. Appearance */}
          <button
            type="button"
            onClick={() => onSelectSubMenu('appearance')}
            className={menuItemClass}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {t('settings.menu.appearance')}
                </div>
                <div className={subTextClass}>
                  {t(`settings.theme.${settings.themeMode}`)}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 5. Sync */}
          <button
            type="button"
            onClick={() => onSelectSubMenu('sync')}
            className={menuItemClass}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {t('settings.menu.sync')}
                </div>
                <div className={subTextClass}>
                  {settings.autoSyncHours === 0
                    ? t('settings.autosync.manual')
                    : t('app.subtitle.auto_hours', { hours: settings.autoSyncHours })}{' '}
                  · {t('settings.prefs.days', { days: settings.lookaheadDays })} ·{' '}
                  {settings.units === 'metric' ? 'km' : 'mi'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 6. Terms and Conditions */}
          <button
            type="button"
            onClick={() => onSelectSubMenu('terms')}
            className={menuItemClass}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {t('settings.menu.terms')}
                </div>
                <div className={subTextClass}>{t('settings.terms.subtitle')}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* 7. Privacy Policy (Opens existing PRIVACY.md from Git repo in browser) */}
          <a
            href={PRIVACY_POLICY_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={menuItemClass}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">
                  {t('settings.menu.privacy')}
                </div>
                <div className={subTextClass}>
                  {t('settings.privacy.subtitle')}
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
          </a>
        </div>
      )}

      {/* SUB-MENU 1: ACCOUNT */}
      {activeSubMenu === 'account' && (
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

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={onOpenWebLogin}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      : 'bg-[#10131b] border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('settings.account.switch')}</span>
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
      )}

      {/* SUB-MENU 2: NOTIFICATIONS */}
      {activeSubMenu === 'notifications' && (
        <div className={cardClass}>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-500" />
            <span className={labelClass}>{t('settings.menu.notifications')}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextVal = !settings.morningWorkoutNotification;
              onUpdateSettings({
                morningWorkoutNotification: nextVal,
              });
              flashSaved(`${t('settings.prefs.morning_digest')}: ${nextVal ? 'ON' : 'OFF'}`);
            }}
            className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left cursor-pointer ${
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
                <div className="text-[11px] text-slate-400 font-mono">
                  {settings.workoutNotificationTime || '07:00'}
                </div>
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

          {/* Notification Time Picker */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-opacity ${
              !settings.morningWorkoutNotification ? 'opacity-50' : ''
            } ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-[#10131b] border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold">
                  {t('settings.prefs.digest_time')}
                </div>
                <div className="text-[11px] text-slate-400">
                  {t('settings.prefs.digest_time_sub')}
                </div>
              </div>
            </div>

            <input
              type="time"
              value={settings.workoutNotificationTime || '07:00'}
              disabled={!settings.morningWorkoutNotification}
              onChange={(e) => {
                const nextTime = e.target.value || '07:00';
                onUpdateSettings({ workoutNotificationTime: nextTime });
                flashSaved(`${t('settings.prefs.morning_digest')} · ${nextTime}`);
              }}
              aria-label={t('settings.prefs.digest_time')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer focus:outline-none focus:border-cyan-500 ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-[#161923] border-slate-700 text-cyan-300 [color-scheme:dark]'
              }`}
            />
          </div>
        </div>
      )}

      {/* SUB-MENU 3: LANGUAGE */}
      {activeSubMenu === 'language' && (
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
      )}

      {/* SUB-MENU 4: APPEARANCE */}
      {activeSubMenu === 'appearance' && (
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
      )}

      {/* SUB-MENU 5: SYNC */}
      {activeSubMenu === 'sync' && (
        <div className="space-y-3.5">
          {/* 5A. Activity Types to Upload & Display in Calendar */}
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

          {/* 5B. Auto-Sync Interval + Wi-Fi Only + Incoming Lookahead (7/14/28 Days) + Pace & Distance Units */}
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

            {/* Auto-Sync on Wi-Fi Only Button */}
            <div className="pt-2 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => {
                  const nextWifi = !settings.wifiOnlySync;
                  onUpdateSettings({ wifiOnlySync: nextWifi });
                  flashSaved(`${t('settings.prefs.wifi_only')}: ${nextWifi ? 'ON' : 'OFF'}`);
                }}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left cursor-pointer ${
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
            </div>

            {/* Incoming Workouts Lookahead (7, 14, 28 Days) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/40">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs font-semibold">{t('settings.prefs.lookahead')}</div>
                  <div className={subTextClass}>{t('settings.prefs.lookahead_sub')}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {([7, 14, 28] as const).map((days) => (
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
          </div>

          {/* 5C. Pace & Distance Units (Separate Section) */}
          <div className={cardClass}>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-500" />
              <span className={labelClass}>{t('settings.prefs.units')}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={subTextClass}>{t('settings.prefs.units_sub')}</div>
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
          </div>
        </div>
      )}

      {/* SUB-MENU 6: TERMS AND CONDITIONS */}
      {activeSubMenu === 'terms' && (
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-500" />
              <span className={labelClass}>{t('settings.menu.terms')}</span>
            </div>
            <a
              href={TERMS_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className={`space-y-3 text-xs leading-relaxed ${subTextClass}`}>
            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#10131b] border-slate-800'
              }`}
            >
              <div className={`font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                1. {t('settings.terms.as_is_title')}
              </div>
              <p>{t('settings.terms.as_is_body')}</p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#10131b] border-slate-800'
              }`}
            >
              <div className={`font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                2. {t('settings.terms.data_loss_title')}
              </div>
              <p>{t('settings.terms.data_loss_body')}</p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#10131b] border-slate-800'
              }`}
            >
              <div className={`font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                3. {t('settings.terms.liability_title')}
              </div>
              <p>{t('settings.terms.liability_body')}</p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#10131b] border-slate-800'
              }`}
            >
              <div className={`font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                4. {t('settings.terms.health_title')}
              </div>
              <p>{t('settings.terms.health_body')}</p>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM FOOTER: Centralized Log Out Button + Build Version (Only on main Settings menu) */}
      {activeSubMenu === null && (
        <div className="pt-4 flex flex-col items-center justify-center text-center gap-2.5">
          {settings.isLoggedIn && (
            <button
              type="button"
              onClick={() => {
                onLogout();
                flashSaved(t('settings.account.not_signed_in'));
              }}
              className="px-5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('settings.account.logout')}</span>
            </button>
          )}

          <div className="text-[11px] font-mono text-slate-500">
            Intervals Companion · {APP_BUILD_VERSION}
          </div>
        </div>
      )}
    </div>
  );
};
