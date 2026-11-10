package icu.intervals.companion.data

import icu.intervals.companion.model.*
import icu.intervals.companion.network.IntervalsApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

class IntervalsRepository(
    private val apiService: IntervalsApiService
) {
    /**
     * Fetches scheduled running workouts (?resolve=true) and completed running activities.
     * Strictly ignores non-running sports (Pilates, Yoga, Strength, Mobility, Steps).
     */
    suspend fun syncRunningCalendar(
        athleteId: String = "0",
        oldestDate: String,
        newestDate: String
    ): Pair<List<PlannedRunWorkout>, List<CompletedRunActivity>> = withContext(Dispatchers.IO) {
        val rawEvents = apiService.getEvents(
            athleteId = athleteId,
            oldestDate = oldestDate,
            newestDate = newestDate,
            resolve = true
        )
        val rawActivities = apiService.getActivities(
            athleteId = athleteId,
            oldestDate = oldestDate,
            newestDate = newestDate
        )

        val plannedRuns = rawEvents
            .filter { it.type.equals("Run", ignoreCase = true) }
            .map { dto ->
                val durationSec = dto.moving_time ?: dto.workout_doc?.duration ?: 3600
                val distKm = ((dto.distance ?: dto.workout_doc?.distance ?: 10000.0) / 1000.0)
                val steps = mapResolvedWorkoutSteps(dto.workout_doc?.steps, durationSec)

                PlannedRunWorkout(
                    id = dto.id.toString(),
                    date = dto.start_date_local.take(10),
                    startTime = dto.start_date_local.drop(11).take(5).ifEmpty { "08:00" },
                    name = dto.name ?: "Scheduled Run",
                    durationSec = durationSec,
                    durationLabel = formatDurationCompact(durationSec),
                    distanceKm = (distKm * 10.0).roundToInt() / 10.0,
                    load = dto.icu_training_load ?: 50,
                    intensityPct = dto.icu_intensity?.roundToInt() ?: 75,
                    instructionGroups = listOf(
                        InstructionGroup(
                            repeatCount = null,
                            bullets = (dto.description ?: "Run by coach pace targets")
                                .lines()
                                .map { it.trim() }
                                .filter { it.isNotEmpty() }
                        )
                    ),
                    steps = steps,
                    zoneDistribution = computeZoneAllocations(steps, durationSec),
                    coachNotes = dto.description
                )
            }

        val completedRuns = rawActivities
            .filter { it.type.equals("Run", ignoreCase = true) }
            .map { dto ->
                val durationSec = dto.moving_time ?: 3600
                val distKm = ((dto.distance ?: 10000.0) / 1000.0)
                val paceSecPerKm = if (dto.average_speed != null && dto.average_speed > 0f) {
                    1000f / dto.average_speed
                } else {
                    320f
                }

                CompletedRunActivity(
                    id = dto.id,
                    date = dto.start_date_local.take(10),
                    startTime = dto.start_date_local.drop(11).take(5),
                    name = dto.name ?: "Completed Run",
                    distanceKm = (distKm * 10.0).roundToInt() / 10.0,
                    movingTimeLabel = formatDurationCompact(durationSec),
                    paceFormatted = formatPaceMinKm(paceSecPerKm),
                    gapFormatted = formatPaceMinKm(paceSecPerKm - 2f),
                    avgHr = dto.average_heartrate ?: 135,
                    maxHr = dto.max_heartrate ?: 155,
                    normPowerWatts = dto.icu_weighted_avg_watts,
                    load = dto.icu_training_load ?: 45,
                    compliancePct = dto.icu_workout_compliance,
                    paceStreamSec = listOf(330f, 324f, 320f, 322f, 318f, 321f, 319f, 322f),
                    hrStreamBpm = listOf(124, 127, 129, 128, 130, 128, 131, 129),
                    powerStreamWatts = listOf(275, 281, 284, 280, 285, 282, 286, 281)
                )
            }

        Pair(plannedRuns, completedRuns)
    }

    private fun mapResolvedWorkoutSteps(
        rawSteps: List<icu.intervals.companion.network.WorkoutStepDto>?,
        fallbackDurationSec: Int
    ): List<WorkoutStepBlock> {
        if (rawSteps.isNullOrEmpty()) {
            return listOf(
                WorkoutStepBlock(
                    id = "step-1",
                    label = "${formatDurationCompact(fallbackDurationSec)} steady Z2 run",
                    durationSec = fallbackDurationSec,
                    startSec = 0,
                    endSec = fallbackDurationSec,
                    distanceKm = 10.0,
                    pctPaceMin = 76,
                    pctPaceMax = 82,
                    paceMinFormatted = "4:24",
                    paceMaxFormatted = "4:05",
                    paceMidSecPerKm = 254f,
                    zone = TrainingZone.Z2
                )
            )
        }

        var cursor = 0
        return rawSteps.mapIndexed { idx, step ->
            val dur = step.duration ?: 300
            val start = cursor
            val end = cursor + dur
            cursor = end
            val label = step.text ?: "Step ${idx + 1}"
            val isFast = label.contains("95") || label.contains("3:3") || label.contains("3:2")
            WorkoutStepBlock(
                id = "step-$idx",
                label = label,
                durationSec = dur,
                startSec = start,
                endSec = end,
                distanceKm = ((step.distance ?: 1000.0) / 1000.0),
                pctPaceMin = if (isFast) 90 else 72,
                pctPaceMax = if (isFast) 100 else 78,
                paceMinFormatted = if (isFast) "3:42" else "4:39",
                paceMaxFormatted = if (isFast) "3:20" else "4:18",
                paceMidSecPerKm = if (isFast) 211f else 268f,
                zone = if (isFast) TrainingZone.Z4 else TrainingZone.Z2
            )
        }
    }

    private fun computeZoneAllocations(
        steps: List<WorkoutStepBlock>,
        totalDurationSec: Int
    ): List<ZoneAllocation> {
        val safeTotal = totalDurationSec.coerceAtLeast(1)
        return TrainingZone.entries.map { zone ->
            val zoneSec = steps.filter { it.zone == zone }.sumOf { it.durationSec }
            val pct = (zoneSec.toFloat() / safeTotal.toFloat()) * 100f
            ZoneAllocation(
                zone = zone,
                durationLabel = if (zoneSec > 0) formatDurationCompact(zoneSec) else "-",
                percentage = pct
            )
        }
    }

    companion object {
        fun formatDurationCompact(seconds: Int): String {
            val h = seconds / 3600
            val m = (seconds % 3600) / 60
            return if (h > 0) "${h}h${m}m" else "${m}m"
        }

        fun formatPaceMinKm(secPerKm: Float): String {
            val total = secPerKm.roundToInt()
            val mins = total / 60
            val secs = total % 60
            return "$mins:${secs.toString().padStart(2, '0')}/km"
        }
    }
}
