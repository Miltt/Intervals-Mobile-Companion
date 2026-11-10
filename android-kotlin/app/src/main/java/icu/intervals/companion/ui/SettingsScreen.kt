package icu.intervals.companion.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

enum class AppThemeMode { SYSTEM, DARK, LIGHT }

val ALL_CONFIGURABLE_SPORTS = listOf("Run", "Swim", "Strength", "Mobility", "Pilates", "Yoga", "Ride")

data class UserSettingsState(
    val isLoggedIn: Boolean = true,
    val athleteName: String = "Intervals.icu Athlete",
    val autoSyncHours: Int = 12,
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
        Text(
            text = "Settings",
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.ExtraBold
        )

        // 1. Intervals.icu Account — Web Browser Login (Chrome Custom Tabs OAuth 2.0)
        // No manual Athlete ID or API Key required!
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF161923))
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "INTERVALS.ICU ACCOUNT (WEB LOGIN)",
                    color = Color(0xFF38BDF8),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
                if (settings.isLoggedIn) {
                    Text(
                        text = "Signed in as ${settings.athleteName}",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
                        Text("Log Out")
                    }
                } else {
                    Button(
                        onClick = onLaunchBrowserLogin,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Log in with Intervals.icu (Web Browser)")
                    }
                }
            }
        }

        // 2. Activity Types to Upload & Show in Calendar
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF161923))
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "ACTIVITY TYPES TO UPLOAD & DISPLAY",
                    color = Color(0xFF38BDF8),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
                ALL_CONFIGURABLE_SPORTS.forEach { sport ->
                    val isChecked = settings.enabledSports.contains(sport)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(sport, color = Color.White, fontSize = 14.sp)
                        Checkbox(
                            checked = isChecked,
                            onCheckedChange = { checked ->
                                val next = if (checked) {
                                    settings.enabledSports + sport
                                } else if (settings.enabledSports.size > 1) {
                                    settings.enabledSports - sport
                                } else {
                                    settings.enabledSports
                                }
                                onUpdateSettings(settings.copy(enabledSports = next))
                            }
                        )
                    }
                }
            }
        }

        // 3. Auto-Sync Interval in Hours
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF161923))
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "AUTO-SYNC INTERVAL (HOURS)",
                    color = Color(0xFF38BDF8),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(6, 12, 24, 0).forEach { hours ->
                        FilterChip(
                            selected = settings.autoSyncHours == hours,
                            onClick = { onUpdateSettings(settings.copy(autoSyncHours = hours)) },
                            label = { Text(if (hours == 0) "Manual" else "${hours}h") }
                        )
                    }
                }
            }
        }

        // 4. Appearance (System / Dark / Light)
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF161923))
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "APPEARANCE (SYSTEM / DARK / LIGHT)",
                    color = Color(0xFF38BDF8),
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AppThemeMode.entries.forEach { mode ->
                        FilterChip(
                            selected = settings.themeMode == mode,
                            onClick = { onUpdateSettings(settings.copy(themeMode = mode)) },
                            label = { Text(mode.name) }
                        )
                    }
                }
            }
        }
    }
}
