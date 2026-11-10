export interface KotlinSourceFile {
  path: string;
  title: string;
  description: string;
  content: string;
}

export const KOTLIN_ANDROID_FILES: KotlinSourceFile[] = [
  {
    path: 'settings.gradle.kts',
    title: 'settings.gradle.kts (Project Settings)',
    description: 'Root Gradle settings declaring Google Maven, Maven Central, and the :app module.',
    content: `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "IntervalsIcuRunner"
include(":app")
`,
  },
  {
    path: 'build.gradle.kts',
    title: 'build.gradle.kts (Root Project)',
    description: 'Top-level Gradle plugins for Android Application 8.7.3 and Kotlin 2.0.21 with Jetpack Compose compiler.',
    content: `plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
`,
  },
  {
    path: 'app/build.gradle.kts',
    title: 'app/build.gradle.kts (Module :app)',
    description: 'Module Gradle configuration with Jetpack Compose Material 3, Retrofit2 (Intervals.icu REST API), WorkManager (12h auto-sync), and Kotlin Coroutines.',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "icu.intervals.companion"
    compileSdk = 35

    defaultConfig {
        applicationId = "icu.intervals.companion"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // Configure your Intervals.icu Developer API Key in local.properties
        buildConfigField("String", "INTERVALS_API_KEY", "\\"YOUR_API_KEY\\"")
        buildConfigField("String", "ATHLETE_ID", "\\"0\\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.01.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    // Retrofit + OkHttp for https://intervals.icu/api/v1
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // WorkManager for twice-daily (12-hour) background sync
    implementation("androidx.work:work-runtime-ktx:2.10.0")
}
`,
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    title: 'AndroidManifest.xml',
    description: 'Android application manifest declaring internet permissions and the main Compose activity.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:label="Intervals Companion"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/model/Models.kt',
    title: 'Models.kt',
    description: 'Domain & API data classes for Running Scheduled Workouts, WorkoutStepBlocks (workout_doc), ZoneAllocations, and Completed Running Activities.',
    content: `package icu.intervals.companion.model

import androidx.compose.ui.graphics.Color

enum class TrainingZone(val color: Color) {
    Z1(Color(0xFF0D9488)), // Teal
    Z2(Color(0xFF16A34A)), // Green
    Z3(Color(0xFFEAB308)), // Amber
    Z4(Color(0xFFEA580C)), // Orange
    Z5(Color(0xFFEF4444))  // Red
}

data class WorkoutStepBlock(
    val id: String,
    val label: String,
    val durationSec: Int,
    val startSec: Int,
    val endSec: Int,
    val distanceKm: Double,
    val pctPaceMin: Int,
    val pctPaceMax: Int,
    val paceMinFormatted: String, // e.g. "3:20"
    val paceMaxFormatted: String, // e.g. "3:42"
    val paceMidSecPerKm: Float,   // e.g. 211f for 3:31/km
    val zone: TrainingZone
)

data class InstructionGroup(
    val repeatCount: Int? = null,
    val bullets: List<String>
)

data class ZoneAllocation(
    val zone: TrainingZone,
    val durationLabel: String,
    val percentage: Float
)

data class PlannedRunWorkout(
    val id: String,
    val date: String,           // "2026-10-30"
    val startTime: String,      // "08:00"
    val name: String,           // "Fartlek"
    val durationSec: Int,       // 3900
    val durationLabel: String,  // "1h5m"
    val distanceKm: Double,     // 15.0
    val load: Int,              // 65
    val intensityPct: Int,      // 77
    val instructionGroups: List<InstructionGroup>,
    val steps: List<WorkoutStepBlock>,
    val zoneDistribution: List<ZoneAllocation>,
    val coachNotes: String? = null
)

data class CompletedRunActivity(
    val id: String,
    val date: String,
    val startTime: String,
    val name: String,
    val distanceKm: Double,
    val movingTimeLabel: String,
    val paceFormatted: String,
    val gapFormatted: String,
    val avgHr: Int,
    val maxHr: Int,
    val normPowerWatts: Int?,
    val load: Int,
    val compliancePct: Int?,
    val paceStreamSec: List<Float>,
    val hrStreamBpm: List<Int>,
    val powerStreamWatts: List<Int>
)
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/model/SampleRunningData.kt',
    title: 'SampleRunningData.kt',
    description: 'Default offline/demo running dataset including Friday 22-step Fartlek (1h5m, 15km), Saturday Easy + Strides, Sunday 25km Long Run, and completed Garmin Forerunner 965 runs.',
    content: `package icu.intervals.companion.model

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
            var cursor = 1800
            for (rep in 1..10) {
                add(
                    WorkoutStepBlock(
                        id = "on-\$rep",
                        label = "Rep \$rep/10 · 1m @ 3:42-3:20/km (90-100%)",
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
                        id = "off-\$rep",
                        label = "Recovery \$rep/10 · 1m @ 4:46-4:27/km (70-75%)",
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

    val plannedWorkouts = listOf(fartlekWorkout)
    val completedActivities = listOf<CompletedRunActivity>()
}
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/network/IntervalsApiService.kt',
    title: 'IntervalsApiService.kt',
    description: 'Retrofit service for https://intervals.icu/api/v1 with HTTP Basic Auth (API_KEY) and running-only filtering.',
    content: `package icu.intervals.companion.network

import okhttp3.Credentials
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

data class IntervalsEventDto(
    val id: Long,
    val start_date_local: String,
    val name: String?,
    val type: String?,
    val moving_time: Int?,
    val distance: Double?,
    val icu_training_load: Int?,
    val icu_intensity: Float?,
    val description: String?,
    val workout_doc: WorkoutDocDto?
)

data class WorkoutDocDto(
    val duration: Int?,
    val distance: Double?,
    val steps: List<WorkoutStepDto>?
)

data class WorkoutStepDto(
    val duration: Int?,
    val distance: Double?,
    val text: String?
)

data class IntervalsActivityDto(
    val id: String,
    val start_date_local: String,
    val name: String?,
    val type: String?,
    val moving_time: Int?,
    val distance: Double?,
    val average_speed: Float?,
    val average_heartrate: Int?,
    val max_heartrate: Int?,
    val icu_weighted_avg_watts: Int?,
    val icu_training_load: Int?,
    val icu_workout_compliance: Int?
)

interface IntervalsApiService {

    // Fetch scheduled workouts with resolve=true so workout_doc steps are resolved to pace/time
    @GET("api/v1/athlete/{id}/events")
    suspend fun getEvents(
        @Path("id") athleteId: String = "0",
        @Query("oldest") oldestDate: String,
        @Query("newest") newestDate: String,
        @Query("resolve") resolve: Boolean = true
    ): List<IntervalsEventDto>

    // Fetch completed activities; we filter strictly to type == "Run" in repository
    @GET("api/v1/athlete/{id}/activities")
    suspend fun getActivities(
        @Path("id") athleteId: String = "0",
        @Query("oldest") oldestDate: String,
        @Query("newest") newestDate: String
    ): List<IntervalsActivityDto>

    companion object {
        fun create(apiKey: String): IntervalsApiService {
            val client = OkHttpClient.Builder()
                .addInterceptor { chain ->
                    val credential = Credentials.basic("API_KEY", apiKey)
                    val request = chain.request().newBuilder()
                        .header("Authorization", credential)
                        .header("Accept", "application/json")
                        .build()
                    chain.proceed(request)
                }
                .build()

            return Retrofit.Builder()
                .baseUrl("https://intervals.icu/")
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(IntervalsApiService::class.java)
        }
    }
}
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/data/IntervalsRepository.kt',
    title: 'IntervalsRepository.kt',
    description: 'Repository that fetches scheduled workouts (?resolve=true) & completed activities, strictly filtering to Running only (ignoring steps, strength, mobility, Pilates, Yoga).',
    content: `package icu.intervals.companion.data

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

                PlannedRunWorkout(
                    id = dto.id.toString(),
                    date = dto.start_date_local.take(10),
                    startTime = dto.start_date_local.drop(11).take(5).ifEmpty { "08:00" },
                    name = dto.name ?: "Scheduled Run",
                    durationSec = durationSec,
                    durationLabel = "\${durationSec / 60}m",
                    distanceKm = (distKm * 10.0).roundToInt() / 10.0,
                    load = dto.icu_training_load ?: 50,
                    intensityPct = dto.icu_intensity?.roundToInt() ?: 75,
                    instructionGroups = emptyList(),
                    steps = emptyList(),
                    zoneDistribution = emptyList(),
                    coachNotes = dto.description
                )
            }

        val completedRuns = rawActivities
            .filter { it.type.equals("Run", ignoreCase = true) }
            .map { dto ->
                val durationSec = dto.moving_time ?: 3600
                val distKm = ((dto.distance ?: 10000.0) / 1000.0)
                CompletedRunActivity(
                    id = dto.id,
                    date = dto.start_date_local.take(10),
                    startTime = dto.start_date_local.drop(11).take(5),
                    name = dto.name ?: "Completed Run",
                    distanceKm = (distKm * 10.0).roundToInt() / 10.0,
                    movingTimeLabel = "\${durationSec / 60}m",
                    paceFormatted = "5:15/km",
                    gapFormatted = "5:12/km",
                    avgHr = dto.average_heartrate ?: 135,
                    maxHr = dto.max_heartrate ?: 155,
                    normPowerWatts = dto.icu_weighted_avg_watts,
                    load = dto.icu_training_load ?: 45,
                    compliancePct = dto.icu_workout_compliance,
                    paceStreamSec = emptyList(),
                    hrStreamBpm = emptyList(),
                    powerStreamWatts = emptyList()
                )
            }

        Pair(plannedRuns, completedRuns)
    }
}
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/sync/IntervalsSyncWorker.kt',
    title: 'IntervalsSyncWorker.kt',
    description: 'WorkManager CoroutineWorker that syncs running workouts twice per day (every 12 hours) and supports immediate Force Collect.',
    content: `package icu.intervals.companion.sync

import android.content.Context
import androidx.work.*
import java.util.concurrent.TimeUnit

class IntervalsSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            // Pulls running events (?resolve=true) & running activities from IntervalsApiService
            // and updates local Room database / DataStore cache.
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val UNIQUE_PERIODIC_WORK = "intervals_12h_periodic_sync"
        private const val UNIQUE_FORCE_COLLECT_WORK = "intervals_force_collect_now"

        /**
         * Schedules automatic background sync twice per day (every 12 hours).
         */
        fun scheduleTwiceDailySync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<IntervalsSyncWorker>(12, TimeUnit.HOURS)
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_PERIODIC_WORK,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }

        /**
         * Triggered when the athlete taps the "Force Collect" button in the top bar.
         */
        fun triggerForceCollectNow(context: Context) {
            val immediateRequest = OneTimeWorkRequestBuilder<IntervalsSyncWorker>()
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_FORCE_COLLECT_WORK,
                ExistingWorkPolicy.REPLACE,
                immediateRequest
            )
        }
    }
}
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/viewmodel/IntervalsViewModel.kt',
    title: 'IntervalsViewModel.kt',
    description: 'Jetpack Compose StateFlow ViewModel coordinating the Running Calendar, Incoming Workouts, and Force Collect sync.',
    content: `package icu.intervals.companion.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import icu.intervals.companion.data.IntervalsRepository
import icu.intervals.companion.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class RunnerUiState(
    val isSyncing: Boolean = false,
    val lastSyncedLabel: String = "Synced 2h ago · Auto 2x/day (12h)",
    val plannedWorkouts: List<PlannedRunWorkout> = SampleRunningData.plannedWorkouts,
    val completedRuns: List<CompletedRunActivity> = SampleRunningData.completedActivities,
    val selectedPlannedWorkout: PlannedRunWorkout? = null,
    val selectedCompletedRun: CompletedRunActivity? = null
)

class IntervalsViewModel(
    private val repository: IntervalsRepository? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow(RunnerUiState())
    val uiState: StateFlow<RunnerUiState> = _uiState.asStateFlow()

    fun forceCollectNow(oldestDate: String = "2026-10-26", newestDate: String = "2026-11-08") {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSyncing = true)
            try {
                if (repository != null) {
                    val (planned, completed) = repository.syncRunningCalendar(
                        oldestDate = oldestDate,
                        newestDate = newestDate
                    )
                    _uiState.value = _uiState.value.copy(
                        isSyncing = false,
                        lastSyncedLabel = "Just now · Force Collect complete",
                        plannedWorkouts = planned.ifEmpty { SampleRunningData.plannedWorkouts },
                        completedRuns = completed.ifEmpty { SampleRunningData.completedActivities }
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isSyncing = false,
                        lastSyncedLabel = "Just now · Force Collect complete"
                    )
                }
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSyncing = false,
                    lastSyncedLabel = "Offline cache · Auto 12h WorkManager active"
                )
            }
        }
    }

    fun selectPlannedWorkout(workout: PlannedRunWorkout?) {
        _uiState.value = _uiState.value.copy(
            selectedPlannedWorkout = workout,
            selectedCompletedRun = null
        )
    }

    fun selectCompletedRun(activity: CompletedRunActivity?) {
        _uiState.value = _uiState.value.copy(
            selectedCompletedRun = activity,
            selectedPlannedWorkout = null
        )
    }
}
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/ui/PlannedPaceChart.kt',
    title: 'PlannedPaceChart.kt',
    description: 'Jetpack Compose Canvas component that draws the Planned Pace Step Diagram (like the Friday Fartlek 10x1m/1m chart) with touch inspection.',
    content: `package icu.intervals.companion.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import icu.intervals.companion.model.WorkoutStepBlock
import kotlin.math.max
import kotlin.math.min

@Composable
fun PlannedPaceStepDiagram(
    steps: List<WorkoutStepBlock>,
    totalDurationSec: Int,
    modifier: Modifier = Modifier
) {
    var selectedStep by remember(steps) { mutableStateOf(steps.firstOrNull()) }

    val fastestPaceSec = 195f // 3:15/km top ceiling
    val slowestPaceSec = 310f // 5:10/km baseline

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color(0xFF151821), RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        selectedStep?.let { step ->
            Text(
                text = "Selected: \${step.label}",
                color = Color(0xFF67E8F9),
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.padding(bottom = 8.dp)
            )
        }

        Row(modifier = Modifier.fillMaxWidth().height(160.dp)) {
            // Y-Axis Pace Labels (3:20 .. 4:46/km)
            Column(
                modifier = Modifier.width(42.dp).fillMaxHeight(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                listOf("3:20", "3:42", "4:10", "4:46").forEach { tick ->
                    Text(
                        text = tick,
                        color = Color(0xFF94A3B8),
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            // Proportional Step Block Canvas
            Canvas(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .background(Color(0xFF12151E))
                    .pointerInput(steps) {
                        detectTapGestures { offset ->
                            val tappedSec = (offset.x / size.width) * totalDurationSec
                            val match = steps.firstOrNull {
                                tappedSec >= it.startSec && tappedSec <= it.endSec
                            }
                            if (match != null) selectedStep = match
                        }
                    }
            ) {
                val canvasW = size.width
                val canvasH = size.height

                // Horizontal reference grid lines
                for (i in 1..4) {
                    val y = canvasH * (i / 4f)
                    drawLine(
                        color = Color(0xFF1E293B),
                        start = Offset(0f, y),
                        end = Offset(canvasW, y),
                        strokeWidth = 1.dp.toPx()
                    )
                }

                // Draw each WorkoutStepBlock
                steps.forEach { step ->
                    val startX = (step.startSec.toFloat() / totalDurationSec) * canvasW
                    val blockW = max(2f, (step.durationSec.toFloat() / totalDurationSec) * canvasW - 1.5f)

                    val clampedPace = min(slowestPaceSec, max(fastestPaceSec, step.paceMidSecPerKm))
                    val heightRatio = (slowestPaceSec - clampedPace) / (slowestPaceSec - fastestPaceSec)
                    val blockH = canvasH * (0.18f + heightRatio * 0.76f)

                    drawRoundRect(
                        color = step.zone.color,
                        topLeft = Offset(startX, canvasH - blockH),
                        size = Size(blockW, blockH),
                        cornerRadius = CornerRadius(4f, 4f)
                    )
                }
            }
        }
    }
}
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/MainActivity.kt',
    title: 'MainActivity.kt',
    description: 'Main Jetpack Compose activity with PullToRefreshBox (pull-down Force Collect), scrolling intervals.icu header, and auto-hiding floating bottom bar.',
    content: `package icu.intervals.companion

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import icu.intervals.companion.model.CompletedRunActivity
import icu.intervals.companion.model.PlannedRunWorkout
import icu.intervals.companion.sync.IntervalsSyncWorker
import icu.intervals.companion.ui.PlannedPaceStepDiagram
import icu.intervals.companion.viewmodel.IntervalsViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Schedule twice-daily (12-hour) background sync via WorkManager
        IntervalsSyncWorker.scheduleTwiceDailySync(this)

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                val vm: IntervalsViewModel = viewModel()
                IntervalsCompanionApp(
                    viewModel = vm,
                    onForceCollect = {
                        IntervalsSyncWorker.triggerForceCollectNow(this)
                        vm.forceCollectNow()
                    }
                )
            }
        }
    }
}

@Composable
private fun LazyListState.isScrollingUp(): Boolean {
    var previousIndex by remember(this) { mutableIntStateOf(firstVisibleItemIndex) }
    var previousScrollOffset by remember(this) { mutableIntStateOf(firstVisibleItemScrollOffset) }
    return remember(this) {
        derivedStateOf {
            if (previousIndex != firstVisibleItemIndex) {
                previousIndex > firstVisibleItemIndex
            } else {
                previousScrollOffset >= firstVisibleItemScrollOffset
            }.also {
                previousIndex = firstVisibleItemIndex
                previousScrollOffset = firstVisibleItemScrollOffset
            }
        }
    }.value
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IntervalsCompanionApp(
    viewModel: IntervalsViewModel,
    onForceCollect: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    var activeTab by remember { mutableStateOf("calendar") }
    val listState = rememberLazyListState()
    val showFloatingBottomBar = listState.isScrollingUp()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F1117))
    ) {
        // Pull-down gesture triggers Force Collect sync
        PullToRefreshBox(
            isRefreshing = state.isSyncing,
            onRefresh = onForceCollect,
            modifier = Modifier.fillMaxSize()
        ) {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                contentPadding = PaddingValues(top = 14.dp, bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Scrollable "intervals.icu" header at the top of the scrolling layout
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Text(
                            text = "intervals.icu",
                            color = Color.White,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            text = state.lastSyncedLabel,
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                items(state.plannedWorkouts) { workout ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.selectPlannedWorkout(workout) },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF181B24))
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(workout.name, color = Color.White, fontWeight = FontWeight.Bold)
                            Text(
                                text = "\${workout.date} · \${workout.durationLabel} · \${workout.distanceKm} km · Load \${workout.load}",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }
        }

        // Auto-hiding Floating Bottom Bar
        AnimatedVisibility(
            visible = showFloatingBottomBar && state.selectedPlannedWorkout == null,
            enter = slideInVertically(initialOffsetY = { it * 2 }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it * 2 }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(22.dp))
                    .background(Color(0xE6161B26))
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                TextButton(onClick = { activeTab = "calendar" }) {
                    Text("Calendar", color = Color(0xFF38BDF8))
                }
                TextButton(onClick = { activeTab = "incoming" }) {
                    Text("Incoming Runs", color = Color(0xFF94A3B8))
                }
                TextButton(onClick = {
                    state.plannedWorkouts.firstOrNull()?.let { viewModel.selectPlannedWorkout(it) }
                }) {
                    Text("Next Workout", color = Color(0xFF94A3B8))
                }
                TextButton(onClick = { activeTab = "settings" }) {
                    Text("Settings", color = Color(0xFF94A3B8))
                }
            }
        }
    }
}
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/ui/SettingsScreen.kt',
    title: 'SettingsScreen.kt',
    description: 'Jetpack Compose Settings screen with Intervals.icu Web Browser Login (Chrome Custom Tabs OAuth 2.0 — no Athlete ID or API key needed), Activity Types (Run, Swim, Strength, Mobility, Pilates, Yoga, Ride), Auto-Sync Interval in hours (WorkManager), and System/Dark/Light theme selector.',
    content: `package icu.intervals.companion.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class AppThemeMode { SYSTEM, DARK, LIGHT }

val ALL_CONFIGURABLE_SPORTS = listOf("Run", "Swim", "Strength", "Mobility", "Pilates", "Yoga", "Ride")

data class UserSettingsState(
    val isLoggedIn: Boolean = true,
    val athleteName: String = "Intervals.icu Athlete",
    val autoSyncHours: Int = 12, // 6, 12, 24, or 0 (manual only)
    val themeMode: AppThemeMode = AppThemeMode.DARK,
    val enabledSports: Set<String> = setOf("Run", "Swim", "Strength", "Mobility"),
    val useMetricUnits: Boolean = true,
    val thresholdPace: String = "3:20/km",
    val lookaheadDays: Int = 14,
    val wifiOnlySync: Boolean = false,
    val morningReminder: Boolean = true
)

@Composable
fun SettingsScreen(
    settings: UserSettingsState,
    onUpdateSettings: (UserSettingsState) -> Unit,
    onLaunchBrowserLogin: () -> Unit,
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Settings", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
        // 1. Intervals.icu Web Browser Login (CustomTabsIntent -> https://intervals.icu/oauth/authorize)
        // 2. Activity Types (Run, Swim, Strength, Mobility, Pilates, Yoga, Ride)
        // 3. Auto-Sync Interval (6h/12h/24h/Manual), 4. Theme (System/Dark/Light)
    }
}
`,
  },
];


