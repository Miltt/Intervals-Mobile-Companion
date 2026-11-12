package icu.intervals.companion

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
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
import icu.intervals.companion.ui.SettingsScreen
import icu.intervals.companion.ui.UserSettingsState
import icu.intervals.companion.viewmodel.IntervalsViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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
    var settings by remember { mutableStateOf(UserSettingsState()) }
    var activeTab by remember { mutableStateOf("calendar") }
    var statusFilter by remember { mutableStateOf("all") } // "all", "scheduled", "completed"
    var activeFilterSports by remember(settings.enabledSports) {
        mutableStateOf(settings.enabledSports)
    }
    var showFilterSheet by remember { mutableStateOf(false) }

    val listState = rememberLazyListState()
    val showFloatingBottomBar = listState.isScrollingUp()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F1117))
    ) {
        when {
            activeTab == "settings" -> {
                SettingsScreen(
                    settings = settings,
                    onUpdateSettings = { settings = it },
                    onBack = { activeTab = "calendar" }
                )
            }
            state.selectedPlannedWorkout != null -> {
                PlannedWorkoutDetailScreen(
                    workout = state.selectedPlannedWorkout!!,
                    onBack = { viewModel.selectPlannedWorkout(null) }
                )
            }
            else -> {
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
                        contentPadding = PaddingValues(top = 14.dp, bottom = 104.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Scrollable "intervals.icu" header + Icon-only Settings button in top-right corner
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Intervals Companion",
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

                                // Icon-only Settings button in top right corner
                                IconButton(
                                    onClick = { activeTab = "settings" },
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF161923))
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Settings,
                                        contentDescription = "Settings",
                                        tint = Color.White
                                    )
                                }
                            }
                        }

                        if (state.plannedWorkouts.isEmpty() && state.completedRuns.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 32.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "No Data",
                                        color = Color(0xFF64748B),
                                        fontSize = 14.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        } else if (statusFilter != "completed") {
                            items(state.plannedWorkouts) { workout ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { viewModel.selectPlannedWorkout(workout) },
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF181B24))
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text(
                                            text = workout.name,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "${workout.date} · ${workout.durationLabel} · ${workout.distanceKm} km · Load ${workout.load}",
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
            }
        }

        // Google Photos-style Floating Bottom Capsule (Calendar & Incoming) + Detached Circular Filter Button
        AnimatedVisibility(
            visible = showFloatingBottomBar && activeTab != "settings" && state.selectedPlannedWorkout == null,
            enter = slideInVertically(initialOffsetY = { it * 2 }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it * 2 }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 16.dp, vertical = 16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Left/Center Floating Pill Capsule (Calendar & Incoming only)
                Row(
                    modifier = Modifier
                        .height(56.dp)
                        .clip(RoundedCornerShape(50))
                        .background(Color(0xF2151829))
                        .padding(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(50))
                            .background(if (activeTab == "calendar") Color(0xFF3B388F) else Color.Transparent)
                            .clickable { activeTab = "calendar" }
                            .padding(horizontal = 20.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Calendar",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(50))
                            .background(if (activeTab == "incoming") Color(0xFF3B388F) else Color.Transparent)
                            .clickable { activeTab = "incoming" }
                            .padding(horizontal = 20.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Incoming",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                // Right Detached Circular Filter Button (Google Photos Search Button style)
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(if (showFilterSheet) Color(0xFF3B388F) else Color(0xF2151829))
                        .clickable { showFilterSheet = !showFilterSheet },
                    contentAlignment = Alignment.Center
                ) {
                    Text("Filter", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Filter Modal Bottom Sheet (Status: All/Incoming/Done + Workout Types enabled in Settings)
        if (showFilterSheet) {
            ModalBottomSheet(
                onDismissRequest = { showFilterSheet = false },
                containerColor = Color(0xFF151829)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("WORKOUT STATUS", color = Color(0xFF94A3B8), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("all" to "All", "scheduled" to "Incoming", "completed" to "Done").forEach { (id, label) ->
                            FilterChip(
                                selected = statusFilter == id,
                                onClick = { statusFilter = id },
                                label = { Text(label) }
                            )
                        }
                    }

                    Text("WORKOUT TYPES (ENABLED IN SETTINGS)", color = Color(0xFF94A3B8), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                    // Only show workout types that are checked in Settings!
                    settings.enabledSports.forEach { sport ->
                        val checked = activeFilterSports.contains(sport)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(sport, color = Color.White)
                            Checkbox(
                                checked = checked,
                                onCheckedChange = { isChecked ->
                                    activeFilterSports = if (isChecked) {
                                        activeFilterSports + sport
                                    } else if (activeFilterSports.size > 1) {
                                        activeFilterSports - sport
                                    } else {
                                        activeFilterSports
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PlannedWorkoutDetailScreen(
    workout: PlannedRunWorkout,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(workout.name, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text(
                    text = "${workout.date} · ${workout.durationLabel} · ${workout.distanceKm} km · Load ${workout.load}",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
            TextButton(onClick = onBack) {
                Text("BACK", color = Color(0xFF38BDF8))
            }
        }

        PlannedPaceStepDiagram(
            steps = workout.steps,
            totalDurationSec = workout.durationSec
        )
    }
}
