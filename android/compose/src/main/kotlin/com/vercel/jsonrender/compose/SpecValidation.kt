package com.vercel.jsonrender.compose

import kotlinx.serialization.SerializationException

data class SpecIssue(val path: String, val message: String)

data class SpecValidationResult(val spec: Spec?, val issues: List<SpecIssue>) {
    val valid: Boolean get() = issues.isEmpty()
}

/** Checks a complete spec before rendering, optionally checking its registered element types. */
fun validateSpec(source: String, componentTypes: Set<String>? = null): SpecValidationResult {
    val spec = try {
        Spec.decode(source)
    } catch (_: SerializationException) {
        return SpecValidationResult(null, listOf(SpecIssue("", "Invalid spec JSON or field type")))
    } catch (_: IllegalArgumentException) {
        return SpecValidationResult(null, listOf(SpecIssue("", "Invalid JSON structure or spec exceeds size and nesting limits")))
    }
    return SpecValidationResult(spec, spec.validate(componentTypes))
}

/** Checks element references and cycles in a complete spec. */
fun Spec.validate(componentTypes: Set<String>? = null): List<SpecIssue> {
    val issues = mutableListOf<SpecIssue>()
    if (root.isEmpty() || root !in elements) issues.add(SpecIssue("/root", "Root must name an element"))
    if (elements.size > 10_000) return issues + SpecIssue("/elements", "Too many elements")
    val outgoing = elements.mapValues { (id, element) ->
        val path = "/elements".childPointer(id)
        if (element.type.isEmpty() || componentTypes != null && element.type !in componentTypes) {
            issues.add(SpecIssue("$path/type", "Missing or unregistered component type"))
        }
        val references = buildList {
            element.children.forEachIndexed { index, child -> add("$path/children/$index" to child) }
            for ((slot, ids) in element.slots) {
                val slotPath = "$path/slots".childPointer(slot)
                ids.forEachIndexed { index, child -> add("$slotPath/$index" to child) }
            }
        }
        for ((reference, target) in references) {
            if (target !in elements) issues.add(SpecIssue(reference, "Unknown element reference"))
        }
        references
    }
    val ancestors = mutableSetOf<String>()
    val longest = mutableMapOf<String, Int>()
    fun walk(id: String, depth: Int): Int {
        if (depth > 64) return 65
        longest[id]?.let { return it }
        if (!ancestors.add(id)) return 65
        var height = 1
        for ((path, child) in outgoing[id].orEmpty()) {
            if (child !in elements) continue
            if (child in ancestors) issues.add(SpecIssue(path, "Cyclic element reference"))
            else height = maxOf(height, 1 + walk(child, depth + 1))
        }
        ancestors.remove(id)
        longest[id] = height
        return height
    }
    if (elements.keys.any { walk(it, 1) > 64 }) {
        issues.add(SpecIssue("/elements", "Element nesting exceeds 64 levels"))
    }
    return issues
}
