import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Event {
  id: string;
  chapter_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  visibility: 'personal' | 'chapter';
  category: string | null;
  created_at: string;
  updated_at: string;
}

export type NewEvent = Omit<Event, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

export function useEvents(chapterId?: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;

      setEvents((data as Event[]) || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: NewEvent) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setEvents(prev => [...prev, data as Event]);
      toast({
        title: "Event Created",
        description: "Your event has been created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateEvent = async (eventId: string, eventData: Partial<Event>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      setEvents(prev => prev.map(e => e.id === eventId ? data as Event : e));
      toast({
        title: "Event Updated",
        description: "Your event has been updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast({
        title: "Event Deleted",
        description: "Your event has been deleted",
      });

      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
      return false;
    }
  };

  const getUpcomingEvents = (limit: number = 5) => {
    const today = new Date().toISOString().split('T')[0];
    return events
      .filter(e => e.event_date >= today)
      .slice(0, limit);
  };

  const getChapterEvents = () => {
    return events.filter(e => e.visibility === 'chapter');
  };

  const getPersonalEvents = () => {
    return events.filter(e => e.visibility === 'personal' && e.created_by === user?.id);
  };

  useEffect(() => {
    fetchEvents();

    // Set up real-time subscription
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chapterId]);

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    getUpcomingEvents,
    getChapterEvents,
    getPersonalEvents,
    refetch: fetchEvents,
  };
}
