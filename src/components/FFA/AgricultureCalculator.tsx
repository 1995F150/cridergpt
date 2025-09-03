import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Wheat, 
  Tractor, 
  Droplets,
  Truck,
  DollarSign,
  BarChart3,
  Leaf
} from "lucide-react";

export function AgricultureCalculator() {
  const [acreage, setAcreage] = useState("");
  const [seedRate, setSeedRate] = useState("");
  const [fertilizer, setFertilizer] = useState("");
  const [livestockWeight, setLivestockWeight] = useState("");
  const [feedConversion, setFeedConversion] = useState("");
  const [cropPrice, setCropPrice] = useState("");
  const [fuelEfficiency, setFuelEfficiency] = useState("");
  const [fieldSize, setFieldSize] = useState("");

  const calculateSeedNeeded = () => {
    const acres = parseFloat(acreage);
    const rate = parseFloat(seedRate);
    return acres && rate ? (acres * rate).toFixed(2) : "0";
  };

  const calculateFertilizerCost = () => {
    const acres = parseFloat(acreage);
    const cost = parseFloat(fertilizer);
    return acres && cost ? (acres * cost).toFixed(2) : "0";
  };

  const calculateFeedRequired = () => {
    const weight = parseFloat(livestockWeight);
    const conversion = parseFloat(feedConversion);
    return weight && conversion ? (weight * conversion).toFixed(2) : "0";
  };

  const calculateCropValue = () => {
    const acres = parseFloat(acreage);
    const price = parseFloat(cropPrice);
    const estimatedYield = 150; // bushels per acre (average)
    return acres && price ? (acres * estimatedYield * price).toFixed(2) : "0";
  };

  const calculateFuelCost = () => {
    const size = parseFloat(fieldSize);
    const efficiency = parseFloat(fuelEfficiency);
    const fuelPrice = 3.50; // per gallon
    return size && efficiency ? ((size / efficiency) * fuelPrice).toFixed(2) : "0";
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ffa-navy">
            <Calculator className="h-5 w-5" />
            Agricultural Calculator
            <Badge className="bg-ffa-gold text-white">FFA Tool</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Essential calculations for farming operations and FFA projects
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="crops" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="crops" className="flex items-center gap-1">
                <Wheat className="h-4 w-4" />
                Crops
              </TabsTrigger>
              <TabsTrigger value="livestock" className="flex items-center gap-1">
                <Leaf className="h-4 w-4" />
                Livestock
              </TabsTrigger>
              <TabsTrigger value="economics" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Economics
              </TabsTrigger>
              <TabsTrigger value="machinery" className="flex items-center gap-1">
                <Tractor className="h-4 w-4" />
                Machinery
              </TabsTrigger>
            </TabsList>

            <TabsContent value="crops" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-ffa-field/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wheat className="h-5 w-5 text-ffa-harvest" />
                      Seed Calculator
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="acreage">Acreage</Label>
                      <Input
                        id="acreage"
                        type="number"
                        placeholder="Enter acres"
                        value={acreage}
                        onChange={(e) => setAcreage(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="seedRate">Seed Rate (lbs/acre)</Label>
                      <Input
                        id="seedRate"
                        type="number"
                        placeholder="Enter seed rate"
                        value={seedRate}
                        onChange={(e) => setSeedRate(e.target.value)}
                      />
                    </div>
                    <div className="bg-ffa-sky/10 p-3 rounded-lg">
                      <p className="text-sm font-medium">Total Seed Needed:</p>
                      <p className="text-2xl font-bold text-ffa-navy">
                        {calculateSeedNeeded()} lbs
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-ffa-corn/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Droplets className="h-5 w-5 text-ffa-blue" />
                      Fertilizer Calculator
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="fertilizer">Cost per Acre ($)</Label>
                      <Input
                        id="fertilizer"
                        type="number"
                        placeholder="Enter cost per acre"
                        value={fertilizer}
                        onChange={(e) => setFertilizer(e.target.value)}
                      />
                    </div>
                    <div className="bg-ffa-corn/10 p-3 rounded-lg">
                      <p className="text-sm font-medium">Total Fertilizer Cost:</p>
                      <p className="text-2xl font-bold text-ffa-harvest">
                        ${calculateFertilizerCost()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="livestock" className="space-y-4">
              <Card className="border-ffa-field/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-ffa-field" />
                    Feed Conversion Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="livestockWeight">Animal Weight (lbs)</Label>
                      <Input
                        id="livestockWeight"
                        type="number"
                        placeholder="Enter weight"
                        value={livestockWeight}
                        onChange={(e) => setLivestockWeight(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="feedConversion">Feed Conversion Ratio</Label>
                      <Input
                        id="feedConversion"
                        type="number"
                        step="0.1"
                        placeholder="Enter ratio (e.g., 2.5)"
                        value={feedConversion}
                        onChange={(e) => setFeedConversion(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="bg-ffa-field/10 p-4 rounded-lg">
                    <p className="text-sm font-medium">Daily Feed Required:</p>
                    <p className="text-2xl font-bold text-ffa-field">
                      {calculateFeedRequired()} lbs
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="economics" className="space-y-4">
              <Card className="border-ffa-gold/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-ffa-gold" />
                    Crop Value Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="cropPrice">Price per Bushel ($)</Label>
                    <Input
                      id="cropPrice"
                      type="number"
                      step="0.01"
                      placeholder="Enter price per bushel"
                      value={cropPrice}
                      onChange={(e) => setCropPrice(e.target.value)}
                    />
                  </div>
                  <div className="bg-ffa-gold/10 p-4 rounded-lg">
                    <p className="text-sm font-medium">Estimated Crop Value:</p>
                    <p className="text-2xl font-bold text-ffa-harvest">
                      ${calculateCropValue()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on 150 bu/acre average yield
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="machinery" className="space-y-4">
              <Card className="border-ffa-blue/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-ffa-blue" />
                    Fuel Cost Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fieldSize">Field Size (acres)</Label>
                      <Input
                        id="fieldSize"
                        type="number"
                        placeholder="Enter field size"
                        value={fieldSize}
                        onChange={(e) => setFieldSize(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fuelEfficiency">Fuel Efficiency (acres/gallon)</Label>
                      <Input
                        id="fuelEfficiency"
                        type="number"
                        step="0.1"
                        placeholder="Enter efficiency"
                        value={fuelEfficiency}
                        onChange={(e) => setFuelEfficiency(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="bg-ffa-blue/10 p-4 rounded-lg">
                    <p className="text-sm font-medium">Estimated Fuel Cost:</p>
                    <p className="text-2xl font-bold text-ffa-blue">
                      ${calculateFuelCost()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on $3.50/gallon diesel
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}