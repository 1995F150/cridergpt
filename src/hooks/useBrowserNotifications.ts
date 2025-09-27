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
    const categoryEmojis = {
      FFA: '🌾',
      School: '🎓',
      Personal: '👤',
      Business: '💼',
    };

    return sendNotification({
      title: `${categoryEmojis[event.category as keyof typeof categoryEmojis] || '📅'} Event Starting Soon`,
      body: `${event.title} starts at ${new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      icon: '/favicon.png',
      tag: `event-${event.title}`,
      requireInteraction: true,
      data: { type: 'calendar-event', event },
    });
  }, [sendNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    sendTestNotification,
    sendEventNotification,
    canSendNotifications: isSupported && permission === 'granted',
  };
}