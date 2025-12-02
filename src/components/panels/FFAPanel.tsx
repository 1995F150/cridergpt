import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wheat, 
  Calculator, 
  BookOpen, 
  Tractor, 
  Heart,
  Users,
  Trophy,
  FileText
} from "lucide-react";
import { FFADashboard } from "@/components/FFA/FFADashboard";
import { AgricultureCalculator } from "@/components/FFA/AgricultureCalculator";
import { FFARecordBook } from "@/components/FFA/FFARecordBook";
import { CropPlanner } from "@/components/FFA/CropPlanner";
import { LivestockTracker } from "@/components/FFA/LivestockTracker";
import { SoilHealthCalculator } from "@/components/agriculture/SoilHealthCalculator";
import { PesticideCalculator } from "@/components/agriculture/PesticideCalculator";
import { IrrigationPlanner } from "@/components/agriculture/IrrigationPlanner";
import { LivestockRationCalculator } from "@/components/agriculture/LivestockRationCalculator";
import { EquipmentTracker } from "@/components/agriculture/EquipmentTracker";
import { useFFAProfile } from "@/hooks/useFFAProfile";

export function FFAPanel() {
  const { chapter } = useFFAProfile();

  return (
    <div className="h-full w-full">
      {/* FFA Header Banner */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wheat className="h-8 w-8" />
              FFA Center - Smart Agriculture
            </h1>
            <p className="text-primary-foreground/80 mt-2">
              Complete agricultural management with location-based weather and tools
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{chapter?.name || 'Select Your Chapter'}</p>
            <p className="text-primary-foreground/70">
              {chapter?.city && `${chapter.city}, `}{chapter?.state || 'Complete setup to get started'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7 bg-muted/50">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="crop-planner" className="flex items-center gap-1">
              <Tractor className="h-4 w-4" />
              Crop Planner
            </TabsTrigger>
            <TabsTrigger value="livestock" className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              Livestock
            </TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              Calculators
            </TabsTrigger>
            <TabsTrigger value="precision" className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              Precision Ag
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              Record Book
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <FFADashboard />
          </TabsContent>

          <TabsContent value="crop-planner">
            <CropPlanner />
          </TabsContent>

          <TabsContent value="livestock">
            <LivestockTracker />
          </TabsContent>

          <TabsContent value="calculator">
            <AgricultureCalculator />
          </TabsContent>

          <TabsContent value="precision" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              <SoilHealthCalculator />
              <PesticideCalculator />
              <IrrigationPlanner />
              <LivestockRationCalculator />
              <EquipmentTracker />
            </div>
          </TabsContent>

          <TabsContent value="records">
            <FFARecordBook />
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resources content is now in FFADashboard */}
              <FFADashboard />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
