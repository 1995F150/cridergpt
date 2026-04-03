package com.cridergpt.android.utils

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.work.*
import java.util.concurrent.TimeUnit

class OfflineManager(private val context: Context) {

    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    fun isOnline(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    fun scheduleOfflineSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWork = PeriodicWorkRequestBuilder<OfflineSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "offline_sync",
            ExistingPeriodicWorkPolicy.REPLACE,
            syncWork
        )
    }

    fun syncNow() {
        val syncWork = OneTimeWorkRequestBuilder<OfflineSyncWorker>().build()
        WorkManager.getInstance(context).enqueue(syncWork)
    }
}