import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Footprints,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import { CompletedActivity, SportType } from '../types/intervals';
import { formatPaceShort, formatSecondsToClock } from '../utils/formatters';

interface CompletedActivityDetailProps {
  activity: CompletedActivity;
  onClose: () => void;
  onPrevActivity?: () => void;
  onNextActivity?: () => void;
}

type DetailTab = 'TIMELINE' | 'PACE_POWER' | 'HR_ZONES' | 'INTERVALS';
type IntervalFilter = 'ALL' | 'WORK' | 'RECOVERY';

function getSportIcon(sport: SportType) {
  switch (sport) {
    case 'Run':
      return <Footprints className="w-6 h-6 text-slate-200" />;
    case 'Swim':
      return <Waves className="w-6 h-6 text-sky-400" />;
    case 'Strength':
      return <Dumbbell className="w-6 h-6 text-slate-200" />;
    case 'Pilates':
    case 'Yoga':
    case 'Mobility':
      return <Sparkles className="w-6 h-6 text-lime-400" />;
    default:
      return <Activity className="w-6 h-6 text-cyan-400" />;
  }
}

export const CompletedActivityDetail: React.FC<CompletedActivityDetailProps> = ({
  activity,
  onClose,
  onPrevActivity,
  onNextActivity,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('TIMELINE');
  const [intervalFilter, setIntervalFilter] = useState<IntervalFilter>('ALL');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const isRun = activity.sport === 'Run';
  const streams = activity.streams || [];
  const hasPaceStream = isRun && streams.some((p) => p.paceSecPerKm > 0);
  const hasPowerStream = streams.some((p) => p.powerWatts > 0);
  const hasCadenceStream = streams.some((p) => p.cadenceSpm > 0);

  const activePoint =
    hoverIndex !== null && streams[hoverIndex]
      ? streams[hoverIndex]
      : streams[Math.floor(streams.length / 2)] || null;

  // Build SVG polyline and area paths for each telemetry track
  const chartData = useMemo(() => {
    if (streams.length < 2) return null;
    const width = 900;
    const height = 64;
    const n = streams.length - 1;

    // 1. Pace track (inverted: lower sec/km = faster = closer to top y=4)
    const validPaces = streams.map((s) => s.paceSecPerKm).filter((v) => v > 0);
    const minPace = validPaces.length ? Math.min(...validPaces) - 10 : 240;
    const maxPace = validPaces.length ? Math.max(...validPaces) + 15 : 560;
    const pacePoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const val = s.paceSecPerKm || maxPace;
      const ratio = (val - minPace) / Math.max(1, maxPace - minPace);
      const y = 5 + ratio * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // 2. Power track
    const maxWatts = Math.max(450, ...streams.map((s) => s.powerWatts));
    const powerPoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const y = height - 4 - (s.powerWatts / maxWatts) * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // 3. Heart rate track
    const minHr = Math.max(50, Math.min(...streams.map((s) => s.heartRateBpm)) - 8);
    const maxHr = Math.max(minHr + 20, ...streams.map((s) => s.heartRateBpm)) + 5;
    const hrPoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const ratio = (s.heartRateBpm - minHr) / Math.max(1, maxHr - minHr);
      const y = height - 4 - ratio * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // 4. Cadence track
    const maxCad = Math.max(85, ...streams.map((s) => s.cadenceSpm));
    const cadPoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const y = height - 4 - (s.cadenceSpm / maxCad) * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // 5. Altitude track
    const minAlt = Math.min(...streams.map((s) => s.altitudeMeters)) - 1;
    const maxAlt = Math.max(minAlt + 6, ...streams.map((s) => s.altitudeMeters)) + 1;
    const altPoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const ratio = (s.altitudeMeters - minAlt) / Math.max(1, maxAlt - minAlt);
      const y = height - 4 - ratio * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const toArea = (pts: string[]) =>
      `M 0,${height} L ${pts.join(' L ')} L ${width},${height} Z`;
    const toLine = (pts: string[]) => `M ${pts.join(' L ')}`;

    return {
      width,
      height,
      paceLine: toLine(pacePoints),
      paceArea: toArea(pacePoints),
      powerLine: toLine(powerPoints),
      powerArea: toArea(powerPoints),
      hrLine: toLine(hrPoints),
      hrArea: toArea(hrPoints),
      cadLine: toLine(cadPoints),
      cadArea: toArea(cadPoints),
      altLine: toLine(altPoints),
      altArea: toArea(altPoints),
      minPace,
      maxPace,
      maxWatts,
      minHr,
      maxHr,
      maxCad,
      minAlt: Math.round(minAlt),
      maxAlt: Math.round(maxAlt),
    };
  }, [streams]);

  const filteredIntervals = useMemo(() => {
    if (intervalFilter === 'ALL') return activity.intervals;
    return activity.intervals.filter((it) => it.type === intervalFilter);
  }, [activity.intervals, intervalFilter]);

  const parsedDate = new Date(`${activity.date}T12:00:00`);
  const formattedDate = parsedDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (streams.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (streams.length - 1));
    setHoverIndex(idx);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (streams.length === 0 || !e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (streams.length - 1));
    setHoverIndex(idx);
  };

  const crosshairLeftPct =
    hoverIndex !== null && streams.length > 1
      ? (hoverIndex / (streams.length - 1)) * 100
      : 50;

  return (
    <div className="bg-[#141720] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
      {/* Top Bar with Back / Prev / Next / Close */}
      <div className="px-4 py-3 sm:px-6 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-[#11141c]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Calendar</span>
          </button>

          <div className="flex items-center gap-1 ml-1">
            {onPrevActivity && (
              <button
                type="button"
                onClick={onPrevActivity}
                className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Previous completed activity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {onNextActivity && (
              <button
                type="button"
                onClick={onNextActivity}
                className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Next completed activity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="min-w-0 ml-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
              {activity.name}
            </h2>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums truncate">
              {formattedDate} · {activity.startTime} · ~ {activity.deviceName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Close activity detail"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dense Athlete Telemetry Header — Matches Screenshot 2 */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#161923]">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 text-xs font-mono tabular-nums">
          {/* Col 1: Core Distance & Duration */}
          <div className="flex items-start gap-3 col-span-2 sm:col-span-1">
            <div className="w-11 h-11 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0">
              {getSportIcon(activity.sport)}
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-slate-100">
                {activity.distanceKm ? `${activity.distanceKm} km` : activity.sport}{' '}
                <span className="text-slate-300">{activity.movingTimeLabel}</span>
              </div>
              {activity.coastingLabel && (
                <div className="text-[11px] text-slate-400">
                  Coasting <span className="text-slate-200">{activity.coastingLabel}</span>
                </div>
              )}
              {activity.avgSpeedKmh !== undefined && (
                <div className="text-[11px] text-slate-400">
                  Avg Speed <span className="text-slate-200">{activity.avgSpeedKmh} km/h</span>
                </div>
              )}
              {activity.climbingMeters !== undefined && (
                <div className="text-[11px] text-slate-400">
                  Climbing <span className="text-slate-200">{activity.climbingMeters}m</span>
                </div>
              )}
            </div>
          </div>

          {/* Col 2: Pace & GAP */}
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Pace</span>
              <span className="font-bold text-cyan-300">{activity.paceFormatted || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">GAP</span>
              <span className="font-bold text-slate-100">{activity.gapFormatted || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Threshold</span>
              <span className="text-slate-200">{activity.thresholdPaceFormatted || '3:20/km'}</span>
            </div>
            {activity.compliancePct !== undefined && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 font-sans">Compliance</span>
                <span className="font-bold text-amber-400">✓ {activity.compliancePct}%</span>
              </div>
            )}
          </div>

          {/* Col 3: Intensity, Load, RPE, Feel */}
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Intensity</span>
              <span className="font-bold text-slate-100">
                {activity.intensityPct !== undefined ? `${activity.intensityPct}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Load</span>
              <span className="font-bold text-slate-100">{activity.load}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">RPE / Feel</span>
              <span className="text-emerald-400 font-semibold">
                {activity.rpe ?? 2} · {activity.feel || 'Good'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Class</span>
              <span className="text-slate-200">{activity.trainingClass || 'Base'}</span>
            </div>
          </div>

          {/* Col 4: Heart Rate & TRIMP */}
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Avg HR</span>
              <span className="font-bold text-rose-400">
                {activity.avgHr} bpm {activity.avgHrPct ? `(${activity.avgHrPct}%)` : ''}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Max HR</span>
              <span className="text-slate-200">
                {activity.maxHr ?? '—'} bpm {activity.maxHrPct ? `(${activity.maxHrPct}%)` : ''}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">TRIMP</span>
              <span className="text-slate-200">{activity.trimp ?? 89}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Cadence</span>
              <span className="text-fuchsia-300">
                {activity.cadence ? `${activity.cadence} spm` : '—'}
              </span>
            </div>
          </div>

          {/* Col 5: Power & Efficiency */}
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Norm Power</span>
              <span className="font-bold text-purple-300">
                {activity.normPower ? `${activity.normPower}w` : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Avg Power</span>
              <span className="text-slate-200">
                {activity.avgPower ? `${activity.avgPower}w` : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Variability</span>
              <span className="text-slate-200">{activity.variabilityIndex ?? '0.99'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Efficiency</span>
              <span className="text-slate-200">{activity.efficiencyFactor ?? '2.20'}</span>
            </div>
          </div>

          {/* Col 6: Fitness / Fatigue / Form / Energy */}
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Fitness / Fatigue</span>
              <span>
                <strong className="text-sky-400">{activity.fitness}</strong> /{' '}
                <strong className="text-purple-400">{activity.fatigue}</strong>
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Form</span>
              <span
                className={`font-bold ${
                  activity.form >= 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {activity.form}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Work</span>
              <span className="text-slate-200">
                {activity.workKj ? `${activity.workKj} kJ` : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400 font-sans">Calories</span>
              <span className="text-slate-200">{activity.calories ?? '—'} kcal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar (TIMELINE | PACE & POWER | HR & ZONES | INTERVALS) */}
      <div className="px-4 sm:px-6 border-b border-slate-800/80 bg-[#12151e] flex items-center gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'TIMELINE', label: 'TIMELINE' },
            { id: 'PACE_POWER', label: 'POWER & PACE' },
            { id: 'HR_ZONES', label: 'HR & ZONES' },
            { id: 'INTERVALS', label: `INTERVALS (${activity.intervals.length})` },
          ] as { id: DetailTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] px-3.5 text-xs font-semibold tracking-wide border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area by Active Tab */}
      {activeTab === 'TIMELINE' && chartData && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Interactive Crosshair Summary Bar */}
          {activePoint && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#181c27] border border-slate-800/90 font-mono tabular-nums text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-sans">Cursor:</span>
                <span className="text-slate-100 font-bold">
                  {formatSecondsToClock(activePoint.timeSec)}
                </span>
                {activePoint.distanceKm > 0 && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-300">{activePoint.distanceKm} km</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                {activePoint.paceSecPerKm > 0 && (
                  <span>
                    <span className="text-slate-400 font-sans mr-1">Pace:</span>
                    <strong className="text-cyan-300">
                      {formatPaceShort(activePoint.paceSecPerKm)}/km
                    </strong>
                  </span>
                )}
                {activePoint.powerWatts > 0 && (
                  <span>
                    <span className="text-slate-400 font-sans mr-1">Power:</span>
                    <strong className="text-purple-300">{activePoint.powerWatts}w</strong>
                  </span>
                )}
                <span>
                  <span className="text-slate-400 font-sans mr-1">HR:</span>
                  <strong className="text-rose-400">{activePoint.heartRateBpm}bpm</strong>
                </span>
                {activePoint.cadenceSpm > 0 && (
                  <span>
                    <span className="text-slate-400 font-sans mr-1">Cadence:</span>
                    <strong className="text-fuchsia-300">{activePoint.cadenceSpm}</strong>
                  </span>
                )}
                <span>
                  <span className="text-slate-400 font-sans mr-1">Alt:</span>
                  <strong className="text-slate-200">{activePoint.altitudeMeters}m</strong>
                </span>
                <span className="text-teal-300 font-semibold">{activePoint.zone}</span>
              </div>
            </div>
          )}

          {/* 5-Track Synchronized Telemetry Stack — Matches Screenshot 2 */}
          <div
            className="relative select-none touch-pan-y cursor-crosshair"
            onMouseMove={handlePointerMove}
            onTouchMove={handleTouchMove}
          >
            {/* Track 1: Pace/km */}
            {hasPaceStream && (
              <div className="flex items-stretch border-b border-slate-800/80">
                <div className="w-16 shrink-0 flex items-center pr-2 py-1">
                  <span className="-rotate-90 text-[10px] text-slate-400 w-4 text-center whitespace-nowrap">
                    Pace/km
                  </span>
                  <div className="flex-1 h-16 flex flex-col justify-between text-right font-mono tabular-nums text-[10px] leading-none">
                    <span className="text-slate-300">4:17</span>
                    <span className="text-cyan-400 font-semibold">
                      {activity.paceFormatted?.replace('/km', '') || '5:22'}
                    </span>
                    <span className="text-teal-400">5:01</span>
                    <span className="text-slate-400">9:23</span>
                  </div>
                </div>
                <div className="relative flex-1 h-16 bg-[#10131b] overflow-hidden">
                  <svg
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                    preserveAspectRatio="none"
                    className="w-full h-full"
                  >
                    <path d={chartData.paceArea} fill="rgba(20, 184, 166, 0.28)" />
                    <path
                      d={chartData.paceLine}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.6"
                    />
                  </svg>
                  <div
                    className="absolute top-0 bottom-0 w-[1px] bg-sky-400/80 pointer-events-none"
                    style={{ left: `${crosshairLeftPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Track 2: Power (Watts) */}
            {hasPowerStream && (
              <div className="flex items-stretch border-b border-slate-800/80">
                <div className="w-16 shrink-0 flex items-center pr-2 py-1">
                  <span className="-rotate-90 text-[10px] text-slate-400 w-4 text-center whitespace-nowrap">
                    Power
                  </span>
                  <div className="flex-1 h-16 flex flex-col justify-between text-right font-mono tabular-nums text-[10px] leading-none">
                    <span className="text-slate-300">{chartData.maxWatts}</span>
                    <span className="text-purple-400 font-semibold">
                      {activity.avgPower || 273}
                    </span>
                    <span className="text-slate-400">0</span>
                  </div>
                </div>
                <div className="relative flex-1 h-16 bg-[#10131b] overflow-hidden">
                  <svg
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                    preserveAspectRatio="none"
                    className="w-full h-full"
                  >
                    <path d={chartData.powerArea} fill="rgba(168, 85, 247, 0.24)" />
                    <path
                      d={chartData.powerLine}
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div
                    className="absolute top-0 bottom-0 w-[1px] bg-sky-400/80 pointer-events-none"
                    style={{ left: `${crosshairLeftPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Track 3: Heart Rate (bpm) */}
            <div className="flex items-stretch border-b border-slate-800/80">
              <div className="w-16 shrink-0 flex items-center pr-2 py-1">
                <span className="-rotate-90 text-[10px] text-slate-400 w-4 text-center whitespace-nowrap">
                  Heartrate
                </span>
                <div className="flex-1 h-16 flex flex-col justify-between text-right font-mono tabular-nums text-[10px] leading-none">
                  <span className="text-slate-300">{activity.maxHr || 141}</span>
                  <span className="text-rose-400 font-semibold">{activity.avgHr}</span>
                  <span className="text-slate-400">{chartData.minHr}</span>
                </div>
              </div>
              <div className="relative flex-1 h-16 bg-[#10131b] overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  <path d={chartData.hrArea} fill="rgba(244, 63, 94, 0.24)" />
                  <path d={chartData.hrLine} fill="none" stroke="#f43f5e" strokeWidth="1.5" />
                </svg>
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-sky-400/80 pointer-events-none"
                  style={{ left: `${crosshairLeftPct}%` }}
                />
              </div>
            </div>

            {/* Track 4: Cadence (spm) */}
            {hasCadenceStream && (
              <div className="flex items-stretch border-b border-slate-800/80">
                <div className="w-16 shrink-0 flex items-center pr-2 py-1">
                  <span className="-rotate-90 text-[10px] text-slate-400 w-4 text-center whitespace-nowrap">
                    Cadence
                  </span>
                  <div className="flex-1 h-14 flex flex-col justify-between text-right font-mono tabular-nums text-[10px] leading-none">
                    <span className="text-slate-300">81</span>
                    <span className="text-fuchsia-400 font-semibold">
                      {activity.cadence || 76}
                    </span>
                    <span className="text-slate-400">0</span>
                  </div>
                </div>
                <div className="relative flex-1 h-14 bg-[#10131b] overflow-hidden">
                  <svg
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                    preserveAspectRatio="none"
                    className="w-full h-full"
                  >
                    <path d={chartData.cadArea} fill="rgba(236, 72, 153, 0.22)" />
                    <path
                      d={chartData.cadLine}
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div
                    className="absolute top-0 bottom-0 w-[1px] bg-sky-400/80 pointer-events-none"
                    style={{ left: `${crosshairLeftPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Track 5: Altitude (m) */}
            <div className="flex items-stretch border-b border-slate-700/80">
              <div className="w-16 shrink-0 flex items-center pr-2 py-1">
                <span className="-rotate-90 text-[10px] text-slate-400 w-4 text-center whitespace-nowrap">
                  Altitude
                </span>
                <div className="flex-1 h-14 flex flex-col justify-between text-right font-mono tabular-nums text-[10px] leading-none text-slate-300">
                  <span>{chartData.maxAlt}</span>
                  <span>{Math.round((chartData.maxAlt + chartData.minAlt) / 2)}</span>
                  <span>{chartData.minAlt}</span>
                </div>
              </div>
              <div className="relative flex-1 h-14 bg-[#10131b] overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  <path d={chartData.altArea} fill="rgba(148, 163, 184, 0.35)" />
                  <path
                    d={chartData.altLine}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                </svg>
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-sky-400/80 pointer-events-none"
                  style={{ left: `${crosshairLeftPct}%` }}
                />
              </div>
            </div>

            {/* Distance & Elapsed Time Rulers */}
            {activity.distanceKm && (
              <div className="flex items-center pl-16 pt-1 font-mono tabular-nums text-[10px] text-slate-400 justify-between">
                {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((r) => (
                  <span key={r}>{(activity.distanceKm! * r).toFixed(1)} km</span>
                ))}
              </div>
            )}
            <div className="flex items-center pl-16 pt-1 font-mono tabular-nums text-[10px] text-slate-300 justify-between">
              {[0, 0.166, 0.333, 0.5, 0.666, 0.833, 1].map((r) => (
                <span key={r}>
                  {formatSecondsToClock(Math.round(activity.movingTimeSec * r))}
                </span>
              ))}
            </div>
          </div>

          {/* Paired Planned Workout Reference Block — Shown only for Running workouts */}
          {isRun && activity.plannedWorkoutSummary && (
            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                <span className="text-slate-300 font-medium">
                  Paired Planned Workout: {activity.plannedWorkoutSummary.name}
                </span>
                <div className="flex items-center gap-4 font-mono tabular-nums text-xs">
                  <span>
                    <span className="text-slate-400 font-sans">Time </span>
                    <strong className="text-slate-100">
                      {activity.plannedWorkoutSummary.durationLabel}
                    </strong>
                  </span>
                  <span>
                    <span className="text-slate-400 font-sans">Load </span>
                    <strong className="text-slate-100">
                      {activity.plannedWorkoutSummary.load}
                    </strong>
                  </span>
                  <span>
                    <span className="text-slate-400 font-sans">Intensity </span>
                    <strong className="text-slate-100">
                      {activity.plannedWorkoutSummary.intensityPct}%
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-stretch">
                <div className="w-16 shrink-0 flex items-center pr-2">
                  <span className="-rotate-90 text-[10px] text-slate-400 w-4 text-center whitespace-nowrap">
                    Pace/km
                  </span>
                  <div className="flex-1 h-14 flex flex-col justify-between text-right font-mono tabular-nums text-[10px] text-slate-400">
                    <span>{activity.plannedWorkoutSummary.paceTopFormatted}</span>
                    <span>{activity.plannedWorkoutSummary.paceMidFormatted}</span>
                    <span>{activity.plannedWorkoutSummary.paceBotFormatted}</span>
                  </div>
                </div>
                <div className="flex-1 h-14 bg-[#10131b] border-l border-b border-slate-700/80 flex items-end p-[1px]">
                  <div className="w-full h-[82%] bg-teal-600/85 rounded-t-[2px]" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* POWER & PACE Analysis Tab */}
      {activeTab === 'PACE_POWER' && (
        <div className="p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">
            Pace & Running Power Efficiency Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
            <div className="p-3.5 rounded-xl bg-[#181c27] border border-slate-800/80">
              <div className="text-xs text-slate-400 font-sans">Average Pace</div>
              <div className="text-lg font-bold text-cyan-300 mt-1">
                {activity.paceFormatted || '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                GAP: {activity.gapFormatted || '—'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#181c27] border border-slate-800/80">
              <div className="text-xs text-slate-400 font-sans">Normalized Power</div>
              <div className="text-lg font-bold text-purple-300 mt-1">
                {activity.normPower ? `${activity.normPower} W` : '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Avg: {activity.avgPower ? `${activity.avgPower} W` : '—'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#181c27] border border-slate-800/80">
              <div className="text-xs text-slate-400 font-sans">Running Cadence</div>
              <div className="text-lg font-bold text-fuchsia-300 mt-1">
                {activity.cadence ? `${activity.cadence} spm` : '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Stride: {activity.strideMeters ? `${activity.strideMeters}m` : '—'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#181c27] border border-slate-800/80">
              <div className="text-xs text-slate-400 font-sans">Power / HR Ratio</div>
              <div className="text-lg font-bold text-emerald-300 mt-1">
                {activity.powerHrRatio ?? '2.20'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                EF: {activity.efficiencyFactor ?? '2.20'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HR & ZONES Tab */}
      {activeTab === 'HR_ZONES' && (
        <div className="p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">
            Heart Rate & Intensity Zone Distribution
          </h3>
          <div className="space-y-2.5 font-mono tabular-nums text-xs">
            {[
              { zone: 'Z1 · Recovery / Easy Aerobic (< 134 bpm)', pct: 86, color: '#0d9488' },
              { zone: 'Z2 · Endurance Base (135 – 148 bpm)', pct: 11, color: '#16a34a' },
              { zone: 'Z3 · Tempo (149 – 160 bpm)', pct: 3, color: '#eab308' },
              { zone: 'Z4 · Sub-Threshold (161 – 171 bpm)', pct: 0, color: '#ea580c' },
              { zone: 'Z5 · VO2 Max (> 172 bpm)', pct: 0, color: '#ef4444' },
            ].map((row) => (
              <div key={row.zone} className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">{row.zone}</span>
                  <span>{row.pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-xs overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intervals & Laps Table (Always shown on TIMELINE bottom and in INTERVALS tab) */}
      {(activeTab === 'TIMELINE' || activeTab === 'INTERVALS') && (
        <div className="p-4 sm:p-6 border-t border-slate-800/80 bg-[#12151e] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-sky-400 tracking-wide">
              Intervals & Splits
            </h3>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
              {(['ALL', 'WORK', 'RECOVERY'] as IntervalFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setIntervalFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    intervalFilter === f
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredIntervals.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No structured interval splits recorded for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono tabular-nums text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-sans">
                    <th className="py-2 pr-3 font-medium">Interval</th>
                    <th className="py-2 px-2 font-medium">Elapsed Time</th>
                    <th className="py-2 px-2 font-medium">Dist</th>
                    <th className="py-2 px-2 font-medium">Pace</th>
                    <th className="py-2 px-2 font-medium">Avg Cadence</th>
                    <th className="py-2 px-2 font-medium">Avg HR</th>
                    <th className="py-2 px-2 font-medium">Max HR</th>
                    <th className="py-2 px-2 font-medium">Avg Power</th>
                    <th className="py-2 pl-2 font-medium text-right">Zone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredIntervals.map((split) => (
                    <tr key={split.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 pr-3 font-sans font-medium text-slate-200 whitespace-nowrap">
                        {split.name}
                      </td>
                      <td className="py-2.5 px-2 text-slate-300">{split.elapsedTimeLabel}</td>
                      <td className="py-2.5 px-2 text-slate-300">
                        {split.distanceKm > 0 ? `${split.distanceKm} km` : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-cyan-300 font-semibold">
                        {split.paceFormatted}
                      </td>
                      <td className="py-2.5 px-2 text-fuchsia-300">
                        {split.avgCadence > 0 ? split.avgCadence : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-rose-400 font-semibold">
                        {split.avgHr} bpm
                      </td>
                      <td className="py-2.5 px-2 text-slate-300">{split.maxHr} bpm</td>
                      <td className="py-2.5 px-2 text-purple-300">
                        {split.avgPower > 0 ? `${split.avgPower}w` : '—'}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-semibold text-teal-400">
                        {split.zone} ({split.intensityPct}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
