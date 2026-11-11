import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Footprints,
  Dumbbell,
  Activity,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import { PlannedWorkout, SportType, WorkoutStepBlock } from '../types/intervals';
import { formatSecondsToClock } from '../utils/formatters';

interface PlannedWorkoutDetailProps {
  workout: PlannedWorkout;
  onClose: () => void;
  onToggleComplete: (workoutId: string) => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
}

function getSportIcon(sport: SportType) {
  switch (sport) {
    case 'Run':
      return <Footprints className="w-5 h-5 text-orange-400" />;
    case 'Swim':
      return <Waves className="w-5 h-5 text-sky-400" />;
    case 'Strength':
      return <Dumbbell className="w-5 h-5 text-slate-300" />;
    case 'Mobility':
    case 'Yoga':
    case 'Pilates':
      return <Sparkles className="w-5 h-5 text-lime-400" />;
    default:
      return <Activity className="w-5 h-5 text-cyan-400" />;
  }
}

export const PlannedWorkoutDetail: React.FC<PlannedWorkoutDetailProps> = ({
  workout,
  onClose,
  onToggleComplete,
  t,
}) => {
  const tr = (key: string, fallback: string) => (t ? t(key) : fallback);
  const [showPctMode, setShowPctMode] = useState<boolean>(true);
  const [selectedStep, setSelectedStep] = useState<WorkoutStepBlock | null>(
    workout.steps[0] || null
  );
  const [copied, setCopied] = useState(false);

  const totalSec = Math.max(
    workout.durationSec,
    workout.steps.reduce((acc, s) => Math.max(acc, s.endSec), 0) || 1800
  );

  // Compute time ticks matching Intervals.icu
  const tickInterval = totalSec === 3900 ? 500 : Math.max(300, Math.round(totalSec / 7 / 60) * 60);
  const timeTicks: number[] = [];
  for (let tSec = 0; tSec <= totalSec; tSec += tickInterval) {
    timeTicks.push(tSec);
  }

  const topPaceSec = 195; // 3:15/km top ceiling
  const bottomPaceSec = 310; // 5:10/km baseline

  const getStepHeightPct = (step: WorkoutStepBlock): number => {
    if (showPctMode) {
      const avgPct = (step.pctPaceMin + step.pctPaceMax) / 2;
      return Math.min(95, Math.max(20, ((avgPct - 50) / 55) * 75 + 18));
    }
    const clamped = Math.min(bottomPaceSec, Math.max(topPaceSec, step.paceMidSecPerKm));
    const ratio = (bottomPaceSec - clamped) / (bottomPaceSec - topPaceSec);
    return Math.min(95, Math.max(20, ratio * 76 + 18));
  };

  const handleCopyText = () => {
    const lines: string[] = [`${workout.name} (${workout.durationLabel})`];
    workout.instructionGroups.forEach((grp) => {
      if (grp.repeatCount) lines.push(`\n${grp.repeatCount}x`);
      grp.items.forEach((it) => lines.push(`- ${it.text}`));
    });
    navigator.clipboard?.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadWorkout = () => {
    const lines: string[] = [
      `# Intervals.icu Structured Workout — ${workout.name}`,
      `# Date: ${workout.date} ${workout.startTime || ''}`,
      `# Planned Duration: ${workout.durationLabel} | Distance: ${workout.distanceKm ?? 0} km | Load: ${workout.load ?? 0}`,
      '',
    ];
    workout.instructionGroups.forEach((grp) => {
      if (grp.repeatCount) lines.push(`${grp.repeatCount}x`);
      grp.items.forEach((it) => lines.push(`- ${it.text}`));
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workout.name.toLowerCase().replace(/\s+/g, '_')}_${workout.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parsedDate = new Date(`${workout.date}T12:00:00`);
  const weekdayName = parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dayMonthStr = parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <div className="bg-[#181b24] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
      {/* Top Header Bar */}
      <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-[#141720]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="lg:hidden min-h-[40px] min-w-[40px] -ml-1 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors cursor-pointer"
            aria-label="Back to calendar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-slate-800/90 border border-slate-700/70 flex items-center justify-center shrink-0">
            {getSportIcon(workout.sport)}
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-100 truncate">
              {workout.name}
            </h2>
            <p className="text-xs text-slate-400 font-mono tabular-nums">
              {weekdayName} · {dayMonthStr} {workout.startTime || '08:00 AM'}
            </p>
          </div>
        </div>

        {/* Summary KPI Strip: Duration, Distance, Load, Intensity */}
        <div className="flex items-center gap-4 sm:gap-6 ml-auto font-mono tabular-nums">
          <div className="text-center">
            <div className="text-[11px] text-slate-400 font-sans">
              {tr('detail.duration', 'Duration')}
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-100">
              {workout.durationLabel}
            </div>
          </div>
          {workout.distanceKm !== undefined && workout.distanceKm > 0 && (
            <div className="text-center">
              <div className="text-[11px] text-slate-400 font-sans">
                {tr('detail.distance', 'Distance')}
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-100">
                {workout.distanceKm} km
              </div>
            </div>
          )}
          {workout.load !== undefined && (
            <div className="text-center">
              <div className="text-[11px] text-slate-400 font-sans">
                {tr('detail.load', 'Load')}
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-100">
                {workout.load}
              </div>
            </div>
          )}
          {workout.intensityPct !== undefined && (
            <div className="text-center">
              <div className="text-[11px] text-slate-400 font-sans">
                {tr('detail.intensity', 'Intensity')}
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-100">
                {workout.intensityPct}%
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="hidden lg:flex min-h-[40px] min-w-[40px] rounded-xl items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close workout detail"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle Section: Structured Workout Steps (Left) + Zone Distribution Bars (Right) */}
      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 border-b border-slate-800/60">
        {/* Left: Coach Written Workout Structure */}
        <div className="md:col-span-7 space-y-3">
          <div className="text-xs font-medium text-slate-400">
            {tr('detail.structure', 'Planned Workout Structure')}
          </div>
          <div className="space-y-3 text-sm text-slate-100 leading-relaxed">
            {workout.instructionGroups.map((group) => (
              <div key={group.id} className="space-y-1.5">
                {group.repeatCount && (
                  <div className="font-mono font-semibold text-slate-200 pt-1">
                    {group.repeatCount}x
                  </div>
                )}
                <ul className="space-y-1.5 pl-4">
                  {group.items.map((item, idx) => (
                    <li
                      key={idx}
                      className="list-disc marker:text-slate-400 text-slate-100 font-normal"
                    >
                      <span className="font-mono tabular-nums">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {workout.coachNotes && (
            <div className="pt-2 text-xs text-slate-400 leading-relaxed border-t border-slate-800/70">
              <span className="text-slate-300 font-medium">
                {tr('detail.coach_notes', 'Coach Notes:')}{' '}
              </span>
              {workout.coachNotes}
            </div>
          )}
        </div>

        {/* Right: Zone Time Breakdown (Z1 - Z5 + PI) */}
        <div className="md:col-span-5 flex flex-col justify-start md:items-end">
          <div className="w-full max-w-[260px] space-y-1.5 font-mono tabular-nums text-xs">
            <div className="text-xs font-sans font-medium text-slate-400 mb-2">
              {tr('detail.time_in_zones', 'Time in Zones')}
            </div>
            {workout.zoneDistribution.map((z) => (
              <div key={z.zone} className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-2 text-slate-300">{z.zone}</span>
                <div className="col-span-5 h-3 bg-slate-800/90 rounded-xs overflow-hidden">
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
                <span className="col-span-5 text-right text-slate-300">
                  {z.percentage > 0 ? `${z.durationLabel} ${z.percentage}%` : '—'}
                </span>
              </div>
            ))}
            {workout.polarizationIndex !== undefined && (
              <div className="pt-1.5 text-center text-xs text-slate-400">
                PI <span className="font-bold text-slate-200">{workout.polarizationIndex.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Planned Pace-Time Chart — Shown ONLY for Running workouts */}
      {workout.sport === 'Run' && workout.steps.length > 0 && (
        <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 bg-[#151821]">
          {/* Interactive Selected Step Readout Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-mono tabular-nums">
              <span className="text-slate-400 font-sans">
                {tr('detail.selected_block', 'Selected Block:')}
              </span>
              {selectedStep ? (
                <span className="text-cyan-300 font-medium">
                  {selectedStep.label} ({formatSecondsToClock(selectedStep.startSec)} –{' '}
                  {formatSecondsToClock(selectedStep.endSec)})
                </span>
              ) : (
                <span>{tr('detail.tap_bar_hint', 'Tap any bar on the diagram to inspect target pace')}</span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {tr('detail.target', 'Target:')} {showPctMode ? '% Pace + min/km' : tr('detail.pace_km', 'Pace/km')}
            </span>
          </div>

          {/* Step Chart Container */}
          <div className="relative select-none">
            <div className="flex items-stretch">
              {/* Vertical Y-Axis Label & Pace Ticks */}
              <div className="w-14 shrink-0 flex items-center pr-2">
                <div className="-rotate-90 text-[10px] text-slate-400 whitespace-nowrap w-4 text-center">
                  {tr('detail.pace_km', 'Pace/km')}
                </div>
                <div className="flex-1 h-40 flex flex-col justify-between text-right font-mono tabular-nums text-[11px] text-slate-400 py-1">
                  <span>3:20</span>
                  <span>{showPctMode ? '3:42' : '3:45'}</span>
                  <span>{showPctMode ? '4:10' : '4:15'}</span>
                  <span>{showPctMode ? '4:46' : '4:50'}</span>
                </div>
              </div>

              {/* Plot Area with Horizontal Gridlines and Proportional Duration Step Blocks */}
              <div className="relative flex-1 h-40 border-b border-l border-slate-700/80 bg-[#12151e]">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-2">
                  <div className="border-t border-slate-800/90 w-full" />
                  <div className="border-t border-slate-800/90 w-full" />
                  <div className="border-t border-slate-800/90 w-full" />
                  <div className="border-t border-slate-800/90 w-full" />
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
                            ? 'opacity-100 ring-1 ring-white/80 brightness-110'
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
            <div className="flex items-center pl-14 pt-1.5 font-mono tabular-nums text-[11px] text-slate-400 justify-between">
              {timeTicks.map((tSec) => (
                <span key={tSec}>{formatSecondsToClock(tSec)}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="px-4 py-3 sm:px-6 border-t border-slate-800/80 bg-[#141720] flex flex-wrap items-center justify-between gap-3">
        {workout.sport === 'Run' && workout.steps.length > 0 ? (
          <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none min-h-[40px]">
            <input
              type="checkbox"
              checked={showPctMode}
              onChange={(e) => setShowPctMode(e.target.checked)}
              className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
            />
            <span className="font-mono">%</span>
          </label>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleCopyText}
            className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-400 hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? tr('detail.copied', 'COPIED') : tr('detail.copy', 'COPY')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWorkout}
            className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-400 hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Download structured workout text file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tr('detail.export', 'EXPORT')}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleComplete(workout.id)}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              workout.complianceStatus === 'completed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {workout.complianceStatus === 'completed'
              ? tr('detail.completed', 'COMPLETED ✓')
              : tr('detail.mark_done', 'MARK DONE')}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold text-sky-400 hover:bg-slate-800/80 transition-colors cursor-pointer whitespace-nowrap"
          >
            {tr('detail.close', 'CLOSE')}
          </button>
        </div>
      </div>
    </div>
  );
};

