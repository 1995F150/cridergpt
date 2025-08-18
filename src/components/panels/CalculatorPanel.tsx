
import { AdvancedCalculator } from '@/components/AdvancedCalculator';
import { WeldingCalculator } from '@/components/WeldingCalculator';
import { MechanicsCalculator } from '@/components/MechanicsCalculator';
import { FarmingCalculator } from '@/components/FarmingCalculator';
import { VoltageCalculator } from '@/components/VoltageCalculator';
import { VehicleMaintenanceLog } from '@/components/VehicleMaintenanceLog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DedicationMessage } from '@/components/DedicationMessage';

export function CalculatorPanel() {
  return (
    <div className="space-y-6">
      <DedicationMessage />
      
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Professional Calculator Suite</h1>
        <p className="text-muted-foreground">
          Advanced calculators for mathematics, engineering, welding, mechanics, farming, electrical work, and vehicle maintenance
        </p>
      </div>
      
      <Tabs defaultValue="advanced" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="welding">Welding</TabsTrigger>
          <TabsTrigger value="mechanics">Mechanics</TabsTrigger>
          <TabsTrigger value="farming">Farming</TabsTrigger>
          <TabsTrigger value="voltage">Electrical</TabsTrigger>
          <TabsTrigger value="maintenance">Vehicle</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedCalculator />
        </TabsContent>

        <TabsContent value="welding" className="mt-6">
          <WeldingCalculator />
        </TabsContent>

        <TabsContent value="mechanics" className="mt-6">
          <MechanicsCalculator />
        </TabsContent>

        <TabsContent value="farming" className="mt-6">
          <FarmingCalculator />
        </TabsContent>

        <TabsContent value="voltage" className="mt-6">
          <VoltageCalculator />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <VehicleMaintenanceLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
