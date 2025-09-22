import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Droplets, 
  Shield, 
  AlertTriangle,
  Calculator,
  Beaker
} from "lucide-react";

export function PesticideCalculator() {
  const [sprayData, setSprayData] = useState({
    acres: "",
    product: "",
    rate: "",
    tankSize: "",
    concentration: "",
    adjuvant: ""
  });

  const [mixResults, setMixResults] = useState<any>(null);

  const pesticides = [
    { name: "2,4-D Amine", rate: "1-2 pt/acre", concentration: "4 lb/gal" },
    { name: "Roundup PowerMAX", rate: "22-44 fl oz/acre", concentration: "5.5 lb/gal" },
    { name: "Atrazine 4L", rate: "1-2 qt/acre", concentration: "4 lb/gal" },
    { name: "Liberty 280 SL", rate: "29-43 fl oz/acre", concentration: "2.34 lb/gal" },
    { name: "Dicamba", rate: "0.5-1 pt/acre", concentration: "4 lb/gal" }
  ];

  const calculateMix = () => {
    const acres = parseFloat(sprayData.acres);
    const rateValue = parseFloat(sprayData.rate);
    const tankSize = parseFloat(sprayData.tankSize);
    const concentration = parseFloat(sprayData.concentration);

    if (!acres || !rateValue || !tankSize) return;

    // Calculate product needed
    const totalProductNeeded = rateValue * acres;
    const tanksNeeded = Math.ceil(acres / (tankSize / 20)); // Assuming 20 GPA spray rate
    const productPerTank = totalProductNeeded / tanksNeeded;
    
    // Water needed
    const totalWaterNeeded = acres * 20; // 20 gallons per acre standard
    const waterPerTank = tankSize - productPerTank;

    // Safety calculations
    const activeIngredient = (productPerTank * concentration) / tankSize;
    
    // Cost calculation (estimated)
    const estimatedCost = totalProductNeeded * 15; // $15 per unit average

    setMixResults({
      totalProductNeeded: totalProductNeeded.toFixed(2),
      tanksNeeded,
      productPerTank: productPerTank.toFixed(2),
      waterPerTank: waterPerTank.toFixed(1),
      totalWaterNeeded: totalWaterNeeded.toFixed(0),
      activeIngredient: (activeIngredient * 100).toFixed(3),
      estimatedCost: estimatedCost.toFixed(2),
      sprayRate: (tankSize / (tankSize / 20)).toFixed(1)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ffa-navy">
            <Droplets className="h-5 w-5" />
            Pesticide/Herbicide Mix Calculator
            <Badge className="bg-red-600 text-white">Safety Critical</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Calculate safe spray ratios, tank mixes, and application rates
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Safety First:</strong> Always read and follow product labels. Wear appropriate PPE. 
              These calculations are estimates - verify with product labels and local regulations.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="acres">Field Size (acres)</Label>
              <Input
                id="acres"
                type="number"
                placeholder="25"
                value={sprayData.acres}
                onChange={(e) => setSprayData({...sprayData, acres: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="tankSize">Tank Size (gallons)</Label>
              <Input
                id="tankSize"
                type="number"
                placeholder="500"
                value={sprayData.tankSize}
                onChange={(e) => setSprayData({...sprayData, tankSize: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product">Product</Label>
              <Select value={sprayData.product} onValueChange={(value) => setSprayData({...sprayData, product: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pesticide/herbicide" />
                </SelectTrigger>
                <SelectContent>
                  {pesticides.map((pesticide, index) => (
                    <SelectItem key={index} value={pesticide.name}>
                      {pesticide.name} ({pesticide.rate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rate">Application Rate (per acre)</Label>
              <Input
                id="rate"
                type="number"
                step="0.1"
                placeholder="1.5"
                value={sprayData.rate}
                onChange={(e) => setSprayData({...sprayData, rate: e.target.value})}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter rate in pints, quarts, or fluid ounces as appropriate
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="concentration">Product Concentration (lb/gal)</Label>
              <Input
                id="concentration"
                type="number"
                step="0.1"
                placeholder="4.0"
                value={sprayData.concentration}
                onChange={(e) => setSprayData({...sprayData, concentration: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="adjuvant">Adjuvant/Surfactant (%)</Label>
              <Input
                id="adjuvant"
                type="number"
                step="0.1"
                placeholder="0.25"
                value={sprayData.adjuvant}
                onChange={(e) => setSprayData({...sprayData, adjuvant: e.target.value})}
              />
            </div>
          </div>

          <Button onClick={calculateMix} className="w-full bg-ffa-harvest hover:bg-ffa-gold text-white">
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Mix Ratios
          </Button>

          {mixResults && (
            <div className="space-y-4 mt-6">
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Beaker className="h-5 w-5" />
                    Tank Mix Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-blue-700">Total Application</h4>
                      <p className="text-sm">Product Needed: {mixResults.totalProductNeeded} units</p>
                      <p className="text-sm">Water Needed: {mixResults.totalWaterNeeded} gallons</p>
                      <p className="text-sm">Number of Tanks: {mixResults.tanksNeeded}</p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-green-700">Per Tank Mix</h4>
                      <p className="text-sm">Product: {mixResults.productPerTank} units</p>
                      <p className="text-sm">Water: {mixResults.waterPerTank} gallons</p>
                      <p className="text-sm">Spray Rate: {mixResults.sprayRate} GPA</p>
                    </div>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Active Ingredient Concentration:</strong> {mixResults.activeIngredient}%
                    </AlertDescription>
                  </Alert>

                  <div className="bg-ffa-sky/10 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Safety Reminders</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Always add water to tank first, then chemicals</li>
                      <li>• Mix herbicides before insecticides/fungicides</li>
                      <li>• Use proper PPE: gloves, eye protection, respirator</li>
                      <li>• Check wind speed and direction before spraying</li>
                      <li>• Maintain proper boom height and pressure</li>
                    </ul>
                  </div>

                  <div className="bg-ffa-corn/10 p-3 rounded-lg">
                    <p className="text-sm font-semibold">Estimated Cost: ${mixResults.estimatedCost}</p>
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