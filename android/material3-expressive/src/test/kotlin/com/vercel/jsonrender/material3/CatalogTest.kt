package com.vercel.jsonrender.material3

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlin.test.Test
import kotlin.test.assertEquals

class CatalogTest {
    @Test
    fun exposesTheDocumentedCatalog() {
        val expected = """
            Column Row Stack Grid Text Heading Card Surface Metric Badge Alert List ListItem
            BarChart LineChart Separator Divider Spacer Image Button IconButton FloatingActionButton
            ToggleButton Switch Toggle Checkbox Input Textarea Select RadioGroup Slider
            SegmentedButtonGroup SegmentedPicker Tabs NavigationBar TopAppBar FloatingToolbar Toolbar
            Menu Dialog LoadingIndicator Progress ProgressBar
        """.trimIndent().split(Regex("\\s+")).toSet()
        assertEquals(expected, Material3ExpressiveComponents.keys)
    }

    @Test
    fun acceptsPortableChartRowsAndFiltersNonNumericValues() {
        val sample = Json.parseToJsonElement(
            """
            [{"day":"Mon","count":-4},{"day":"Tue","count":"7.5"},{"count":0},
             {"day":"Wed","count":"Infinity"},{"day":"Thu","count":true}]
            """.trimIndent(),
        ).jsonArray

        assertEquals(
            listOf(ChartPoint("Mon", -4f), ChartPoint("Tue", 7.5f), ChartPoint("3", 0f)),
            chartPoints(sample, "day", "count"),
        )
    }
}
