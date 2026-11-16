package com.vercel.jsonrender.material3

import com.vercel.jsonrender.compose.FoundationComponents
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotSame
import kotlin.test.assertSame

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
        val sharedLayouts = setOf("Column", "Row", "Stack")
        for ((name, foundation) in FoundationComponents) {
            val expressive = Material3ExpressiveComponents.getValue(name)
            if (name in sharedLayouts) assertSame(foundation, expressive, name)
            else assertNotSame(foundation, expressive, name)
        }
    }

    @Test
    fun ignoresMalformedOptionsAndKeepsTheFirstDuplicate() {
        val options = Json.parseToJsonElement(
            """[null, false, 7, {}, {"label":"Missing value"}, {"value":42},
                "first", {"value":"first","label":"Duplicate"},
                {"value":"second","label":"Second","disabled":true,"icon":"check"},
                {"value":"third","label":false,"disabled":"true"}, []]""",
        )
        assertEquals(
            listOf(
                Option("first", "first", false),
                Option("second", "Second", true, "check"),
                Option("third", "third", false),
            ),
            selectionOptions(options),
        )
    }

    @Test
    fun nonArrayOptionsProduceAnEmptyList() {
        assertEquals(emptyList(), selectionOptions(null))
        for (source in listOf("null", "false", "42", "\"option\"", "{}")) {
            assertEquals(emptyList(), selectionOptions(Json.parseToJsonElement(source)))
        }
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
