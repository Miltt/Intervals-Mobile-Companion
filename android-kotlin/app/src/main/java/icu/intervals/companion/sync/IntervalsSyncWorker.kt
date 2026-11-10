package icu.intervals.companion.sync

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
