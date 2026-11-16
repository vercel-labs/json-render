package com.vercel.jsonrender.compose

import kotlinx.serialization.json.JsonElement

/** Records initial values without emitting actions and forgets unmounted watches. */
internal class WatchTracker(private val limit: Int = 64) {
    init {
        require(limit >= 0) { "Watch cascade limit cannot be negative" }
    }

    private var remaining = limit

    fun resetCascade() {
        remaining = limit
    }

    fun allowDispatch(): Boolean {
        if (remaining == 0) return false
        remaining--
        return true
    }

    private data class Identity(val element: String, val itemPath: String?, val path: String)

    private var previous = mapOf<Identity, JsonElement?>()

    fun changes(records: List<WatchRecord>): List<WatchRecord> {
        val next = mutableMapOf<Identity, JsonElement?>()
        val changes = records.filter { record ->
            val id = Identity(record.element, record.scope?.path, record.path)
            if (id in next) return@filter false
            next[id] = record.value
            previous.containsKey(id) && previous[id] != record.value
        }
        previous = next
        if (changes.isEmpty()) resetCascade()
        return changes
    }
}
