import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Droplets, 
  CloudRain, 
  Thermometer,
  BarChart3,
  Calendar
} from "lucide-react";

export function IrrigationPlanner() {
  const [irrigationData, setIrrigationData] = useState({
    crop: "",
    acres: "",
    soilType: "",
    growthStage: "",
    rainfall: "",
    temperature: "",
    humidity: "",
    windSpeed: ""
  });

  const [waterPlan, setWaterPlan] = useState<any>(null);

  const crops = [
    { name: "Corn", waterNeed: { early: 0.15, mid: 0.35, late: 0.20 } },
    { name: "Soybeans", waterNeed: { early: 0.10, mid: 0.25, late: 0.15 } },
    { name: "Cotton", waterNeed: { early: 0.20, mid: 0.40, late: 0.25 } },
    { name: "Wheat", waterNeed: { early: 0.10, mid: 0.20, late: 0.15 } },
    { name: "Tomatoes", waterNeed: { early: 0.25, mid: 0.45, late: 0.30 } },
    { name: "Potatoes", waterNeed: { early: 0.15, mid: 0.30, late: 0.20 } }
  ];

  const soilTypes = [
    { name: "Clay", waterHolding: 0.20, infiltration: 0.1 },
    { name: "Clay Loam", waterHolding: 0.18, infiltration: 0.2 },
    { name: "Loam", waterHolding: 0.15, infiltration: 0.5 },
    { name: "Sandy Loam", waterHolding: 0.12, infiltration: 0.8 },
    { name: "Sand", waterHolding: 0.08, infiltration: 1.2 }
  ];

  const calculateWaterNeeds = () => {
    const acres = parseFloat(irrigationData.acres);
    const rainfall = parseFloat(irrigationData.rainfall);
    const temp = parseFloat(irrigationData.temperature);
    const humidity = parseFloat(irrigationData.humidity);
    const windSpeed = parseFloat(irrigationData.windSpeed);

    if (!acres || !irrigationData.crop || !irrigationData.growthStage || !irrigationData.soilType) return;

    const crop = crops.find(c => c.name === irrigationData.crop);
    const soil = soilTypes.find(s => s.name === irrigationData.soilType);
    
    if (!crop || !soil) return;

    // Base water need based on crop and growth stage
    let baseWaterNeed = crop.waterNeed[irrigationData.growthStage as keyof typeof crop.waterNeed];
    
    // Adjust for weather conditions
    let weatherAdjustment = 1.0;
    if (temp > 85) weatherAdjustment += 0.2;
    if (temp > 95) weatherAdjustment += 0.3;
    if (humidity < 50) weatherAdjustment += 0.15;
    if (windSpeed > 10) weatherAdjustment += 0.1;

    // Calculate daily water need (inches)
    const dailyWaterNeed = baseWaterNeed * weatherAdjustment;
    
    // Account for rainfall
    const irrigationNeeded = Math.max(0, dailyWaterNeed - (rainfall / 7)); // Assume rainfall is weekly
    
    // Convert to gallons per acre
    const gallonsPerAcre = irrigationNeeded * 27154; // 1 inch = 27,154 gallons per acre
    const totalGallons = gallonsPerAcre * acres;
    
    // Application timing based on soil type
    const applicationFrequency = soil.waterHolding > 0.15 ? 3 : soil.waterHolding > 0.10 ? 2 : 1;
    const applicationsPerWeek = 7 / applicationFrequency;
    const gallonsPerApplication = totalGallons / applicationsPerWeek;
    
    // Cost estimation (varies by region, using average)
    const costPerGallon = 0.003; // $0.003 per gallon average
    const weeklyCost = totalGallons * costPerGallon;
    const seasonalCost = weeklyCost * 16; // 16 week growing season average

    setWaterPlan({
      dailyWaterNeed: dailyWaterNeed.toFixed(3),
      irrigationNeeded: irrigationNeeded.toFixed(3),
      gallonsPerAcre: Math.round(gallonsPerAcre),
      totalGallons: Math.round(totalGallons),
      applicationFrequency,
      applicationsPerWeek: applicationsPerWeek.toFixed(1),
      gallonsPerApplication: Math.round(gallonsPerApplication),
      weeklyCost: weeklyCost.toFixed(2),
      seasonalCost: seasonalCost.toFixed(2),
      efficiency: soil.infiltration,
      soilCapacity: (soil.waterHolding * 100).toFixed(1)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ffa-navy">
            <Droplets className="h-5 w-5" />
            Irrigation Planner
            <Badge className="bg-blue-600 text-white">Water Management</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Estimate water needs per crop based on acres, rainfall, and weather conditions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="crop">Crop Type</Label>
              <Select value={irrigationData.crop} onValueChange={(value) => setIrrigationData({...irrigationData, crop: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select crop" />
                </SelectTrigger>
                <SelectContent>
                  {crops.map((crop, index) => (
                    <SelectItem key={index} value={crop.name}>{crop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="acres">Field Size (acres)</Label>
              <Input
                id="acres"
                type="number"
                placeholder="50"
                value={irrigationData.acres}
                onChange={(e) => setIrrigationData({...irrigationData, acres: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="soilType">Soil Type</Label>
              <Select value={irrigationData.soilType} onValueChange={(value) => setIrrigationData({...irrigationData, soilType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select soil type" />
                </SelectTrigger>
                <SelectContent>
                  {soilTypes.map((soil, index) => (
                    <SelectItem key={index} value={soil.name}>{soil.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="growthStage">Growth Stage</Label>
              <Select value={irrigationData.growthStage} onValueChange={(value) => setIrrigationData({...irrigationData, growthStage: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select growth stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="early">Early Growth</SelectItem>
                  <SelectItem value="mid">Mid Season</SelectItem>
                  <SelectItem value="late">Late Season/Maturity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rainfall">Recent Rainfall (inches/week)</Label>
              <Input
                id="rainfall"
                type="number"
                step="0.1"
                placeholder="0.5"
                value={irrigationData.rainfall}
                onChange={(e) => setIrrigationData({...irrigationData, rainfall: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="temperature">Average Temperature (°F)</Label>
              <Input
                id="temperature"
                type="number"
                placeholder="78"
                value={irrigationData.temperature}
                onChange={(e) => setIrrigationData({...irrigationData, temperature: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="humidity">Relative Humidity (%)</Label>
              <Input
                id="humidity"
                type="number"
                placeholder="65"
                value={irrigationData.humidity}
                onChange={(e) => setIrrigationData({...irrigationData, humidity: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="windSpeed">Wind Speed (mph)</Label>
              <Input
                id="windSpeed"
                type="number"
                placeholder="8"
                value={irrigationData.windSpeed}
                onChange={(e) => setIrrigationData({...irrigationData, windSpeed: e.target.value})}
              />
            </div>
          </div>

          <Button onClick={calculateWaterNeeds} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Calculate Irrigation Plan
          </Button>

          {waterPlan && (
            <div className="space-y-4 mt-6">
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <CloudRain className="h-5 w-5" />
                    Irrigation Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-blue-700">Daily Water Need</h4>
                      <p className="text-2xl font-bold">{waterPlan.dailyWaterNeed}"</p>
                      <p className="text-sm text-muted-foreground">inches per day</p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-green-700">Irrigation Needed</h4>
                      <p className="text-2xl font-bold">{waterPlan.irrigationNeeded}"</p>
                      <p className="text-sm text-muted-foreground">after rainfall</p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-purple-700">Total Volume</h4>
                      <p className="text-2xl font-bold">{waterPlan.totalGallons.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">gallons per week</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-ffa-sky/10 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Application Schedule</h4>
                      <p className="text-sm">Frequency: Every {waterPlan.applicationFrequency} days</p>
                      <p className="text-sm">Applications per week: {waterPlan.applicationsPerWeek}</p>
                      <p className="text-sm">Gallons per application: {waterPlan.gallonsPerApplication.toLocaleString()}</p>
                      <p className="text-sm">Per acre: {waterPlan.gallonsPerAcre.toLocaleString()} gal/acre</p>
                    </div>

                    <div className="bg-ffa-corn/10 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Soil Information</h4>
                      <p className="text-sm">Water holding capacity: {waterPlan.soilCapacity}%</p>
                      <p className="text-sm">Infiltration rate: {waterPlan.efficiency} in/hr</p>
                    </div>
                  </div>

                  <div className="bg-ffa-harvest/10 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Cost Estimates</h4>
                    <p className="text-sm">Weekly cost: ${waterPlan.weeklyCost}</p>
                    <p className="text-sm font-semibold">Seasonal cost: ${waterPlan.seasonalCost}</p>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-yellow-700">Tips for Efficiency</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Water early morning (6-10 AM) to reduce evaporation</li>
                      <li>• Use soil moisture sensors for precision timing</li>
                      <li>• Consider drip irrigation for 30-50% water savings</li>
                      <li>• Adjust for weather forecasts</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}