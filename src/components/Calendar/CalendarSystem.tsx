import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarEvent, useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEventModal } from './CalendarEventModal';
import { Loader2, Plus } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const categoryColors = {
  FFA: 'hsl(var(--chart-1))',
  School: 'hsl(var(--chart-2))',
  Personal: 'hsl(var(--chart-3))',
  Business: 'hsl(var(--chart-4))',
};

interface BigCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarEvent;
}

export function CalendarSystem() {
  const { events, loading, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  const calendarEvents = useMemo<BigCalendarEvent[]>(() => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_time),
      end: new Date(event.end_time),
      resource: event,
    }));
  }, [events]);

  const handleSelectEvent = (event: BigCalendarEvent) => {
    setSelectedEvent(event.resource);
    setSelectedSlot(null);
    setModalOpen(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedEvent(null);
    setSelectedSlot({ start, end });
    setModalOpen(true);
  };

  const handleEventSave = async (eventData: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, eventData);
      } else {
        await createEvent(eventData);
      }
      setModalOpen(false);
      setSelectedEvent(null);
      setSelectedSlot(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEventDelete = async () => {
    if (selectedEvent) {
      try {
        await deleteEvent(selectedEvent.id);
        setModalOpen(false);
        setSelectedEvent(null);
      } catch (error) {
        // Error handled in hook
      }
    }
  };

  const EventComponent = ({ event }: { event: BigCalendarEvent }) => (
    <div className="w-full h-full flex items-center gap-1 text-xs">
      <Badge 
        variant="secondary" 
        className="text-xs px-1 py-0"
        style={{ backgroundColor: categoryColors[event.resource.category], color: 'white' }}
      >
        {event.resource.category}
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
        <h2 className="text-2xl font-bold">Calendar</h2>
        <Button onClick={() => {
          setSelectedEvent(null);
          setSelectedSlot({ start: new Date(), end: new Date(Date.now() + 60 * 60 * 1000) });
          setModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(categoryColors).map(([category, color]) => (
            <Badge 
              key={category}
              variant="outline"
              style={{ borderColor: color, color }}
            >
              {category}
            </Badge>
          ))}
        </div>

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
            resizable
            style={{ height: '100%' }}
            components={{
              event: EventComponent,
            }}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: categoryColors[event.resource.category],
                borderColor: categoryColors[event.resource.category],
                color: 'white',
              },
            })}
            className="bg-background text-foreground"
          />
        </div>
      </div>

      <CalendarEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={selectedEvent}
        defaultSlot={selectedSlot}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
      />
    </div>
  );
}