
import { AdvancedCalculator } from '@/components/AdvancedCalculator';

export function CalculatorPanel() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Calculator</h1>
        <p className="text-muted-foreground">
          Advanced calculator with basic and scientific functions
        </p>
      </div>
      
      <AdvancedCalculator />
    </div>
  );
}
