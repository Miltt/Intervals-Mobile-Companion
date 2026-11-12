import React, { useEffect, useState } from 'react';
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
  onSuccessLogin: (athleteName: string, email: string, accessToken?: string) => void;
  onClose: () => void;
}

/**
 * Launches the official Intervals.icu OAuth 2.0 + PKCE (S256) authorization flow (Client ID 1781).
 */
export const IntervalsWebLoginSheet: React.FC<IntervalsWebLoginSheetProps> = ({
  onSuccessLogin,
  onClose,
}) => {
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [oauthUrl, setOauthUrl] = useState<string>('');
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  // Pre-fetch the PKCE authorization URL so clicking "Authorize on Intervals.icu" opens the popup immediately
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/url')
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
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const athleteName = event.data.athleteName || 'Intervals.icu Athlete';
        const accessToken = event.data.accessToken || '';
        const athleteId = event.data.athleteId || '0';
        if (accessToken) {
          try {
            localStorage.setItem(
              'intervals_icu_oauth_token_v5',
              JSON.stringify({
                accessToken,
                athleteName,
                athleteId,
                savedAt: new Date().toISOString(),
              })
            );
          } catch {
            // ignore
          }
        }
        onSuccessLogin(athleteName, `ID: ${athleteId} (OAuth 2.0)`, accessToken);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setIsOpening(false);
        setOauthNotice(
          event.data.error ||
            'OAuth authorization did not complete. Please try again.'
        );
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccessLogin]);

  // Also poll /api/intervals/status while waiting in case cross-origin opener was stripped
  useEffect(() => {
    if (!isOpening) return;
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
          onSuccessLogin(athleteName, `ID: ${athleteId} (OAuth 2.0)`, data.accessToken);
        }
      } catch {
        // ignore
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [isOpening, onSuccessLogin]);

  const handleOpenRealIntervalsPopup = async () => {
    try {
      setIsOpening(true);
      setOauthNotice(null);

      if (oauthUrl) {
        window.open(oauthUrl, 'intervals_oauth_popup', 'width=560,height=680');
        // Refresh PKCE URL for any subsequent attempt
        fetch('/api/auth/url')
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.url) setOauthUrl(d.url);
          })
          .catch(() => {});
        return;
      }

      const res = await fetch('/api/auth/url');
      if (!res.ok) {
        setIsOpening(false);
        setOauthNotice('Failed to initialize OAuth URL.');
        return;
      }
      const { url } = await res.json();
      if (url) {
        window.open(url, 'intervals_oauth_popup', 'width=560,height=680');
      } else {
        setIsOpening(false);
      }
    } catch {
      setIsOpening(false);
      setOauthNotice('Unable to reach server to construct OAuth URL.');
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
      <div className="bg-[#181b24] border-t border-slate-700/90 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92%]">
        {/* Top URL Bar */}
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
              https://intervals.icu/oauth/authorize?client_id=1781
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

        {/* Intervals.icu OAuth 2.0 PKCE Consent Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-100">
          <div className="text-center space-y-1.5">
            <img
              src="/pwa-512x512.png"
              alt="Intervals Companion Logo"
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl mx-auto border border-cyan-500/40 object-cover shadow-lg"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
              <Globe className="w-3.5 h-3.5" />
              <span>intervals.icu OAuth 2.0 · Client ID #1781 (PKCE)</span>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight pt-1">
              Sign in with Intervals.icu
            </h2>
            <p className="text-xs text-slate-400">
              Authenticate directly on Intervals.icu using OAuth 2.0 + PKCE (S256) to sync your live calendar and activities.
            </p>
          </div>

          {oauthNotice && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs">
              {oauthNotice}
            </div>
          )}

          <div className="rounded-2xl bg-[#10131b] border border-slate-800 p-3.5 space-y-2 text-xs">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Permissions Requested
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>CALENDAR:READ</strong> — Incoming scheduled workouts &amp; targets
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>ACTIVITY:READ</strong> — Completed workouts &amp; intervals
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenRealIntervalsPopup}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isOpening
                ? 'Waiting for Intervals.icu Authorization...'
                : 'Authorize on Intervals.icu'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
