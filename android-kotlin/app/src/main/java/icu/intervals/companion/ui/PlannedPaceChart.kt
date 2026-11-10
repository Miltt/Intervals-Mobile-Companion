package icu.intervals.companion.ui

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
import kotlin.math.max
import kotlin.math.min

enum class TrainingZone(val color: Color) {
    Z1(Color(0xFF0D9488)),
    Z2(Color(0xFF16A34A)),
    Z3(Color(0xFFEAB308)),
    Z4(Color(0xFFEA580C)),
    Z5(Color(0xFFEF4444))
}

data class WorkoutStepBlock(
    val id: String,
    val label: String,
    val durationSec: Int,
    val startSec: Int,
    val endSec: Int,
    val distanceKm: Double,
    val paceMidSecPerKm: Float,
    val zone: TrainingZone
)

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
                text = "Selected: ${step.label}",
                color = Color(0xFF67E8F9),
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.padding(bottom = 8.dp)
            )
        }

        Row(modifier = Modifier.fillMaxWidth().height(160.dp)) {
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

                for (i in 1..4) {
                    val y = canvasH * (i / 4f)
                    drawLine(
                        color = Color(0xFF1E293B),
                        start = Offset(0f, y),
                        end = Offset(canvasW, y),
                        strokeWidth = 1.dp.toPx()
                    )
                }

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
