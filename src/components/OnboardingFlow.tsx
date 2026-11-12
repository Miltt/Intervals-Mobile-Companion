import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  Languages,
  Laptop,
  Moon,
  Shield,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { AppSettings, ThemeMode, UnitSystem } from '../types/settings';
import { LocaleMeta } from '../i18n/useTranslation';

const PRIVACY_POLICY_REPO_URL =
  'https://github.com/Miltt/Intervals-Mobile-Companion/blob/main/PRIVACY.md';
const TERMS_REPO_URL =
  'https://github.com/Miltt/Intervals-Mobile-Companion/blob/main/TERMS.md';

export type OnboardingStep = 1 | 2 | 3;

interface OnboardingFlowProps {
  step: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
  settings: AppSettings;
  isLight: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLanguages: LocaleMeta[];
  onSyncLanguagesFromGitHub: () => Promise<number>;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onSuccessLogin: (athleteName: string, email: string, accessToken?: string) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  step,
  onStepChange,
  settings,
  isLight,
  t,
  availableLanguages,
  onSyncLanguagesFromGitHub,
  onUpdateSettings,
  onSuccessLogin,
}) => {
  const [termsChecked, setTermsChecked] = useState<boolean>(
    Boolean(settings.hasAcceptedTerms)
  );
  const [isOpeningOAuth, setIsOpeningOAuth] = useState<boolean>(false);
  const [oauthUrl, setOauthUrl] = useState<string>('');
  const [copiedUri, setCopiedUri] = useState<boolean>(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const currentCallbackUri =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'https://ais-dev-5wnbvdgheoghwxovarqosc-930214768256.europe-west2.run.app/auth/callback';

  // Keep termsChecked in sync if settings change
  useEffect(() => {
    setTermsChecked(Boolean(settings.hasAcceptedTerms));
  }, [settings.hasAcceptedTerms]);

  // Automatically fetch latest languages from GitHub when Step 1 or Step 2 opens
  useEffect(() => {
    if (step === 1 || step === 2) {
      onSyncLanguagesFromGitHub().catch(() => {});
    }
  }, [step, onSyncLanguagesFromGitHub]);

  // Pre-fetch the PKCE authorization URL for Step 3
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    fetch(`/api/auth/url?origin=${encodeURIComponent(origin)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.url) {
          setOauthUrl(data.url);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [step]);

  // Poll /api/intervals/status while waiting on Step 3 in case cross-origin opener was stripped
  useEffect(() => {
    if (step !== 3 || !isOpeningOAuth) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/intervals/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.accessToken) {
          const athleteName = data.athleteName || 'Intervals.icu Athlete';
          const athleteId = data.athleteId || '0';
          try {
            localStorage.setItem(
              'intervals_icu_oauth_token_v5',
              JSON.stringify({
                accessToken: data.accessToken,
                athleteName,
                athleteId,
                savedAt: new Date().toISOString(),
              })
            );
          } catch {
            // ignore
          }
          setIsOpeningOAuth(false);
          onSuccessLogin(athleteName, `ID: ${athleteId} (OAuth 2.0)`, data.accessToken);
        }
      } catch {
        // ignore
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [step, isOpeningOAuth, onSuccessLogin]);

  // Listen for OAUTH_AUTH_ERROR message in case popup encountered an error
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setIsOpeningOAuth(false);
        setOauthNotice(
          event.data.error ||
            'OAuth authorization did not complete. Please verify the Redirect URL below is added in Intervals.icu.'
        );
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleOpenIntervalsOAuth = async () => {
    try {
      setIsOpeningOAuth(true);
      setOauthNotice(null);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      if (oauthUrl) {
        window.open(oauthUrl, 'intervals_oauth_popup', 'width=560,height=680');
        fetch(`/api/auth/url?origin=${encodeURIComponent(origin)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.url) setOauthUrl(d.url);
          })
          .catch(() => {});
        return;
      }

      const res = await fetch(`/api/auth/url?origin=${encodeURIComponent(origin)}`);
      if (!res.ok) {
        setIsOpeningOAuth(false);
        setOauthNotice('Failed to initialize OAuth URL.');
        return;
      }
      const { url } = await res.json();
      if (url) {
        window.open(url, 'intervals_oauth_popup', 'width=560,height=680');
      } else {
        setIsOpeningOAuth(false);
      }
    } catch {
      setIsOpeningOAuth(false);
      setOauthNotice('Unable to reach server to construct OAuth URL.');
    }
  };

  const handleCopyRedirectUri = () => {
    navigator.clipboard?.writeText(currentCallbackUri).catch(() => {});
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const cardClass = isLight
    ? 'rounded-2xl bg-white border border-slate-200 p-4 space-y-3.5 shadow-sm'
    : 'rounded-2xl bg-[#161923] border border-slate-800/90 p-4 space-y-3.5';

  const subCardClass = isLight
    ? 'p-3 rounded-xl border bg-slate-50 border-slate-200'
    : 'p-3 rounded-xl border bg-[#10131b] border-slate-800';

  const labelClass = isLight
    ? 'text-xs font-bold uppercase tracking-wider text-slate-500 font-mono'
    : 'text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono';

  const subTextClass = isLight ? 'text-xs text-slate-600' : 'text-xs text-slate-400';

  return (
    <div className="max-w-xl mx-auto px-3.5 sm:px-5 pt-4 pb-10 space-y-4">
      {/* Top Progress Bar & Brand Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/pwa-512x512.png"
              alt="Intervals Companion"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-xl border border-cyan-500/40 object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-extrabold tracking-tight truncate">
                Intervals Companion
              </div>
              <div className="text-[11px] font-mono text-cyan-500">
                {t('onboarding.step_of', { current: step, total: 3 })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Language Switcher on Step 1 so user can read Terms in their preferred language immediately */}
            {step === 1 && (
              <select
                value={settings.language}
                aria-label={t('settings.language.title')}
                onMouseDown={() => {
                  onSyncLanguagesFromGitHub().catch(() => {});
                }}
                onTouchStart={() => {
                  onSyncLanguagesFromGitHub().catch(() => {});
                }}
                onChange={(e) => {
                  onUpdateSettings({ language: e.target.value });
                }}
                className={`h-8 px-2 rounded-lg border text-[11px] font-semibold cursor-pointer focus:outline-none focus:border-cyan-500 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800'
                    : 'bg-[#161923] border-slate-800 text-slate-200'
                }`}
              >
                {availableLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.code.toUpperCase()}
                  </option>
                ))}
              </select>
            )}

            {/* 3-Step Visual Progress Bars */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    idx === step
                      ? 'w-6 bg-cyan-500'
                      : idx < step
                      ? 'w-3.5 bg-emerald-500'
                      : isLight
                      ? 'w-3.5 bg-slate-200'
                      : 'w-3.5 bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PAGE 1: TERMS AND CONDITIONS (Mandatory Acceptance)                   */}
      {/* ===================================================================== */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className={cardClass}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
                <h1 className="text-base font-extrabold tracking-tight">
                  {t('onboarding.step1.title')}
                </h1>
              </div>
              <a
                href={TERMS_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-cyan-500 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className={subTextClass}>{t('onboarding.step1.subtitle')}</p>

            {/* Full Terms List */}
            <div className={`space-y-2.5 text-xs leading-relaxed ${subTextClass}`}>
              <div className={subCardClass}>
                <div
                  className={`font-bold mb-1 ${
                    isLight ? 'text-slate-900' : 'text-slate-200'
                  }`}
                >
                  1. {t('settings.terms.as_is_title')}
                </div>
                <p>{t('settings.terms.as_is_body')}</p>
              </div>

              <div className={subCardClass}>
                <div
                  className={`font-bold mb-1 ${
                    isLight ? 'text-slate-900' : 'text-slate-200'
                  }`}
                >
                  2. {t('settings.terms.data_loss_title')}
                </div>
                <p>{t('settings.terms.data_loss_body')}</p>
              </div>

              <div className={subCardClass}>
                <div
                  className={`font-bold mb-1 ${
                    isLight ? 'text-slate-900' : 'text-slate-200'
                  }`}
                >
                  3. {t('settings.terms.liability_title')}
                </div>
                <p>{t('settings.terms.liability_body')}</p>
              </div>

              <div className={subCardClass}>
                <div
                  className={`font-bold mb-1 ${
                    isLight ? 'text-slate-900' : 'text-slate-200'
                  }`}
                >
                  4. {t('settings.terms.health_title')}
                </div>
                <p>{t('settings.terms.health_body')}</p>
              </div>
            </div>

            {/* Privacy Policy Reference Link */}
            <a
              href={PRIVACY_POLICY_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-[#10131b] hover:bg-[#151a26] border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-semibold truncate">
                  {t('settings.menu.privacy')}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </a>

            {/* Mandatory Acceptance Checkbox Row */}
            <button
              type="button"
              onClick={() => setTermsChecked((prev) => !prev)}
              className={`w-full min-h-[48px] p-3.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                termsChecked
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900'
                    : 'bg-emerald-500/12 border-emerald-500/70 text-slate-100'
                  : isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400'
                  : 'bg-[#10131b] border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                  termsChecked
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                    : isLight
                    ? 'bg-white border-slate-300'
                    : 'bg-[#161b26] border-slate-600'
                }`}
              >
                {termsChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className="text-xs font-semibold">
                {t('onboarding.step1.accept_checkbox')}
              </span>
            </button>

            {/* Primary CTA: Accept & Continue */}
            <button
              type="button"
              disabled={!termsChecked}
              onClick={() => {
                if (!termsChecked) return;
                onUpdateSettings({ hasAcceptedTerms: true });
                onStepChange(2);
              }}
              className={`w-full min-h-[48px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                termsChecked
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md cursor-pointer'
                  : isLight
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>{t('onboarding.step1.accept_btn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PAGE 2: APPEARANCE, LANGUAGE & UNITS                                  */}
      {/* ===================================================================== */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className={cardClass}>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">
                {t('onboarding.step2.title')}
              </h1>
              <p className={`${subTextClass} mt-0.5`}>
                {t('onboarding.step2.subtitle')}
              </p>
            </div>

            {/* 1. Appearance Selector (System / Dark / Light) */}
            <div className="space-y-2.5 pt-1">
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
                  ] as {
                    id: ThemeMode;
                    label: string;
                    icon: React.FC<{ className?: string }>;
                  }[]
                ).map((themeOpt) => {
                  const Icon = themeOpt.icon;
                  const active = settings.themeMode === themeOpt.id;
                  return (
                    <button
                      key={themeOpt.id}
                      type="button"
                      onClick={() => onUpdateSettings({ themeMode: themeOpt.id })}
                      className={`min-h-[48px] py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-500 font-bold'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          : 'bg-[#10131b] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{themeOpt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Language Dropdown (Identical to Settings with GitHub background fetch) */}
            <div className="space-y-2 pt-3 border-t border-slate-800/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Languages className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span className={labelClass}>{t('settings.language.title')}</span>
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
                    onUpdateSettings({ language: e.target.value });
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:border-cyan-500 ${
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

              <p className={`text-xs leading-relaxed ${subTextClass}`}>
                {t('settings.language.desc')}
              </p>
            </div>

            {/* 3. Pace & Distance Units Quick-Pick (km vs mi) */}
            <div className="space-y-2 pt-3 border-t border-slate-800/30">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className={labelClass}>{t('settings.prefs.units')}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className={subTextClass}>{t('settings.prefs.units_sub')}</div>
                <div
                  className={`flex items-center gap-1 p-1 rounded-xl border ${
                    isLight
                      ? 'bg-slate-100 border-slate-200'
                      : 'bg-[#10131b] border-slate-800'
                  }`}
                >
                  {(
                    [
                      { id: 'metric', label: 'km · min/km' },
                      { id: 'imperial', label: 'mi · min/mi' },
                    ] as { id: UnitSystem; label: string }[]
                  ).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onUpdateSettings({ units: u.id })}
                      className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        settings.units === u.id
                          ? 'bg-cyan-600 text-white shadow-xs'
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

            {/* Navigation Buttons: Back & Continue */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onStepChange(1)}
                className={`min-h-[48px] px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-[#10131b] hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('onboarding.back')}</span>
              </button>

              <button
                type="button"
                onClick={() => onStepChange(3)}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <span>{t('onboarding.step2.continue_btn')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PAGE 3: LOG-IN WITH INTERVALS.ICU (OAuth 2.0 + PKCE Client ID #1781)  */}
      {/* ===================================================================== */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className={cardClass}>
            <div className="text-center space-y-2 pt-1">
              <img
                src="/pwa-512x512.png"
                alt="Intervals Companion Logo"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl mx-auto border border-cyan-500/40 object-cover shadow-lg"
              />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 text-xs font-mono">
                <Globe className="w-3.5 h-3.5" />
                <span>intervals.icu OAuth 2.0 · Client ID #1781 (PKCE)</span>
              </div>
              <h1 className="text-lg font-extrabold tracking-tight pt-1">
                {t('onboarding.step3.title')}
              </h1>
              <p className={subTextClass}>{t('onboarding.step3.subtitle')}</p>
            </div>

            {oauthNotice && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs">
                {oauthNotice}
              </div>
            )}

            {/* Requested OAuth Scopes Summary */}
            <div className={`${subCardClass} space-y-2 text-xs`}>
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {t('onboarding.step3.permissions')}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  <strong>CALENDAR:READ</strong> — {t('onboarding.step3.perm_calendar')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  <strong>ACTIVITY:READ</strong> — {t('onboarding.step3.perm_activity')}
                </span>
              </div>
            </div>

            {/* Active Redirect URL helper */}
            <div className={`${subCardClass} space-y-1.5 text-xs`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-500">
                  Active Redirect URL
                </span>
                <button
                  type="button"
                  onClick={handleCopyRedirectUri}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 cursor-pointer ${
                    isLight
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {copiedUri ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedUri ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] opacity-80 break-all select-all">
                {currentCallbackUri}
              </div>
            </div>

            {/* Navigation & Authorize Button */}
            <div className="pt-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onStepChange(2)}
                className={`min-h-[48px] px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-[#10131b] hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('onboarding.back')}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenIntervalsOAuth}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {isOpeningOAuth
                    ? t('onboarding.step3.waiting_btn')
                    : t('onboarding.step3.login_btn')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
