import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { getNotificationSettings } from '@/components/NotificationSettings';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date?: string;
  start_time: string;
  end_time: string;
  category: 'FFA' | 'School' | 'Personal' | 'Business';
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { sendEventNotification } = useBrowserNotifications();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      console.log('🗓️ Fetching calendar events...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('🗓️ No session found, cannot fetch events');
        setEvents([]);
        return;
      }

console.log('🗓️ Session found, calling calendar function');
      const { data, error } = await supabase.functions.invoke('calendar', {
        body: { action: 'list' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('🗓️ Calendar events response:', { data, error });
      if (error) throw error;

      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('🗓️ Creating calendar event:', eventData);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

// Ensure date exists in payload
      const payload = {
        ...eventData,
        date: eventData.date || new Date(eventData.start_time).toISOString().slice(0, 10),
      };

      const { data, error } = await supabase.functions.invoke('calendar', {
        body: { action: 'create', data: payload },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('🗓️ Create event response:', { data, error });
      if (error) throw error;

      setEvents(prev => [...prev, data.event]);
      toast({
        title: "Success",
        description: "Event created successfully",
      });

      return data.event;
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateEvent = async (eventId: string, eventData: Partial<CalendarEvent>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

const payload = {
        ...eventData,
      } as Partial<CalendarEvent>;
      if (!payload.date && payload.start_time) {
        payload.date = new Date(payload.start_time).toISOString().slice(0, 10);
      }

      const { data, error } = await supabase.functions.invoke('calendar', {
        body: { action: 'update', id: eventId, data: payload },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setEvents(prev => prev.map(event => 
        event.id === eventId ? data.event : event
      ));

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      return data.event;
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error", 
        description: "Failed to update event",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

const { error } = await supabase.functions.invoke('calendar', {
        body: { action: 'delete', id: eventId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    
    return events.filter(event => {
      const startTime = new Date(event.start_time);
      return startTime >= now && startTime <= soon;
    });
  };

  // Send browser notifications for upcoming events
  useEffect(() => {
    const settings = getNotificationSettings();
    if (!settings.calendarEvents) return;

    const checkUpcomingEvents = () => {
      const upcomingEvents = getUpcomingEvents();
      
      upcomingEvents.forEach(event => {
        const notificationKey = `event-notified-${event.id}`;
        const alreadyNotified = sessionStorage.getItem(notificationKey);
        
        if (!alreadyNotified) {
          sendEventNotification({
            title: event.title,
            category: event.category,
            startTime: event.start_time,
          });
          
          // Mark as notified for this session
          sessionStorage.setItem(notificationKey, 'true');
        }
      });
    };

    // Check immediately and then every minute
    checkUpcomingEvents();
    const interval = setInterval(checkUpcomingEvents, 60000);

    return () => clearInterval(interval);
  }, [events, sendEventNotification]);

  useEffect(() => {
    fetchEvents();

    // Set up real-time subscription
    const channel = supabase
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events'
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    getUpcomingEvents,
    refetch: fetchEvents,
  };
}