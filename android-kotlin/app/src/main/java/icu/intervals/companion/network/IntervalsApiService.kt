package icu.intervals.companion.network

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
