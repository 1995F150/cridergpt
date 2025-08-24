
import { AdvancedCalculator } from '@/components/AdvancedCalculator';
import { WeldingCalculator } from '@/components/WeldingCalculator';
import { MechanicsCalculator } from '@/components/MechanicsCalculator';
import { FarmingCalculator } from '@/components/FarmingCalculator';
import { VoltageCalculator } from '@/components/VoltageCalculator';
import { VehicleMaintenanceLog } from '@/components/VehicleMaintenanceLog';
import { ProbabilityCalculator } from '@/components/calculators/ProbabilityCalculator';
import { LoanInterestCalculator } from '@/components/calculators/LoanInterestCalculator';
import { ScienceCalculator } from '@/components/calculators/ScienceCalculator';
import { HealthCalculator } from '@/components/calculators/HealthCalculator';
import { RandomMathCalculator } from '@/components/calculators/RandomMathCalculator';
import { ConversionCalculator } from '@/components/calculators/ConversionCalculator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DedicationMessage } from '@/components/DedicationMessage';

export function CalculatorPanel() {
  return (
    <div className="space-y-6">
      <DedicationMessage />
      
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">CriderGPT Calculator Suite</h1>
        <p className="text-muted-foreground">
          Professional calculators with PDF export for mathematics, engineering, science, health, and more
        </p>
      </div>
      
      <Tabs defaultValue="advanced" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 text-xs">
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="welding">Welding</TabsTrigger>
          <TabsTrigger value="mechanics">Mechanics</TabsTrigger>
          <TabsTrigger value="farming">Farming</TabsTrigger>
          <TabsTrigger value="voltage">Electrical</TabsTrigger>
          <TabsTrigger value="maintenance">Vehicle</TabsTrigger>
          <TabsTrigger value="probability">Probability</TabsTrigger>
          <TabsTrigger value="loan">Loan/Interest</TabsTrigger>
          <TabsTrigger value="science">Science</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="random">Random Math</TabsTrigger>
          <TabsTrigger value="conversion">Conversions</TabsTrigger>
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

        <TabsContent value="probability" className="mt-6">
          <ProbabilityCalculator />
        </TabsContent>

        <TabsContent value="loan" className="mt-6">
          <LoanInterestCalculator />
        </TabsContent>

        <TabsContent value="science" className="mt-6">
          <ScienceCalculator />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <HealthCalculator />
        </TabsContent>

        <TabsContent value="random" className="mt-6">
          <RandomMathCalculator />
        </TabsContent>

        <TabsContent value="conversion" className="mt-6">
          <ConversionCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
