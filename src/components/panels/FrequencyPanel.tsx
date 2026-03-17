import React from 'react';
import { FrequencyGenerator } from '@/components/FrequencyGenerator';

export function FrequencyPanel() {
  return (
    <div className="h-full overflow-auto">
      <FrequencyGenerator />
    </div>
  );
}
