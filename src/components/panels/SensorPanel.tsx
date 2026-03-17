import { SensorDashboard } from '@/components/SensorDashboard';

export function SensorPanel() {
  return (
    <div className="panel h-full w-full p-4 md:p-8 overflow-auto">
      <SensorDashboard />
    </div>
  );
}
