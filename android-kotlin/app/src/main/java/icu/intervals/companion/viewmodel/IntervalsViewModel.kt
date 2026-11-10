package icu.intervals.companion.viewmodel

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
