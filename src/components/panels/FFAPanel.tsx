import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Wheat, 
  Calculator, 
  BookOpen, 
  Tractor, 
  Heart,
  Users,
  Calendar,
  Trophy,
  FileText,
  Award
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

export function FFAPanel() {
  return (
    <div className="h-full w-full">
      {/* FFA Header Banner */}
      <div className="bg-gradient-to-r from-ffa-blue via-ffa-navy to-ffa-gold p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wheat className="h-8 w-8" />
              FFA Center - Smart Agriculture
            </h1>
            <p className="text-blue-100 mt-2">
              Complete agricultural management with location-based weather and auto-translation
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                <Award className="h-4 w-4 mr-1" />
                Jessie Crider - Chapter Historian 2025-2026
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Southwest Virginia Chapter</p>
            <p className="text-blue-200">Advanced Agricultural Technology</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7 bg-ffa-sky/10">
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
              <Card className="border-ffa-blue/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-ffa-navy">
                    <BookOpen className="h-5 w-5" />
                    Educational Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-ffa-sky/10 rounded-lg">
                    <h4 className="font-medium text-sm">Agricultural Science</h4>
                    <p className="text-xs text-muted-foreground">Crop science, soil health, plant biology</p>
                  </div>
                  <div className="p-3 bg-ffa-corn/10 rounded-lg">
                    <h4 className="font-medium text-sm">Animal Science</h4>
                    <p className="text-xs text-muted-foreground">Livestock management, nutrition, breeding</p>
                  </div>
                  <div className="p-3 bg-ffa-field/10 rounded-lg">
                    <h4 className="font-medium text-sm">Agricultural Business</h4>
                    <p className="text-xs text-muted-foreground">Farm economics, marketing, management</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-ffa-gold/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-ffa-navy">
                    <Award className="h-5 w-5" />
                    FFA Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-ffa-gold/10 rounded-lg">
                    <h4 className="font-medium text-sm">Leadership Development</h4>
                    <p className="text-xs text-muted-foreground">Officer training, public speaking, teamwork</p>
                  </div>
                  <div className="p-3 bg-ffa-harvest/10 rounded-lg">
                    <h4 className="font-medium text-sm">Career Exploration</h4>
                    <p className="text-xs text-muted-foreground">Agricultural careers, internships, job shadowing</p>
                  </div>
                  <div className="p-3 bg-ffa-navy/10 rounded-lg">
                    <h4 className="font-medium text-sm">Community Service</h4>
                    <p className="text-xs text-muted-foreground">Service learning, community projects</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}