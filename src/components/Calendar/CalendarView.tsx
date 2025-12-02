import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Event, useEvents } from '@/hooks/useEvents';
import { useFFAProfile } from '@/hooks/useFFAProfile';
import { EventModal } from '@/components/FFA/EventModal';
import { Loader2, Plus, Calendar as CalendarIcon } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const categoryColors: Record<string, string> = {
  General: 'hsl(var(--chart-1))',
  Competition: 'hsl(var(--chart-2))',
  Meeting: 'hsl(var(--chart-3))',
  Fundraiser: 'hsl(var(--chart-4))',
  'Community Service': 'hsl(var(--chart-5))',
  'Field Trip': 'hsl(var(--primary))',
  Conference: 'hsl(var(--accent))',
};

interface BigCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Event;
}

export function CalendarView() {
  const { profile } = useFFAProfile();
  const { events, loading, createEvent, updateEvent, deleteEvent } = useEvents(profile?.chapter_id);
  
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const calendarEvents = useMemo<BigCalendarEvent[]>(() => {
    return events.map(event => {
      const startDate = new Date(event.event_date);
      if (event.event_time) {
        const [hours, minutes] = event.event_time.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes));
      }
      
      const endDate = new Date(event.event_date);
      if (event.end_time) {
        const [hours, minutes] = event.end_time.split(':');
        endDate.setHours(parseInt(hours), parseInt(minutes));
      } else {
        endDate.setHours(startDate.getHours() + 1);
      }

      return {
        id: event.id,
        title: event.title,
        start: startDate,
        end: endDate,
        resource: event,
      };
    });
  }, [events]);

  const handleSelectEvent = (event: BigCalendarEvent) => {
    setSelectedEvent(event.resource);
    setModalOpen(true);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedEvent(null);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    if (selectedEvent) {
      return updateEvent(selectedEvent.id, data);
    } else {
      return createEvent(data);
    }
  };

  const EventComponent = ({ event }: { event: BigCalendarEvent }) => (
    <div className="flex items-center gap-1 text-xs">
      <Badge 
        variant="secondary" 
        className="text-xs px-1 py-0 hidden sm:inline-flex"
        style={{ 
          backgroundColor: event.resource.visibility === 'chapter' 
            ? 'hsl(var(--primary))' 
            : categoryColors[event.resource.category || 'General'],
          color: 'white' 
        }}
      >
        {event.resource.visibility === 'chapter' ? 'Chapter' : 'Personal'}
      </Badge>
      <span className="truncate">{event.title}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          Calendar
        </h2>
        <Button onClick={() => {
          setSelectedEvent(null);
          setModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-primary text-primary">
              Chapter Events
            </Badge>
            <Badge variant="outline" className="border-muted-foreground">
              Personal Events
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="calendar-container" style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              style={{ height: '100%' }}
              components={{
                event: EventComponent,
              }}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: event.resource.visibility === 'chapter' 
                    ? 'hsl(var(--primary))' 
                    : categoryColors[event.resource.category || 'General'],
                  borderColor: event.resource.visibility === 'chapter' 
                    ? 'hsl(var(--primary))' 
                    : categoryColors[event.resource.category || 'General'],
                  color: 'white',
                },
              })}
              className="bg-background text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={selectedEvent}
        chapterId={profile?.chapter_id}
        onSave={handleSave}
        onDelete={deleteEvent}
      />
    </div>
  );
}
