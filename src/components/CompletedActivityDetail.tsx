import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Dumbbell,
  Footprints,
  Sparkles,
  Waves,
} from 'lucide-react';
import { ActivityStreamPoint, CompletedActivity, SportType, TrainingZone } from '../types/intervals';
import { formatPaceShort, formatSecondsToClock } from '../utils/formatters';

interface CompletedActivityDetailProps {
  activity: CompletedActivity;
  isLight?: boolean;
  onClose: () => void;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  swipeIndexLabel?: string;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

type DetailTab = 'TIMELINE' | 'PACE_POWER' | 'HR_ZONES' | 'INTERVALS';
type IntervalFilter = 'ALL' | 'WORK' | 'RECOVERY';

function getSportIcon(sport: SportType) {
  switch (sport) {
    case 'Run':
      return <Footprints className="w-5 h-5 text-orange-500" />;
    case 'Swim':
      return <Waves className="w-5 h-5 text-sky-500" />;
    case 'Strength':
      return <Dumbbell className="w-5 h-5 text-purple-500" />;
    case 'Pilates':
    case 'Yoga':
    case 'Mobility':
      return <Sparkles className="w-5 h-5 text-emerald-500" />;
    default:
      return <Activity className="w-5 h-5 text-cyan-500" />;
  }
}

export const CompletedActivityDetail: React.FC<CompletedActivityDetailProps> = ({
  activity,
  isLight = false,
  onClose,
  onSwipePrev,
  onSwipeNext,
  swipeIndexLabel,
  t,
}) => {
  const tr = (key: string, fallback: string, params?: Record<string, string | number>) =>
    t ? t(key, params) : fallback;
  const [activeTab, setActiveTab] = useState<DetailTab>('TIMELINE');
  const [intervalFilter, setIntervalFilter] = useState<IntervalFilter>('ALL');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [liveStreams, setLiveStreams] = useState<ActivityStreamPoint[]>(activity.streams || []);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleSwipeStart = (clientX: number, clientY: number, target?: EventTarget | null) => {
    if (!onSwipePrev && !onSwipeNext) return;
    // Do not start a card swipe if the user is scrubbing an interactive SVG chart
    if (target instanceof Element && target.closest('svg')) {
      swipeStartRef.current = null;
      return;
    }
    swipeStartRef.current = { x: clientX, y: clientY };
  };

  const handleSwipeEnd = (clientX: number, clientY: number) => {
    if (!swipeStartRef.current) return;
    const deltaX = clientX - swipeStartRef.current.x;
    const deltaY = clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
      if (deltaX < 0 && onSwipeNext) {
        onSwipeNext();
      } else if (deltaX > 0 && onSwipePrev) {
        onSwipePrev();
      }
    }
  };

  useEffect(() => {
    setLiveStreams(activity.streams || []);
    if (!activity.id) return;

    let cancelled = false;
    const fetchStreams = async () => {
      try {
        let accessToken = '';
        try {
          const saved = localStorage.getItem('intervals_icu_oauth_token_v5');
          if (saved) {
            const parsed = JSON.parse(saved);
            accessToken = parsed?.accessToken || '';
          }
        } catch {
          // ignore
        }

        const headers: Record<string, string> = {};
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const res = await fetch(
          `/api/intervals/activity/${encodeURIComponent(activity.id)}/streams`,
          { headers }
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const rawStreams = Array.isArray(data?.streams) ? data.streams : [];
        if (rawStreams.length === 0 || cancelled) return;

        const byType: Record<string, number[]> = {};
        for (const s of rawStreams) {
          if (s && typeof s.type === 'string' && Array.isArray(s.data)) {
            byType[s.type] = s.data.map((v: unknown) => Number(v || 0));
          }
        }

        const timeArr = byType.time || [];
        const distArr = byType.distance || [];
        const velArr = byType.velocity_smooth || [];
        const wattsArr = byType.watts || [];
        const hrArr = byType.heartrate || [];
        const cadArr = byType.cadence || [];
        const altArr = byType.altitude || [];

        const totalPoints = Math.max(
          timeArr.length,
          velArr.length,
          hrArr.length,
          wattsArr.length
        );
        if (totalPoints < 2) return;

        // Downsample to at most 120 points for smooth SVG rendering
        const step = Math.max(1, Math.floor(totalPoints / 120));
        const parsed: ActivityStreamPoint[] = [];
        for (let i = 0; i < totalPoints; i += step) {
          const vMs = velArr[i] || 0;
          const paceSec = vMs > 0.4 ? Math.round(1000 / vMs) : 0;
          const hr = Math.round(hrArr[i] || 0);
          const maxHrRef = activity.maxHr || 185;
          const hrRatio = maxHrRef > 0 ? hr / maxHrRef : 0;
          const zone: TrainingZone =
            hrRatio >= 0.92
              ? 'Z5'
              : hrRatio >= 0.85
              ? 'Z4'
              : hrRatio >= 0.78
              ? 'Z3'
              : hrRatio >= 0.68
              ? 'Z2'
              : 'Z1';

          parsed.push({
            timeSec: Math.round(timeArr[i] || 0),
            distanceKm: distArr[i] ? Number((distArr[i] / 1000).toFixed(2)) : 0,
            paceSecPerKm: paceSec,
            powerWatts: Math.round(wattsArr[i] || 0),
            heartRateBpm: hr,
            cadenceSpm: Math.round(cadArr[i] || 0),
            altitudeMeters: Math.round(altArr[i] || 0),
            zone,
          });
        }

        if (!cancelled && parsed.length >= 2) {
          setLiveStreams(parsed);
        }
      } catch {
        // ignore network errors
      }
    };

    fetchStreams();
    return () => {
      cancelled = true;
    };
  }, [activity.id, activity.maxHr, activity.streams]);

  const isRun = activity.sport === 'Run';
  const streams = liveStreams;
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
    const height = 56;
    const n = streams.length - 1;

    // 1. Pace track (inverted: lower sec/km = faster = closer to top y=4)
    const validPaces = streams.map((s) => s.paceSecPerKm).filter((v) => v > 0);
    const minPace = validPaces.length ? Math.min(...validPaces) - 10 : 240;
    const maxPace = validPaces.length ? Math.max(...validPaces) + 15 : 560;
    const pacePoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const val = s.paceSecPerKm || maxPace;
      const ratio = (val - minPace) / Math.max(1, maxPace - minPace);
      const y = 4 + ratio * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // 2. Power track
    const maxWatts = Math.max(100, ...streams.map((s) => s.powerWatts));
    const powerPoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const y = height - 4 - (s.powerWatts / maxWatts) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // 3. Heart rate track
    const validHr = streams.map((s) => s.heartRateBpm).filter((v) => v > 0);
    const minHr = validHr.length ? Math.max(40, Math.min(...validHr) - 8) : 60;
    const maxHr = validHr.length ? Math.max(minHr + 20, Math.max(...validHr) + 5) : 180;
    const hrPoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const ratio = ((s.heartRateBpm || minHr) - minHr) / Math.max(1, maxHr - minHr);
      const y = height - 4 - ratio * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // 4. Cadence track
    const maxCad = Math.max(85, ...streams.map((s) => s.cadenceSpm));
    const cadPoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const y = height - 4 - (s.cadenceSpm / maxCad) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // 5. Altitude track
    const minAlt = Math.min(...streams.map((s) => s.altitudeMeters)) - 1;
    const maxAlt = Math.max(minAlt + 6, ...streams.map((s) => s.altitudeMeters)) + 1;
    const altPoints = streams.map((s, i) => {
      const x = (i / n) * width;
      const ratio = (s.altitudeMeters - minAlt) / Math.max(1, maxAlt - minAlt);
      const y = height - 4 - ratio * (height - 8);
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

  const hrZoneRows = useMemo(() => {
    const counts: Record<TrainingZone, number> = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
    for (const pt of streams) {
      if (pt.heartRateBpm > 0) {
        counts[pt.zone] = (counts[pt.zone] || 0) + 1;
      }
    }
    const total = Math.max(
      1,
      Object.values(counts).reduce((acc, v) => acc + v, 0)
    );
    const hasAnyHr = streams.some((pt) => pt.heartRateBpm > 0);
    return [
      { zone: 'Z1 · Recovery / Easy Aerobic', pct: hasAnyHr ? Math.round((counts.Z1 / total) * 100) : 0, color: '#0d9488' },
      { zone: 'Z2 · Endurance Base', pct: hasAnyHr ? Math.round((counts.Z2 / total) * 100) : 0, color: '#16a34a' },
      { zone: 'Z3 · Tempo', pct: hasAnyHr ? Math.round((counts.Z3 / total) * 100) : 0, color: '#eab308' },
      { zone: 'Z4 · Sub-Threshold', pct: hasAnyHr ? Math.round((counts.Z4 / total) * 100) : 0, color: '#ea580c' },
      { zone: 'Z5 · VO2 Max', pct: hasAnyHr ? Math.round((counts.Z5 / total) * 100) : 0, color: '#ef4444' },
    ];
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

  const labelColor = isLight ? 'text-slate-500' : 'text-slate-400';
  const valueColor = isLight ? 'text-slate-900' : 'text-slate-100';
  const subValueColor = isLight ? 'text-slate-700' : 'text-slate-200';
  const subCardBg = isLight
    ? 'bg-white border-slate-200'
    : 'bg-[#11141d] border-slate-800/90';

  return (
    <div
      onTouchStart={(e) => {
        if (e.touches[0]) {
          handleSwipeStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
        }
      }}
      onTouchEnd={(e) => {
        if (e.changedTouches[0]) {
          handleSwipeEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
      }}
      onMouseDown={(e) => handleSwipeStart(e.clientX, e.clientY, e.target)}
      onMouseUp={(e) => handleSwipeEnd(e.clientX, e.clientY)}
      className={`rounded-2xl border shadow-xl overflow-hidden text-xs ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#141720] border-slate-800/90 text-slate-100'
      }`}
    >
      {/* Top Bar with Icon-Only Back Button (matches PlannedWorkoutDetail) */}
      <div
        className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 ${
          isLight
            ? 'bg-slate-50 border-slate-200'
            : 'bg-[#11141c] border-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[34px] min-w-[34px] -ml-1 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
            }`}
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-slate-800/90 border-slate-700/80'
            }`}
          >
            {getSportIcon(activity.sport)}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className={`text-sm font-bold leading-snug truncate ${valueColor}`}>
              {activity.name}
            </h2>
            <p className={`text-[11px] font-mono tabular-nums truncate ${labelColor}`}>
              {formattedDate} · {activity.startTime} · {activity.deviceName}
            </p>
          </div>
        </div>

        {swipeIndexLabel && (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-500'
                : 'bg-[#171b26] border-slate-800 text-slate-400'
            }`}
            title="Swipe left or right for next/previous card"
          >
            ‹ {swipeIndexLabel} ›
          </span>
        )}
      </div>

      {/* Athlete Telemetry Stacked Column Layout (Never overlaps on mobile!) */}
      <div
        className={`p-3.5 border-b space-y-2 font-mono tabular-nums text-[11px] ${
          isLight
            ? 'bg-slate-50/60 border-slate-200'
            : 'bg-[#161923] border-slate-800/80'
        }`}
      >
        {/* Row 1: Primary Distance, Moving Time & Speed/Climbing */}
        <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${subCardBg}`}>
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-extrabold ${valueColor}`}>
              {activity.distanceKm ? `${activity.distanceKm} km` : activity.sport}
            </span>
            <span className={`text-xs font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
              {activity.movingTimeLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {activity.avgSpeedKmh !== undefined && (
              <span>
                <span className={`font-sans ${labelColor}`}>Speed </span>
                <strong className={subValueColor}>{activity.avgSpeedKmh} km/h</strong>
              </span>
            )}
            {activity.climbingMeters !== undefined && (
              <span>
                <span className={`font-sans ${labelColor}`}>Climb </span>
                <strong className={subValueColor}>{activity.climbingMeters}m</strong>
              </span>
            )}
            {activity.coastingLabel && (
              <span>
                <span className={`font-sans ${labelColor}`}>Coast </span>
                <strong className={subValueColor}>{activity.coastingLabel}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Pace, GAP, Threshold & Compliance */}
        <div className={`p-2.5 rounded-xl border grid grid-cols-2 gap-x-4 gap-y-1 ${subCardBg}`}>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.pace', 'Pace')}</span>
            <span className={`font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
              {activity.paceFormatted || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.gap', 'GAP')}</span>
            <span className={`font-bold ${valueColor}`}>{activity.gapFormatted || '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.threshold', 'Threshold')}</span>
            <span className={subValueColor}>{activity.thresholdPaceFormatted || '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.compliance', 'Compliance')}</span>
            <span className={`font-bold ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
              {activity.compliancePct !== undefined ? `✓ ${activity.compliancePct}%` : '—'}
            </span>
          </div>
        </div>

        {/* Row 3: Intensity, Load, RPE/Feel & Class */}
        <div className={`p-2.5 rounded-xl border grid grid-cols-2 gap-x-4 gap-y-1 ${subCardBg}`}>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('detail.intensity', 'Intensity')}</span>
            <span className={`font-bold ${valueColor}`}>
              {activity.intensityPct !== undefined ? `${activity.intensityPct}%` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('detail.load', 'Load')}</span>
            <span className={`font-bold ${valueColor}`}>{activity.load}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.rpe_feel', 'RPE / Feel')}</span>
            <span className={`font-semibold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
              {activity.rpe || activity.feel
                ? `${activity.rpe ?? '—'}${activity.feel ? ` · ${activity.feel}` : ''}`
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.class', 'Class')}</span>
            <span className={subValueColor}>{activity.trainingClass || '—'}</span>
          </div>
        </div>

        {/* Row 4: Heart Rate, TRIMP & Cadence */}
        <div className={`p-2.5 rounded-xl border grid grid-cols-2 gap-x-4 gap-y-1 ${subCardBg}`}>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.avg_hr', 'Avg HR')}</span>
            <span className={`font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
              {activity.avgHr > 0 ? `${activity.avgHr} bpm` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.max_hr', 'Max HR')}</span>
            <span className={subValueColor}>
              {activity.maxHr ? `${activity.maxHr} bpm` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>TRIMP</span>
            <span className={subValueColor}>{activity.trimp ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.cadence', 'Cadence')}</span>
            <span className={isLight ? 'text-fuchsia-600 font-semibold' : 'text-fuchsia-300'}>
              {activity.cadence ? `${activity.cadence} spm` : '—'}
            </span>
          </div>
        </div>

        {/* Row 5: Power, Efficiency & Fitness / Fatigue / Form */}
        <div className={`p-2.5 rounded-xl border grid grid-cols-2 gap-x-4 gap-y-1 ${subCardBg}`}>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.norm_power', 'Norm Power')}</span>
            <span className={`font-bold ${isLight ? 'text-purple-600' : 'text-purple-300'}`}>
              {activity.normPower ? `${activity.normPower}w` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.avg_power', 'Avg Power')}</span>
            <span className={subValueColor}>
              {activity.avgPower ? `${activity.avgPower}w` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.variability', 'Variability')}</span>
            <span className={subValueColor}>{activity.variabilityIndex ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.efficiency', 'Efficiency')}</span>
            <span className={subValueColor}>{activity.efficiencyFactor ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.fitness_fatigue', 'Fit / Fat')}</span>
            <span>
              <strong className={isLight ? 'text-sky-600' : 'text-sky-400'}>{activity.fitness}</strong> /{' '}
              <strong className={isLight ? 'text-purple-600' : 'text-purple-400'}>{activity.fatigue}</strong>
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.form', 'Form')}</span>
            <span
              className={`font-bold ${
                activity.form >= 0
                  ? isLight
                    ? 'text-amber-600'
                    : 'text-amber-400'
                  : isLight
                  ? 'text-emerald-600'
                  : 'text-emerald-400'
              }`}
            >
              {activity.form}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.work', 'Work')}</span>
            <span className={subValueColor}>
              {activity.workKj ? `${activity.workKj} kJ` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`font-sans ${labelColor}`}>{tr('activity.calories', 'Calories')}</span>
            <span className={subValueColor}>{activity.calories ?? '—'} kcal</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar (TIMELINE | POWER & PACE | HR & ZONES | INTERVALS) */}
      <div
        className={`px-3.5 border-b flex items-center gap-1 overflow-x-auto no-scrollbar ${
          isLight
            ? 'bg-slate-50 border-slate-200'
            : 'bg-[#12151e] border-slate-800/80'
        }`}
      >
        {(
          [
            { id: 'TIMELINE', label: tr('activity.tab.timeline', 'TIMELINE') },
            { id: 'PACE_POWER', label: tr('activity.tab.power_pace', 'POWER & PACE') },
            { id: 'HR_ZONES', label: tr('activity.tab.hr_zones', 'HR & ZONES') },
            {
              id: 'INTERVALS',
              label: tr('activity.tab.intervals', `INTERVALS (${activity.intervals.length})`, {
                count: activity.intervals.length,
              }),
            },
          ] as { id: DetailTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[40px] px-3 text-[11px] font-semibold tracking-wide border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? isLight
                  ? 'border-sky-600 text-sky-600'
                  : 'border-sky-400 text-sky-400'
                : isLight
                ? 'border-transparent text-slate-500 hover:text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area by Active Tab */}
      {activeTab === 'TIMELINE' && !chartData && (
        <div className={`p-6 text-center text-xs font-mono ${labelColor}`}>
          {tr('calendar.rest_empty', 'No Data')}
        </div>
      )}

      {activeTab === 'TIMELINE' && chartData && (
        <div className="p-3.5 space-y-4">
          {/* Interactive Crosshair Summary Bar */}
          {activePoint && (
            <div
              className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border font-mono tabular-nums text-[11px] ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#181c27] border-slate-800/90'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`font-sans ${labelColor}`}>{tr('activity.cursor', 'Cursor:')}</span>
                <span className={`font-bold ${valueColor}`}>
                  {formatSecondsToClock(activePoint.timeSec)}
                </span>
                {activePoint.distanceKm > 0 && (
                  <>
                    <span className={labelColor}>·</span>
                    <span className={subValueColor}>{activePoint.distanceKm} km</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {activePoint.paceSecPerKm > 0 && (
                  <span>
                    <span className={`font-sans mr-1 ${labelColor}`}>Pace:</span>
                    <strong className={isLight ? 'text-cyan-700' : 'text-cyan-300'}>
                      {formatPaceShort(activePoint.paceSecPerKm)}/km
                    </strong>
                  </span>
                )}
                {activePoint.powerWatts > 0 && (
                  <span>
                    <span className={`font-sans mr-1 ${labelColor}`}>Power:</span>
                    <strong className={isLight ? 'text-purple-600' : 'text-purple-300'}>
                      {activePoint.powerWatts}w
                    </strong>
                  </span>
                )}
                <span>
                  <span className={`font-sans mr-1 ${labelColor}`}>HR:</span>
                  <strong className={isLight ? 'text-rose-600' : 'text-rose-400'}>
                    {activePoint.heartRateBpm}bpm
                  </strong>
                </span>
                {activePoint.cadenceSpm > 0 && (
                  <span>
                    <span className={`font-sans mr-1 ${labelColor}`}>Cad:</span>
                    <strong className={isLight ? 'text-fuchsia-600' : 'text-fuchsia-300'}>
                      {activePoint.cadenceSpm}
                    </strong>
                  </span>
                )}
                <span>
                  <span className={`font-sans mr-1 ${labelColor}`}>Alt:</span>
                  <strong className={subValueColor}>{activePoint.altitudeMeters}m</strong>
                </span>
                <span className={`font-semibold ${isLight ? 'text-teal-600' : 'text-teal-300'}`}>
                  {activePoint.zone}
                </span>
              </div>
            </div>
          )}

          {/* 5-Track Synchronized Telemetry Stack */}
          <div
            className="relative select-none touch-pan-y cursor-crosshair"
            onMouseMove={handlePointerMove}
            onTouchMove={handleTouchMove}
          >
            {/* Track 1: Pace/km */}
            {hasPaceStream && (
              <div className={`flex items-stretch border-b ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                <div className="w-14 shrink-0 flex items-center pr-1.5 py-1">
                  <span className={`-rotate-90 text-[9px] w-3.5 text-center whitespace-nowrap ${labelColor}`}>
                    Pace/km
                  </span>
                  <div className="flex-1 h-14 flex flex-col justify-between text-right font-mono tabular-nums text-[9px] leading-none">
                    <span className={subValueColor}>{formatPaceShort(chartData.minPace)}</span>
                    <span className={`font-semibold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                      {activity.paceFormatted?.replace('/km', '') || '—'}
                    </span>
                    <span className={labelColor}>{formatPaceShort(chartData.maxPace)}</span>
                  </div>
                </div>
                <div className={`relative flex-1 h-14 overflow-hidden ${isLight ? 'bg-slate-50' : 'bg-[#10131b]'}`}>
                  <svg
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                    preserveAspectRatio="none"
                    className="w-full h-full"
                  >
                    <path d={chartData.paceArea} fill="rgba(20, 184, 166, 0.25)" />
                    <path
                      d={chartData.paceLine}
                      fill="none"
                      stroke="#0891b2"
                      strokeWidth="1.6"
                    />
                  </svg>
                  <div
                    className="absolute top-0 bottom-0 w-[1px] bg-sky-500/80 pointer-events-none"
                    style={{ left: `${crosshairLeftPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Track 2: Power (Watts) */}
            {hasPowerStream && (
              <div className={`flex items-stretch border-b ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                <div className="w-14 shrink-0 flex items-center pr-1.5 py-1">
                  <span className={`-rotate-90 text-[9px] w-3.5 text-center whitespace-nowrap ${labelColor}`}>
                    Power
                  </span>
                  <div className="flex-1 h-14 flex flex-col justify-between text-right font-mono tabular-nums text-[9px] leading-none">
                    <span className={subValueColor}>{chartData.maxWatts}</span>
                    <span className={`font-semibold ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                      {activity.avgPower || '—'}
                    </span>
                    <span className={labelColor}>0</span>
                  </div>
                </div>
                <div className={`relative flex-1 h-14 overflow-hidden ${isLight ? 'bg-slate-50' : 'bg-[#10131b]'}`}>
                  <svg
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                    preserveAspectRatio="none"
                    className="w-full h-full"
                  >
                    <path d={chartData.powerArea} fill="rgba(168, 85, 247, 0.22)" />
                    <path
                      d={chartData.powerLine}
                      fill="none"
                      stroke="#9333ea"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div
                    className="absolute top-0 bottom-0 w-[1px] bg-sky-500/80 pointer-events-none"
                    style={{ left: `${crosshairLeftPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Track 3: Heart Rate (bpm) */}
            <div className={`flex items-stretch border-b ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
              <div className="w-14 shrink-0 flex items-center pr-1.5 py-1">
                <span className={`-rotate-90 text-[9px] w-3.5 text-center whitespace-nowrap ${labelColor}`}>
                  HR
                </span>
                <div className="flex-1 h-14 flex flex-col justify-between text-right font-mono tabular-nums text-[9px] leading-none">
                  <span className={subValueColor}>{activity.maxHr || chartData.maxHr}</span>
                  <span className={`font-semibold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
                    {activity.avgHr || '—'}
                  </span>
                  <span className={labelColor}>{chartData.minHr}</span>
                </div>
              </div>
              <div className={`relative flex-1 h-14 overflow-hidden ${isLight ? 'bg-slate-50' : 'bg-[#10131b]'}`}>
                <svg
                  viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  <path d={chartData.hrArea} fill="rgba(244, 63, 94, 0.22)" />
                  <path d={chartData.hrLine} fill="none" stroke="#e11d48" strokeWidth="1.5" />
                </svg>
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-sky-500/80 pointer-events-none"
                  style={{ left: `${crosshairLeftPct}%` }}
                />
              </div>
            </div>

            {/* Track 4: Cadence (spm) */}
            {hasCadenceStream && (
              <div className={`flex items-stretch border-b ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                <div className="w-14 shrink-0 flex items-center pr-1.5 py-1">
                  <span className={`-rotate-90 text-[9px] w-3.5 text-center whitespace-nowrap ${labelColor}`}>
                    Cadence
                  </span>
                  <div className="flex-1 h-12 flex flex-col justify-between text-right font-mono tabular-nums text-[9px] leading-none">
                    <span className={subValueColor}>{chartData.maxCad}</span>
                    <span className={`font-semibold ${isLight ? 'text-fuchsia-600' : 'text-fuchsia-400'}`}>
                      {activity.cadence || '—'}
                    </span>
                    <span className={labelColor}>0</span>
                  </div>
                </div>
                <div className={`relative flex-1 h-12 overflow-hidden ${isLight ? 'bg-slate-50' : 'bg-[#10131b]'}`}>
                  <svg
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                    preserveAspectRatio="none"
                    className="w-full h-full"
                  >
                    <path d={chartData.cadArea} fill="rgba(236, 72, 153, 0.2)" />
                    <path
                      d={chartData.cadLine}
                      fill="none"
                      stroke="#db2777"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div
                    className="absolute top-0 bottom-0 w-[1px] bg-sky-500/80 pointer-events-none"
                    style={{ left: `${crosshairLeftPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Track 5: Altitude (m) */}
            <div className={`flex items-stretch border-b ${isLight ? 'border-slate-300' : 'border-slate-700/80'}`}>
              <div className="w-14 shrink-0 flex items-center pr-1.5 py-1">
                <span className={`-rotate-90 text-[9px] w-3.5 text-center whitespace-nowrap ${labelColor}`}>
                  Altitude
                </span>
                <div className={`flex-1 h-12 flex flex-col justify-between text-right font-mono tabular-nums text-[9px] leading-none ${subValueColor}`}>
                  <span>{chartData.maxAlt}</span>
                  <span>{Math.round((chartData.maxAlt + chartData.minAlt) / 2)}</span>
                  <span>{chartData.minAlt}</span>
                </div>
              </div>
              <div className={`relative flex-1 h-12 overflow-hidden ${isLight ? 'bg-slate-50' : 'bg-[#10131b]'}`}>
                <svg
                  viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  <path d={chartData.altArea} fill="rgba(148, 163, 184, 0.3)" />
                  <path
                    d={chartData.altLine}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.5"
                  />
                </svg>
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-sky-500/80 pointer-events-none"
                  style={{ left: `${crosshairLeftPct}%` }}
                />
              </div>
            </div>

            {/* Distance & Elapsed Time Rulers */}
            {activity.distanceKm && (
              <div className={`flex items-center pl-14 pt-1 font-mono tabular-nums text-[9px] justify-between ${labelColor}`}>
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
                  <span key={r}>{(activity.distanceKm! * r).toFixed(1)} km</span>
                ))}
              </div>
            )}
            <div className={`flex items-center pl-14 pt-0.5 font-mono tabular-nums text-[9px] justify-between ${subValueColor}`}>
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
                <span key={r}>
                  {formatSecondsToClock(Math.round(activity.movingTimeSec * r))}
                </span>
              ))}
            </div>
          </div>

          {/* Paired Planned Workout Reference Block — Shown only for Running workouts */}
          {isRun && activity.plannedWorkoutSummary && (
            <div className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11px]">
                <span className={`font-medium ${subValueColor}`}>
                  {tr('activity.paired_workout', 'Paired Planned Workout:')}{' '}
                  {activity.plannedWorkoutSummary.name}
                </span>
                <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
                  <span>
                    <span className={`font-sans ${labelColor}`}>Time </span>
                    <strong className={valueColor}>
                      {activity.plannedWorkoutSummary.durationLabel}
                    </strong>
                  </span>
                  <span>
                    <span className={`font-sans ${labelColor}`}>Load </span>
                    <strong className={valueColor}>
                      {activity.plannedWorkoutSummary.load}
                    </strong>
                  </span>
                  <span>
                    <span className={`font-sans ${labelColor}`}>Int </span>
                    <strong className={valueColor}>
                      {activity.plannedWorkoutSummary.intensityPct}%
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-stretch">
                <div className="w-14 shrink-0 flex items-center pr-1.5">
                  <span className={`-rotate-90 text-[9px] w-3.5 text-center whitespace-nowrap ${labelColor}`}>
                    Pace/km
                  </span>
                  <div className={`flex-1 h-12 flex flex-col justify-between text-right font-mono tabular-nums text-[9px] ${labelColor}`}>
                    <span>{activity.plannedWorkoutSummary.paceTopFormatted}</span>
                    <span>{activity.plannedWorkoutSummary.paceMidFormatted}</span>
                    <span>{activity.plannedWorkoutSummary.paceBotFormatted}</span>
                  </div>
                </div>
                <div
                  className={`flex-1 h-12 border-l border-b flex items-end p-[1px] ${
                    isLight
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-[#10131b] border-slate-700/80'
                  }`}
                >
                  <div className="w-full h-[82%] bg-teal-600/85 rounded-t-[2px]" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* POWER & PACE Analysis Tab — Always arranged in 2 lines (2 columns x 2 rows) */}
      {activeTab === 'PACE_POWER' && (
        <div className="p-3.5 space-y-3">
          <h3 className={`text-xs font-semibold ${subValueColor}`}>
            Pace & Running Power Efficiency Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-2.5 font-mono tabular-nums">
            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#181c27] border-slate-800/80'
              }`}
            >
              <div className={`text-[11px] font-sans ${labelColor}`}>Average Pace</div>
              <div className={`text-sm font-bold mt-0.5 ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                {activity.paceFormatted || '—'}
              </div>
              <div className={`text-[10px] mt-0.5 ${labelColor}`}>
                GAP: {activity.gapFormatted || '—'}
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#181c27] border-slate-800/80'
              }`}
            >
              <div className={`text-[11px] font-sans ${labelColor}`}>Normalized Power</div>
              <div className={`text-sm font-bold mt-0.5 ${isLight ? 'text-purple-600' : 'text-purple-300'}`}>
                {activity.normPower ? `${activity.normPower} W` : '—'}
              </div>
              <div className={`text-[10px] mt-0.5 ${labelColor}`}>
                Avg: {activity.avgPower ? `${activity.avgPower} W` : '—'}
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#181c27] border-slate-800/80'
              }`}
            >
              <div className={`text-[11px] font-sans ${labelColor}`}>Running Cadence</div>
              <div className={`text-sm font-bold mt-0.5 ${isLight ? 'text-fuchsia-600' : 'text-fuchsia-300'}`}>
                {activity.cadence ? `${activity.cadence} spm` : '—'}
              </div>
              <div className={`text-[10px] mt-0.5 ${labelColor}`}>
                Stride: {activity.strideMeters ? `${activity.strideMeters}m` : '—'}
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#181c27] border-slate-800/80'
              }`}
            >
              <div className={`text-[11px] font-sans ${labelColor}`}>Power / HR Ratio</div>
              <div className={`text-sm font-bold mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-300'}`}>
                {activity.powerHrRatio ?? '—'}
              </div>
              <div className={`text-[10px] mt-0.5 ${labelColor}`}>
                EF: {activity.efficiencyFactor ?? '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HR & ZONES Tab */}
      {activeTab === 'HR_ZONES' && (
        <div className="p-3.5 space-y-3">
          <h3 className={`text-xs font-semibold ${subValueColor}`}>
            Heart Rate & Intensity Zone Distribution
          </h3>
          <div className="space-y-2 font-mono tabular-nums text-[11px]">
            {hrZoneRows.map((row) => (
              <div key={row.zone} className="space-y-1">
                <div className={`flex justify-between ${subValueColor}`}>
                  <span className="font-sans">{row.zone}</span>
                  <span>{row.pct}%</span>
                </div>
                <div
                  className={`w-full h-2.5 rounded-xs overflow-hidden ${
                    isLight ? 'bg-slate-100' : 'bg-slate-800'
                  }`}
                >
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
        <div
          className={`p-3.5 border-t space-y-2.5 ${
            isLight
              ? 'bg-slate-50/80 border-slate-200'
              : 'bg-[#12151e] border-slate-800/80'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={`text-xs font-semibold tracking-wide ${isLight ? 'text-sky-600' : 'text-sky-400'}`}>
              {tr('activity.intervals_splits', 'Intervals & Splits')}
            </h3>
            <div
              className={`flex items-center gap-1 p-1 rounded-lg border ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {(['ALL', 'WORK', 'RECOVERY'] as IntervalFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setIntervalFilter(f)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                    intervalFilter === f
                      ? 'bg-sky-500 text-white'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredIntervals.length === 0 ? (
            <div className={`py-4 text-center text-xs ${labelColor}`}>
              No structured interval splits recorded for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono tabular-nums text-[11px]">
                <thead>
                  <tr
                    className={`border-b text-[10px] font-sans ${
                      isLight
                        ? 'border-slate-200 text-slate-500'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    <th className="py-1.5 pr-2 font-medium">Interval</th>
                    <th className="py-1.5 px-1.5 font-medium">Time</th>
                    <th className="py-1.5 px-1.5 font-medium">Dist</th>
                    <th className="py-1.5 px-1.5 font-medium">Pace</th>
                    <th className="py-1.5 px-1.5 font-medium">Cad</th>
                    <th className="py-1.5 px-1.5 font-medium">Avg HR</th>
                    <th className="py-1.5 px-1.5 font-medium">Max HR</th>
                    <th className="py-1.5 px-1.5 font-medium">Power</th>
                    <th className="py-1.5 pl-1.5 font-medium text-right">Zone</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    isLight ? 'divide-slate-200/70' : 'divide-slate-800/60'
                  }`}
                >
                  {filteredIntervals.map((split) => (
                    <tr
                      key={split.id}
                      className={`transition-colors ${
                        isLight ? 'hover:bg-slate-100/80' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className={`py-2 pr-2 font-sans font-medium whitespace-nowrap ${valueColor}`}>
                        {split.name}
                      </td>
                      <td className={`py-2 px-1.5 whitespace-nowrap ${subValueColor}`}>
                        {split.elapsedTimeLabel}
                      </td>
                      <td className={`py-2 px-1.5 whitespace-nowrap ${subValueColor}`}>
                        {split.distanceKm > 0 ? `${split.distanceKm} km` : '—'}
                      </td>
                      <td className={`py-2 px-1.5 whitespace-nowrap font-semibold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>
                        {split.paceFormatted}
                      </td>
                      <td className={`py-2 px-1.5 whitespace-nowrap ${isLight ? 'text-fuchsia-600' : 'text-fuchsia-300'}`}>
                        {split.avgCadence > 0 ? split.avgCadence : '—'}
                      </td>
                      <td className={`py-2 px-1.5 whitespace-nowrap font-semibold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
                        {split.avgHr} bpm
                      </td>
                      <td className={`py-2 px-1.5 whitespace-nowrap ${subValueColor}`}>
                        {split.maxHr} bpm
                      </td>
                      <td className={`py-2 px-1.5 whitespace-nowrap ${isLight ? 'text-purple-600' : 'text-purple-300'}`}>
                        {split.avgPower > 0 ? `${split.avgPower}w` : '—'}
                      </td>
                      <td className={`py-2 pl-1.5 text-right whitespace-nowrap font-semibold ${isLight ? 'text-teal-600' : 'text-teal-400'}`}>
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
