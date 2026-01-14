import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
}

export interface NotificationSettings {
  calendarEvents: boolean;
  systemUpdates: boolean;
  projectReminders: boolean;
  generalNotifications: boolean;
  imageGeneration: boolean;
  aiResponses: boolean;
  taskReminders: boolean;
  chapterUpdates: boolean;
}

export function getNotificationSettings(): NotificationSettings {
  const saved = localStorage.getItem('notification-settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }
  
  return {
    calendarEvents: true,
    systemUpdates: true,
    projectReminders: true,
    generalNotifications: true,
    imageGeneration: true,
    aiResponses: true,
    taskReminders: true,
    chapterUpdates: true,
  };
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  // Check if notifications are supported
  useEffect(() => {
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Browser notifications are not supported on this device",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive browser notifications from CriderGPT",
        });
        return true;
      } else if (result === 'denied') {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings to receive alerts",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to request notification permission",
        variant: "destructive",
      });
      return false;
    }
    return false;
  }, [isSupported, toast]);

  // Send a browser notification
  const sendNotification = useCallback((options: BrowserNotificationOptions) => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return null;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.png',
        badge: options.badge || '/favicon.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data,
      });

      // Handle click to focus app
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close notification after 5 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  // Send a test notification
  const sendTestNotification = useCallback(() => {
    return sendNotification({
      title: 'CriderGPT Notifications Active',
      body: 'You\'ll now receive important updates and reminders!',
      icon: '/favicon.png',
      tag: 'test-notification',
    });
  }, [sendNotification]);

  // Send calendar event notification
  const sendEventNotification = useCallback((event: {
    title: string;
    category: string;
    startTime: string;
  }) => {
    const settings = getNotificationSettings();
    if (!settings.calendarEvents) return null;

    const categoryEmojis: Record<string, string> = {
      FFA: '🌾',
      School: '🎓',
      Personal: '👤',
      Business: '💼',
    };

    return sendNotification({
      title: `${categoryEmojis[event.category] || '📅'} Event Starting Soon`,
      body: `${event.title} starts at ${new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      icon: '/favicon.png',
      tag: `event-${event.title}`,
      requireInteraction: true,
      data: { type: 'calendar-event', event },
    });
  }, [sendNotification]);

  // NEW: Image generation complete notification
  const sendImageNotification = useCallback((prompt: string, imageUrl?: string) => {
    const settings = getNotificationSettings();
    if (!settings.imageGeneration) return null;

    return sendNotification({
      title: '🎨 Image Generated!',
      body: `Your image "${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}" is ready`,
      icon: '/favicon.png',
      tag: 'image-generation',
      requireInteraction: true,
      data: { type: 'image-generated', imageUrl },
    });
  }, [sendNotification]);

  // NEW: AI response notification (when user leaves chat)
  const sendAIResponseNotification = useCallback((preview: string) => {
    const settings = getNotificationSettings();
    if (!settings.aiResponses) return null;

    return sendNotification({
      title: '💬 CriderGPT Replied',
      body: preview.substring(0, 80) + (preview.length > 80 ? '...' : ''),
      icon: '/favicon.png',
      tag: 'ai-response',
      requireInteraction: true,
      data: { type: 'ai-response' },
    });
  }, [sendNotification]);

  // NEW: Task reminder notification
  const sendTaskNotification = useCallback((taskDescription: string, taskId?: string) => {
    const settings = getNotificationSettings();
    if (!settings.taskReminders) return null;

    return sendNotification({
      title: '📋 Task Reminder',
      body: taskDescription.substring(0, 100) + (taskDescription.length > 100 ? '...' : ''),
      icon: '/favicon.png',
      tag: `task-reminder-${taskId || Date.now()}`,
      requireInteraction: true,
      data: { type: 'task-reminder', taskId },
    });
  }, [sendNotification]);

  // NEW: Admin broadcast notification
  const sendBroadcastNotification = useCallback((title: string, message: string) => {
    const settings = getNotificationSettings();
    if (!settings.systemUpdates) return null;

    return sendNotification({
      title: `📢 ${title}`,
      body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      icon: '/favicon.png',
      tag: 'admin-broadcast',
      requireInteraction: true,
      data: { type: 'broadcast' },
    });
  }, [sendNotification]);

  // NEW: Chapter update notification
  const sendChapterNotification = useCallback((chapterName: string, updateType: string) => {
    const settings = getNotificationSettings();
    if (!settings.chapterUpdates) return null;

    return sendNotification({
      title: '🌾 Chapter Update',
      body: `${chapterName}: ${updateType}`,
      icon: '/favicon.png',
      tag: 'chapter-update',
      data: { type: 'chapter-update' },
    });
  }, [sendNotification]);

  // NEW: System update notification
  const sendSystemNotification = useCallback((title: string, message: string) => {
    const settings = getNotificationSettings();
    if (!settings.systemUpdates) return null;

    return sendNotification({
      title: `🔔 ${title}`,
      body: message,
      icon: '/favicon.png',
      tag: 'system-update',
      data: { type: 'system-update' },
    });
  }, [sendNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    sendTestNotification,
    sendEventNotification,
    sendImageNotification,
    sendAIResponseNotification,
    sendTaskNotification,
    sendBroadcastNotification,
    sendChapterNotification,
    sendSystemNotification,
    canSendNotifications: isSupported && permission === 'granted',
  };
}
