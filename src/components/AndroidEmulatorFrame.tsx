import React, { useEffect, useState } from 'react';
import {
  BatteryCharging,
  Check,
  ChevronLeft,
  Circle,
  Code2,
  Copy,
  Download,
  FileCode,
  FolderTree,
  Footprints,
  RefreshCw,
  RotateCcw,
  Signal,
  Smartphone,
  Square,
  Wifi,
} from 'lucide-react';
import { KOTLIN_ANDROID_FILES, KotlinSourceFile } from '../data/kotlinProjectFiles';

interface AndroidEmulatorFrameProps {
  children: React.ReactNode;
  isEmulatorActive: boolean;
  onToggleEmulator: () => void;
  onBackGesture: () => void;
  onHomeGesture: () => void;
  onForceCollect: () => void;
  onOpenKotlinCode: () => void;
  isSyncing: boolean;
  lastSyncLabel: string;
}

export const AndroidEmulatorFrame: React.FC<AndroidEmulatorFrameProps> = ({
  children,
  onBackGesture,
  onHomeGesture,
  onForceCollect,
  isSyncing,
  lastSyncLabel,
}) => {
  const [clockText, setClockText] = useState('08:15');
  const [isOnHomeScreen, setIsOnHomeScreen] = useState(false);
  const [showNotificationShade, setShowNotificationShade] = useState(false);
  const [showSplitIde, setShowSplitIde] = useState(true);
  const [activeFile, setActiveFile] = useState<KotlinSourceFile>(
    KOTLIN_ANDROID_FILES.find((f) => f.path.endsWith('MainActivity.kt')) || KOTLIN_ANDROID_FILES[0]
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockText(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateClock();
    const id = setInterval(updateClock, 15000);
    return () => clearInterval(id);
  }, []);

  const handleCopyFile = async (file: KotlinSourceFile) => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedPath(file.path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadBundle = () => {
    const bundleContent = KOTLIN_ANDROID_FILES.map(
      (f) =>
        `// ============================================================================\n` +
        `// FILE: android-kotlin/${f.path}\n` +
        `// DESCRIPTION: ${f.description}\n` +
        `// ============================================================================\n\n` +
        `${f.content}\n\n`
    ).join('\n');

    const blob = new Blob([bundleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intervals-icu-android-kotlin-project.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#080a0f] text-slate-100 flex flex-col items-center justify-start py-3 px-3 sm:px-5 select-none">
      {/* Top Android Studio Native Kotlin Workspace Header */}
      <div className="w-full max-w-[1440px] mb-3 rounded-2xl bg-[#131722] border border-slate-800/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Android Studio · Native Kotlin + Jetpack Compose</span>
              <span className="text-[11px] font-mono font-normal text-emerald-400">
                /android-kotlin (API 35)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              Package: icu.intervals.companion · WorkManager 12h Sync · Last sync: {lastSyncLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsOnHomeScreen(false);
              onForceCollect();
            }}
            disabled={isSyncing}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Force Collect'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSplitIde((prev) => !prev)}
            className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showSplitIde
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showSplitIde ? 'Hide Kotlin IDE Pane' : 'Show Kotlin IDE Pane'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBundle}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Gradle Project</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Left = Native Kotlin Project Explorer & Editor | Right = Pixel 9 Pro Compose Preview */}
      <div className="w-full max-w-[1440px] flex flex-col lg:flex-row items-start justify-center gap-4">
        {showSplitIde && (
          <div className="w-full lg:flex-1 h-[840px] rounded-2xl bg-[#0e1117] border border-slate-800/90 overflow-hidden flex flex-col select-text shadow-2xl">
            {/* IDE File Tabs & Project Tree Header */}
            <div className="px-4 py-2.5 bg-[#141821] border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <FolderTree className="w-4 h-4 text-emerald-400" />
                <span>/android-kotlin/</span>
                <span className="text-slate-500">/</span>
                <span className="font-mono text-cyan-300">{activeFile.path}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyFile(activeFile)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                {copiedPath === activeFile.path ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy File</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden">
              {/* Left File Tree inside IDE */}
              <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-slate-800/80 bg-[#10131b] p-2.5 overflow-y-auto space-y-1 shrink-0">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Gradle & Kotlin Files ({KOTLIN_ANDROID_FILES.length})
                </div>
                {KOTLIN_ANDROID_FILES.map((file) => {
                  const isSelected = file.path === activeFile.path;
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setActiveFile(file)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-colors flex items-start gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[11px]">{file.title}</div>
                        <div className="truncate text-[10px] text-slate-400 font-mono">
                          {file.path}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Kotlin Source Code View */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#0b0d13]">
                <div className="px-4 py-2 bg-[#121620] border-b border-slate-800/70 text-xs text-slate-300">
                  {activeFile.description}
                </div>
                <pre className="flex-1 p-4 overflow-auto text-xs font-mono leading-relaxed text-slate-200">
                  <code>{activeFile.content}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Right: Interactive Pixel 9 Pro · Android 15 Jetpack Compose Emulator */}
        <div className="flex items-start justify-center gap-2.5 shrink-0 mx-auto">
          <div className="relative w-[396px] sm:w-[412px] h-[840px] rounded-[46px] bg-[#0f1117] border-[10px] border-[#222734] shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
            {/* Android Status Bar (Camera Punch-hole + Clock + 5G/WiFi/Battery) */}
            <div
              onClick={() => setShowNotificationShade((prev) => !prev)}
              className="h-9 px-6 bg-[#0f1117] flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-200 shrink-0 cursor-pointer z-40 border-b border-slate-800/40"
              title="Click to toggle Android Notification Shade"
            >
              <span className="font-semibold">{clockText}</span>

              {/* Center Punch-Hole Camera */}
              <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800" />

              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-[10px] font-bold">5G</span>
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>

            {/* Pull-Down Android Notification Shade Overlay */}
            {showNotificationShade && (
              <div
                className="absolute inset-x-0 top-9 bottom-12 z-30 bg-black/80 backdrop-blur-md p-4 space-y-3 animate-in fade-in duration-150"
                onClick={() => setShowNotificationShade(false)}
              >
                <div
                  className="rounded-2xl bg-[#1c212e] border border-slate-700/80 p-3.5 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-cyan-400">
                      IntervalsSyncWorker · WorkManager
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{lastSyncLabel}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    PeriodicWorkRequest (12h interval) active. Only Running workouts & planned pace diagrams are synced.
                  </p>
                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onForceCollect();
                        setShowNotificationShade(false);
                      }}
                      className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Force Collect Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Android Screen Viewport */}
            <div className="flex-1 min-h-0 overflow-hidden bg-[#0f1117] relative select-text flex flex-col">
              {isOnHomeScreen ? (
                /* Android 15 Launcher Home Screen */
                <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-b from-[#131b2e] via-[#0f1420] to-[#0a0d14]">
                  <div className="pt-8 space-y-1 text-center">
                    <div className="text-5xl font-light tracking-tight text-white font-mono">
                      {clockText}
                    </div>
                    <div className="text-xs text-slate-300">Thu, Oct 29 · Pixel 9 Pro</div>
                  </div>

                  <div className="my-auto flex flex-col items-center gap-6">
                    {/* At-a-Glance Next Run Widget */}
                    <button
                      type="button"
                      onClick={() => setIsOnHomeScreen(false)}
                      className="w-full rounded-3xl bg-[#181e2c]/90 border border-slate-700/70 p-4 text-left space-y-2 shadow-xl cursor-pointer hover:border-cyan-400/60 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold">
                        <span>NEXT COACH RUN · FRI OCT 30</span>
                        <span className="font-mono">1h5m · 15 km</span>
                      </div>
                      <div className="text-sm font-bold text-white">Fartlek (10x 1m / 1m)</div>
                      <div className="text-xs text-slate-400 font-mono">
                        30m warmup · 10x 3:42-3:20/km · 15m cooldown
                      </div>
                    </button>

                    {/* App Icon to relaunch */}
                    <button
                      type="button"
                      onClick={() => setIsOnHomeScreen(false)}
                      className="flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Footprints className="w-8 h-8 text-slate-950" />
                      </div>
                      <span className="text-xs font-medium text-slate-200">Intervals.icu</span>
                    </button>
                  </div>

                  <div className="text-center text-[11px] text-slate-400">
                    Tap the Intervals.icu icon or widget to launch MainActivity
                  </div>
                </div>
              ) : (
                children
              )}
            </div>

            {/* Android System 3-Button Navigation Bar (Back, Home, Overview) */}
            <div className="h-12 bg-[#0a0c10] border-t border-slate-800/80 flex items-center justify-around px-10 shrink-0 z-40">
              <button
                type="button"
                onClick={() => {
                  if (showNotificationShade) {
                    setShowNotificationShade(false);
                  } else if (isOnHomeScreen) {
                    setIsOnHomeScreen(false);
                  } else {
                    onBackGesture();
                  }
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Android Back Button"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowNotificationShade(false);
                  onHomeGesture();
                  setIsOnHomeScreen((prev) => !prev);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Android Home Button (Toggle Launcher / App)"
              >
                <Circle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowNotificationShade(false);
                  setIsOnHomeScreen(false);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Recent Apps"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right-Side Emulator Hardware Strip */}
          <div className="hidden sm:flex flex-col gap-2 pt-16">
            <button
              type="button"
              onClick={() => {
                setIsOnHomeScreen(false);
                onHomeGesture();
              }}
              className="w-10 h-10 rounded-xl bg-[#161b26] border border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset App to Calendar Home"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onForceCollect}
              className="w-10 h-10 rounded-xl bg-[#161b26] border border-slate-800 hover:border-cyan-500/50 flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Trigger WorkManager Force Collect"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
