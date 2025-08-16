
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FarmingResult {
  result?: number;
  unit?: string;
  recommendations?: string[];
  breakdown?: { [key: string]: number | string };
}

export function FarmingCalculator() {
  const [area, setArea] = useState<string>('');
  const [seedRate, setSeedRate] = useState<string>('');
  const [fertilizerRate, setFertilizerRate] = useState<string>('');
  const [waterVolume, setWaterVolume] = useState<string>('');
  const [cropYield, setCropYield] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [costs, setCosts] = useState<string>('');
  const [result, setResult] = useState<FarmingResult | null>(null);

  const calculateSeeding = (): FarmingResult => {
    const a = parseFloat(area);
    const rate = parseFloat(seedRate);
    
    if (isNaN(a) || isNaN(rate)) {
      return { recommendations: ['Please enter valid area and seed rate values'] };
    }

    const totalSeeds = a * rate;
    const bags = Math.ceil(totalSeeds / 50); // Assuming 50kg bags
    const cost = bags * 25; // Assuming $25 per bag
    
    return {
      result: totalSeeds,
      unit: 'kg',
      breakdown: {
        'Field Area': `${a} acres`,
        'Seed Rate': `${rate} kg/acre`,
        'Total Seeds Needed': `${totalSeeds} kg`,
        'Bags Required': `${bags} bags`,
        'Estimated Cost': `$${cost}`
      },
      recommendations: [
        'Seeding Rate = Area × Seeds per Acre',
        `Total field coverage: ${a} acres`,
        rate > 30 ? 'High seeding rate - ensure adequate spacing' : 'Standard seeding rate',
        'Consider soil conditions and crop type for optimal rates'
      ]
    };
  };

  const calculateFertilizer = (): FarmingResult => {
    const a = parseFloat(area);
    const rate = parseFloat(fertilizerRate);
    
    if (isNaN(a) || isNaN(rate)) {
      return { recommendations: ['Please enter valid area and fertilizer rate values'] };
    }

    const totalFertilizer = a * rate;
    const bags = Math.ceil(totalFertilizer / 50);
    const cost = bags * 35; // Assuming $35 per bag
    
    return {
      result: totalFertilizer,
      unit: 'lbs',
      breakdown: {
        'Field Area': `${a} acres`,
        'Application Rate': `${rate} lbs/acre`,
        'Total Fertilizer': `${totalFertilizer} lbs`,
        'Bags Required': `${bags} bags`,
        'Estimated Cost': `$${cost}`
      },
      recommendations: [
        'Fertilizer Amount = Area × Application Rate',
        'Consider soil test results for optimal nutrient balance',
        rate > 200 ? 'High application rate - risk of runoff' : 'Standard application rate',
        'Apply in multiple splits for better uptake'
      ]
    };
  };

  const calculateIrrigation = (): FarmingResult => {
    const a = parseFloat(area);
    const volume = parseFloat(waterVolume);
    
    if (isNaN(a) || isNaN(volume)) {
      return { recommendations: ['Please enter valid area and water volume values'] };
    }

    const totalWater = a * volume;
    const gallons = totalWater * 27154; // Convert acre-inches to gallons
    const hours = totalWater / 0.5; // Assuming 0.5 inch/hour irrigation rate
    
    return {
      result: totalWater,
      unit: 'acre-inches',
      breakdown: {
        'Field Area': `${a} acres`,
        'Water Depth': `${volume} inches`,
        'Total Water': `${totalWater} acre-inches`,
        'Gallons': `${gallons.toLocaleString()} gallons`,
        'Irrigation Time': `${hours} hours`
      },
      recommendations: [
        'Water Volume = Area × Water Depth',
        'Monitor soil moisture before irrigation',
        volume > 2 ? 'Deep irrigation - check for runoff' : 'Standard irrigation depth',
        'Consider weather conditions and crop stage'
      ]
    };
  };

  const calculateProfitability = (): FarmingResult => {
    const a = parseFloat(area);
    const yield_ = parseFloat(cropYield);
    const p = parseFloat(price);
    const c = parseFloat(costs);
    
    if (isNaN(a) || isNaN(yield_) || isNaN(p) || isNaN(c)) {
      return { recommendations: ['Please enter all values for profitability calculation'] };
    }

    const totalYield = a * yield_;
    const totalRevenue = totalYield * p;
    const totalCosts = a * c;
    const profit = totalRevenue - totalCosts;
    const profitPerAcre = profit / a;
    const roi = (profit / totalCosts) * 100;
    
    return {
      result: profit,
      unit: '$',
      breakdown: {
        'Field Area': `${a} acres`,
        'Yield per Acre': `${yield_} bushels/acre`,
        'Total Yield': `${totalYield} bushels`,
        'Price per Bushel': `$${p}`,
        'Total Revenue': `$${totalRevenue.toFixed(2)}`,
        'Total Costs': `$${totalCosts.toFixed(2)}`,
        'Profit per Acre': `$${profitPerAcre.toFixed(2)}`,
        'ROI': `${roi.toFixed(1)}%`
      },
      recommendations: [
        'Profit = (Yield × Price) - Costs',
        profit > 0 ? 'Profitable operation' : 'Operating at a loss',
        roi > 15 ? 'Excellent return on investment' : roi > 5 ? 'Good ROI' : 'Consider cost reduction',
        'Monitor market prices and input costs regularly'
      ]
    };
  };

  const resetCalculator = () => {
    setArea('');
    setSeedRate('');
    setFertilizerRate('');
    setWaterVolume('');
    setCropYield('');
    setPrice('');
    setCosts('');
    setResult(null);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Farming Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="seeding" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="seeding">Seeding</TabsTrigger>
            <TabsTrigger value="fertilizer">Fertilizer</TabsTrigger>
            <TabsTrigger value="irrigation">Irrigation</TabsTrigger>
            <TabsTrigger value="profit">Profitability</TabsTrigger>
          </TabsList>

          <TabsContent value="seeding" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Field Area (acres)</Label>
                <Input
                  id="area"
                  type="number"
                  step="0.1"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Enter field area"
                />
              </div>
              <div>
                <Label htmlFor="seedRate">Seed Rate (kg/acre)</Label>
                <Input
                  id="seedRate"
                  type="number"
                  step="0.5"
                  value={seedRate}
                  onChange={(e) => setSeedRate(e.target.value)}
                  placeholder="Enter seeding rate"
                />
              </div>
            </div>
            <Button onClick={calculateSeeding} className="w-full">Calculate Seeding Requirements</Button>
          </TabsContent>

          <TabsContent value="fertilizer" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Field Area (acres)</Label>
                <Input
                  id="area"
                  type="number"
                  step="0.1"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Enter field area"
                />
              </div>
              <div>
                <Label htmlFor="fertilizerRate">Application Rate (lbs/acre)</Label>
                <Input
                  id="fertilizerRate"
                  type="number"
                  step="1"
                  value={fertilizerRate}
                  onChange={(e) => setFertilizerRate(e.target.value)}
                  placeholder="Enter fertilizer rate"
                />
              </div>
            </div>
            <Button onClick={calculateFertilizer} className="w-full">Calculate Fertilizer Needs</Button>
          </TabsContent>

          <TabsContent value="irrigation" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Field Area (acres)</Label>
                <Input
                  id="area"
                  type="number"
                  step="0.1"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Enter field area"
                />
              </div>
              <div>
                <Label htmlFor="waterVolume">Water Depth (inches)</Label>
                <Input
                  id="waterVolume"
                  type="number"
                  step="0.1"
                  value={waterVolume}
                  onChange={(e) => setWaterVolume(e.target.value)}
                  placeholder="Enter irrigation depth"
                />
              </div>
            </div>
            <Button onClick={calculateIrrigation} className="w-full">Calculate Irrigation Requirements</Button>
          </TabsContent>

          <TabsContent value="profit" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Field Area (acres)</Label>
                <Input
                  id="area"
                  type="number"
                  step="0.1"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Enter field area"
                />
              </div>
              <div>
                <Label htmlFor="cropYield">Yield (bushels/acre)</Label>
                <Input
                  id="cropYield"
                  type="number"
                  step="0.1"
                  value={cropYield}
                  onChange={(e) => setCropYield(e.target.value)}
                  placeholder="Expected yield"
                />
              </div>
              <div>
                <Label htmlFor="price">Price ($/bushel)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Market price"
                />
              </div>
              <div>
                <Label htmlFor="costs">Costs ($/acre)</Label>
                <Input
                  id="costs"
                  type="number"
                  step="1"
                  value={costs}
                  onChange={(e) => setCosts(e.target.value)}
                  placeholder="Total costs per acre"
                />
              </div>
            </div>
            <Button onClick={calculateProfitability} className="w-full">Calculate Profitability</Button>
          </TabsContent>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={resetCalculator} className="w-full">
              Reset All
            </Button>
          </div>

          {result && (
            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Calculation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.result && (
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-3xl font-bold text-primary">
                      {typeof result.result === 'number' ? result.result.toLocaleString() : result.result} {result.unit}
                    </div>
                  </div>
                )}

                {result.breakdown && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Detailed Breakdown:</h4>
                    {Object.entries(result.breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between p-2 bg-background rounded">
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.recommendations && (
                  <div>
                    <h4 className="font-semibold mb-2">Recommendations:</h4>
                    <ul className="space-y-1">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
