import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install Android PWA to Home Screen"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Install App</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#181b24] border border-slate-800 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-100">
                  Install Android / Mobile App
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                aria-label="Close install instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                <p>To install Intervals.icu Companion on your iPhone or iPad:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Tap the <strong>Share</strong> icon in the Safari toolbar.</li>
                  <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
                  <li>Launch from your home screen in standalone mode.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                <p>
                  This app is configured as a standalone Android Progressive Web App (PWA) with offline workout caching.
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Open this app in <strong>Chrome on Android</strong> (or desktop Chrome/Edge).</li>
                  <li>Tap the browser menu <strong>(⋮)</strong> and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>If viewing inside a preview frame, open the app URL in a dedicated browser tab to trigger the native Android APK/PWA installer.</li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-auto z-40 flex items-center justify-center gap-2 rounded-xl bg-amber-500/95 px-3.5 py-2 text-xs font-medium text-slate-950 shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Showing cached Intervals.icu workouts & streams</span>
    </div>
  );
};
