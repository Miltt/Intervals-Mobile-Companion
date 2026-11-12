import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Footprints,
  Dumbbell,
  Activity,
  Sparkles,
  Waves,
} from 'lucide-react';
import { PlannedWorkout, SportType, WorkoutStepBlock } from '../types/intervals';
import { formatSecondsToClock } from '../utils/formatters';

interface PlannedWorkoutDetailProps {
  workout: PlannedWorkout;
  isLight?: boolean;
  onClose: () => void;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  swipeIndexLabel?: string;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

function getSportIcon(sport: SportType) {
  switch (sport) {
    case 'Run':
      return <Footprints className="w-4 h-4 text-orange-500" />;
    case 'Swim':
      return <Waves className="w-4 h-4 text-sky-500" />;
    case 'Strength':
      return <Dumbbell className="w-4 h-4 text-purple-500" />;
    case 'Mobility':
    case 'Yoga':
    case 'Pilates':
      return <Sparkles className="w-4 h-4 text-emerald-500" />;
    default:
      return <Activity className="w-4 h-4 text-cyan-500" />;
  }
}

export const PlannedWorkoutDetail: React.FC<PlannedWorkoutDetailProps> = ({
  workout,
  isLight = false,
  onClose,
  onSwipePrev,
  onSwipeNext,
  swipeIndexLabel,
  t,
}) => {
  const tr = (key: string, fallback: string) => (t ? t(key) : fallback);
  const [selectedStep, setSelectedStep] = useState<WorkoutStepBlock | null>(
    workout.steps[0] || null
  );
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setSelectedStep(workout.steps[0] || null);
  }, [workout.id, workout.steps]);

  const handleSwipeStart = (x: number, y: number) => {
    if (!onSwipePrev && !onSwipeNext) return;
    swipeStartRef.current = { x, y };
  };

  const handleSwipeEnd = (x: number, y: number) => {
    if (!swipeStartRef.current) return;
    const deltaX = x - swipeStartRef.current.x;
    const deltaY = y - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      if (deltaX < 0 && onSwipeNext) {
        onSwipeNext();
      } else if (deltaX > 0 && onSwipePrev) {
        onSwipePrev();
      }
    }
  };

  const totalSec = Math.max(
    workout.durationSec,
    workout.steps.reduce((acc, s) => Math.max(acc, s.endSec), 0) || 1800
  );

  // Compute time ticks matching Intervals.icu
  const tickInterval =
    totalSec === 3900 ? 500 : Math.max(300, Math.round(totalSec / 6 / 60) * 60);
  const timeTicks: number[] = [];
  for (let tSec = 0; tSec <= totalSec; tSec += tickInterval) {
    timeTicks.push(tSec);
  }

  const getStepHeightPct = (step: WorkoutStepBlock): number => {
    const avgPct = (step.pctPaceMin + step.pctPaceMax) / 2;
    return Math.min(95, Math.max(20, ((avgPct - 50) / 55) * 75 + 18));
  };

  const parsedDate = new Date(`${workout.date}T12:00:00`);
  const weekdayName = parsedDate.toLocaleDateString('en-US', { weekday: 'short' });
  const dayMonthStr = parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });

  const labelColor = isLight ? 'text-slate-500' : 'text-slate-400';
  const valueColor = isLight ? 'text-slate-900' : 'text-slate-100';

  return (
    <div
      onTouchStart={(e) => {
        if (e.touches[0]) {
          handleSwipeStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={(e) => {
        if (e.changedTouches[0]) {
          handleSwipeEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
      }}
      onMouseDown={(e) => handleSwipeStart(e.clientX, e.clientY)}
      onMouseUp={(e) => handleSwipeEnd(e.clientX, e.clientY)}
      className={`rounded-2xl border shadow-xl overflow-hidden text-xs ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#181b24] border-slate-800/90 text-slate-100'
      }`}
    >
      {/* Compact Top Header Bar (No top-right cross button) */}
      <div
        className={`px-3.5 py-2.5 border-b space-y-2.5 ${
          isLight
            ? 'bg-slate-50/90 border-slate-200'
            : 'bg-[#141720] border-slate-800/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
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
                  : 'bg-slate-800/90 border-slate-700/70'
              }`}
            >
              {getSportIcon(workout.sport)}
            </div>
            <div className="min-w-0">
              <h2 className={`text-sm font-bold tracking-tight truncate ${valueColor}`}>
                {workout.name}
              </h2>
              <p className={`text-[11px] font-mono tabular-nums ${labelColor}`}>
                {weekdayName} · {dayMonthStr} · {workout.startTime || '08:00 AM'}
              </p>
            </div>
          </div>

          {swipeIndexLabel && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0 border ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              {swipeIndexLabel}
            </span>
          )}
        </div>

        {/* Compact Summary KPI Strip: Duration, Distance, Load, Intensity */}
        <div
          className={`grid grid-cols-4 gap-2 pt-2 border-t font-mono tabular-nums ${
            isLight ? 'border-slate-200/80' : 'border-slate-800/70'
          }`}
        >
          <div className="text-center">
            <div className={`text-[10px] font-sans ${labelColor}`}>
              {tr('detail.duration', 'Duration')}
            </div>
            <div className={`text-xs font-bold ${valueColor}`}>
              {workout.durationLabel}
            </div>
          </div>

          <div className="text-center">
            <div className={`text-[10px] font-sans ${labelColor}`}>
              {tr('detail.distance', 'Distance')}
            </div>
            <div className={`text-xs font-bold ${valueColor}`}>
              {workout.distanceKm !== undefined && workout.distanceKm > 0
                ? `${workout.distanceKm} km`
                : '—'}
            </div>
          </div>

          <div className="text-center">
            <div className={`text-[10px] font-sans ${labelColor}`}>
              {tr('detail.load', 'Load')}
            </div>
            <div className={`text-xs font-bold ${valueColor}`}>
              {workout.load ?? '—'}
            </div>
          </div>

          <div className="text-center">
            <div className={`text-[10px] font-sans ${labelColor}`}>
              {tr('detail.intensity', 'Intensity')}
            </div>
            <div className={`text-xs font-bold ${valueColor}`}>
              {workout.intensityPct !== undefined ? `${workout.intensityPct}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Structured Workout Steps + Zone Distribution Bars */}
      <div
        className={`p-3.5 space-y-4 ${
          workout.sport === 'Run' && workout.steps.length > 0
            ? isLight
              ? 'border-b border-slate-200'
              : 'border-b border-slate-800/60'
            : ''
        }`}
      >
        {/* Coach Written Workout Structure */}
        <div className="space-y-2">
          <div className={`text-[11px] font-semibold uppercase tracking-wider font-mono ${labelColor}`}>
            {tr('detail.structure', 'Planned Workout Structure')}
          </div>
          <div className={`space-y-2 text-xs leading-relaxed ${valueColor}`}>
            {workout.instructionGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                {group.repeatCount && (
                  <div className="font-mono font-bold pt-0.5">
                    {group.repeatCount}x
                  </div>
                )}
                <ul className="space-y-1 pl-4">
                  {group.items.map((item, idx) => (
                    <li
                      key={idx}
                      className={`list-disc ${
                        isLight ? 'marker:text-slate-400 text-slate-800' : 'marker:text-slate-500 text-slate-200'
                      }`}
                    >
                      <span className="font-mono tabular-nums text-[11px]">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {workout.coachNotes && (
            <div
              className={`pt-2 text-[11px] leading-relaxed border-t ${
                isLight
                  ? 'border-slate-200 text-slate-600'
                  : 'border-slate-800/70 text-slate-400'
              }`}
            >
              <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                {tr('detail.coach_notes', 'Coach Notes:')}{' '}
              </span>
              {workout.coachNotes}
            </div>
          )}
        </div>

        {/* Zone Time Breakdown (Z1 - Z5 + PI) */}
        {workout.zoneDistribution && workout.zoneDistribution.length > 0 && (
          <div
            className={`pt-3 border-t space-y-1.5 font-mono tabular-nums text-[11px] ${
              isLight ? 'border-slate-200' : 'border-slate-800/70'
            }`}
          >
            <div className={`text-[11px] font-sans font-semibold mb-1.5 ${labelColor}`}>
              {tr('detail.time_in_zones', 'Time in Zones')}
            </div>
            {workout.zoneDistribution.map((z) => (
              <div key={z.zone} className="grid grid-cols-12 items-center gap-2">
                <span className={`col-span-2 font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {z.zone}
                </span>
                <div
                  className={`col-span-6 h-2.5 rounded-xs overflow-hidden ${
                    isLight ? 'bg-slate-100' : 'bg-slate-800/90'
                  }`}
                >
                  {z.percentage > 0 && (
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.max(8, z.percentage)}%`,
                        backgroundColor: z.color,
                      }}
                    />
                  )}
                </div>
                <span
                  className={`col-span-4 text-right ${
                    isLight ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  {z.percentage > 0 ? `${z.durationLabel} ${z.percentage}%` : '—'}
                </span>
              </div>
            ))}
            {workout.polarizationIndex !== undefined && (
              <div className={`pt-1 text-right text-[11px] ${labelColor}`}>
                PI{' '}
                <span className={`font-bold ${valueColor}`}>
                  {workout.polarizationIndex.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Planned Pace-Time Chart — Shown ONLY for Running workouts */}
      {workout.sport === 'Run' && workout.steps.length > 0 && (
        <div
          className={`px-3.5 pt-3 pb-3.5 ${
            isLight ? 'bg-slate-50/70' : 'bg-[#151821]'
          }`}
        >
          {/* Interactive Selected Step Readout Banner */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-mono tabular-nums min-w-0">
              <span className={`font-sans ${labelColor}`}>
                {tr('detail.selected_block', 'Selected Block:')}
              </span>
              {selectedStep ? (
                <span
                  className={`font-semibold truncate ${
                    isLight ? 'text-cyan-700' : 'text-cyan-300'
                  }`}
                >
                  {selectedStep.label} ({formatSecondsToClock(selectedStep.startSec)} –{' '}
                  {formatSecondsToClock(selectedStep.endSec)})
                </span>
              ) : (
                <span className={labelColor}>
                  {tr('detail.tap_bar_hint', 'Tap any bar on the diagram to inspect target pace')}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-mono ${labelColor}`}>
              {tr('detail.target', 'Target:')} % Pace + min/km
            </span>
          </div>

          {/* Step Chart Container */}
          <div className="relative select-none">
            <div className="flex items-stretch">
              {/* Vertical Y-Axis Label & Pace Ticks */}
              <div className="w-12 shrink-0 flex items-center pr-1.5">
                <div className={`-rotate-90 text-[9px] whitespace-nowrap w-3.5 text-center ${labelColor}`}>
                  {tr('detail.pace_km', 'Pace/km')}
                </div>
                <div
                  className={`flex-1 h-32 flex flex-col justify-between text-right font-mono tabular-nums text-[10px] py-1 ${labelColor}`}
                >
                  <span>3:20</span>
                  <span>3:42</span>
                  <span>4:10</span>
                  <span>4:46</span>
                </div>
              </div>

              {/* Plot Area with Horizontal Gridlines and Proportional Duration Step Blocks */}
              <div
                className={`relative flex-1 h-32 border-b border-l ${
                  isLight
                    ? 'bg-white border-slate-300'
                    : 'bg-[#12151e] border-slate-700/80'
                }`}
              >
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-2">
                  <div className={`border-t w-full ${isLight ? 'border-slate-100' : 'border-slate-800/90'}`} />
                  <div className={`border-t w-full ${isLight ? 'border-slate-100' : 'border-slate-800/90'}`} />
                  <div className={`border-t w-full ${isLight ? 'border-slate-100' : 'border-slate-800/90'}`} />
                  <div className={`border-t w-full ${isLight ? 'border-slate-100' : 'border-slate-800/90'}`} />
                </div>

                {/* Step Blocks */}
                <div className="relative z-10 w-full h-full flex items-end px-[1px] gap-[1px]">
                  {workout.steps.map((step) => {
                    const widthPct = (step.durationSec / totalSec) * 100;
                    const heightPct = getStepHeightPct(step);
                    const isSelected = selectedStep?.id === step.id;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setSelectedStep(step)}
                        onMouseEnter={() => setSelectedStep(step)}
                        style={{
                          width: `${Math.max(0.8, widthPct)}%`,
                          height: `${heightPct}%`,
                          backgroundColor: step.color,
                        }}
                        className={`h-full transition-opacity cursor-pointer rounded-t-[2px] focus:outline-none ${
                          isSelected
                            ? isLight
                              ? 'opacity-100 ring-1 ring-slate-900 brightness-105'
                              : 'opacity-100 ring-1 ring-white/80 brightness-110'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                        title={step.label}
                        aria-label={step.label}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* X-Axis Elapsed Time Labels */}
            <div
              className={`flex items-center pl-12 pt-1 font-mono tabular-nums text-[10px] justify-between ${labelColor}`}
            >
              {timeTicks.map((tSec) => (
                <span key={tSec}>{formatSecondsToClock(tSec)}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
