
import { AdvancedCalculator } from '@/components/AdvancedCalculator';
import { WeldingCalculator } from '@/components/WeldingCalculator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CalculatorPanel() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Calculator Suite</h1>
        <p className="text-muted-foreground">
          Advanced calculator with basic, scientific, and professional welding functions
        </p>
      </div>
      
      <Tabs defaultValue="advanced" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="advanced">Advanced Calculator</TabsTrigger>
          <TabsTrigger value="welding">Welding Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedCalculator />
        </TabsContent>

        <TabsContent value="welding" className="mt-6">
          <WeldingCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
