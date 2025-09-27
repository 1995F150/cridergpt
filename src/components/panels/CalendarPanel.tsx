import React from 'react';
import { CalendarSystem } from '@/components/Calendar/CalendarSystem';

export function CalendarPanel() {
  return (
    <div className="p-6 h-full overflow-auto">
      <CalendarSystem />
    </div>
  );
}