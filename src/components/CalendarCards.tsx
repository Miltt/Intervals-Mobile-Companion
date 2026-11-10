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
  onSelect: (activity: CompletedActivity) => void;
}

interface PlannedCardProps {
  workout: PlannedWorkout;
  isSelected?: boolean;
  onSelect: (workout: PlannedWorkout) => void;
}

function SportMiniIcon({ sport }: { sport: SportType }) {
  switch (sport) {
    case 'Run':
      return <Footprints className="w-3.5 h-3.5 text-slate-100 shrink-0" />;
    case 'Swim':
      return <Waves className="w-3.5 h-3.5 text-slate-100 shrink-0" />;
    case 'Strength':
      return <Dumbbell className="w-3.5 h-3.5 text-slate-100 shrink-0" />;
    case 'Pilates':
    case 'Yoga':
    case 'Mobility':
      return <Sparkles className="w-3.5 h-3.5 text-slate-100 shrink-0" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-slate-100 shrink-0" />;
  }
}

export const CompletedActivityCard: React.FC<CompletedCardProps> = ({
  activity,
  isSelected,
  onSelect,
}) => {
  const isRun = activity.sport === 'Run';
  const headerBg = isRun
    ? 'bg-[#633b3b]'
    : activity.sport === 'Swim'
    ? 'bg-[#164e63]'
    : 'bg-[#575b65]';

  return (
    <button
      type="button"
      onClick={() => onSelect(activity)}
      className={`w-full text-left rounded-xl overflow-hidden bg-[#1e222d] border transition-all cursor-pointer group ${
        isSelected
          ? 'border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg'
          : 'border-slate-800/90 hover:border-slate-600'
      }`}
    >
      {/* Top Bar: Sport Icon + Duration + Distance (Matches Screenshot 1) */}
      <div
        className={`px-3 py-1.5 ${headerBg} flex items-center justify-between gap-2 font-mono tabular-nums text-xs font-bold text-slate-100`}
      >
        <div className="flex items-center gap-1.5">
          <SportMiniIcon sport={activity.sport} />
          <span>{activity.movingTimeLabel.length > 6 ? '1h28m' : activity.movingTimeLabel}</span>
        </div>
        {activity.distanceKm !== undefined && activity.distanceKm > 0 && (
          <span>{activity.distanceKm} km</span>
        )}
      </div>

      {/* Body Metrics — Matches Screenshot 1 */}
      <div className="p-3 space-y-1.5 text-center font-mono tabular-nums text-xs">
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
          <span className="text-rose-400 font-semibold">{activity.avgHr}bpm</span>
          {activity.normPower && (
            <span className="text-purple-300 font-semibold">{activity.normPower}w</span>
          )}
          {activity.paceFormatted && (
            <span className="text-cyan-300 font-semibold">{activity.paceFormatted}</span>
          )}
        </div>

        <div className="text-slate-100 font-semibold">Load {activity.load}</div>

        {activity.gapFormatted && (
          <div className="text-purple-300 text-[11px]">GAP {activity.gapFormatted}</div>
        )}

        {activity.rpe !== undefined && (
          <div className="text-teal-400 text-[11px]">RPE {activity.rpe}</div>
        )}

        {/* Solid Green / Teal Progress Bar */}
        <div className="pt-1">
          <div
            className={`w-full h-3.5 rounded-xs ${
              isRun ? 'bg-emerald-600' : 'bg-teal-600/90'
            }`}
          />
        </div>

        {/* Title & Source */}
        <div className="pt-1 font-sans">
          <div className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2">
            {activity.name}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            ({activity.sourcePlatform})
          </div>
        </div>

        {/* Compliance Indicator */}
        {activity.compliancePct !== undefined && (
          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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
  onSelect,
}) => {
  const isRun = workout.sport === 'Run';
  const hasIntervals = workout.steps.some((s) => s.zone === 'Z4' || s.zone === 'Z5');

  const headerBg =
    workout.sport === 'Mobility'
      ? 'bg-[#3f4622]'
      : workout.sport === 'Strength'
      ? 'bg-[#383d48]'
      : workout.sport === 'Swim'
      ? 'bg-[#164e63]'
      : hasIntervals
      ? 'bg-[#543a24]'
      : 'bg-[#1e3a4c]';

  const totalSec = Math.max(
    workout.durationSec,
    workout.steps.reduce((acc, s) => Math.max(acc, s.endSec), 0) || 1800
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(workout)}
      className={`w-full text-left rounded-xl overflow-hidden bg-[#191d26] border transition-all cursor-pointer group ${
        workout.complianceStatus === 'missed'
          ? 'border-rose-800/80 hover:border-rose-600'
          : isSelected
          ? 'border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg'
          : 'border-slate-800/90 hover:border-sky-500/60'
      }`}
    >
      {/* Top Header: Sport Icon + Planned Duration + Planned Distance */}
      <div
        className={`px-3 py-1.5 ${headerBg} flex items-center justify-between gap-2 font-mono tabular-nums text-xs font-bold text-slate-100`}
      >
        <div className="flex items-center gap-1.5">
          <SportMiniIcon sport={workout.sport} />
          <span>{workout.durationLabel}</span>
        </div>
        {workout.distanceKm !== undefined && workout.distanceKm > 0 && (
          <span>{workout.distanceKm} km</span>
        )}
      </div>

      {/* Body: Planned Load + Mini Pace Step Preview Diagram + Title */}
      <div className="p-3 space-y-2 text-center">
        {workout.load !== undefined && workout.load > 0 && (
          <div className="font-mono tabular-nums text-xs font-bold text-slate-100">
            Load {workout.load}
          </div>
        )}

        {/* Mini Pace Step Preview Diagram (Matches Friday Oct 30 Fartlek card in Screenshot 1) */}
        {isRun && workout.steps.length > 0 && (
          <div className="w-full h-7 bg-[#12151e] rounded-xs px-0.5 pt-1 flex items-end gap-[1px] overflow-hidden border border-slate-800/70">
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

        <div className="text-xs font-medium text-slate-200 group-hover:text-sky-300 transition-colors line-clamp-2">
          {workout.name}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
          <span>Planned</span>
          {workout.intensityPct !== undefined && (
            <>
              <span>·</span>
              <span>{workout.intensityPct}% Int</span>
            </>
          )}
          {workout.complianceStatus === 'completed' && (
            <>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">Done ✓</span>
            </>
          )}
        </div>

        {workout.complianceStatus === 'missed' && (
          <div className="pt-1 border-t border-rose-900/50 flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-400 font-mono">
            <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>0%</span>
          </div>
        )}
      </div>
    </button>
  );
};
