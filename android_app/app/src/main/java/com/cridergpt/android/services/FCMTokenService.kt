package com.cridergpt.android.services

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.cridergpt.android.data.SupabaseHttp
import com.cridergpt.android.utils.NotificationHelper
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class FCMTokenService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCMTokenService"
        private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

        /** Call after sign-in to ensure the current FCM token is on file. */
        fun syncCurrentToken() {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    Log.w(TAG, "Failed to fetch FCM token", task.exception)
                    return@addOnCompleteListener
                }
                task.result?.let { token -> uploadToken(token) }
            }
        }

        private fun uploadToken(token: String) {
            scope.launch {
                try {
                    val body = mapOf(
                        "platform" to "android",
                        "token" to token,
                        "device_label" to (android.os.Build.MODEL ?: "android"),
                    )
                    SupabaseHttp.invokeFunction("register-device-token", body)
                    Log.d(TAG, "FCM token registered with backend")
                } catch (t: Throwable) {
                    Log.e(TAG, "FCM token upload failed", t)
                }
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "Message received from: ${remoteMessage.from}")

        remoteMessage.data.isNotEmpty().let {
            val notificationType = remoteMessage.data["type"]
            val title = remoteMessage.data["title"] ?: "CriderGPT"
            val body = remoteMessage.data["body"] ?: ""
            handleDataMessage(notificationType, title, body, remoteMessage.data)
        }

        remoteMessage.notification?.let {
            val title = it.title ?: "CriderGPT"
            val body = it.body ?: ""
            NotificationHelper.sendSystemNotification(this, title, body)
        }
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "Refreshed token: $token")
        uploadToken(token)
    }

    private fun handleDataMessage(
        type: String?,
        title: String,
        body: String,
        data: Map<String, String>,
    ) {
        when (type) {
            "ai_chat" -> NotificationHelper.sendChatResultNotification(this, body)
            "system" -> NotificationHelper.sendSystemNotification(this, title, body)
            "message" -> NotificationHelper.sendMessageNotification(this, data["sender"] ?: "Someone", body)
            "subscription" -> NotificationHelper.sendSubscriptionNotification(this, title, body)
            "alert" -> NotificationHelper.sendAlertNotification(this, title, body)
            else -> NotificationHelper.sendSystemNotification(this, title, body)
        }
    }
}
