package com.cridergpt.android.utils

import android.content.Intent
import android.net.Uri

/**
 * Parses universal-link and custom-scheme URLs into in-app destinations.
 * Mirrors iOS DeepLink.swift.
 *
 * Supported:
 *   cridergpt://tag/CriderGPT-XXXXXX        → Smart ID, auto-lookup
 *   cridergpt://chat | livestock | events | profile | smart-id
 *   https://cridergpt.com/tag/CriderGPT-XXXXXX
 *   https://cridergpt.com/<section>
 */
sealed class DeepLink {
    data class Tag(val tagId: String) : DeepLink()
    object Chat : DeepLink()
    object SmartId : DeepLink()
    object Livestock : DeepLink()
    object Events : DeepLink()
    object Profile : DeepLink()

    companion object {
        fun fromIntent(intent: Intent?): DeepLink? {
            if (intent?.action != Intent.ACTION_VIEW) return null
            val uri = intent.data ?: return null
            return fromUri(uri)
        }

        fun fromUri(uri: Uri): DeepLink? {
            val segments = uri.pathSegments.orEmpty()
            // /tag/<id>
            if (segments.firstOrNull()?.lowercase() == "tag" && segments.size >= 2) {
                val id = com.cridergpt.android.data.TagIdParser.normalize(segments[1])
                if (id != null) return Tag(id)
            }
            val section = uri.host?.lowercase() ?: segments.firstOrNull()?.lowercase()
            return when (section) {
                "chat" -> Chat
                "smart-id", "smartid" -> SmartId
                "livestock" -> Livestock
                "events", "calendar" -> Events
                "profile" -> Profile
                else -> null
            }
        }
    }
}
