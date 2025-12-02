import { CalendarView } from '@/components/Calendar/CalendarView';

export function CalendarPanel() {
  return (
    <div className="p-6 h-full overflow-auto">
      <CalendarView />
    </div>
  );
}
