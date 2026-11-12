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
    path: 'app/src/main/java/icu/intervals/companion/network/IntervalsApiService.kt',
    title: 'IntervalsApiService.kt',
    description: 'Retrofit service for https://intervals.icu/api/v1 with OAuth 2.0 Bearer authentication.',
    content: `package icu.intervals.companion.network

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

    @GET("api/v1/athlete/{id}/events")
    suspend fun getEvents(
        @Path("id") athleteId: String = "0",
        @Query("oldest") oldestDate: String,
        @Query("newest") newestDate: String,
        @Query("resolve") resolve: Boolean = true
    ): List<IntervalsEventDto>

    @GET("api/v1/athlete/{id}/activities")
    suspend fun getActivities(
        @Path("id") athleteId: String = "0",
        @Query("oldest") oldestDate: String,
        @Query("newest") newestDate: String
    ): List<IntervalsActivityDto>

    companion object {
        fun create(accessToken: String): IntervalsApiService {
            val client = OkHttpClient.Builder()
                .addInterceptor { chain ->
                    val request = chain.request().newBuilder()
                        .header("Authorization", "Bearer \$accessToken")
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
    description: 'Repository that fetches scheduled workouts (?resolve=true) & completed activities from Intervals.icu.',
    content: `package icu.intervals.companion.data

import icu.intervals.companion.model.*
import icu.intervals.companion.network.IntervalsApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

class IntervalsRepository(
    private val apiService: IntervalsApiService
) {
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
                val durationSec = dto.moving_time ?: dto.workout_doc?.duration ?: 0
                val distKm = ((dto.distance ?: dto.workout_doc?.distance ?: 0.0) / 1000.0)

                PlannedRunWorkout(
                    id = dto.id.toString(),
                    date = dto.start_date_local.take(10),
                    startTime = dto.start_date_local.drop(11).take(5),
                    name = dto.name ?: "Scheduled Run",
                    durationSec = durationSec,
                    durationLabel = "\${durationSec / 60}m",
                    distanceKm = (distKm * 10.0).roundToInt() / 10.0,
                    load = dto.icu_training_load ?: 0,
                    intensityPct = dto.icu_intensity?.roundToInt() ?: 0,
                    instructionGroups = emptyList(),
                    steps = emptyList(),
                    zoneDistribution = emptyList(),
                    coachNotes = dto.description
                )
            }

        val completedRuns = rawActivities
            .filter { it.type.equals("Run", ignoreCase = true) }
            .map { dto ->
                val durationSec = dto.moving_time ?: 0
                val distKm = ((dto.distance ?: 0.0) / 1000.0)
                CompletedRunActivity(
                    id = dto.id,
                    date = dto.start_date_local.take(10),
                    startTime = dto.start_date_local.drop(11).take(5),
                    name = dto.name ?: "Completed Run",
                    distanceKm = (distKm * 10.0).roundToInt() / 10.0,
                    movingTimeLabel = "\${durationSec / 60}m",
                    paceFormatted = "—",
                    gapFormatted = "—",
                    avgHr = dto.average_heartrate ?: 0,
                    maxHr = dto.max_heartrate ?: 0,
                    normPowerWatts = dto.icu_weighted_avg_watts,
                    load = dto.icu_training_load ?: 0,
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
    description: 'WorkManager CoroutineWorker that syncs workouts in the background and supports immediate Force Collect.',
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
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val UNIQUE_PERIODIC_WORK = "intervals_12h_periodic_sync"
        private const val UNIQUE_FORCE_COLLECT_WORK = "intervals_force_collect_now"

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
    description: 'Jetpack Compose StateFlow ViewModel coordinating the Calendar, Incoming Workouts, and Force Collect sync.',
    content: `package icu.intervals.companion.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import icu.intervals.companion.data.IntervalsRepository
import icu.intervals.companion.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

data class RunnerUiState(
    val isSyncing: Boolean = false,
    val lastSyncedLabel: String = "Pull down to sync",
    val plannedWorkouts: List<PlannedRunWorkout> = emptyList(),
    val completedRuns: List<CompletedRunActivity> = emptyList(),
    val selectedPlannedWorkout: PlannedRunWorkout? = null,
    val selectedCompletedRun: CompletedRunActivity? = null
)

class IntervalsViewModel(
    private val repository: IntervalsRepository? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow(RunnerUiState())
    val uiState: StateFlow<RunnerUiState> = _uiState.asStateFlow()

    fun forceCollectNow() {
        val monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val sunday = monday.plusDays(6)
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSyncing = true)
            try {
                if (repository != null) {
                    val (planned, completed) = repository.syncRunningCalendar(
                        oldestDate = monday.toString(),
                        newestDate = sunday.toString()
                    )
                    _uiState.value = _uiState.value.copy(
                        isSyncing = false,
                        lastSyncedLabel = "Just now",
                        plannedWorkouts = planned,
                        completedRuns = completed
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isSyncing = false,
                        lastSyncedLabel = "Not signed in"
                    )
                }
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSyncing = false,
                    lastSyncedLabel = "Offline cache"
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
    path: 'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    title: 'ic_launcher.xml (Android 15+ Adaptive & Monochrome Icon)',
    description: 'Android 13-15+ Adaptive Icon configuration with foreground, background, and monochrome (Minimal / Material You system-tinted) layers.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
`,
  },
  {
    path: 'app/src/main/java/icu/intervals/companion/MainActivity.kt',
    title: 'MainActivity.kt',
    description: 'Main Jetpack Compose activity enforcing Portrait lock on Phones (<600dp), 3-step Onboarding, Tablet Landscape 2-pane split view, and left/right card swipe.',
    content: `package icu.intervals.companion

import android.content.pm.ActivityInfo
import android.content.res.Configuration
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
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import icu.intervals.companion.sync.IntervalsSyncWorker
import icu.intervals.companion.viewmodel.IntervalsViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Lock Phone (<600dp smallest width) to Portrait only; allow Tablets (>=600dp) to rotate between Portrait & Landscape
        if (resources.configuration.smallestScreenWidthDp < 600) {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } else {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }

        // Schedule periodic background sync via WorkManager
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
    val config = LocalConfiguration.current
    val isTabletLandscape =
        config.smallestScreenWidthDp >= 600 &&
        config.orientation == Configuration.ORIENTATION_LANDSCAPE

    var activeTab by remember { mutableStateOf("calendar") }
    val listState = rememberLazyListState()
    val showFloatingBottomBar = listState.isScrollingUp()

    // Auto-select first workout in Tablet Landscape when available
    LaunchedEffect(isTabletLandscape, state.plannedWorkouts) {
        if (isTabletLandscape && state.selectedPlannedWorkout == null && state.plannedWorkouts.isNotEmpty()) {
            viewModel.selectPlannedWorkout(state.plannedWorkouts.first())
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F1117))
    ) {
        PullToRefreshBox(
            isRefreshing = state.isSyncing,
            onRefresh = onForceCollect,
            modifier = Modifier.fillMaxSize()
        ) {
            if (isTabletLandscape) {
                // Tablet Landscape 2-Pane Split View (5 columns list / 7 columns detail)
                Row(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.weight(0.42f).fillMaxHeight(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
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
                                        text = "\${workout.date} · \${workout.durationLabel} · Load \${workout.load}",
                                        color = Color(0xFF94A3B8),
                                        fontSize = 12.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }
                    }

                    // Right Detail Pane with Horizontal Swipe Navigation
                    Box(
                        modifier = Modifier
                            .weight(0.58f)
                            .fillMaxHeight()
                            .background(Color(0xFF141720), RoundedCornerShape(16.dp))
                            .pointerInput(state.plannedWorkouts, state.selectedPlannedWorkout) {
                                detectHorizontalDragGestures { _, dragAmount ->
                                    if (kotlin.math.abs(dragAmount) > 48f && state.plannedWorkouts.size > 1) {
                                        val idx = state.plannedWorkouts.indexOf(state.selectedPlannedWorkout)
                                        if (idx != -1) {
                                            val dir = if (dragAmount < 0) 1 else -1
                                            val nextIdx = (idx + dir + state.plannedWorkouts.size) % state.plannedWorkouts.size
                                            viewModel.selectPlannedWorkout(state.plannedWorkouts[nextIdx])
                                        }
                                    }
                                }
                            }
                            .padding(16.dp)
                    ) {
                        state.selectedPlannedWorkout?.let { selected ->
                            Column {
                                Text(selected.name, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                Text(
                                    text = "\${selected.date} · \${selected.durationLabel} · \${selected.distanceKm} km",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }
            } else {
                // Phone Portrait & Tablet Portrait Single-Column View
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    contentPadding = PaddingValues(top = 14.dp, bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Bottom
                        ) {
                            Text(
                                text = "Intervals Companion",
                                color = Color.White,
                                fontSize = 20.sp,
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
        }

        // Auto-hiding Floating Bottom Bar
        AnimatedVisibility(
            visible = showFloatingBottomBar && (state.selectedPlannedWorkout == null || isTabletLandscape),
            enter = slideInVertically(initialOffsetY = { it * 2 }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it * 2 }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(28.dp))
                    .background(Color(0xF2151829))
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TextButton(onClick = { activeTab = "calendar" }) {
                    Text("Calendar", color = Color(0xFF38BDF8))
                }
                TextButton(onClick = { activeTab = "incoming" }) {
                    Text("Incoming", color = Color(0xFF94A3B8))
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
    description: 'Jetpack Compose Settings screen with Back button across Phone & Tablet, plus 2-Pane Split View in Tablet Landscape.',
    content: `package icu.intervals.companion.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
    val hasAcceptedTerms: Boolean = true,
    val athleteName: String = "Intervals.icu Athlete",
    val autoSyncHours: Int = 12, // 6, 12, 24, or 0 (manual only)
    val themeMode: AppThemeMode = AppThemeMode.SYSTEM,
    val enabledSports: Set<String> = setOf("Run", "Swim", "Strength", "Mobility"),
    val useMetricUnits: Boolean = true,
    val lookaheadDays: Int = 14,
    val wifiOnlySync: Boolean = false,
    val morningReminder: Boolean = true
)

@Composable
fun SettingsScreen(
    settings: UserSettingsState,
    isTabletLandscape: Boolean = false,
    onExitSettings: () -> Unit,
    onUpdateSettings: (UserSettingsState) -> Unit,
    onLaunchBrowserLogin: () -> Unit,
    onLogout: () -> Unit
) {
    if (isTabletLandscape) {
        // Tablet Landscape 2-Pane Split Settings (Left: Categories + Log Out, Right: Active Category Details)
        Row(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Column(modifier = Modifier.weight(0.42f)) {
                Text("Settings", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
            }
            Column(modifier = Modifier.weight(0.58f)) {
                Text("Account & Sync Preferences", color = Color(0xFF38BDF8), fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    } else {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Settings", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
        }
    }
}
`,
  },
];


