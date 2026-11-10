import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';

interface IntervalsWebLoginSheetProps {
  defaultEmail?: string;
  onSuccessLogin: (athleteName: string, email: string) => void;
  onClose: () => void;
}

/**
 * Simulates the Android Chrome Custom Tab (`androidx.browser.customtabs.CustomTabsIntent`)
 * opening https://intervals.icu/oauth/authorize inside the mobile app, while also supporting
 * launching the real Intervals.icu OAuth 2.0 popup window when CLIENT_ID is configured.
 */
export const IntervalsWebLoginSheet: React.FC<IntervalsWebLoginSheetProps> = ({
  defaultEmail = 'athlete@example.com',
  onSuccessLogin,
  onClose,
}) => {
  const [email, setEmail] = useState<string>(defaultEmail);
  const [password, setPassword] = useState<string>('••••••••••••');
  const [step, setStep] = useState<'login_form' | 'consent'>('login_form');
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);

  const handleWebFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('consent');
  };

  const handleConfirmAuthorize = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      const prefix = email.split('@')[0] || '';
      const derivedName =
        prefix && prefix !== 'athlete'
          ? prefix.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Intervals.icu Athlete';
      onSuccessLogin(derivedName, email || defaultEmail);
    }, 350);
  };

  const handleOpenRealIntervalsPopup = async () => {
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/url?origin=${encodeURIComponent(origin)}`);
      if (!res.ok) return;
      const { url, oauthClientConfigured } = await res.json();
      if (oauthClientConfigured && url) {
        window.open(url, 'intervals_oauth_popup', 'width=560,height=680');
      } else {
        setStep('consent');
      }
    } catch {
      setStep('consent');
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
      {/* Android Chrome Custom Tab Container */}
      <div className="bg-[#181b24] border-t border-slate-700/90 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92%]">
        {/* Chrome Custom Tab Top URL Bar */}
        <div className="px-3.5 py-2.5 bg-[#202430] border-b border-slate-700/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-700/60 flex items-center justify-center text-slate-300 cursor-pointer"
            aria-label="Close browser tab"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex-1 px-3 py-1 rounded-full bg-[#12151e] border border-slate-700/80 flex items-center gap-1.5 min-w-0">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-mono text-slate-200 truncate">
              https://intervals.icu/{step === 'login_form' ? 'login' : 'oauth/authorize'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenRealIntervalsPopup}
            title="Open live intervals.icu OAuth window"
            className="w-8 h-8 rounded-full hover:bg-slate-700/60 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Original Intervals.icu Web Login / OAuth Consent Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-100">
          {/* Intervals.icu Brand Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
              <Globe className="w-3.5 h-3.5" />
              <span>intervals.icu Official Web Sign-In</span>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight pt-1">
              {step === 'login_form'
                ? 'Log in to Intervals.icu'
                : 'Authorize Intervals.icu Companion'}
            </h2>
            <p className="text-xs text-slate-400">
              {step === 'login_form'
                ? 'Sign in with your Intervals.icu account. No API key or Athlete ID required.'
                : 'Grant read access to sync your training calendar and completed workouts.'}
            </p>
          </div>

          {step === 'login_form' ? (
            <>
              {/* Social / SSO Buttons matching Intervals.icu Web Login */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setStep('consent')}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Continue with Google ({defaultEmail})</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('consent')}
                    className="py-2 px-3 rounded-xl bg-[#fc4c02]/90 hover:bg-[#fc4c02] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Log in with Strava
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('consent')}
                    className="py-2 px-3 rounded-xl bg-[#007cc3] hover:bg-[#0288d1] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Log in with Garmin
                  </button>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="shrink mx-3 text-[10px] uppercase tracking-wider font-mono text-slate-500">
                  Or Intervals.icu Email &amp; Password
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              {/* Standard Intervals.icu Web Email + Password Form */}
              <form onSubmit={handleWebFormSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="athlete@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#10131b] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#10131b] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer"
                >
                  Log In
                </button>
              </form>
            </>
          ) : (
            /* Step 2: Intervals.icu OAuth 2.0 Authorization Consent Screen */
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#10131b] border border-slate-800 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Signed in as</span>
                  <span className="font-mono font-bold text-slate-200">{email}</span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Permissions Requested
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>CALENDAR:READ</strong> — Incoming coach workouts &amp; targets
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>ACTIVITY:READ</strong> — Completed workouts &amp; intervals
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('login_form')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Switch Account
                </button>
                <button
                  type="button"
                  disabled={isAuthorizing}
                  onClick={handleConfirmAuthorize}
                  className="flex-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isAuthorizing ? 'Redirecting to App...' : 'Authorize & Continue'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
