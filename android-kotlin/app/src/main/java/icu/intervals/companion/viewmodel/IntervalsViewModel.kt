package icu.intervals.companion.viewmodel

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
    val weekOffset: Int = 0,
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

    fun currentWeekRange(weekOffset: Int = _uiState.value.weekOffset): Pair<String, String> {
        val monday = LocalDate.now()
            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            .plusWeeks(weekOffset.toLong())
        val sunday = monday.plusDays(6)
        return monday.toString() to sunday.toString()
    }

    fun shiftWeek(delta: Int) {
        val nextOffset = _uiState.value.weekOffset + delta
        _uiState.value = _uiState.value.copy(weekOffset = nextOffset)
    }

    fun forceCollectNow(
        oldestDate: String = currentWeekRange().first,
        newestDate: String = currentWeekRange().second
    ) {
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
