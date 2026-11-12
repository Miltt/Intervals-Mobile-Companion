import React from 'react';
import {
  Activity,
  CheckCircle2,
  Dumbbell,
  Footprints,
  Sparkles,
  Waves,
  XCircle,
} from 'lucide-react';
import { CompletedActivity, PlannedWorkout, SportType } from '../types/intervals';

interface CompletedCardProps {
  activity: CompletedActivity;
  isSelected?: boolean;
  isLight?: boolean;
  onSelect: (activity: CompletedActivity) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

interface PlannedCardProps {
  workout: PlannedWorkout;
  isSelected?: boolean;
  isLight?: boolean;
  onSelect: (workout: PlannedWorkout) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

function SportMiniIcon({ sport, isLight }: { sport: SportType; isLight?: boolean }) {
  const iconColor = isLight ? 'text-current' : 'text-slate-100';
  switch (sport) {
    case 'Run':
      return <Footprints className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />;
    case 'Swim':
      return <Waves className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />;
    case 'Strength':
      return <Dumbbell className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />;
    case 'Pilates':
    case 'Yoga':
    case 'Mobility':
      return <Sparkles className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />;
    default:
      return <Activity className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />;
  }
}

export const CompletedActivityCard: React.FC<CompletedCardProps> = ({
  activity,
  isSelected,
  isLight = false,
  onSelect,
  t,
}) => {
  const isRun = activity.sport === 'Run';

  const headerStyle = isLight
    ? isRun
      ? 'bg-rose-50 text-rose-900 border-b border-rose-200/80'
      : activity.sport === 'Swim'
      ? 'bg-sky-50 text-sky-900 border-b border-sky-200/80'
      : 'bg-slate-100 text-slate-800 border-b border-slate-200/80'
    : isRun
    ? 'bg-[#633b3b] text-slate-100'
    : activity.sport === 'Swim'
    ? 'bg-[#164e63] text-slate-100'
    : 'bg-[#575b65] text-slate-100';

  return (
    <button
      type="button"
      onClick={() => onSelect(activity)}
      className={`w-full text-left rounded-xl overflow-hidden border transition-all cursor-pointer group ${
        isLight
          ? isSelected
            ? 'bg-white border-cyan-500 ring-1 ring-cyan-500/40 shadow-md'
            : 'bg-white border-slate-200 hover:border-cyan-400 shadow-xs'
          : isSelected
          ? 'bg-[#1e222d] border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg'
          : 'bg-[#1e222d] border-slate-800/90 hover:border-slate-600'
      }`}
    >
      {/* Top Bar: Sport Icon + Duration + Distance */}
      <div
        className={`px-3 py-1.5 ${headerStyle} flex items-center justify-between gap-2 font-mono tabular-nums text-xs font-bold`}
      >
        <div className="flex items-center gap-1.5">
          <SportMiniIcon sport={activity.sport} isLight={isLight} />
          <span>{activity.movingTimeLabel.length > 6 ? '1h28m' : activity.movingTimeLabel}</span>
        </div>
        {activity.distanceKm !== undefined && activity.distanceKm > 0 && (
          <span>{activity.distanceKm} km</span>
        )}
      </div>

      {/* Body Metrics */}
      <div className="p-3 space-y-1.5 text-center font-mono tabular-nums text-xs">
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
          <span className={`${isLight ? 'text-rose-600' : 'text-rose-400'} font-semibold`}>
            {activity.avgHr}bpm
          </span>
          {activity.normPower && (
            <span className={`${isLight ? 'text-purple-600' : 'text-purple-300'} font-semibold`}>
              {activity.normPower}w
            </span>
          )}
          {activity.paceFormatted && (
            <span className={`${isLight ? 'text-cyan-700' : 'text-cyan-300'} font-semibold`}>
              {activity.paceFormatted}
            </span>
          )}
        </div>

        <div className={`${isLight ? 'text-slate-900' : 'text-slate-100'} font-semibold`}>
          {t ? t('card.load', { load: activity.load }) : `Load ${activity.load}`}
        </div>

        {activity.gapFormatted && (
          <div className={`${isLight ? 'text-purple-600' : 'text-purple-300'} text-[11px]`}>
            GAP {activity.gapFormatted}
          </div>
        )}

        {activity.rpe !== undefined && (
          <div className={`${isLight ? 'text-teal-600' : 'text-teal-400'} text-[11px]`}>
            RPE {activity.rpe}
          </div>
        )}

        {/* Solid Green / Teal Progress Bar */}
        <div className="pt-1">
          <div
            className={`w-full h-3.5 rounded-xs ${
              isRun ? 'bg-emerald-500' : 'bg-teal-500'
            }`}
          />
        </div>

        {/* Title & Source */}
        <div className="pt-1 font-sans">
          <div
            className={`text-xs font-semibold transition-colors line-clamp-2 ${
              isLight
                ? 'text-slate-900 group-hover:text-cyan-600'
                : 'text-slate-100 group-hover:text-cyan-300'
            }`}
          >
            {activity.name}
          </div>
          <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            ({activity.sourcePlatform})
          </div>
        </div>

        {/* Compliance Indicator */}
        {activity.compliancePct !== undefined && (
          <div
            className={`pt-1 border-t flex items-center justify-center gap-1 text-[11px] font-semibold ${
              isLight
                ? 'border-slate-100 text-amber-600'
                : 'border-slate-800/80 text-amber-400'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 shrink-0 ${
                isLight ? 'text-amber-500' : 'text-amber-400'
              }`}
            />
            <span>{activity.compliancePct}%</span>
          </div>
        )}
      </div>
    </button>
  );
};

export const PlannedWorkoutCard: React.FC<PlannedCardProps> = ({
  workout,
  isSelected,
  isLight = false,
  onSelect,
  t,
}) => {
  const isRun = workout.sport === 'Run';
  const hasIntervals = workout.steps.some((s) => s.zone === 'Z4' || s.zone === 'Z5');

  const headerStyle = isLight
    ? workout.sport === 'Mobility' || workout.sport === 'Yoga' || workout.sport === 'Pilates'
      ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200/80'
      : workout.sport === 'Strength'
      ? 'bg-purple-50 text-purple-900 border-b border-purple-200/80'
      : workout.sport === 'Swim'
      ? 'bg-sky-50 text-sky-900 border-b border-sky-200/80'
      : hasIntervals
      ? 'bg-amber-50 text-amber-900 border-b border-amber-200/80'
      : 'bg-cyan-50 text-cyan-900 border-b border-cyan-200/80'
    : workout.sport === 'Mobility'
    ? 'bg-[#3f4622] text-slate-100'
    : workout.sport === 'Strength'
    ? 'bg-[#383d48] text-slate-100'
    : workout.sport === 'Swim'
    ? 'bg-[#164e63] text-slate-100'
    : hasIntervals
    ? 'bg-[#543a24] text-slate-100'
    : 'bg-[#1e3a4c] text-slate-100';

  const totalSec = Math.max(
    workout.durationSec,
    workout.steps.reduce((acc, s) => Math.max(acc, s.endSec), 0) || 1800
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(workout)}
      className={`w-full text-left rounded-xl overflow-hidden border transition-all cursor-pointer group ${
        isLight
          ? workout.complianceStatus === 'missed'
            ? 'bg-white border-rose-300 hover:border-rose-400 shadow-xs'
            : isSelected
            ? 'bg-white border-cyan-500 ring-1 ring-cyan-500/40 shadow-md'
            : 'bg-white border-slate-200 hover:border-sky-400 shadow-xs'
          : workout.complianceStatus === 'missed'
          ? 'bg-[#191d26] border-rose-800/80 hover:border-rose-600'
          : isSelected
          ? 'bg-[#191d26] border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg'
          : 'bg-[#191d26] border-slate-800/90 hover:border-sky-500/60'
      }`}
    >
      {/* Top Header: Sport Icon + Planned Duration + Planned Distance */}
      <div
        className={`px-3 py-1.5 ${headerStyle} flex items-center justify-between gap-2 font-mono tabular-nums text-xs font-bold`}
      >
        <div className="flex items-center gap-1.5">
          <SportMiniIcon sport={workout.sport} isLight={isLight} />
          <span>{workout.durationLabel}</span>
        </div>
        {workout.distanceKm !== undefined && workout.distanceKm > 0 && (
          <span>{workout.distanceKm} km</span>
        )}
      </div>

      {/* Body: Planned Load + Mini Pace Step Preview Diagram + Title */}
      <div className="p-3 space-y-2 text-center">
        {workout.load !== undefined && workout.load > 0 && (
          <div
            className={`font-mono tabular-nums text-xs font-bold ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {t ? t('card.load', { load: workout.load }) : `Load ${workout.load}`}
          </div>
        )}

        {/* Mini Pace Step Preview Diagram (Shown only for Running workouts) */}
        {isRun && workout.steps.length > 0 && (
          <div
            className={`w-full h-7 rounded-xs px-0.5 pt-1 flex items-end gap-[1px] overflow-hidden border ${
              isLight
                ? 'bg-slate-100 border-slate-200'
                : 'bg-[#12151e] border-slate-800/70'
            }`}
          >
            {workout.steps.map((step) => {
              const widthPct = (step.durationSec / totalSec) * 100;
              const isFast = step.zone === 'Z4' || step.zone === 'Z5';
              const isMod = step.zone === 'Z2' || step.zone === 'Z3';
              const heightPct = isFast ? 95 : isMod ? 72 : 52;
              return (
                <div
                  key={step.id}
                  style={{
                    width: `${Math.max(1.5, widthPct)}%`,
                    height: `${heightPct}%`,
                    backgroundColor: step.color,
                  }}
                  className="rounded-t-[1px]"
                />
              );
            })}
          </div>
        )}

        <div
          className={`text-xs font-semibold transition-colors line-clamp-2 ${
            isLight
              ? 'text-slate-800 group-hover:text-sky-600'
              : 'text-slate-200 group-hover:text-sky-300'
          }`}
        >
          {workout.name}
        </div>

        <div
          className={`flex items-center justify-center gap-2 text-[11px] font-mono tabular-nums ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <span>{t ? t('card.planned') : 'Planned'}</span>
          {workout.intensityPct !== undefined && (
            <>
              <span>·</span>
              <span>
                {t
                  ? t('card.intensity', { pct: workout.intensityPct })
                  : `${workout.intensityPct}% Int`}
              </span>
            </>
          )}
          {workout.complianceStatus === 'completed' && (
            <>
              <span>·</span>
              <span
                className={`font-semibold ${
                  isLight ? 'text-emerald-600' : 'text-emerald-400'
                }`}
              >
                {t ? t('card.done') : 'Done ✓'}
              </span>
            </>
          )}
        </div>

        {workout.complianceStatus === 'missed' && (
          <div
            className={`pt-1 border-t flex items-center justify-center gap-1 text-[11px] font-semibold font-mono ${
              isLight
                ? 'border-rose-100 text-rose-600'
                : 'border-rose-900/50 text-rose-400'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>0%</span>
          </div>
        )}
      </div>
    </button>
  );
};
