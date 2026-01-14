import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBrowserNotifications } from './useBrowserNotifications';

export function useNotificationListener() {
  const { user } = useAuth();
  const { 
    canSendNotifications, 
    sendBroadcastNotification,
    sendSystemNotification,
    sendChapterNotification,
    sendTaskNotification,
  } = useBrowserNotifications();

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);
  }, [user]);

  // Fetch unread notifications count
  const getUnreadCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    
    const { count } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    
    return count || 0;
  }, [user]);

  // Listen for new notifications in real-time
  useEffect(() => {
    if (!user || !canSendNotifications) return;

    const channel = supabase
      .channel('user-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const { title, message, type, data } = payload.new as {
            title: string;
            message: string;
            type: string;
            data?: Record<string, any>;
          };

          // Send browser notification based on type
          switch (type) {
            case 'broadcast':
              sendBroadcastNotification(title, message || '');
              break;
            case 'system':
              sendSystemNotification(title, message || '');
              break;
            case 'chapter':
              sendChapterNotification(data?.chapterName || 'Chapter', title);
              break;
            case 'task':
              sendTaskNotification(message || title, data?.taskId);
              break;
            default:
              sendSystemNotification(title, message || '');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, canSendNotifications, sendBroadcastNotification, sendSystemNotification, sendChapterNotification, sendTaskNotification]);

  return {
    markAsRead,
    getUnreadCount,
  };
}
