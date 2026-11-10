package icu.intervals.companion.model

object SampleRunningData {
    val fartlekWorkout = PlannedRunWorkout(
        id = "plan-fri-fartlek",
        date = "2026-10-30",
        startTime = "08:00",
        name = "Fartlek",
        durationSec = 3900,
        durationLabel = "1h5m",
        distanceKm = 15.0,
        load = 65,
        intensityPct = 77,
        instructionGroups = listOf(
            InstructionGroup(
                repeatCount = null,
                bullets = listOf("30m 70-75% Pace (4:46-4:27/km)")
            ),
            InstructionGroup(
                repeatCount = 10,
                bullets = listOf(
                    "1m 90-100% Pace (3:42-3:20/km)",
                    "1m 70-75% Pace (4:46-4:27/km)"
                )
            ),
            InstructionGroup(
                repeatCount = null,
                bullets = listOf("15m 70-75% Pace (4:46-4:27/km)")
            )
        ),
        steps = buildList {
            // 30m warmup
            add(
                WorkoutStepBlock(
                    id = "warmup",
                    label = "30m @ 4:46-4:27/km (70-75%)",
                    durationSec = 1800,
                    startSec = 0,
                    endSec = 1800,
                    distanceKm = 6.5,
                    pctPaceMin = 70,
                    pctPaceMax = 75,
                    paceMinFormatted = "4:46",
                    paceMaxFormatted = "4:27",
                    paceMidSecPerKm = 276f,
                    zone = TrainingZone.Z1
                )
            )
            // 10x (1m fast Z4/Z5 + 1m float Z1)
            var cursor = 1800
            for (rep in 1..10) {
                add(
                    WorkoutStepBlock(
                        id = "on-$rep",
                        label = "Rep $rep/10 · 1m @ 3:42-3:20/km (90-100%)",
                        durationSec = 60,
                        startSec = cursor,
                        endSec = cursor + 60,
                        distanceKm = 0.29,
                        pctPaceMin = 90,
                        pctPaceMax = 100,
                        paceMinFormatted = "3:42",
                        paceMaxFormatted = "3:20",
                        paceMidSecPerKm = 211f,
                        zone = TrainingZone.Z4
                    )
                )
                cursor += 60
                add(
                    WorkoutStepBlock(
                        id = "off-$rep",
                        label = "Recovery $rep/10 · 1m @ 4:46-4:27/km (70-75%)",
                        durationSec = 60,
                        startSec = cursor,
                        endSec = cursor + 60,
                        distanceKm = 0.22,
                        pctPaceMin = 70,
                        pctPaceMax = 75,
                        paceMinFormatted = "4:46",
                        paceMaxFormatted = "4:27",
                        paceMidSecPerKm = 276f,
                        zone = TrainingZone.Z1
                    )
                )
                cursor += 60
            }
            // 15m cooldown
            add(
                WorkoutStepBlock(
                    id = "cooldown",
                    label = "15m @ 4:46-4:27/km (70-75%)",
                    durationSec = 900,
                    startSec = 3000,
                    endSec = 3900,
                    distanceKm = 3.25,
                    pctPaceMin = 70,
                    pctPaceMax = 75,
                    paceMinFormatted = "4:46",
                    paceMaxFormatted = "4:27",
                    paceMidSecPerKm = 276f,
                    zone = TrainingZone.Z1
                )
            )
        },
        zoneDistribution = listOf(
            ZoneAllocation(TrainingZone.Z1, "55m", 84.6f),
            ZoneAllocation(TrainingZone.Z2, "-", 0f),
            ZoneAllocation(TrainingZone.Z3, "-", 0f),
            ZoneAllocation(TrainingZone.Z4, "10m", 15.4f),
            ZoneAllocation(TrainingZone.Z5, "-", 0f)
        ),
        coachNotes = "Smooth turnover on the 1-minute surges, keep float recoveries relaxed."
    )

    val plannedWorkouts = listOf(
        fartlekWorkout,
        PlannedRunWorkout(
            id = "plan-sat-easy-strides",
            date = "2026-10-31",
            startTime = "08:30",
            name = "Easy run + strides - HR below 132",
            durationSec = 4800,
            durationLabel = "1h20m",
            distanceKm = 16.0,
            load = 59,
            intensityPct = 68,
            instructionGroups = listOf(
                InstructionGroup(
                    repeatCount = null,
                    bullets = listOf(
                        "1h10m Easy aerobic Z1/Z2 (keep HR < 132 bpm)",
                        "6x 20s relaxed strides with 60s jog recovery"
                    )
                )
            ),
            steps = listOf(
                WorkoutStepBlock(
                    id = "sat-main",
                    label = "1h20m Easy Run @ 5:00/km (HR < 132 bpm)",
                    durationSec = 4800,
                    startSec = 0,
                    endSec = 4800,
                    distanceKm = 16.0,
                    pctPaceMin = 66,
                    pctPaceMax = 72,
                    paceMinFormatted = "5:05",
                    paceMaxFormatted = "4:45",
                    paceMidSecPerKm = 295f,
                    zone = TrainingZone.Z1
                )
            ),
            zoneDistribution = listOf(
                ZoneAllocation(TrainingZone.Z1, "1h20m", 100f),
                ZoneAllocation(TrainingZone.Z2, "-", 0f),
                ZoneAllocation(TrainingZone.Z3, "-", 0f),
                ZoneAllocation(TrainingZone.Z4, "-", 0f),
                ZoneAllocation(TrainingZone.Z5, "-", 0f)
            )
        ),
        PlannedRunWorkout(
            id = "plan-sun-long",
            date = "2026-11-01",
            startTime = "07:30",
            name = "Длительный умеренно по самочувствию",
            durationSec = 6360,
            durationLabel = "1h46m",
            distanceKm = 25.0,
            load = 108,
            intensityPct = 79,
            instructionGroups = listOf(
                InstructionGroup(
                    repeatCount = null,
                    bullets = listOf("25 km steady moderate progression by feel (4:20-4:10/km)")
                )
            ),
            steps = listOf(
                WorkoutStepBlock(
                    id = "sun-long",
                    label = "1h46m Long Moderate Run @ 4:15/km",
                    durationSec = 6360,
                    startSec = 0,
                    endSec = 6360,
                    distanceKm = 25.0,
                    pctPaceMin = 76,
                    pctPaceMax = 82,
                    paceMinFormatted = "4:24",
                    paceMaxFormatted = "4:05",
                    paceMidSecPerKm = 254f,
                    zone = TrainingZone.Z2
                )
            ),
            zoneDistribution = listOf(
                ZoneAllocation(TrainingZone.Z1, "-", 0f),
                ZoneAllocation(TrainingZone.Z2, "1h46m", 100f),
                ZoneAllocation(TrainingZone.Z3, "-", 0f),
                ZoneAllocation(TrainingZone.Z4, "-", 0f),
                ZoneAllocation(TrainingZone.Z5, "-", 0f)
            )
        )
    )

    val completedActivities = listOf(
        CompletedRunActivity(
            id = "act-tue-run-1",
            date = "2026-10-27",
            startTime = "07:20",
            name = "Easy run + strides - HR below 132",
            distanceKm = 16.4,
            movingTimeLabel = "1h28m",
            paceFormatted = "5:22/km",
            gapFormatted = "5:22/km",
            avgHr = 128,
            maxHr = 141,
            normPowerWatts = 281,
            load = 44,
            compliancePct = 75,
            paceStreamSec = listOf(325f, 320f, 322f, 321f, 319f, 324f, 318f, 322f),
            hrStreamBpm = listOf(122, 126, 128, 129, 130, 127, 131, 129),
            powerStreamWatts = listOf(276, 281, 283, 280, 284, 279, 285, 281)
        ),
        CompletedRunActivity(
            id = "act-wed-hills",
            date = "2026-10-28",
            startTime = "07:15",
            name = "Uphill intervals",
            distanceKm = 13.0,
            movingTimeLabel = "1h1m",
            paceFormatted = "4:27/km",
            gapFormatted = "4:16/km",
            avgHr = 152,
            maxHr = 174,
            normPowerWatts = 369,
            load = 55,
            compliancePct = 134,
            paceStreamSec = listOf(280f, 250f, 245f, 290f, 242f, 285f, 240f, 275f),
            hrStreamBpm = listOf(140, 158, 164, 146, 168, 149, 171, 148),
            powerStreamWatts = listOf(310, 395, 410, 290, 415, 295, 420, 305)
        )
    )
}
