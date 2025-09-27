import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setEvents([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('calendar-events', {
        method: 'GET',
      });

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
      const { data, error } = await supabase.functions.invoke('calendar-events', {
        method: 'POST',
        body: eventData,
      });

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
      const { data, error } = await supabase.functions.invoke('calendar-events?id=' + eventId, {
        method: 'PUT',
        body: eventData,
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
      const { error } = await supabase.functions.invoke('calendar-events?id=' + eventId, {
        method: 'DELETE',
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