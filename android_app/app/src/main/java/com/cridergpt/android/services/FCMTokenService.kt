package com.cridergpt.android.services

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.cridergpt.android.utils.NotificationHelper
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class FCMTokenService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCMTokenService"
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "Message received from: ${remoteMessage.from}")

        // Handle data messages
        remoteMessage.data.isNotEmpty().let {
            Log.d(TAG, "Message data payload: " + remoteMessage.data)
            val notificationType = remoteMessage.data["type"]
            val title = remoteMessage.data["title"] ?: "CriderGPT"
            val body = remoteMessage.data["body"] ?: ""

            handleDataMessage(notificationType, title, body, remoteMessage.data)
        }

        // Handle notification messages
        remoteMessage.notification?.let {
            Log.d(TAG, "Message Notification Body: ${it.body}")
            val title = it.title ?: "CriderGPT"
            val body = it.body ?: ""
            handleNotificationMessage(title, body)
        }
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "Refreshed token: $token")
        
        // Send token to backend to store in database
        sendTokenToServer(token)
    }

    private fun handleDataMessage(
        type: String?,
        title: String,
        body: String,
        data: Map<String, String>
    ) {
        when (type) {
            "ai_chat" -> {
                // AI chat result notification
                NotificationHelper.sendChatResultNotification(this, body)
            }
            "system" -> {
                // System notification
                NotificationHelper.sendSystemNotification(this, title, body)
            }
            "message" -> {
                // User message notification
                val senderName = data["sender"] ?: "Someone"
                NotificationHelper.sendMessageNotification(this, senderName, body)
            }
            "subscription" -> {
                // Subscription/billing notification
                NotificationHelper.sendSubscriptionNotification(this, title, body)
            }
            "alert" -> {
                // General alert notification
                NotificationHelper.sendAlertNotification(this, title, body)
            }
            else -> {
                // Default to system notification
                NotificationHelper.sendSystemNotification(this, title, body)
            }
        }
    }

    private fun handleNotificationMessage(title: String, body: String) {
        // If the message also has a data payload, it will be handled separately
        // This handles notification-only messages
        NotificationHelper.sendSystemNotification(this, title, body)
    }

    private fun sendTokenToServer(token: String) {
        // This should be implemented to send the token to your backend
        // via the Supabase edge function
        try {
            // Example implementation:
            // val response = supabase.functions.invoke("register-fcm-token", mapOf("token" to token))
            Log.d(TAG, "Token would be sent to server: $token")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending token to server", e)
        }
    }
}
