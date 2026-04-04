package com.cridergpt.android.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat

object NotificationHelper {
    // Notification Channel IDs
    private const val CHANNEL_AI_CHAT = "chat_ai_results"
    private const val CHANNEL_SYSTEM = "system_notifications"
    private const val CHANNEL_MESSAGES = "user_messages"
    private const val CHANNEL_SUBSCRIPTIONS = "subscription_alerts"
    private const val CHANNEL_ALERTS = "general_alerts"

    enum class NotificationType {
        AI_CHAT, SYSTEM, MESSAGE, SUBSCRIPTION, ALERT
    }

    fun createAllNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // AI Chat Results Channel
        val aiChatChannel = NotificationChannel(
            CHANNEL_AI_CHAT,
            "AI Chat Results",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Notifications when AI chat results are available"
        }
        manager.createNotificationChannel(aiChatChannel)

        // System Notifications Channel
        val systemChannel = NotificationChannel(
            CHANNEL_SYSTEM,
            "System Notifications",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Important system announcements and updates"
        }
        manager.createNotificationChannel(systemChannel)

        // User Messages Channel
        val messagesChannel = NotificationChannel(
            CHANNEL_MESSAGES,
            "Messages",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Messages from other users and support"
        }
        manager.createNotificationChannel(messagesChannel)

        // Subscription Alerts Channel
        val subscriptionChannel = NotificationChannel(
            CHANNEL_SUBSCRIPTIONS,
            "Subscription Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Billing and subscription notifications"
        }
        manager.createNotificationChannel(subscriptionChannel)

        // General Alerts Channel
        val alertsChannel = NotificationChannel(
            CHANNEL_ALERTS,
            "General Alerts",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "General alerts and reminders"
        }
        manager.createNotificationChannel(alertsChannel)
    }

    fun sendNotification(
        context: Context,
        type: NotificationType,
        title: String,
        message: String,
        notificationId: Int = System.currentTimeMillis().toInt()
    ) {
        createAllNotificationChannels(context)

        val (channelId, importance) = when (type) {
            NotificationType.AI_CHAT -> CHANNEL_AI_CHAT to "AI Result"
            NotificationType.SYSTEM -> CHANNEL_SYSTEM to "System"
            NotificationType.MESSAGE -> CHANNEL_MESSAGES to "Message"
            NotificationType.SUBSCRIPTION -> CHANNEL_SUBSCRIPTIONS to "Subscription"
            NotificationType.ALERT -> CHANNEL_ALERTS to "Alert"
        }

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(com.cridergpt.android.R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setAutoCancel(true)
            .setPriority(
                when (type) {
                    NotificationType.SYSTEM, NotificationType.SUBSCRIPTION -> NotificationCompat.PRIORITY_HIGH
                    NotificationType.AI_CHAT, NotificationType.MESSAGE -> NotificationCompat.PRIORITY_DEFAULT
                    NotificationType.ALERT -> NotificationCompat.PRIORITY_LOW
                }
            )
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(notificationId, notification)
    }

    // Convenience methods for specific notification types
    fun sendChatResultNotification(context: Context, message: String) {
        sendNotification(context, NotificationType.AI_CHAT, "AI Result Ready", message)
    }

    fun sendSystemNotification(context: Context, title: String, message: String) {
        sendNotification(context, NotificationType.SYSTEM, title, message)
    }

    fun sendMessageNotification(context: Context, senderName: String, message: String) {
        sendNotification(context, NotificationType.MESSAGE, "Message from $senderName", message)
    }

    fun sendSubscriptionNotification(context: Context, title: String, message: String) {
        sendNotification(context, NotificationType.SUBSCRIPTION, title, message)
    }

    fun sendAlertNotification(context: Context, title: String, message: String) {
        sendNotification(context, NotificationType.ALERT, title, message)
    }
}
